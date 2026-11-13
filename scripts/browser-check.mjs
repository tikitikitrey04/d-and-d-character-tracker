import { chromium } from "@playwright/test";
import express from "express";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { createApp } from "../server/app.mjs";
import { setAdmin } from "../server/audit.mjs";

// An isolated database keeps QA accounts and characters out of the player's data.
const { app, db, audit } = createApp({
  databasePath: ":memory:",
  secureCookies: false,
});
app.use(express.static(resolve("dist")));
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
let browser;
try {
  browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: [
      "--host-resolver-rules=MAP character-keeper.test 127.0.0.1",
      "--no-proxy-server",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
    colorScheme: "light",
  });
  const page = await context.newPage();
  const errors = [];
  mkdirSync("artifacts", { recursive: true });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://character-keeper.test:${server.address().port}`);
  assert.equal(await page.evaluate(() => window.isSecureContext), false);
  assert.equal(
    await page.evaluate(() => typeof crypto.randomUUID),
    "undefined",
  );
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  await page
    .getByRole("button", { name: "Switch to dark theme", exact: true })
    .click();
  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "dark",
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem("keeper-theme")),
    "dark",
  );
  await page.reload();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  assert.equal(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).backgroundColor,
    ),
    "rgb(24, 24, 24)",
  );
  assert.equal(
    await page
      .locator(".auth-form")
      .evaluate((node) => getComputedStyle(node).backgroundColor),
    "rgb(36, 36, 36)",
  );
  await page.screenshot({ path: "artifacts/auth-dark.png" });
  // A separate browser follows system preference and works with storage blocked.
  const privateContext = await browser.newContext({ colorScheme: "dark" });
  const privatePage = await privateContext.newPage();
  await privatePage.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Storage disabled");
      },
    });
  });
  await privatePage.goto(
    `http://character-keeper.test:${server.address().port}`,
  );
  await privatePage.waitForFunction(
    () => document.documentElement.dataset.theme === "dark",
  );
  await privatePage.emulateMedia({ colorScheme: "light" });
  await privatePage.waitForFunction(
    () => document.documentElement.dataset.theme === "light",
  );
  await privatePage
    .getByRole("button", { name: "Switch to dark theme", exact: true })
    .click();
  await privatePage.waitForFunction(
    () => document.documentElement.dataset.theme === "dark",
  );
  await privateContext.close();
  await page.getByLabel("Your name").fill("Robin");
  await page.getByLabel("Email address").fill("robin@example.com");
  await page.getByLabel("Password", { exact: true }).fill("adventure-password");
  await page.getByRole("button", { name: "Begin your adventure" }).click();
  await page.getByRole("heading", { name: "My characters." }).waitFor();
  await page.getByRole("button", { name: "How to use", exact: true }).click();
  await page
    .getByRole("heading", { name: "How to use", exact: true })
    .waitFor();
  const guideTopics = page.getByRole("navigation", {
    name: "Guide topics",
    exact: true,
  });
  assert.equal(await guideTopics.getByRole("link").count(), 9);
  assert.equal(
    await page
      .getByRole("heading", { name: "Administrator tools", exact: true })
      .count(),
    0,
  );
  await guideTopics
    .getByRole("link", { name: "Export a player sheet", exact: true })
    .click();
  assert.equal(await page.evaluate(() => location.hash), "#guide-pdf");
  await page.locator("#guide-pdf").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/how-to-use-desktop.png" });
  await page
    .getByRole("button", { name: "Back to characters", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel("Navigate", { exact: true }).selectOption("help");
  await page
    .getByRole("heading", { name: "How to use", exact: true })
    .waitFor();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  await page
    .getByRole("heading", { name: "How to use", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/how-to-use-mobile.png" });
  await page
    .getByRole("button", { name: "Back to characters", exact: true })
    .click();
  await page.setViewportSize({ width: 1440, height: 1050 });
  // A second browser session must be invalidated by a successful password change.
  const otherContext = await browser.newContext();
  const otherLogin = await otherContext.request.post(
    `http://127.0.0.1:${server.address().port}/api/auth/login`,
    {
      headers: { "X-Keeper-Request": "1" },
      data: { email: "robin@example.com", password: "adventure-password" },
    },
  );
  assert.equal(otherLogin.status(), 200);
  await page
    .getByRole("button", { name: "Account settings", exact: true })
    .click();
  await page
    .getByLabel("Current password", { exact: true })
    .fill("adventure-password");
  await page
    .getByLabel("New password", { exact: true })
    .fill("updated-adventure-password");
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill("mismatched-password");
  await page
    .getByRole("button", { name: "Change password", exact: true })
    .click();
  await page
    .getByText("New passwords do not match.", { exact: true })
    .waitFor();
  await page
    .getByLabel("Current password", { exact: true })
    .fill("incorrect-password");
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill("updated-adventure-password");
  await page
    .getByRole("button", { name: "Change password", exact: true })
    .click();
  await page
    .getByText("Current password is incorrect.", { exact: true })
    .waitFor();
  await page
    .getByLabel("Current password", { exact: true })
    .fill("adventure-password");
  await page
    .getByRole("button", { name: "Change password", exact: true })
    .click();
  await page
    .getByText("Password changed. Your other sessions have been signed out.", {
      exact: true,
    })
    .waitFor();
  for (const label of [
    "Current password",
    "New password",
    "Confirm new password",
  ])
    assert.equal(
      await page.getByLabel(label, { exact: true }).inputValue(),
      "",
    );
  assert.equal(
    (
      await otherContext.request.get(
        `http://127.0.0.1:${server.address().port}/api/me`,
      )
    ).status(),
    401,
  );
  await otherContext.close();
  await page.screenshot({ path: "artifacts/account-settings-desktop.png" });
  await page
    .getByRole("button", { name: "Back to characters", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel("Navigate", { exact: true }).selectOption("account");
  await page
    .getByRole("heading", { name: "Account settings", exact: true })
    .waitFor();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  await page.screenshot({ path: "artifacts/account-settings-mobile.png" });
  await page
    .getByRole("button", { name: "Back to characters", exact: true })
    .click();
  await page.setViewportSize({ width: 1440, height: 1050 });
  assert.equal(
    await page.getByRole("button", { name: "Admin logs", exact: true }).count(),
    0,
  );
  assert.equal(
    await page.getByRole("button", { name: "Admin bugs", exact: true }).count(),
    0,
  );
  await page.getByRole("button", { name: "Report a bug", exact: true }).click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("Spell cast button is missing");
  await page
    .getByLabel("What went wrong?")
    .fill(
      "Expected a cast button. Found <script>window.bugScriptRan=true</script> text instead.",
    );
  await page
    .getByLabel("Steps to reproduce (optional)")
    .fill("1. Open the character\n2. Open Overview");
  await page
    .getByRole("button", { name: "Submit bug report", exact: true })
    .click();
  await page
    .getByText("Bug report submitted. Thank you!", { exact: true })
    .waitFor();
  await page
    .getByRole("heading", { name: "Spell cast button is missing", exact: true })
    .waitFor();
  assert.equal(await page.evaluate(() => window.bugScriptRan), undefined);
  assert.equal(await page.locator(".bug-card script").count(), 0);
  await page.screenshot({ path: "artifacts/bug-report-desktop.png" });
  await page
    .getByRole("button", { name: "Back to characters", exact: true })
    .click();
  setAdmin(db, "robin@example.com", true, audit);
  await page.reload();
  await page.getByRole("button", { name: "How to use", exact: true }).click();
  await page
    .getByRole("heading", { name: "Administrator tools", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Back to characters", exact: true })
    .click();
  await page.getByRole("button", { name: "Admin bugs", exact: true }).click();
  await page
    .getByRole("heading", { name: "Spell cast button is missing", exact: true })
    .waitFor();
  await page.getByText(/Reported by Robin/).waitFor();
  await page
    .getByLabel("Status for Spell cast button is missing", { exact: true })
    .selectOption("in_progress");
  await page.getByText("Report status updated.", { exact: true }).waitFor();
  await page
    .getByLabel("Report status", { exact: true })
    .selectOption("resolved");
  await page
    .getByText("No bug reports match this filter.", { exact: true })
    .waitFor();
  await page
    .getByLabel("Report status", { exact: true })
    .selectOption("in_progress");
  await page
    .getByRole("heading", { name: "Spell cast button is missing", exact: true })
    .waitFor();
  await page
    .getByLabel("Status for Spell cast button is missing", { exact: true })
    .selectOption("resolved");
  await page
    .getByText("No bug reports match this filter.", { exact: true })
    .waitFor();
  await page
    .getByLabel("Report status", { exact: true })
    .selectOption("resolved");
  await page
    .getByRole("heading", { name: "Spell cast button is missing", exact: true })
    .waitFor();
  await page.screenshot({ path: "artifacts/admin-bugs-desktop.png" });
  await page.getByRole("button", { name: "Report a bug", exact: true }).click();
  await page
    .locator(".bug-card .pill")
    .getByText("Resolved", { exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Admin logs", exact: true })
    .first()
    .click();
  await page.getByRole("heading", { name: "Application logs" }).waitFor();
  await page
    .getByRole("cell", { name: "admin.granted", exact: true })
    .waitFor();
  await page.getByLabel("Severity").selectOption("error");
  await page.getByText("No logs match this filter.").waitFor();
  await page.getByLabel("Severity").selectOption("");
  await page
    .getByRole("cell", { name: "auth.register", exact: true })
    .waitFor();
  await page.screenshot({ path: "artifacts/admin-logs-desktop.png" });
  await page
    .getByRole("button", { name: "Back to characters", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel("Navigate", { exact: true }).selectOption("bugs");
  await page
    .getByRole("heading", { name: "Spell cast button is missing", exact: true })
    .waitFor();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  await page.screenshot({ path: "artifacts/admin-bugs-mobile.png" });
  await page.getByLabel("Navigate", { exact: true }).selectOption("report");
  await page
    .getByRole("heading", { name: "Report a bug", exact: true })
    .waitFor();
  await page.screenshot({ path: "artifacts/bug-report-mobile.png" });
  await page.getByLabel("Navigate", { exact: true }).selectOption("logs");
  await page
    .getByRole("cell", { name: "admin.granted", exact: true })
    .waitFor();
  await page.screenshot({ path: "artifacts/admin-logs-mobile.png" });
  await page
    .getByRole("button", { name: "Back to characters", exact: true })
    .click();
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page
    .getByRole("button", { name: "Switch to light theme", exact: true })
    .click();
  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "light",
  );
  await page.emulateMedia({ colorScheme: "dark" });
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  await page.screenshot({ path: "artifacts/vault-light.png" });
  await page
    .getByRole("button", { name: "Switch to dark theme", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create your first character" })
    .click();
  await page.getByLabel("Character name", { exact: true }).fill("Mira Ashfall");
  await page.getByLabel("Class", { exact: true }).selectOption("Wizard");
  await page.getByLabel("Background", { exact: true }).fill("Sage");
  await page.screenshot({ path: "artifacts/builder-dark.png" });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create character", exact: true })
    .click();
  await page.getByRole("heading", { name: "Mira Ashfall" }).waitFor();
  await page.getByLabel("Temporary HP", { exact: true }).fill("3");
  await page.getByLabel("Damage or healing amount").fill("5");
  await page.getByRole("button", { name: "− Damage", exact: true }).click();
  assert.equal(
    await page.getByLabel("Temporary HP", { exact: true }).inputValue(),
    "0",
  );
  assert.match(await page.locator(".hp-value").innerText(), /^8/);
  await page.getByRole("button", { name: "+ Heal", exact: true }).click();
  assert.match(await page.locator(".hp-value").innerText(), /^10/);
  const resources = page
    .locator("section.panel")
    .filter({ has: page.getByRole("heading", { name: "Limited resources" }) });
  await resources.getByLabel("Name", { exact: true }).fill("Arcane Recovery");
  await resources
    .getByRole("button", { name: "Add resource", exact: true })
    .click();
  await resources
    .getByRole("button", { name: "Use Arcane Recovery", exact: true })
    .click();
  assert.match(await resources.locator(".stepper").innerText(), /0 \/ 1/);
  await page.getByRole("button", { name: "Spells", exact: true }).click();
  assert.equal(
    await page.getByLabel("Level 1", { exact: true }).inputValue(),
    "2",
  );
  assert.equal(
    await page.getByLabel("Level 1", { exact: true }).isEditable(),
    false,
  );
  await page
    .getByRole("button", { name: "Level 1 slot 1: available", exact: true })
    .click();
  const picker = page.locator(".spell-picker");
  await picker.getByLabel("Available spell", { exact: true }).waitFor();
  assert.equal(
    await picker.locator('option[value="srd-2024_fireball"]').count(),
    0,
  );
  assert.equal(
    await picker.locator('option[value="srd-2024_bless"]').count(),
    0,
  );
  await picker.getByLabel("Spell level", { exact: true }).selectOption("1");
  assert.equal(
    await picker.locator('option[value="srd-2024_light"]').count(),
    0,
  );
  await picker.getByLabel("Spell level", { exact: true }).selectOption("0");
  await picker.getByLabel("Search spells", { exact: true }).fill("light");
  await picker
    .getByLabel("Available spell", { exact: true })
    .selectOption("srd-2024_light");
  assert.match(
    await picker.getByLabel("Spell description", { exact: true }).inputValue(),
    /Bright Light in a 20-foot radius/,
  );
  await page.getByRole("button", { name: "Add spell", exact: true }).click();
  assert.ok(
    await picker.locator('option[value="srd-2024_light"]').isDisabled(),
  );
  assert.ok(
    await page
      .getByRole("checkbox", { name: "Known Light", exact: true })
      .isChecked(),
  );
  await picker.getByLabel("Search spells", { exact: true }).fill("");
  await picker.getByLabel("Spell level", { exact: true }).selectOption("1");
  await picker
    .getByLabel("Available spell", { exact: true })
    .selectOption("srd-2024_magic-missile");
  await page.getByRole("button", { name: "Add spell", exact: true }).click();
  // Leveling unlocks higher spell levels without changing the existing spellbook.
  await page.getByRole("button", { name: "Features", exact: true }).click();
  await page.getByLabel("Level", { exact: true }).fill("5");
  await page.getByRole("button", { name: "Spells", exact: true }).click();
  assert.equal(
    await page.getByLabel("Level 1", { exact: true }).inputValue(),
    "4",
  );
  assert.equal(
    await page.getByLabel("Level 2", { exact: true }).inputValue(),
    "3",
  );
  assert.equal(
    await page.getByLabel("Level 3", { exact: true }).inputValue(),
    "2",
  );
  await page
    .getByRole("button", { name: "Level 1 slot 1: expended", exact: true })
    .waitFor();
  await page
    .getByRole("checkbox", { name: "Manual override", exact: true })
    .check();
  await page.getByLabel("Level 1", { exact: true }).fill("7");
  await page.getByRole("button", { name: "Features", exact: true }).click();
  await page.getByLabel("Level", { exact: true }).fill("6");
  await page.getByRole("button", { name: "Spells", exact: true }).click();
  assert.equal(
    await page.getByLabel("Level 1", { exact: true }).inputValue(),
    "7",
  );
  await picker
    .getByLabel("Available spell", { exact: true })
    .selectOption("srd-2024_fireball");
  assert.match(
    await picker.getByLabel("Spell description", { exact: true }).inputValue(),
    /8d6 Fire damage/,
  );
  assert.match(
    await picker.getByLabel("Spell description", { exact: true }).inputValue(),
    /Using a higher-level spell slot:/,
  );
  await page.getByRole("button", { name: "Add spell", exact: true }).click();
  // Special access and custom entry cover features and homebrew.
  await picker
    .getByLabel("Spell access", { exact: true })
    .selectOption("special");
  await picker
    .getByLabel("Available spell", { exact: true })
    .selectOption("srd-2024_wish");
  assert.ok(
    (await picker.getByLabel("Spell description", { exact: true }).inputValue())
      .length > 2000,
  );
  await page.getByRole("button", { name: "Add spell", exact: true }).click();
  await picker
    .getByRole("button", { name: "Custom spell", exact: true })
    .click();
  await picker.getByLabel("Spell name", { exact: true }).fill("Robin's Spark");
  await picker
    .getByLabel("Spell description", { exact: true })
    .fill("A tiny homebrew spark.");
  await page.getByRole("button", { name: "Add spell", exact: true }).click();
  // Preparation counts are independent of slots and of library size.
  await page
    .getByRole("checkbox", { name: "Manual preparation limits", exact: true })
    .check();
  await page.getByLabel("Cantrip limit", { exact: true }).fill("2");
  await page.getByLabel("Prepared spell limit", { exact: true }).fill("1");
  await page
    .getByRole("checkbox", { name: "Prepare Magic Missile", exact: true })
    .check();
  assert.ok(
    await page
      .getByRole("checkbox", { name: "Prepare Fireball", exact: true })
      .isDisabled(),
  );
  await page
    .getByRole("checkbox", { name: "Prepare Magic Missile", exact: true })
    .uncheck();
  await page
    .getByRole("checkbox", { name: "Prepare Fireball", exact: true })
    .check();
  assert.ok(
    await page
      .getByRole("checkbox", { name: "Prepare Magic Missile", exact: true })
      .isDisabled(),
  );
  await picker.getByLabel("Spell name", { exact: true }).fill("Feature Spark");
  await picker
    .getByLabel("Spell description", { exact: true })
    .fill("An extra cantrip from a feature.");
  assert.ok(
    await page
      .getByRole("button", { name: "Add spell", exact: true })
      .isDisabled(),
  );
  await picker
    .getByRole("alert")
    .filter({ hasText: "Class cantrips known" })
    .waitFor();
  await picker
    .getByLabel("Spell source", { exact: true })
    .selectOption("granted");
  await page.getByRole("button", { name: "Add spell", exact: true }).click();
  assert.ok(
    await page
      .getByRole("checkbox", { name: "Known Feature Spark", exact: true })
      .isChecked(),
  );
  await page.getByRole("button", { name: "Inventory", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Spellbook");
  await page.getByRole("button", { name: "Add item", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "Equip Spellbook", exact: true })
    .check();
  await page.getByRole("button", { name: "Journal", exact: true }).click();
  await page
    .getByPlaceholder("Our story begins…")
    .fill("Found a silver key beneath the old oak.");
  await page
    .getByRole("button", { name: "Save character", exact: true })
    .click();
  await page.getByText("All changes saved", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "My characters", exact: true })
    .click();
  await page
    .getByRole("button")
    .filter({ has: page.getByRole("heading", { name: "Mira Ashfall" }) })
    .click();
  await page.getByRole("button", { name: "Journal", exact: true }).click();
  assert.equal(
    await page.getByPlaceholder("Our story begins…").inputValue(),
    "Found a silver key beneath the old oak.",
  );
  await page.getByRole("button", { name: "Spells", exact: true }).click();
  const spellRecords = page
    .locator(".panel")
    .filter({
      has: page.getByRole("heading", { name: "Spellbook", exact: true }),
    })
    .locator(".records");
  assert.match(
    await spellRecords.innerText(),
    /Bright Light in a 20-foot radius/,
  );
  assert.match(await spellRecords.innerText(), /8d6 Fire damage/);
  assert.match(await spellRecords.innerText(), /33 percent chance/);
  assert.match(await spellRecords.innerText(), /A tiny homebrew spark/);
  assert.deepEqual(await spellRecords.getByRole("heading").allTextContents(), [
    "Cantrips",
    "Level 1 spells",
    "Level 3 spells",
    "Level 9 spells",
  ]);
  const cantrips = spellRecords.getByRole("region", {
    name: "Cantrips",
    exact: true,
  });
  assert.ok(
    await cantrips
      .getByRole("checkbox", { name: "Known Light", exact: true })
      .isChecked(),
  );
  assert.ok((await cantrips.innerText()).includes("Robin's Spark"));
  assert.equal(await cantrips.locator(".record").count(), 3);
  assert.equal(
    await page.getByLabel("Cantrip limit", { exact: true }).inputValue(),
    "2",
  );
  assert.equal(
    await page.getByLabel("Prepared spell limit", { exact: true }).inputValue(),
    "1",
  );
  assert.ok(
    await page
      .getByRole("checkbox", { name: "Prepare Fireball", exact: true })
      .isChecked(),
  );
  assert.ok(
    await page
      .getByRole("checkbox", { name: "Prepare Magic Missile", exact: true })
      .isDisabled(),
  );
  assert.equal(
    await page
      .getByLabel("Preparation source for Feature Spark", { exact: true })
      .inputValue(),
    "granted",
  );
  assert.match(
    await spellRecords
      .getByRole("region", { name: "Level 1 spells", exact: true })
      .innerText(),
    /Magic Missile/,
  );
  assert.match(
    await spellRecords
      .getByRole("region", { name: "Level 3 spells", exact: true })
      .innerText(),
    /Fireball/,
  );
  assert.match(
    await spellRecords
      .getByRole("region", { name: "Level 9 spells", exact: true })
      .innerText(),
    /Wish/,
  );
  assert.ok(
    await page
      .getByRole("checkbox", { name: "Known Light", exact: true })
      .isChecked(),
  );
  assert.equal(
    await page.getByLabel("Level 1", { exact: true }).inputValue(),
    "7",
  );
  assert.ok(
    await page
      .getByRole("checkbox", { name: "Manual override", exact: true })
      .isChecked(),
  );
  await page
    .getByRole("checkbox", { name: "Manual override", exact: true })
    .uncheck();
  assert.equal(
    await page.getByLabel("Level 1", { exact: true }).inputValue(),
    "4",
  );
  assert.equal(
    await page.getByLabel("Level 3", { exact: true }).inputValue(),
    "3",
  );
  assert.equal(
    await page.getByLabel("Level 1", { exact: true }).isEditable(),
    false,
  );
  await page
    .getByRole("button", { name: "Save character", exact: true })
    .click();
  await page.getByText("All changes saved", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "My characters", exact: true })
    .click();
  await page
    .getByRole("button")
    .filter({ has: page.getByRole("heading", { name: "Mira Ashfall" }) })
    .click();
  await page.getByRole("button", { name: "Spells", exact: true }).click();
  assert.equal(
    await page
      .getByRole("checkbox", { name: "Manual override", exact: true })
      .isChecked(),
    false,
  );
  assert.equal(
    await page.getByLabel("Level 1", { exact: true }).inputValue(),
    "4",
  );
  await page
    .getByRole("button", { name: "Level 1 slot 1: expended", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Inventory", exact: true }).click();
  assert.ok(
    await page
      .getByRole("checkbox", { name: "Equip Spellbook", exact: true })
      .isChecked(),
  );
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  const overviewSpells = page.getByRole("region", {
    name: "Prepared spells overview",
    exact: true,
  });
  assert.ok(await overviewSpells.isVisible());
  // Catalog weapons, class filters, hand/mastery limits, stock and Overview attacks.
  await page.getByRole("button", { name: "Weapons", exact: true }).click();
  const weaponPicker = page.locator("section.panel").filter({
    has: page.getByRole("heading", { name: "Add a weapon", exact: true }),
  });
  assert.equal(
    await weaponPicker.locator('option[value="longsword"]').count(),
    0,
  );
  await weaponPicker
    .getByLabel("Proficient weapons for my class only", { exact: true })
    .uncheck();
  assert.equal(
    await weaponPicker.locator('option[value="longsword"]').count(),
    1,
  );
  await weaponPicker
    .getByLabel("Proficient weapons for my class only", { exact: true })
    .check();
  await weaponPicker
    .getByLabel("Available weapon", { exact: true })
    .selectOption("dagger");
  assert.match(
    await weaponPicker
      .getByLabel("Weapon description", { exact: true })
      .inputValue(),
    /Finesse, Light, Thrown/,
  );
  await weaponPicker.getByLabel("Weapon quantity", { exact: true }).fill("2");
  await weaponPicker.getByLabel("Equip when added", { exact: true }).check();
  await weaponPicker
    .getByRole("button", { name: "Add weapon", exact: true })
    .click();
  const dagger = page.getByRole("article", {
    name: "Weapon Dagger",
    exact: true,
  });
  assert.ok(await dagger.getByLabel("Equipped", { exact: true }).isChecked());
  await page.getByLabel("Manual weapon limits", { exact: true }).check();
  await page.getByLabel("Weapon mastery limit", { exact: true }).fill("1");
  await dagger.getByLabel("Mastery selected", { exact: true }).check();
  await weaponPicker
    .getByLabel("Available weapon", { exact: true })
    .selectOption("shortbow");
  await weaponPicker
    .getByLabel("Starting ammunition", { exact: true })
    .fill("2");
  await weaponPicker.getByLabel("Equip when added", { exact: true }).check();
  assert.ok(
    await weaponPicker
      .getByRole("button", { name: "Add weapon", exact: true })
      .isDisabled(),
  );
  await weaponPicker
    .getByRole("alert")
    .filter({ hasText: "need 3 hands" })
    .waitFor();
  await weaponPicker.getByLabel("Equip when added", { exact: true }).uncheck();
  await weaponPicker
    .getByRole("button", { name: "Add weapon", exact: true })
    .click();
  await weaponPicker
    .getByRole("button", { name: "Custom weapon", exact: true })
    .click();
  await weaponPicker
    .getByLabel("Weapon name", { exact: true })
    .fill("Test Blade");
  await weaponPicker
    .getByRole("button", { name: "Add weapon", exact: true })
    .click();
  const blade = page.getByRole("article", {
    name: "Weapon Test Blade",
    exact: true,
  });
  await blade
    .getByText("Edit weapon, bonuses & resources", { exact: true })
    .click();
  await blade
    .getByLabel("Magic bonus (attack & damage)", { exact: true })
    .fill("2");
  await blade.getByLabel("Track limited weapon uses", { exact: true }).check();
  await blade
    .getByText("Edit weapon, bonuses & resources", { exact: true })
    .click();
  await page.screenshot({
    path: "artifacts/weapons-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  const armed = page.getByRole("region", {
    name: "Equipped weapons overview",
    exact: true,
  });
  await armed
    .getByRole("button", { name: "Attack with Dagger (Throw)", exact: true })
    .click();
  await armed
    .getByRole("button", { name: "Attack with Dagger (Throw)", exact: true })
    .click();
  assert.ok(
    await armed
      .getByRole("button", { name: "Attack with Dagger (Throw)", exact: true })
      .isDisabled(),
  );
  await armed
    .getByRole("button", { name: "Manage weapons", exact: true })
    .click();
  assert.equal(
    await dagger
      .getByLabel("Quantity for Dagger", { exact: true })
      .inputValue(),
    "0",
  );
  const bow = page.getByRole("article", {
    name: "Weapon Shortbow",
    exact: true,
  });
  await bow.getByLabel("Equipped", { exact: true }).check();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await armed
    .getByRole("button", { name: "Attack with Shortbow (Ranged)", exact: true })
    .click();
  await armed
    .getByRole("button", { name: "Attack with Shortbow (Ranged)", exact: true })
    .click();
  assert.ok(
    await armed
      .getByRole("button", {
        name: "Attack with Shortbow (Ranged)",
        exact: true,
      })
      .isDisabled(),
  );
  await armed
    .getByRole("button", { name: "Manage weapons", exact: true })
    .click();
  assert.equal(
    await bow
      .getByLabel("Ammunition for Shortbow", { exact: true })
      .inputValue(),
    "0",
  );
  await bow.getByLabel("Equipped", { exact: true }).uncheck();
  await blade.getByLabel("Equipped", { exact: true }).check();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await armed
    .getByRole("button", {
      name: "Attack with Test Blade (Melee)",
      exact: true,
    })
    .click();
  assert.ok(
    await armed
      .getByRole("button", {
        name: "Attack with Test Blade (Melee)",
        exact: true,
      })
      .isDisabled(),
  );
  await page
    .getByRole("button", { name: "Save character", exact: true })
    .click();
  await page.getByText("All changes saved", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "My characters", exact: true })
    .click();
  await page
    .getByRole("button")
    .filter({ has: page.getByRole("heading", { name: "Mira Ashfall" }) })
    .click();
  assert.ok(
    await armed
      .getByRole("button", {
        name: "Attack with Test Blade (Melee)",
        exact: true,
      })
      .isDisabled(),
  );
  await page.getByRole("button", { name: "Weapons", exact: true }).click();
  assert.equal(
    await bow
      .getByLabel("Ammunition for Shortbow", { exact: true })
      .inputValue(),
    "0",
  );
  assert.equal(
    await dagger
      .getByLabel("Quantity for Dagger", { exact: true })
      .inputValue(),
    "0",
  );
  assert.ok(
    await dagger.getByLabel("Mastery selected", { exact: true }).isChecked(),
  );
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  assert.ok(
    await page.evaluate(() => {
      const skills = [...document.querySelectorAll("section.panel")].find(
        (p) => p.querySelector("h3")?.textContent === "Skills & saving throws",
      );
      return skills?.nextElementSibling?.classList.contains("overview-spells");
    }),
  );
  assert.match(await overviewSpells.innerText(), /Fireball/);
  assert.match(await overviewSpells.innerText(), /Light/);
  assert.match(await overviewSpells.innerText(), /Feature Spark/);
  assert.ok(!(await overviewSpells.innerText()).includes("Magic Missile"));
  assert.ok(!(await overviewSpells.innerText()).includes("Wish"));
  const overviewSlots = overviewSpells.getByRole("region", {
    name: "Overview spell slots",
    exact: true,
  });
  assert.deepEqual(await overviewSlots.locator("dt").allTextContents(), [
    "Level 1",
    "Level 2",
    "Level 3",
  ]);
  assert.deepEqual(await overviewSlots.locator("dd").allTextContents(), [
    "3 / 4 available",
    "3 / 3 available",
    "3 / 3 available",
  ]);
  assert.match(await overviewSlots.innerText(), /9 remaining/);
  await overviewSpells
    .locator("details")
    .filter({ hasText: "Fireball" })
    .locator("summary")
    .click();
  assert.match(await overviewSpells.innerText(), /8d6 Fire damage/);
  await overviewSpells
    .getByRole("button", { name: "Cast Light", exact: true })
    .click();
  assert.match(await overviewSlots.innerText(), /9 remaining/);
  assert.match(
    await overviewSpells.locator(".cast-feedback").innerText(),
    /No spell slot used/,
  );
  await overviewSpells
    .getByRole("button", { name: "Cast Fireball at level 3", exact: true })
    .click();
  assert.match(await overviewSlots.innerText(), /8 remaining/);
  assert.match(
    await overviewSpells.locator(".cast-feedback").innerText(),
    /level 3 spell slot/,
  );
  await page
    .getByRole("button", { name: "Save character", exact: true })
    .click();
  await page.getByText("All changes saved", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "My characters", exact: true })
    .click();
  await page
    .getByRole("button")
    .filter({ has: page.getByRole("heading", { name: "Mira Ashfall" }) })
    .click();
  assert.match(await overviewSlots.innerText(), /8 remaining/);
  await overviewSpells
    .getByRole("button", { name: "Manage spells", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Level 3 slot 1: expended", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  assert.match(await overviewSlots.innerText(), /8 remaining/);
  await overviewSpells
    .getByRole("button", { name: "Cast Fireball at level 3", exact: true })
    .click();
  await overviewSpells
    .getByRole("button", { name: "Cast Fireball at level 3", exact: true })
    .click();
  assert.equal(
    await overviewSpells
      .getByRole("button", { name: "Cast Fireball at level 3", exact: true })
      .isDisabled(),
    true,
  );
  assert.equal(
    await overviewSpells
      .getByRole("button", { name: "Cast Light", exact: true })
      .isEnabled(),
    true,
  );
  assert.match(await overviewSlots.innerText(), /6 remaining/);
  await overviewSpells
    .getByRole("button", { name: "Manage spells", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Level 3 slot 1: expended", exact: true })
    .click();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  // A spell appears once with one casting button per configured slot level.
  await overviewSpells
    .getByRole("button", { name: "Manage spells", exact: true })
    .click();
  await page.getByLabel("Prepared spell limit", { exact: true }).fill("2");
  await page
    .getByRole("checkbox", { name: "Prepare Magic Missile", exact: true })
    .check();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  const missileGroup = overviewSpells.getByRole("region", {
    name: "Overview level 1 prepared spells",
    exact: true,
  });
  assert.equal(
    await overviewSpells
      .locator(".overview-spell-entry summary strong")
      .filter({ hasText: "Magic Missile" })
      .count(),
    1,
  );
  for (const level of [1, 2, 3])
    assert.ok(
      await missileGroup
        .getByRole("button", {
          name: "Cast Magic Missile at level " + level,
          exact: true,
        })
        .isEnabled(),
    );
  await missileGroup
    .getByRole("button", { name: "Cast Magic Missile at level 2", exact: true })
    .click();
  assert.deepEqual(await overviewSlots.locator("dd").allTextContents(), [
    "3 / 4 available",
    "2 / 3 available",
    "3 / 3 available",
  ]);
  await missileGroup
    .getByRole("button", { name: "Cast Magic Missile at level 2", exact: true })
    .click();
  await missileGroup
    .getByRole("button", { name: "Cast Magic Missile at level 2", exact: true })
    .click();
  assert.ok(
    await missileGroup
      .getByRole("button", {
        name: "Cast Magic Missile at level 2",
        exact: true,
      })
      .isDisabled(),
  );
  assert.ok(
    await missileGroup
      .getByRole("button", {
        name: "Cast Magic Missile at level 1",
        exact: true,
      })
      .isEnabled(),
  );
  assert.ok(
    await missileGroup
      .getByRole("button", {
        name: "Cast Magic Missile at level 3",
        exact: true,
      })
      .isEnabled(),
  );
  await missileGroup
    .getByRole("button", { name: "Cast Magic Missile at level 3", exact: true })
    .click();
  assert.deepEqual(await overviewSlots.locator("dd").allTextContents(), [
    "3 / 4 available",
    "0 / 3 available",
    "2 / 3 available",
  ]);
  await overviewSpells
    .getByRole("button", { name: "Manage spells", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Level 2 slot 1: expended", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Level 3 slot 1: expended", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: "Prepare Magic Missile", exact: true })
    .uncheck();
  await page.getByLabel("Prepared spell limit", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.getByTitle("Roll Strength", { exact: true }).click();
  await page.getByRole("status").waitFor();
  mkdirSync("artifacts", { recursive: true });
  await page.screenshot({
    path: "artifacts/character-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const tab of [
    "Overview",
    "Spells",
    "Weapons",
    "Inventory",
    "Features",
    "Journal",
  ]) {
    await page.getByRole("button", { name: tab, exact: true }).click();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `Mobile overflow in ${tab}`,
    );
    if (tab === "Spells")
      await page.screenshot({ path: "artifacts/spell-preparation-mobile.png" });
    assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  }
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.screenshot({
    path: "artifacts/character-mobile.png",
    fullPage: true,
  });
  // PDF export includes unsaved edits and all tabs, without app controls.
  await page.getByRole("button", { name: "Journal", exact: true }).click();
  const exportNotes =
    "Unsaved player notes: <silver key> & a new quest.\n" +
    Array.from(
      { length: 110 },
      (_, i) =>
        `Session ${i + 1}: Followed the river toward the old keep. Found an ally and made camp before nightfall.`,
    ).join("\n") +
    "\nFINAL JOURNAL ENTRY";
  await page.getByPlaceholder("Our story begins…").fill(exportNotes);
  await page.evaluate(() => {
    window.print = () => {
      window.dispatchEvent(new Event("beforeprint"));
      window.exportTitle = document.title;
      window.printCalled = true;
      window.dispatchEvent(new Event("afterprint"));
    };
  });
  await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  assert.equal(await page.evaluate(() => window.printCalled), true);
  assert.equal(
    await page.evaluate(() => window.exportTitle),
    "Mira Ashfall - Character Sheet",
  );
  assert.equal(await page.title(), "Character Keeper");
  await page.emulateMedia({ media: "print" });
  assert.equal(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).colorScheme,
    ),
    "light",
  );
  assert.equal(
    await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
    "rgb(255, 255, 255)",
  );
  const printable = page.locator(".character-print-root");
  assert.ok(await printable.isVisible());
  assert.equal(await page.locator("#root").isVisible(), false);
  const printedText = await printable.innerText();
  for (const content of [
    "Saving throws",
    "Skills",
    "Arcane Recovery",
    "Light",
    "Spellbook",
    "Unsaved player notes: <silver key> & a new quest.",
    "FINAL JOURNAL ENTRY",
    "Using a higher-level spell slot:",
    "33 percent chance",
    "Creative Commons Attribution 4.0",
    "Automatic class progression",
    "Weapons & mastery",
    "Shortbow",
    "Test Blade",
    "0 ammunition",
    "Class cantrips known: 2 / 2",
    "Prepared class spells: 1 / 1",
    "Bonus cantrip",
  ])
    assert.ok(
      printedText.includes(content),
      `Missing printed content: ${content}`,
    );
  assert.equal(await printable.locator("script").count(), 0);
  const pdf = await page.pdf({
    path: "artifacts/character-sheet.pdf",
    format: "Letter",
    preferCSSPageSize: true,
  });
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.ok(
    (pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) || []).length >= 3,
    "Long journal should span multiple PDF pages",
  );
  await page.setViewportSize({ width: 816, height: 1056 });
  await page.screenshot({ path: "artifacts/character-print-preview.png" });
  await page.pdf({
    path: "artifacts/character-sheet-a4.pdf",
    format: "A4",
    preferCSSPageSize: true,
  });
  await page.emulateMedia({ media: "screen" });
  assert.equal(await printable.isVisible(), false);
  assert.ok(
    await page
      .getByRole("button", { name: "Export PDF", exact: true })
      .isVisible(),
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByRole("heading", { name: "An adventure awaits." }).waitFor();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  assert.deepEqual(errors, []);
  console.log(
    "Browser checks passed: desktop/mobile How to use guide, password changes and session invalidation, account settings, bug reporting and admin status updates, admin logs, player accounts, spell and weapon management, casting and attack resource tracking, all six mobile tabs, dark/light themes, and Letter/A4 PDF export.",
  );
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
  db.close();
}
