import React, { useState } from "react";

export default function AccountSettings({ api, onBack, email }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (newPassword !== confirmation) {
      setError("New passwords do not match.");
      return;
    }
    if (currentPassword === newPassword) {
      setError("Choose a different new password.");
      return;
    }
    setBusy(true);
    try {
      await api("/account/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setSuccess(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="account-settings">
      <header className="vault-heading">
        <div>
          <p className="eyebrow">YOUR ACCOUNT</p>
          <h1>Account settings</h1>
          <p className="muted">Signed in as {email}</p>
        </div>
        <button className="secondary" onClick={onBack}>
          Back to characters
        </button>
      </header>
      <form className="password-form" onSubmit={submit}>
        <h2>Change password</h2>
        <p className="muted">
          Use 10–128 characters. Your other sessions will be signed out; you
          will stay signed in here.
        </p>
        <input
          type="text"
          name="username"
          value={email}
          autoComplete="username"
          readOnly
          hidden
        />
        <div className="field">
          <label htmlFor="current-password">Current password</label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            required
            minLength={10}
            maxLength={128}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={busy}
          />
        </div>
        <div className="field">
          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            maxLength={128}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={busy}
          />
        </div>
        <div className="field">
          <label htmlFor="confirm-password">Confirm new password</label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            maxLength={128}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            disabled={busy}
          />
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="password-success" role="status">
            Password changed. Your other sessions have been signed out.
          </p>
        )}
        <button className="primary" disabled={busy}>
          {busy ? "Changing password…" : "Change password"}
        </button>
      </form>
    </section>
  );
}
