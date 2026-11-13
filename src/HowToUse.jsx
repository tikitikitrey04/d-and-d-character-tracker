import React from "react";

const sections = [
  {
    id: "create",
    title: "Create your first character",
    steps: [
      <>
        From <strong>My characters</strong>, choose{" "}
        <strong>Create character</strong>. Enter a name, class, level, species,
        background, and an optional campaign.
      </>,
      <>
        Open the character and enter your final ability scores, HP, AC, speed,
        and proficiencies in <strong>Overview</strong>. Use the scores after
        applying your character creation bonuses.
      </>,
      <>
        Add class features in <strong>Features</strong>, limited-use resources
        in <strong>Overview</strong>, equipment in <strong>Inventory</strong>{" "}
        and <strong>Weapons</strong>, and spells in <strong>Spells</strong>.
      </>,
      <>
        Click <strong>Save character</strong>. Your account keeps its own
        private character vault.
      </>,
    ],
    note: "This is a manual character sheet with selected calculations. Choose your rules options and enter HP, AC, features, and other character details yourself.",
  },
  {
    id: "save",
    title: "Save progress and track a session",
    steps: [
      <>
        Use <strong>Overview</strong> to track HP, temporary HP, conditions,
        Heroic Inspiration, death saves, abilities, skills, and saving throws.
      </>,
      <>
        Use <strong>Inventory</strong> for general gear and currency,{" "}
        <strong>Features</strong> for class features and traits, and{" "}
        <strong>Journal</strong> for adventure notes.
      </>,
      <>
        Click <strong>Save character</strong> after editing your sheet, casting
        a spell, attacking, or changing resource counts. These changes are not
        saved automatically.
      </>,
    ],
    note: "Save before refreshing, changing pages, or signing out. The PDF can include unsaved edits, but exporting does not save them to your account.",
  },
  {
    id: "archive",
    title: "Archive and restore characters",
    steps: [
      <>
        Open an inactive character and choose <strong>Archive character</strong>{" "}
        at the bottom of the sheet. Confirm to save current edits and move it
        out of <strong>My characters</strong>.
      </>,
      <>
        Open <strong>Character archive</strong> from the sidebar or the mobile{" "}
        <strong>Navigate</strong> dropdown. Search by name, class, or campaign.
      </>,
      <>
        Choose <strong>Restore character</strong> to return it to your active
        vault, then open it from <strong>My characters</strong> to play, edit,
        or export it.
      </>,
    ],
    note: "Archiving keeps the full sheet, including spells, weapons, inventory, and journal. Restore it before editing. Permanent deletion is a separate action on the character sheet.",
  },
  {
    id: "spells",
    title: "Add and prepare spells",
    steps: [
      <>
        Open <strong>Spells</strong>. Search the spell picker; its default
        choices follow your class, subclass, and character level.
      </>,
      <>
        Select a spell to fill in its description and casting details. Add it to
        your spell list, or use <strong>Custom spell</strong> for homebrew and
        spells outside the bundled catalog.
      </>,
      <>
        Cantrips are known and available when added. Check a level 1+ class
        spell to prepare it. The counters show your known cantrips and prepared
        spells against their allowances.
      </>,
      <>
        Unprepare a spell to free a prepared choice. Remove a cantrip before
        replacing it when your known-cantrip allowance is full. Unprepared
        leveled spells can remain in your library.
      </>,
    ],
    note: "Preparation is one shared allowance across spell levels. Spell slots are a separate resource. Use feature grants and manual preparation limits only when your character's features or your table's rules allow them.",
  },
  {
    id: "casting",
    title: "Cast spells and restore slots",
    steps: [
      <>
        In <strong>Overview</strong>, find your ready spells below skills and
        saving throws. Each spell appears at its base level.
      </>,
      <>
        Choose a <strong>Cast Lv</strong> button to spend one slot of that
        level. For example, casting a level 1 spell with{" "}
        <strong>Cast Lv 3</strong> spends a level 3 slot. Depleted choices are
        disabled.
      </>,
      <>
        Cantrips do not spend slots. Warlock Mystic Arcanum uses are tracked
        separately from Pact Magic slots.
      </>,
      <>
        Restore slot circles and limited-use resources after taking the
        appropriate rest. Use <strong>Restore after Long Rest</strong> for an
        expended Mystic Arcanum, then save the character.
      </>,
    ],
    note: "Casting tracks resources; resolve spell attacks, damage, effects, rituals, and special free casts at the table. There is no automatic all-character rest recovery.",
  },
  {
    id: "weapons",
    title: "Equip weapons and make attacks",
    steps: [
      <>
        Open <strong>Weapons</strong> to choose a catalog weapon or create a
        custom one. Enter quantity, ammunition, bonuses, and any limited uses.
      </>,
      <>
        Equip the weapon and choose its grip where available. Check the hand and
        mastery counters; reserve a hand for a shield if you use one.
      </>,
      <>
        Find equipped weapons on <strong>Overview</strong>. Choose the attack
        type and normal, Advantage, or Disadvantage rolls. The app rolls an
        attack and potential damage.
      </>,
      <>
        Attacks spend tracked ammunition or limited uses, and thrown attacks
        spend one owned copy, including on a miss. Recover or restock these in
        the weapon editor, then save.
      </>,
    ],
    note: "Compare the roll with the target's AC and resolve damage and mastery effects at the table. General Inventory entries do not automatically become equipped weapons.",
  },
  {
    id: "level",
    title: "Level up your character",
    steps: [
      <>
        Open <strong>Features</strong> and increase your character's level.
        Update your subclass there when needed.
      </>,
      <>
        Review the updated proficiency bonus, spell choices, automatic slot
        maximums, and preparation allowances.
      </>,
      <>
        Manually add gained HP, features, ability score changes, new spells, and
        other choices. Leveling does not automatically grant those details or
        restore expended slots.
      </>,
      <>
        For multiclass characters or special rules, review the manual slot,
        preparation, and weapon overrides. Save when finished.
      </>,
    ],
    note: "Changing class or level keeps previously added spells and features. Review them against your new choices; overrides remain fixed until you change or disable them.",
  },
  {
    id: "pdf",
    title: "Export a player sheet",
    steps: [
      <>
        Open your character and choose <strong>Export PDF</strong>.
      </>,
      <>
        In the browser's print dialog, choose <strong>Save as PDF</strong> or
        your printer. Letter and A4 are supported; turn off browser headers and
        footers for a clean sheet.
      </>,
      <>
        The export includes every sheet section, including spells, weapons,
        equipment, features, and notes. It uses a light layout even when you use
        dark theme.
      </>,
    ],
    note: "The export reflects your current edits. Click Save character separately to keep those edits in your account.",
  },
  {
    id: "account",
    title: "Account settings and appearance",
    steps: [
      <>
        Open <strong>Account settings</strong> to change your password. Enter
        your current password and confirm a different new password of 10–128
        characters.
      </>,
      <>
        After changing it, you stay signed in here and your other sessions are
        signed out. Your characters stay in your account.
      </>,
      <>
        Use the sun or moon theme button to switch light and dark themes. This
        preference is saved for this browser.
      </>,
    ],
    note: "On mobile, use the Navigate dropdown to switch between your characters, account settings, this guide, and bug reports.",
  },
  {
    id: "bugs",
    title: "Report a problem",
    steps: [
      <>
        Choose <strong>Report a bug</strong>. Give it a short title, explain
        what you expected and what happened, and add reproduction steps if you
        can.
      </>,
      <>
        Submit the report and check <strong>My reports</strong> for its status:
        Open, In progress, or Resolved.
      </>,
      <>
        Leave out passwords and sensitive information. Administrators can read
        your report; other players cannot see it.
      </>,
    ],
    note: "Reports go to the administrators of the site you are using. You can submit up to 10 reports per hour.",
  },
];

