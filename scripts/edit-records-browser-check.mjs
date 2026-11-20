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
  await page.goto(base);
  await page.locator(".character-card").click();
  await page.getByRole("button", { name: "Inventory", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit Moon charm", exact: true })
    .click();
  let form = page.getByRole("form", { name: "Edit Moon charm", exact: true });
  await form.getByLabel("Name", { exact: true }).fill("Cancelled name");
  await form.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit Moon charm", exact: true })
    .click();
  form = page.getByRole("form", { name: "Edit Moon charm", exact: true });
  await form.getByLabel("Name", { exact: true }).fill("Leather +1");
  await form.getByLabel("Item details").fill("Updated charm notes");
  await form.getByLabel("Quantity", { exact: true }).fill("3");
  await form.getByRole("button", { name: "Save changes" }).click();
  assert.equal(
    await page.getByLabel("Equip Leather +1", { exact: true }).isChecked(),
    true,
  );
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  assert.equal(
    await page.getByLabel("Armor class", { exact: true }).inputValue(),
    "14",
  );
  await page.getByRole("button", { name: "Spells", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit Moon spark", exact: true })
    .click();
  form = page.getByRole("form", { name: "Edit Moon spark", exact: true });
  await form.getByLabel("Name", { exact: true }).fill("Other spell");
  await form.getByRole("button", { name: "Save changes" }).click();
  await form
    .getByRole("alert")
    .filter({ hasText: "already in your spellbook" })
    .waitFor();
  await form.getByLabel("Name", { exact: true }).fill("Moon flare");
  await form.getByLabel("Spell level").fill("0");
  await form.getByRole("button", { name: "Save changes" }).click();
  await form
    .getByRole("alert")
    .filter({ hasText: "Class cantrips known" })
    .waitFor();
  await form.getByLabel("Spell level").fill("2");
  await form
    .getByLabel("Spell description")
    .fill("Updated spell description\nSecond line");
  await form.getByRole("button", { name: "Save changes" }).click();
  assert.equal(
    await page.getByLabel("Prepare Moon flare", { exact: true }).isChecked(),
    true,
  );
  await page
    .getByRole("region", { name: "Level 2 spells", exact: true })
    .getByRole("button", { name: "Edit Moon flare", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Weapons", exact: true }).click();
  await page.getByLabel("Edit Moon blade", { exact: true }).click();
  const weapon = page.getByRole("article", {
    name: "Weapon Moon blade",
    exact: true,
  });
  await weapon.getByLabel("Weapon name", { exact: true }).fill("Sun blade");
  const renamed = page.getByRole("article", {
    name: "Weapon Sun blade",
    exact: true,
  });
  await renamed.getByLabel("Damage dice", { exact: true }).fill("2d6");
  await renamed
    .getByLabel("Weapon notes & description")
    .fill("Updated blade notes");
  await page.getByText("All changes saved", { exact: true }).waitFor();
  const saved = JSON.parse(
    db.prepare("SELECT data FROM characters").get().data,
  );
  assert.deepEqual(saved.inventory[0], {
    ...character.inventory[0],
    name: "Leather +1",
    quantity: 3,
    detail: "Updated charm notes",
  });
  assert.deepEqual(saved.spells[0], {
    ...character.spells[0],
    name: "Moon flare",
    level: 2,
    detail: "Updated spell description\nSecond line",
  });
  assert.equal(saved.weapons[0].id, "weapon");
  assert.equal(saved.weapons[0].name, "Sun blade");
  assert.equal(saved.weapons[0].damageDice, "2d6");
  assert.equal(saved.weapons[0].equipped, true);
  await page.reload();
  await page.getByRole("button", { name: "Inventory", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit Leather +1", exact: true })
    .waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Edit Leather +1", exact: true })
    .click();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Record editing checks passed: cancel, item/spell edits, duplicate and preparation-limit validation, spell level grouping, custom weapons, AC, stable IDs, equipment/preparation state, persistence and mobile layout.",
  );
} finally {
  if (browser) await browser.close();
  await new Promise((done) => server.close(done));
  db.close();
}
