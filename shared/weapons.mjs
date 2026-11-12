import { weaponProperties, masteryDescriptions } from "./weapon-catalog.mjs";

export const validDamage = (value) =>
  typeof value === "string" &&
  /^(?:[1-9]|1[0-9]|20)d(?:[2-9]|[1-9][0-9]|100)$|^[1-9][0-9]?$/.test(value);
export function validateWeapon(w) {
  const str = (value, max = 200) =>
    typeof value === "string" && value.length <= max;
  const int = (value, min, max) =>
    Number.isInteger(value) && value >= min && value <= max;
  return (
    !!w &&
    str(w.id, 80) &&
    !!w.id &&
    str(w.name) &&
    !!w.name.trim() &&
    str(w.catalogKey, 100) &&
    str(w.detail, 20000) &&
    ["Simple", "Martial"].includes(w.category) &&
    ["Melee", "Ranged"].includes(w.kind) &&
    validDamage(w.damageDice) &&
    (!w.versatileDice || validDamage(w.versatileDice)) &&
    str(w.versatileDice, 20) &&
    str(w.damageType, 50) &&
    Array.isArray(w.properties) &&
    w.properties.every((p) => weaponProperties.includes(p)) &&
    w.properties.length <= 9 &&
    (!w.mastery || Object.hasOwn(masteryDescriptions, w.mastery)) &&
    str(w.mastery, 30) &&
    ["range", "ammunition", "weight", "cost"].every((k) => str(w[k])) &&
    ["equipped", "mastered", "limitedUses"].every(
      (k) => typeof w[k] === "boolean",
    ) &&
    int(w.quantity, 0, 9999) &&
    int(w.ammunitionCount, 0, 9999) &&
    [1, 2].includes(w.grip) &&
    ["auto", "0", "1", "2", "3", "4", "5"].includes(w.ability) &&
    ["auto", "yes", "no"].includes(w.proficiency) &&
    int(w.magicBonus, -10, 10) &&
    int(w.attackAdjustment, -20, 20) &&
    int(w.damageAdjustment, -20, 20) &&
    int(w.usesMax, 1, 999) &&
    int(w.usesUsed, 0, w.usesMax)
  );
}
export function weaponProficient(c, w) {
  if (w.proficiency === "yes") return true;
  if (w.proficiency === "no") return false;
  if (
    w.category === "Simple" ||
    ["Barbarian", "Fighter", "Paladin", "Ranger"].includes(c.class)
  )
    return true;
  if (c.class === "Rogue")
    return w.properties.includes("Finesse") || w.properties.includes("Light");
  return c.class === "Monk" && w.properties.includes("Light");
}
export function weaponMasteryLimit(c) {
  if (c.weaponLimitOverride) return c.weaponMasteryLimit;
  if (c.class === "Fighter")
    return (
      3 +
      (c.level >= 4 ? 1 : 0) +
      (c.level >= 10 ? 1 : 0) +
      (c.level >= 16 ? 1 : 0)
    );
  if (c.class === "Barbarian")
    return 2 + (c.level >= 4 ? 1 : 0) + (c.level >= 10 ? 1 : 0);
  return ["Rogue", "Paladin", "Ranger"].includes(c.class) ? 2 : 0;
}
export const weaponHands = (w) =>
  w.properties.includes("Two-Handed") && w.name !== "Lance" ? 2 : w.grip;
