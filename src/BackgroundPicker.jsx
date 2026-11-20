import React, { useId, useState } from "react";
import {
  backgrounds,
  officialBackground,
  backgroundReference,
} from "../shared/backgrounds.mjs";

export default function BackgroundPicker({ value, onChange }) {
  const id = useId();
  const [custom, setCustom] = useState(false);
  const background = officialBackground(value);
  const isCustom = custom || (!!value && !background);
  return (
    <div className="field background-picker">
      <label htmlFor={id}>Background</label>
      <select
        id={id}
        value={isCustom ? "custom" : background?.name || ""}
        aria-describedby={`${id}-help`}
        onChange={(event) => {
          const next = event.target.value;
          setCustom(next === "custom");
          onChange(next === "custom" ? "" : next);
        }}
      >
        <option value="">Choose a background (optional)</option>
        <optgroup label="2024 Player’s Handbook">
          {backgrounds.map((entry) => (
            <option key={entry.name} value={entry.name}>
              {entry.name}
            </option>
          ))}
        </optgroup>
        <option value="custom">Custom / other source</option>
      </select>
      {isCustom && (
        <>
          <label htmlFor={`${id}-custom`}>Custom background name</label>
          <input
            id={`${id}-custom`}
            value={value}
            maxLength={200}
            placeholder="Enter a background from another source or homebrew"
            onChange={(event) => onChange(event.target.value)}
          />
        </>
      )}
      <div id={`${id}-help`} className="helper">
        {!isCustom && background && (
          <>
            <p>
              <strong>Ability options:</strong>{" "}
              {background.abilities.join(", ")}. Choose +2 to one and +1 to
              another, or +1 to all three; maximum 20.
            </p>
            <p>
              <strong>Origin feat:</strong> {background.feat}
            </p>
            <p>
              <strong>Skills:</strong> {background.skills.join(", ")}
            </p>
            <p>
              <strong>Tool:</strong> {background.tool}
            </p>
            <p>
              <strong>Starting equipment:</strong> Choose the background’s
              equipment package or 50 GP.
            </p>
            <a
              href={backgroundReference(background.name)}
              target="_blank"
              rel="noreferrer"
            >
              {background.name} · 2024 rules & equipment ↗
            </a>
          </>
        )}
        <p>
          Selecting a background records its name. Apply ability increases and
          skill proficiencies in Overview, record the origin feat and tool
          proficiency in Features, and add starting gear or gold in Inventory.
          For Alert, enable the trait under Inventory; add Magic Initiate spells
          as feature grants in Spells.
        </p>
      </div>
    </div>
  );
}
