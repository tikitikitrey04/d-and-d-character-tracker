import test from "node:test";
import assert from "node:assert/strict";
import { secureCookiesFromEnv } from "../server/config.mjs";
import { newId } from "../shared/id.mjs";
import { createApp } from "../server/app.mjs";
import { request as httpRequest } from "node:http";

test("production cookies stay secure by default, with an explicit LAN HTTP override", () => {
  assert.equal(secureCookiesFromEnv({ NODE_ENV: "production" }), true);
  assert.equal(secureCookiesFromEnv({ NODE_ENV: "development" }), false);
  assert.equal(
    secureCookiesFromEnv({ NODE_ENV: "production", SECURE_COOKIES: "false" }),
    false,
  );
  assert.equal(
    secureCookiesFromEnv({ NODE_ENV: "development", SECURE_COOKIES: "true" }),
    true,
  );
  assert.throws(
    () => secureCookiesFromEnv({ SECURE_COOKIES: "maybe" }),
    /must be true or false/,
  );
});

test("IDs remain valid and unique when randomUUID is unavailable on LAN HTTP", () => {
  const insecureCrypto = {
    getRandomValues: (array) => crypto.getRandomValues(array),
  };
  const ids = Array.from({ length: 100 }, () => newId(insecureCrypto));
  assert.equal(new Set(ids).size, 100);
  for (const id of ids)
    assert.match(
      id,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  assert.equal(newId({ randomUUID: () => "native-id" }), "native-id");
});

test("public HTTPS registration and login work over an internal HTTP proxy connection", async () => {
  const publicOrigin = "https://dnd.everetttang.com";
  const { app, db } = createApp({
    databasePath: ":memory:",
    secureCookies: true,
    publicOrigin,
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  async function request(
    path,
    { origin = publicOrigin, cookie, body, extraHeaders = {} } = {},
  ) {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api${path}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Keeper-Request": "1",
          Origin: origin,
          ...(cookie ? { Cookie: cookie } : {}),
          ...extraHeaders,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );
    return {
      status: response.status,
      data: await response.json(),
      cookie: response.headers.get("set-cookie"),
    };
  }
  try {
    const credentials = {
      name: "Remote player",
      email: "remote@example.com",
      password: "remote-player-password",
    };
    const registered = await request("/auth/register", { body: credentials });
    assert.equal(registered.status, 200);
    assert.match(registered.cookie, /; Secure/);
    const loggedIn = await request("/auth/login", { body: credentials });
    assert.equal(loggedIn.status, 200);
    assert.equal(loggedIn.data.id, registered.data.id);
    const cookie = loggedIn.cookie.split(";")[0];
    for (const origin of [
      "https://evil.example",
      "http://dnd.everetttang.com",
      "https://dnd.everetttang.com.evil.example",
      "https://dnd.everetttang.com:444",
      "null",
    ]) {
      const response = await request("/logout", {
        origin,
        cookie,
        extraHeaders: {
          "X-Forwarded-Host": "dnd.everetttang.com",
          "X-Forwarded-Proto": "https",
        },
      });
      assert.equal(response.status, 403);
      assert.equal(response.data.error, "Origin rejected.");
    }
    assert.equal((await request("/logout", { cookie })).status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});

test("health check and same-origin LAN HTTP login work with persistent cookies", async () => {
  const { app, db } = createApp({
    databasePath: ":memory:",
    secureCookies: secureCookiesFromEnv({
      NODE_ENV: "production",
      SECURE_COOKIES: "false",
    }),
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const lanRequest = (path, options) =>
    new Promise((resolve, reject) => {
      const req = httpRequest(
        url + path,
        { method: options.method || "GET", headers: options.headers },
        (res) => {
          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () =>
            resolve({
              status: res.statusCode,
              data: JSON.parse(Buffer.concat(chunks).toString()),
              cookie: res.headers["set-cookie"]?.[0],
            }),
          );
        },
      );
      req.on("error", reject);
      req.end(options.body);
    });
  try {
    const health = await fetch(url + "/healthz");
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { ok: true });
    const host = "192.168.1.10:3001";
    const headers = {
      "Content-Type": "application/json",
      "X-Keeper-Request": "1",
      Host: host,
      Origin: `http://${host}`,
    };
    const response = await lanRequest("/api/auth/register", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "LAN Player",
        email: "lan@example.com",
        password: "network-password",
      }),
    });
    assert.equal(response.status, 200);
    const cookie = response.cookie;
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    assert.doesNotMatch(cookie, /; Secure/);
    const me = await lanRequest("/api/me", {
      headers: { Host: host, Cookie: cookie.split(";")[0] },
    });
    assert.equal(me.status, 200);
    assert.equal(me.data.name, "LAN Player");
    const rejected = await lanRequest("/api/logout", {
      method: "POST",
      headers: {
        ...headers,
        Origin: "http://other-device:3001",
        Cookie: cookie.split(";")[0],
      },
    });
    assert.equal(rejected.status, 403);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});