export const weaponKey = (w) => w.catalogKey || w.name.trim().toLowerCase();
export function weaponSummary(c) {
  const weapons = c.weapons || [];
  const hands =
    weapons
      .filter((w) => w.equipped && w.quantity > 0)
      .reduce((sum, w) => sum + weaponHands(w), 0) + (c.shieldEquipped ? 1 : 0);
  const mastered = new Set(weapons.filter((w) => w.mastered).map(weaponKey))
    .size;
  return {
    owned: weapons.reduce((sum, w) => sum + w.quantity, 0),
    equipped: weapons.filter((w) => w.equipped).length,
    hands,
    handLimit: c.weaponLimitOverride ? c.weaponHandLimit : 2,
    mastered,
    masteryLimit: weaponMasteryLimit(c),
  };
}
export function weaponChangeError(next, previous) {
  const a = weaponSummary(next),
    b = previous ? weaponSummary(previous) : { hands: 0, mastered: 0 };
  if (a.hands > a.handLimit && a.hands > b.hands)
    return `Equipped weapons and shield need ${a.hands} hands; your limit is ${a.handLimit}. Unequip an item or adjust the manual hand limit.`;
  if (a.mastered > a.masteryLimit && a.mastered > b.mastered)
    return `Weapon mastery: ${a.mastered} weapon kinds selected, limit ${a.masteryLimit}. Remove a selection or adjust the manual mastery limit.`;
  const oldKeys = new Set(
    (previous?.weapons || []).filter((w) => w.mastered).map(weaponKey),
  );
  for (const w of next.weapons || [])
    if (
      w.mastered &&
      !oldKeys.has(weaponKey(w)) &&
      !next.weaponLimitOverride &&
      (!w.mastery ||
        !weaponProficient(next, w) ||
        (next.class === "Barbarian" && w.kind !== "Melee"))
    )
      return `Your class cannot select mastery for ${w.name}. Check proficiency or use the manual mastery override for a feature grant.`;
  return "";
}
export function weaponStats(c, w, twoHanded = false) {
  const mod = (i) => Math.floor((c.abilities[i] - 10) / 2);
  const ability =
    w.ability !== "auto"
      ? Number(w.ability)
      : w.properties.includes("Finesse")
        ? mod(1) > mod(0)
          ? 1
          : 0
        : w.kind === "Ranged"
          ? 1
          : 0;
  const abilityBonus = mod(ability),
    prof = weaponProficient(c, w) ? 2 + Math.floor((c.level - 1) / 4) : 0;
  return {
    ability,
    proficient: !!prof,
    attackBonus: abilityBonus + prof + w.magicBonus + w.attackAdjustment,
    damageBonus: abilityBonus + w.magicBonus + w.damageAdjustment,
    damageDice: twoHanded && w.versatileDice ? w.versatileDice : w.damageDice,
    masteryDC: 8 + abilityBonus + 2 + Math.floor((c.level - 1) / 4),
  };
}
export function weaponModes(w) {
  const modes =
    w.kind === "Melee"
      ? [
          {
            key: "melee",
            label: w.versatileDice ? "One-handed" : "Melee",
            hands: weaponHands(w),
          },
        ]
      : [
          {
            key: w.properties.includes("Thrown") ? "throw" : "ranged",
            label: w.properties.includes("Thrown") ? "Throw" : "Ranged",
            hands: weaponHands(w),
          },
        ];
  if (w.versatileDice) {
    modes[0].hands = 1;
    modes.push({ key: "two-handed", label: "Two-handed", hands: 2 });
  }
  if (w.kind === "Melee" && w.properties.includes("Thrown"))
    modes.push({ key: "throw", label: "Throw", hands: 1 });
  return modes;
}
export function weaponAttackError(c, w, modeKey) {
  const mode = weaponModes(w).find((m) => m.key === modeKey);
  if (!mode) return "That attack mode is unavailable.";
  if (!w.equipped) return "Equip this weapon before attacking.";
  if (w.quantity === 0) return "No copies of this weapon remain.";
  if (!validDamage(modeKey === "two-handed" ? w.versatileDice : w.damageDice))
    return "Enter valid weapon damage before attacking.";
  const summary = weaponSummary(c);
  const needed = summary.hands - weaponHands(w) + mode.hands;
  if (needed > summary.handLimit)
    return "Not enough free hands for that attack mode.";
  if (
    w.properties.includes("Ammunition") &&
    modeKey === "ranged" &&
    w.ammunitionCount === 0
  )
    return "No ammunition remaining.";
  if (
    w.properties.includes("Ammunition") &&
    mode.hands === 1 &&
    needed + 1 > summary.handLimit
  )
    return "A free hand is needed to load this weapon.";
  if (w.limitedUses && w.usesUsed >= w.usesMax)
    return "No weapon uses remaining.";
  return "";
}
export function rollDie(sides) {
  const bytes = new Uint32Array(1),
    limit = Math.floor(4294967296 / sides) * sides;
  do {
    crypto.getRandomValues(bytes);
  } while (bytes[0] >= limit);
  return (bytes[0] % sides) + 1;
}
export function attackWithWeapon(
  c,
  id,
  modeKey,
  roll = rollDie,
  rollMode = "normal",
) {
  const w = (c.weapons || []).find((w) => w.id === id);
  if (!w) throw new Error("Weapon not found.");
  const error = weaponAttackError(c, w, modeKey);
  if (error) throw new Error(error);
  if (!["normal", "advantage", "disadvantage"].includes(rollMode))
    throw new Error("Invalid attack roll mode.");
  const heavy =
    w.properties.includes("Heavy") &&
    c.abilities[w.kind === "Melee" ? 0 : 1] < 13;
  const disadvantage =
    rollMode === "disadvantage" || (heavy && rollMode === "normal");
  const advantage = rollMode === "advantage" && !heavy;
  const rolls = [roll(20)];
  if (disadvantage || advantage) rolls.push(roll(20));
  const natural = disadvantage
    ? Math.min(...rolls)
    : advantage
      ? Math.max(...rolls)
      : rolls[0];
  const stats = weaponStats(c, w, modeKey === "two-handed"),
    critical = natural === 20;
  const [count, sides] = stats.damageDice.includes("d")
    ? stats.damageDice.split("d").map(Number)
    : [0, 0];
  let damage = 0;
  if (natural !== 1) {
    damage = count
      ? Array.from({ length: count * (critical ? 2 : 1) }, () =>
          roll(sides),
        ).reduce((a, b) => a + b, 0)
      : Number(stats.damageDice);
    damage = Math.max(0, damage + stats.damageBonus);
  }
  const next = {
    ...c,
    weapons: (c.weapons || []).map((item) =>
      item.id !== id
        ? item
        : {
            ...item,
            quantity: modeKey === "throw" ? item.quantity - 1 : item.quantity,
            ammunitionCount:
              modeKey === "ranged" && item.properties.includes("Ammunition")
                ? item.ammunitionCount - 1
                : item.ammunitionCount,
            usesUsed: item.limitedUses ? item.usesUsed + 1 : item.usesUsed,
          },
    ),
  };
  return {
    character: next,
    message: `${w.name} (${modeKey}): d20 ${rolls.join(" / ")} ${stats.attackBonus >= 0 ? "+" : ""}${stats.attackBonus} = ${natural + stats.attackBonus}. ${natural === 1 ? "Natural 1 — miss." : critical ? `Critical hit: ${damage} ${w.damageType} damage.` : `Damage if the attack hits: ${damage} ${w.damageType}.`}${heavy ? " Heavy weapon rule applied." : ""}`,
  };
}
