import { backgrounds } from "../shared/backgrounds.mjs";
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
  const picker = page.getByLabel("Background", { exact: true });
  assert.equal(await picker.locator("optgroup option").count(), 16);
  for (const entry of backgrounds) {
    await picker.selectOption(entry.name);
    const panel = page.locator(".background-picker");
    await panel
      .getByText(`Origin feat: ${entry.feat}`, { exact: true })
      .waitFor();
    assert.ok((await panel.innerText()).includes(entry.skills.join(", ")));
  }
  await picker.selectOption("custom");
  await page.getByLabel("Custom background name").fill("Homebrew Wanderer");
  await picker.selectOption("Sage");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create character", exact: true })
    .click();
  await page.getByRole("button", { name: "Features", exact: true }).click();
  assert.equal(
    await page.getByLabel("Background", { exact: true }).inputValue(),
    "Sage",
  );
  const before = JSON.parse(
    db.prepare("SELECT data FROM characters").get().data,
  );
  await page.getByLabel("Background", { exact: true }).selectOption("Guard");
  await page.getByText("All changes saved", { exact: true }).waitFor();
  const after = JSON.parse(
    db.prepare("SELECT data FROM characters").get().data,
  );
  const { id: savedId, updated: savedAt, ...sheet } = after;
  assert.deepEqual(sheet, { ...before, background: "Guard" });
  await page.reload();
  await page.locator(".character-card").click();
  await page.getByRole("button", { name: "Features", exact: true }).click();
  assert.equal(
    await page.getByLabel("Background", { exact: true }).inputValue(),
    "Guard",
  );
  await page.getByLabel("Background", { exact: true }).selectOption("custom");
  await page.getByLabel("Custom background name").fill("Urchin");
  await page.getByText("All changes saved", { exact: true }).waitFor();
  await page.reload();
  await page.locator(".character-card").click();
  await page.getByRole("button", { name: "Features", exact: true }).click();
  assert.equal(
    await page.getByLabel("Custom background name").inputValue(),
    "Urchin",
  );
  await page.getByLabel("Background", { exact: true }).selectOption("Wayfarer");
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({
    path: "/tmp/character-keeper-backgrounds.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "Background browser checks passed: all 16 options, rules summaries, creation, editing, autosave, legacy/custom names, unchanged stats and mobile layout.",
  );
} finally {
  if (browser) await browser.close();
  await new Promise((done) => server.close(done));
  db.close();
}
