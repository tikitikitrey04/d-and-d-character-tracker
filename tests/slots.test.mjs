import test from "node:test";
import assert from "node:assert/strict";
import {
  automaticSlotMaximums,
  normalizeCharacterSlots,
} from "../shared/slots.mjs";
import { blankCharacter } from "../shared/character.mjs";
import { createApp } from "../server/app.mjs";

const character = (className, level, subclass = "") => ({
  ...blankCharacter(),
  name: "Caster",
  class: className,
  level,
  subclass,
});
const pad = (row) => Array.from({ length: 9 }, (_, i) => row[i] || 0);
const max = (c) => c.slots.map((s) => s.max);

test("2024 class slot tables at low, middle, and high levels", () => {
  for (const name of ["Bard", "Cleric", "Druid", "Sorcerer", "Wizard"]) {
    for (const [level, row] of [
      [1, [2]],
      [2, [3]],
      [3, [4, 2]],
      [5, [4, 3, 2]],
      [11, [4, 3, 3, 3, 2, 1]],
      [17, [4, 3, 3, 3, 2, 1, 1, 1, 1]],
      [18, [4, 3, 3, 3, 3, 1, 1, 1, 1]],
      [19, [4, 3, 3, 3, 3, 2, 1, 1, 1]],
      [20, [4, 3, 3, 3, 3, 2, 2, 1, 1]],
    ])
      assert.deepEqual(
        automaticSlotMaximums(character(name, level)),
        pad(row),
        `${name} ${level}`,
      );
  }
  for (const name of ["Paladin", "Ranger"]) {
    for (const [level, row] of [
      [1, [2]],
      [2, [2]],
      [3, [3]],
      [4, [3]],
      [5, [4, 2]],
      [7, [4, 3]],
      [9, [4, 3, 2]],
      [13, [4, 3, 3, 1]],
      [17, [4, 3, 3, 3, 1]],
      [19, [4, 3, 3, 3, 2]],
      [20, [4, 3, 3, 3, 2]],
    ])
      assert.deepEqual(
        automaticSlotMaximums(character(name, level)),
        pad(row),
        `${name} ${level}`,
      );
  }
  for (const name of ["Barbarian", "Fighter", "Monk", "Rogue"])
    assert.deepEqual(automaticSlotMaximums(character(name, 20)), pad([]));
});

test("Warlock uses a single Pact Magic pool and never gains ordinary Arcanum slots", () => {
  for (const [level, slotLevel, count] of [
    [1, 1, 1],
    [2, 1, 2],
    [3, 2, 2],
    [5, 3, 2],
    [7, 4, 2],
    [9, 5, 2],
    [10, 5, 2],
    [11, 5, 3],
    [16, 5, 3],
    [17, 5, 4],
    [20, 5, 4],
  ]) {
    const expected = pad([]);
    expected[slotLevel - 1] = count;
    assert.deepEqual(
      automaticSlotMaximums(character("Warlock", level)),
      expected,
    );
  }
  let c = normalizeCharacterSlots(character("Warlock", 2));
  c.slots[0].used = 1;
  c = normalizeCharacterSlots({ ...c, level: 3 });
  assert.equal(c.slots[0].max, 0);
  assert.equal(c.slots[0].used, 0);
  assert.deepEqual(c.slots[1], { max: 2, used: 1 });
  c = normalizeCharacterSlots({ ...c, level: 11 });
  assert.deepEqual(c.slots[4], { max: 3, used: 1 });
});

test("casting subclasses only receive slots starting at level 3", () => {
  for (const [name, subclass] of [
    ["Fighter", "Eldritch Knight"],
    ["Rogue", "Arcane Trickster"],
  ]) {
    for (const [level, row] of [
      [2, []],
      [3, [2]],
      [4, [3]],
      [7, [4, 2]],
      [10, [4, 3]],
      [13, [4, 3, 2]],
      [19, [4, 3, 3, 1]],
      [20, [4, 3, 3, 1]],
    ])
      assert.deepEqual(
        automaticSlotMaximums(
          character(name, level, ` ${subclass.toUpperCase()} `),
        ),
        pad(row),
      );
  }
});

