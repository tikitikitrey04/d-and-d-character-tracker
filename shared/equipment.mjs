import data from "../src/data/equipment-2024.json" with { type: "json" };
import {
  weaponCatalog,
  makeWeapon,
  weaponDescription,
} from "./weapon-catalog.mjs";
import { weaponChangeError } from "./weapons.mjs";
import { newId } from "./id.mjs";

export const equipmentCatalog = [
  ...data.items,
  ...weaponCatalog.map((w) => ({
    key: `weapon-${w.key}`,
    weaponKey: w.key,
    name: w.name,
    category: "Weapons",
    cost: w.cost,
    weight: w.weight,
    detail: weaponDescription(w),
  })),
].sort((a, b) => a.name.localeCompare(b.name));
export const equipmentCategories = [
  ...new Set(equipmentCatalog.map((i) => i.category)),
].sort();
export const equipmentServices = data.services;
const normalize = (text) => text.toLowerCase().replace(/[’']/g, "");
export function findEquipment({ search = "", category = "all" } = {}) {
  const words = normalize(search).split(/\s+/).filter(Boolean);
  return equipmentCatalog.filter(
    (item) =>
      (category === "all" || item.category === category) &&
      words.every((word) =>
        normalize(`${item.name} ${item.category} ${item.detail}`).includes(
          word,
        ),
      ),
  );
}
export function equipmentDetails(item) {
  return `${item.category} · Weight: ${item.weight} · Cost: ${item.cost}\n${item.detail}`;
}
export function addEquipment(c, key, quantity, equipped, id = newId()) {
  const entry = equipmentCatalog.find((item) => item.key === key);
  if (!entry) throw new Error("Choose equipment from the catalog.");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 9999)
    throw new Error("Quantity must be a whole number from 1 to 9999.");
  if (typeof equipped !== "boolean")
    throw new Error("Choose whether the item is equipped.");
  let next;
  if (entry.weaponKey) {
    if ((c.weapons || []).length >= 200)
      throw new Error("Your armory already has 200 entries.");
    const template = weaponCatalog.find((w) => w.key === entry.weaponKey);
    next = {
      ...c,
      weapons: [
        ...(c.weapons || []),
        { ...makeWeapon(template, id), quantity, equipped },
      ],
    };
  } else {
    if (c.inventory.length >= 200)
      throw new Error("Your equipment list already has 200 entries.");
    next = {
      ...c,
      inventory: [
        ...c.inventory,
        {
          id,
          catalogKey: entry.key,
          name: entry.name,
          detail: equipmentDetails(entry),
          quantity,
          equipped,
        },
      ],
    };
  }
  const error = weaponChangeError(next, c);
  if (error) throw new Error(error);
  return next;
}
