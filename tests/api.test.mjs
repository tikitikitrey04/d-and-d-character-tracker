import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.mjs";
import {
  blankCharacter,
  modifier,
  proficiency,
  validateCharacter,
} from "../shared/character.mjs";
test("ability modifiers, proficiency progression, and character validation", () => {
  assert.equal(modifier(9), -1);
  assert.equal(modifier(20), 5);
  assert.deepEqual(
    [1, 4, 5, 9, 13, 17, 20].map(proficiency),
    [2, 2, 3, 4, 5, 6, 6],
  );
  const c = { ...blankCharacter(), name: "Test" };
  assert.ok(validateCharacter(c));
  assert.equal(validateCharacter({ ...c, hp: 11 }), false);
  assert.equal(validateCharacter({ ...c, level: 21 }), false);
  assert.equal(validateCharacter({ ...c, abilities: [10] }), false);
  assert.equal(validateCharacter({ ...c, skills: { Hacking: 2 } }), false);
  assert.equal(
    validateCharacter({
      ...c,
      resources: [{ id: "x", name: "Wind", detail: "", max: 1, used: 2 }],
    }),
    false,
  );
});
test("accounts persist characters and cannot access each other’s sheets", async () => {
  const { app, db } = createApp({
    databasePath: ":memory:",
    secureCookies: false,
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(
    path,
    { method = "GET", body, cookie, headers = {} } = {},
  ) {
    const response = await fetch(base + "/api" + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Keeper-Request": "1",
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return {
      status: response.status,
      data: await response.json(),
      cookie: response.headers.get("set-cookie")?.split(";")[0],
    };
  }
  try {
    assert.equal((await request("/characters")).status, 401);
    const alice = await request("/auth/register", {
      method: "POST",
      body: {
        name: "Alice",
        email: "alice@example.com",
        password: "secret-password",
      },
    });
    assert.equal(alice.status, 200);
    assert.ok(alice.cookie);
    const bob = await request("/auth/register", {
      method: "POST",
      body: {
        name: "Bob",
        email: "bob@example.com",
        password: "another-password",
      },
    });
    assert.equal(bob.status, 200);
    assert.equal(
      (await request("/me", { cookie: alice.cookie })).data.name,
      "Alice",
    );
    assert.equal(
      (
        await request("/auth/login", {
          method: "POST",
          body: { email: "alice@example.com", password: "wrong-password" },
        })
      ).status,
      401,
    );
    const c = {
      ...blankCharacter(),
      name: "Mira",
      class: "Wizard",
      notes: "A secret",
      inventory: [
        {
          id: "sword",
          name: "Sword",
          detail: "Keepsake",
          quantity: 1,
          equipped: true,
        },
      ],
      spells: [
        { id: "light", name: "Light", detail: "", level: 0, prepared: true },
      ],
    };
    const created = await request("/characters", {
      method: "POST",
      cookie: alice.cookie,
      body: c,
    });
    assert.equal(created.status, 201);
    const id = created.data.id;
    assert.equal(
      (await request("/characters", { cookie: bob.cookie })).data.length,
      0,
    );
    assert.equal(
      (
        await request(`/characters/${id}`, {
          method: "PUT",
          cookie: bob.cookie,
          body: c,
        })
      ).status,
      404,
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
    assert.equal(
      (
        await request(`/characters/${id}`, {
          method: "PUT",
          cookie: alice.cookie,
          body: { ...c, hp: -1 },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request(`/characters/${id}`, {
          method: "PUT",
          cookie: alice.cookie,
          body: { ...c, hp: 5, notes: "Updated" },
        })
      ).status,
      200,
    );
    const login = await request("/auth/login", {
      method: "POST",
      body: { email: "ALICE@example.com", password: "secret-password" },
    });
    assert.equal(login.status, 200);
    const saved = (await request("/characters", { cookie: login.cookie }))
      .data[0];
    assert.equal(saved.hp, 5);
    assert.equal(saved.notes, "Updated");
    assert.equal(saved.inventory[0].equipped, true);
    assert.equal(
      (
        await request("/logout", {
          method: "POST",
          cookie: alice.cookie,
          headers: { Origin: "https://other.example" },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await request("/logout", {
          method: "POST",
          cookie: alice.cookie,
          headers: { "X-Keeper-Request": "" },
        })
      ).status,
      403,
    );
    assert.equal(
      (await request("/logout", { method: "POST", cookie: alice.cookie }))
        .status,
      200,
    );
    assert.equal((await request("/me", { cookie: alice.cookie })).status, 401);
    assert.equal(
      (
        await request(`/characters/${id}`, {
          method: "DELETE",
          cookie: login.cookie,
        })
      ).status,
      200,
    );
    assert.equal(
      (await request("/characters", { cookie: login.cookie })).data.length,
      0,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});
