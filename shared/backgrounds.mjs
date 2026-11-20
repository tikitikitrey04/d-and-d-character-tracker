// 2024 Player's Handbook mechanical metadata; no narrative or feat rules text.
// Names: https://www.dndbeyond.com/posts/1785-the-backgrounds-and-origin-feats-in-the-2024
// Four free backgrounds: https://www.dndbeyond.com/sources/dnd/br-2024/character-origins
// Other entries: https://roll20.net/compendium/dnd5e/Backgrounds:{name}?expansion=32231
export const backgrounds = [
  {
    name: "Acolyte",
    abilities: ["Intelligence", "Wisdom", "Charisma"],
    feat: "Magic Initiate (Cleric)",
    skills: ["Insight", "Religion"],
    tool: "Calligrapher’s Supplies",
  },
  {
    name: "Artisan",
    abilities: ["Strength", "Dexterity", "Intelligence"],
    feat: "Crafter",
    skills: ["Investigation", "Persuasion"],
    tool: "One kind of Artisan’s Tools (choose)",
  },
  {
    name: "Charlatan",
    abilities: ["Dexterity", "Constitution", "Charisma"],
    feat: "Skilled",
    skills: ["Deception", "Sleight of Hand"],
    tool: "Forgery Kit",
  },
  {
    name: "Criminal",
    abilities: ["Dexterity", "Constitution", "Intelligence"],
    feat: "Alert",
    skills: ["Sleight of Hand", "Stealth"],
    tool: "Thieves’ Tools",
  },
  {
    name: "Entertainer",
    abilities: ["Strength", "Dexterity", "Charisma"],
    feat: "Musician",
    skills: ["Acrobatics", "Performance"],
    tool: "One Musical Instrument (choose)",
  },
  {
    name: "Farmer",
    abilities: ["Strength", "Constitution", "Wisdom"],
    feat: "Tough",
    skills: ["Animal Handling", "Nature"],
    tool: "Carpenter’s Tools",
  },
  {
    name: "Guard",
    abilities: ["Strength", "Intelligence", "Wisdom"],
    feat: "Alert",
    skills: ["Athletics", "Perception"],
    tool: "One Gaming Set (choose)",
  },
  {
    name: "Guide",
    abilities: ["Dexterity", "Constitution", "Wisdom"],
    feat: "Magic Initiate (Druid)",
    skills: ["Stealth", "Survival"],
    tool: "Cartographer’s Tools",
  },
  {
    name: "Hermit",
    abilities: ["Constitution", "Wisdom", "Charisma"],
    feat: "Healer",
    skills: ["Medicine", "Religion"],
    tool: "Herbalism Kit",
  },
  {
    name: "Merchant",
    abilities: ["Constitution", "Intelligence", "Charisma"],
    feat: "Lucky",
    skills: ["Animal Handling", "Persuasion"],
    tool: "Navigator’s Tools",
  },
  {
    name: "Noble",
    abilities: ["Strength", "Intelligence", "Charisma"],
    feat: "Skilled",
    skills: ["History", "Persuasion"],
    tool: "One Gaming Set (choose)",
  },
  {
    name: "Sage",
    abilities: ["Constitution", "Intelligence", "Wisdom"],
    feat: "Magic Initiate (Wizard)",
    skills: ["Arcana", "History"],
    tool: "Calligrapher’s Supplies",
  },
  {
    name: "Sailor",
    abilities: ["Strength", "Dexterity", "Wisdom"],
    feat: "Tavern Brawler",
    skills: ["Acrobatics", "Perception"],
    tool: "Navigator’s Tools",
  },
  {
    name: "Scribe",
    abilities: ["Dexterity", "Intelligence", "Wisdom"],
    feat: "Skilled",
    skills: ["Investigation", "Perception"],
    tool: "Calligrapher’s Supplies",
  },
  {
    name: "Soldier",
    abilities: ["Strength", "Dexterity", "Constitution"],
    feat: "Savage Attacker",
    skills: ["Athletics", "Intimidation"],
    tool: "One Gaming Set (choose)",
  },
  {
    name: "Wayfarer",
    abilities: ["Dexterity", "Wisdom", "Charisma"],
    feat: "Lucky",
    skills: ["Insight", "Stealth"],
    tool: "Thieves’ Tools",
  },
];
export function officialBackground(name) {
  return (
    backgrounds.find(
      (entry) => entry.name.toLowerCase() === (name || "").trim().toLowerCase(),
    ) || null
  );
}
export function backgroundReference(name) {
  return `https://roll20.net/compendium/dnd5e/Backgrounds:${encodeURIComponent(name)}?expansion=32231`;
}
