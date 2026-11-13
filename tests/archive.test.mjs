import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, unlinkSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server/app.mjs";
import { blankCharacter } from "../shared/character.mjs";

test("archive preserves full sheets across restarts and enforces ownership for all operations", async () => {
  const dir = mkdtempSync(join(tmpdir(), "keeper-archive-"));
  const databasePath = join(dir, "test.sqlite");
  let instance = createApp({ databasePath, secureCookies: false });
  let server;
  async function start() {
    server = instance.app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
  }
  async function stop() {
    await new Promise((resolve) => server.close(resolve));
    instance.db.close();
  }
  await start();
  async function request(
    path,
    { method = "GET", cookie, body, headers = {} } = {},
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
    return {
      status: res.status,
      data: await res.json(),
      cookie: res.headers.get("set-cookie")?.split(";")[0],
    };
  }
  const register = (name) =>
    request("/auth/register", {
      method: "POST",
      body: {
        name,
        email: `${name}@example.com`,
        password: "archive-test-password",
      },
    });
  try {
    const alice = await register("Alice"),
      bob = await register("Bob");
    const draft = {
      ...blankCharacter(),
      name: "PRIVATE_ARCHIVED_HERO",
      notes: "PRIVATE_ARCHIVED_JOURNAL",
      gold: 37,
      inventory: [
        {
          id: "rope",
          name: "Rope",
          detail: "Silk",
          quantity: 2,
          equipped: true,
        },
      ],
    };
    const created = await request("/characters", {
      method: "POST",
      cookie: alice.cookie,
      body: draft,
    });
    assert.equal(created.status, 201);
    const id = created.data.id;
    const stored = instance.db
      .prepare("SELECT data,updated FROM characters WHERE id=?")
      .get(id);
    assert.equal(
      (await request("/characters?archived=true", { cookie: alice.cookie }))
        .data.length,
      0,
    );
    for (const action of ["archive", "restore"]) {
      assert.equal(
        (await request(`/characters/${id}/${action}`, { method: "POST" }))
          .status,
        401,
      );
      assert.equal(
        (
          await request(`/characters/${id}/${action}`, {
            method: "POST",
            cookie: bob.cookie,
          })
        ).status,
        404,
      );
      assert.equal(
        (
          await request(`/characters/missing/${action}`, {
            method: "POST",
            cookie: alice.cookie,
          })
        ).status,
        404,
      );
      assert.equal(
        (
          await request(`/characters/${id}/${action}`, {
            method: "POST",
            cookie: alice.cookie,
            headers: { Origin: "https://evil.example" },
          })
        ).status,
        403,
      );
    }
    const archived = await request(`/characters/${id}/archive`, {
      method: "POST",
      cookie: alice.cookie,
    });
    assert.equal(archived.status, 200);
    assert.ok(archived.data.archivedAt);
    const { archivedAt, ...sheet } = archived.data;
    assert.deepEqual(sheet, created.data);
    assert.deepEqual(
      instance.db
        .prepare("SELECT data,updated FROM characters WHERE id=?")
        .get(id),
      stored,
    );
    assert.equal(
      (await request("/characters", { cookie: alice.cookie })).data.length,
      0,
    );
    assert.equal(
      (await request("/characters?archived=false", { cookie: alice.cookie }))
        .data.length,
      0,
    );
    assert.equal(
      (await request("/characters?archived=true", { cookie: alice.cookie }))
        .data[0].notes,
      draft.notes,
    );
    assert.equal(
      (await request("/characters?archived=true", { cookie: bob.cookie })).data
        .length,
      0,
    );
    const repeated = await request(`/characters/${id}/archive`, {
      method: "POST",
      cookie: alice.cookie,
    });
    assert.equal(repeated.data.archivedAt, archivedAt);
    assert.equal(
      (
        await request(`/characters/${id}`, {
          method: "PUT",
          cookie: alice.cookie,
          body: { ...draft, name: "Overwrite" },
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await request(`/characters/${id}`, {
          method: "DELETE",
          cookie: bob.cookie,
        })
      ).status,
      404,
    );
    for (const query of [
      "archived=invalid",
      "archived[]=true",
      "archived=true&archived=false",
      "user_id=someone",
    ])
      assert.equal(
        (await request(`/characters?${query}`, { cookie: alice.cookie }))
          .status,
        400,
      );
    await stop();
    instance = createApp({ databasePath, secureCookies: false });
    await start();
    assert.equal(
      (await request("/characters?archived=true", { cookie: alice.cookie }))
        .data[0].id,
      id,
    );
    const restored = await request(`/characters/${id}/restore`, {
      method: "POST",
      cookie: alice.cookie,
    });
    assert.deepEqual(restored.data, created.data);
    assert.equal(
      (await request("/characters?archived=true", { cookie: alice.cookie }))
        .data.length,
      0,
    );
    assert.deepEqual(
      (await request("/characters", { cookie: alice.cookie })).data,
      [created.data],
    );
    assert.equal(
      (
        await request(`/characters/${id}/restore`, {
          method: "POST",
          cookie: alice.cookie,
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await request(`/characters/${id}`, {
          method: "PUT",
          cookie: alice.cookie,
          body: { ...draft, notes: "New adventure" },
        })
      ).status,
      200,
    );
    await request(`/characters/${id}/archive`, {
      method: "POST",
      cookie: alice.cookie,
    });
    assert.equal(
      (
        await request(`/characters/${id}`, {
          method: "DELETE",
          cookie: alice.cookie,
        })
      ).status,
      200,
    );
    assert.equal(
      instance.db.prepare("SELECT COUNT(*) AS n FROM character_archives").get()
        .n,
      0,
    );
  } finally {
    await stop();
    for (const file of readdirSync(dir)) unlinkSync(join(dir, file));
    rmdirSync(dir);
  }
});
