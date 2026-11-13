import React, { useEffect, useState } from "react";

export default function AdminLogs({ api, onBack }) {
  const [level, setLevel] = useState("");
  const [before, setBefore] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError("");
    const query = new URLSearchParams();
    if (level) query.set("level", level);
    if (before) query.set("before", before);
    api(`/admin/logs?${query}`)
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
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [api, level, before, refresh]);
  return (
    <section className="admin-logs">
      <header className="vault-heading">
        <div>
          <p className="eyebrow">ADMINISTRATION</p>
          <h1>Application logs</h1>
          <p className="muted">
            Activity and request outcomes. Retained for up to 30 days or 10,000
            entries.
          </p>
        </div>
        <button className="secondary" onClick={onBack}>
          Back to characters
        </button>
      </header>
      <div className="admin-log-controls">
        <label>
          Severity{" "}
          <select
            value={level}
            onChange={(e) => {
              setLevel(e.target.value);
              setBefore(null);
            }}
          >
            <option value="">All levels</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
          </select>
        </label>
        <button
          className="primary"
          disabled={busy}
          onClick={() => {
            setBefore(null);
            setRefresh((n) => n + 1);
          }}
        >
          Refresh latest
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <p className="muted" role="status">
        {busy
          ? "Loading logs…"
          : `${result?.logs.length ?? 0} entries, newest first. Times shown in your local timezone.`}
      </p>
      {!busy && result && (
        <>
          <div
            className="admin-log-table"
            tabIndex={0}
            aria-label="Scrollable application logs"
          >
            <table>
              <thead>
                <tr>
                  {[
                    "Time",
                    "Level",
                    "Event",
                    "Account ID",
                    "Request",
                    "Status",
                    "Duration",
                  ].map((title) => (
                    <th key={title} scope="col">
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <time dateTime={log.time}>
                        {new Date(log.time).toLocaleString()}
                      </time>
                    </td>
                    <td>{log.level}</td>
                    <td>{log.event}</td>
                    <td>
                      <code>{log.actor_id || "Anonymous / system"}</code>
                    </td>
                    <td>{log.method ? `${log.method} ${log.route}` : "—"}</td>
                    <td>{log.status ?? "—"}</td>
                    <td>
                      {log.duration_ms == null ? "—" : `${log.duration_ms} ms`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.logs.length === 0 && <p>No logs match this filter.</p>}
          {result.nextBefore && (
            <button
              className="secondary"
              onClick={() => setBefore(result.nextBefore)}
            >
              Older entries
            </button>
          )}
        </>
      )}
    </section>
  );
}
