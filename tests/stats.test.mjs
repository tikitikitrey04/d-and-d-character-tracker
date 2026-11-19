import { weaponSummary } from "../shared/weapons.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { blankCharacter, validateCharacter } from "../shared/character.mjs";
import { characterStats } from "../shared/stats.mjs";
import {
  exportCharacter,
  importCharacter,
} from "../shared/character-transfer.mjs";
const character = (patch = {}) => ({
  ...blankCharacter(),
  name: "Test",
  ...patch,
});
const item = (name, patch = {}) => ({
  id: name,
  name,
  detail: "",
  quantity: 1,
  equipped: true,
  ...patch,
});

test("AC follows Dexterity, armor caps, magic and equipment state", () => {
  const c = character({ abilities: [10, 18, 14, 10, 16, 10] });
  assert.equal(characterStats(c).ac, 14);
  assert.equal(
    characterStats({ ...c, inventory: [item("Leather +1")] }).ac,
    16,
  );
  assert.equal(
    characterStats({ ...c, inventory: [item("Half Plate")] }).ac,
    17,
  );
  assert.equal(characterStats({ ...c, inventory: [item("Plate")] }).ac, 18);
  assert.equal(
    characterStats({ ...c, inventory: [item("Plate", { equipped: false })] })
      .ac,
    14,
  );
  assert.equal(
    characterStats({ ...c, inventory: [item("Plate", { quantity: 0 })] }).ac,
    14,
  );
  assert.equal(
    characterStats({
      ...c,
      abilities: [10, 8, 10, 10, 10, 10],
      inventory: [item("Hide")],
    }).ac,
    11,
  );
});
test("shields, Defense, and adjustments apply once", () => {
  const c = character({
    inventory: [item("Plate"), item("Shield +1")],
    shieldEquipped: true,
    statTraits: ["defense"],
    acAdjustment: 2,
  });
  assert.equal(characterStats(c).ac, 24);
  assert.equal(characterStats({ ...c, shieldTraining: false }).ac, 21);
  assert.equal(characterStats({ ...c, class: "Wizard" }).ac, 21);
  assert.equal(
    characterStats({ ...c, class: "Wizard", shieldTraining: true }).ac,
    24,
  );
  const multiple = characterStats({
    ...c,
    inventory: [item("Plate"), item("Leather")],
  });
  assert.equal(multiple.ac, 23);
  assert.equal(multiple.warnings.length, 1);
});
test("class unarmored defense obeys armor and shield restrictions", () => {
  const c = character({ abilities: [10, 16, 14, 10, 18, 10] });
  assert.equal(
    characterStats({ ...c, class: "Barbarian", shieldEquipped: true }).ac,
    17,
  );
  assert.equal(characterStats({ ...c, class: "Monk" }).ac, 17);
  assert.equal(
    characterStats({ ...c, class: "Monk", shieldEquipped: true }).ac,
    13,
  );
  assert.equal(
    characterStats({ ...c, class: "Barbarian", inventory: [item("Leather")] })
      .ac,
    14,
  );
});
test("proficiency, expertise, traits, saves and passive perception follow level and abilities", () => {
  const c = character({
    level: 5,
    skills: { Perception: 2, Athletics: 1 },
    saves: [0],
    statTraits: ["jackOfAllTrades", "alert"],
  });
  const a = characterStats(c);
  assert.equal(a.skillBonuses.Perception, 6);
  assert.equal(a.passivePerception, 16);
  assert.equal(a.skillBonuses.Athletics, 5);
  assert.equal(a.skillBonuses.Arcana, 2);
  assert.equal(a.initiative, 5);
  assert.equal(a.saves[0], 5);
  const b = characterStats({ ...c, level: 9 });
  assert.equal(b.skillBonuses.Perception, 8);
  assert.equal(b.skillBonuses.Arcana, 3);
});
test("legacy manual AC stays intact and new fields survive export", () => {
  const c = character({ ac: 21, shieldTraining: true, statTraits: ["alert"] });
  assert.deepEqual(importCharacter(exportCharacter(c)), c);
  delete c.acMode;
  assert.equal(characterStats(c).ac, 21);
  assert.equal(validateCharacter(c), true);
  assert.equal(characterStats({ ...c, acMode: "manual" }).ac, 21);
  assert.equal(validateCharacter({ ...c, statTraits: ["unknown"] }), false);
  assert.equal(validateCharacter({ ...c, acAdjustment: 21 }), false);
});

test("inventory shields occupy one hand and match AC equipment recognition", () => {
  const c = character({ inventory: [item("+1 Shield")], shieldEquipped: true });
  assert.equal(weaponSummary(c).hands, 1);
  assert.equal(characterStats(c).ac, 15);
  assert.equal(weaponSummary({ ...c, shieldEquipped: false }).hands, 1);
  assert.equal(
    characterStats(character({ inventory: [item("Leather +1 Armor")] })).ac,
    14,
  );
});
