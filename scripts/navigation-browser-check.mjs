import assert from "node:assert/strict";
import express from "express";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { createApp } from "../server/app.mjs";
import { blankCharacter } from "../shared/character.mjs";
import { makeWeapon, weaponCatalog } from "../shared/weapon-catalog.mjs";

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
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { "X-Keeper-Request": "1" };
  assert.equal(
    (
      await page.request.post(`${base}/api/auth/register`, {
        headers,
        data: {
          name: "Editor",
          email: "editor@example.com",
          password: "test-editor-password",
        },
      })
    ).status(),
    200,
  );
  const character = {
    ...blankCharacter(),
    name: "Custom hero",
    class: "Wizard",
    level: 5,
    spellLimitOverride: true,
    cantripLimit: 0,
    preparedSpellLimit: 10,
    inventory: [
      {
        id: "item",
        name: "Moon charm",
        detail: "Original notes",
        quantity: 2,
        equipped: true,
      },
    ],
    spells: [
      {
        id: "spell",
        name: "Moon spark",
        detail: "Original spell",
        level: 1,
        prepared: true,
        preparationSource: "class",
      },
      {
        id: "other",
        name: "Other spell",
        detail: "",
        level: 1,
        prepared: false,
      },
    ],
    weapons: [
      {
        ...makeWeapon(
          { ...weaponCatalog[0], key: "", name: "Moon blade" },
          "weapon",
        ),
        equipped: true,
      },
    ],
  };
  assert.equal(
    (
      await page.request.post(`${base}/api/characters`, {
        headers,
        data: character,
      })
    ).status(),
    201,
  );
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(base);
  await page.locator(".character-card").click();
  await page.waitForFunction(() =>
    new URLSearchParams(location.search).has("character"),
  );
  const characterUrl = page.url();
  for (const tab of [
    "Overview",
    "Spells",
    "Weapons",
    "Inventory",
    "Features",
    "Journal",
  ]) {
    await page.getByRole("button", { name: tab, exact: true }).click();
    await page.waitForFunction(
      (tab) =>
        (new URLSearchParams(location.search).get("tab") || "Overview") === tab,
      tab,
    );
    await page.reload();
    await page
      .getByRole("heading", { name: "Custom hero", exact: true })
      .waitFor();
    assert.match(
      await page
        .getByRole("button", { name: tab, exact: true })
        .getAttribute("class"),
      /active/,
    );
  }
  for (const title of ["How to use", "Account settings", "Report a bug"]) {
    await page.getByRole("button", { name: title, exact: true }).click();
    await page.getByRole("heading", { name: title, exact: true }).waitFor();
    await page.reload();
    await page.getByRole("heading", { name: title, exact: true }).waitFor();
  }
  await page.goto(base + "/?page=archive");
  await page
    .getByRole("heading", { name: "Character archive", exact: true })
    .waitFor();
  await page.reload();
  await page
    .getByRole("heading", { name: "Character archive", exact: true })
    .waitFor();
  await page.goto(base + "/?page=logs");
  await page.locator(".character-card").waitFor();
  assert.equal(new URL(page.url()).searchParams.has("page"), false);
  await page.goto(
    base + "/?character=deleted-or-other-users-character&tab=Journal",
  );
  await page.locator(".character-card").waitFor();
  assert.equal(new URL(page.url()).searchParams.has("character"), false);
  await page
    .getByRole("button", { name: "Create character", exact: true })
    .click();
  await page.getByRole("dialog").waitFor();
  await page.reload();
  await page.locator(".character-card").waitFor();
  assert.equal(await page.getByRole("dialog").count(), 0);
  await page.goto(characterUrl);
  await page
    .getByRole("heading", { name: "Custom hero", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByLabel("Email address").waitFor();
  assert.equal(new URL(page.url()).searchParams.has("character"), false);
  assert.deepEqual(errors, []);
  console.log(
    "Navigation reload checks passed: all sheet tabs, help/account/reports/archive, unavailable characters, role checks, popup dismissal and sign-out.",
  );
} finally {
  if (browser) await browser.close();
  await new Promise((done) => server.close(done));
  db.close();
}
