import React, { useId, useState } from "react";
import { subclassNames, subclassSummary } from "../shared/subclasses.mjs";

export default function SubclassPicker({ character, onChange }) {
  const id = useId();
  const summary = subclassSummary(character);
  const [custom, setCustom] = useState(false);
  const isCustom = custom || (!!character.subclass && !summary.name);
  return (
    <div className="field subclass-picker">
      <label htmlFor={id}>Subclass</label>
      <select
        id={id}
        value={isCustom ? "custom" : summary.name || ""}
        aria-describedby={`${id}-help`}
        onChange={(event) => {
          const value = event.target.value;
          setCustom(value === "custom");
          onChange(value === "custom" ? character.subclass : value);
        }}
      >
        <option value="">
          {summary.unlocked
            ? "Choose a subclass (optional)"
            : "Choose at level 3"}
        </option>
        <optgroup label={`${character.class} · 2024 Player’s Handbook`}>
          {(subclassNames[character.class] || []).map((name) => (
            <option key={name} value={name} disabled={!summary.unlocked}>
              {name}
            </option>
          ))}
        </optgroup>
        <option value="custom">Custom / other source</option>
      </select>
      {isCustom && (
        <>
          <label htmlFor={`${id}-custom`}>Custom subclass name</label>
          <input
            id={`${id}-custom`}
            value={character.subclass}
            maxLength={200}
            placeholder="Enter a subclass from another source or homebrew"
            onChange={(event) => onChange(event.target.value)}
          />
        </>
      )}
      <div id={`${id}-help`} className="helper">
        {summary.warning && <p role="status">{summary.warning}</p>}
        {!summary.unlocked && !summary.warning && (
          <p>All 2024 classes choose a subclass at level 3.</p>
        )}
        {summary.name && (
          <>
            <p>2024 Player’s Handbook · {summary.name}</p>
            {summary.reached.length > 0 && (
              <p>
                Subclass feature levels reached: {summary.reached.join(", ")}.
              </p>
            )}
            <p>
              {summary.next
                ? `Next subclass features: level ${summary.next}.`
                : "All subclass feature levels reached."}
            </p>
          </>
        )}
        <p>
          Record subclass abilities in Features and resources, and add granted
          spells in Spells. Eldritch Knight and Arcane Trickster spellcasting
          updates automatically.
        </p>
        <a
          href="https://www.dndbeyond.com/posts/1810-updates-in-the-players-handbook-2024"
          target="_blank"
          rel="noreferrer"
        >
          2024 subclass reference ↗
        </a>
      </div>
    </div>
  );
}
