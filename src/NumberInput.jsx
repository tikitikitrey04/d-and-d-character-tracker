import React, { useState } from "react";

// Keep incomplete edits local so an empty field never reaches autosave or calculations.
export default function NumberInput({
  value,
  onChange,
  onBlur,
  onKeyDown,
  ...props
}) {
  const [draft, setDraft] = useState(null);
  function commit() {
    if (draft === null) return;
    // Existing field handlers apply their bounds (for example, level must be >= 1).
    onChange?.({ target: { value: draft === "" ? "0" : draft } });
    setDraft(null);
  }
  return (
    <input
      {...props}
      type="number"
      value={draft ?? value}
      onChange={(event) => {
        const text = event.target.value;
        setDraft(text);
        if (text !== "" && Number.isFinite(Number(text))) onChange?.(event);
      }}
      onBlur={(event) => {
        commit();
        onBlur?.(event);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.nativeEvent.isComposing) {
          event.preventDefault();
          commit();
        }
        onKeyDown?.(event);
      }}
    />
  );
}
