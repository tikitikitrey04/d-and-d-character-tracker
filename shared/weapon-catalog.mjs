// Transcribed from the SRD 5.2.1 Weapons table, p.91–92 (CC-BY-4.0).
// Fields: name|category|kind|damage|type|properties|mastery|versatile|range|ammo|weight|cost.
const rows = `Club|Simple|Melee|1d4|Bludgeoning|Light|Slow||| |2 lb.|1 SP
Dagger|Simple|Melee|1d4|Piercing|Finesse,Light,Thrown|Nick||20/60||1 lb.|2 GP
Greatclub|Simple|Melee|1d8|Bludgeoning|Two-Handed|Push||||10 lb.|2 SP
Handaxe|Simple|Melee|1d6|Slashing|Light,Thrown|Vex||20/60||2 lb.|5 GP
Javelin|Simple|Melee|1d6|Piercing|Thrown|Slow||30/120||2 lb.|5 SP
Light Hammer|Simple|Melee|1d4|Bludgeoning|Light,Thrown|Nick||20/60||2 lb.|2 GP
Mace|Simple|Melee|1d6|Bludgeoning||Sap||||4 lb.|5 GP
Quarterstaff|Simple|Melee|1d6|Bludgeoning|Versatile|Topple|1d8|||4 lb.|2 SP
Sickle|Simple|Melee|1d4|Slashing|Light|Nick||||2 lb.|1 GP
Spear|Simple|Melee|1d6|Piercing|Thrown,Versatile|Sap|1d8|20/60||3 lb.|1 GP
Dart|Simple|Ranged|1d4|Piercing|Finesse,Thrown|Vex||20/60||1/4 lb.|5 CP
Light Crossbow|Simple|Ranged|1d8|Piercing|Ammunition,Loading,Two-Handed|Slow||80/320|Bolt|5 lb.|25 GP
Shortbow|Simple|Ranged|1d6|Piercing|Ammunition,Two-Handed|Vex||80/320|Arrow|2 lb.|25 GP
Sling|Simple|Ranged|1d4|Bludgeoning|Ammunition|Slow||30/120|Bullet|—|1 SP
Battleaxe|Martial|Melee|1d8|Slashing|Versatile|Topple|1d10|||4 lb.|10 GP
Flail|Martial|Melee|1d8|Bludgeoning||Sap||||2 lb.|10 GP
Glaive|Martial|Melee|1d10|Slashing|Heavy,Reach,Two-Handed|Graze||||6 lb.|20 GP
Greataxe|Martial|Melee|1d12|Slashing|Heavy,Two-Handed|Cleave||||7 lb.|30 GP
Greatsword|Martial|Melee|2d6|Slashing|Heavy,Two-Handed|Graze||||6 lb.|50 GP
Halberd|Martial|Melee|1d10|Slashing|Heavy,Reach,Two-Handed|Cleave||||6 lb.|20 GP
Lance|Martial|Melee|1d10|Piercing|Heavy,Reach,Two-Handed|Topple||||6 lb.|10 GP
Longsword|Martial|Melee|1d8|Slashing|Versatile|Sap|1d10|||3 lb.|15 GP
Maul|Martial|Melee|2d6|Bludgeoning|Heavy,Two-Handed|Topple||||10 lb.|10 GP
Morningstar|Martial|Melee|1d8|Piercing||Sap||||4 lb.|15 GP
Pike|Martial|Melee|1d10|Piercing|Heavy,Reach,Two-Handed|Push||||18 lb.|5 GP
Rapier|Martial|Melee|1d8|Piercing|Finesse|Vex||||2 lb.|25 GP
Scimitar|Martial|Melee|1d6|Slashing|Finesse,Light|Nick||||3 lb.|25 GP
Shortsword|Martial|Melee|1d6|Piercing|Finesse,Light|Vex||||2 lb.|10 GP
Trident|Martial|Melee|1d8|Piercing|Thrown,Versatile|Topple|1d10|20/60||4 lb.|5 GP
Warhammer|Martial|Melee|1d8|Bludgeoning|Versatile|Push|1d10|||5 lb.|15 GP
War Pick|Martial|Melee|1d8|Piercing|Versatile|Sap|1d10|||2 lb.|5 GP
Whip|Martial|Melee|1d4|Slashing|Finesse,Reach|Slow||||3 lb.|2 GP
Blowgun|Martial|Ranged|1|Piercing|Ammunition,Loading|Vex||25/100|Needle|1 lb.|10 GP
Hand Crossbow|Martial|Ranged|1d6|Piercing|Ammunition,Light,Loading|Vex||30/120|Bolt|3 lb.|75 GP
Heavy Crossbow|Martial|Ranged|1d10|Piercing|Ammunition,Heavy,Loading,Two-Handed|Push||100/400|Bolt|18 lb.|50 GP
Longbow|Martial|Ranged|1d8|Piercing|Ammunition,Heavy,Two-Handed|Slow||150/600|Arrow|2 lb.|50 GP
Musket|Martial|Ranged|1d12|Piercing|Ammunition,Loading,Two-Handed|Slow||40/120|Bullet|10 lb.|500 GP
Pistol|Martial|Ranged|1d10|Piercing|Ammunition,Loading|Vex||30/90|Bullet|3 lb.|250 GP`;

