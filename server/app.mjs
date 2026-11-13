import express from "express";
import { DatabaseSync } from "node:sqlite";
import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import { validateCharacter } from "../shared/character.mjs";
import { normalizeCharacterSlots } from "../shared/slots.mjs";
import { preparationIncreaseError } from "../shared/preparation.mjs";
import { weaponChangeError } from "../shared/weapons.mjs";
import { secureCookiesFromEnv } from "./config.mjs";
import { initializeAudit } from "./audit.mjs";
import { registerBugRoutes } from "./bugs.mjs";
const scrypt = promisify(scryptCallback);
const hash = (value) => createHash("sha256").update(value).digest("hex");
export function createApp({
  databasePath = "data/keeper.sqlite",
  secureCookies = secureCookiesFromEnv(),
} = {}) {
  const db = new DatabaseSync(databasePath);
  db.exec(
    "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS characters (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), data TEXT NOT NULL, updated TEXT NOT NULL);",
  );
  const app = express();
  db.exec("PRAGMA busy_timeout=5000;");
  const audit = initializeAudit(db);
  app.disable("x-powered-by");
  app.get("/healthz", (req, res) => {
    db.prepare("SELECT 1").get();
    res.set("Cache-Control", "no-store").json({ ok: true });
  });
  app.use("/api", (req, res, next) => {
    const start = performance.now();
    res.on("finish", () => {
      // Only fixed route templates are recorded, never URLs, queries or bodies.
      const route = req.route?.path;
      if (route === "/api/admin/logs" && res.statusCode < 400) return;
      const events = {
        "GET /api/me": "session.checked",
        "POST /api/account/password": "account.password.changed",
        "POST /api/logout": "auth.logout",
        "GET /api/characters": "characters.listed",
        "POST /api/characters": "character.created",
        "PUT /api/characters/:id": "character.updated",
        "DELETE /api/characters/:id": "character.deleted",
        "GET /api/admin/logs": "admin.logs",
        "POST /api/bugs": "bug.submitted",
        "GET /api/bugs": "bugs.listed",
        "GET /api/admin/bugs": "admin.bugs.listed",
        "PATCH /api/admin/bugs/:id": "bug.status.updated",
      };
      const event =
        route === "/api/auth/:action" &&
        ["login", "register"].includes(req.params.action)
          ? `auth.${req.params.action}`
          : events[`${req.method} ${route}`] || "request.rejected";
      audit({
        event,
        level:
          res.statusCode >= 500
            ? "error"
            : res.statusCode >= 400
              ? "warn"
              : "info",
        actorId: req.user?.id || res.locals.actorId || null,
        method: [
          "GET",
          "HEAD",
          "POST",
          "PUT",
          "DELETE",
          "PATCH",
          "OPTIONS",
        ].includes(req.method)
          ? req.method
          : "OTHER",
        route:
          events[`${req.method} ${route}`] || route === "/api/auth/:action"
            ? route
            : "/api/*",
        status: res.statusCode,
        durationMs: Math.round(performance.now() - start),
      });
    });
    next();
  });
  app.use(express.json({ limit: "5mb" }));
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      if (req.get("X-Keeper-Request") !== "1")
        return res.status(403).json({ error: "Request rejected." });
      if (
        req.get("origin") &&
        req.get("origin") !==
          (process.env.PUBLIC_ORIGIN || `${req.protocol}://${req.get("host")}`)
      )
        return res.status(403).json({ error: "Origin rejected." });
    }
    next();
  });
  const attempts = new Map();
  const rateLimit = (req, res, next) => {
    const now = Date.now(),
      key = req.ip;
    for (const [k, v] of attempts) if (v.until < now) attempts.delete(k);
    const record = attempts.get(key) || {
      count: 0,
      until: now + 15 * 60 * 1000,
    };
    attempts.set(key, record);
    record.count++;
    if (record.count > 30)
      return res
        .status(429)
        .json({ error: "Too many sign-in attempts. Try again in 15 minutes." });
    next();
  };
  const cookie = (token, age) =>
    `keeper_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${age}${secureCookies ? "; Secure" : ""}`;
  const newSession = (res, userId) => {
    const token = randomBytes(32).toString("hex");
    db.prepare("DELETE FROM sessions WHERE expires < ?").run(Date.now());
    db.prepare("INSERT INTO sessions VALUES (?,?,?)").run(
      hash(token),
      userId,
      Date.now() + 7 * 86400000,
    );
    res.setHeader("Set-Cookie", cookie(token, 7 * 86400));
  };
  app.post("/api/auth/:action", rateLimit, async (req, res, next) => {
    try {
      const { action } = req.params;
      if (!["register", "login"].includes(action))
        return res.status(404).json({ error: "Not found." });
      const { name, email, password } = req.body || {};
      if (
        typeof email !== "string" ||
        email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        typeof password !== "string" ||
        password.length < 10 ||
        password.length > 128
      )
        return res.status(400).json({
          error: "Enter a valid email and a password of 10–128 characters.",
        });
      const normalized = email.trim().toLowerCase();
      let user = db
        .prepare("SELECT * FROM users WHERE email=?")
        .get(normalized);
      if (action === "register") {
        if (typeof name !== "string" || !name.trim() || name.length > 80)
          return res
            .status(400)
            .json({ error: "Enter a display name (up to 80 characters)." });
        if (user)
          return res
            .status(409)
            .json({ error: "Unable to create this account. Try signing in." });
        const salt = randomBytes(16).toString("hex"),
          derived = await scrypt(password, salt, 64);
        user = {
          id: randomBytes(16).toString("hex"),
          name: name.trim(),
          email: normalized,
        };
        try {
          db.prepare("INSERT INTO users VALUES (?,?,?,?)").run(
            user.id,
            user.name,
            user.email,
            `${salt}:${derived.toString("hex")}`,
          );
        } catch (e) {
          if (e.code?.includes("CONSTRAINT"))
            return res
              .status(409)
              .json({ error: "Unable to create this account." });
          throw e;
        }
      } else {
        const [salt, stored] = (
          user?.password || `${"0".repeat(32)}:${"0".repeat(128)}`
        ).split(":");
        const derived = await scrypt(password, salt, 64);
        if (
          !timingSafeEqual(Buffer.from(stored, "hex"), derived) ||
          !user ||
          !db
            .prepare("SELECT 1 FROM users WHERE id=? AND password=?")
            .get(user.id, user.password)
        )
          return res
            .status(401)
            .json({ error: "Email or password is incorrect." });
      }
      newSession(res, user.id);
      res.locals.actorId = user.id;
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: Boolean(
          db.prepare("SELECT 1 FROM admins WHERE user_id=?").get(user.id),
        ),
      });
    } catch (e) {
      next(e);
    }
  });
  app.use("/api", (req, res, next) => {
    const token = req.headers.cookie
      ?.split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith("keeper_session="))
      ?.slice(15);
    const session =
      token &&
      db
        .prepare(
          "SELECT users.id, users.name, users.email, EXISTS(SELECT 1 FROM admins WHERE user_id=users.id) AS isAdmin FROM sessions JOIN users ON users.id=sessions.user_id WHERE token=? AND expires>?",
        )
        .get(hash(token), Date.now());
    if (!session)
      return res.status(401).json({ error: "Please sign in to continue." });
    req.user = session;
    req.user.isAdmin = Boolean(session.isAdmin);
    req.sessionToken = hash(token);
    next();
  });
  app.get("/api/me", (req, res) => res.json(req.user));
  const passwordAttempts = new Map();
  app.post("/api/account/password", async (req, res, next) => {
    try {
      const now = Date.now();
      for (const [id, attempt] of passwordAttempts)
        if (attempt.until <= now) passwordAttempts.delete(id);
      const attempt = passwordAttempts.get(req.user.id) || {
        count: 0,
        until: now + 15 * 60000,
      };
      passwordAttempts.set(req.user.id, attempt);
      if (++attempt.count > 10)
        return res
          .status(429)
          .json({
            error:
              "Too many password change attempts. Try again in 15 minutes.",
          });
      const { currentPassword, newPassword } = req.body || {};
      if (
        typeof currentPassword !== "string" ||
        currentPassword.length < 10 ||
        currentPassword.length > 128 ||
        typeof newPassword !== "string" ||
        newPassword.length < 10 ||
        newPassword.length > 128
      )
        return res
          .status(400)
          .json({
            error:
              "Enter your current password and a new password of 10–128 characters.",
          });
      if (newPassword === currentPassword)
        return res
          .status(400)
          .json({ error: "Choose a different new password." });
      const user = db
        .prepare("SELECT password FROM users WHERE id=?")
        .get(req.user.id);
      const [salt, stored] = user.password.split(":");
      const currentHash = await scrypt(currentPassword, salt, 64);
      if (!timingSafeEqual(Buffer.from(stored, "hex"), currentHash))
        return res
          .status(400)
          .json({ error: "Current password is incorrect." });
      const newSalt = randomBytes(16).toString("hex");
      const newHash = await scrypt(newPassword, newSalt, 64);
      db.exec("BEGIN IMMEDIATE");
      try {
        // Recheck both credentials and session after the asynchronous hashing.
        const changed = db
          .prepare(
            `UPDATE users SET password=? WHERE id=? AND password=?
          AND EXISTS (SELECT 1 FROM sessions WHERE token=? AND user_id=? AND expires>?)`,
          )
          .run(
            `${newSalt}:${newHash.toString("hex")}`,
            req.user.id,
            user.password,
            req.sessionToken,
            req.user.id,
            Date.now(),
          );
        if (!changed.changes) {
          db.exec("ROLLBACK");
          return res
            .status(409)
            .json({
              error:
                "Your account or session changed. Sign in again before retrying.",
            });
        }
        db.prepare("DELETE FROM sessions WHERE user_id=?").run(req.user.id);
        newSession(res, req.user.id);
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        res.removeHeader("Set-Cookie");
        throw error;
      }
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });
  app.get("/api/admin/logs", (req, res) => {
    if (!req.user.isAdmin)
      return res.status(403).json({ error: "Administrator access required." });
    const { level, before } = req.query;
    if (
      Object.keys(req.query).some(
        (key) => !["level", "before"].includes(key),
      ) ||
      (level !== undefined && !["info", "warn", "error"].includes(level)) ||
      (before !== undefined &&
        (typeof before !== "string" ||
          !/^\d{1,15}$/.test(before) ||
          Number(before) < 1))
    )
      return res.status(400).json({ error: "Invalid log filter." });
    const rows = db
      .prepare(
        `SELECT * FROM audit_logs
      WHERE (? IS NULL OR level=?) AND (? IS NULL OR id<?)
      ORDER BY id DESC LIMIT 101`,
      )
      .all(
        level ?? null,
        level ?? null,
        before ?? null,
        before === undefined ? null : Number(before),
      );
    const logs = rows.slice(0, 100);
    res.json({ logs, nextBefore: rows.length > 100 ? logs.at(-1).id : null });
  });
  app.post("/api/logout", (req, res) => {
    db.prepare("DELETE FROM sessions WHERE token=?").run(req.sessionToken);
    res.setHeader("Set-Cookie", cookie("", 0));
    res.json({ ok: true });
  });
  app.get("/api/characters", (req, res) =>
    res.json(
      db
        .prepare(
          "SELECT id,data,updated FROM characters WHERE user_id=? ORDER BY updated DESC",
        )
        .all(req.user.id)
        .map((row) => ({
          ...normalizeCharacterSlots(JSON.parse(row.data)),
          id: row.id,
          updated: row.updated,
        })),
    ),
  );
  app.post("/api/characters", (req, res) => {
    if (!validateCharacter(req.body))
      return res.status(400).json({
        error:
          "Some character fields are invalid. Check the values and try again.",
      });
    const id = randomBytes(16).toString("hex"),
      updated = new Date().toISOString();
    const character = normalizeCharacterSlots(req.body);
    const preparationError = preparationIncreaseError(character);
    if (preparationError)
      return res.status(400).json({ error: preparationError });
    const weaponError = weaponChangeError(character);
    if (weaponError) return res.status(400).json({ error: weaponError });
    db.prepare("INSERT INTO characters VALUES (?,?,?,?)").run(
      id,
      req.user.id,
      JSON.stringify(character),
      updated,
    );
    res.status(201).json({ ...character, id, updated });
  });
  app.put("/api/characters/:id", (req, res) => {
    if (!validateCharacter(req.body))
      return res.status(400).json({
        error:
          "Some character fields are invalid. Check the values and try again.",
      });
    const updated = new Date().toISOString();
    const character = normalizeCharacterSlots(req.body);
    const previous = db
      .prepare("SELECT data FROM characters WHERE id=? AND user_id=?")
      .get(req.params.id, req.user.id);
    if (!previous)
      return res.status(404).json({ error: "Character not found." });
    const preparationError = preparationIncreaseError(
      character,
      JSON.parse(previous.data),
    );
    if (preparationError)
      return res.status(400).json({ error: preparationError });
    const weaponError = weaponChangeError(character, JSON.parse(previous.data));
    if (weaponError) return res.status(400).json({ error: weaponError });
    const result = db
      .prepare(
        "UPDATE characters SET data=?,updated=? WHERE id=? AND user_id=?",
      )
      .run(JSON.stringify(character), updated, req.params.id, req.user.id);
    if (!result.changes)
      return res.status(404).json({ error: "Character not found." });
    res.json({ ...character, id: req.params.id, updated });
  });
  app.delete("/api/characters/:id", (req, res) => {
    const result = db
      .prepare("DELETE FROM characters WHERE id=? AND user_id=?")
      .run(req.params.id, req.user.id);
    if (!result.changes)
      return res.status(404).json({ error: "Character not found." });
    res.json({ ok: true });
  });
  registerBugRoutes(app, db);
  app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));
  app.use((err, req, res, next) => {
    if (req.path.startsWith("/api")) {
      console.error("API request failed.");
      return res.status(err.status || 500).json({
        error:
          err.status === 413
            ? "Character data is too large."
            : "Unable to complete the request.",
      });
    }
    next(err);
  });
  return { app, db, audit };
}
