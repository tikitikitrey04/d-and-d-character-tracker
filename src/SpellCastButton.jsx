import React from "react";
import { castingOptions } from "../shared/casting.mjs";
import { spellSource } from "../shared/preparation.mjs";

export default function SpellCastButton({
  character,
  spell,
  onCast,
  onRestore,
}) {
  const options = castingOptions(character, spell);
  const arcanum = spellSource(character, spell) === "arcanum";
  const levels =
    spell.level === 0
      ? [0]
      : arcanum
        ? [spell.level]
        : character.slots.flatMap((slot, index) =>
            slot.max > 0 &&
            index + 1 >= spell.level &&
            index + 1 <= character.level
              ? [index + 1]
              : [],
          );
  return (
    <div className="overview-cast-controls">
      {spell.level > 0 && !arcanum && levels.length > 0 && (
        <small className="overview-cast-level">Cast at level:</small>
      )}
      {levels.map((level) => {
        const choice = options.find((option) => option.level === level);
        return (
          <button
            key={level}
            type="button"
            className="primary small"
            aria-label={
              spell.level > 0 && !arcanum
                ? `Cast ${spell.name} at level ${level}`
                : `Cast ${spell.name}`
            }
            disabled={!choice}
            title={
              spell.level === 0
                ? "Cast without using a spell slot"
                : arcanum
                  ? choice
                    ? "Use Mystic Arcanum once per Long Rest"
                    : "Mystic Arcanum use unavailable"
                  : choice
                    ? `${level > spell.level ? "Upcast. " : ""}Expend one level ${level} slot (${choice.remaining} remaining)`
                    : `No level ${level} slots remaining`
            }
            onClick={() => {
              if (choice) onCast(spell.id, level);
            }}
          >
            {spell.level === 0
              ? "Cast"
              : arcanum
                ? choice
                  ? "Cast Arcanum"
                  : "Unavailable"
                : `Cast Lv ${level}`}
          </button>
        );
      })}
      {!levels.length && (
        <button
          type="button"
          className="primary small"
          aria-label={`Cast ${spell.name}`}
          disabled
        >
          No slots
        </button>
      )}
      {arcanum && spell.arcanumUsed && (
        <button
          type="button"
          className="text-button"
          aria-label={`Restore Mystic Arcanum for ${spell.name}`}
          onClick={() => onRestore(spell.id)}
        >
          Restore after Long Rest
        </button>
      )}
    </div>
  );
}