test("level changes preserve expended slots and manual mode survives class/level edits", () => {
  const c = normalizeCharacterSlots(character("Wizard", 1));
  c.slots[0].used = 2;
  const leveled = normalizeCharacterSlots({ ...c, level: 5 });
  assert.deepEqual(leveled.slots.slice(0, 3), [
    { max: 4, used: 2 },
    { max: 3, used: 0 },
    { max: 2, used: 0 },
  ]);
  assert.deepEqual(c.slots[0], { max: 2, used: 2 });
  leveled.slots[0].used = 4;
  assert.deepEqual(normalizeCharacterSlots({ ...leveled, level: 1 }).slots[0], {
    max: 2,
    used: 2,
  });
  const custom = normalizeCharacterSlots({
    ...leveled,
    slotMode: "manual",
    class: "Fighter",
    level: 1,
  });
  assert.deepEqual(custom.slots, leveled.slots);
  assert.equal(custom.slotMode, "manual");
  const reset = normalizeCharacterSlots({ ...custom, slotMode: "auto" });
  assert.deepEqual(max(reset), pad([]));
  assert.ok(reset.slots.every((s) => s.used === 0));
});

test("legacy empty and matching sheets become automatic; custom maximums remain manual", () => {
  const c = character("Wizard", 1);
  delete c.slotMode;
  assert.equal(normalizeCharacterSlots(c).slotMode, "auto");
  c.slots[0] = { max: 2, used: 1 };
  assert.equal(normalizeCharacterSlots(c).slotMode, "auto");
  assert.equal(normalizeCharacterSlots(c).slots[0].used, 1);
  c.slots[0] = { max: 7, used: 3 };
  const migrated = normalizeCharacterSlots(c);
  assert.equal(migrated.slotMode, "manual");
  assert.deepEqual(migrated.slots, c.slots);
});

test("API saves automatic slots, manual overrides, and legacy sheet migrations", async () => {
  const { app, db } = createApp({
    databasePath: ":memory:",
    secureCookies: false,
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  let cookie;
  async function request(path, method = "GET", body) {
    const response = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Keeper-Request": "1",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (response.headers.get("set-cookie"))
      cookie = response.headers.get("set-cookie").split(";")[0];
    return { status: response.status, data: await response.json() };
  }
  try {
    const user = await request("/auth/register", "POST", {
      name: "Caster",
      email: "caster@example.com",
      password: "test-password",
    });
    let result = await request("/characters", "POST", character("Wizard", 1));
    assert.equal(result.status, 201);
    let c = result.data;
    const id = c.id;
    assert.deepEqual(max(c), pad([2]));
    c.slots[0].used = 1;
    c = (await request(`/characters/${id}`, "PUT", { ...c, level: 5 })).data;
    assert.deepEqual(max(c), pad([4, 3, 2]));
    assert.equal(c.slots[0].used, 1);
    c.slotMode = "manual";
    c.slots[0].max = 8;
    c = (await request(`/characters/${id}`, "PUT", c)).data;
    c = (await request(`/characters/${id}`, "PUT", { ...c, level: 9 })).data;
    assert.equal(c.slots[0].max, 8);
    assert.equal(c.slotMode, "manual");
    const loaded = (await request("/characters")).data[0];
    assert.equal(loaded.slotMode, "manual");
    assert.equal(loaded.slots[0].max, 8);
    assert.equal(
      (await request(`/characters/${id}`, "PUT", { ...c, slotMode: "invalid" }))
        .status,
      400,
    );
    c = (await request(`/characters/${id}`, "PUT", { ...c, slotMode: "auto" }))
      .data;
    assert.deepEqual(max(c), pad([4, 3, 3, 3, 1]));
    assert.equal(c.slots[0].used, 1);
    const legacy = character("Wizard", 1);
    delete legacy.slotMode;
    legacy.slots[0] = { max: 7, used: 3 };
    db.prepare("INSERT INTO characters VALUES (?,?,?,?)").run(
      "legacy",
      user.data.id,
      JSON.stringify(legacy),
      new Date().toISOString(),
    );
    const migrated = (await request("/characters")).data.find(
      (c) => c.id === "legacy",
    );
    assert.equal(migrated.slotMode, "manual");
    assert.deepEqual(migrated.slots[0], { max: 7, used: 3 });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});
