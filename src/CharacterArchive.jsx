import React, { useState } from "react";
import { Archive, RotateCcw } from "lucide-react";

export default function CharacterArchive({ characters, onRestore, onBack }) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const filtered = characters.filter((c) =>
    `${c.name} ${c.class} ${c.campaign}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  async function restore(c) {
    setBusy(c.id);
    setError("");
    setNotice("");
    try {
      await onRestore(c.id);
      setNotice(`${c.name} restored to My characters.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }
  return (
    <section className="character-archive">
      <header className="vault-heading">
        <div>
          <p className="eyebrow">EVERY CHAPTER COUNTS</p>
          <h1>Character archive</h1>
          <p className="muted">
            Keep past adventures safe. Restore a character whenever you want to
            play or edit it again.
          </p>
        </div>
        <button className="secondary" onClick={onBack}>
          Back to characters
        </button>
      </header>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="archive-notice" role="status">
          {notice}
        </p>
      )}
      <div className="vault-toolbar">
        <div>
          <h2>Archived characters</h2>
          <span className="count">{characters.length}</span>
        </div>
        <input
          aria-label="Search archived characters"
          placeholder="Search name, class, or campaign…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {characters.length === 0 ? (
        <section className="empty-vault">
          <Archive size={36} />
          <h2>No archived characters yet.</h2>
          <p>
            Open a character and choose Archive character at the bottom of the
            sheet. Its full sheet will be kept here.
          </p>
        </section>
      ) : filtered.length === 0 ? (
        <section className="empty-vault">
          <h2>No archived characters found.</h2>
          <p>Try another name, class, or campaign.</p>
          <button className="secondary" onClick={() => setQuery("")}>
            Clear search
          </button>
        </section>
      ) : (
        <div className="archive-grid">
          {filtered.map((c) => (
            <article className="archive-card" key={c.id}>
              <span className="pill">Archived</span>
              <h3>{c.name}</h3>
              <p className="muted">
                Level {c.level} {c.class}
                {c.species ? ` · ${c.species}` : ""}
              </p>
              {c.campaign && <p className="archive-campaign">{c.campaign}</p>}
              <p className="muted">
                Archived{" "}
                <time dateTime={c.archivedAt}>
                  {new Date(c.archivedAt).toLocaleDateString()}
                </time>
              </p>
              <button
                className="secondary"
                disabled={busy !== null}
                aria-label={`Restore ${c.name}`}
                onClick={() => restore(c)}
              >
                <RotateCcw size={16} />
                {busy === c.id ? "Restoring…" : "Restore character"}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
