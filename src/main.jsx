import React, { useEffect, useId, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Sword,
  Shield,
  Heart,
  Sparkles,
  Backpack,
  BookOpen,
  Dices,
  Plus,
  LogOut,
  ChevronRight,
  Check,
  X,
  ScrollText,
  Users,
  ArrowLeft,
  Trash2,
  Download,
  Save,
  Flame,
  Compass,
  Minus,
  Bug,
  Archive,
} from "lucide-react";
import {
  abilities,
  classes,
  skills,
  blankCharacter,
  modifier,
  signed,
  proficiency,
} from "../shared/character.mjs";
import "./styles.css";
import PrintableCharacter from "./PrintableCharacter.jsx";
import AdminLogs from "./AdminLogs.jsx";
import BugReports from "./BugReports.jsx";
import AccountSettings from "./AccountSettings.jsx";
import HowToUse from "./HowToUse.jsx";
import CharacterArchive from "./CharacterArchive.jsx";
import SpellSlots from "./SpellSlots.jsx";
import OverviewSpells from "./OverviewSpells.jsx";
import ThemeToggle, { ThemeProvider } from "./Theme.jsx";
import Weapons, { OverviewWeapons } from "./Weapons.jsx";
import { weaponChangeError, attackWithWeapon } from "../shared/weapons.mjs";
import { castSpell } from "../shared/casting.mjs";
import { normalizeCharacterSlots } from "../shared/slots.mjs";
import SpellPreparation, {
  SpellStatus,
  SpellSource,
  SpellCounters,
} from "./SpellPreparation.jsx";
import {
  preparationIncreaseError,
  preparationSummary,
  spellSource,
} from "../shared/preparation.mjs";
const SpellPicker = React.lazy(() => import("./SpellPicker.jsx"));

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Keeper-Request": "1",
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}
import { newId } from "../shared/id.mjs";
const uid = newId;
function Field({ label, children, ...props }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children ? (
        React.cloneElement(children, { id })
      ) : (
        <input id={id} {...props} />
      )}
    </div>
  );
}
function NumberField({ label, value, onChange, min = 0, max = 9999 }) {
  return (
    <Field label={label}>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) =>
          onChange(Math.max(min, Math.min(max, Number(e.target.value))))
        }
      />
    </Field>
  );
}
function Brand() {
  return (
    <div className="brand">
      <span className="brand-icon">
        <Dices size={25} />
      </span>
      <span>
        character<span className="brand-light">keeper</span>
        <small>EVERY HERO HAS A STORY</small>
      </span>
    </div>
  );
}
function Auth({ onLogin }) {
  const [mode, setMode] = useState("register"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      onLogin(
        await api(`/auth/${mode}`, {
          method: "POST",
          body: JSON.stringify(
            Object.fromEntries(new FormData(e.currentTarget)),
          ),
        }),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <section className="auth-story">
        <Brand />
        <div className="auth-copy">
          <p className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p>
          <h1>
            Small beginnings.
            <br />
            <em>Legendary stories.</em>
          </h1>
          <p>
            A home for every character you dream up. Build your hero, keep your
            story, and bring it all to the table.
          </p>
          <div className="feature-pills">
            <span>
              <Shield size={15} /> D&D 5e · 2024
            </span>
            <span>
              <Users size={15} /> Your own character vault
            </span>
          </div>
        </div>
        <div className="hero-emblem">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <Sword size={110} strokeWidth={0.7} />
          <span className="emblem-star">✦</span>
        </div>
        <footer>FOR THE ADVENTURE. FOR THE STORY. FOR THE TABLE.</footer>
      </section>
      <section className="auth-form">
        <div className="auth-theme-toggle">
          <ThemeToggle />
        </div>
        <div className="form-wrap">
          <p className="eyebrow">PULL UP A CHAIR</p>
          <h2>
            {mode === "register"
              ? "An adventure awaits."
              : "Welcome back, adventurer."}
          </h2>
          <p className="muted">
            {mode === "register"
              ? "Create your account and make room for a new hero."
              : "Your characters are right where you left them."}
          </p>
          <div className="segmented">
            <button
              className={mode === "register" ? "active" : ""}
              onClick={() => {
                setMode("register");
                setError("");
              }}
            >
              Create account
            </button>
            <button
              className={mode === "login" ? "active" : ""}
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              Sign in
            </button>
          </div>
          <form onSubmit={submit}>
            {mode === "register" && (
              <Field
                label="Your name"
                name="name"
                autoComplete="nickname"
                placeholder="What should we call you?"
                required
                maxLength={80}
              />
            )}
            <Field
              label="Email address"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              maxLength={254}
            />
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              placeholder="At least 10 characters"
              minLength={10}
              maxLength={128}
              required
            />
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="primary wide" disabled={busy}>
              {busy
                ? "Opening the gates…"
                : mode === "register"
                  ? "Begin your adventure"
                  : "Return to your characters"}
              <ChevronRight size={17} />
            </button>
          </form>
          <p className="auth-note">
            <Shield size={14} /> Private sheets. Saved progress. More time for
            adventure.
          </p>
          <a
            className="rules-link"
            href="https://www.dndbeyond.com/sources/dnd/br-2024/creating-a-character"
            target="_blank"
            rel="noreferrer"
          >
            New to D&D? Explore the free 2024 rules ↗
          </a>
        </div>
      </section>
    </div>
  );
}
function Creator({ onClose, onCreate }) {
  const modalRef = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    function handleKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Tab") {
        const focusable = [
          ...modalRef.current.querySelectorAll(
            "button:not(:disabled),input,select,textarea",
          ),
        ];
        const first = focusable[0],
          last = focusable.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      previous?.focus();
    };
  }, [onClose]);
  const [draft, setDraft] = useState(blankCharacter),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const set = (k, v) => setDraft((c) => ({ ...c, [k]: v }));
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await onCreate(draft);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <section
        ref={modalRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-title"
      >
        <header>
          <div>
            <p className="eyebrow">A NEW CHAPTER</p>
            <h2 id="create-title">Meet your next hero.</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close character builder"
            onClick={onClose}
          >
            <X />
          </button>
        </header>
        <p className="muted">
          Start with the essentials. You can fill in every detail on your sheet.
        </p>
        <form onSubmit={submit}>
          <Field
            label="Character name"
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="A name worth remembering"
            required
            maxLength={80}
            autoFocus
          />
          <div className="form-grid">
            <Field label="Class">
              <select
                value={draft.class}
                onChange={(e) => set("class", e.target.value)}
              >
                {classes.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
            <NumberField
              label="Level"
              value={draft.level}
              onChange={(v) => set("level", v)}
              min={1}
              max={20}
            />
            <Field
              label="Species"
              value={draft.species}
              onChange={(e) => set("species", e.target.value)}
              maxLength={200}
            />
            <Field
              label="Background"
              value={draft.background}
              onChange={(e) => set("background", e.target.value)}
              placeholder="e.g. Soldier, Sage"
              maxLength={200}
            />
          </div>
          <Field
            label="Campaign (optional)"
            value={draft.campaign}
            onChange={(e) => set("campaign", e.target.value)}
            placeholder="Where will your story unfold?"
            maxLength={200}
          />
          <div className="builder-note">
            <BookOpen size={18} />
            <p>
              This is a manual 2024 sheet. Add your background’s bonuses to your
              final ability scores, and enter your class features, HP, and
              equipment after creation.
            </p>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="primary wide" disabled={busy}>
            {busy ? "Creating…" : "Create character"}
            <Plus size={17} />
          </button>
        </form>
      </section>
    </div>
  );
}
const tabs = [
  ["Overview", Shield],
  ["Spells", Sparkles],
  ["Weapons", Sword],
  ["Inventory", Backpack],
  ["Features", Flame],
  ["Journal", BookOpen],
];
function RecordList({ title, items, onChange, type, addForm, character }) {
  const spellSummary =
    type === "spells" && character ? preparationSummary(character) : null;
  const bonusCantrips = spellSummary
    ? items.filter(
        (s) => s.level === 0 && spellSource(character, s) === "granted",
      ).length
    : 0;
  const [name, setName] = useState(""),
    [detail, setDetail] = useState(""),
    [level, setLevel] = useState(0),
    [quantity, setQuantity] = useState(1),
    [max, setMax] = useState(1);
  function add(e) {
    e.preventDefault();
    onChange([
      ...items,
      {
        id: uid(),
        name: name.trim(),
        detail,
        ...(type === "spells"
          ? { level, prepared: false }
          : type === "inventory"
            ? { quantity, equipped: false }
            : type === "resources"
              ? { max, used: 0 }
              : {}),
      },
    ]);
    setName("");
    setDetail("");
  }
  const update = (id, patch) =>
    onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const renderRecord = (item) => (
    <div className="record" key={item.id}>
      <div className="record-main">
        {type === "spells" && character && (
          <SpellStatus
            character={character}
            spell={item}
            onChange={(patch) => update(item.id, patch)}
          />
        )}
        {type === "inventory" && (
          <input
            type="checkbox"
            aria-label={`${type === "spells" ? "Prepare" : "Equip"} ${item.name}`}
            checked={type === "spells" ? item.prepared : item.equipped}
            onChange={(e) =>
              update(item.id, {
                [type === "spells" ? "prepared" : "equipped"]: e.target.checked,
              })
            }
          />
        )}
        <div>
          <strong>{item.name}</strong>
          {type === "spells" && character && (
            <SpellSource
              character={character}
              spell={item}
              onChange={(patch) => update(item.id, patch)}
            />
          )}
          <p>
            {type === "spells"
              ? item.level === 0
                ? "Cantrip"
                : `Level ${item.level}`
              : type === "inventory"
                ? `Quantity ${item.quantity}`
                : ""}
            {item.detail &&
              `${["spells", "inventory"].includes(type) ? " · " : ""}${item.detail}`}
          </p>
        </div>
      </div>
      {type === "resources" && (
        <div className="stepper">
          <button
            type="button"
            aria-label={`Restore ${item.name}`}
            onClick={() =>
              update(item.id, { used: Math.max(0, item.used - 1) })
            }
          >
            <Plus size={13} />
          </button>
          <span>
            {item.max - item.used} / {item.max}
          </span>
          <button
            type="button"
            aria-label={`Use ${item.name}`}
            onClick={() =>
              update(item.id, { used: Math.min(item.max, item.used + 1) })
            }
          >
            <Minus size={13} />
          </button>
        </div>
      )}
      {type === "inventory" && (
        <input
          className="quantity"
          aria-label={`${item.name} quantity`}
          type="number"
          min={0}
          max={9999}
          value={item.quantity}
          onChange={(e) =>
            update(item.id, {
              quantity: Math.max(0, Math.min(9999, Number(e.target.value))),
            })
          }
        />
      )}
      <button
        type="button"
        className="icon-button danger"
        aria-label={`Remove ${item.name}`}
        onClick={() => onChange(items.filter((i) => i.id !== item.id))}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
  return (
    <section className="panel">
      <div className="panel-title">
        <h3>{title}</h3>
        <span className="count">{items.length}</span>
      </div>
      {spellSummary && <SpellCounters character={character} />}
      {items.length === 0 && (
        <p className="empty-inline">
          Your story has room for more. Add your first entry below.
        </p>
      )}
      <div className="records">
        {type === "spells"
          ? Array.from({ length: 10 }, (_, level) => {
              const spells = items.filter((item) => item.level === level);
              if (!spells.length) return null;
              const label =
                level === 0 ? "Cantrips" : "Level " + level + " spells";
              return (
                <section
                  className="spell-level-group"
                  aria-label={label}
                  key={level}
                >
                  <div className="spell-level-heading">
                    <h4>{label}</h4>
                    <span
                      className="count"
                      aria-label={
                        level === 0 && spellSummary
                          ? `${spellSummary.counts.cantrips} of ${spellSummary.limits.cantrips} class cantrips, ${bonusCantrips} bonus cantrips`
                          : `${spells.length} spells`
                      }
                    >
                      {level === 0 && spellSummary
                        ? `${spellSummary.counts.cantrips} / ${spellSummary.limits.cantrips}${bonusCantrips ? ` +${bonusCantrips} bonus` : ""}`
                        : spells.length}
                    </span>
                  </div>
                  {spells.map(renderRecord)}
                </section>
              );
            })
          : items.map(renderRecord)}
      </div>
      {addForm || (
        <form className="add-record" onSubmit={add}>
          <div className="add-record-fields">
            <Field
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                type === "spells"
                  ? "e.g. Fire Bolt"
                  : type === "inventory"
                    ? "e.g. Longsword"
                    : type === "resources"
                      ? "e.g. Second Wind"
                      : "e.g. Longbow"
              }
              maxLength={200}
              required
              pattern=".*\S.*"
            />
            {type === "spells" && (
              <NumberField
                label="Spell level"
                value={level}
                onChange={setLevel}
                max={9}
              />
            )}
            {type === "inventory" && (
              <NumberField
                label="Quantity"
                value={quantity}
                onChange={setQuantity}
              />
            )}
            {type === "resources" && (
              <NumberField
                label="Maximum"
                value={max}
                onChange={setMax}
                min={1}
                max={999}
              />
            )}
          </div>
          <Field
            label="Details"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder={
              type === "attacks"
                ? "Attack bonus, damage, range, and properties"
                : "Description, effects, or a reminder…"
            }
            maxLength={2000}
          />
          <button className="secondary small" disabled={items.length >= 200}>
            <Plus size={14} /> Add{" "}
            {type === "inventory"
              ? "item"
              : type === "spells"
                ? "spell"
                : type === "resources"
                  ? "resource"
                  : "attack"}
          </button>
        </form>
      )}
    </section>
  );
}
function Sheet({ character, onSave, onBack, onDelete, onArchive }) {
  const [c, setC] = useState(() => normalizeCharacterSlots(character)),
    [tab, setTab] = useState("Overview"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(() => normalizeCharacterSlots(character)),
    [roll, setRoll] = useState(""),
    [castMessage, setCastMessage] = useState(""),
    [weaponMessage, setWeaponMessage] = useState(""),
    [amount, setAmount] = useState(1);
  const dirty = JSON.stringify(c) !== JSON.stringify(saved);
  useEffect(() => {
    const handler = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  const set = (k, v) =>
    setC((prev) => normalizeCharacterSlots({ ...prev, [k]: v }));
  const prof = proficiency(c.level);
  function changeWeapons(patch) {
    const next = { ...c, ...patch };
    const error = weaponChangeError(next, c);
    if (error) {
      setError(error);
      return;
    }
    setError("");
    setC(next);
  }
  function attackWeapon(id, mode, rollMode) {
    try {
      const result = attackWithWeapon(c, id, mode, undefined, rollMode);
      setC(result.character);
      setWeaponMessage(result.message);
    } catch (error) {
      setWeaponMessage(error.message);
    }
  }
  function cast(spellId, level) {
    try {
      const result = castSpell(c, spellId, level);
      setC(result.character);
      setCastMessage(result.message);
    } catch (error) {
      setCastMessage(error.message);
    }
  }
  function restoreArcanum(spellId) {
    setC((previous) => ({
      ...previous,
      spells: previous.spells.map((s) =>
        s.id === spellId ? { ...s, arcanumUsed: false } : s,
      ),
    }));
    setCastMessage(
      "Mystic Arcanum use restored. Only restore after completing a Long Rest.",
    );
  }
  function changeSpells(spells) {
    const error = preparationIncreaseError({ ...c, spells }, c);
    if (error) {
      setError(error);
      return;
    }
    setError("");
    set("spells", spells);
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      const result = await onSave(c);
      setC((current) =>
        JSON.stringify(current) === JSON.stringify(c) ? result : current,
      );
      setSaved(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function back() {
    if (
      !dirty ||
      window.confirm("Leave this sheet and discard your unsaved changes?")
    )
      onBack();
  }
  function exportSheet() {
    window.print();
  }
  function dice(label, bonus) {
    const values = new Uint32Array(1);
    do {
      crypto.getRandomValues(values);
    } while (values[0] >= 4294967280);
    const n = (values[0] % 20) + 1;
    setRoll(`${label}: ${n} ${signed(bonus)} = ${n + bonus}`);
  }
  return (
    <>
      <PrintableCharacter character={c} />
      <div className="page-top">
        <button className="text-button" onClick={back}>
          <ArrowLeft size={15} /> My characters
        </button>
        <div className="top-actions">
          <span className={dirty ? "save-status unsaved" : "save-status"}>
            {dirty ? (
              "Unsaved changes"
            ) : (
              <>
                <Check size={13} /> All changes saved
              </>
            )}
          </span>
          <button
            className="secondary small"
            onClick={exportSheet}
            title="Open the print dialog, then choose Save as PDF"
          >
            <Download size={15} /> Export PDF
          </button>
          <button
            className="primary small"
            onClick={save}
            disabled={busy || !dirty}
          >
            <Save size={15} />
            {busy ? "Saving…" : "Save character"}
          </button>
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <section className="character-banner">
        <div className={`portrait ${c.class.toLowerCase()}`}>
          <Sword size={44} strokeWidth={1} />
          <span>✦</span>
        </div>
        <div>
          <p className="eyebrow">
            {c.campaign || "AN ADVENTURE IN THE MAKING"}
          </p>
          <h1>{c.name}</h1>
          <p>
            {c.species} <span>•</span> {c.class}
            {c.subclass ? ` · ${c.subclass}` : ""} <span>•</span> Level{" "}
            {c.level}
          </p>
        </div>
        <div className="edition-badge">
          <Dices size={16} /> 5E · 2024
        </div>
      </section>
      <nav className="sheet-tabs" aria-label="Character sections">
        {tabs.map(([name, Icon]) => (
          <button
            key={name}
            className={tab === name ? "active" : ""}
            onClick={() => setTab(name)}
          >
            <Icon size={16} />
            {name}
          </button>
        ))}
      </nav>
      <div className="sheet-content">
        {tab === "Overview" && (
          <>
            <div className="combat-stats">
              <div className="stat-card hp-card">
                <div className="stat-label">
                  <Heart size={16} /> HIT POINTS
                </div>
                <div className="hp-value">
                  {c.hp}
                  <span>/ {c.maxHp}</span>
                </div>
                <div className="hp-bar">
                  <span style={{ width: `${(c.hp / c.maxHp) * 100}%` }} />
                </div>
                <div className="hp-controls">
                  <input
                    aria-label="Damage or healing amount"
                    type="number"
                    min={1}
                    max={9999}
                    value={amount}
                    onChange={(e) =>
                      setAmount(
                        Math.max(1, Math.min(9999, Number(e.target.value))),
                      )
                    }
                  />
                  <button
                    className="damage"
                    onClick={() =>
                      setC((prev) => {
                        const absorbed = Math.min(prev.tempHp, amount);
                        return {
                          ...prev,
                          tempHp: prev.tempHp - absorbed,
                          hp: Math.max(0, prev.hp - (amount - absorbed)),
                        };
                      })
                    }
                  >
                    − Damage
                  </button>
                  <button
                    onClick={() => set("hp", Math.min(c.maxHp, c.hp + amount))}
                  >
                    + Heal
                  </button>
                </div>
                <div className="form-grid hp-fields">
                  <NumberField
                    label="Maximum HP"
                    value={c.maxHp}
                    min={1}
                    onChange={(v) =>
                      setC((prev) => ({
                        ...prev,
                        maxHp: v,
                        hp: Math.min(prev.hp, v),
                      }))
                    }
                  />
                  <NumberField
                    label="Temporary HP"
                    value={c.tempHp}
                    onChange={(v) => set("tempHp", v)}
                  />
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">
                  <Shield size={16} /> ARMOR CLASS
                </div>
                <input
                  className="big-stat"
                  aria-label="Armor class"
                  type="number"
                  min={0}
                  max={99}
                  value={c.ac}
                  onChange={(e) =>
                    set("ac", Math.max(0, Math.min(99, Number(e.target.value))))
                  }
                />
                <span className="muted">Defense</span>
              </div>
              <button
                className="stat-card roll-stat"
                onClick={() => dice("Initiative", modifier(c.abilities[1]))}
              >
                <div className="stat-label">
                  <Dices size={16} /> INITIATIVE
                </div>
                <strong className="big-stat">
                  {signed(modifier(c.abilities[1]))}
                </strong>
                <span className="muted">Roll initiative ↗</span>
              </button>
              <div className="stat-card">
                <div className="stat-label">
                  <Compass size={16} /> SPEED
                </div>
                <input
                  className="big-stat"
                  aria-label="Speed in feet"
                  type="number"
                  min={0}
                  max={999}
                  value={c.speed}
                  onChange={(e) =>
                    set(
                      "speed",
                      Math.max(0, Math.min(999, Number(e.target.value))),
                    )
                  }
                />
                <span className="muted">Feet</span>
              </div>
            </div>
            <div className="ability-grid">
              {abilities.map((name, i) => (
                <div className="ability" key={name}>
                  <span>{name}</span>
                  <button
                    title={`Roll ${name}`}
                    onClick={() => dice(name, modifier(c.abilities[i]))}
                  >
                    {signed(modifier(c.abilities[i]))}
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    aria-label={`${name} score`}
                    value={c.abilities[i]}
                    onChange={(e) =>
                      set(
                        "abilities",
                        c.abilities.map((v, j) =>
                          i === j
                            ? Math.max(1, Math.min(30, Number(e.target.value)))
                            : v,
                        ),
                      )
                    }
                  />
                </div>
              ))}
            </div>
            <div className="sheet-columns">
              <div>
                <section className="panel">
                  <div className="panel-title">
                    <h3>Skills & saving throws</h3>
                    <span className="pill">{signed(prof)} proficiency</span>
                  </div>
                  <p className="helper">
                    Click a skill circle to cycle: none → proficient →
                    expertise. Click its bonus to roll.
                  </p>
                  <div className="saving-throws">
                    {abilities.map((name, i) => (
                      <label key={name}>
                        <input
                          type="checkbox"
                          checked={c.saves.includes(i)}
                          onChange={(e) =>
                            set(
                              "saves",
                              e.target.checked
                                ? [...c.saves, i]
                                : c.saves.filter((n) => n !== i),
                            )
                          }
                        />
                        <span>{name.slice(0, 3).toUpperCase()}</span>
                        <button
                          onClick={() =>
                            dice(
                              `${name} save`,
                              modifier(c.abilities[i]) +
                                (c.saves.includes(i) ? prof : 0),
                            )
                          }
                        >
                          {signed(
                            modifier(c.abilities[i]) +
                              (c.saves.includes(i) ? prof : 0),
                          )}
                        </button>
                      </label>
                    ))}
                  </div>
                  <div className="skills-list">
                    {skills.map(([name, index]) => (
                      <div key={name}>
                        <button
                          className={`skill-dot rank-${c.skills[name] || 0}`}
                          aria-label={`${name}: ${["not proficient", "proficient", "expertise"][c.skills[name] || 0]}. Change proficiency`}
                          onClick={() =>
                            set("skills", {
                              ...c.skills,
                              [name]: ((c.skills[name] || 0) + 1) % 3,
                            })
                          }
                        >
                          {c.skills[name] === 2 ? "✦" : ""}
                        </button>
                        <span>
                          {name}
                          <small>
                            {abilities[index].slice(0, 3).toUpperCase()}
                          </small>
                        </span>
                        <button
                          className="skill-bonus"
                          onClick={() =>
                            dice(
                              name,
                              modifier(c.abilities[index]) +
                                prof * (c.skills[name] || 0),
                            )
                          }
                        >
                          {signed(
                            modifier(c.abilities[index]) +
                              prof * (c.skills[name] || 0),
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="passive">
                    <span>Passive Perception</span>
                    <strong>
                      {10 +
                        modifier(c.abilities[4]) +
                        prof * (c.skills.Perception || 0)}
                    </strong>
                  </div>
                </section>
                <OverviewSpells
                  character={c}
                  onManage={() => setTab("Spells")}
                  onCast={cast}
                  onRestore={restoreArcanum}
                  castMessage={castMessage}
                />
              </div>
              <div>
                <section className="panel">
                  <div className="panel-title">
                    <h3>At the table</h3>
                    <Sparkles size={17} />
                  </div>
                  <label className="inspiration">
                    <div>
                      <strong>Heroic Inspiration</strong>
                      <small>A little possibility in your pocket.</small>
                    </div>
                    <input
                      type="checkbox"
                      checked={c.inspiration}
                      onChange={(e) => set("inspiration", e.target.checked)}
                    />
                  </label>
                  <div className="death-saves">
                    <span>Death saves</span>
                    {[
                      ["Successes", "deathSuccess"],
                      ["Failures", "deathFailure"],
                    ].map(([label, key]) => (
                      <div key={key}>
                        <small>{label}</small>
                        {[1, 2, 3].map((n) => (
                          <button
                            key={n}
                            aria-label={`${label}: ${n}`}
                            className={c[key] >= n ? "filled" : ""}
                            onClick={() => set(key, c[key] === n ? n - 1 : n)}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                  <Field label="Conditions">
                    <select
                      value=""
                      onChange={(e) => {
                        if (
                          e.target.value &&
                          !c.conditions.includes(e.target.value)
                        )
                          set("conditions", [...c.conditions, e.target.value]);
                      }}
                    >
                      <option value="">Add a condition…</option>
                      {[
                        "Blinded",
                        "Charmed",
                        "Deafened",
                        "Exhaustion",
                        "Frightened",
                        "Grappled",
                        "Incapacitated",
                        "Invisible",
                        "Paralyzed",
                        "Petrified",
                        "Poisoned",
                        "Prone",
                        "Restrained",
                        "Stunned",
                        "Unconscious",
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="conditions">
                    {c.conditions.map((s) => (
                      <button
                        key={s}
                        onClick={() =>
                          set(
                            "conditions",
                            c.conditions.filter((v) => v !== s),
                          )
                        }
                      >
                        {s}
                        <X size={11} />
                      </button>
                    ))}
                  </div>
                  {c.conditions.includes("Exhaustion") && (
                    <p className="helper">
                      Record your exhaustion level in your journal; apply its
                      effects manually.
                    </p>
                  )}
                </section>
                <OverviewWeapons
                  character={c}
                  onManage={() => setTab("Weapons")}
                  onAttack={attackWeapon}
                  message={weaponMessage}
                />
                <RecordList
                  title="Attacks & actions"
                  type="attacks"
                  items={c.attacks}
                  onChange={(v) => set("attacks", v)}
                />
                <RecordList
                  title="Limited resources"
                  type="resources"
                  items={c.resources}
                  onChange={(v) => set("resources", v)}
                />
              </div>
            </div>
          </>
        )}
        {tab === "Spells" && (
          <>
            <SpellPreparation
              character={c}
              onChange={(patch) =>
                setC((previous) => ({ ...previous, ...patch }))
              }
            />
            <SpellSlots
              character={c}
              onChange={(patch) =>
                setC((previous) =>
                  normalizeCharacterSlots({ ...previous, ...patch }),
                )
              }
            />
            <RecordList
              title="Spellbook"
              type="spells"
              character={c}
              items={c.spells}
              onChange={changeSpells}
              addForm={
                <React.Suspense
                  fallback={
                    <p className="helper" role="status">
                      Opening the spell catalog…
                    </p>
                  }
                >
                  <SpellPicker
                    character={c}
                    items={c.spells}
                    onChange={changeSpells}
                  />
                </React.Suspense>
              }
            />
            <p className="helper">
              Check a level 1+ class spell to mark it prepared. Cantrips are
              always available. Record spellcasting ability, attack bonus, save
              DC, and special slot rules in Features.
            </p>
          </>
        )}
        {tab === "Weapons" && (
          <Weapons character={c} onChange={changeWeapons} />
        )}
        {tab === "Inventory" && (
          <>
            <section className="panel">
              <div className="panel-title">
                <h3>Your pack & purse</h3>
                <Backpack size={18} />
              </div>
              <NumberField
                label="Gold pieces"
                value={c.gold}
                max={100000000}
                onChange={(v) => set("gold", v)}
              />
              <p className="helper">
                Check an item to mark it equipped. Record weight, attunement,
                and properties in its details.
              </p>
              <button className="text-button" onClick={() => setTab("Weapons")}>
                <Sword size={14} /> Manage weapons, ammunition & mastery
              </button>
            </section>
            <RecordList
              title="Equipment"
              type="inventory"
              items={c.inventory}
              onChange={(v) => set("inventory", v)}
            />
          </>
        )}
        {tab === "Features" && (
          <>
            <section className="panel">
              <div className="panel-title">
                <h3>The person behind the legend</h3>
                <Flame size={18} />
              </div>
              <div className="form-grid">
                <Field
                  label="Character name"
                  value={c.name}
                  maxLength={80}
                  onChange={(e) => set("name", e.target.value)}
                />
                <Field label="Class">
                  <select
                    value={c.class}
                    onChange={(e) => set("class", e.target.value)}
                  >
                    {classes.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Subclass"
                  value={c.subclass}
                  maxLength={200}
                  onChange={(e) => set("subclass", e.target.value)}
                />
                <NumberField
                  label="Level"
                  value={c.level}
                  min={1}
                  max={20}
                  onChange={(v) => set("level", v)}
                />
                {[
                  ["species", "Species"],
                  ["background", "Background"],
                  ["campaign", "Campaign"],
                  ["languages", "Languages"],
                  [
                    "equipmentProficiencies",
                    "Armor, weapon & tool proficiencies",
                  ],
                ].map(([key, label]) => (
                  <Field
                    key={key}
                    label={label}
                    value={c[key]}
                    maxLength={200}
                    onChange={(e) => set(key, e.target.value)}
                  />
                ))}
                <NumberField
                  label="Experience points"
                  value={c.xp}
                  max={10000000}
                  onChange={(v) => set("xp", v)}
                />
              </div>
              <Field label="Appearance & personality">
                <textarea
                  rows={3}
                  maxLength={200}
                  value={c.appearance}
                  onChange={(e) => set("appearance", e.target.value)}
                  placeholder="What makes this character unmistakably yours?"
                />
              </Field>
            </section>
            <section className="panel">
              <h3>Features, feats & proficiencies</h3>
              <p className="helper">
                Keep class features, species traits, Origin feats, fighting
                styles, mastery properties, and other rules here.
              </p>
              <textarea
                className="journal-input"
                rows={14}
                maxLength={20000}
                value={c.features}
                onChange={(e) => set("features", e.target.value)}
                placeholder="Every hero has a few tricks up their sleeve…"
              />
            </section>
          </>
        )}
        {tab === "Journal" && (
          <section className="panel">
            <div className="panel-title">
              <h3>A story worth keeping</h3>
              <BookOpen size={18} />
            </div>
            <p className="muted">
              Session notes, unlikely allies, unfinished business. It all
              belongs here.
            </p>
            <textarea
              className="journal-input"
              rows={22}
              maxLength={20000}
              value={c.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Our story begins…"
            />
            <div className="journal-footer">
              <span>{c.notes.length.toLocaleString()} / 20,000 characters</span>
              <span>Remember to save your character</span>
            </div>
          </section>
        )}
      </div>
      <footer className="sheet-footer">
        <span>
          <Shield size={13} /> Your sheet is private to your account.
        </span>
        <button
          className="text-button"
          disabled={busy}
          onClick={async () => {
            if (
              !window.confirm(
                `Save and archive ${c.name}? Its full sheet will be kept in your archive and can be restored later.`,
              )
            )
              return;
            setBusy(true);
            setError("");
            try {
              await onArchive(c);
            } catch (e) {
              setError(e.message);
              setBusy(false);
            }
          }}
        >
          <Archive size={13} /> Archive character
        </button>
        <button
          className="text-button danger"
          disabled={busy}
          onClick={async () => {
            if (
              window.confirm(
                `Permanently delete ${c.name}? This cannot be undone.`,
              )
            ) {
              setBusy(true);
              try {
                await onDelete(c.id);
              } catch (e) {
                setError(e.message);
                setBusy(false);
              }
            }
          }}
        >
          <Trash2 size={13} /> Delete character
        </button>
      </footer>
      {roll && (
        <div className="roll-toast" role="status">
          <Dices size={22} />
          <div>
            <small>THE DICE HAVE SPOKEN</small>
            <strong>{roll}</strong>
          </div>
          <button aria-label="Dismiss dice result" onClick={() => setRoll("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
function App() {
  const [page, setPage] = useState("characters");
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [characters, setCharacters] = useState([]),
    [archivedCharacters, setArchivedCharacters] = useState([]),
    [selected, setSelected] = useState(null),
    [creating, setCreating] = useState(false),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All classes");
  useEffect(() => {
    api("/me")
      .then(setUser)
      .catch((e) => {
        if (e.message !== "Please sign in to continue.") setError(e.message);
      })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (user)
      Promise.all([api("/characters"), api("/characters?archived=true")])
        .then(([active, archived]) => {
          setCharacters(active);
          setArchivedCharacters(archived);
        })
        .catch((e) => setError(e.message));
  }, [user]);
  async function create(c) {
    const saved = await api("/characters", {
      method: "POST",
      body: JSON.stringify(c),
    });
    setCharacters((prev) => [saved, ...prev]);
    setCreating(false);
    setSelected(saved);
  }
  async function save(c) {
    const saved = await api(`/characters/${c.id}`, {
      method: "PUT",
      body: JSON.stringify(c),
    });
    setCharacters((prev) => prev.map((v) => (v.id === saved.id ? saved : v)));
    return saved;
  }
  async function remove(id) {
    await api(`/characters/${id}`, { method: "DELETE" });
    setCharacters((prev) => prev.filter((v) => v.id !== id));
    setSelected(null);
  }
  async function archive(c) {
    // Save current edits before moving the sheet, so no in-browser progress is lost.
    const saved = await save(c);
    const archived = await api(`/characters/${saved.id}/archive`, {
      method: "POST",
    });
    setCharacters((prev) => prev.filter((v) => v.id !== saved.id));
    setArchivedCharacters((prev) => [
      archived,
      ...prev.filter((v) => v.id !== saved.id),
    ]);
    setSelected(null);
    setPage("archive");
  }
  async function restore(id) {
    const restored = await api(`/characters/${id}/restore`, { method: "POST" });
    setArchivedCharacters((prev) => prev.filter((v) => v.id !== id));
    setCharacters((prev) => [restored, ...prev.filter((v) => v.id !== id)]);
  }
  async function logout() {
    if (
      selected &&
      !window.confirm("Sign out? Any unsaved sheet changes will be discarded.")
    )
      return;
    try {
      await api("/logout", { method: "POST" });
      setUser(null);
      setPage("characters");
      setSelected(null);
      setCharacters([]);
      setArchivedCharacters([]);
    } catch (e) {
      setError(e.message);
    }
  }
  if (loading)
    return (
      <div className="loading">
        <Dices size={36} />
        <p>Gathering your party…</p>
      </div>
    );
  if (!user)
    return (
      <>
        <Auth
          onLogin={(u) => {
            setError("");
            setUser(u);
          }}
        />
        {error && (
          <p className="connection-error" role="alert">
            {error} Make sure the API server is running, then refresh.
          </p>
        )}
      </>
    );
  const filtered = characters.filter(
    (c) =>
      `${c.name} ${c.species} ${c.campaign}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "All classes" || c.class === filter),
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-section">YOUR ADVENTURES</div>
        <button
          className={`sidebar-link ${page === "characters" ? "active" : ""}`}
          onClick={() => {
            if (
              !selected ||
              window.confirm(
                "Return to your vault? Unsaved sheet changes will be discarded.",
              )
            ) {
              setSelected(null);
              setPage("characters");
            }
          }}
        >
          <Users size={18} /> My characters<span>{characters.length}</span>
        </button>
        <button
          className={`sidebar-link ${page === "archive" ? "active" : ""}`}
          onClick={() => {
            if (
              selected &&
              !window.confirm(
                "Open the archive? Unsaved sheet changes will be discarded.",
              )
            )
              return;
            setSelected(null);
            setPage("archive");
          }}
        >
          <Archive size={18} /> Character archive
          <span>{archivedCharacters.length}</span>
        </button>
        {user.isAdmin && (
          <button
            className={`sidebar-link ${page === "logs" ? "active" : ""}`}
            onClick={() => {
              if (
                selected &&
                !window.confirm(
                  "Open logs? Unsaved sheet changes will be discarded.",
                )
              )
                return;
              setSelected(null);
              setPage("logs");
            }}
          >
            <ScrollText size={18} /> Admin logs
          </button>
        )}
        <button
          className={`sidebar-link ${page === "report" ? "active" : ""}`}
          onClick={() => {
            if (
              selected &&
              !window.confirm(
                "Report a bug? Unsaved sheet changes will be discarded.",
              )
            )
              return;
            setSelected(null);
            setPage("report");
          }}
        >
          <Bug size={18} /> Report a bug
        </button>
        {user.isAdmin && (
          <button
            className={`sidebar-link ${page === "bugs" ? "active" : ""}`}
            onClick={() => {
              if (
                selected &&
                !window.confirm(
                  "Open bug reports? Unsaved sheet changes will be discarded.",
                )
              )
                return;
              setSelected(null);
              setPage("bugs");
            }}
          >
            <Bug size={18} /> Admin bugs
          </button>
        )}
        <button
          className={`sidebar-link ${page === "account" ? "active" : ""}`}
          onClick={() => {
            if (
              selected &&
              !window.confirm(
                "Open account settings? Unsaved sheet changes will be discarded.",
              )
            )
              return;
            setSelected(null);
            setPage("account");
          }}
        >
          <Shield size={18} /> Account settings
        </button>
        <button
          className={`sidebar-link ${page === "help" ? "active" : ""}`}
          onClick={() => {
            if (
              selected &&
              !window.confirm(
                "Open the guide? Unsaved sheet changes will be discarded.",
              )
            )
              return;
            setSelected(null);
            setPage("help");
          }}
        >
          <BookOpen size={18} /> How to use
        </button>
        <div className="sidebar-callout">
          <div className="tiny-stars">✦ · ✧</div>
          <h3>Make it a good story.</h3>
          <p>The best characters start with a little imagination.</p>
          <button
            onClick={() => {
              if (
                !selected ||
                window.confirm(
                  "Create another character? Unsaved sheet changes will be discarded.",
                )
              ) {
                setSelected(null);
                setCreating(true);
                setPage("characters");
              }
            }}
          >
            Create a character <Plus size={14} />
          </button>
        </div>
        <a
          className="sidebar-rules"
          href="https://www.dndbeyond.com/sources/dnd/br-2024/creating-a-character"
          target="_blank"
          rel="noreferrer"
        >
          <BookOpen size={17} />
          <span>
            2024 free rules<small>A little guidance for the road ↗</small>
          </span>
        </a>
        <div className="sidebar-theme">
          <ThemeToggle />
        </div>
        <div className="user-block">
          {user.isAdmin && (
            <button
              className="icon-button admin-mobile"
              aria-label="Admin logs"
              onClick={() => {
                if (
                  selected &&
                  !window.confirm(
                    "Open logs? Unsaved sheet changes will be discarded.",
                  )
                )
                  return;
                setSelected(null);
                setPage("logs");
              }}
            >
              <ScrollText size={17} />
            </button>
          )}
          <div className="avatar">{user.name.charAt(0).toUpperCase()}</div>
          <div>
            <strong>{user.name}</strong>
            <small>{user.isAdmin ? "Administrator" : "Adventurer"}</small>
          </div>
          <button
            className="icon-button"
            aria-label="Sign out"
            onClick={logout}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <main className="main-area">
        <label className="mobile-navigation">
          Navigate
          <select
            aria-label="Navigate"
            value={page}
            onChange={(e) => {
              if (
                selected &&
                !window.confirm(
                  "Leave this character? Unsaved sheet changes will be discarded.",
                )
              )
                return;
              setSelected(null);
              setPage(e.target.value);
            }}
          >
            <option value="characters">My characters</option>
            <option value="archive">Character archive</option>
            <option value="report">Report a bug</option>
            <option value="account">Account settings</option>
            <option value="help">How to use</option>
            {user.isAdmin && (
              <>
                <option value="logs">Admin logs</option>
                <option value="bugs">Admin bugs</option>
              </>
            )}
          </select>
        </label>
        {error && (
          <div className="error" role="alert">
            {error}
            <button className="text-button" onClick={() => setError("")}>
              Dismiss
            </button>
          </div>
        )}
        {page === "archive" ? (
          <CharacterArchive
            characters={archivedCharacters}
            onRestore={restore}
            onBack={() => setPage("characters")}
          />
        ) : page === "help" ? (
          <HowToUse
            isAdmin={user.isAdmin}
            onBack={() => setPage("characters")}
          />
        ) : page === "account" ? (
          <AccountSettings
            api={api}
            email={user.email}
            onBack={() => setPage("characters")}
          />
        ) : page === "report" || (page === "bugs" && user.isAdmin) ? (
          <BugReports
            key={page}
            api={api}
            admin={page === "bugs"}
            onBack={() => setPage("characters")}
          />
        ) : page === "logs" && user.isAdmin ? (
          <AdminLogs api={api} onBack={() => setPage("characters")} />
        ) : selected ? (
          <Sheet
            key={selected.id}
            character={selected}
            onSave={save}
            onDelete={remove}
            onArchive={archive}
            onBack={() => setSelected(null)}
          />
        ) : (
          <>
            <header className="vault-heading">
              <div>
                <p className="eyebrow">THE ADVENTURE IS YOURS</p>
                <h1>
                  My characters<span className="heading-dot">.</span>
                </h1>
                <p className="muted">
                  Every great story starts with a character. Here are yours.
                </p>
              </div>
              <button className="primary" onClick={() => setCreating(true)}>
                <Plus size={17} /> Create character
              </button>
            </header>
            <section className="welcome-banner">
              <div>
                <span className="pill">YOUR NEXT CHAPTER</span>
                <h2>A whole world of possibility.</h2>
                <p>
                  A brave new face. A familiar old friend.
                  <br />
                  Who will you bring to the table?
                </p>
                <button
                  className="banner-button"
                  onClick={() => setCreating(true)}
                >
                  Build your next character <ChevronRight size={15} />
                </button>
              </div>
              <div className="banner-art" aria-hidden="true">
                <div className="art-ring" />
                <Sword size={100} strokeWidth={0.7} />
                <span>✦</span>
                <Shield size={50} strokeWidth={0.7} />
              </div>
            </section>
            <div className="vault-toolbar">
              <div>
                <h2>Your character vault</h2>
                <span className="count">{characters.length}</span>
              </div>
              <div className="filters">
                <input
                  aria-label="Search characters"
                  placeholder="Search characters…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <select
                  aria-label="Filter by class"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option>All classes</option>
                  {classes.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            {characters.length === 0 ? (
              <section className="empty-vault">
                <div className="empty-icon">
                  <ScrollText size={36} strokeWidth={1} />
                </div>
                <h2>Your first chapter is unwritten.</h2>
                <p>
                  Create your first character and give your next adventure a
                  name.
                </p>
                <button className="primary" onClick={() => setCreating(true)}>
                  <Plus size={16} /> Create your first character
                </button>
                <small>Built for D&D 5e · 2024 rules</small>
              </section>
            ) : filtered.length === 0 ? (
              <section className="empty-vault">
                <h2>No adventurers found.</h2>
                <p>Try a different name or class.</p>
                <button
                  className="secondary"
                  onClick={() => {
                    setQuery("");
                    setFilter("All classes");
                  }}
                >
                  Clear filters
                </button>
              </section>
            ) : (
              <div className="character-grid">
                {filtered.map((c) => (
                  <button
                    className="character-card"
                    key={c.id}
                    onClick={() => setSelected(c)}
                  >
                    <div className={`card-portrait ${c.class.toLowerCase()}`}>
                      <Sword size={58} strokeWidth={0.8} />
                      <span className="level-badge">LEVEL {c.level}</span>
                      <span className="card-star">✦</span>
                    </div>
                    <div className="card-body">
                      <span className="class-label">{c.class}</span>
                      <h3>{c.name}</h3>
                      <p>
                        {c.species}
                        {c.background ? ` · ${c.background}` : ""}
                      </p>
                      <div className="card-stats">
                        <span>
                          <Heart size={14} />
                          {c.hp}/{c.maxHp} HP
                        </span>
                        <span>
                          <Shield size={14} />
                          {c.ac} AC
                        </span>
                      </div>
                      <div className="card-bottom">
                        <span>{c.campaign || "Ready for adventure"}</span>
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </button>
                ))}
                <button
                  className="new-character-card"
                  onClick={() => setCreating(true)}
                >
                  <div>
                    <Plus size={23} />
                  </div>
                  <strong>A new story awaits</strong>
                  <span>Create another character</span>
                </button>
              </div>
            )}
            <footer className="vault-footer">
              <Dices size={15} />
              <span>
                Made for the moments between “roll initiative” and “one more
                session.”
              </span>
              <span>CHARACTER KEEPER · 2024</span>
            </footer>
          </>
        )}
      </main>
      {creating && (
        <Creator onClose={() => setCreating(false)} onCreate={create} />
      )}
    </div>
  );
}
createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>,
);
