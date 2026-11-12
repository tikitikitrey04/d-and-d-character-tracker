import test from "node:test";
import assert from "node:assert/strict";
import catalog from "../src/data/spells-2024.json" with { type: "json" };
import {
  availableSpells,
  spellAccess,
  spellDetails,
} from "../shared/spells.mjs";
import { blankCharacter, validateCharacter } from "../shared/character.mjs";

const character = (className, level, subclass = "") => ({
  ...blankCharacter(),
  name: "Caster",
  class: className,
  level,
  subclass,
});
const names = (spells) => spells.map((s) => s.name);

test("bundled 2024 catalog has complete descriptions and saves without truncation", () => {
  assert.equal(catalog.spells.length, 339);
  assert.equal(new Set(catalog.spells.map((s) => s.key)).size, 339);
  assert.ok(
    catalog.spells.every(
      (s) =>
        s.description.trim() &&
        s.classes.length &&
        s.level >= 0 &&
        s.level <= 9,
    ),
  );
  assert.match(
    catalog.spells.find((s) => s.name === "Greater Invisibility").description,
    /Invisible condition/,
  );
  const wish = catalog.spells.find((s) => s.name === "Wish");
  const detail = spellDetails(wish);
  assert.ok(detail.length > 2000);
  assert.match(detail, /33 percent chance/);
  assert.ok(
    validateCharacter({
      ...character("Wizard", 17),
      spells: [
        { id: "wish", name: wish.name, level: 9, prepared: false, detail },
      ],
    }),
  );
});

test("class and character level determine available spells rather than manual slot counts", () => {
  const wizard1 = names(
    availableSpells(catalog.spells, character("Wizard", 1)),
  );
  assert.ok(wizard1.includes("Light"));
  assert.ok(wizard1.includes("Magic Missile"));
  assert.ok(!wizard1.includes("Fireball"));
  assert.ok(!wizard1.includes("Bless"));
  assert.ok(
    !names(availableSpells(catalog.spells, character("Wizard", 4))).includes(
      "Fireball",
    ),
  );
  assert.ok(
    names(availableSpells(catalog.spells, character("Wizard", 5))).includes(
      "Fireball",
    ),
  );
  assert.ok(
    !names(availableSpells(catalog.spells, character("Cleric", 5))).includes(
      "Fireball",
    ),
  );
  assert.deepEqual(
    availableSpells(catalog.spells, character("Fighter", 1)),
    [],
  );
  assert.deepEqual(
    [1, 4, 5, 8, 9, 13, 17, 20].map(
      (level) => spellAccess(character("Paladin", level)).maxLevel,
    ),
    [1, 1, 2, 2, 3, 4, 5, 5],
  );
  assert.ok(
    !availableSpells(catalog.spells, character("Ranger", 1)).some(
      (s) => s.level === 0,
    ),
  );
  assert.ok(
    names(availableSpells(catalog.spells, character("Paladin", 1))).includes(
      "Bless",
    ),
  );
});

test("special spell access supports Bard secrets, Warlock arcana, caster subclasses and explicit overrides", () => {
  const bard = availableSpells(catalog.spells, character("Bard", 10));
  assert.ok(names(bard).includes("Fireball"));
  assert.ok(names(bard).includes("Bless"));
  assert.ok(!names(bard).includes("Sacred Flame"));
  assert.ok(!names(bard).includes("Eldritch Blast"));
  assert.deepEqual(
    [9, 11, 13, 15, 17].map(
      (level) => spellAccess(character("Warlock", level)).maxLevel,
    ),
    [5, 6, 7, 8, 9],
  );
  assert.equal(
    spellAccess(character("Fighter", 2, "Eldritch Knight")).lists.length,
    0,
  );
  assert.deepEqual(
    [3, 6, 7, 12, 13, 18, 19, 20].map(
      (level) =>
        spellAccess(character("Rogue", level, "Arcane Trickster")).maxLevel,
    ),
    [1, 1, 2, 2, 3, 3, 4, 4],
  );
  assert.ok(
    names(
      availableSpells(
        catalog.spells,
        character("Fighter", 3, " Eldritch Knight "),
      ),
    ).includes("Magic Missile"),
  );
  const overrides = availableSpells(catalog.spells, character("Fighter", 1), {
    specialAccess: true,
    search: "  wish  ",
    level: "9",
  });
  assert.deepEqual(names(overrides), ["Wish"]);
  assert.equal(
    availableSpells(catalog.spells, character("Wizard", 5), {
      level: "0",
    }).every((s) => s.level === 0),
    true,
  );
});

test("automatically populated descriptions include casting details, scaling, and concentration", () => {
  const fireball = spellDetails(
    catalog.spells.find((s) => s.name === "Fireball"),
  );
  assert.match(fireball, /Casting time: action/);
  assert.match(fireball, /Range: 150 feet/);
  assert.match(fireball, /8d6 Fire/);
  assert.match(fireball, /Using a higher-level spell slot:/);
  assert.match(fireball, /increases by 1d6/);
  assert.match(
    spellDetails(catalog.spells.find((s) => s.name === "Bless")),
    /Concentration, up to 1 minute/,
  );
  assert.match(
    spellDetails(catalog.spells.find((s) => s.name === "Eldritch Blast")),
    /Cantrip upgrade:/,
  );
});
