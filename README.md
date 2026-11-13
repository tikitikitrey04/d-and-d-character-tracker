# Character Keeper

A React app for creating and tracking D&D 5e (2024) characters, with separate player accounts and a persistent SQLite backend.

## Run locally

Requires **Node.js 24+**. From this directory:

```sh
npm install
npm run dev
```

On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm`.

Open **http://127.0.0.1:5173**. Vite forwards API requests to the Express server on port 3001. Register an account to begin; no seeded accounts or passwords are included.

## Run with Docker on your local network

For a **Mac mini using OrbStack and Dockge**, follow the [Mac deployment guide](docs/mac-mini-dockge.md). It covers stack discovery, LAN access, updates, and transferring existing accounts/characters.

Install/start **OrbStack on macOS**, **Docker Desktop with Linux containers**, or **Docker Engine with Compose on Linux**, then run from this repository:

```sh
docker compose up --build -d
```

Open **http://localhost:3001** on the Docker host. On another computer, phone, or tablet on the same network, open **http://YOUR-HOST-LAN-IP:3001**. Use the host computer’s LAN address, not `localhost` or a container IP. On Windows, run `ipconfig` and look for your active Ethernet/Wi-Fi IPv4 address. A DHCP reservation keeps that address stable.

The container serves both the built React app and API on port 3001, listens on all host interfaces through the published port, runs as a non-root user, restarts automatically while Docker is running, and has a `/healthz` health check. No Node/npm installation is needed on the host. Browser-generated IDs work over plain HTTP LAN addresses as well as HTTPS/localhost.

### Ports and local HTTP

Compose defaults to `APP_BIND_ADDRESS=0.0.0.0`, `APP_PORT=3001`, and `SECURE_COOKIES=false` so sign-in works over local-network HTTP even though the container runs in production mode. HttpOnly and SameSite cookies and same-origin mutation protection remain enabled. Outside Compose, production cookies remain Secure by default. Use this HTTP setup on a trusted local network; an Internet/HTTPS deployment needs its own TLS/proxy configuration and Secure cookies.

To change the published port, create a `.env` file beside `compose.yaml`:

```dotenv
APP_PORT=8080
```

Then run `docker compose up -d` and visit port 8080 instead. To restrict access to the host only, set `APP_BIND_ADDRESS=127.0.0.1`. Leave it at `0.0.0.0` for other devices.

If the host opens the app but other devices cannot, confirm they are on the same network and allow inbound TCP traffic on the chosen port in the host firewall. On Windows **Private** networks, the following command in an administrator PowerShell allows only local-subnet clients:

```powershell
New-NetFirewallRule -DisplayName "Character Keeper LAN" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3001 -RemoteAddress LocalSubnet -Profile Private
```

Use your configured port if different. Guest Wi-Fi/client isolation can prevent device-to-device access. Docker Desktop must remain running for the app to be available.

### Persistent accounts and characters

Docker stores SQLite files in the named `keeper-data` volume mounted at `/app/data`. Accounts, sessions, and characters survive container restarts, rebuilds, and `docker compose down`. The volume starts with a new database; your existing host `data/` folder is not automatically imported. Avoid `docker compose down --volumes` unless you intend to delete Docker’s stored data.

To import existing local accounts **before using a fresh Docker database**, stop the local Node server so SQLite and its WAL files are consistent. Keep a backup of your host `data/` directory. Build/create the container without starting it, copy the entire directory, and fix ownership:

```sh
docker compose build
docker compose create
docker compose cp ./data/. app:/app/data/
docker compose run --rm --no-deps --user root app chown -R node:node /app/data
docker compose up -d
```

These import commands replace files in the Docker database directory; do not run them over a Docker database containing accounts/characters you need to retain. If a container is already running, stop it first with `docker compose stop`.

To back up Docker data while the app is stopped:

```sh
docker compose stop
docker compose cp app:/app/data ./backups
docker compose start
```

The host `data/`, `backups/`, `.env`, generated artifacts, and Git metadata are excluded from the image build context. The bundled source spell catalog is included.

### Manage the container

```sh
docker compose ps                  # status and health
docker compose logs -f app         # server logs
docker compose up --build -d       # rebuild after source changes
docker compose stop               # stop, keep container/data
docker compose start              # start again
docker compose down               # remove container/network, keep data volume
```

## Administrator access and application logs

Register your own account normally, then grant it admin access from the app directory on the Docker host:

```sh
docker compose exec app node server/admin.mjs grant YOUR_ACCOUNT_EMAIL
```

For the Mac mini deployment, first run `cd ~/Homelab/compose/d-d-character-tracker` in Mac Terminal. After granting access, refresh the app and select **Admin logs** in the sidebar (or the **Navigate** dropdown on mobile). No default admin password is included, and public registration cannot grant admin privileges. Admins use their normal account credentials; their character vault remains private to that account.

The viewer shows application activity, timestamps, severity, account IDs, request route templates, HTTP statuses, and durations. Filter by severity, refresh the latest results, or page through older entries. Logs cover sign-in/registration attempts, character operations, rejected requests, admin grants/revocations, and normal server starts/stops. Request failures appear as warnings or errors according to HTTP status. Logs omit passwords, cookies, request bodies, query strings, character names/content, and raw exception messages. Account IDs identify the account involved without exposing email addresses. Successful log-view requests are excluded to avoid filling the log with its own reads.

Logs and admin assignments persist in the existing SQLite volume. Entries expire as new events are written, with a maximum of 30 days or 10,000 entries. Database migrations happen automatically on startup for existing installations. The viewer displays application events recorded after this upgrade; Docker build output, deployment updater output, and historical container console logs remain in Dockge.

To revoke access immediately, including for existing sessions:

```sh
docker compose exec app node server/admin.mjs revoke YOUR_ACCOUNT_EMAIL
```

For a local Node deployment, use `node server/admin.mjs grant YOUR_ACCOUNT_EMAIL` (or `revoke`) from the repository root. These commands require access to the server/database; there is no public admin-promotion endpoint.

## Included

### Character archive

Open a character and choose **Archive character** at the bottom of the sheet. Confirmation saves the current edits and moves the complete sheet into **Character archive**, separate from the active vault. If saving fails, the character stays active. Open the archive from the sidebar or mobile **Navigate** menu; search by name, class, or campaign and choose **Restore character** to return it to **My characters**. Restore a character before editing, exporting, or permanently deleting it in the sheet.

The archive retains character IDs, stats, spells, weapons, inventory, and journal, and persists in the existing SQLite volume. Archive status is separate from the sheet data, and its table is created automatically on upgrade. Accounts can archive, list, and restore only their own characters. Archiving is not permanent deletion.

### In-app guide

Open **How to use** in the sidebar or the mobile **Navigate** dropdown for step-by-step guidance on creating characters, saving edits, preparing and casting spells, equipping weapons, leveling up, exporting PDFs, changing passwords, and reporting bugs. The guide has topic links and an administrator section visible to admins.

### Change your password

Open **Account settings** in the sidebar, or select it from **Navigate** on mobile. Enter your current password, a different new password of 10–128 characters, and the matching confirmation. After a successful change, your current browser stays signed in with a renewed session; all previous sessions are invalidated. Your characters, account details, and admin permissions are preserved.

The change requires an authenticated session and the current password. Passwords are hashed with a fresh salt, and change attempts are limited to 10 per account per 15 minutes. Application logs record the outcome without passwords or tokens. This is a signed-in password change; forgotten-password recovery is not included.

### Bug reporting

Signed-in players can choose **Report a bug** to submit a title, description, and optional reproduction steps. Their **My reports** list shows only their own reports and their current status. Administrators can open **Admin bugs** to see all player reports, filter by status, and mark them Open, In progress, or Resolved. On mobile, use the **Navigate** dropdown for characters, reports, and admin pages (including Admin logs).

Reports persist in SQLite alongside accounts and characters; the database table is created automatically on upgrade. Each account can submit up to 10 reports per hour. Report text is displayed as plain text and is excluded from application audit logs. Production and development deployments keep reports in their own databases. Reports are stored within the app; they are not sent to GitHub or email.

### Character features

- Email/password registration and sign-in, scrypt password hashes, expiring HTTP-only sessions, sign-out, login rate limiting, and same-origin mutation checks.
- Server-side ownership enforcement: each account sees and changes only its own characters.
- Character creation, class/species/background details, levels, campaigns, search and class filters.
- Ability modifiers, proficiency bonus, skill proficiency/expertise, saving throw proficiency, passive Perception, and d20 rolls.
- HP, temporary HP absorption, damage/healing, AC, speed, conditions, Heroic Inspiration, and death save trackers.
- Attacks, limited-use resources, a class/level-filtered 2024 SRD spell picker with automatic descriptions, spell preparation, automatic spell slots with a manual override, inventory/equipped items, quantities, gold, features, and a journal.
- A 38-weapon SRD catalog, custom weapons, class-based proficiency, mastery allowances, equipment/hand counters, per-weapon overrides, and Overview attack controls with ammunition/thrown-stock/limited-use tracking.
- Explicit saves, unsaved-change prompts, visual PDF/print export, and character deletion.
- Responsive desktop and mobile layouts.
- Light/dark themes with a persistent browser preference and system-theme default. PDF exports remain light and printer-friendly.

Character records live in `data/keeper.sqlite` (created automatically, excluded from Git). Back up this directory with the server stopped. Character edits stay in the browser until **Save character** is pressed. Export includes the current unsaved values.

Use the **Dark theme / Light theme** button on the sign-in screen or near the bottom of the sidebar to switch appearance. On mobile it is a sun/moon icon in the top bar. The preference is stored in this browser, independently of the player account. Until a theme is selected, the app follows system appearance; it also responds to system changes and synchronizes explicit selections across tabs. If browser storage is unavailable, switching still works for the current page.

### Export a player sheet

Open a character and click **Export PDF**, then select **Save as PDF** in your browser’s print dialog (or choose a printer for a paper copy). The export includes every sheet section, regardless of the current tab: combat stats, abilities, skills, saves, attacks, resources, spell slots, spells, equipment, features, and journal. It uses a dedicated, ink-friendly layout with selectable text and page breaks for long content. The browser controls paper size and margins; both Letter and A4 work. Turn off browser headers/footers for a clean sheet. Export uses your current edits without saving or changing the character in the database.

### Choose spells

The Spells tab includes a bundled catalog of **339 SRD 5.2 spells**. The dropdown defaults to your character’s class and level. Search by name or filter by spell level, then choose a spell to fill in its school, casting time, range, components, duration, description, and higher-level effects. Click **Add spell**, then **Save character**. Descriptions can be edited before adding; duplicate names are blocked. Existing manually entered spells remain intact.

Full casters, Paladin/Ranger progression starting at level 1, Warlock Mystic Arcanum, Bard Magical Secrets from level 10, and Fighter/Rogue characters whose subclass is entered as **Eldritch Knight** or **Arcane Trickster** have default filters. Warlock level 6–9 spells use Mystic Arcanum rather than Pact Magic slots. Bard Magical Secrets broadens level 1+ choices, not cantrips. Choose **All spells (special access)** for spells granted by a feat, species, subclass, or other exception; this bypasses class/level filters, but does not exempt a spell from preparation or cantrip limits. Use **Custom spell** for homebrew or content outside the SRD. Spell slots are tracked separately and do not unlock spells in the default picker.

The catalog is bundled and loaded only when opening Spells; no external API is required while playing. To refresh it during development, run `node scripts/update-spell-catalog.mjs` (requires internet access), review the changed data, and rerun tests. Attribution appears in the app and PDF exports; see [SPELL_DATA_LICENSE.md](SPELL_DATA_LICENSE.md).

### Automatic spell slots and overrides

New characters use **automatic slots**. In **Features**, changing class, subclass, or level immediately updates slot maximums in **Spells**. Full casters, Paladins/Rangers (including level 1), Warlock Pact Magic, Eldritch Knights, and Arcane Tricksters are supported. Noncasting classes/subclasses receive zero slots. Cantrips do not consume slots. Automatic maximums are also enforced by the API when saving.

Under **Spells → Spell slots**, check **Manual override** to edit each level’s maximum (0–20). Overrides stay fixed through class/level changes and persist when saving/reopening. Uncheck it to restore current class defaults. Expended counts are preserved up to the new maximum; lowering a maximum clamps excess usage. Warlock expended counts move with the Pact Magic pool when its slot level increases. Slots do not automatically recover when leveling; use the circles to restore them after the appropriate rest.

Warlocks have only Pact Magic slots through spell level 5. Their level 6–9 Mystic Arcanum choices are separate once-per-Long-Rest uses, tracked by each spell’s Cast button on Overview. Automatic calculations assume a single class; use manual override for multiclassing, special grants, or house rules. The PDF shows the current slot counts and mode.

### Cast from Overview

Below Skills & saving throws, each ready spell appears **once under its base level**. Each level 1+ spell has a separate **Cast Lv 1**, **Cast Lv 2**, etc. button for each configured slot level at or above its base level. For example, a level 1 spell on a level 5 Wizard has buttons for casting at levels 1, 2, and 3. Clicking **Cast Lv 3** spends exactly one level 3 slot. Cantrips have one slot-free Cast button, and Mystic Arcanum has one button for its independent use.

Overview and Spells update together immediately. Buttons for depleted slot levels remain visible but disabled; casting never falls back to another level. Ready spells without a matching slot pool remain listed under their base level with casting disabled. Always-prepared feature spells use slots normally; feature-specific free casts, ritual casting, and other exceptional casting methods remain manual.

Warlocks use their Pact Magic pool for ordinary spells. An unlocked Mystic Arcanum spell instead expends its independent once-per-Long-Rest use without changing slots. **Restore after Long Rest** resets that spell’s use after the player has taken the rest. Spell descriptions and PDF status reflect the same character data; casting does not roll attacks/damage or automatically apply effects. Use **Save character** to persist slot expenditure and Arcanum usage, like other sheet edits.

### Weapons, mastery, and attacks

Open **Weapons** to search the bundled catalog of **38 weapons from the 2024 SRD 5.2.1**, grouped into Simple/Martial and Melee/Ranged categories. The picker defaults to base-class proficient weapons; uncheck the proficiency filter to see every weapon. Selection fills in damage, properties, range, weight, cost, and mastery information. Add the quantity and starting ammunition, optionally equip the weapon, then **Save character**. Owning multiple copies is supported. Use **Custom weapon** for homebrew or magic weapons, or edit an existing weapon’s name, dice, properties, ability, proficiency, magic bonus, and other attack/damage adjustments.

The armory shows weapons owned, equipped entries, hands occupied, and mastered weapon kinds against their limits. Full-class proficiency, Rogue Finesse/Light and Monk Light weapon training are supported. Base mastery limits follow Barbarian, Fighter, Paladin, Ranger, and Rogue class/level progression; mastery counts distinct weapon kinds rather than duplicate copies. Barbarian mastery choices require melee weapons, and standard mastery choices require proficiency. Enable **Manual weapon limits** for grants or house rules, and use per-weapon proficiency/ability overrides for subclass or other features. Mastery details are reminders; their effects are resolved by the player.

Each equipped entry represents one held copy even when its quantity includes spares. A normal weapon uses one hand, a Two-Handed weapon uses two, and a Versatile weapon’s equipped grip can be set in its editor. A Lance can use a one-handed grip when mounted; the app does not track whether the character is mounted. Use the shield checkbox to reserve a hand (armor class is edited separately). Equipping or adding a weapon that exceeds the current hand limit is blocked. Existing over-limit selections are retained with a warning after a class/limit change. One-handed Ammunition weapons require an additional free loading hand when attacking. There is no class-based cap on how many weapons can be owned.

**Overview → Equipped weapons** lists each equipped weapon once, with its available melee, one-/two-handed, thrown, or ranged attack buttons. Attack bonuses use the appropriate STR/DEX modifier (the better one for Finesse), proficiency where trained, and configured bonuses. Two-handed Versatile attacks use the larger damage die and need enough free hands. Choose normal, Advantage, or Disadvantage; the Heavy weapon ability requirement is applied automatically, including cancelling Advantage where applicable. An attack rolls the d20 and damage **if it hits**; natural 1 misses, and natural 20 doubles damage dice before adding modifiers once. It does not determine ordinary hits against a target AC or apply damage/effects to another character.

Ranged Ammunition attacks expend one tracked ammunition unit; throwing expends one owned copy. These resources are spent even on a miss. Optional limited weapon uses expend one use per attack. Buttons disable when stock, ammunition, uses, or hands are unavailable. Restock/recover ammunition and thrown weapons, or restore limited uses, in the weapon editor. **Save character** persists all changes, and PDF exports include weapon stats, equipment/mastery status, ammunition, and uses. General Inventory remains separate: existing manually entered weapons and attacks are preserved without automatic conversion or duplication.

The app does not automate attack/action counts, range/target conditions, off-hand extra-attack damage, armor/shield eligibility, Monk Martial Arts, Rage, fighting styles, mastery effects, or every feat/subclass exception. Set the appropriate ability/damage/proficiency/hand overrides and resolve these rules at the table. Property descriptions and weapon notes remain editable. Data sources and attribution appear in the app/PDF and in [WEAPON_DATA_LICENSE.md](WEAPON_DATA_LICENSE.md). No external API is called while using weapons.

For sheets saved before automatic slots existed, empty or already-standard maximums adopt automatic mode. Existing custom maximums are preserved in manual mode; turn off **Manual override** to adopt class defaults. No stored custom values are overwritten by merely opening a sheet.

### Prepared spells and known cantrips

**Spell preparation** shows class cantrips known and level 1+ spells prepared against the 2024 class-table allowances. The prepared allowance is shared across all spell levels and is independent of spell slots and ability scores. Cantrips in the list count as known and are always available; remove one before adding a replacement if the allowance is full. Level 1+ library entries do not count until prepared, so Wizard spellbooks and saved references can contain more spells than the prepared limit. Choose **Prepare when added**, or check an existing class spell to prepare it. Unchecking always frees a prepared choice. The app blocks additions of excess class cantrips and preparation of excess class spells in both the browser and API.

Standard limits cover the eight spellcasting classes plus Eldritch Knight and Arcane Trickster. Full caster class tables differ (including Sorcerer’s starting allowance and Wizard’s higher-level progression). Paladins and Rangers have no base-class cantrips. Select **Feature grant (extra allowance)** while adding, or use a spell’s source selector, for a legitimate extra cantrip or always-prepared spell granted by a species, feat, subclass, Divine/Primal Order, invocation, or another feature. These are excluded from base counts and always available; record the granting feature in the description. Grants and their eligibility are declared by the player, not automatically assigned. Warlock level 6–9 choices are Mystic Arcanum selections, separately limited to one per unlocked spell level (at Warlock levels 11, 13, 15, and 17).

Enable **Manual preparation limits** to set custom cantrip and prepared-spell totals (0–200), for multiclassing or house rules. These totals persist and are independent of manual slot overrides. Disabling the override restores class-table limits. The app does not manage rest/level-up replacement timing or every feature’s eligibility restrictions. Existing sheets that exceed a newly lowered limit keep their spells and show a warning; counts already over their limit cannot increase further, but can be reduced and saved. No spells are silently deleted or unprepared. PDF exports include counts, overrides, warnings, and each spell’s known/prepared/granted/Arcanum status.

## Rules scope

This is a **manual character builder and play tracker with an SRD spell picker and automatic spell slots**, not a complete rules engine. Use the [official 2024 free rules](https://www.dndbeyond.com/sources/dnd/br-2024/creating-a-character) to choose legal options. Enter final ability scores including background bonuses, HP, armor class, class features, and equipment yourself. Changing class or level updates proficiency, the spell picker, and automatic slot maximums, but does not automatically grant features, change HP, or remove previously added spells. Apply condition effects, exhaustion, multiclass rules, spellcasting modifiers, rest recovery, and situational bonuses manually. Resources and spell slots can be restored individually. Paid-book spells outside the SRD are not included.

There is no campaign sharing, DM dashboard, email verification, password recovery, or JSON import yet. Accounts are separate players, not a shared party. The app uses Google Fonts with local system-font fallbacks.

## Build and verify

```sh
npm test
npm run build
npm start
```

Run `npm run test:browser` to test the full player flow in an installed Google Chrome. It uses an isolated in-memory database and writes desktop/mobile screenshots to the ignored `artifacts/` directory.

The production server serves the built app and API together at **http://127.0.0.1:3001**. `PORT` and `HOST` configure the listener. Outside Docker, the default listener is local to this computer. `NODE_ENV=production` defaults to Secure session cookies; `SECURE_COOKIES=true` or `false` explicitly sets that flag. Compose provides the LAN HTTP configuration described above. Keep the service same-origin; Internet deployments require HTTPS and appropriate trusted reverse-proxy/rate-limiting configuration. Running multiple server instances requires shared session/data storage and a shared rate limiter.

The integration tests cover registration, login, sessions/logout, character CRUD, validation, cross-account isolation, mutation protection, cookie configuration, health checks, and LAN-compatible IDs. The browser checks run through a mapped non-localhost HTTP hostname, verifying the full player flow when `crypto.randomUUID()` is unavailable. The SQLite API in Node.js 24 may emit an experimental-feature warning.
