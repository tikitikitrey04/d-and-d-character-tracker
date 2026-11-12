import React, { useId } from "react";
import {
  automaticPreparationLimits,
  preparationSummary,
  preparationIncreaseError,
  spellSource,
  isSpellReady,
} from "../shared/preparation.mjs";

export function SpellCounters({ character: c }) {
  const { counts, limits } = preparationSummary(c);
  const bonusCantrips = c.spells.filter(
    (s) => s.level === 0 && spellSource(c, s) === "granted",
  ).length;
  function remaining(used, max) {
    return used > max
      ? `${used - max} over limit`
      : used === max && max > 0
        ? "At limit"
        : `${max - used} remaining`;
  }
  return (
    <div
      className="spellbook-counters"
      role="status"
      aria-label="Spellbook counters"
      aria-live="polite"
      aria-atomic="true"
    >
      {[
        ["Cantrips known", counts.cantrips, limits.cantrips],
        ["Spells prepared", counts.prepared, limits.prepared],
      ].map(([label, used, max]) => (
        <div key={label} className={used > max ? "counter-over" : ""}>
          <span>{label}</span>
          <strong>
            {used}
            <small> / {max}</small>
          </strong>
          <small>
            {remaining(used, max)}
            {label === "Cantrips known" && bonusCantrips > 0
              ? ` · +${bonusCantrips} bonus`
              : ""}
          </small>
        </div>
      ))}
      <div>
        <span>Spells in library</span>
        <strong>{c.spells.filter((s) => s.level > 0).length}</strong>
        <small>No preparation limit on stored spells</small>
      </div>
    </div>
  );
}

export function SpellStatus({ character: c, spell: s, onChange }) {
  const source = spellSource(c, s);
  const fixed = s.level === 0 || source !== "class";
  const error =
    !fixed && !s.prepared
      ? preparationIncreaseError(
          {
            ...c,
            spells: c.spells.map((item) =>
              item.id === s.id ? { ...s, prepared: true } : item,
            ),
          },
          c,
        )
      : "";
  return (
    <input
      type="checkbox"
      aria-label={`${s.level === 0 ? "Known" : source === "arcanum" ? "Mystic Arcanum" : source === "granted" ? "Always prepared" : "Prepare"} ${s.name}`}
      checked={!!isSpellReady(c, s)}
      disabled={fixed || !!error}
      title={
        fixed
          ? s.level === 0
            ? "Known cantrips are always available."
            : "This choice is always available and does not use the normal prepared-spell allowance."
          : error || "Mark this spell prepared"
      }
      onChange={(e) => onChange({ prepared: e.target.checked })}
    />
  );
}

export function SpellSource({ character: c, spell: s, onChange }) {
  const source = spellSource(c, s);
  return (
    <select
      className="spell-source-select"
      aria-label={`Preparation source for ${s.name}`}
      value={source}
      onChange={(e) =>
        onChange({
          preparationSource: e.target.value,
          ...(e.target.value !== "class" ? { prepared: true } : {}),
        })
      }
    >
      {!(c.class === "Warlock" && s.level >= 6) && (
        <option value="class">
          {s.level === 0 ? "Class cantrip" : "Class spell"}
        </option>
      )}
      <option value="granted">
        {s.level === 0
          ? "Bonus cantrip (feature)"
          : "Always prepared (feature)"}
      </option>
      {s.level >= 6 && <option value="arcanum">Mystic Arcanum</option>}
    </select>
  );
}

export default function SpellPreparation({ character: c, onChange }) {
  const id = useId();
  const summary = preparationSummary(c),
    automatic = automaticPreparationLimits(c);
  return (
    <section
      className="panel spell-preparation"
      aria-label="Spell preparation limits"
    >
      <div className="panel-title">
        <h3>Spell preparation</h3>
        <span className="pill">
          {c.spellLimitOverride ? "Manual limits" : "2024 class limits"}
        </span>
      </div>
      <div className="preparation-counts">
        <div>
          <strong>
            {summary.counts.cantrips} / {summary.limits.cantrips}
          </strong>
          <span>Class cantrips known</span>
        </div>
        <div>
          <strong>
            {summary.counts.prepared} / {summary.limits.prepared}
          </strong>
          <span>Prepared class spells</span>
        </div>
        <div>
          <strong>{summary.counts.granted}</strong>
          <span>Extra feature grants</span>
        </div>
      </div>
      <p className="helper">
        Prepared spell limits apply across all spell levels, separately from
        spell slots. Cantrips are known and always available. Adding an
        unprepared level 1+ spell to your library does not use a prepared
        choice.
      </p>
      {summary.issues.length > 0 && (
        <div className="error" role="alert">
          {summary.issues.map((b) => (
            <p key={b.key}>
              {b.label}: {b.used} / {b.limit}. Reduce these selections or adjust
              the manual limits. Existing spells have been kept.
            </p>
          ))}
        </div>
      )}
      {((c.class === "Warlock" && c.level >= 11) ||
        Object.values(summary.counts.arcanum).some(Boolean)) && (
        <div className="arcanum-counts">
          {summary.buckets
            .filter((b) => b.key.startsWith("arcanum") && (b.limit || b.used))
            .map((b) => (
              <span key={b.key}>
                {b.label}: {b.used} / {b.limit}
              </span>
            ))}
        </div>
      )}
      <label className="slot-override">
        <input
          type="checkbox"
          checked={!!c.spellLimitOverride}
          onChange={(e) =>
            onChange({
              spellLimitOverride: e.target.checked,
              ...(e.target.checked
                ? {
                    cantripLimit: automatic.cantrips,
                    preparedSpellLimit: automatic.prepared,
                  }
                : {}),
            })
          }
        />
        Manual preparation limits
      </label>
      {c.spellLimitOverride && (
        <div className="form-grid preparation-overrides">
          {[
            ["cantripLimit", "Cantrip limit"],
            ["preparedSpellLimit", "Prepared spell limit"],
          ].map(([key, label]) => (
            <div className="field" key={key}>
              <label htmlFor={`${id}-${key}`}>{label}</label>
              <input
                id={`${id}-${key}`}
                type="number"
                min={0}
                max={200}
                value={c[key]}
                onChange={(e) =>
                  onChange({
                    [key]: Math.max(
                      0,
                      Math.min(200, Math.trunc(Number(e.target.value))),
                    ),
                  })
                }
              />
            </div>
          ))}
        </div>
      )}
      <p className="helper preparation-note">
        Use the source selector on a spell for an extra cantrip or
        always-prepared spell granted by a feature. Record the granting feature
        in its description. These grants do not use the base class allowances.
        Manual limits cover multiclassing and other custom setups; rest and
        level-up replacement timing remains player-managed.
      </p>
    </section>
  );
}