export const weaponProperties = [
  "Ammunition",
  "Finesse",
  "Heavy",
  "Light",
  "Loading",
  "Reach",
  "Thrown",
  "Two-Handed",
  "Versatile",
];
export const masteryDescriptions = {
  Cleave:
    "After a melee hit, one extra melee attack may hit a nearby second target once per turn. Omit a positive ability modifier from its damage.",
  Graze:
    "On a miss, you may deal damage equal to the attack ability modifier. Resolve this separately from normal hit damage.",
  Nick: "The extra attack from the Light property can be part of the Attack action rather than a Bonus Action, once per turn.",
  Push: "A hit can push a Large or smaller target up to 10 feet directly away.",
  Sap: "A hit gives the target Disadvantage on its next attack before your next turn.",
  Slow: "A damaging hit can reduce the target's Speed by 10 feet until your next turn; this reduction does not stack beyond 10 feet.",
  Topple:
    "On a hit, the target may be forced to make a Constitution save against 8 + your attack ability modifier + proficiency bonus, falling Prone on a failure.",
  Vex: "A damaging hit grants Advantage on your next attack against that creature before your next turn ends.",
};
export const weaponCatalog = rows.split("\n").map((row) => {
  const [
    name,
    category,
    kind,
    damageDice,
    damageType,
    properties,
    mastery,
    versatileDice,
    range,
    ammunition,
    weight,
    cost,
  ] = row.split("|").map((value) => value.trim());
  return {
    key: name.toLowerCase().replaceAll(" ", "-"),
    name,
    category,
    kind,
    damageDice,
    damageType,
    properties: properties ? properties.split(",") : [],
    mastery,
    versatileDice,
    range,
    ammunition,
    weight,
    cost,
  };
});

export function weaponDescription(w) {
  return [
    `${w.category} ${w.kind} weapon`,
    `Damage: ${w.damageDice} ${w.damageType}${w.versatileDice ? ` (${w.versatileDice} with two hands)` : ""}`,
    `Properties: ${w.properties.join(", ") || "None"}`,
    w.range ? `Range: ${w.range} feet` : "",
    w.ammunition ? `Ammunition: ${w.ammunition}` : "",
    `Weight: ${w.weight || "—"} · Cost: ${w.cost || "—"}`,
    w.name === "Lance"
      ? "Lance needs two hands unless mounted; a mounted grip can be set manually."
      : "",
    w.mastery
      ? `Mastery — ${w.mastery}: ${masteryDescriptions[w.mastery]}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function makeWeapon(template, id) {
  return {
    ...template,
    catalogKey: template.key || "",
    id,
    detail: weaponDescription(template),
    quantity: 1,
    ammunitionCount: 0,
    equipped: false,
    mastered: false,
    grip: template.properties.includes("Two-Handed") ? 2 : 1,
    ability: "auto",
    proficiency: "auto",
    magicBonus: 0,
    attackAdjustment: 0,
    damageAdjustment: 0,
    limitedUses: false,
    usesMax: 1,
    usesUsed: 0,
  };
}
