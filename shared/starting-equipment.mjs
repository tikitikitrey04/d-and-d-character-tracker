import { equipmentCatalog, addEquipment } from "./equipment.mjs";
import { officialBackground } from "./backgrounds.mjs";
import { newId } from "./id.mjs";

// Package contents are mechanical metadata from the 2024 class/background tables.
// https://www.dndbeyond.com/sources/dnd/br-2024/character-classes
// https://pages.roll20.net/dnd/2024-backgrounds
const item = (name, quantity = 1, extra = {}) => ({ name, quantity, ...extra });
const choose = (id, label, kind) => ({
  choice: { id, label, kind },
  quantity: 1,
});
const pack = (gold, items, label = "Equipment package") => ({
  gold,
  items,
  label,
});
const cash = (gold) => pack(gold, [], `${gold} GP instead of equipment`);
const book = (subject) =>
  item("Book", 1, { label: `Book (${subject})`, note: `Subject: ${subject}.` });
const focusStaff = (kind) =>
  item("Quarterstaff", 1, {
    label: `${kind} Focus (Quarterstaff)`,
    note: `This Quarterstaff is also ${kind === "Arcane" ? "an" : "a"} ${kind} Focus.`,
  });
const bow = (name, ammunitionCount = 20) => item(name, 1, { ammunitionCount });
const symbol = (source) =>
  choose(
    `${source}-symbol`,
    `${source === "class" ? "Class" : "Background"} holy symbol`,
    "symbol",
  );
const gaming = () =>
  choose("background-game", "Background gaming set", "gaming");
export const classStartingEquipment = {
  Barbarian: {
    A: pack(15, [
      item("Greataxe"),
      item("Handaxe", 4),
      item("Explorer’s Pack"),
    ]),
    B: cash(75),
  },
  Bard: {
    A: pack(19, [
      item("Leather Armor"),
      item("Dagger", 2),
      choose("class-instrument", "Class musical instrument", "instrument"),
      item("Entertainer’s Pack"),
    ]),
    B: cash(90),
  },
  Cleric: {
    A: pack(7, [
      item("Chain Shirt"),
      item("Shield"),
      item("Mace"),
      symbol("class"),
      item("Priest’s Pack"),
    ]),
    B: cash(110),
  },
  Druid: {
    A: pack(9, [
      item("Leather Armor"),
      item("Shield"),
      item("Sickle"),
      focusStaff("Druidic"),
      item("Explorer’s Pack"),
      item("Herbalism Kit"),
    ]),
    B: cash(50),
  },
  Fighter: {
    A: pack(
      4,
      [
        item("Chain Mail"),
        item("Greatsword"),
        item("Flail"),
        item("Javelin", 8),
        item("Dungeoneer’s Pack"),
      ],
      "Heavy armor equipment package",
    ),
    B: pack(
      11,
      [
        item("Studded Leather Armor"),
        item("Scimitar"),
        item("Shortsword"),
        bow("Longbow"),
        item("Quiver"),
        item("Dungeoneer’s Pack"),
      ],
      "Light armor & longbow package",
    ),
    C: cash(155),
  },
  Monk: {
    A: pack(11, [
      item("Spear"),
      item("Dagger", 5),
      choose(
        "class-tool",
        "Class tool or musical instrument (match your proficiency)",
        "artisan-or-instrument",
      ),
      item("Explorer’s Pack"),
    ]),
    B: cash(50),
  },
  Paladin: {
    A: pack(9, [
      item("Chain Mail"),
      item("Shield"),
      item("Longsword"),
      item("Javelin", 6),
      symbol("class"),
      item("Priest’s Pack"),
    ]),
    B: cash(150),
  },
  Ranger: {
    A: pack(7, [
      item("Studded Leather Armor"),
      item("Scimitar"),
      item("Shortsword"),
      bow("Longbow"),
      item("Quiver"),
      item("Druidic Focus (Sprig of mistletoe)"),
      item("Explorer’s Pack"),
    ]),
    B: cash(150),
  },
  Rogue: {
    A: pack(8, [
      item("Leather Armor"),
      item("Dagger", 2),
      item("Shortsword"),
      bow("Shortbow"),
      item("Quiver"),
      item("Thieves’ Tools"),
      item("Burglar’s Pack"),
    ]),
    B: cash(100),
  },
  Sorcerer: {
    A: pack(28, [
      item("Spear"),
      item("Dagger", 2),
      item("Arcane Focus (Crystal)"),
      item("Dungeoneer’s Pack"),
    ]),
    B: cash(50),
  },
  Warlock: {
    A: pack(15, [
      item("Leather Armor"),
      item("Sickle"),
      item("Dagger", 2),
      item("Arcane Focus (Orb)"),
      book("occult lore"),
      item("Scholar’s Pack"),
    ]),
    B: cash(100),
  },
  Wizard: {
    A: pack(5, [
      item("Dagger", 2),
      focusStaff("Arcane"),
      item("Robe"),
      item("Spellbook", 1, {
        custom: true,
        note: "Wizard’s class spellbook: 3 lb., 100 pages. Choose and add your starting Wizard spells in Spells.",
      }),
      item("Scholar’s Pack"),
    ]),
    B: cash(55),
  },
};
const artisan = () =>
  choose(
    "background-tool",
    "Background artisan’s tools (match your proficiency)",
    "artisan",
  );
