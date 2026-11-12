import test from "node:test";
import assert from "node:assert/strict";
import { blankCharacter, validateCharacter } from "../shared/character.mjs";
import {
  automaticPreparationLimits,
  preparationSummary,
  preparationIncreaseError,
  isSpellReady,
} from "../shared/preparation.mjs";
import { createApp } from "../server/app.mjs";

const character = (className = "Wizard", level = 1, spells = []) => ({
  ...blankCharacter(),
  name: "Caster",
  class: className,
  level,
  spells,
});
const spell = (
  id,
  level = 1,
  prepared = true,
  preparationSource = "class",
) => ({ id, name: id, detail: "", level, prepared, preparationSource });

test("2024 prepared spell and cantrip limits follow class tables, including Wizard high levels", () => {
  for (const [name, level, cantrips, prepared] of [
    ["Bard", 1, 2, 4],
    ["Cleric", 4, 4, 7],
    ["Druid", 10, 4, 15],
    ["Sorcerer", 1, 4, 2],
    ["Sorcerer", 2, 4, 4],
    ["Sorcerer", 20, 6, 22],
    ["Wizard", 1, 3, 4],
    ["Wizard", 14, 5, 18],
    ["Wizard", 16, 5, 21],
    ["Wizard", 20, 5, 25],
    ["Cleric", 20, 5, 22],
    ["Paladin", 1, 0, 2],
    ["Ranger", 5, 0, 6],
    ["Paladin", 9, 0, 9],
    ["Ranger", 20, 0, 15],
    ["Warlock", 1, 2, 2],
    ["Warlock", 10, 4, 10],
    ["Warlock", 20, 4, 15],
    ["Fighter", 20, 0, 0],
  ])
    assert.deepEqual(
      automaticPreparationLimits(character(name, level)),
      { cantrips, prepared },
      `${name} ${level}`,
    );
  for (const [className, subclass, level, cantrips, prepared] of [
    ["Fighter", "Eldritch Knight", 3, 2, 3],
    ["Rogue", "Arcane Trickster", 3, 3, 3],
    ["Fighter", "Eldritch Knight", 10, 3, 7],
    ["Rogue", "Arcane Trickster", 20, 4, 13],
  ])
    assert.deepEqual(
      automaticPreparationLimits({ ...character(className, level), subclass }),
      { cantrips, prepared },
    );
});

test("cantrips count as known; prepared leveled spells share one allowance, not one per level", () => {
  const c = character("Wizard", 5, [
    spell("Light", 0, false),
    spell("A", 1),
    spell("B", 2),
    spell("C", 3),
    ...Array.from({ length: 20 }, (_, i) => spell(`Archive${i}`, 1, false)),
  ]);
  const summary = preparationSummary(c);
  assert.equal(summary.counts.cantrips, 1);
  assert.equal(summary.counts.prepared, 3);
  assert.equal(summary.limits.prepared, 9);
  assert.ok(isSpellReady(c, c.spells[0]));
  assert.equal(isSpellReady(c, c.spells.at(-1)), false);
  const full = character("Wizard", 1, [
    spell("A"),
    spell("B"),
    spell("C"),
    spell("D"),
  ]);
  assert.match(
    preparationIncreaseError(
      { ...full, spells: [...full.spells, spell("E")] },
      full,
    ),
    /Prepared class spells: 5 selected, limit 4/,
  );
  assert.equal(
    preparationIncreaseError(
      { ...full, spells: [...full.spells, spell("Reference", 1, false)] },
      full,
    ),
    "",
  );
  const cantrips = character("Wizard", 1, [
    spell("a", 0),
    spell("b", 0),
    spell("c", 0),
  ]);
  assert.match(
    preparationIncreaseError(
      { ...cantrips, spells: [...cantrips.spells, spell("d", 0, false)] },
      cantrips,
    ),
    /Class cantrips known/,
  );
});

test("explicit feature grants and Mystic Arcanum have separate allowances", () => {
  const c = character("Paladin", 1, [
    spell("Light", 0, false, "granted"),
    spell("Bless", 1, false, "granted"),
    spell("A"),
    spell("B"),
  ]);
  const summary = preparationSummary(c);
  assert.equal(summary.counts.granted, 2);
  assert.equal(summary.counts.cantrips, 0);
  assert.equal(summary.counts.prepared, 2);
  assert.ok(isSpellReady(c, c.spells[1]));
  assert.equal(summary.issues.length, 0);
  const warlock = character("Warlock", 11, [spell("Arcanum", 6, false)]);
  assert.equal(preparationSummary(warlock).counts.prepared, 0);
  assert.equal(preparationSummary(warlock).counts.arcanum[6], 1);
  assert.match(
    preparationIncreaseError(
      { ...warlock, spells: [...warlock.spells, spell("Second", 6)] },
      warlock,
    ),
    /Level 6 Mystic Arcanum/,
  );
  assert.match(
    preparationIncreaseError(
      { ...warlock, spells: [...warlock.spells, spell("Early", 7)] },
      warlock,
    ),
    /Level 7 Mystic Arcanum/,
  );
  assert.equal(
    preparationIncreaseError(
      { ...warlock, level: 13, spells: [...warlock.spells, spell("Next", 7)] },
      warlock,
    ),
    "",
  );
});

