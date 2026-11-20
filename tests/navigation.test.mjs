import test from "node:test";
import assert from "node:assert/strict";
import {
  readNavigation,
  navigationUrl,
  sheetTabs,
} from "../shared/navigation.mjs";
test("pages and character sheet tabs round-trip through the URL", () => {
  for (const page of [
    "characters",
    "archive",
    "help",
    "account",
    "report",
    "logs",
    "bugs",
  ]) {
    const url = new URL(
      navigationUrl("https://keeper.test/", { page }),
      "https://keeper.test",
    );
    assert.equal(readNavigation(url.search, true).page, page);
  }
  for (const tab of sheetTabs) {
    const url = new URL(
      navigationUrl("https://keeper.test/", {
        character: "owned-character",
        tab,
      }),
      "https://keeper.test",
    );
    assert.deepEqual(readNavigation(url.search), {
      page: "characters",
      character: "owned-character",
      tab,
    });
  }
});
test("unknown pages/tabs and unauthorized admin pages fall back safely", () => {
  assert.equal(readNavigation("?page=logs").page, "characters");
  assert.equal(readNavigation("?page=bugs").page, "characters");
  assert.equal(readNavigation("?page=unknown").page, "characters");
  assert.equal(readNavigation("?character=id&tab=Unknown").tab, "Overview");
  assert.equal(readNavigation("?page=help&character=id").character, null);
});
test("changing pages clears stale character routes and keeps help anchors", () => {
  assert.equal(
    navigationUrl("https://keeper.test/?character=id&tab=Spells", {
      page: "help",
    }),
    "/?page=help",
  );
  assert.equal(
    navigationUrl("https://keeper.test/?page=help#guide-create", {
      page: "help",
    }),
    "/?page=help#guide-create",
  );
  assert.equal(
    navigationUrl("https://keeper.test/?page=help#guide-create"),
    "/",
  );
});
