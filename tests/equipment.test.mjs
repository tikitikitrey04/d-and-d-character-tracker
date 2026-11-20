import test from "node:test";
import assert from "node:assert/strict";
import {
  equipmentCatalog,
  equipmentCategories,
  findEquipment,
  addEquipment,
} from "../shared/equipment.mjs";
import { blankCharacter, validateCharacter } from "../shared/character.mjs";
import { characterStats } from "../shared/stats.mjs";
import { weaponSummary } from "../shared/weapons.mjs";
import {
  exportCharacter,
  importCharacter,
} from "../shared/character-transfer.mjs";
const sheet = (patch = {}) => ({
  ...blankCharacter(),
  name: "Gear hero",
  ...patch,
});
const entry = (name) => {
  const item = equipmentCatalog.find((i) => i.name === name);
  assert.ok(item, `Missing equipment: ${name}`);
  return item;
};
test("complete standard equipment categories and all variants create valid transferable records", () => {
  assert.equal(equipmentCatalog.length, 229);
  assert.equal(new Set(equipmentCatalog.map((i) => i.key)).size, 229);
  for (const category of [
    "Weapons",
    "Armor & shields",
    "Tools",
    "Equipment packs",
    "Adventuring gear",
    "Ammunition",
    "Spellcasting focuses",
    "Mounts & animals",
    "Tack & land vehicles",
    "Water & air vehicles",
    "Barding",
    "Food & drink",
  ])
    assert.ok(equipmentCategories.includes(category));
  assert.equal(findEquipment({ category: "Armor & shields" }).length, 13);
  assert.equal(findEquipment({ category: "Weapons" }).length, 38);
  assert.equal(findEquipment({ category: "Tools" }).length, 37);
  for (const item of equipmentCatalog) {
    assert.ok(item.cost && item.cost !== "Varies");
    assert.ok(item.weight && item.detail);
    const next = addEquipment(sheet(), item.key, 1, false, "owned-item");
    assert.ok(validateCharacter(next), item.name);
    assert.deepEqual(importCharacter(exportCharacter(next)), next);
  }
});
test("2024 prices, bundle sizes and barding use their proper units", () => {
  assert.equal(entry("Rope").costCp, 100);
  assert.equal(entry("Plate Armor").costCp, 150000);
  assert.equal(entry("Barding (Plate Armor)").costCp, 600000);
  assert.equal(entry("Barding (Plate Armor)").weight, "130 lb.");
  assert.equal(entry("Arrows (20)").costCp, 100);
  assert.match(entry("Arrows (20)").detail, /bundle contains 20/);
  assert.equal(entry("Gaming Set (Playing cards)").costCp, 50);
  assert.equal(entry("Musical Instrument (Pan flute)").costCp, 1200);
  assert.match(entry("Explorer’s Pack").detail, /Rations/);
  assert.match(entry("Potion of Healing").detail, /2d4/);
});
test("search handles ASCII apostrophes, multiple words, categories and no matches", () => {
  assert.ok(
    findEquipment({ search: "thieves' tools" }).some(
      (i) => i.name === "Thieves’ Tools",
    ),
  );
  assert.ok(
    findEquipment({ search: "potion healing" }).some(
      (i) => i.name === "Potion of Healing",
    ),
  );
  assert.deepEqual(findEquipment({ search: "impossible-no-such-item" }), []);
  assert.ok(
    findEquipment({ search: "staff", category: "Spellcasting focuses" }).every(
      (i) => i.category === "Spellcasting focuses",
    ),
  );
});
test("armor and shields affect AC, while barding and stored gear do not", () => {
  let c = addEquipment(sheet(), entry("Plate Armor").key, 1, true, "plate");
  assert.equal(characterStats(c).ac, 18);
  c = addEquipment(c, entry("Shield").key, 1, true, "shield");
  assert.equal(characterStats(c).ac, 20);
  assert.equal(weaponSummary(c).hands, 1);
  c = addEquipment(c, entry("Barding (Plate Armor)").key, 1, true, "barding");
  assert.equal(characterStats(c).ac, 20);
  assert.equal(
    characterStats(addEquipment(sheet(), entry("Plate Armor").key, 1, false))
      .ac,
    12,
  );
});
test("weapons go into the armory and hand limits include equipped inventory shields", () => {
  const c = addEquipment(
    sheet(),
    entry("Greatsword").key,
    2,
    true,
    "greatsword",
  );
  assert.equal(c.inventory.length, 0);
  assert.equal(c.weapons.length, 1);
  assert.equal(c.weapons[0].quantity, 2);
  assert.equal(c.weapons[0].damageDice, "2d6");
  assert.throws(() => addEquipment(c, entry("Shield").key, 1, true), /hands/);
  assert.equal(
    addEquipment(c, entry("Shield").key, 1, false).inventory.length,
    1,
  );
});
test("adding gear leaves currency and the original sheet intact and enforces bounds", () => {
  const c = sheet({ gold: 10 });
  const before = structuredClone(c);
  const next = addEquipment(c, entry("Arrows (20)").key, 3, false, "arrows");
  assert.deepEqual(c, before);
  assert.equal(next.gold, 10);
  assert.equal(next.inventory[0].quantity, 3);
  assert.match(next.inventory[0].detail, /Weight: 1 lb.*Cost: 1 GP/);
  for (const n of [0, -1, 1.5, 10000, NaN])
    assert.throws(() => addEquipment(c, entry("Rope").key, n, false));
  assert.throws(() => addEquipment(c, "unknown", 1, false));
  assert.throws(
    () =>
      addEquipment(
        sheet({ inventory: Array(200).fill({}) }),
        entry("Rope").key,
        1,
        false,
      ),
    /200/,
  );
});
