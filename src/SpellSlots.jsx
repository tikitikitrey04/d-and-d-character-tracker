import React, { useId } from "react";
import { Sparkles } from "lucide-react";

export default function SpellSlots({ character: c, onChange }) {
  const id = useId();
  const manual = c.slotMode === "manual";
  function updateSlot(index, patch) {
    onChange({
      slots: c.slots.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    });
  }
  return (
    <section className="panel">
      <div className="panel-title">
        <h3>Spell slots</h3>
        <Sparkles size={18} />
      </div>
      <div className="slot-mode-row">
        <span className="pill">
          {manual ? "Manual override" : "Automatic"} · {c.class} level {c.level}
        </span>
        <label className="slot-override">
          <input
            type="checkbox"
            checked={manual}
            onChange={(e) =>
              onChange({ slotMode: e.target.checked ? "manual" : "auto" })
            }
          />
          Manual override
        </label>
      </div>
      <p className="helper">
        {manual
          ? "Edit slot maximums below. Your overrides stay in place when class or level changes. Turn off manual override to restore class defaults."
          : "Slot maximums follow your class, subclass, and level automatically. Filled circles are expended slots; click to expend or restore."}{" "}
        Used slots are preserved up to the new maximum when values change.
      </p>
      {c.class === "Warlock" && !manual && (
        <p className="helper">
          These are Pact Magic slots, recovered on a Short or Long Rest. Mystic
          Arcanum does not grant level 6–9 spell slots; cast and restore those
          uses on Overview.
        </p>
      )}
      {!manual && !c.slots.some((s) => s.max) && (
        <p className="helper">
          This class and subclass have no standard spell slots at this level.
          Use manual override for a custom setup.
        </p>
      )}
      <div className="slot-grid">
        {c.slots.map((slot, i) => (
          <div className="slot" key={i}>
            <div className="field">
              <label htmlFor={`${id}-${i}`}>Level {i + 1}</label>
              <input
                id={`${id}-${i}`}
                type="number"
                min={0}
                max={20}
                value={slot.max}
                readOnly={!manual}
                onChange={(e) => {
                  if (!manual) return;
                  const max = Math.max(
                    0,
                    Math.min(20, Math.trunc(Number(e.target.value))),
                  );
                  updateSlot(i, { max, used: Math.min(slot.used, max) });
                }}
              />
            </div>
            <div className="slot-dots">
              {Array.from({ length: slot.max }, (_, n) => (
                <button
                  type="button"
                  key={n}
                  aria-label={`Level ${i + 1} slot ${n + 1}: ${n < slot.used ? "expended" : "available"}`}
                  aria-pressed={n < slot.used}
                  className={n < slot.used ? "used" : ""}
                  onClick={() =>
                    updateSlot(i, { used: n < slot.used ? n : n + 1 })
                  }
                />
              ))}
            </div>
            <small className="slot-remaining">
              {slot.max - slot.used} / {slot.max} available
            </small>
          </div>
        ))}
      </div>
      <p className="helper slot-rules-note">
        Automatic slots assume a single class. For multiclass characters or
        house rules, use manual override. Slot changes do not change the spell
        picker’s class and level filters.
      </p>
    </section>
  );
}