test("manual limits persist and lowered limits keep existing choices while blocking increases", () => {
  const c = character(
    "Wizard",
    5,
    Array.from({ length: 9 }, (_, i) => spell(String(i))),
  );
  const lower = { ...c, level: 1 };
  assert.equal(preparationSummary(lower).issues.length, 1);
  assert.equal(preparationIncreaseError(lower, c), "");
  assert.match(
    preparationIncreaseError(
      { ...lower, spells: [...lower.spells, spell("extra")] },
      lower,
    ),
    /limit 4/,
  );
  const reduced = { ...lower, spells: lower.spells.slice(1) };
  assert.equal(preparationIncreaseError(reduced, lower), "");
  const override = {
    ...lower,
    spellLimitOverride: true,
    cantripLimit: 6,
    preparedSpellLimit: 12,
  };
  assert.equal(preparationSummary(override).limits.prepared, 12);
  assert.equal(preparationSummary(override).issues.length, 0);
  assert.equal(validateCharacter({ ...override, cantripLimit: -1 }), false);
  assert.equal(
    validateCharacter({ ...override, preparedSpellLimit: 201 }),
    false,
  );
  assert.equal(
    validateCharacter({
      ...override,
      spells: [spell("Invalid", 0, true, "arcanum")],
    }),
    false,
  );
});

test("API rejects excess selections, accepts overrides/grants, and preserves existing over-limit sheets", async () => {
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
    const user = await request("/auth/register", "POST", {
      name: "Mage",
      email: "mage@example.com",
      password: "test-password",
    });
    const c = character("Wizard", 1, [
      spell("A"),
      spell("B"),
      spell("C"),
      spell("D"),
    ]);
    assert.equal(
      (
        await request("/characters", "POST", {
          ...c,
          spells: [...c.spells, spell("E")],
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request("/characters", "POST", {
          ...c,
          spells: [spell("a", 0), spell("b", 0), spell("c", 0), spell("d", 0)],
        })
      ).status,
      400,
    );
    const created = await request("/characters", "POST", c);
    assert.equal(created.status, 201);
    const id = created.data.id;
    assert.equal(
      (
        await request(`/characters/${id}`, "PUT", {
          ...c,
          spells: [...c.spells, spell("E")],
        })
      ).status,
      400,
    );
    const manual = {
      ...c,
      spellLimitOverride: true,
      cantripLimit: 3,
      preparedSpellLimit: 5,
      spells: [...c.spells, spell("E")],
    };
    assert.equal(
      (await request(`/characters/${id}`, "PUT", manual)).status,
      200,
    );
    assert.equal((await request("/characters")).data[0].preparedSpellLimit, 5);
    const reset = { ...manual, spellLimitOverride: false };
    assert.equal(
      (await request(`/characters/${id}`, "PUT", reset)).status,
      200,
    );
    assert.equal(
      (
        await request(`/characters/${id}`, "PUT", {
          ...reset,
          notes: "Kept my old choices",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await request(`/characters/${id}`, "PUT", {
          ...reset,
          spells: [...reset.spells, spell("F")],
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request(`/characters/${id}`, "PUT", {
          ...reset,
          spells: [...c.spells, spell("E", 1, true, "granted")],
        })
      ).status,
      200,
    );
    const legacy = {
      ...c,
      spells: Array.from({ length: 5 }, (_, i) => spell(String(i))),
    };
    delete legacy.spellLimitOverride;
    db.prepare("INSERT INTO characters VALUES (?,?,?,?)").run(
      "legacy",
      user.data.id,
      JSON.stringify(legacy),
      new Date().toISOString(),
    );
    const loaded = (await request("/characters")).data.find(
      (c) => c.id === "legacy",
    );
    assert.equal(loaded.spells.length, 5);
    assert.equal(
      (
        await request("/characters/legacy", "PUT", {
          ...loaded,
          notes: "No deletion",
        })
      ).status,
      200,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});
