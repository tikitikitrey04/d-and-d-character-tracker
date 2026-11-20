import test from "node:test";
import assert from "node:assert/strict";
import {
  pointBuySpent,
  pointBuyResult,
  backgroundAbilityOptions,
} from "../shared/point-buy.mjs";
import { backgrounds } from "../shared/backgrounds.mjs";
const array = [15, 14, 13, 12, 10, 8];
test("point buy charges nonlinear costs and enforces the 1–15 base range and 27 budget", () => {
  assert.equal(pointBuySpent(Array(6).fill(8)), 0);
  assert.equal(pointBuySpent(array), 27);
  assert.equal(pointBuySpent([15, 15, 15, 8, 8, 8]), 27);
  assert.throws(() => pointBuyResult([15, 15, 15, 9, 8, 8], "Soldier"), /27/);
  for (const scores of [
    [0, 8, 8, 8, 8, 8],
    [16, 8, 8, 8, 8, 8],
    [8.5, 8, 8, 8, 8, 8],
    [8],
    [NaN, 8, 8, 8, 8, 8],
  ])
    assert.throws(() => pointBuySpent(scores));
});
test("background boosts apply once to separate base scores for either legal pattern", () => {
  const base = [...array];
  const first = pointBuyResult(base, "Soldier", "split", [0, 1]);
  assert.deepEqual(first.final, [17, 15, 13, 12, 10, 8]);
  assert.equal(first.spent, 27);
  assert.deepEqual(pointBuyResult(base, "Soldier", "split", [0, 1]), first);
  assert.deepEqual(base, array);
  assert.deepEqual(
    pointBuyResult(base, "Sage", "three").final,
    [15, 14, 14, 13, 11, 8],
  );
  assert.deepEqual(pointBuyResult(base, "Sage").final, [15, 14, 15, 13, 10, 8]);
});
test("all backgrounds restrict boosts to their three abilities and custom origins stay flexible", () => {
  for (const b of backgrounds) {
    const allowed = backgroundAbilityOptions(b.name);
    const result = pointBuyResult(array, b.name, "three");
    assert.equal(
      result.boosts.reduce((a, b) => a + b),
      3,
    );
    assert.ok(result.selected.every((i) => allowed.includes(i)));
    const other = [0, 1, 2, 3, 4, 5].find((i) => !allowed.includes(i));
    assert.throws(() => pointBuyResult(array, b.name, "split", [other]));
  }
  assert.deepEqual(
    pointBuyResult(array, "Custom", "split", [5, 0]).final,
    [16, 14, 13, 12, 10, 10],
  );
  assert.throws(
    () => pointBuyResult(array, "Custom", "split", [1, 1]),
    /different/,
  );
  assert.throws(() => pointBuyResult(array, "Soldier", "invalid"));
});

test("lowering base scores refunds points and repurchasing cannot spend those refunds twice", () => {
  const reduced = pointBuyResult([15, 15, 15, 10, 6, 8], "Soldier");
  assert.equal(reduced.refunded, 2);
  assert.equal(reduced.budget, 29);
  assert.equal(reduced.purchased, 29);
  assert.equal(reduced.remaining, 0);
  assert.throws(
    () => pointBuyResult([15, 15, 15, 10, 7, 8], "Soldier"),
    /refunds/,
  );
  const minimum = pointBuyResult(Array(6).fill(1), "Sage");
  assert.equal(minimum.budget, 69);
  assert.equal(minimum.remaining, 69);
  assert.equal(minimum.refunded, 42);
  const reset = pointBuyResult(Array(6).fill(8), "Sage");
  assert.equal(reset.refunded, 0);
  assert.equal(reset.budget, 27);
});
