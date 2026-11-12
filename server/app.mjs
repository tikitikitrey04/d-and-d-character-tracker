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
const scrypt = promisify(scryptCallback);
const hash = (value) => createHash("sha256").update(value).digest("hex");
export function createApp({
  databasePath = "data/keeper.sqlite",
  secureCookies = process.env.NODE_ENV === "production",
} = {}) {
  const db = new DatabaseSync(databasePath);
  db.exec(
    "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS characters (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), data TEXT NOT NULL, updated TEXT NOT NULL);",
  );
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "5mb" }));
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      if (req.get("X-Keeper-Request") !== "1")
        return res.status(403).json({ error: "Request rejected." });
      if (
        req.get("origin") &&
        req.get("origin") !== `${req.protocol}://${req.get("host")}`
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
        if (!timingSafeEqual(Buffer.from(stored, "hex"), derived) || !user)
          return res
            .status(401)
            .json({ error: "Email or password is incorrect." });
      }
      newSession(res, user.id);
      res.json({ id: user.id, name: user.name, email: user.email });
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
          "SELECT users.id, users.name, users.email FROM sessions JOIN users ON users.id=sessions.user_id WHERE token=? AND expires>?",
        )
        .get(hash(token), Date.now());
    if (!session)
      return res.status(401).json({ error: "Please sign in to continue." });
    req.user = session;
    req.sessionToken = hash(token);
    next();
  });
  app.get("/api/me", (req, res) => res.json(req.user));
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
  app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));
  app.use((err, req, res, next) => {
    if (req.path.startsWith("/api")) {
      console.error(err.message);
      return res.status(err.status || 500).json({
        error:
          err.status === 413
            ? "Character data is too large."
            : "Unable to complete the request.",
      });
    }
    next(err);
  });
  return { app, db };
}
