import { blankCharacter, validateCharacter } from "./character.mjs";

export const MAX_CHARACTER_FILE_BYTES = 5 * 1024 * 1024;

// Only sheet fields travel between accounts; IDs and archive metadata stay local.
function sheetData(character) {
  return Object.fromEntries(
    Object.keys(blankCharacter())
      .filter((key) => Object.hasOwn(character, key))
      .map((key) => [key, character[key]]),
  );
}

export function exportCharacter(character) {
  if (!validateCharacter(character))
    throw new Error(
      "Some character fields are invalid. Check the sheet before exporting.",
    );
  const json = JSON.stringify(
    {
      format: "character-keeper",
      version: 1,
      character: sheetData(character),
    },
    null,
    2,
  );
  if (new TextEncoder().encode(json).length > MAX_CHARACTER_FILE_BYTES)
    throw new Error("Character data is too large to export (maximum 5 MB).");
  return json;
}

export function importCharacter(json) {
  if (new TextEncoder().encode(json).length > MAX_CHARACTER_FILE_BYTES)
    throw new Error("Choose a JSON file smaller than 5 MB.");
  let data;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error(
      "This file is not valid JSON. Choose a Character Keeper export.",
    );
  }
  if (data?.format !== "character-keeper" || data?.version !== 1)
    throw new Error(
      "Unsupported character file. Choose a Character Keeper version 1 export.",
    );
  if (!validateCharacter(data.character))
    throw new Error(
      "This file contains invalid character data. Check the original sheet and export it again.",
    );
  return sheetData(data.character);
}

export function characterFilename(character) {
  const name = character.name
    .trim()
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  return `${name || "character"}.json`;
}
