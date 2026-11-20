import test from "node:test";
import assert from "node:assert/strict";
import { backgrounds, officialBackground } from "../shared/backgrounds.mjs";
import {
  abilities,
  skills,
  blankCharacter,
  validateCharacter,
} from "../shared/character.mjs";
import {
  exportCharacter,
  importCharacter,
} from "../shared/character-transfer.mjs";

test("all 16 background choices contain valid mechanical metadata and round-trip", () => {
  assert.equal(backgrounds.length, 16);
  assert.equal(new Set(backgrounds.map((b) => b.name)).size, 16);
  for (const b of backgrounds) {
    assert.equal(new Set(b.abilities).size, 3);
    assert.ok(b.abilities.every((name) => abilities.includes(name)));
    assert.equal(new Set(b.skills).size, 2);
    assert.ok(
      b.skills.every((name) => skills.some(([skill]) => skill === name)),
    );
    const c = { ...blankCharacter(), name: "Origin hero", background: b.name };
    assert.ok(validateCharacter(c));
    assert.deepEqual(importCharacter(exportCharacter(c)), c);
  }
});
test("legacy/custom backgrounds stay intact and lookup does not change saved data", () => {
  for (const background of [
    "",
    "Urchin",
    "Guild Artisan",
    "Homebrew Wanderer",
    "  sAgE  ",
  ]) {
    const c = { ...blankCharacter(), name: "Legacy hero", background };
    const snapshot = structuredClone(c);
    officialBackground(background);
    assert.deepEqual(c, snapshot);
    assert.deepEqual(importCharacter(exportCharacter(c)), c);
  }
  assert.equal(officialBackground("  sAgE ").feat, "Magic Initiate (Wizard)");
  assert.equal(officialBackground("Urchin"), null);
});
