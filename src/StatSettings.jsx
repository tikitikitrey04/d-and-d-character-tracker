import React from "react";
import { characterStats } from "../shared/stats.mjs";

export default function StatSettings({ character: c, onChange }) {
  const stats = characterStats(c);
  const traits = c.statTraits || [];
  return (
    <section className="panel">
      <h3>Automatic stats & armor</h3>
      <p className="helper">
        Equip armor in the equipment list using its standard name (for example,
        Leather, Chain Mail, or Plate +1). Only equipped items with a quantity
        above zero count. Proficiency and expertise bonuses follow your level.
        Feature notes are not interpreted automatically.
      </p>
      <div className="form-grid">
        <label>
          Armor class mode
          <select
            value={c.acMode || "manual"}
            onChange={(e) => onChange({ acMode: e.target.value })}
          >
            <option value="auto">Automatic equipment & traits</option>
            <option value="manual">Manual AC</option>
          </select>
        </label>
        <label>
          AC adjustment (magic, traits, effects)
          <input
            type="number"
            min={-20}
            max={20}
            value={c.acAdjustment || 0}
            onChange={(e) =>
              onChange({
                acAdjustment: Math.max(
                  -20,
                  Math.min(20, Math.trunc(Number(e.target.value))),
                ),
              })
            }
          />
        </label>
        <label>
          Shield training
          <select
            value={c.shieldTraining == null ? "auto" : String(c.shieldTraining)}
            onChange={(e) =>
              onChange({
                shieldTraining:
                  e.target.value === "auto" ? null : e.target.value === "true",
              })
            }
          >
            <option value="auto">From class</option>
            <option value="true">Trained (feature or class)</option>
            <option value="false">Not trained</option>
          </select>
        </label>
      </div>
      {[
        ["defense", "Defense fighting style (+1 AC while armored)"],
        [
          "jackOfAllTrades",
          "Jack of All Trades (half proficiency on untrained skills)",
        ],
        ["alert", "Alert (2024: proficiency bonus to initiative)"],
      ].map(([key, label]) => (
        <label className="helper" key={key} style={{ display: "block" }}>
          <input
            type="checkbox"
            checked={traits.includes(key)}
            onChange={(e) =>
              onChange({
                statTraits: e.target.checked
                  ? [...traits, key]
                  : traits.filter((t) => t !== key),
              })
            }
          />{" "}
          {label}
        </label>
      ))}
      <p>
        Automatic AC: <strong>{stats.automaticAC}</strong> · {stats.acSource}
      </p>
      {stats.warnings.map((warning) => (
        <p className="helper" role="status" key={warning}>
          {warning}
        </p>
      ))}
    </section>
  );
}
