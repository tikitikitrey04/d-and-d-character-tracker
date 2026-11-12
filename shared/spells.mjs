const fullCasters = new Set([
  "Bard",
  "Cleric",
  "Druid",
  "Sorcerer",
  "Wizard",
  "Warlock",
]);

// Single-class 2024 spell-level access. Warlock levels 6–9 are Mystic Arcanum.
// Preparation counts are tracked separately; multiclassing and feature-specific grants are explicit overrides.
export function spellAccess(character) {
  const level = Math.max(1, Math.min(20, character.level));
  if (fullCasters.has(character.class)) {
    return {
      lists:
        character.class === "Bard" && level >= 10
          ? ["Bard", "Cleric", "Druid", "Wizard"]
          : [character.class],
      maxLevel: Math.min(9, Math.ceil(level / 2)),
      cantrips: true,
    };
  }
  if (["Paladin", "Ranger"].includes(character.class)) {
    return {
      lists: [character.class],
      maxLevel: Math.min(5, 1 + Math.floor((level - 1) / 4)),
      cantrips: false,
    };
  }
  const subclass = (character.subclass || "").trim().toLowerCase();
  if (
    level >= 3 &&
    ((character.class === "Fighter" && subclass === "eldritch knight") ||
      (character.class === "Rogue" && subclass === "arcane trickster"))
  ) {
    return {
      lists: ["Wizard"],
      maxLevel: 1 + Math.floor((level - 1) / 6),
      cantrips: true,
    };
  }
  return { lists: [], maxLevel: 0, cantrips: false };
}

export function availableSpells(
  catalog,
  character,
  { specialAccess = false, level = "all", search = "" } = {},
) {
  const access = spellAccess(character);
  const query = search.trim().toLowerCase();
  return catalog.filter(
    (spell) =>
      (specialAccess ||
        (spell.classes.some((c) => access.lists.includes(c)) &&
          spell.level <= access.maxLevel &&
          (spell.level > 0 ||
            (access.cantrips &&
              (character.class !== "Bard" ||
                spell.classes.includes("Bard")))))) &&
      (level === "all" || spell.level === Number(level)) &&
      (!query || spell.name.toLowerCase().includes(query)),
  );
}

function plainText(text) {
  return text
    .replace(/\*\*_|_\*\*/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1");
}

export function spellDetails(spell) {
  return [
    `${spell.school}${spell.ritual ? " · Ritual" : ""}`,
    `Casting time: ${spell.castingTime.replaceAll("-", " ")}`,
    `Range: ${spell.range}`,
    `Components: ${spell.components}`,
    `Duration: ${spell.concentration ? "Concentration, up to " : ""}${spell.duration}`,
    "",
    plainText(spell.description),
    ...(spell.higherLevel
      ? [
          "",
          spell.level === 0
            ? "Cantrip upgrade:"
            : "Using a higher-level spell slot:",
          plainText(spell.higherLevel),
        ]
      : []),
  ].join("\n");
}
