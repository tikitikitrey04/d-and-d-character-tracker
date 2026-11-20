import { abilities } from "./character.mjs";
import { officialBackground } from "./backgrounds.mjs";

// 2024 costs at 8–15, plus the table house rule: one refunded point per step below 8.
export const pointBuyCosts = {
  1: -7,
  2: -6,
  3: -5,
  4: -4,
  5: -3,
  6: -2,
  7: -1,
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
};
export const POINT_BUY_BUDGET = 27;
export function pointBuySpent(scores) {
  if (
    !Array.isArray(scores) ||
    scores.length !== 6 ||
    !scores.every((n) => Number.isInteger(n) && Object.hasOwn(pointBuyCosts, n))
  )
    throw new Error(
      "Point-buy base scores must be whole numbers from 1 to 15.",
    );
  return scores.reduce((total, n) => total + pointBuyCosts[n], 0);
}
export function backgroundAbilityOptions(background) {
  const official = officialBackground(background);
  return official
    ? official.abilities.map((name) => abilities.indexOf(name))
    : abilities.map((_, i) => i);
}
export function resolveBoostChoices(background, mode = "split", choices = []) {
  if (!["split", "three"].includes(mode))
    throw new Error("Choose +2/+1 or three +1 background increases.");
  const allowed = backgroundAbilityOptions(background);
  const count = mode === "three" ? 3 : 2;
  if (
    !Array.isArray(choices) ||
    choices.length > count ||
    new Set(choices).size !== choices.length ||
    !choices.every((i) => allowed.includes(i))
  )
    throw new Error(
      "Background increases must use different eligible abilities.",
    );
  return [...choices, ...allowed.filter((i) => !choices.includes(i))].slice(
    0,
    count,
  );
}
export function pointBuyResult(
  scores,
  background,
  mode = "split",
  choices = [],
) {
  const spent = pointBuySpent(scores);
  if (spent > POINT_BUY_BUDGET)
    throw new Error(
      "Point buy cannot exceed 27 points plus refunds from scores below 8.",
    );
  const selected = resolveBoostChoices(background, mode, choices);
  const boosts = abilities.map((_, i) =>
    selected.includes(i) ? (mode === "split" && i === selected[0] ? 2 : 1) : 0,
  );
  const final = scores.map((n, i) => n + boosts[i]);
  if (final.some((n) => n > 20))
    throw new Error("Background increases cannot raise an ability above 20.");
  const refunded = scores.reduce(
    (sum, score) => sum + Math.max(0, -pointBuyCosts[score]),
    0,
  );
  return {
    spent,
    refunded,
    purchased: spent + refunded,
    budget: POINT_BUY_BUDGET + refunded,
    remaining: POINT_BUY_BUDGET - spent,
    boosts,
    final,
    selected,
  };
}
