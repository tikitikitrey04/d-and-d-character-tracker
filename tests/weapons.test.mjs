import test from "node:test";
import assert from "node:assert/strict";
import {
  weaponCatalog,
  makeWeapon,
  weaponDescription,
} from "../shared/weapon-catalog.mjs";
import {
  weaponStats,
  weaponProficient,
  weaponMasteryLimit,
  weaponSummary,
  weaponChangeError,
  weaponAttackError,
  attackWithWeapon,
  validateWeapon,
} from "../shared/weapons.mjs";
import { blankCharacter, validateCharacter } from "../shared/character.mjs";
import { createApp } from "../server/app.mjs";

const weapon = (name, id = name) =>
  makeWeapon(
    weaponCatalog.find((w) => w.name === name),
    id,
  );
const character = (className = "Fighter", level = 5, weapons = []) => ({
  ...blankCharacter(),
  name: "Warrior",
  class: className,
  level,
  weapons,
});
test("38 bundled weapons have valid complete statistics and mastery descriptions", () => {
  assert.equal(weaponCatalog.length, 38);
  assert.equal(new Set(weaponCatalog.map((w) => w.key)).size, 38);
  for (const template of weaponCatalog) {
    assert.ok(
      validateWeapon(makeWeapon(template, template.key)),
      template.name,
    );
    assert.ok(weaponDescription(template).includes(template.mastery));
  }
  assert.equal(weapon("Greatsword").damageDice, "2d6");
  assert.equal(weapon("Blowgun").damageDice, "1");
  assert.equal(weapon("Longbow").range, "150/600");
  assert.equal(weapon("Dagger").mastery, "Nick");
});
test("class proficiency, finesse, ability and magic overrides update attack and damage bonuses", () => {
  const dagger = weapon("Dagger"),
    longsword = weapon("Longsword"),
    bow = weapon("Longbow");
  const c = character("Wizard");
  c.abilities = [12, 18, 10, 10, 10, 10];
  assert.equal(weaponProficient(c, dagger), true);
  assert.equal(weaponProficient(c, longsword), false);
  assert.equal(weaponProficient(character("Rogue"), weapon("Rapier")), true);
  assert.equal(weaponProficient(character("Monk"), weapon("Scimitar")), true);
  assert.equal(weaponProficient(character("Monk"), weapon("Rapier")), false);
  assert.equal(weaponStats(c, dagger).attackBonus, 7);
  assert.equal(weaponStats(c, dagger).damageBonus, 4);
  assert.equal(weaponStats(c, longsword).attackBonus, 1);
  assert.equal(weaponStats(c, bow).ability, 1);
  const custom = {
    ...longsword,
    ability: "3",
    proficiency: "yes",
    magicBonus: 2,
    attackAdjustment: 1,
    damageAdjustment: 3,
  };
  c.abilities[3] = 18;
  const stats = weaponStats(c, custom, true);
  assert.equal(stats.attackBonus, 10);
  assert.equal(stats.damageBonus, 9);
  assert.equal(stats.damageDice, "1d10");
});
test("masteries follow level and count weapon kinds, hand limits include shields and two-handed grips", () => {
  assert.deepEqual(
    [1, 4, 10, 16, 20].map((level) =>
      weaponMasteryLimit(character("Fighter", level)),
    ),
    [3, 4, 5, 6, 6],
  );
  assert.deepEqual(
    [1, 4, 10, 20].map((level) =>
      weaponMasteryLimit(character("Barbarian", level)),
    ),
    [2, 3, 4, 4],
  );
  const a = { ...weapon("Dagger", "a"), mastered: true, equipped: true },
    b = { ...weapon("Dagger", "b"), mastered: true, equipped: true };
  const c = character("Rogue", 1, [a, b]);
  assert.equal(weaponSummary(c).mastered, 1);
  assert.equal(weaponSummary(c).hands, 2);
  assert.match(
    weaponChangeError({ ...c, shieldEquipped: true }, c),
    /need 3 hands/,
  );
  const longsword = { ...weapon("Longsword"), equipped: true };
  const pair = character("Fighter", 5, [a, longsword]);
  assert.match(weaponAttackError(pair, longsword, "two-handed"), /free hands/);
  const heavy = { ...weapon("Greatsword"), equipped: true, grip: 1 };
  assert.equal(weaponSummary(character("Fighter", 5, [heavy])).hands, 2);
  assert.match(weaponChangeError(character("Wizard", 1, [a])), /mastery/);
  assert.match(
    weaponChangeError(
      character("Barbarian", 5, [{ ...weapon("Longbow"), mastered: true }]),
    ),
    /cannot select mastery/,
  );
});
test("ammo and thrown stock deplete exactly once, including misses; exhausted weapons cannot attack", () => {
  const bow = { ...weapon("Shortbow"), equipped: true, ammunitionCount: 2 };
  const c = character("Fighter", 5, [bow]);
  const first = attackWithWeapon(c, bow.id, "ranged", () => 1);
  assert.equal(first.character.weapons[0].ammunitionCount, 1);
  assert.match(first.message, /miss/);
  assert.equal(c.weapons[0].ammunitionCount, 2);
  const second = attackWithWeapon(
    first.character,
    bow.id,
    "ranged",
    () => 1,
  ).character;
  assert.equal(second.weapons[0].ammunitionCount, 0);
  assert.throws(
    () => attackWithWeapon(second, bow.id, "ranged"),
    /No ammunition/,
  );
  const dagger = { ...weapon("Dagger"), quantity: 1, equipped: true };
  const thrown = attackWithWeapon(
    character("Fighter", 5, [dagger]),
    dagger.id,
    "throw",
    () => 1,
  ).character;
  assert.equal(thrown.weapons[0].quantity, 0);
  assert.equal(thrown.weapons[0].equipped, true);
  assert.throws(
    () => attackWithWeapon(thrown, dagger.id, "throw"),
    /No copies/,
  );
  const limited = { ...dagger, limitedUses: true, usesMax: 1, usesUsed: 0 };
  const spent = attackWithWeapon(
    character("Fighter", 5, [limited]),
    limited.id,
    "melee",
    () => 1,
  ).character;
  assert.equal(spent.weapons[0].quantity, 1);
  assert.equal(spent.weapons[0].usesUsed, 1);
  assert.throws(
    () => attackWithWeapon(spent, limited.id, "melee"),
    /No weapon uses/,
  );
});
test("critical hits double dice only, Heavy disadvantage cancels Advantage, and attacks enforce equipment", () => {
  const sword = { ...weapon("Greatsword"), equipped: true };
  const c = character("Fighter", 5, [sword]);
  c.abilities[0] = 16;
  const sequence = [20, 2, 3, 4, 5];
  const critical = attackWithWeapon(c, sword.id, "melee", () =>
    sequence.shift(),
  );
  assert.match(critical.message, /Critical hit: 17 Slashing/);
  assert.equal(sequence.length, 0);
  c.abilities[0] = 10;
  let calls = 0;
  attackWithWeapon(
    c,
    sword.id,
    "melee",
    (sides) => {
      calls++;
      return sides === 20 ? 10 : 1;
    },
    "advantage",
  );
  assert.equal(calls, 3);
  let rolls = [19, 1];
  const miss = attackWithWeapon(c, sword.id, "melee", () => rolls.shift());
  assert.match(miss.message, /Natural 1/);
  const unequipped = { ...sword, equipped: false };
  assert.throws(
    () =>
      attackWithWeapon(
        character("Fighter", 5, [unequipped]),
        sword.id,
        "melee",
      ),
    /Equip/,
  );
  const handCrossbow = {
    ...weapon("Hand Crossbow"),
    equipped: true,
    ammunitionCount: 1,
  };
  assert.match(
    weaponAttackError(
      { ...character("Fighter", 5, [handCrossbow]), shieldEquipped: true },
      handCrossbow,
      "ranged",
    ),
    /free hand/,
  );
});
test("weapon data validation rejects malformed and unsafe data while accepting legacy characters", () => {
  const w = weapon("Dagger");
  assert.ok(validateCharacter(character("Fighter", 5, [w])));
  assert.equal(validateWeapon({ ...w, damageDice: "100000d100000" }), false);
  assert.equal(validateWeapon({ ...w, ammunitionCount: -1 }), false);
  assert.equal(validateWeapon({ ...w, usesUsed: 2, usesMax: 1 }), false);
  assert.equal(validateCharacter({ ...character(), weapons: [w, w] }), false);
  const legacy = character();
  delete legacy.weapons;
  delete legacy.weaponLimitOverride;
  assert.ok(validateCharacter(legacy));
});
test("API persists equipment, proficiency overrides and attack expenditure while enforcing ownership and limits", async () => {
  const { app, db } = createApp({
    databasePath: ":memory:",
    secureCookies: false,
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  let cookie;
  async function request(path, method = "GET", body) {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api${path}`,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Keeper-Request": "1",
          ...(cookie ? { Cookie: cookie } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );
    if (response.headers.get("set-cookie"))
      cookie = response.headers.get("set-cookie").split(";")[0];
    return { status: response.status, data: await response.json() };
  }
  try {
    await request("/auth/register", "POST", {
      name: "Fighter",
      email: "weapons@example.com",
      password: "test-password",
    });
    const bow = {
      ...weapon("Shortbow"),
      equipped: true,
      ammunitionCount: 1,
      mastered: true,
    };
    const created = await request(
      "/characters",
      "POST",
      character("Fighter", 5, [bow]),
    );
    assert.equal(created.status, 201);
    const id = created.data.id;
    assert.equal(
      (
        await request(`/characters/${id}`, "PUT", {
          ...created.data,
          weapons: [bow, { ...weapon("Dagger"), equipped: true }],
        })
      ).status,
      400,
    );
    const result = attackWithWeapon(
      created.data,
      bow.id,
      "ranged",
      () => 1,
    ).character;
    assert.equal(
      (await request(`/characters/${id}`, "PUT", result)).status,
      200,
    );
    const saved = (await request("/characters")).data[0];
    assert.equal(saved.weapons[0].ammunitionCount, 0);
    assert.equal(saved.weapons[0].mastered, true);
    assert.equal(
      (
        await request(`/characters/${id}`, "PUT", {
          ...saved,
          weapons: [{ ...bow, quantity: -1 }],
        })
      ).status,
      400,
    );
    const override = {
      ...saved,
      weaponLimitOverride: true,
      weaponHandLimit: 3,
      weaponMasteryLimit: 2,
      weapons: [bow, { ...weapon("Dagger"), equipped: true }],
    };
    assert.equal(
      (await request(`/characters/${id}`, "PUT", override)).status,
      200,
    );
    await request("/auth/register", "POST", {
      name: "Other",
      email: "other-weapons@example.com",
      password: "test-password",
    });
    assert.equal(
      (await request(`/characters/${id}`, "PUT", result)).status,
      404,
    );
    assert.equal((await request("/characters")).data.length, 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});
