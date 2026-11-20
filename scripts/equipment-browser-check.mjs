import { equipmentCatalog } from "../shared/equipment.mjs";
import assert from "node:assert/strict";
import express from "express";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { createApp } from "../server/app.mjs";

const { app, db } = createApp({
  databasePath: ":memory:",
  secureCookies: false,
});
app.use(express.static(resolve("dist")));
const server = app.listen(0, "127.0.0.1");
await new Promise((done) => server.once("listening", done));
let browser;
try {
  browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL || "chrome",
    headless: true,
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByLabel("Your name").fill("Autosave player");
  await page.getByLabel("Email address").fill("autosave@example.com");
  await page
    .getByLabel("Password", { exact: true })
    .fill("autosave-test-password");
  await page.getByRole("button", { name: "Begin your adventure" }).click();
  await page
    .getByRole("button", { name: "Create your first character" })
    .click();
  await page.getByLabel("Existing character", { exact: true }).check();
  await page
    .getByLabel("Character name", { exact: true })
    .fill("Autosaved hero");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create character", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Autosaved hero", exact: true })
    .waitFor();
  const key = (name) => equipmentCatalog.find((i) => i.name === name).key;
  await page.getByRole("button", { name: "Inventory", exact: true }).click();
  const picker = page.locator(".equipment-picker");
  const options = picker.getByLabel(/^Choose equipment/);
  await options.waitFor();
  assert.equal(await options.locator("option").count(), 230);
  await picker.getByLabel("Equipment category").selectOption("Armor & shields");
  assert.equal(await options.locator("option").count(), 14);
  await options.selectOption(key("Plate Armor"));
  await picker.getByLabel("Equip when added").check();
  await picker.getByRole("button", { name: "Add item", exact: true }).click();
  await picker
    .getByRole("status")
    .filter({ hasText: "Plate Armor added" })
    .waitFor();
  await options.selectOption(key("Shield"));
  await picker.getByLabel("Equip when added").check();
  await picker.getByRole("button", { name: "Add item", exact: true }).click();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  assert.equal(
    await page.getByLabel("Armor class", { exact: true }).inputValue(),
    "20",
  );
  await page.getByRole("button", { name: "Inventory", exact: true }).click();
  await picker.getByLabel("Equipment category").selectOption("Weapons");
  await options.selectOption(key("Greatsword"));
  await picker.getByLabel("Equip when added").check();
  await picker.getByRole("button", { name: "Add item", exact: true }).click();
  await picker.getByRole("alert").filter({ hasText: "hands" }).waitFor();
  await picker.getByLabel("Equip when added").uncheck();
  await picker.getByRole("button", { name: "Add item", exact: true }).click();
  await picker
    .getByRole("status")
    .filter({ hasText: "Greatsword added to Weapons" })
    .waitFor();
  await picker.getByLabel("Equipment category").selectOption("all");
  await picker.getByLabel("Search equipment").fill("thieves' tools");
  await options.selectOption(key("Thieves’ Tools"));
  await picker
    .getByRole("region", { name: "Equipment details" })
    .getByText(/Pick a lock/)
    .waitFor();
  await picker.getByRole("button", { name: "Add item", exact: true }).click();
  await picker.getByLabel("Search equipment").fill("Arrows");
  await options.selectOption(key("Arrows (20)"));
  await picker.getByLabel("Equipment quantity").fill("2");
  await picker.getByRole("button", { name: "Add item", exact: true }).click();
  await picker.getByLabel("Search equipment").fill("no-equipment-exists");
  await picker
    .getByText("No equipment matches. Try another search or category.", {
      exact: true,
    })
    .waitFor();
  await picker
    .getByRole("button", { name: "Custom item", exact: true })
    .click();
  await picker.getByLabel("Name", { exact: true }).fill("Moon charm");
  await picker.getByLabel("Details", { exact: true }).fill("A custom keepsake");
  await picker.getByRole("button", { name: "Add item", exact: true }).click();
  await page.getByText("All changes saved", { exact: true }).waitFor();
  const saved = JSON.parse(
    db.prepare("SELECT data FROM characters").get().data,
  );
  assert.equal(saved.inventory.length, 5);
  assert.equal(saved.weapons.length, 1);
  assert.equal(saved.weapons[0].name, "Greatsword");
  assert.equal(saved.weapons[0].equipped, false);
  assert.equal(
    saved.inventory.find((i) => i.name === "Arrows (20)").quantity,
    2,
  );
  assert.equal(saved.gold, 0);
  assert.equal(
    saved.inventory.find((i) => i.name === "Plate Armor").equipped,
    true,
  );
  await page.reload();
  await page.locator(".character-card").click();
  await page.getByRole("button", { name: "Inventory", exact: true }).click();
  assert.equal(
    await page.getByLabel("Equip Plate Armor", { exact: true }).isChecked(),
    true,
  );
  await picker.getByLabel("Search equipment").fill("potion healing");
  await options.selectOption(key("Potion of Healing"));
  await picker
    .getByRole("region", { name: "Equipment details" })
    .getByText(/2d4/)
    .waitFor();
  await picker.getByText("Service prices", { exact: true }).click();
  await picker
    .getByText("Inn stay (Modest, per day):", { exact: true })
    .waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await picker.screenshot({ path: "/tmp/character-keeper-equipment.png" });
  assert.deepEqual(errors, []);
  console.log(
    "Equipment browser checks passed: catalog, categories, search, armor/shield AC, weapon routing, hand limits, ammunition bundles, custom gear, service prices, autosave, reload and mobile layout.",
  );
} finally {
  if (browser) await browser.close();
  await new Promise((done) => server.close(done));
  db.close();
}
