// SRD 5.2.1, Multiclass Spellcaster table (p.26), class feature tables.
// Single-class half/third casters use their own rounded-up progression.
// Warlock's Pact Magic pool is independent of ordinary Spellcasting slots.
const fullCasterSlots = [
  [],
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

export function automaticSlotMaximums(character) {
  const level = Math.max(1, Math.min(20, character.level));
  let row = [];
  if (
    ["Bard", "Cleric", "Druid", "Sorcerer", "Wizard"].includes(character.class)
  )
    row = fullCasterSlots[level];
  else if (["Paladin", "Ranger"].includes(character.class))
    row = fullCasterSlots[Math.ceil(level / 2)];
  else if (character.class === "Warlock") {
    const slotLevel = Math.min(5, Math.ceil(level / 2));
    row = Array.from({ length: slotLevel }, () => 0);
    row[slotLevel - 1] = level === 1 ? 1 : level < 11 ? 2 : level < 17 ? 3 : 4;
  } else {
    const subclass = (character.subclass || "").trim().toLowerCase();
    if (
      level >= 3 &&
      ((character.class === "Fighter" && subclass === "eldritch knight") ||
        (character.class === "Rogue" && subclass === "arcane trickster"))
    )
      row = fullCasterSlots[Math.ceil(level / 3)];
  }
  return Array.from({ length: 9 }, (_, i) => row[i] || 0);
}

export function normalizeCharacterSlots(character) {
  const maximums = automaticSlotMaximums(character);
  const previous =
    character.slots || Array.from({ length: 9 }, () => ({ max: 0, used: 0 }));
  // Preserve custom values on old sheets. Empty sheets and sheets already
  // matching their class table adopt the new automatic default.
  const legacyCustom =
    previous.some((s) => s.max > 0) &&
    previous.some((s, i) => s.max !== maximums[i]);
  const slotMode = character.slotMode || (legacyCustom ? "manual" : "auto");
  if (slotMode === "manual")
    return { ...character, slotMode, slots: previous.map((s) => ({ ...s })) };
  const pactUsed =
    character.class === "Warlock"
      ? previous.reduce((total, s) => total + s.used, 0)
      : null;
  return {
    ...character,
    slotMode,
    slots: maximums.map((max, i) => ({
      max,
      used: Math.min(
        max,
        pactUsed === null ? previous[i]?.used || 0 : pactUsed,
      ),
    })),
  };
}
