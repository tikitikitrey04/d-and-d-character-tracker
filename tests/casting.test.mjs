import test from "node:test";
import assert from "node:assert/strict";
import { blankCharacter, validateCharacter } from "../shared/character.mjs";
import { normalizeCharacterSlots } from "../shared/slots.mjs";
import {
  castingOptions,
  castSpell,
  overviewSpellGroups,
} from "../shared/casting.mjs";

test("Overview lists each prepared spell once at its base level while casting options include higher slots", () => {
  const c = caster();
  const groups = overviewSpellGroups(c);
  assert.deepEqual(
    groups.map((g) => [g.level, g.spells.map((s) => s.id)]),
    [
      [0, ["light"]],
      [1, ["missile"]],
      [3, ["fireball"]],
    ],
  );
  assert.equal(c.spells.length, 3);
  c.slots[1].used = c.slots[1].max;
  assert.equal(
    overviewSpellGroups(c).find((g) => g.level === 1).spells[0].id,
    "missile",
  );
  assert.equal(
    castingOptions(c, c.spells[1]).some((o) => o.level === 2),
    false,
  );
  const warlock = caster("Warlock", 11);
  warlock.spells.push({
    id: "arcanum",
    name: "Arcanum",
    detail: "",
    level: 6,
    prepared: true,
  });
  assert.deepEqual(
    overviewSpellGroups(warlock).map((g) => [
      g.level,
      g.spells.map((s) => s.id),
    ]),
    [
      [0, ["light"]],
      [1, ["missile"]],
      [3, ["fireball"]],
      [6, ["arcanum"]],
    ],
  );
});

function caster(className = "Wizard", level = 5) {
  return normalizeCharacterSlots({
    ...blankCharacter(),
    name: "Caster",
    class: className,
    level,
    spells: [
      { id: "light", name: "Light", detail: "", level: 0, prepared: false },
      {
        id: "missile",
        name: "Magic Missile",
        detail: "",
        level: 1,
        prepared: true,
      },
      {
        id: "fireball",
        name: "Fireball",
        detail: "",
        level: 3,
        prepared: true,
      },
    ],
  });
}
test("cantrips use no slots and higher-level casting consumes exactly the chosen slot", () => {
  const c = caster();
  const original = structuredClone(c);
  assert.deepEqual(
    castingOptions(c, c.spells[1]).map((o) => o.level),
    [1, 2, 3],
  );
  const cantrip = castSpell(c, "light", 0);
  assert.deepEqual(cantrip.character, c);
  assert.match(cantrip.message, /No spell slot used/);
  const cast = castSpell(c, "missile", 2).character;
  assert.deepEqual(cast.slots[1], { max: 3, used: 1 });
  assert.deepEqual(cast.slots[0], c.slots[0]);
  assert.deepEqual(cast.slots[2], c.slots[2]);
  assert.deepEqual(c, original);
  assert.throws(() => castSpell(c, "fireball", 1), /unavailable/);
});
test("depleted slots, unprepared spells and missing spells cannot be cast", () => {
  let c = caster();
  c = castSpell(c, "fireball", 3).character;
  c = castSpell(c, "fireball", 3).character;
  assert.deepEqual(c.slots[2], { max: 2, used: 2 });
  assert.equal(castingOptions(c, c.spells[2]).length, 0);
  assert.throws(() => castSpell(c, "fireball", 3), /unavailable/);
  assert.deepEqual(
    castingOptions(c, c.spells[1]).map((o) => o.level),
    [1, 2],
  );
  c.spells[1].prepared = false;
  assert.throws(() => castSpell(c, "missile", 1), /not ready/);
  assert.throws(() => castSpell(c, "missing", 1), /not found/);
});
test("manual slot overrides and always-prepared spells use the same slot pool", () => {
  const c = caster("Fighter", 3);
  c.slotMode = "manual";
  c.slots[1] = { max: 1, used: 0 };
  c.slots[8] = { max: 2, used: 0 };
  c.spells[1].preparationSource = "granted";
  c.spells[1].prepared = false;
  assert.deepEqual(
    castingOptions(c, c.spells[1]).map((o) => o.level),
    [2],
  );
  const cast = castSpell(c, "missile", 2).character;
  assert.equal(cast.slots[1].used, 1);
  assert.equal(cast.slots[8].used, 0);
  assert.equal(cast.slotMode, "manual");
});
test("Warlock casts from Pact Magic and Mystic Arcanum spends an independent persisted use", () => {
  const c = caster("Warlock", 11);
  c.spells.push({
    id: "arcanum",
    name: "Circle of Death",
    detail: "",
    level: 6,
    prepared: true,
    preparationSource: "arcanum",
  });
  assert.deepEqual(
    castingOptions(c, c.spells[1]).map((o) => o.level),
    [5],
  );
  const pact = castSpell(c, "missile", 5).character;
  assert.equal(pact.slots[4].used, 1);
  const arcana = castSpell(pact, "arcanum", 6).character;
  assert.deepEqual(arcana.slots, pact.slots);
  assert.equal(arcana.spells.at(-1).arcanumUsed, true);
  assert.equal(validateCharacter(arcana), true);
  assert.equal(
    validateCharacter({
      ...arcana,
      spells: [{ ...arcana.spells.at(-1), arcanumUsed: "invalid" }],
    }),
    false,
  );
  const reopened = JSON.parse(JSON.stringify(arcana));
  assert.throws(() => castSpell(reopened, "arcanum", 6), /unavailable/);
  reopened.spells.at(-1).arcanumUsed = false;
  assert.equal(
    castSpell(reopened, "arcanum", 6).character.spells.at(-1).arcanumUsed,
    true,
  );
  const tooEarly = { ...c, level: 10 };
  assert.equal(castingOptions(tooEarly, c.spells.at(-1)).length, 0);
});
