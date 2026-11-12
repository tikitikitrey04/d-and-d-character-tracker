import React from "react";
import { Sparkles, ChevronRight } from "lucide-react";
import { isSpellReady, spellSource } from "../shared/preparation.mjs";
import SpellCastButton from "./SpellCastButton.jsx";
import { overviewSpellGroups } from "../shared/casting.mjs";

export default function OverviewSpells({
  character: c,
  onManage,
  onCast,
  onRestore,
  castMessage,
}) {
  const ready = c.spells.filter((s) => isSpellReady(c, s));
  const cantrips = ready.filter((s) => s.level === 0);
  const prepared = ready.filter((s) => s.level > 0);
  // Automatic slots already follow class/subclass progression. Keep configured
  // manual counts, while hiding zero-capacity ranks and ranks above character level.
  const slots = c.slots
    .map((slot, i) => ({ ...slot, level: i + 1 }))
    .filter((s) => s.max > 0 && s.level <= c.level);
  const available = slots.reduce((total, s) => total + s.max - s.used, 0);
  const hiddenManualSlots = c.slots.some(
    (s, i) => s.max > 0 && i + 1 > c.level,
  );
  const groups = overviewSpellGroups(c);

  return (
    <section
      className="panel overview-spells"
      aria-label="Prepared spells overview"
    >
      <div className="panel-title">
        <h3>Prepared spells</h3>
        <Sparkles size={17} />
      </div>
      {castMessage && (
        <p className="cast-feedback" aria-live="polite">
          {castMessage}
        </p>
      )}
      <div className="overview-spell-summary">
        <span>{prepared.length} prepared</span>
        <span>{cantrips.length} known cantrips</span>
        <button className="text-button" onClick={onManage}>
          Manage spells <ChevronRight size={13} />
        </button>
      </div>
      <section
        className="overview-slot-summary"
        aria-label="Overview spell slots"
      >
        <div className="overview-slots-title">
          <h4>Available spell slots</h4>
          <span>{available} remaining</span>
        </div>
        {slots.length ? (
          <dl className="overview-slot-grid">
            {slots.map((slot) => (
              <div key={slot.level}>
                <dt>Level {slot.level}</dt>
                <dd>
                  <strong>{slot.max - slot.used}</strong>
                  <span> / {slot.max} available</span>
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="helper">No spell slots available at this level.</p>
        )}
        {c.class === "Warlock" && c.slotMode !== "manual" && (
          <p className="helper">
            Pact Magic slots. Mystic Arcanum uses are tracked separately by each
            spell’s Cast button.
          </p>
        )}
        {hiddenManualSlots && (
          <p className="helper">
            Manual slot levels above your character level are hidden here. View
            all overrides in Spells.
          </p>
        )}
      </section>
      {groups.length ? (
        groups.map((group) => (
          <section
            className="overview-spell-group"
            aria-label={
              group.level === 0
                ? "Overview cantrips"
                : `Overview level ${group.level} prepared spells`
            }
            key={group.level}
          >
            <div className="overview-group-title">
              <h4>{group.level === 0 ? "Cantrips" : `Level ${group.level}`}</h4>
              {group.slot && (
                <small>
                  {group.slot.max - group.slot.used} / {group.slot.max} slots
                  available
                </small>
              )}
            </div>
            {group.spells.map((spell) => (
              <div className="overview-cast-row" key={spell.id}>
                <details className="overview-spell-entry">
                  <summary>
                    <strong>{spell.name}</strong>
                    <span className="spell-level-badge">
                      {spell.level === 0
                        ? "Cantrip"
                        : `Base level ${spell.level}`}
                    </span>
                    <small>
                      {spell.level === 0
                        ? spellSource(c, spell) === "granted"
                          ? "Bonus cantrip"
                          : "Known"
                        : spellSource(c, spell) === "arcanum"
                          ? "Mystic Arcanum"
                          : spellSource(c, spell) === "granted"
                            ? "Always prepared"
                            : "Prepared"}
                    </small>
                  </summary>
                  <p>
                    {spell.detail ||
                      "No description recorded. Add details in the Spells tab."}
                  </p>
                </details>
                <SpellCastButton
                  character={c}
                  spell={spell}
                  onCast={onCast}
                  onRestore={onRestore}
                />
              </div>
            ))}
          </section>
        ))
      ) : (
        <p className="empty-inline">
          No prepared spells or known cantrips yet. Choose them in the Spells
          tab.
        </p>
      )}
    </section>
  );
}
