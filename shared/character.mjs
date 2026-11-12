import { validateWeapon } from "./weapons.mjs";

export const abilities = [
  "Strength",
  "Dexterity",
  "Constitution",
  "Intelligence",
  "Wisdom",
  "Charisma",
];
export const classes = [
  "Barbarian",
  "Bard",
  "Cleric",
  "Druid",
  "Fighter",
  "Monk",
  "Paladin",
  "Ranger",
  "Rogue",
  "Sorcerer",
  "Warlock",
  "Wizard",
];
export const skills = [
  ["Acrobatics", 1],
  ["Animal Handling", 4],
  ["Arcana", 3],
  ["Athletics", 0],
  ["Deception", 5],
  ["History", 3],
  ["Insight", 4],
  ["Intimidation", 5],
  ["Investigation", 3],
  ["Medicine", 4],
  ["Nature", 3],
  ["Perception", 4],
  ["Performance", 5],
  ["Persuasion", 5],
  ["Religion", 3],
  ["Sleight of Hand", 1],
  ["Stealth", 1],
  ["Survival", 4],
];
export const modifier = (score) => Math.floor((score - 10) / 2);
export const signed = (value) => (value >= 0 ? `+${value}` : `${value}`);
export const proficiency = (level) => 2 + Math.floor((level - 1) / 4);
export function blankCharacter() {
  return {
    name: "",
    class: "Fighter",
    subclass: "",
    species: "Human",
    background: "",
    level: 1,
    campaign: "",
    abilities: [15, 14, 13, 12, 10, 8],
    hp: 10,
    maxHp: 10,
    tempHp: 0,
    ac: 10,
    speed: 30,
    inspiration: false,
    conditions: [],
    skills: {},
    saves: [],
    deathSuccess: 0,
    deathFailure: 0,
    attacks: [],
    weapons: [],
    shieldEquipped: false,
    weaponLimitOverride: false,
    weaponHandLimit: 2,
    weaponMasteryLimit: 0,
    spells: [],
    spellLimitOverride: false,
    cantripLimit: 0,
    preparedSpellLimit: 0,
    slotMode: "auto",
    slots: Array.from({ length: 9 }, () => ({ max: 0, used: 0 })),
    inventory: [],
    resources: [],
    features: "",
    notes: "",
    gold: 0,
    languages: "",
    equipmentProficiencies: "",
    appearance: "",
    xp: 0,
  };
}
export function validateCharacter(c) {
  const int = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
  const str = (v, max = 200) => typeof v === "string" && v.length <= max;
  if (
    !c ||
    !str(c.name, 80) ||
    !c.name.trim() ||
    !classes.includes(c.class) ||
    !int(c.level, 1, 20)
  )
    return false;
  if (
    ![
      "species",
      "background",
      "subclass",
      "campaign",
      "languages",
      "equipmentProficiencies",
      "appearance",
    ].every((k) => str(c[k]))
  )
    return false;
  if (!["features", "notes"].every((k) => str(c[k], 20000))) return false;
  if (
    !Array.isArray(c.abilities) ||
    c.abilities.length !== 6 ||
    !c.abilities.every((v) => int(v, 1, 30))
  )
    return false;
  if (
    !int(c.maxHp, 1, 9999) ||
    !int(c.hp, 0, c.maxHp) ||
    !int(c.tempHp, 0, 9999) ||
    !int(c.ac, 0, 99) ||
    !int(c.speed, 0, 999) ||
    !int(c.gold, 0, 100000000) ||
    !int(c.xp, 0, 10000000)
  )
    return false;
  if (
    typeof c.inspiration !== "boolean" ||
    !int(c.deathSuccess, 0, 3) ||
    !int(c.deathFailure, 0, 3)
  )
    return false;
  if (
    !Array.isArray(c.conditions) ||
    c.conditions.length > 30 ||
    !c.conditions.every((v) => str(v, 40))
  )
    return false;
  if (
    !Array.isArray(c.saves) ||
    !c.saves.every((v) => int(v, 0, 5)) ||
    !c.skills ||
    typeof c.skills !== "object" ||
    Array.isArray(c.skills) ||
    !Object.entries(c.skills).every(
      ([k, v]) => skills.some((s) => s[0] === k) && int(v, 0, 2),
    )
  )
    return false;
  if (
    (c.slotMode !== undefined && !["auto", "manual"].includes(c.slotMode)) ||
    !Array.isArray(c.slots) ||
    c.slots.length !== 9 ||
    !c.slots.every((s) => s && int(s.max, 0, 20) && int(s.used, 0, s.max))
  )
    return false;
  for (const key of ["inventory", "attacks", "spells", "resources"]) {
    if (
      !Array.isArray(c[key]) ||
      c[key].length > 200 ||
      !c[key].every(
        (i) =>
          i &&
          str(i.id, 80) &&
          str(i.name) &&
          str(i.detail, key === "spells" ? 20000 : 2000),
      )
    )
      return false;
  }
  if (
    !c.inventory.every(
      (i) => int(i.quantity, 0, 9999) && typeof i.equipped === "boolean",
    )
  )
    return false;
  if (
    (c.spellLimitOverride !== undefined &&
      typeof c.spellLimitOverride !== "boolean") ||
    (c.cantripLimit !== undefined && !int(c.cantripLimit, 0, 200)) ||
    (c.preparedSpellLimit !== undefined &&
      !int(c.preparedSpellLimit, 0, 200)) ||
    (c.spellLimitOverride &&
      (!int(c.cantripLimit, 0, 200) || !int(c.preparedSpellLimit, 0, 200))) ||
    !c.spells.every(
      (i) =>
        int(i.level, 0, 9) &&
        typeof i.prepared === "boolean" &&
        (i.arcanumUsed === undefined || typeof i.arcanumUsed === "boolean") &&
        (i.preparationSource === undefined ||
          ["class", "granted", "arcanum"].includes(i.preparationSource)) &&
        (i.preparationSource !== "arcanum" || i.level >= 6),
    )
  )
    return false;
  if (!c.resources.every((i) => int(i.max, 1, 999) && int(i.used, 0, i.max)))
    return false;
  if (
    (c.weapons !== undefined &&
      (!Array.isArray(c.weapons) ||
        c.weapons.length > 200 ||
        !c.weapons.every(validateWeapon) ||
        new Set(c.weapons.map((w) => w.id)).size !== c.weapons.length)) ||
    ["shieldEquipped", "weaponLimitOverride"].some(
      (k) => c[k] !== undefined && typeof c[k] !== "boolean",
    ) ||
    (c.weaponHandLimit !== undefined && !int(c.weaponHandLimit, 0, 20)) ||
    (c.weaponMasteryLimit !== undefined &&
      !int(c.weaponMasteryLimit, 0, 200)) ||
    (c.weaponLimitOverride &&
      (!int(c.weaponHandLimit, 0, 20) || !int(c.weaponMasteryLimit, 0, 200)))
  )
    return false;
  return true;
}
