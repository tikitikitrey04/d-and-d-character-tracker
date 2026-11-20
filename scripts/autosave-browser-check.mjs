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
  await page.getByRole("button", { name: "Journal", exact: true }).click();
  const journal = page.getByPlaceholder("Our story begins…");
  const writes = [];
  let fail = false,
    release;
  await page.route("**/api/characters/*", async (route) => {
    if (route.request().method() !== "PUT") return route.continue();
    writes.push(route.request().postDataJSON());
    if (fail)
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Test connection failure" }),
      });
    if (release === "hold")
      await new Promise((done) => {
        release = done;
      });
    await route.continue();
  });
  await journal.fill("first draft");
  await journal.fill("latest draft");
  await page.getByText("All changes saved", { exact: true }).waitFor();
  assert.equal(writes.length, 1);
  assert.equal(writes[0].notes, "latest draft");
  await page.reload();
  await page
    .locator(".character-card")
    .filter({ hasText: "Autosaved hero" })
    .click();
  await page.getByRole("button", { name: "Journal", exact: true }).click();
  assert.equal(await journal.inputValue(), "latest draft");

  release = "hold";
  await journal.fill("request in progress");
  await page.getByText("Saving…", { exact: true }).first().waitFor();
  await journal.fill("edited during save");
  const before = writes.length;
  // A held request must not be joined by another write after the debounce interval.
  await page.waitForTimeout(1200);
  assert.equal(writes.length, before);
  release();
  release = null;
  await page.getByText("All changes saved", { exact: true }).waitFor();
  assert.equal(await journal.inputValue(), "edited during save");
  assert.equal(writes.at(-1).notes, "edited during save");

  fail = true;
  await journal.fill("retain after failure");
  await page
    .getByRole("alert")
    .filter({ hasText: "Autosave failed" })
    .waitFor();
  assert.equal(await journal.inputValue(), "retain after failure");
  const failedWrites = writes.length;
  await page.waitForTimeout(1200);
  assert.equal(writes.length, failedWrites);
  fail = false;
  await page
    .getByRole("button", { name: "Save character", exact: true })
    .click();
  await page.getByText("All changes saved", { exact: true }).waitFor();
  await page.reload();
  await page
    .locator(".character-card")
    .filter({ hasText: "Autosaved hero" })
    .click();
  await page.getByRole("button", { name: "Journal", exact: true }).click();
  assert.equal(await journal.inputValue(), "retain after failure");
  await page.setViewportSize({ width: 390, height: 844 });
  await journal.fill("mobile autosave");
  await page.getByText("All changes saved", { exact: true }).waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Autosave browser checks passed: debounce, persistence, serialized writes, edits during saves, failure recovery, and mobile layout.",
  );
} finally {
  if (browser) await browser.close();
  await new Promise((done) => server.close(done));
  db.close();
}
