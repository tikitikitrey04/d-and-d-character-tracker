import React, { useEffect, useState } from "react";

const statuses = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};
export default function BugReports({ api, admin = false, onBack }) {
  const [draft, setDraft] = useState({ title: "", description: "", steps: "" });
  const [status, setStatus] = useState("");
  const [before, setBefore] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const query = new URLSearchParams();
    if (status) query.set("status", status);
    if (before) query.set("before", before);
    api(`${admin ? "/admin" : ""}/bugs?${query}`)
      .then((data) => {
        if (active) setResult(data);
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setResult(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api, admin, status, before, refresh]);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("/bugs", { method: "POST", body: JSON.stringify(draft) });
      setDraft({ title: "", description: "", steps: "" });
      setNotice("Bug report submitted. Thank you!");
      setBefore(null);
      setStatus("");
      setRefresh((n) => n + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function update(id, value) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(`/admin/bugs/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: value }),
      });
      setNotice("Report status updated.");
      setRefresh((n) => n + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="bug-page">
      <header className="vault-heading">
        <div>
          <p className="eyebrow">
            {admin ? "ADMINISTRATION" : "HELP IMPROVE CHARACTER KEEPER"}
          </p>
          <h1>{admin ? "Bug reports" : "Report a bug"}</h1>
          <p className="muted">
            {admin
              ? "Review reports from all players and track their progress."
              : "Tell us what went wrong. Administrators can review your report."}
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
        <p className="bug-notice" role="status">
          {notice}
        </p>
      )}
      {!admin && (
        <form className="bug-form" onSubmit={submit}>
          <p className="muted">
            Include what you expected and what happened. Please leave out
            passwords and other sensitive information.
          </p>
          <div className="field">
            <label htmlFor="bug-title">Title</label>
            <input
              id="bug-title"
              required
              maxLength={120}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="bug-description">What went wrong?</label>
            <textarea
              id="bug-description"
              required
              maxLength={5000}
              rows={5}
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="bug-steps">Steps to reproduce (optional)</label>
            <textarea
              id="bug-steps"
              maxLength={3000}
              rows={4}
              value={draft.steps}
              onChange={(e) => setDraft({ ...draft, steps: e.target.value })}
            />
          </div>
          <button className="primary" disabled={busy}>
            {busy ? "Submitting…" : "Submit bug report"}
          </button>
        </form>
      )}
      <h2>{admin ? "All player reports" : "My reports"}</h2>
      <div className="admin-log-controls">
        <label>
          Report status
          <select
            aria-label="Report status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setBefore(null);
            }}
          >
            <option value="">All statuses</option>
            {Object.entries(statuses).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="secondary"
          disabled={loading || busy}
          onClick={() => {
            setBefore(null);
            setRefresh((n) => n + 1);
          }}
        >
          Refresh reports
        </button>
      </div>
      {loading ? (
        <p role="status">Loading reports…</p>
      ) : (
        result && (
          <>
            {!result.reports.length && <p>No bug reports match this filter.</p>}
            <div className="bug-list">
              {result.reports.map((report) => (
                <article className="bug-card" key={report.id}>
                  <div className="bug-heading">
                    <h3>{report.title}</h3>
                    <span className="pill">{statuses[report.status]}</span>
                  </div>
                  <p className="muted">
                    {admin && <>Reported by {report.reporter} · </>}
                    <time dateTime={report.created}>
                      {new Date(report.created).toLocaleString()}
                    </time>
                  </p>
                  <p className="bug-content">{report.description}</p>
                  {report.steps && (
                    <details>
                      <summary>Steps to reproduce</summary>
                      <p className="bug-content">{report.steps}</p>
                    </details>
                  )}
                  {admin && (
                    <label className="bug-status">
                      Status for {report.title}
                      <select
                        aria-label={`Status for ${report.title}`}
                        value={report.status}
                        disabled={busy}
                        onChange={(e) => update(report.id, e.target.value)}
                      >
                        {Object.entries(statuses).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </article>
              ))}
            </div>
            {result.nextBefore && (
              <button
                className="secondary"
                disabled={busy}
                onClick={() => setBefore(result.nextBefore)}
              >
                Older reports
              </button>
            )}
            {before && (
              <button
                className="secondary"
                disabled={busy}
                onClick={() => setBefore(null)}
              >
                Newest reports
              </button>
            )}
          </>
        )
      )}
    </section>
  );
}
