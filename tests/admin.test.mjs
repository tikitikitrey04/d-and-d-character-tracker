import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.mjs";
import { setAdmin } from "../server/audit.mjs";
import { blankCharacter } from "../shared/character.mjs";

test("admin logs enforce roles, redact secrets, page results and revoke existing sessions", async () => {
  const { app, db, audit } = createApp({
    databasePath: ":memory:",
    secureCookies: false,
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const request = async (
    path,
    { cookie, method = "GET", body, headers = {} } = {},
  ) => {
    const res = await fetch(
      `http://127.0.0.1:${server.address().port}/api${path}`,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Keeper-Request": "1",
          ...(cookie ? { Cookie: cookie } : {}),
          ...headers,
        },
        ...(body === undefined
          ? {}
          : { body: typeof body === "string" ? body : JSON.stringify(body) }),
      },
    );
    return {
      status: res.status,
      data: await res.json(),
      cookie: res.headers.get("set-cookie")?.split(";")[0],
    };
  };
  try {
    assert.equal((await request("/admin/logs")).status, 401);
    const credentials = {
      name: "Owner",
      email: "owner@example.com",
      password: "secret-password-123",
      isAdmin: true,
    };
    const user = await request("/auth/register", {
      method: "POST",
      body: credentials,
    });
    assert.equal(user.data.isAdmin, false);
    assert.equal(
      (await request("/admin/logs", { cookie: user.cookie })).status,
      403,
    );
    setAdmin(db, credentials.email, true, audit);
    assert.equal(
      (await request("/me", { cookie: user.cookie })).data.isAdmin,
      true,
    );
    const login = await request("/auth/login", {
      method: "POST",
      body: credentials,
    });
    assert.equal(login.data.isAdmin, true);
    const player = await request("/auth/register", {
      method: "POST",
      body: { ...credentials, email: "player@example.com" },
    });
    assert.equal(
      (await request("/admin/logs", { cookie: player.cookie })).status,
      403,
    );
    assert.equal(
      (
        await request("/auth/login", {
          method: "POST",
          body: { ...credentials, password: "wrong-password-123" },
        })
      ).status,
      401,
    );
    const character = await request("/characters", {
      method: "POST",
      cookie: user.cookie,
      body: { ...blankCharacter(), name: "PRIVATE_CHARACTER_CONTENT" },
    });
    assert.equal(character.status, 201);
    await request(`/characters/${character.data.id}?private=SECRET_QUERY`, {
      method: "DELETE",
      cookie: user.cookie,
    });
    await request("/characters?secret=SECRET_QUERY", {
      method: "POST",
      cookie: user.cookie,
      body: '{"password":"BODY_SECRET",',
    });
    db.exec(
      "CREATE TRIGGER test_error BEFORE INSERT ON characters BEGIN SELECT RAISE(ABORT, 'INTERNAL_SECRET'); END",
    );
    assert.equal(
      (
        await request("/characters", {
          method: "POST",
          cookie: user.cookie,
          body: { ...blankCharacter(), name: "PRIVATE_CHARACTER_CONTENT" },
        })
      ).status,
      500,
    );
    db.exec("DROP TRIGGER test_error");
    const logs = await request("/admin/logs", { cookie: user.cookie });
    assert.equal(logs.status, 200);
    for (const event of [
      "admin.granted",
      "auth.register",
      "auth.login",
      "character.created",
      "character.deleted",
    ])
      assert.ok(
        logs.data.logs.some((row) => row.event === event),
        event,
      );
    assert.ok(
      logs.data.logs.some(
        (row) =>
          row.event === "auth.login" &&
          row.status === 401 &&
          row.level === "warn",
      ),
    );
    assert.ok(
      logs.data.logs.some((row) => row.status === 500 && row.level === "error"),
    );
    const text = JSON.stringify(logs.data);
    for (const secret of [
      credentials.password,
      credentials.email,
      user.cookie.split("=")[1],
      "PRIVATE_CHARACTER_CONTENT",
      "SECRET_QUERY",
      "BODY_SECRET",
      "INTERNAL_SECRET",
      character.data.id,
    ])
      assert.ok(!text.includes(secret), secret);
    for (let i = 0; i < 105; i++) audit({ event: "test.entry" });
    const page = await request("/admin/logs", { cookie: user.cookie });
    assert.equal(page.data.logs.length, 100);
    const older = await request(`/admin/logs?before=${page.data.nextBefore}`, {
      cookie: user.cookie,
    });
    assert.ok(older.data.logs.every((row) => row.id < page.data.nextBefore));
    const warnings = await request("/admin/logs?level=warn", {
      cookie: user.cookie,
    });
    assert.ok(warnings.data.logs.length > 0);
    assert.ok(warnings.data.logs.every((row) => row.level === "warn"));
    for (const query of [
      "before=-1",
      "level=bogus",
      "before=1%20OR%201=1",
      "level[]=warn",
    ])
      assert.equal(
        (await request(`/admin/logs?${query}`, { cookie: user.cookie })).status,
        400,
      );
    setAdmin(db, credentials.email, false, audit);
    assert.equal(
      (await request("/admin/logs", { cookie: user.cookie })).status,
      403,
    );
    assert.throws(
      () => setAdmin(db, "missing@example.com", true, audit),
      /Account not found/,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});

test("audit retention removes expired entries and caps records", () => {
  const { db, audit } = createApp({ databasePath: ":memory:" });
  try {
    db.prepare("INSERT INTO audit_logs (time,level,event) VALUES (?,?,?)").run(
      "2000-01-01T00:00:00.000Z",
      "info",
      "expired",
    );
    db.exec("BEGIN");
    const insert = db.prepare(
      "INSERT INTO audit_logs (time,level,event) VALUES (?,?,?)",
    );
    for (let i = 0; i < 10005; i++)
      insert.run(new Date().toISOString(), "info", "test");
    db.exec("COMMIT");
    audit({ event: "latest" });
    assert.equal(
      db.prepare("SELECT COUNT(*) AS n FROM audit_logs").get().n,
      10000,
    );
    assert.equal(
      db
        .prepare("SELECT COUNT(*) AS n FROM audit_logs WHERE event='expired'")
        .get().n,
      0,
    );
  } finally {
    db.close();
  }
});
