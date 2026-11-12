import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  abilities,
  skills,
  modifier,
  proficiency,
  signed,
} from "../shared/character.mjs";
import "./print.css";
import SpellAttribution from "./SpellAttribution.jsx";
import WeaponAttribution from "./WeaponAttribution.jsx";
import { weaponStats, weaponSummary, weaponKey } from "../shared/weapons.mjs";
import {
  preparationSummary,
  spellSource,
  isSpellReady,
} from "../shared/preparation.mjs";

function Section({ title, children, className = "" }) {
  return (
    <section className={`print-section ${className}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Table({ headings, rows, empty }) {
  return rows.length ? (
    <table>
      <thead>
        <tr>
          {headings.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ) : (
    <p className="print-empty">{empty || "None recorded."}</p>
  );
}

function Prose({ children }) {
  return <div className="print-prose">{children || "Not recorded."}</div>;
}

export default function PrintableCharacter({ character: c }) {
  const preparation = preparationSummary(c);
  const prof = proficiency(c.level);
  useEffect(() => {
    let previousTitle;
    const before = () => {
      previousTitle = document.title;
      document.title = `${c.name || "Character"} - Character Sheet`;
    };
    const after = () => {
      if (previousTitle !== undefined) {
        document.title = previousTitle;
        previousTitle = undefined;
      }
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
      after();
    };
  }, [c.name]);

  return createPortal(
    <article
      className="character-print-root"
      aria-label={`${c.name} printable character sheet`}
    >
      <header className="print-header">
        <div>
          <p className="print-eyebrow">CHARACTER KEEPER / D&D 5E · 2024</p>
          <h1>{c.name || "Unnamed character"}</h1>
          <p>
            {[c.species, c.class, c.subclass, `Level ${c.level}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="print-level">
          <strong>{signed(prof)}</strong>
          <span>PROFICIENCY</span>
        </div>
      </header>
      <dl className="print-identity">
        {[
          ["Background", c.background],
          ["Campaign", c.campaign],
          ["Experience", c.xp.toLocaleString()],
          ["Languages", c.languages],
        ].map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v || "—"}</dd>
          </div>
        ))}
      </dl>
      <div className="print-combat">
        {[
          ["Hit points", `${c.hp} / ${c.maxHp}`],
          ["Temporary HP", c.tempHp],
          ["Armor class", c.ac],
          ["Initiative", signed(modifier(c.abilities[1]))],
          ["Speed", `${c.speed} ft.`],
          [
            "Passive Perception",
            10 + modifier(c.abilities[4]) + prof * (c.skills.Perception || 0),
          ],
        ].map(([k, v]) => (
          <div key={k}>
            <strong>{v}</strong>
            <span>{k}</span>
          </div>
        ))}
      </div>
      <div className="print-abilities">
        {abilities.map((name, i) => (
          <div key={name}>
            <span>{name}</span>
            <strong>{signed(modifier(c.abilities[i]))}</strong>
            <small>Score {c.abilities[i]}</small>
          </div>
        ))}
      </div>
      <div className="print-status">
        <span>
          <b>Heroic Inspiration:</b>{" "}
          {c.inspiration ? "Available" : "Not available"}
        </span>
        <span>
          <b>Death saves:</b> {c.deathSuccess} successes / {c.deathFailure}{" "}
          failures
        </span>
        <span>
          <b>Conditions:</b> {c.conditions.join(", ") || "None"}
        </span>
      </div>
      <div className="print-checks">
        <Section title="Saving throws">
          <Table
            headings={["Ability", "Bonus", "Training"]}
            rows={abilities.map((name, i) => [
              name,
              signed(
                modifier(c.abilities[i]) + (c.saves.includes(i) ? prof : 0),
              ),
              c.saves.includes(i) ? "Proficient" : "—",
            ])}
          />
        </Section>
        <Section title="Skills">
          <Table
            headings={["Skill", "Ability", "Bonus", "Training"]}
            rows={skills.map(([name, i]) => [
              name,
              abilities[i].slice(0, 3).toUpperCase(),
              signed(modifier(c.abilities[i]) + prof * (c.skills[name] || 0)),
              ["—", "Proficient", "Expertise"][c.skills[name] || 0],
            ])}
          />
        </Section>
      </div>
      <Section title="Attacks & actions">
        <Table
          headings={["Name", "Attack, damage & properties"]}
          rows={c.attacks.map((a) => [a.name, a.detail || "—"])}
        />
      </Section>
      <Section title="Weapons & mastery" className="print-weapons">
        <p className="print-slot-mode">
          Weapons owned: {weaponSummary(c).owned} · Hands:{" "}
          {weaponSummary(c).hands} / {weaponSummary(c).handLimit} · Masteries:{" "}
          {weaponSummary(c).mastered} / {weaponSummary(c).masteryLimit}
          {c.weaponLimitOverride ? " · Manual weapon limits" : ""}
        </p>
        <Table
          headings={[
            "Weapon",
            "Attack & damage",
            "Stock & status",
            "Properties & notes",
          ]}
          rows={(c.weapons || []).map((w) => {
            const stats = weaponStats(c, w);
            const signed = (n) => (n >= 0 ? `+${n}` : String(n));
            const mastered = (c.weapons || []).some(
              (other) => other.mastered && weaponKey(other) === weaponKey(w),
            );
            return [
              w.name,
              `${signed(stats.attackBonus)} to hit\n${w.damageDice}${signed(stats.damageBonus)} ${w.damageType}${w.versatileDice ? `\nTwo hands: ${w.versatileDice}${signed(stats.damageBonus)}` : ""}\n${stats.proficient ? "Proficient" : "Not proficient"}`,
              `${w.quantity} owned\n${w.equipped ? "Equipped" : "Stored"}${w.properties.includes("Ammunition") ? `\n${w.ammunitionCount} ammunition` : ""}${w.limitedUses ? `\n${w.usesMax - w.usesUsed}/${w.usesMax} uses` : ""}\n${w.mastery}: ${mastered ? "selected" : "not selected"}`,
              w.detail,
            ];
          })}
        />
      </Section>
      <Section title="Limited resources">
        <Table
          headings={["Resource", "Remaining / maximum", "Details"]}
          rows={c.resources.map((r) => [
            r.name,
            `${r.max - r.used} / ${r.max}`,
            r.detail || "—",
          ])}
        />
      </Section>
      <Section title="Spell slots">
        <p className="print-slot-mode">
          {c.slotMode === "manual"
            ? "Manual override"
            : "Automatic class progression"}
          {c.class === "Warlock" && c.slotMode !== "manual"
            ? " · Pact Magic; recovers on a Short or Long Rest. Mystic Arcanum uses are tracked separately by spell."
            : ""}
        </p>
        <Table
          headings={["Spell level", "Available", "Expended", "Maximum"]}
          rows={c.slots.flatMap((s, i) =>
            s.max ? [[i + 1, s.max - s.used, s.used, s.max]] : [],
          )}
          empty="No spell slots recorded."
        />
      </Section>
      <Section title="Spellbook" className="print-spellbook">
        <p className="print-slot-mode">
          Class cantrips known: {preparation.counts.cantrips} /{" "}
          {preparation.limits.cantrips} · Prepared class spells:{" "}
          {preparation.counts.prepared} / {preparation.limits.prepared} ·
          Feature grants: {preparation.counts.granted}
          {c.spellLimitOverride ? " · Manual limits" : ""}
        </p>
        {preparation.issues.length > 0 && (
          <p className="print-slot-mode">
            Over limit:{" "}
            {preparation.issues
              .map((b) => `${b.label} ${b.used}/${b.limit}`)
              .join("; ")}
          </p>
        )}
        <Table
          headings={["Level", "Spell", "Status", "Details"]}
          rows={[...c.spells]
            .sort((a, b) => a.level - b.level)
            .map((s) => [
              s.level === 0 ? "Cantrip" : s.level,
              s.name,
              s.level === 0
                ? spellSource(c, s) === "granted"
                  ? "Bonus cantrip"
                  : "Known"
                : spellSource(c, s) === "arcanum"
                  ? s.arcanumUsed
                    ? "Arcanum expended"
                    : "Arcanum available"
                  : spellSource(c, s) === "granted"
                    ? "Always prepared"
                    : isSpellReady(c, s)
                      ? "Prepared"
                      : "Not prepared",
              s.detail || "—",
            ])}
        />
      </Section>
      <Section title="Equipment & treasure">
        <p className="print-gold">
          <b>Gold pieces:</b> {c.gold.toLocaleString()}
        </p>
        <Table
          headings={["Item", "Quantity", "Equipped", "Details"]}
          rows={c.inventory.map((i) => [
            i.name,
            i.quantity,
            i.equipped ? "Yes" : "No",
            i.detail || "—",
          ])}
        />
      </Section>
      <Section title="Armor, weapon & tool proficiencies">
        <Prose>{c.equipmentProficiencies}</Prose>
      </Section>
      <Section title="Appearance & personality">
        <Prose>{c.appearance}</Prose>
      </Section>
      <Section title="Features, feats & traits">
        <Prose>{c.features}</Prose>
      </Section>
      <Section title="Adventure journal">
        <Prose>{c.notes}</Prose>
      </Section>
      <footer className="print-footer">
        {c.spells.length > 0 && <SpellAttribution />}
        {(c.weapons || []).length > 0 && <WeaponAttribution />}
        {c.name || "Character"} · Character Keeper · D&D 5e (2024)
        <br />
        Bonuses shown exclude conditional effects and other manually applied
        modifiers.
      </footer>
    </article>,
    document.body,
  );
}
