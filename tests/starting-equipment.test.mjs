import test from "node:test";
import assert from "node:assert/strict";
import {
  classes,
  blankCharacter,
  validateCharacter,
} from "../shared/character.mjs";
import { backgrounds } from "../shared/backgrounds.mjs";
import {
  classStartingEquipment,
  backgroundStartingEquipment,
  startingChoiceOptions,
  startingEquipmentPlan,
  applyStartingEquipment,
} from "../shared/starting-equipment.mjs";
import { characterStats } from "../shared/stats.mjs";
import {
  exportCharacter,
  importCharacter,
} from "../shared/character-transfer.mjs";
const sheet = (patch = {}) => ({
  ...blankCharacter(),
  name: "Starting hero",
  ...patch,
});
const ids = () => {
  let n = 0;
  return () => `starting-${++n}`;
};
const owned = (c, name) =>
  [...c.inventory, ...c.weapons].find((i) => i.name === name);

test("every class and background package/gold combination produces a valid transferable character", () => {
  assert.deepEqual(
    Object.keys(classStartingEquipment).sort(),
    [...classes].sort(),
  );
  assert.deepEqual(
    Object.keys(backgroundStartingEquipment).sort(),
    backgrounds.map((b) => b.name).sort(),
  );
  for (const className of classes)
    for (const classOption of Object.keys(classStartingEquipment[className])) {
      for (const { name: background } of backgrounds)
        for (const backgroundOption of ["A", "B"]) {
          const c = applyStartingEquipment(
            sheet({ class: className, background }),
            { classOption, backgroundOption },
            ids(),
          );
          assert.ok(
            validateCharacter(c),
            `${className} ${classOption} / ${background} ${backgroundOption}`,
          );
          assert.deepEqual(importCharacter(exportCharacter(c)), c);
          const entries = [...c.inventory, ...c.weapons];
          assert.equal(new Set(entries.map((i) => i.id)).size, entries.length);
          assert.ok(c.weapons.every((w) => !w.equipped));
        }
    }
});
test("Fighter equipment alternatives replace preview contents and add background gold", () => {
  const c = sheet({ background: "Soldier" });
  const heavy = applyStartingEquipment(c, { classOption: "A" }, ids());
  assert.equal(heavy.gold, 18);
  assert.equal(owned(heavy, "Javelin").quantity, 8);
  assert.equal(owned(heavy, "Shortbow").ammunitionCount, 20);
  assert.equal(characterStats(heavy).ac, 16);
  const light = applyStartingEquipment(c, { classOption: "B" }, ids());
  assert.equal(light.gold, 25);
  assert.equal(owned(light, "Greatsword"), undefined);
  assert.equal(owned(light, "Longbow").ammunitionCount, 20);
  assert.equal(owned(light, "Shortbow").ammunitionCount, 20);
  assert.equal(
    light.inventory.some((i) => /Arrows/.test(i.name)),
    false,
  );
  assert.equal(characterStats(light).ac, 14);
  const gold = applyStartingEquipment(c, {
    classOption: "C",
    backgroundOption: "B",
  });
  assert.equal(gold.gold, 205);
  assert.deepEqual(gold.inventory, []);
  assert.deepEqual(gold.weapons, []);
});
test("duplicate grants combine quantities without double-applying kits or mutating the draft", () => {
  const c = sheet({ class: "Rogue", background: "Criminal" });
  const before = structuredClone(c);
  const a = applyStartingEquipment(c, {}, ids());
  const b = applyStartingEquipment(c, {}, ids());
  assert.deepEqual(c, before);
  assert.deepEqual(a, b);
  assert.equal(owned(a, "Dagger").quantity, 4);
  assert.equal(owned(a, "Thieves’ Tools").quantity, 2);
  assert.equal(a.gold, 24);
});
test("tool, instrument and holy-symbol choices are limited to legal options", () => {
  assert.equal(startingChoiceOptions("artisan").length, 17);
  assert.equal(startingChoiceOptions("instrument").length, 10);
  assert.equal(startingChoiceOptions("artisan-or-instrument").length, 27);
  assert.equal(startingChoiceOptions("gaming").length, 4);
  assert.equal(startingChoiceOptions("symbol").length, 3);
  const instruments = startingChoiceOptions("instrument");
  const lute = instruments.find((i) => i.name === "Musical Instrument (Lute)");
  const flute = instruments.find(
    (i) => i.name === "Musical Instrument (Flute)",
  );
  const c = applyStartingEquipment(
    sheet({ class: "Bard", background: "Entertainer" }),
    {
      choices: {
        "class-instrument": lute.key,
        "background-instrument": flute.key,
      },
    },
  );
  assert.ok(owned(c, lute.name));
  assert.ok(owned(c, flute.name));
  assert.throws(
    () =>
      applyStartingEquipment(sheet({ class: "Bard" }), {
        choices: { "class-instrument": "weapon-greatsword" },
      }),
    /Choose valid equipment/,
  );
});
test("class focus staves are usable weapons and Wizard spellbooks remain distinct", () => {
  const wizard = applyStartingEquipment(
    sheet({ class: "Wizard", background: "Sage" }),
    {},
    ids(),
  );
  assert.equal(wizard.gold, 13);
  assert.equal(owned(wizard, "Spellbook").quantity, 1);
  assert.match(owned(wizard, "Spellbook").detail, /3 lb/);
  assert.equal(
    wizard.weapons.filter((w) => w.name === "Quarterstaff").length,
    2,
  );
  assert.ok(wizard.weapons.some((w) => /also an Arcane Focus/.test(w.detail)));
  assert.ok(owned(wizard, "Book (history)"));
  assert.deepEqual(wizard.spells, []);
});
test("armor equipment is optional and species do not fabricate extra gear", () => {
  const paladin = applyStartingEquipment(
    sheet({ class: "Paladin", background: "Acolyte" }),
  );
  assert.equal(characterStats(paladin).ac, 18);
  const stored = applyStartingEquipment(
    sheet({ class: "Paladin", background: "Acolyte" }),
    { equipArmor: false },
  );
  assert.ok(stored.inventory.every((i) => !i.equipped));
  assert.equal(characterStats(stored).ac, 12);
  const human = applyStartingEquipment(sheet({ species: "Human" }), {}, ids());
  const elf = applyStartingEquipment(sheet({ species: "Elf" }), {}, ids());
  assert.deepEqual(elf, { ...human, species: "Elf" });
});
test("manual/custom origins and omitted portions remain supported", () => {
  const custom = startingEquipmentPlan(sheet({ background: "Guild Artisan" }));
  assert.equal(custom.backgroundOption, "none");
  assert.equal(custom.backgroundGold, 0);
  const c = applyStartingEquipment(sheet({ background: "Sage" }), {
    classOption: "none",
  });
  assert.equal(c.gold, 8);
  assert.equal(c.weapons.length, 1);
  const empty = applyStartingEquipment(sheet({ background: "Sage" }), {
    classOption: "none",
    backgroundOption: "none",
  });
  assert.equal(empty.inventory.length, 0);
  assert.equal(empty.weapons.length, 0);
  assert.equal(empty.gold, 0);
  assert.throws(() =>
    startingEquipmentPlan(sheet(), { classOption: "invalid" }),
  );
});
