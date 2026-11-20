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
  const speed = page.getByLabel("Speed in feet");
  await speed.fill("");
  assert.equal(await speed.inputValue(), "");
  // Saving another change must not commit a focused empty draft.
  await page
    .getByRole("button", { name: "Save character", exact: true })
    .evaluate((button) => button.click());
  assert.equal(await speed.inputValue(), "");
  await speed.pressSequentially("45");
  assert.equal(await speed.inputValue(), "45");
  await speed.fill("");
  await speed.press("Tab");
  assert.equal(await speed.inputValue(), "0");
  await speed.fill("");
  await speed.press("Enter");
  assert.equal(await speed.inputValue(), "0");
  await speed.fill("");
  await speed.pressSequentially("30");
  await speed.press("Enter");
  assert.equal(await speed.inputValue(), "30");
  const hp = page.getByLabel("Maximum HP", { exact: true });
  await hp.fill("");
  assert.equal(await hp.inputValue(), "");
  await hp.press("Tab");
  assert.equal(await hp.inputValue(), "1");
  await page.getByRole("button", { name: "Inventory", exact: true }).click();
  const adjustment = page.getByLabel("AC adjustment (magic, traits, effects)");
  await adjustment.fill("");
  await adjustment.pressSequentially("-2");
  assert.equal(await adjustment.inputValue(), "-2");
  await adjustment.press("Enter");
  assert.equal(await adjustment.inputValue(), "-2");
  await adjustment.fill("");
  await adjustment.press("Tab");
  assert.equal(await adjustment.inputValue(), "0");
  await page.getByText("All changes saved", { exact: true }).waitFor();
  await page.reload();
  await page.locator(".character-card").click();
  assert.equal(await page.getByLabel("Speed in feet").inputValue(), "30");
  assert.equal(
    await page.getByLabel("Maximum HP", { exact: true }).inputValue(),
    "1",
  );
  assert.equal(
    await page
      .getByLabel("Armor class", { exact: true })
      .getAttribute("readonly"),
    "",
  );
  assert.deepEqual(errors, []);
  console.log(
    "Numeric input browser checks passed: empty drafts, replacement typing, blur, Enter, minimum bounds, negative values, autosave and reload.",
  );
} finally {
  if (browser) await browser.close();
  await new Promise((done) => server.close(done));
  db.close();
}
