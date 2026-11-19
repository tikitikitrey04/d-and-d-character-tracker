import { modifier, proficiency, skills } from "./character.mjs";

// Base AC and maximum Dexterity contribution; null means no cap.
export const armorTypes = {
  padded: [11, null],
  leather: [11, null],
  "studded leather": [12, null],
  hide: [12, 2],
  "chain shirt": [13, 2],
  "scale mail": [14, 2],
  breastplate: [14, 2],
  "half plate": [15, 2],
  "ring mail": [14, 0],
  "chain mail": [16, 0],
  splint: [17, 0],
  plate: [18, 0],
};
export const statTraits = ["defense", "jackOfAllTrades", "alert"];
export function armorItem(item) {
  const name = item.name.trim().toLowerCase().replace(/\s+/g, " ");
  const bonus = Number(name.match(/(?:^|\s)\+([1-3])(?:\s|$)/)?.[1] || 0);
  const key = name
    .replace(/(?:^|\s)\+[1-3](?=\s|$)/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/ armor$/, "")
    .trim();
  if (key === "shield") return { shield: true, bonus };
  return armorTypes[key]
    ? { key, bonus, base: armorTypes[key][0], cap: armorTypes[key][1] }
    : null;
}
export function characterStats(c) {
  const prof = proficiency(c.level),
    dex = modifier(c.abilities[1]);
  const traits = c.statTraits || [];
  const equipped = (c.inventory || [])
    .filter((i) => i.equipped && i.quantity > 0)
    .map(armorItem)
    .filter(Boolean);
  const armor = equipped.filter((i) => !i.shield);
  const shields = equipped.filter((i) => i.shield);
  const shield = !!c.shieldEquipped || shields.length > 0;
  // Multiple shields never stack. Shield training is explicit for feature grants.
  const trained =
    c.shieldTraining ??
    ["Barbarian", "Cleric", "Druid", "Fighter", "Paladin", "Ranger"].includes(
      c.class,
    );
  const shieldBonus =
    shield && trained ? 2 + Math.max(0, ...shields.map((i) => i.bonus)) : 0;
  let base = 10 + dex,
    source = "10 + Dexterity";
  const warnings = [];
  if (armor.length) {
    // Invalid combinations are flagged; select the best single armor, never stack.
    const choices = armor.map((i) => ({
      ...i,
      ac:
        i.base +
        (i.cap === 0 ? 0 : i.cap === null ? dex : Math.min(i.cap, dex)) +
        i.bonus,
    }));
    const best = choices.sort((a, b) => b.ac - a.ac)[0];
    base = best.ac;
    source = best.key;
    if (armor.length > 1)
      warnings.push(
        "Multiple armor items equipped; only the highest AC armor applies.",
      );
  } else if (c.class === "Barbarian") {
    base = 10 + dex + modifier(c.abilities[2]);
    source = "Unarmored Defense (Dex + Con)";
  } else if (c.class === "Monk" && !shield) {
    base = 10 + dex + modifier(c.abilities[4]);
    source = "Unarmored Defense (Dex + Wis)";
  }
  if (shield && !trained) warnings.push("Shield AC requires shield training.");
  const defense = armor.length > 0 && traits.includes("defense") ? 1 : 0;
  const automaticAC = base + shieldBonus + defense + (c.acAdjustment || 0);
  const skillBonuses = Object.fromEntries(
    skills.map(([name, i]) => {
      const rank = c.skills[name] || 0;
      const bonus = rank
        ? prof * rank
        : traits.includes("jackOfAllTrades")
          ? Math.floor(prof / 2)
          : 0;
      return [name, modifier(c.abilities[i]) + bonus];
    }),
  );
  return {
    ac: c.acMode === "auto" ? automaticAC : c.ac,
    automaticAC,
    acSource: `${source}${shieldBonus ? ` + shield ${shieldBonus}` : ""}${defense ? " + Defense 1" : ""}${c.acAdjustment ? ` + adjustment ${c.acAdjustment}` : ""}`,
    warnings,
    skillBonuses,
    saves: c.abilities.map(
      (score, i) => modifier(score) + (c.saves.includes(i) ? prof : 0),
    ),
    initiative: dex + (traits.includes("alert") ? prof : 0),
    passivePerception: 10 + skillBonuses.Perception,
  };
}
