import test from "node:test";
import assert from "node:assert/strict";
import { createServer as createHttpServer } from "node:http";
import { createServer as createViteServer } from "vite";
import viteConfig from "../vite.config.js";
import { createApp } from "../server/app.mjs";
import { blankCharacter } from "../shared/character.mjs";

test("local Vite proxy preserves the browser origin for saves, archive and restore", async () => {
  const { app, db } = createApp({
    databasePath: ":memory:",
    secureCookies: false,
    publicOrigin: "",
  });
  const backend = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => backend.once("listening", resolve));
  let vite, frontend;
  try {
    vite = await createViteServer({
      configFile: false,
      server: {
        middlewareMode: true,
        hmr: false,
        proxy: {
          "/api": {
            ...viteConfig.server.proxy["/api"],
            target: `http://127.0.0.1:${backend.address().port}`,
          },
        },
      },
    });
    frontend = createHttpServer(vite.middlewares).listen(0, "127.0.0.1");
    await new Promise((resolve) => frontend.once("listening", resolve));
    const origin = `http://127.0.0.1:${frontend.address().port}`;
    async function request(
      path,
      { method = "GET", body, cookie, requestOrigin = origin } = {},
    ) {
      const res = await fetch(`${origin}/api${path}`, {
        method,
        headers: {
          Origin: requestOrigin,
          "Content-Type": "application/json",
          "X-Keeper-Request": "1",
          ...(cookie ? { Cookie: cookie } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return {
        status: res.status,
        data: await res.json(),
        cookie: res.headers.get("set-cookie")?.split(";")[0],
      };
    }
    const registered = await request("/auth/register", {
      method: "POST",
      body: {
        name: "Local player",
        email: "local@example.com",
        password: "local-test-password",
      },
    });
    assert.equal(registered.status, 200);
    const cookie = registered.cookie;
    const draft = { ...blankCharacter(), name: "Local hero" };
    const created = await request("/characters", {
      method: "POST",
      cookie,
      body: draft,
    });
    assert.equal(created.status, 201);
    const id = created.data.id;
    const saved = await request(`/characters/${id}`, {
      method: "PUT",
      cookie,
      body: { ...draft, notes: "Saved through Vite" },
    });
    assert.equal(saved.status, 200);
    const archived = await request(`/characters/${id}/archive`, {
      method: "POST",
      cookie,
    });
    assert.equal(archived.status, 200);
    assert.equal(archived.data.notes, "Saved through Vite");
    assert.equal((await request("/characters", { cookie })).data.length, 0);
    assert.equal(
      (await request(`/characters/${id}/restore`, { method: "POST", cookie }))
        .status,
      200,
    );
    assert.equal((await request("/characters", { cookie })).data[0].id, id);
    const rejected = await request(`/characters/${id}/archive`, {
      method: "POST",
      cookie,
      requestOrigin: "https://evil.example",
    });
    assert.equal(rejected.status, 403);
    assert.equal(rejected.data.error, "Origin rejected.");
  } finally {
    if (frontend) await new Promise((resolve) => frontend.close(resolve));
    if (vite) await vite.close();
    await new Promise((resolve) => backend.close(resolve));
    db.close();
  }
});
