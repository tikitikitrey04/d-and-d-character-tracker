export const sheetTabs = [
  "Overview",
  "Spells",
  "Weapons",
  "Inventory",
  "Features",
  "Journal",
];
const pages = [
  "characters",
  "archive",
  "help",
  "account",
  "report",
  "logs",
  "bugs",
];
export function readNavigation(search, isAdmin = false) {
  const params = new URLSearchParams(search);
  let page = params.get("page") || "characters";
  if (!pages.includes(page) || (!isAdmin && ["logs", "bugs"].includes(page)))
    page = "characters";
  const character = page === "characters" ? params.get("character") : null;
  const tab = sheetTabs.includes(params.get("tab"))
    ? params.get("tab")
    : "Overview";
  return { page, character, tab };
}
export function navigationUrl(
  href,
  { page = "characters", character = null, tab = "Overview" } = {},
) {
  const url = new URL(href);
  for (const key of ["page", "character", "tab"]) url.searchParams.delete(key);
  if (page !== "characters") url.searchParams.set("page", page);
  else if (character) {
    url.searchParams.set("character", character);
    if (tab !== "Overview") url.searchParams.set("tab", tab);
  }
  if (page !== "help" && url.hash.startsWith("#guide-")) url.hash = "";
  return `${url.pathname}${url.search}${url.hash}`;
}
