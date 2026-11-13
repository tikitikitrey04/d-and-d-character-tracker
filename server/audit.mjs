export function initializeAudit(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS admins (
    user_id TEXT PRIMARY KEY REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, time TEXT NOT NULL,
      level TEXT NOT NULL, event TEXT NOT NULL, actor_id TEXT,
      method TEXT, route TEXT, status INTEGER, duration_ms INTEGER);
    CREATE INDEX IF NOT EXISTS audit_logs_time ON audit_logs(time);`);
  return function audit({
    level = "info",
    event,
    actorId = null,
    method = null,
    route = null,
    status = null,
    durationMs = null,
  }) {
    try {
      db.prepare(
        `INSERT INTO audit_logs
        (time,level,event,actor_id,method,route,status,duration_ms)
        VALUES (?,?,?,?,?,?,?,?)`,
      ).run(
        new Date().toISOString(),
        level,
        event,
        actorId,
        method,
        route,
        status,
        durationMs,
      );
      db.prepare(
        `DELETE FROM audit_logs WHERE time < ? OR id <=
        (SELECT id FROM audit_logs ORDER BY id DESC LIMIT 1 OFFSET 10000)`,
      ).run(new Date(Date.now() - 30 * 86400000).toISOString());
    } catch {
      console.error("Unable to write application audit log.");
    }
  };
}

export function setAdmin(db, email, enabled, audit) {
  const user = db
    .prepare("SELECT id FROM users WHERE email=?")
    .get(email.trim().toLowerCase());
  if (!user) throw new Error("Account not found. Register in the app first.");
  if (enabled)
    db.prepare("INSERT OR IGNORE INTO admins (user_id) VALUES (?)").run(
      user.id,
    );
  else db.prepare("DELETE FROM admins WHERE user_id=?").run(user.id);
  audit({
    event: enabled ? "admin.granted" : "admin.revoked",
    actorId: user.id,
  });
}
