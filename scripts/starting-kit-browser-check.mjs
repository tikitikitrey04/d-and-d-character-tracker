import { startingChoiceOptions } from "../shared/starting-equipment.mjs";
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
  await page.getByLabel("Character name", { exact: true }).fill("Starter hero");
  const create = () =>
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Create character", exact: true })
      .click();
  const kitToggle = page.getByLabel("Include starting equipment and gold", {
    exact: true,
  });
  assert.equal(await kitToggle.isChecked(), false);
  await page.getByLabel("Background", { exact: true }).selectOption("Soldier");
  await kitToggle.check();
  await page
    .getByLabel("Class starting equipment", { exact: true })
    .selectOption("B");
  const preview = page.getByRole("region", {
    name: "Starting kit preview",
    exact: true,
  });
  await preview
    .getByRole("heading", { name: "Starting gold: 25 GP", exact: true })
    .waitFor();
  assert.match(await preview.innerText(), /Longbow/);
  const dragonchess = startingChoiceOptions("gaming").find((i) =>
    i.name.includes("Dragonchess"),
  ).key;
  await page
    .getByLabel("Background gaming set", { exact: true })
    .selectOption(dragonchess);
  await page.getByLabel("Class", { exact: true }).selectOption("Paladin");
  await preview
    .getByRole("heading", { name: "Starting gold: 23 GP", exact: true })
    .waitFor();
  assert.doesNotMatch(await preview.innerText(), /Longbow|Studded Leather/);
  assert.equal(
    await page
      .getByLabel("Background gaming set", { exact: true })
      .inputValue(),
    dragonchess,
  );
  const emblem = startingChoiceOptions("symbol").find((i) =>
    i.name.includes("Emblem"),
  ).key;
  await page
    .getByLabel("Class holy symbol", { exact: true })
    .selectOption(emblem);
  const beforeSpecies = await preview.innerText();
  await page.getByLabel("Species", { exact: true }).fill("Elf");
  assert.equal(await preview.innerText(), beforeSpecies);
  await page.getByLabel("Level", { exact: true }).fill("3");
  await page
    .getByText("This is the normal level 1 kit.", { exact: false })
    .waitFor();
  await page.getByLabel("Level", { exact: true }).fill("1");
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM characters").get().n, 0);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page
    .locator(".starting-equipment-section")
    .screenshot({ path: "/tmp/character-keeper-starting-kit.png" });
  await create();
  await page
    .getByRole("heading", { name: "Starter hero", exact: true })
    .waitFor();
  assert.equal(
    await page.getByLabel("Armor class", { exact: true }).inputValue(),
    "18",
  );
  let saved = JSON.parse(db.prepare("SELECT data FROM characters").get().data);
  assert.equal(saved.gold, 23);
  assert.equal(saved.species, "Elf");
  assert.equal(saved.weapons.find((w) => w.name === "Javelin").quantity, 6);
  assert.equal(
    saved.weapons.find((w) => w.name === "Shortbow").ammunitionCount,
    20,
  );
  assert.equal(
    saved.weapons.some((w) => w.name === "Longbow"),
    false,
  );
  assert.ok(saved.inventory.some((i) => i.name.includes("Dragonchess")));
  assert.ok(
    saved.inventory.some((i) => i.name.includes("Holy Symbol (Emblem)")),
  );
  await page.reload();
  await page.locator(".character-card").click();
  assert.equal(
    await page.getByLabel("Armor class", { exact: true }).inputValue(),
    "18",
  );
  await page
    .getByRole("button", { name: "My characters", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create character", exact: true })
    .click();
  await page.getByLabel("Character name", { exact: true }).fill("Gold hero");
  await page.getByLabel("Class", { exact: true }).selectOption("Bard");
  await page
    .getByLabel("Background", { exact: true })
    .selectOption("Entertainer");
  await kitToggle.check();
  await page
    .getByLabel("Class starting equipment", { exact: true })
    .selectOption("B");
  await page
    .getByLabel("Background starting equipment", { exact: true })
    .selectOption("B");
  await preview
    .getByRole("heading", { name: "Starting gold: 140 GP", exact: true })
    .waitFor();
  await create();
  await page.getByRole("heading", { name: "Gold hero", exact: true }).waitFor();
  saved = JSON.parse(
    db
      .prepare(
        "SELECT data FROM characters WHERE json_extract(data, '$.name') = ?",
      )
      .get("Gold hero").data,
  );
  assert.equal(saved.gold, 140);
  assert.deepEqual(saved.inventory, []);
  assert.deepEqual(saved.weapons, []);
  await page
    .getByRole("button", { name: "My characters", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create character", exact: true })
    .click();
  await page.getByLabel("Character name", { exact: true }).fill("Manual hero");
  await page.getByLabel("Class", { exact: true }).selectOption("Wizard");
  await page.getByLabel("Background", { exact: true }).selectOption("Sage");
  await kitToggle.check();
  await preview.getByText("1 × Spellbook", { exact: true }).waitFor();
  await kitToggle.uncheck();
  await create();
  await page
    .getByRole("heading", { name: "Manual hero", exact: true })
    .waitFor();
  saved = JSON.parse(
    db
      .prepare(
        "SELECT data FROM characters WHERE json_extract(data, '$.name') = ?",
      )
      .get("Manual hero").data,
  );
  assert.equal(saved.gold, 0);
  assert.deepEqual(saved.inventory, []);
  assert.deepEqual(saved.weapons, []);
  assert.deepEqual(errors, []);
  console.log(
    "Starting kit browser checks passed: opt-in, package switching, tool choices, species handling, armor AC, ammunition, gold alternatives, no preview writes, creation, reload, disabled kits and mobile layout.",
  );
} finally {
  if (browser) await browser.close();
  await new Promise((done) => server.close(done));
  db.close();
}
