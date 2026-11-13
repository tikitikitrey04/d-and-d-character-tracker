import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.mjs";
import { setAdmin } from "../server/audit.mjs";
import { blankCharacter } from "../shared/character.mjs";

async function fixture(t, secureCookies = false) {
  const instance = createApp({ databasePath: ":memory:", secureCookies });
  const server = instance.app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    instance.db.close();
  });
  async function request(
    path,
    { method = "GET", body, cookie, headers = {} } = {},
  ) {
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
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
    );
    const rawCookie = res.headers.get("set-cookie");
    return {
      status: res.status,
      data: await res.json(),
      cookie: rawCookie?.split(";")[0],
      rawCookie,
    };
  }
  const register = (email) =>
    request("/auth/register", {
      method: "POST",
      body: { name: email, email, password: "original-password" },
    });
  const login = (email, password) =>
    request("/auth/login", { method: "POST", body: { email, password } });
  const change = (cookie, newPassword, currentPassword = "original-password") =>
    request("/account/password", {
      method: "POST",
      cookie,
      body: { currentPassword, newPassword },
    });
  return { ...instance, request, register, login, change };
}

test("password change rotates sessions, preserves characters and roles, and never logs credentials", async (t) => {
  const f = await fixture(t, true);
  const alice = await f.register("alice@example.com"),
    bob = await f.register("bob@example.com");
  const otherSession = await f.login("alice@example.com", "original-password");
  setAdmin(f.db, "alice@example.com", true, f.audit);
  await f.request("/characters", {
    method: "POST",
    cookie: alice.cookie,
    body: { ...blankCharacter(), name: "Keep my hero" },
  });
  const oldHash = f.db
    .prepare("SELECT password FROM users WHERE id=?")
    .get(alice.data.id).password;
  const changed = await f.change(alice.cookie, "replacement-password");
  assert.equal(changed.status, 200);
  assert.notEqual(changed.cookie, alice.cookie);
  assert.match(changed.rawCookie, /HttpOnly; SameSite=Lax/);
  assert.match(changed.rawCookie, /; Secure/);
  for (const cookie of [alice.cookie, otherSession.cookie])
    assert.equal((await f.request("/me", { cookie })).status, 401);
  assert.equal(
    (await f.request("/me", { cookie: changed.cookie })).data.isAdmin,
    true,
  );
  assert.equal(
    (await f.request("/characters", { cookie: changed.cookie })).data[0].name,
    "Keep my hero",
  );
  assert.equal((await f.request("/me", { cookie: bob.cookie })).status, 200);
  assert.equal(
    (await f.login("alice@example.com", "original-password")).status,
    401,
  );
  assert.equal(
    (await f.login("alice@example.com", "replacement-password")).status,
    200,
  );
  assert.equal(
    (await f.login("bob@example.com", "original-password")).status,
    200,
  );
  const newHash = f.db
    .prepare("SELECT password FROM users WHERE id=?")
    .get(alice.data.id).password;
  assert.notEqual(oldHash, newHash);
  assert.match(newHash, /^[a-f0-9]{32}:[a-f0-9]{128}$/);
  const logs = JSON.stringify(
    (await f.request("/admin/logs", { cookie: changed.cookie })).data,
  );
  assert.match(logs, /account.password.changed/);
  for (const secret of [
    "original-password",
    "replacement-password",
    oldHash,
    newHash,
    changed.cookie.split("=")[1],
  ])
    assert.ok(!logs.includes(secret));
});

test("password change requires authentication, correct credentials and same-origin protection", async (t) => {
  const f = await fixture(t);
  assert.equal((await f.change(undefined, "replacement-password")).status, 401);
  const alice = await f.register("alice@example.com");
  const valid = {
    currentPassword: "original-password",
    newPassword: "replacement-password",
  };
  for (const headers of [
    { Origin: "https://evil.example" },
    { "X-Keeper-Request": "" },
  ])
    assert.equal(
      (
        await f.request("/account/password", {
          method: "POST",
          cookie: alice.cookie,
          body: valid,
          headers,
        })
      ).status,
      403,
    );
  for (const body of [
    {},
    { ...valid, currentPassword: 123 },
    { ...valid, newPassword: "short" },
    { ...valid, newPassword: "x".repeat(129) },
    { ...valid, currentPassword: "x".repeat(129) },
    { ...valid, newPassword: valid.currentPassword },
  ])
    assert.equal(
      (
        await f.request("/account/password", {
          method: "POST",
          cookie: alice.cookie,
          body,
        })
      ).status,
      400,
    );
  const wrong = await f.change(
    alice.cookie,
    "replacement-password",
    "incorrect-password",
  );
  assert.equal(wrong.status, 400);
  assert.equal(wrong.data.error, "Current password is incorrect.");
  assert.equal(wrong.cookie, undefined);
  assert.equal((await f.request("/me", { cookie: alice.cookie })).status, 200);
  assert.equal(
    (await f.login("alice@example.com", "original-password")).status,
    200,
  );
  const changed = await f.change(alice.cookie, "replacement-password");
  assert.equal(changed.status, 200);
  assert.doesNotMatch(changed.rawCookie, /; Secure/);
});

test("password-change throttling applies per account", async (t) => {
  const f = await fixture(t);
  const alice = await f.register("alice@example.com"),
    bob = await f.register("bob@example.com");
  for (let i = 0; i < 10; i++)
    assert.equal(
      (
        await f.change(
          alice.cookie,
          "replacement-password",
          "incorrect-password",
        )
      ).status,
      400,
    );
  assert.equal(
    (await f.change(alice.cookie, "replacement-password")).status,
    429,
  );
  assert.equal(
    (await f.change(bob.cookie, "replacement-password")).status,
    200,
  );
});

test("concurrent password changes cannot overwrite the winning credentials", async (t) => {
  const f = await fixture(t);
  const alice = await f.register("alice@example.com");
  const results = await Promise.all([
    f.change(alice.cookie, "replacement-one"),
    f.change(alice.cookie, "replacement-two"),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  const winner = results.findIndex((r) => r.status === 200);
  assert.equal(
    (
      await f.login(
        "alice@example.com",
        winner === 0 ? "replacement-one" : "replacement-two",
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await f.login(
        "alice@example.com",
        winner === 0 ? "replacement-two" : "replacement-one",
      )
    ).status,
    401,
  );
  assert.equal(results[1 - winner].cookie, undefined);
});

test("failed session renewal rolls back both password and session changes", async (t) => {
  const f = await fixture(t);
  const alice = await f.register("alice@example.com");
  f.db.exec(
    "CREATE TRIGGER fail_session BEFORE INSERT ON sessions BEGIN SELECT RAISE(ABORT, 'test failure'); END",
  );
  const failed = await f.change(alice.cookie, "replacement-password");
  assert.equal(failed.status, 500);
  assert.equal(failed.cookie, undefined);
  assert.equal((await f.request("/me", { cookie: alice.cookie })).status, 200);
  f.db.exec("DROP TRIGGER fail_session");
  assert.equal(
    (await f.login("alice@example.com", "original-password")).status,
    200,
  );
  assert.equal(
    (await f.login("alice@example.com", "replacement-password")).status,
    401,
  );
});
