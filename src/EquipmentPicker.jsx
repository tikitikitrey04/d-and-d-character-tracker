import { weaponChangeError } from "../shared/weapons.mjs";
import React, { useId, useState } from "react";
import NumberInput from "./NumberInput.jsx";
import EquipmentAttribution from "./EquipmentAttribution.jsx";
import {
  findEquipment,
  equipmentCategories,
  equipmentCatalog,
  equipmentDetails,
  equipmentServices,
  addEquipment,
} from "../shared/equipment.mjs";
import { newId } from "../shared/id.mjs";

export default function EquipmentPicker({ character: c, onChange }) {
  const id = useId();
  const [mode, setMode] = useState("catalog");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedKey, setSelectedKey] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [equipped, setEquipped] = useState(false);
  const [name, setName] = useState("");
  const [detail, setDetail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const options = findEquipment({ search, category });
  const selected = options.find((item) => item.key === selectedKey);
  function submit(event) {
    event.preventDefault();
    try {
      let next;
      if (mode === "catalog")
        next = addEquipment(c, selectedKey, quantity, equipped);
      else {
        if (!name.trim()) throw new Error("Enter an item name.");
        if (c.inventory.length >= 200)
          throw new Error("Your equipment list already has 200 entries.");
        next = {
          ...c,
          inventory: [
            ...c.inventory,
            { id: newId(), name: name.trim(), detail, quantity, equipped },
          ],
        };
      }
      const changeError = weaponChangeError(next, c);
      if (changeError) throw new Error(changeError);
      onChange({ inventory: next.inventory, weapons: next.weapons || [] });
      setMessage(
        `${mode === "catalog" ? selected.name : name.trim()} added to ${selected?.weaponKey && mode === "catalog" ? "Weapons" : "Equipment"}.`,
      );
      setError("");
      setSelectedKey("");
      setQuantity(1);
      setEquipped(false);
      setName("");
      setDetail("");
    } catch (error) {
      setError(error.message);
      setMessage("");
    }
  }
  return (
    <div className="equipment-picker">
      <div
        className="segmented spell-modes"
        aria-label="Equipment entry method"
      >
        <button
          type="button"
          aria-pressed={mode === "catalog"}
          className={mode === "catalog" ? "active" : ""}
          onClick={() => {
            setMode("catalog");
            setError("");
          }}
        >
          2024 equipment catalog
        </button>
        <button
          type="button"
          aria-pressed={mode === "custom"}
          className={mode === "custom" ? "active" : ""}
          onClick={() => {
            setMode("custom");
            setError("");
          }}
        >
          Custom item
        </button>
      </div>
      <p className="helper">
        {equipmentCatalog.length} standard equipment choices from the 2024 SRD.
        Add items you own or receive; listed prices are a reference and do not
        spend gold. Weapons go into the armory. Ammunition quantities refer to
        bundles; load weapon ammunition separately in Weapons.
      </p>
      <form onSubmit={submit}>
        {mode === "catalog" ? (
          <>
            <div className="form-grid">
              <div className="field">
                <label htmlFor={`${id}-search`}>Search equipment</label>
                <input
                  id={`${id}-search`}
                  type="search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSelectedKey("");
                  }}
                  placeholder="Armor, rope, supplies, vehicles…"
                />
              </div>
              <div className="field">
                <label htmlFor={`${id}-category`}>Equipment category</label>
                <select
                  id={`${id}-category`}
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setSelectedKey("");
                  }}
                >
                  <option value="all">All categories</option>
                  {equipmentCategories.map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor={`${id}-item`}>
                Choose equipment ({options.length})
              </label>
              <select
                id={`${id}-item`}
                value={selected?.key || ""}
                onChange={(e) => {
                  setSelectedKey(e.target.value);
                  setError("");
                }}
              >
                <option value="">Select an item</option>
                {options.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.name} · {item.cost} · {item.weight}
                  </option>
                ))}
              </select>
            </div>
            {!options.length && (
              <p role="status" className="helper">
                No equipment matches. Try another search or category.
              </p>
            )}
            {selected && (
              <section
                className="equipment-preview"
                aria-label="Equipment details"
              >
                <h4>{selected.name}</h4>
                <p>{equipmentDetails(selected)}</p>
              </section>
            )}
          </>
        ) : (
          <>
            <div className="field">
              <label htmlFor={`${id}-name`}>Name</label>
              <input
                id={`${id}-name`}
                value={name}
                maxLength={200}
                required
                pattern=".*\S.*"
                onChange={(e) => setName(e.target.value)}
                placeholder="Name your item"
              />
            </div>
            <div className="field">
              <label htmlFor={`${id}-detail`}>Details</label>
              <textarea
                id={`${id}-detail`}
                value={detail}
                maxLength={2000}
                rows={4}
                onChange={(e) => setDetail(e.target.value)}
              />
            </div>
          </>
        )}
        <div className="form-grid">
          <div className="field">
            <label htmlFor={`${id}-quantity`}>Equipment quantity</label>
            <NumberInput
              id={`${id}-quantity`}
              min={1}
              max={9999}
              value={quantity}
              onChange={(e) =>
                setQuantity(
                  Math.max(
                    1,
                    Math.min(9999, Math.trunc(Number(e.target.value))),
                  ),
                )
              }
            />
          </div>
        </div>
        <label className="slot-override">
          <input
            type="checkbox"
            checked={equipped}
            onChange={(e) => setEquipped(e.target.checked)}
          />
          Equip when added
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="helper" role="status">
            {message}
          </p>
        )}
        <button
          type="submit"
          className="secondary small"
          disabled={mode === "catalog" ? !selected : !name.trim()}
        >
          Add item
        </button>
      </form>
      <details className="spell-credits">
        <summary>Service prices</summary>
        <p className="helper">
          Services are paid expenses rather than inventory items. Record
          payments manually.
        </p>
        <div className="equipment-service-list">
          {equipmentServices.map((service) => (
            <p key={service.name}>
              <strong>{service.name}:</strong> {service.cost}
              {service.detail ? ` · ${service.detail}` : ""}
            </p>
          ))}
        </div>
      </details>
      <details className="spell-credits">
        <summary>Equipment sources & license</summary>
        <EquipmentAttribution />
      </details>
    </div>
  );
}
