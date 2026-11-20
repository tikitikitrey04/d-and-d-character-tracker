import React, { useId, useState } from "react";
import NumberInput from "./NumberInput.jsx";
import { preparationIncreaseError } from "../shared/preparation.mjs";

export default function RecordEditor({ item, type, items, character, onSave }) {
  const id = useId();
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");
  const spell = type === "spells";
  function save(event) {
    event.preventDefault();
    const next = { ...item, ...draft, name: draft.name.trim() };
    if (!next.name) return setError("Enter a name.");
    if (
      spell &&
      items.some(
        (other) =>
          other.id !== item.id &&
          other.name.trim().toLowerCase() === next.name.toLowerCase(),
      )
    )
      return setError("A spell with this name is already in your spellbook.");
    if (spell && next.preparationSource === "arcanum" && next.level < 6)
      return setError(
        "Mystic Arcanum spells must be level 6 or higher. Change the preparation source before changing the level.",
      );
    if (spell && character) {
      const message = preparationIncreaseError(
        {
          ...character,
          spells: items.map((other) => (other.id === item.id ? next : other)),
        },
        character,
      );
      if (message) return setError(message);
    }
    onSave(next);
    setDraft(null);
    setError("");
  }
  if (!draft)
    return (
      <button
        type="button"
        className="text-button"
        aria-label={`Edit ${item.name}`}
        onClick={() => {
          setDraft({
            name: item.name,
            detail: item.detail,
            ...(spell ? { level: item.level } : { quantity: item.quantity }),
          });
          setError("");
        }}
      >
        Edit
      </button>
    );
  return (
    <form
      className="record-editor"
      aria-label={`Edit ${item.name}`}
      onSubmit={save}
    >
      <div className="form-grid">
        <div className="field">
          <label htmlFor={`${id}-name`}>Name</label>
          <input
            id={`${id}-name`}
            value={draft.name}
            maxLength={200}
            required
            pattern=".*\S.*"
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            autoFocus
          />
        </div>
        <div className="field">
          <label htmlFor={`${id}-number`}>
            {spell ? "Spell level" : "Quantity"}
          </label>
          <NumberInput
            id={`${id}-number`}
            min={0}
            max={spell ? 9 : 9999}
            value={spell ? draft.level : draft.quantity}
            onChange={(e) =>
              setDraft({
                ...draft,
                [spell ? "level" : "quantity"]: Math.max(
                  0,
                  Math.min(
                    spell ? 9 : 9999,
                    Math.trunc(Number(e.target.value)),
                  ),
                ),
              })
            }
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`${id}-detail`}>
          {spell ? "Spell description" : "Item details"}
        </label>
        <textarea
          id={`${id}-detail`}
          rows={5}
          maxLength={spell ? 20000 : 2000}
          value={draft.detail}
          onChange={(e) => setDraft({ ...draft, detail: e.target.value })}
        />
      </div>
      {error && (
        <p role="alert" className="helper">
          {error}
        </p>
      )}
      <div className="record-editor-actions">
        <button type="submit" className="secondary small">
          Save changes
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setDraft(null);
            setError("");
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
