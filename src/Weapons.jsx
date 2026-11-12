import React, { useId, useState } from "react";
import { Plus, Sword, Trash2, ChevronRight } from "lucide-react";
import {
  weaponCatalog,
  weaponProperties,
  masteryDescriptions,
  makeWeapon,
  weaponDescription,
} from "../shared/weapon-catalog.mjs";
import {
  weaponProficient,
  weaponStats,
  weaponSummary,
  weaponMasteryLimit,
  weaponChangeError,
  weaponKey,
  weaponModes,
  weaponAttackError,
  validateWeapon,
} from "../shared/weapons.mjs";
import WeaponAttribution from "./WeaponAttribution.jsx";

const signed = (n) => (n >= 0 ? `+${n}` : String(n));
const groups = [
  "Simple Melee",
  "Simple Ranged",
  "Martial Melee",
  "Martial Ranged",
];
const blank = () => ({
  key: "",
  name: "",
  category: "Simple",
  kind: "Melee",
  damageDice: "1d6",
  damageType: "Slashing",
  properties: [],
  mastery: "",
  versatileDice: "",
  range: "",
  ammunition: "",
  weight: "",
  cost: "",
});

function Field({ label, children, ...props }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children ? (
        React.cloneElement(children, { id })
      ) : (
        <input id={id} {...props} />
      )}
    </div>
  );
}
function NumberField({ label, value, onChange, min = 0, max = 9999 }) {
  return (
    <Field label={label}>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) =>
          onChange(
            Math.max(min, Math.min(max, Math.trunc(Number(e.target.value)))),
          )
        }
      />
    </Field>
  );
}
function WeaponDefinition({ weapon: w, onChange }) {
  return (
    <>
      <div className="form-grid">
        <Field
          label="Weapon name"
          value={w.name}
          maxLength={200}
          required
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <Field label="Weapon category">
          <select
            value={w.category}
            onChange={(e) => onChange({ category: e.target.value })}
          >
            <option>Simple</option>
            <option>Martial</option>
          </select>
        </Field>
        <Field label="Weapon type">
          <select
            value={w.kind}
            onChange={(e) => onChange({ kind: e.target.value })}
          >
            <option>Melee</option>
            <option>Ranged</option>
          </select>
        </Field>
        <Field
          label="Damage dice"
          value={w.damageDice}
          maxLength={20}
          onChange={(e) => onChange({ damageDice: e.target.value })}
        />
        <Field
          label="Damage type"
          value={w.damageType}
          maxLength={50}
          onChange={(e) => onChange({ damageType: e.target.value })}
        />
        <Field
          label="Two-handed damage (optional)"
          value={w.versatileDice}
          maxLength={20}
          onChange={(e) => onChange({ versatileDice: e.target.value })}
        />
        <Field label="Mastery property">
          <select
            value={w.mastery}
            onChange={(e) => onChange({ mastery: e.target.value })}
          >
            <option value="">None</option>
            {Object.keys(masteryDescriptions).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field
          label="Range (normal/long, feet)"
          value={w.range}
          maxLength={200}
          onChange={(e) => onChange({ range: e.target.value })}
        />
        <Field
          label="Ammunition type"
          value={w.ammunition}
          maxLength={200}
          onChange={(e) => onChange({ ammunition: e.target.value })}
        />
        <Field
          label="Weight"
          value={w.weight}
          maxLength={200}
          onChange={(e) => onChange({ weight: e.target.value })}
        />
        <Field
          label="Cost"
          value={w.cost}
          maxLength={200}
          onChange={(e) => onChange({ cost: e.target.value })}
        />
      </div>
      <fieldset className="weapon-properties">
        <legend>Weapon properties</legend>
        {weaponProperties.map((p) => (
          <label key={p}>
            <input
              type="checkbox"
              checked={w.properties.includes(p)}
              onChange={(e) =>
                onChange({
                  properties: e.target.checked
                    ? [...w.properties, p]
                    : w.properties.filter((s) => s !== p),
                })
              }
            />
            {p}
          </label>
        ))}
      </fieldset>
    </>
  );
}

function WeaponPicker({ character: c, onChange }) {
  const [custom, setCustom] = useState(false),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("All categories"),
    [onlyProficient, setOnlyProficient] = useState(true),
    [selected, setSelected] = useState(""),
    [draft, setDraft] = useState(blank),
    [description, setDescription] = useState(null),
    [quantity, setQuantity] = useState(1),
    [ammo, setAmmo] = useState(0),
    [equip, setEquip] = useState(false),
    [mastered, setMastered] = useState(false);
  const options = weaponCatalog.filter(
    (w) =>
      (!query || w.name.toLowerCase().includes(query.toLowerCase().trim())) &&
      (category === "All categories" ||
        `${w.category} ${w.kind}` === category) &&
      (!onlyProficient || weaponProficient(c, w)),
  );
  const template = custom ? draft : options.find((w) => w.key === selected);
  const candidate = template
    ? {
        ...makeWeapon(template, "candidate"),
        detail: description ?? weaponDescription(template),
        quantity,
        ammunitionCount: ammo,
        equipped: equip,
        mastered:
          mastered ||
          (c.weapons || []).some(
            (w) => w.mastered && weaponKey(w) === template.key,
          ),
      }
    : null;
  const limitError = candidate
    ? weaponChangeError({ ...c, weapons: [...(c.weapons || []), candidate] }, c)
    : "";
  const invalid = candidate && !validateWeapon(candidate);
  function add(e) {
    e.preventDefault();
    if (!candidate || invalid || limitError || (c.weapons || []).length >= 200)
      return;
    onChange([...(c.weapons || []), { ...candidate, id: crypto.randomUUID() }]);
    setSelected("");
    setDraft(blank());
    setDescription(null);
    setEquip(false);
    setMastered(false);
    setQuantity(1);
    setAmmo(0);
  }
  return (
    <section className="panel">
      <div className="panel-title">
        <h3>Add a weapon</h3>
        <Sword size={17} />
      </div>
      <div className="segmented spell-modes">
        <button
          type="button"
          className={!custom ? "active" : ""}
          aria-pressed={!custom}
          onClick={() => {
            setCustom(false);
            setDescription(null);
          }}
        >
          Choose a weapon
        </button>
        <button
          type="button"
          className={custom ? "active" : ""}
          aria-pressed={custom}
          onClick={() => {
            setCustom(true);
            setDescription(null);
          }}
        >
          Custom weapon
        </button>
      </div>
      <form className="add-record" onSubmit={add}>
        {custom ? (
          <WeaponDefinition
            weapon={draft}
            onChange={(patch) =>
              setDraft((previous) => ({ ...previous, ...patch }))
            }
          />
        ) : (
          <>
            <div className="form-grid">
              <Field
                label="Search weapons"
                value={query}
                placeholder="Search by weapon name…"
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelected("");
                  setDescription(null);
                }}
              />
              <Field label="Filter weapon category">
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setSelected("");
                    setDescription(null);
                  }}
                >
                  <option>All categories</option>
                  {groups.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </Field>
            </div>
            <label className="slot-override">
              <input
                type="checkbox"
                checked={onlyProficient}
                onChange={(e) => {
                  setOnlyProficient(e.target.checked);
                  setSelected("");
                  setDescription(null);
                }}
              />
              Proficient weapons for my class only
            </label>
            <p className="helper">
              {c.class} base-class proficiencies. You can wield an untrained
              weapon; it does not add proficiency to attacks. Use all weapons
              and a per-weapon override for feature grants.
            </p>
            <Field label="Available weapon">
              <select
                value={selected}
                required
                onChange={(e) => {
                  setSelected(e.target.value);
                  setDescription(null);
                }}
              >
                <option value="">
                  {options.length
                    ? `Choose from ${options.length} weapons…`
                    : "No weapons match these filters"}
                </option>
                {groups.map((group) => (
                  <optgroup label={group} key={group}>
                    {options
                      .filter((w) => `${w.category} ${w.kind}` === group)
                      .map((w) => (
                        <option key={w.key} value={w.key}>
                          {w.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </Field>
          </>
        )}
        {candidate && (
          <>
            <Field label="Weapon description">
              <textarea
                rows={7}
                value={candidate.detail}
                maxLength={20000}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            <div className="form-grid">
              <NumberField
                label="Weapon quantity"
                value={quantity}
                min={1}
                onChange={setQuantity}
              />
              {candidate.properties.includes("Ammunition") && (
                <NumberField
                  label="Starting ammunition"
                  value={ammo}
                  onChange={setAmmo}
                />
              )}
            </div>
            <div className="weapon-toggle-row">
              <label>
                <input
                  type="checkbox"
                  checked={equip}
                  onChange={(e) => setEquip(e.target.checked)}
                />
                Equip when added
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={mastered}
                  onChange={(e) => setMastered(e.target.checked)}
                />
                Select mastery when added
              </label>
            </div>
          </>
        )}
        {limitError && (
          <p className="error" role="alert">
            {limitError}
          </p>
        )}
        {invalid && (
          <p className="helper" role="status">
            Enter a name and valid damage (such as 1d8, 2d6, or fixed 1). Dice
            support up to 20d100.
          </p>
        )}
        <button
          className="secondary small"
          disabled={
            !candidate ||
            invalid ||
            !!limitError ||
            (c.weapons || []).length >= 200
          }
        >
          <Plus size={14} /> Add weapon
        </button>
      </form>
      <p className="helper weapon-note">
        38 weapons from the 2024 SRD. Multiple copies are allowed. Weapon
        quantities and ammunition live here, separately from general Inventory.
      </p>
      <details className="spell-credits">
        <summary>Weapon source & license</summary>
        <WeaponAttribution />
      </details>
    </section>
  );
}

function WeaponEditor({ character: c, weapon: w, onChange, onRemove }) {
  const stats = weaponStats(c, w),
    isMastered = (c.weapons || []).some(
      (other) => other.mastered && weaponKey(other) === weaponKey(w),
    );
  return (
    <article className="weapon-item" aria-label={`Weapon ${w.name}`}>
      <div className="weapon-item-heading">
        <div>
          <h4>{w.name}</h4>
          <p>
            {signed(stats.attackBonus)} to hit · {stats.damageDice}
            {signed(stats.damageBonus)} {w.damageType} ·{" "}
            {stats.proficient ? "Proficient" : "Not proficient"}
          </p>
        </div>
        <button
          className="icon-button danger"
          aria-label={`Remove weapon ${w.name}`}
          onClick={onRemove}
        >
          <Trash2 size={15} />
        </button>
      </div>
      <div className="weapon-toggle-row">
        <label>
          <input
            type="checkbox"
            checked={w.equipped}
            disabled={!w.equipped && !w.quantity}
            onChange={(e) => onChange({ equipped: e.target.checked })}
          />
          Equipped
        </label>
        <label>
          <input
            type="checkbox"
            checked={isMastered}
            onChange={(e) => onChange({ mastered: e.target.checked })}
          />
          Mastery selected
        </label>
        <span className="pill">{w.mastery || "No mastery"}</span>
      </div>
      <div className="form-grid weapon-stock">
        <NumberField
          label={`Quantity for ${w.name}`}
          value={w.quantity}
          onChange={(quantity) => onChange({ quantity })}
        />
        {w.properties.includes("Ammunition") && (
          <NumberField
            label={`Ammunition for ${w.name}`}
            value={w.ammunitionCount}
            onChange={(ammunitionCount) => onChange({ ammunitionCount })}
          />
        )}
      </div>
      <details>
        <summary>Edit weapon, bonuses & resources</summary>
        <div className="weapon-edit">
          <WeaponDefinition weapon={w} onChange={onChange} />
          <div className="form-grid">
            <Field label="Attack ability">
              <select
                value={w.ability}
                onChange={(e) => onChange({ ability: e.target.value })}
              >
                <option value="auto">Automatic (STR / DEX)</option>
                {[
                  "Strength",
                  "Dexterity",
                  "Constitution",
                  "Intelligence",
                  "Wisdom",
                  "Charisma",
                ].map((s, i) => (
                  <option key={s} value={i}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Weapon proficiency">
              <select
                value={w.proficiency}
                onChange={(e) => onChange({ proficiency: e.target.value })}
              >
                <option value="auto">Automatic from class</option>
                <option value="yes">Proficient (override)</option>
                <option value="no">Not proficient (override)</option>
              </select>
            </Field>
            <Field label="Equipped grip">
              <select
                value={w.grip}
                onChange={(e) => onChange({ grip: Number(e.target.value) })}
              >
                <option value={1}>One hand</option>
                <option value={2}>Two hands</option>
              </select>
            </Field>
            <NumberField
              label="Magic bonus (attack & damage)"
              min={-10}
              max={10}
              value={w.magicBonus}
              onChange={(magicBonus) => onChange({ magicBonus })}
            />
            <NumberField
              label="Additional attack bonus"
              min={-20}
              max={20}
              value={w.attackAdjustment}
              onChange={(attackAdjustment) => onChange({ attackAdjustment })}
            />
            <NumberField
              label="Additional damage bonus"
              min={-20}
              max={20}
              value={w.damageAdjustment}
              onChange={(damageAdjustment) => onChange({ damageAdjustment })}
            />
          </div>
          <label className="slot-override">
            <input
              type="checkbox"
              checked={w.limitedUses}
              onChange={(e) => onChange({ limitedUses: e.target.checked })}
            />
            Track limited weapon uses
          </label>
          {w.limitedUses && (
            <div className="form-grid weapon-edit">
              <NumberField
                label="Maximum weapon uses"
                min={1}
                max={999}
                value={w.usesMax}
                onChange={(usesMax) =>
                  onChange({ usesMax, usesUsed: Math.min(w.usesUsed, usesMax) })
                }
              />
              <NumberField
                label="Expended weapon uses"
                max={w.usesMax}
                value={w.usesUsed}
                onChange={(usesUsed) => onChange({ usesUsed })}
              />
            </div>
          )}
          <Field label="Weapon notes & description">
            <textarea
              rows={6}
              maxLength={20000}
              value={w.detail}
              onChange={(e) => onChange({ detail: e.target.value })}
            />
          </Field>
        </div>
      </details>
    </article>
  );
}

export default function Weapons({ character: c, onChange }) {
  const summary = weaponSummary(c),
    weapons = c.weapons || [];
  function update(id, patch) {
    const original = weapons.find((w) => w.id === id);
    onChange({
      weapons: weapons.map((w) =>
        w.id === id
          ? { ...w, ...patch }
          : patch.mastered !== undefined && weaponKey(w) === weaponKey(original)
            ? { ...w, mastered: patch.mastered }
            : w,
      ),
    });
  }
  return (
    <>
      <section className="panel">
        <div className="panel-title">
          <h3>Your armory</h3>
          <Sword size={18} />
        </div>
        <div className="preparation-counts" aria-label="Weapon counters">
          <div>
            <strong>{summary.owned}</strong>
            <span>Weapons owned · {summary.equipped} equipped</span>
          </div>
          <div>
            <strong>
              {summary.hands} / {summary.handLimit}
            </strong>
            <span>Hands occupied</span>
          </div>
          <div>
            <strong>
              {summary.mastered} / {summary.masteryLimit}
            </strong>
            <span>Weapon kinds mastered</span>
          </div>
        </div>
        {(summary.hands > summary.handLimit ||
          summary.mastered > summary.masteryLimit) && (
          <p className="error" role="alert">
            Your current hand or mastery selections exceed their limits.
            Existing selections were kept; reduce them or adjust the override.
          </p>
        )}
        <div className="weapon-toggle-row">
          <label>
            <input
              type="checkbox"
              checked={!!c.shieldEquipped}
              onChange={(e) => onChange({ shieldEquipped: e.target.checked })}
            />
            Reserve one hand for a shield
          </label>
          <label>
            <input
              type="checkbox"
              checked={!!c.weaponLimitOverride}
              onChange={(e) =>
                onChange({
                  weaponLimitOverride: e.target.checked,
                  ...(e.target.checked
                    ? {
                        weaponHandLimit: 2,
                        weaponMasteryLimit: weaponMasteryLimit({
                          ...c,
                          weaponLimitOverride: false,
                        }),
                      }
                    : {}),
                })
              }
            />
            Manual weapon limits
          </label>
        </div>
        {c.weaponLimitOverride && (
          <div className="form-grid weapon-edit">
            <NumberField
              label="Available weapon hands"
              max={20}
              value={c.weaponHandLimit}
              onChange={(weaponHandLimit) => onChange({ weaponHandLimit })}
            />
            <NumberField
              label="Weapon mastery limit"
              max={200}
              value={c.weaponMasteryLimit}
              onChange={(weaponMasteryLimit) =>
                onChange({ weaponMasteryLimit })
              }
            />
          </div>
        )}
        <p className="helper weapon-note">
          Mastery limits follow class and level; mastery is selected by weapon
          kind and shared by duplicate copies. Proficiency grants and subclass
          exceptions can be overridden. Shield reservation affects hand
          tracking; update armor class manually.
        </p>
      </section>
      <section className="panel">
        <div className="panel-title">
          <h3>Weapon library</h3>
          <span className="count">{weapons.length}</span>
        </div>
        {!weapons.length && (
          <p className="empty-inline">
            Choose your first weapon below, then equip it to attack from
            Overview.
          </p>
        )}
        {groups.map((group) => {
          const matching = weapons.filter(
            (w) => `${w.category} ${w.kind}` === group,
          );
          return matching.length ? (
            <section
              key={group}
              className="spell-level-group"
              aria-label={group}
            >
              <div className="spell-level-heading">
                <h4>{group} weapons</h4>
                <span className="count">{matching.length}</span>
              </div>
              {matching.map((w) => (
                <WeaponEditor
                  key={w.id}
                  character={c}
                  weapon={w}
                  onChange={(patch) => update(w.id, patch)}
                  onRemove={() =>
                    onChange({
                      weapons: weapons.filter((item) => item.id !== w.id),
                    })
                  }
                />
              ))}
            </section>
          ) : null;
        })}
      </section>
      <WeaponPicker
        character={c}
        onChange={(weapons) => onChange({ weapons })}
      />
    </>
  );
}

export function OverviewWeapons({ character: c, onManage, onAttack, message }) {
  const [rollMode, setRollMode] = useState("normal");
  const equipped = (c.weapons || []).filter((w) => w.equipped);
  return (
    <section className="panel" aria-label="Equipped weapons overview">
      <div className="panel-title">
        <h3>Equipped weapons</h3>
        <Sword size={17} />
      </div>
      <div className="overview-spell-summary">
        <span>{equipped.length} equipped</span>
        <button className="text-button" onClick={onManage}>
          Manage weapons <ChevronRight size={13} />
        </button>
      </div>
      {message && (
        <p className="cast-feedback" aria-live="polite">
          {message}
        </p>
      )}
      <Field label="Weapon attack roll">
        <select value={rollMode} onChange={(e) => setRollMode(e.target.value)}>
          <option value="normal">Normal roll</option>
          <option value="advantage">Advantage</option>
          <option value="disadvantage">Disadvantage</option>
        </select>
      </Field>
      {!equipped.length && (
        <p className="empty-inline">
          No weapons equipped. Choose and equip weapons in the Weapons tab.
        </p>
      )}
      {equipped.map((w) => {
        const stats = weaponStats(c, w),
          mastered = (c.weapons || []).some(
            (other) => other.mastered && weaponKey(other) === weaponKey(w),
          );
        return (
          <article
            className="weapon-item"
            key={w.id}
            aria-label={`Equipped ${w.name}`}
          >
            <h4>{w.name}</h4>
            <p className="helper">
              {signed(stats.attackBonus)} to hit · {w.damageDice}
              {signed(stats.damageBonus)} {w.damageType} · {w.quantity} owned
              {w.properties.includes("Ammunition")
                ? ` · ${w.ammunitionCount} ${w.ammunition || "ammunition"} remaining`
                : ""}
              {w.limitedUses
                ? ` · ${w.usesMax - w.usesUsed} / ${w.usesMax} uses`
                : ""}
            </p>
            <details>
              <summary>Properties & mastery</summary>
              <p className="weapon-description">{w.detail}</p>
              {w.mastery && (
                <p className="helper">
                  {mastered ? "Mastery selected" : "Mastery not selected"}:{" "}
                  {w.mastery}.{" "}
                  {mastered
                    ? masteryDescriptions[w.mastery]
                    : "Select this weapon kind in Weapons to use its mastery."}
                  {mastered && w.mastery === "Topple"
                    ? ` Save DC ${stats.masteryDC}.`
                    : ""}
                </p>
              )}
            </details>
            <div className="overview-cast-controls weapon-attack-buttons">
              {weaponModes(w).map((mode) => {
                const error = weaponAttackError(c, w, mode.key);
                const modeStats = weaponStats(c, w, mode.key === "two-handed");
                return (
                  <button
                    key={mode.key}
                    type="button"
                    className="primary small"
                    aria-label={`Attack with ${w.name} (${mode.label})`}
                    disabled={!!error}
                    title={
                      error ||
                      `${modeStats.damageDice}${signed(modeStats.damageBonus)} ${w.damageType} if hit`
                    }
                    onClick={() => onAttack(w.id, mode.key, rollMode)}
                  >
                    {mode.label} · Attack
                  </button>
                );
              })}
            </div>
          </article>
        );
      })}
      <p className="helper weapon-note">
        Each attack rolls a d20 and damage if it hits; the target’s AC, effects,
        turn limits, and mastery outcomes remain player-managed. Ammunition,
        thrown copies, and limited uses are spent even on a miss. Save character
        to keep resource changes.
      </p>
    </section>
  );
}