export default function HowToUse({ onBack, isAdmin }) {
  return (
    <section className="how-to-use" aria-labelledby="guide-title">
      <header className="vault-heading">
        <div>
          <p className="eyebrow">YOUR TABLESIDE GUIDE</p>
          <h1 id="guide-title">How to use</h1>
          <p className="muted">
            From your first character to the next session. Find a topic below to
            get started.
          </p>
        </div>
        <button className="secondary" onClick={onBack}>
          Back to characters
        </button>
      </header>
      <aside className="guide-save-note">
        <strong>Remember to save.</strong> Character edits and resource use stay
        in this browser until you click <strong>Save character</strong>.
      </aside>
      <nav className="guide-topics" aria-label="Guide topics">
        {sections.map(({ id, title }) => (
          <a key={id} href={`#guide-${id}`}>
            {title}
          </a>
        ))}
        {isAdmin && <a href="#guide-admin">Administrator tools</a>}
      </nav>
      <div className="guide-sections">
        {sections.map(({ id, title, steps, note }, index) => (
          <section
            className="guide-card"
            id={`guide-${id}`}
            key={id}
            aria-labelledby={`guide-heading-${id}`}
          >
            <div className="guide-card-heading">
              <span aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h2 id={`guide-heading-${id}`}>{title}</h2>
            </div>
            <ol>
              {steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
            <p className="guide-note">{note}</p>
          </section>
        ))}
      </div>
      {isAdmin && (
        <section
          className="guide-card"
          id="guide-admin"
          aria-labelledby="guide-heading-admin"
        >
          <h2 id="guide-heading-admin">Administrator tools</h2>
          <p>
            Open <strong>Admin bugs</strong> to review all player reports,
            filter by status, and update their progress. Open{" "}
            <strong>Admin logs</strong> to review application events, filter by
            severity, and page through older entries.
          </p>
          <p className="guide-note">
            Reports and logs belong to this deployment. Development and
            production each keep their own data and admin permissions.
          </p>
        </section>
      )}
      <button className="secondary" onClick={onBack}>
        Return to my characters
      </button>
    </section>
  );
}
