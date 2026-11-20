import React, { useId } from "react";
import { officialBackground } from "../shared/backgrounds.mjs";
import {
  classStartingEquipment,
  backgroundStartingEquipment,
  startingEquipmentPlan,
} from "../shared/starting-equipment.mjs";

export default function StartingEquipmentPicker({
  character: c,
  selection,
  onChange,
}) {
  const id = useId();
  const background = officialBackground(c.background);
  const backgroundOptions = backgroundStartingEquipment[background?.name];
  let plan;
  try {
    plan = startingEquipmentPlan(c, selection);
  } catch (error) {
    return (
      <p className="error" role="alert">
        {error.message}
      </p>
    );
  }
  const options = (kits) =>
    Object.entries(kits).map(([key, kit]) => (
      <option key={key} value={key}>
        {key}: {kit.label}
        {kit.items.length ? ` + ${kit.gold} GP` : ""}
      </option>
    ));
  return (
    <div className="starting-equipment-picker">
      <div className="form-grid">
        <div className="field">
          <label htmlFor={`${id}-class`}>Class starting equipment</label>
          <select
            id={`${id}-class`}
            value={plan.classOption}
            onChange={(e) =>
              onChange({ ...selection, classOption: e.target.value })
            }
          >
            {options(classStartingEquipment[c.class])}
            <option value="none">Choose manually (no class kit)</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${id}-background`}>
            Background starting equipment
          </label>
          <select
            id={`${id}-background`}
            disabled={!backgroundOptions}
            value={plan.backgroundOption}
            onChange={(e) =>
              onChange({ ...selection, backgroundOption: e.target.value })
            }
          >
            {backgroundOptions && options(backgroundOptions)}
            <option value="none">
              {backgroundOptions
                ? "Choose manually (no background kit)"
                : "No preset for this background"}
            </option>
          </select>
        </div>
      </div>
      {plan.choices.map((choice) => (
        <div className="field" key={choice.id}>
          <label htmlFor={`${id}-${choice.id}`}>{choice.label}</label>
          <select
            id={`${id}-${choice.id}`}
            value={choice.selected}
            onChange={(e) =>
              onChange({
                ...selection,
                choices: { ...selection.choices, [choice.id]: e.target.value },
              })
            }
          >
            {choice.options.map((item) => (
              <option key={item.key} value={item.key}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      ))}
      <label className="slot-override">
        <input
          type="checkbox"
          checked={selection.equipArmor !== false}
          onChange={(e) =>
            onChange({ ...selection, equipArmor: e.target.checked })
          }
        />
        Equip included armor and shields
      </label>
      <section
        className="starting-kit-preview"
        aria-label="Starting kit preview"
      >
        <h4>Starting gold: {plan.gold} GP</h4>
        <p className="helper">
          Class: {plan.classGold} GP · Background: {plan.backgroundGold} GP
        </p>
        {plan.items.length ? (
          <ul>
            {plan.items.map((item) => (
              <li key={`${item.name}-${item.note || ""}`}>
                {item.quantity} × {item.label || item.name}
                {item.ammunitionCount
                  ? ` (${item.ammunitionCount} ${item.name.includes("Crossbow") ? "Bolts" : "Arrows"})`
                  : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="helper">No equipment items in these selections.</p>
        )}
      </section>
      <p className="helper">
        Weapons start stored in Weapons, ready to equip. Bow and crossbow
        ammunition is tracked on the weapon; packs remain bundled with their
        contents in the description. Kits add equipment and gold only; choose
        spells, proficiencies, ability increases, and feat effects on the sheet.
      </p>
      <p className="helper">
        Species: {c.species || "not specified"}. Core 2024 species grant traits
        rather than separate equipment kits. Add any gear from a custom species
        in Inventory.
      </p>
      {c.level > 1 && (
        <p className="helper">
          This is the normal level 1 kit. Add any higher-level starting wealth
          or magic items agreed with your DM separately.
        </p>
      )}
      <a
        className="helper"
        href="https://www.dndbeyond.com/sources/dnd/br-2024/creating-a-character#ChooseStartingEquipment"
        target="_blank"
        rel="noreferrer"
      >
        2024 starting equipment rules ↗
      </a>
    </div>
  );
}
