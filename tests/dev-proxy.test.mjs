import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createApp } from "../server/app.mjs";
import config from "../vite.config.js";

test("development proxy allows same-origin registration and rejects foreign origins", async () => {
  const { app, db } = createApp({
    databasePath: ":memory:",
    secureCookies: false,
  });
  const backend = app.listen(0, "127.0.0.1");
  let vite;
  try {
    await new Promise((resolve) => backend.once("listening", resolve));
    vite = await createServer({
      configFile: false,
      server: {
        host: "127.0.0.1",
        port: 0,
        proxy: {
          "/api": {
            ...config.server.proxy["/api"],
            target: `http://127.0.0.1:${backend.address().port}`,
          },
        },
      },
    });
    await vite.listen();
    const origin = `http://127.0.0.1:${vite.httpServer.address().port}`;
    const register = (requestOrigin, email) =>
      fetch(`${origin}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Keeper-Request": "1",
          Origin: requestOrigin,
        },
        body: JSON.stringify({
          name: "Local player",
          email,
          password: "test-password-123",
        }),
      });
    const accepted = await register(origin, "local@example.com");
    assert.equal(accepted.status, 200);
    assert.match(accepted.headers.get("set-cookie"), /keeper_session=/);
    const rejected = await register(
      "http://other.example",
      "foreign@example.com",
    );
    assert.equal(rejected.status, 403);
    assert.equal((await rejected.json()).error, "Origin rejected.");
  } finally {
    await vite?.close();
    await new Promise((resolve) => backend.close(resolve));
    db.close();
  }
});
