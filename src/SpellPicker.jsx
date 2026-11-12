import React, { useId, useState } from "react";
import { Plus } from "lucide-react";
import catalog from "./data/spells-2024.json";
import {
  availableSpells,
  spellAccess,
  spellDetails,
} from "../shared/spells.mjs";
import SpellAttribution from "./SpellAttribution.jsx";
import { preparationIncreaseError } from "../shared/preparation.mjs";

export default function SpellPicker({ character, items, onChange }) {
  const id = useId();
  const [mode, setMode] = useState("catalog");
  const [specialAccess, setSpecialAccess] = useState(false);
  const [level, setLevel] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [detail, setDetail] = useState("");
  const [customName, setCustomName] = useState("");
  const [customLevel, setCustomLevel] = useState(0);
  const [customDetail, setCustomDetail] = useState("");
  const [source, setSource] = useState("class");
  const [prepareNow, setPrepareNow] = useState(false);
  const access = spellAccess(character);
  const options = availableSpells(catalog.spells, character, {
    specialAccess,
    level,
    search,
  });
  const selected = options.find((s) => s.key === selectedKey);
  const duplicate = (name) =>
    items.some(
      (s) => s.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );
  const name = mode === "custom" ? customName.trim() : selected?.name;
  const isDuplicate = name && duplicate(name);
  const spellLevel = mode === "custom" ? customLevel : selected?.level;
  const effectiveSource =
    source === "granted"
      ? "granted"
      : source === "arcanum" ||
          (character.class === "Warlock" && spellLevel >= 6)
        ? "arcanum"
        : "class";
  const candidate = name
    ? {
        id: "new-spell",
        name,
        level: spellLevel,
        detail: mode === "custom" ? customDetail : detail,
        prepared: spellLevel === 0 || effectiveSource !== "class" || prepareNow,
        preparationSource: effectiveSource,
      }
    : null;
  const limitError = candidate
    ? preparationIncreaseError(
        { ...character, spells: [...items, candidate] },
        character,
      )
    : "";
  const maxLevel = specialAccess ? 9 : access.maxLevel;
  const levels = Array.from({ length: maxLevel + 1 }, (_, i) => i).filter(
    (i) => specialAccess || i > 0 || access.cantrips,
  );
  function resetSelection() {
    setSelectedKey("");
    setDetail("");
  }
  function add(e) {
    e.preventDefault();
    if (
      !name ||
      isDuplicate ||
      items.length >= 200 ||
      limitError ||
      (mode === "catalog" && !selected)
    )
      return;
    onChange([...items, { ...candidate, id: crypto.randomUUID() }]);
    resetSelection();
    setCustomName("");
    setCustomDetail("");
  }

  return (
    <div className="spell-picker">
      <div className="segmented spell-modes" aria-label="Spell entry method">
        <button
          type="button"
          className={mode === "catalog" ? "active" : ""}
          aria-pressed={mode === "catalog"}
          onClick={() => setMode("catalog")}
        >
          Choose a spell
        </button>
        <button
          type="button"
          className={mode === "custom" ? "active" : ""}
          aria-pressed={mode === "custom"}
          onClick={() => setMode("custom")}
        >
          Custom spell
        </button>
      </div>
      <form className="add-record" onSubmit={add}>
        {mode === "catalog" ? (
          <>
            <p className="spell-access-summary">
              <strong>
                {character.class} · Level {character.level}
              </strong>
              {specialAccess
                ? "Showing every SRD spell level and class list."
                : access.lists.length
                  ? `Spell levels ${access.cantrips ? "0" : "1"}–${access.maxLevel} · ${access.lists.join(", ")}`
                  : "Your current class has no standard spell list. Use special access for spells from a feat, species, or other feature."}
            </p>
            <div className="form-grid">
              <div className="field">
                <label htmlFor={`${id}-access`}>Spell access</label>
                <select
                  id={`${id}-access`}
                  value={specialAccess ? "special" : "class"}
                  onChange={(e) => {
                    setSpecialAccess(e.target.value === "special");
                    setLevel("all");
                    resetSelection();
                  }}
                >
                  <option value="class">My class & character level</option>
                  <option value="special">All spells (special access)</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor={`${id}-level`}>Spell level</label>
                <select
                  id={`${id}-level`}
                  value={level}
                  onChange={(e) => {
                    setLevel(e.target.value);
                    resetSelection();
                  }}
                >
                  <option value="all">All available levels</option>
                  {levels.map((n) => (
                    <option key={n} value={n}>
                      {n === 0 ? "Cantrip" : `Level ${n}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor={`${id}-search`}>Search spells</label>
              <input
                id={`${id}-search`}
                placeholder="Search by spell name…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  resetSelection();
                }}
              />
            </div>
            <div className="field">
              <label htmlFor={`${id}-spell`}>Available spell</label>
              <select
                id={`${id}-spell`}
                value={selected?.key || ""}
                required
                onChange={(e) => {
                  const spell = options.find((s) => s.key === e.target.value);
                  setSelectedKey(e.target.value);
                  setDetail(spell ? spellDetails(spell) : "");
                }}
              >
                <option value="">
                  {options.length
                    ? `Choose from ${options.length} spells…`
                    : "No spells match these filters"}
                </option>
                {levels.map((n) => {
                  const group = options.filter((s) => s.level === n);
                  return group.length ? (
                    <optgroup
                      key={n}
                      label={n === 0 ? "Cantrips" : `Level ${n}`}
                    >
                      {group.map((s) => (
                        <option
                          key={s.key}
                          value={s.key}
                          disabled={duplicate(s.name)}
                        >
                          {s.name}
                          {duplicate(s.name) ? " (already added)" : ""}
                        </option>
                      ))}
                    </optgroup>
                  ) : null;
                })}
              </select>
            </div>
            {selected && (
              <div className="field">
                <label htmlFor={`${id}-detail`}>Spell description</label>
                <textarea
                  id={`${id}-detail`}
                  rows={10}
                  value={detail}
                  maxLength={20000}
                  onChange={(e) => setDetail(e.target.value)}
                />
                <small className="helper">
                  Filled from the 2024 SRD. You can adjust it for your table.
                </small>
              </div>
            )}
            {!options.length && (
              <p className="helper" role="status">
                Try clearing your search, changing spell level, or selecting
                special access.
              </p>
            )}
            {!specialAccess &&
              character.class === "Warlock" &&
              character.level >= 11 && (
                <p className="helper">
                  Level 6–9 choices use Mystic Arcanum, not Pact Magic slots.
                  Cast and restore their uses on Overview.
                </p>
              )}
            {!specialAccess &&
              character.class === "Bard" &&
              character.level >= 10 && (
                <p className="helper">
                  Magical Secrets adds Cleric, Druid, and Wizard choices for
                  level 1+ spells. Cantrips stay on the Bard list.
                </p>
              )}
          </>
        ) : (
          <>
            <div className="form-grid">
              <div className="field">
                <label htmlFor={`${id}-name`}>Spell name</label>
                <input
                  id={`${id}-name`}
                  value={customName}
                  required
                  pattern=".*\S.*"
                  maxLength={200}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Name your custom spell"
                />
              </div>
              <div className="field">
                <label htmlFor={`${id}-custom-level`}>Custom spell level</label>
                <input
                  id={`${id}-custom-level`}
                  type="number"
                  value={customLevel}
                  min={0}
                  max={9}
                  onChange={(e) =>
                    setCustomLevel(
                      Math.max(0, Math.min(9, Number(e.target.value))),
                    )
                  }
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor={`${id}-custom-detail`}>Spell description</label>
              <textarea
                id={`${id}-custom-detail`}
                rows={6}
                value={customDetail}
                maxLength={20000}
                onChange={(e) => setCustomDetail(e.target.value)}
                placeholder="Casting details, effects, and higher-level upgrades…"
              />
            </div>
          </>
        )}
        <div className="field">
          <label htmlFor={`${id}-source`}>Spell source</label>
          <select
            id={`${id}-source`}
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="class">
              Class choice
              {character.class === "Warlock" && spellLevel >= 6
                ? " (Mystic Arcanum)"
                : ""}
            </option>
            <option value="granted">Feature grant (extra allowance)</option>
            {spellLevel >= 6 && <option value="arcanum">Mystic Arcanum</option>}
          </select>
        </div>
        {effectiveSource === "class" && spellLevel > 0 && (
          <label className="slot-override prepare-on-add">
            <input
              type="checkbox"
              checked={prepareNow}
              onChange={(e) => setPrepareNow(e.target.checked)}
            />
            Prepare when added
          </label>
        )}
        {effectiveSource === "granted" && (
          <p className="helper">
            Only use this for a bonus cantrip or always-prepared spell granted
            by a feature. Record the feature in the description.
          </p>
        )}
        {limitError && (
          <p className="error" role="alert">
            {limitError}
          </p>
        )}
        {isDuplicate && (
          <p className="helper" role="status">
            This spell is already in your spellbook.
          </p>
        )}
        <button
          className="secondary small"
          disabled={!name || isDuplicate || items.length >= 200 || !!limitError}
        >
          <Plus size={14} /> Add spell
        </button>
        {items.length >= 200 && (
          <p className="helper">
            Your spellbook has reached its 200-spell limit.
          </p>
        )}
      </form>
      <p className="helper spell-catalog-note">
        339 spells from the 2024 SRD. Class preparation and cantrip limits are
        enforced; feature grants are marked by the player. Special access lets
        you select spells beyond the default class and level filters.
      </p>
      <details className="spell-credits">
        <summary>Spell sources & license</summary>
        <SpellAttribution />
      </details>
    </div>
  );
}
