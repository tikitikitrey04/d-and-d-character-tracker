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
  const dialog = page.getByRole("dialog");
  const next = () =>
    dialog.getByRole("button", { name: "Next", exact: true }).click();
  const back = () =>
    dialog.getByRole("button", { name: "Back", exact: true }).click();
  const kit = page.getByLabel("Include starting equipment and gold", {
    exact: true,
  });
  const pointBuy = page.getByRole("region", { name: "Point buy", exact: true });
  await page.getByLabel("New character", { exact: true }).check();
  await page.getByLabel("Character name", { exact: true }).fill("Wizard hero");
  await page.getByLabel("Class", { exact: true }).selectOption("Wizard");
  await page.getByLabel("Background", { exact: true }).selectOption("Sage");
  assert.equal(await kit.count(), 0);
  assert.equal(await pointBuy.count(), 0);
  assert.equal(
    await dialog
      .getByRole("button", { name: "Create character", exact: true })
      .count(),
    0,
  );
  await next();
  assert.equal(await kit.isChecked(), true);
  await page
    .getByRole("region", { name: "Starting kit preview" })
    .getByText("1 × Spellbook", { exact: true })
    .waitFor();
  assert.equal(await pointBuy.count(), 0);
  assert.equal(
    await page.getByLabel("Character name", { exact: true }).count(),
    0,
  );
  await kit.uncheck();
  await next();
  assert.equal(await kit.count(), 0);
  await pointBuy.getByLabel("Strength base score").fill("15");
  await pointBuy.getByLabel("Dexterity base score").fill("15");
  await pointBuy.getByLabel("Constitution base score").fill("15");
  assert.equal(
    await pointBuy
      .getByRole("button", { name: "Increase Intelligence", exact: true })
      .isDisabled(),
    true,
  );
  await pointBuy.getByLabel("Wisdom base score").fill("6");
  await pointBuy.getByLabel("Wisdom base score").press("Tab");
  await pointBuy
    .getByRole("status")
    .filter({ hasText: "Total budget: 29" })
    .waitFor();
  await pointBuy.getByLabel("Intelligence base score").fill("10");
  await pointBuy.getByLabel("Intelligence base score").press("Tab");
  await pointBuy
    .getByRole("status")
    .filter({ hasText: "29/29 spent" })
    .waitFor();
  assert.equal(
    await pointBuy
      .getByRole("button", { name: "Increase Wisdom", exact: true })
      .isDisabled(),
    true,
  );
  await pointBuy.getByLabel("Intelligence base score").fill("8");
  await pointBuy.getByLabel("Wisdom base score").fill("8");
  await pointBuy.getByLabel("Wisdom base score").press("Tab");
  await pointBuy.getByLabel("Intelligence base score").fill("");
  assert.equal(
    await pointBuy.getByLabel("Intelligence base score").inputValue(),
    "",
  );
  await pointBuy.getByLabel("Intelligence base score").press("Tab");
  assert.equal(
    await pointBuy.getByLabel("Intelligence base score").inputValue(),
    "1",
  );
  await pointBuy.getByLabel("Intelligence base score").fill("99");
  await pointBuy.getByLabel("Intelligence base score").press("Enter");
  assert.equal(
    await pointBuy.getByLabel("Intelligence base score").inputValue(),
    "8",
  );
  await pointBuy
    .getByRole("button", { name: "Decrease Strength", exact: true })
    .click();
  assert.equal(
    await pointBuy.getByLabel("Strength base score").inputValue(),
    "14",
  );
  await pointBuy
    .getByRole("status")
    .filter({ hasText: "2 points remaining" })
    .waitFor();
  await pointBuy
    .getByRole("button", { name: "Increase Strength", exact: true })
    .click();
  assert.equal(
    await pointBuy.getByLabel("Strength base score").inputValue(),
    "15",
  );

  await pointBuy
    .getByRole("button", { name: "Use standard array", exact: true })
    .click();
  await pointBuy
    .getByLabel("Background ability increases", { exact: true })
    .selectOption("three");
  await pointBuy.getByText("Point-buy help", { exact: true }).click();
  await pointBuy
    .getByRole("table", { name: "Ability score point costs" })
    .waitFor();
  await back();
  assert.equal(await kit.isChecked(), false);
  await back();
  assert.equal(
    await page.getByLabel("Character name", { exact: true }).inputValue(),
    "Wizard hero",
  );
  await page.getByLabel("Species", { exact: true }).fill("Elf");
  await next();
  await next();
  assert.equal(
    await pointBuy.getByLabel("Strength base score").inputValue(),
    "15",
  );
  assert.equal(
    await pointBuy
      .getByLabel("Background ability increases", { exact: true })
      .inputValue(),
    "three",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page
    .locator(".point-buy-table")
    .screenshot({ path: "/tmp/character-keeper-wizard-point-buy.png" });
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM characters").get().n, 0);
  await dialog
    .getByRole("button", { name: "Create character", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Wizard hero", exact: true })
    .waitFor();
  const saved = (name) =>
    JSON.parse(
      db
        .prepare(
          "SELECT data FROM characters WHERE json_extract(data, '$.name')=?",
        )
        .get(name).data,
    );
  assert.deepEqual(saved("Wizard hero").abilities, [15, 14, 14, 13, 11, 8]);
  assert.deepEqual(saved("Wizard hero").inventory, []);
  assert.equal(saved("Wizard hero").species, "Elf");
  await page.reload();
  assert.equal(
    await page.getByLabel("Constitution score", { exact: true }).inputValue(),
    "14",
  );
  await page
    .getByRole("button", { name: "My characters", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create character", exact: true })
    .click();
  await page.getByLabel("Existing character", { exact: true }).check();
  await page
    .getByLabel("Character name", { exact: true })
    .fill("Existing hero");
  await next();
  assert.equal(await kit.isChecked(), false);
  await next();
  assert.equal(
    await page.getByLabel("Ability score method", { exact: true }).inputValue(),
    "manual",
  );
  await page.getByLabel("Strength final score", { exact: true }).fill("18");
  await back();
  await next();
  assert.equal(
    await page.getByLabel("Strength final score", { exact: true }).inputValue(),
    "18",
  );
  await dialog
    .getByRole("button", { name: "Create character", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Existing hero", exact: true })
    .waitFor();
  assert.equal(saved("Existing hero").abilities[0], 18);
  assert.deepEqual(saved("Existing hero").inventory, []);
  assert.deepEqual(errors, []);
  console.log(
    "Three-page creation checks passed: separate pages, defaults, opt-out, point-buy budget/help, Back/Next state preservation, final-only creation, persistence and mobile layout.",
  );
} finally {
  if (browser) await browser.close();
  await new Promise((done) => server.close(done));
  db.close();
}