const backgroundPackages = {
  Acolyte: pack(8, [
    item("Calligrapher’s Supplies"),
    book("prayers"),
    symbol("background"),
    item("Parchment", 10),
    item("Robe"),
  ]),
  Artisan: pack(32, [artisan(), item("Pouch", 2), item("Clothes, Traveler’s")]),
  Charlatan: pack(15, [
    item("Forgery Kit"),
    item("Costume"),
    item("Clothes, Fine"),
  ]),
  Criminal: pack(16, [
    item("Dagger", 2),
    item("Thieves’ Tools"),
    item("Crowbar"),
    item("Pouch", 2),
    item("Clothes, Traveler’s"),
  ]),
  Entertainer: pack(11, [
    choose(
      "background-instrument",
      "Background musical instrument (match your proficiency)",
      "instrument",
    ),
    item("Costume", 2),
    item("Mirror"),
    item("Perfume"),
    item("Clothes, Traveler’s"),
  ]),
  Farmer: pack(30, [
    item("Sickle"),
    item("Carpenter’s Tools"),
    item("Healer’s Kit"),
    item("Pot, Iron"),
    item("Shovel"),
    item("Clothes, Traveler’s"),
  ]),
  Guard: pack(12, [
    item("Spear"),
    bow("Light Crossbow"),
    gaming(),
    item("Lantern, Hooded"),
    item("Manacles"),
    item("Quiver"),
    item("Clothes, Traveler’s"),
  ]),
  Guide: pack(3, [
    bow("Shortbow"),
    item("Cartographer’s Tools"),
    item("Bedroll"),
    item("Quiver"),
    item("Tent"),
    item("Clothes, Traveler’s"),
  ]),
  Hermit: pack(16, [
    item("Quarterstaff"),
    item("Herbalism Kit"),
    item("Bedroll"),
    book("philosophy"),
    item("Lamp"),
    item("Oil", 3),
    item("Clothes, Traveler’s"),
  ]),
  Merchant: pack(22, [
    item("Navigator’s Tools"),
    item("Pouch", 2),
    item("Clothes, Traveler’s"),
  ]),
  Noble: pack(29, [gaming(), item("Clothes, Fine"), item("Perfume")]),
  Sage: pack(8, [
    item("Quarterstaff"),
    item("Calligrapher’s Supplies"),
    book("history"),
    item("Parchment", 8),
    item("Robe"),
  ]),
  Sailor: pack(20, [
    item("Dagger"),
    item("Navigator’s Tools"),
    item("Rope"),
    item("Clothes, Traveler’s"),
  ]),
  Scribe: pack(23, [
    item("Calligrapher’s Supplies"),
    item("Clothes, Fine"),
    item("Lamp"),
    item("Oil", 3),
    item("Parchment", 12),
  ]),
  Soldier: pack(14, [
    item("Spear"),
    bow("Shortbow"),
    gaming(),
    item("Healer’s Kit"),
    item("Quiver"),
    item("Clothes, Traveler’s"),
  ]),
  Wayfarer: pack(16, [
    item("Dagger", 2),
    item("Thieves’ Tools"),
    gaming(),
    item("Bedroll"),
    item("Pouch", 2),
    item("Clothes, Traveler’s"),
  ]),
};
export const backgroundStartingEquipment = Object.fromEntries(
  Object.entries(backgroundPackages).map(([name, kit]) => [
    name,
    { A: kit, B: cash(50) },
  ]),
);
const artisanNames = [
  "Alchemist’s Supplies",
  "Brewer’s Supplies",
  "Calligrapher’s Supplies",
  "Carpenter’s Tools",
  "Cartographer’s Tools",
  "Cobbler’s Tools",
  "Cook’s Utensils",
  "Glassblower’s Tools",
  "Jeweler’s Tools",
  "Leatherworker’s Tools",
  "Mason’s Tools",
  "Painter’s Supplies",
  "Potter’s Tools",
  "Smith’s Tools",
  "Tinker’s Tools",
  "Weaver’s Tools",
  "Woodcarver’s Tools",
];
export function startingChoiceOptions(kind) {
  return equipmentCatalog.filter((entry) => {
    const instrument = entry.name.startsWith("Musical Instrument (");
    if (kind === "instrument") return instrument;
    if (kind === "artisan") return artisanNames.includes(entry.name);
    if (kind === "artisan-or-instrument")
      return instrument || artisanNames.includes(entry.name);
    if (kind === "gaming") return entry.name.startsWith("Gaming Set (");
    if (kind === "symbol") return entry.name.startsWith("Holy Symbol (");
    return false;
  });
}
const normalize = (name) => name.toLowerCase().replace(/[’']/g, "");
function catalogEntry(name) {
  const entry = equipmentCatalog.find(
    (e) => normalize(e.name) === normalize(name),
  );
  if (!entry)
    throw new Error(`Starting equipment is missing from the catalog: ${name}`);
  return entry;
}
export function startingEquipmentPlan(c, selection = {}) {
  const classOptions = classStartingEquipment[c.class];
  if (!classOptions)
    throw new Error("Choose a supported class for starting equipment.");
  const background = officialBackground(c.background);
  const backgroundOptions = backgroundStartingEquipment[background?.name];
  const classOption = selection.classOption || "A";
  const backgroundOption = backgroundOptions
    ? selection.backgroundOption || "A"
    : "none";
  const pick = (options, choice) => {
    if (choice === "none") return { gold: 0, items: [] };
    if (!options?.[choice])
      throw new Error("Choose a valid starting equipment option.");
    return options[choice];
  };
  const classKit = pick(classOptions, classOption);
  const backgroundKit = pick(backgroundOptions, backgroundOption);
  const choices = [];
  const items = [...classKit.items, ...backgroundKit.items].map((original) => {
    if (!original.choice) return { ...original };
    const choice = original.choice;
    const options = startingChoiceOptions(choice.kind);
    const selected = selection.choices?.[choice.id] || options[0]?.key;
    const entry = options.find((e) => e.key === selected);
    if (!entry) throw new Error(`Choose valid equipment for ${choice.label}.`);
    choices.push({ ...choice, options, selected });
    return item(entry.name);
  });
  // Resolve every reference during preview, before any character is created.
  for (const row of items)
    if (!row.custom) row.key = catalogEntry(row.name).key;
  const merged = new Map();
  for (const row of items) {
    const key = `${row.name}|${row.note || ""}`;
    const previous = merged.get(key);
    if (previous) {
      previous.quantity += row.quantity;
      previous.ammunitionCount =
        (previous.ammunitionCount || 0) + (row.ammunitionCount || 0);
    } else merged.set(key, { ...row });
  }
  return {
    classOption,
    backgroundOption,
    classGold: classKit.gold,
    backgroundGold: backgroundKit.gold,
    gold: classKit.gold + backgroundKit.gold,
    items: [...merged.values()],
    choices,
  };
}
export function applyStartingEquipment(c, selection = {}, id = newId) {
  const plan = startingEquipmentPlan(c, selection);
  let next = {
    ...c,
    inventory: [...c.inventory],
    weapons: [...(c.weapons || [])],
    gold: c.gold + plan.gold,
  };
  if (next.gold > 100000000)
    throw new Error("Starting gold exceeds the character’s gold limit.");
  for (const row of plan.items) {
    if (row.custom) {
      if (next.inventory.length >= 200)
        throw new Error("Your equipment list already has 200 entries.");
      next.inventory.push({
        id: id(),
        name: row.name,
        detail: row.note || "",
        quantity: row.quantity,
        equipped: false,
      });
      continue;
    }
    const entry = catalogEntry(row.name);
    const equipped =
      selection.equipArmor !== false && entry.category === "Armor & shields";
    next = addEquipment(next, entry.key, row.quantity, equipped, id());
    if (entry.weaponKey) {
      next.weapons = next.weapons.map((weapon, index) =>
        index !== next.weapons.length - 1
          ? weapon
          : {
              ...weapon,
              detail: `${weapon.detail}${row.note ? `\n${row.note}` : ""}`,
              ammunitionCount: row.ammunitionCount || 0,
            },
      );
    } else if (row.note || row.label) {
      next.inventory = next.inventory.map((owned, index) =>
        index !== next.inventory.length - 1
          ? owned
          : {
              ...owned,
              name: row.label || owned.name,
              detail: `${owned.detail}${row.note ? `\n${row.note}` : ""}`,
            },
      );
    }
  }
  return next;
}
