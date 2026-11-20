import NumberInput from "./NumberInput.jsx";
import React, { useId } from "react";
import { abilities, modifier, signed } from "../shared/character.mjs";
import { officialBackground } from "../shared/backgrounds.mjs";
import {
  pointBuyCosts,
  pointBuyResult,
  backgroundAbilityOptions,
} from "../shared/point-buy.mjs";

export default function PointBuy({
  character,
  scores,
  onScores,
  boostMode,
  onBoostMode,
  boostChoices,
  onBoostChoices,
}) {
  const id = useId();
  const result = pointBuyResult(
    scores,
    character.background,
    boostMode,
    boostChoices,
  );
  const allowed = backgroundAbilityOptions(character.background);
  function maximumScore(index) {
    const available = 27 - result.spent + pointBuyCosts[scores[index]];
    return Math.max(
      ...Object.keys(pointBuyCosts)
        .map(Number)
        .filter((score) => pointBuyCosts[score] <= available),
    );
  }
  function changeScore(index, value) {
    const next = Math.max(1, Math.min(maximumScore(index), Math.trunc(value)));
    onScores(scores.map((score, i) => (i === index ? next : score)));
  }

  return (
    <section className="point-buy" aria-label="Point buy">
      <div className="panel-title">
        <h3>27-point buy</h3>
        <span className="pill" role="status">
          {result.remaining} points remaining · {result.purchased}/
          {result.budget} spent
        </span>
      </div>
      <p className="helper">
        Buy base scores first, then apply {character.background} background
        increases below. Type a base score or use −/+. Values are limited to
        1–15 and your available points. Each point below 8 refunds one point.
        Final scores and modifiers update immediately.
      </p>
      {result.refunded > 0 && (
        <p className="helper" role="status">
          {result.refunded} refunded points · Total budget: {result.budget} (27
          + {result.refunded})
        </p>
      )}
      <div className="point-buy-actions">
        <button
          type="button"
          className="text-button"
          onClick={() => onScores(Array(6).fill(8))}
        >
          Reset to 8
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() => onScores([15, 14, 13, 12, 10, 8])}
        >
          Use standard array
        </button>
      </div>
      <div className="point-buy-table">
        <table>
          <thead>
            <tr>
              <th>Ability</th>
              <th>Base score</th>
              <th>Cost</th>
              <th>Bonus</th>
              <th>Final</th>
              <th>Mod</th>
            </tr>
          </thead>
          <tbody>
            {abilities.map((name, i) => (
              <tr key={name}>
                <th scope="row">
                  <label htmlFor={`${id}-score-${i}`}>{name}</label>
                </th>
                <td>
                  <div className="point-buy-stepper">
                    <button
                      type="button"
                      aria-label={`Decrease ${name}`}
                      disabled={scores[i] <= 1}
                      onClick={() => changeScore(i, scores[i] - 1)}
                    >
                      −
                    </button>
                    <NumberInput
                      id={`${id}-score-${i}`}
                      aria-label={`${name} base score`}
                      min={1}
                      max={maximumScore(i)}
                      step={1}
                      value={scores[i]}
                      onChange={(e) => changeScore(i, Number(e.target.value))}
                    />
                    <button
                      type="button"
                      aria-label={`Increase ${name}`}
                      disabled={scores[i] >= maximumScore(i)}
                      onClick={() => changeScore(i, scores[i] + 1)}
                    >
                      +
                    </button>
                  </div>
                </td>
                <td>{pointBuyCosts[scores[i]]}</td>
                <td>{signed(result.boosts[i])}</td>
                <td aria-label={`${name} final score`}>{result.final[i]}</td>
                <td>{signed(modifier(result.final[i]))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="field">
        <label htmlFor={`${id}-mode`}>Background ability increases</label>
        <select
          id={`${id}-mode`}
          value={boostMode}
          onChange={(e) => {
            onBoostMode(e.target.value);
            onBoostChoices([]);
          }}
        >
          <option value="split">+2 to one ability and +1 to another</option>
          <option value="three">+1 to three different abilities</option>
        </select>
      </div>
      <div className="form-grid">
        {result.selected.map((selected, index) => (
          <div className="field" key={index}>
            <label htmlFor={`${id}-boost-${index}`}>
              {boostMode === "split" && index === 0
                ? "+2 ability"
                : boostMode === "split"
                  ? "+1 ability"
                  : `+1 ability ${index + 1}`}
            </label>
            <select
              id={`${id}-boost-${index}`}
              value={selected}
              onChange={(e) =>
                onBoostChoices(
                  result.selected.map((n, i) =>
                    i === index ? Number(e.target.value) : n,
                  ),
                )
              }
            >
              {allowed.map((i) => (
                <option
                  key={i}
                  value={i}
                  disabled={i !== selected && result.selected.includes(i)}
                >
                  {abilities[i]}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      {!officialBackground(character.background) && (
        <p className="helper">
          For a custom or older background, choose eligible abilities with your
          DM. Any ability can be selected here.
        </p>
      )}
      {result.remaining > 0 && (
        <p className="helper">
          You still have {result.remaining} points available to spend.
        </p>
      )}
      <details className="point-buy-help">
        <summary>Point-buy help</summary>
        <p>
          Each base ability starts at 8 with 27 points to spend. This table’s
          house rule allows scores down to 1: each step below 8 refunds one
          point. For example, dropping 8 to 6 adds 2 points, giving a total
          budget of 29. Raising that score again uses those points back up. Base
          scores still cap at 15, and scores of 14 and 15 cost more. Standard
          2024 point buy normally has a minimum of 8.
        </p>
        <table>
          <caption>Ability score point costs</caption>
          <thead>
            <tr>
              <th>Score</th>
              {Object.keys(pointBuyCosts)
                .filter((n) => Number(n) >= 8)
                .map((n) => (
                  <th key={n}>{n}</th>
                ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>Cost</th>
              {Object.entries(pointBuyCosts)
                .filter(([score]) => Number(score) >= 8)
                .map(([score, cost]) => (
                  <td key={score}>{cost}</td>
                ))}
            </tr>
          </tbody>
        </table>
        <p>
          Background increases are free: add +2 and +1 to two different eligible
          abilities, or +1 to three different eligible abilities. The selected
          2024 background determines the eligible abilities. These increases
          cannot raise a score above 20.
        </p>
        <p>
          In the 2024 rules, species/race does not add separate ability score
          increases. Class helps guide your priorities; it does not change point
          costs. The modifier shown is half of the final score minus 10, rounded
          down.
        </p>
        <p>
          You may leave points unspent. For rolled scores, house rules, or an
          existing character, choose Manual final scores instead. Manual scores
          should already include all bonuses.
        </p>
        <a
          href="https://www.dndbeyond.com/sources/dnd/br-2024/creating-a-character"
          target="_blank"
          rel="noreferrer"
        >
          2024 ability score rules ↗
        </a>
      </details>
    </section>
  );
}
