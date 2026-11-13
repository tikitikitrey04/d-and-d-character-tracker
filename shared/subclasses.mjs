// 2024 Player's Handbook names, checked against Wizards' published overview:
// https://www.dndbeyond.com/posts/1810-updates-in-the-players-handbook-2024
// Progression: https://www.dndbeyond.com/sources/dnd/br-2024/character-classes
// Names and level metadata only; feature text is read in the player's rules source.
export const subclassNames = {
  Barbarian: [
    "Path of the Berserker",
    "Path of the Wild Heart",
    "Path of the World Tree",
    "Path of the Zealot",
  ],
  Bard: [
    "College of Dance",
    "College of Glamour",
    "College of Lore",
    "College of Valor",
  ],
  Cleric: ["Life Domain", "Light Domain", "Trickery Domain", "War Domain"],
  Druid: [
    "Circle of the Land",
    "Circle of the Moon",
    "Circle of the Sea",
    "Circle of the Stars",
  ],
  Fighter: ["Battle Master", "Champion", "Eldritch Knight", "Psi Warrior"],
  Monk: [
    "Warrior of Mercy",
    "Warrior of Shadow",
    "Warrior of the Elements",
    "Warrior of the Open Hand",
  ],
  Paladin: [
    "Oath of Devotion",
    "Oath of Glory",
    "Oath of the Ancients",
    "Oath of Vengeance",
  ],
  Ranger: ["Beast Master", "Fey Wanderer", "Gloom Stalker", "Hunter"],
  Rogue: ["Arcane Trickster", "Assassin", "Soulknife", "Thief"],
  Sorcerer: [
    "Aberrant Sorcery",
    "Clockwork Sorcery",
    "Draconic Sorcery",
    "Wild Magic Sorcery",
  ],
  Warlock: [
    "Archfey Patron",
    "Celestial Patron",
    "Fiend Patron",
    "Great Old One Patron",
  ],
  Wizard: ["Abjurer", "Diviner", "Evoker", "Illusionist"],
};

const progression = {
  Barbarian: [3, 6, 10, 14],
  Bard: [3, 6, 14],
  Cleric: [3, 6, 17],
  Druid: [3, 6, 10, 14],
  Fighter: [3, 7, 10, 15, 18],
  Monk: [3, 6, 11, 17],
  Paladin: [3, 7, 15, 20],
  Ranger: [3, 7, 11, 15],
  Rogue: [3, 9, 13, 17],
  Sorcerer: [3, 6, 14, 18],
  Warlock: [3, 6, 10, 14],
  Wizard: [3, 6, 10, 14],
};
const normalize = (name) => (name || "").trim().toLowerCase();

export function officialSubclass(character) {
  return (
    (subclassNames[character.class] || []).find(
      (name) => normalize(name) === normalize(character.subclass),
    ) || null
  );
}

export function subclassSummary(character) {
  const name = officialSubclass(character);
  const owner = Object.keys(subclassNames).find((key) =>
    subclassNames[key].some(
      (entry) => normalize(entry) === normalize(character.subclass),
    ),
  );
  const levels = name ? progression[character.class] : [];
  return {
    name,
    unlocked: character.level >= 3,
    reached: levels.filter((level) => level <= character.level),
    next: levels.find((level) => level > character.level) ?? null,
    warning:
      owner && owner !== character.class
        ? `${character.subclass.trim()} is a ${owner} subclass. Choose a ${character.class} subclass or keep it as a custom option.`
        : character.subclass.trim() && character.level < 3
          ? "Subclasses unlock at level 3 in the 2024 rules. Your existing selection is kept for later."
          : "",
  };
}
