import test from "node:test";
import assert from "node:assert/strict";
import {
  blankCharacter,
  classes,
  validateCharacter,
} from "../shared/character.mjs";
import {
  subclassNames,
  officialSubclass,
  subclassSummary,
} from "../shared/subclasses.mjs";
import { automaticSlotMaximums } from "../shared/slots.mjs";
import { automaticPreparationLimits } from "../shared/preparation.mjs";
import { spellAccess } from "../shared/spells.mjs";
import {
  exportCharacter,
  importCharacter,
} from "../shared/character-transfer.mjs";

const sheet = (className, subclass, level = 3) => ({
  ...blankCharacter(),
  name: "Hero",
  class: className,
  subclass,
  level,
});

test("every PHB subclass is valid and survives JSON transfer with its class", () => {
  assert.deepEqual(Object.keys(subclassNames).sort(), [...classes].sort());
  assert.equal(new Set(Object.values(subclassNames).flat()).size, 48);
  for (const className of classes) {
    assert.equal(subclassNames[className].length, 4);
    for (const subclass of subclassNames[className]) {
      const c = sheet(className, subclass);
      assert.ok(validateCharacter(c));
      assert.equal(officialSubclass(c), subclass);
      assert.equal(importCharacter(exportCharacter(c)).subclass, subclass);
      assert.deepEqual(subclassSummary(c).reached, [3]);
    }
  }
});

test("subclass progression respects level 3 and class-specific milestones", () => {
  assert.deepEqual(
    subclassSummary(sheet("Fighter", "Champion", 2)).reached,
    [],
  );
  assert.equal(subclassSummary(sheet("Fighter", "Champion", 2)).next, 3);
  assert.equal(
    subclassSummary(sheet("Fighter", "Champion", 2)).unlocked,
    false,
  );
  assert.match(
    subclassSummary(sheet("Fighter", "Champion", 2)).warning,
    /level 3/,
  );
  assert.deepEqual(
    subclassSummary(sheet("Fighter", "Champion", 10)).reached,
    [3, 7, 10],
  );
  assert.equal(subclassSummary(sheet("Fighter", "Champion", 10)).next, 15);
  assert.equal(
    subclassSummary(sheet("Paladin", "Oath of Glory", 20)).next,
    null,
  );
  assert.deepEqual(
    subclassSummary(sheet("Cleric", "Life Domain", 17)).reached,
    [3, 6, 17],
  );
});

test("legacy, custom, and mismatched subclass names are preserved", () => {
  const c = sheet("Fighter", "  ELDRITCH KNIGHT  ");
  assert.equal(officialSubclass(c), "Eldritch Knight");
  const custom = sheet("Wizard", "School of Homebrew");
  assert.equal(officialSubclass(custom), null);
  assert.deepEqual(importCharacter(exportCharacter(custom)), custom);
  const mismatch = sheet("Wizard", "Champion");
  assert.match(subclassSummary(mismatch).warning, /Fighter subclass/);
  assert.deepEqual(importCharacter(exportCharacter(mismatch)), mismatch);
});

test("picker casting subclasses use the existing slots, preparation, and access rules", () => {
  for (const [className, subclass, cantrips] of [
    ["Fighter", "Eldritch Knight", 2],
    ["Rogue", "Arcane Trickster", 3],
  ]) {
    const c = sheet(className, subclass);
    assert.deepEqual(automaticSlotMaximums(c), [2, 0, 0, 0, 0, 0, 0, 0, 0]);
    assert.deepEqual(automaticPreparationLimits(c), { cantrips, prepared: 3 });
    assert.deepEqual(spellAccess(c), {
      lists: ["Wizard"],
      maxLevel: 1,
      cantrips: true,
    });
    assert.ok(
      automaticSlotMaximums({ ...c, level: 2 }).every((count) => count === 0),
    );
  }
});
