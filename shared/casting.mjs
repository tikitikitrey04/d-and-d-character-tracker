import { isSpellReady, spellSource } from "./preparation.mjs";

export function overviewSpellGroups(character) {
  const ready = character.spells.filter((spell) =>
    isSpellReady(character, spell),
  );
  return Array.from({ length: 10 }, (_, level) => ({
    level,
    spells: ready.filter((spell) => spell.level === level),
    slot:
      level > 0 &&
      character.slots[level - 1].max > 0 &&
      level <= character.level
        ? { ...character.slots[level - 1], level }
        : null,
  })).filter((group) => group.spells.length);
}

export function castingOptions(character, spell) {
  if (!isSpellReady(character, spell)) return [];
  if (spell.level === 0)
    return [{ kind: "cantrip", level: 0, remaining: null }];
  if (spellSource(character, spell) === "arcanum") {
    const unlocked =
      character.class === "Warlock" &&
      character.level >= 11 + (spell.level - 6) * 2;
    return unlocked && !spell.arcanumUsed
      ? [{ kind: "arcanum", level: spell.level, remaining: 1 }]
      : [];
  }
  return character.slots.flatMap((slot, index) => {
    const level = index + 1;
    return level >= spell.level &&
      level <= character.level &&
      slot.used < slot.max
      ? [{ kind: "slot", level, remaining: slot.max - slot.used }]
      : [];
  });
}

export function castSpell(character, spellId, level) {
  const spell = character.spells.find((s) => s.id === spellId);
  if (!spell) throw new Error("Spell not found.");
  const choice = castingOptions(character, spell).find(
    (option) => option.level === level,
  );
  if (!choice)
    throw new Error(
      "This spell is not ready, or that casting resource is unavailable.",
    );
  if (choice.kind === "cantrip")
    return { character, message: `Cast ${spell.name}. No spell slot used.` };
  if (choice.kind === "arcanum")
    return {
      character: {
        ...character,
        spells: character.spells.map((s) =>
          s.id === spellId ? { ...s, arcanumUsed: true } : s,
        ),
      },
      message: `Cast ${spell.name} using Mystic Arcanum. Its use is expended until restored after a Long Rest.`,
    };
  return {
    character: {
      ...character,
      slots: character.slots.map((slot, index) =>
        index === level - 1 ? { ...slot, used: slot.used + 1 } : slot,
      ),
    },
    message: `Cast ${spell.name} using a level ${level} spell slot.`,
  };
}
