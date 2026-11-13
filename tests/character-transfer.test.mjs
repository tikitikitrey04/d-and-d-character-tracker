import test from "node:test";
import assert from "node:assert/strict";
import { blankCharacter } from "../shared/character.mjs";
import {
  exportCharacter,
  importCharacter,
  characterFilename,
  MAX_CHARACTER_FILE_BYTES,
} from "../shared/character-transfer.mjs";

test("character JSON round trips sheet data without account or archive metadata", () => {
  const character = {
    ...blankCharacter(),
    name: "Mira / the Wise",
    notes: "A journal 🐉",
    inventory: [
      { id: "item", name: "Rope", detail: "Silk", quantity: 2, equipped: true },
    ],
    resources: [{ id: "resource", name: "Luck", detail: "", max: 3, used: 1 }],
  };
  const json = exportCharacter({
    ...character,
    id: "old-id",
    updated: "today",
    archivedAt: "yesterday",
    user_id: "other-account",
  });
  assert.deepEqual(importCharacter(json), character);
  assert.equal(characterFilename(character), "Mira-the-Wise.json");
  const envelope = JSON.parse(json);
  envelope.character.id = "injected";
  assert.equal(importCharacter(JSON.stringify(envelope)).id, undefined);
});

test("invalid, unsupported, oversized, and malformed sheets are rejected", () => {
  for (const value of [
    "{",
    "null",
    "[]",
    "{}",
    JSON.stringify({ format: "character-keeper", version: 2 }),
  ])
    assert.throws(() => importCharacter(value));
  const sheet = { ...blankCharacter(), name: "Mira", hp: -1 };
  assert.throws(() => exportCharacter(sheet), /invalid/);
  assert.throws(
    () =>
      importCharacter(
        JSON.stringify({
          format: "character-keeper",
          version: 1,
          character: sheet,
        }),
      ),
    /invalid/,
  );
  assert.throws(
    () => importCharacter(" ".repeat(MAX_CHARACTER_FILE_BYTES + 1)),
    /5 MB/,
  );
});
