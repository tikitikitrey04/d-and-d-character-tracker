import { randomBytes } from "node:crypto";

export function registerBugRoutes(app, db) {
  db.exec(`CREATE TABLE IF NOT EXISTS bug_reports (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL, description TEXT NOT NULL, steps TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open', created TEXT NOT NULL, updated TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS bug_reports_user_created ON bug_reports(user_id,created);
    CREATE INDEX IF NOT EXISTS bug_reports_status_created ON bug_reports(status,created);`);
  const statuses = ["open", "in_progress", "resolved"];
  const adminOnly = (req, res, next) =>
    req.user.isAdmin
      ? next()
      : res.status(403).json({ error: "Administrator access required." });
  app.post("/api/bugs", (req, res) => {
    const { title, description, steps = "" } = req.body || {};
    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.length > 120 ||
      typeof description !== "string" ||
      !description.trim() ||
      description.length > 5000 ||
      typeof steps !== "string" ||
      steps.length > 3000
    )
      return res
        .status(400)
        .json({
          error:
            "Enter a title (up to 120 characters), a description (up to 5,000), and optional steps (up to 3,000).",
        });
    const recent = db
      .prepare(
        "SELECT COUNT(*) AS total FROM bug_reports WHERE user_id=? AND created>=?",
      )
      .get(req.user.id, new Date(Date.now() - 3600000).toISOString());
    if (recent.total >= 10)
      return res
        .status(429)
        .json({
          error:
            "You can submit up to 10 reports per hour. Please try again later.",
        });
    const id = randomBytes(16).toString("hex"),
      now = new Date().toISOString();
    db.prepare(
      "INSERT INTO bug_reports (id,user_id,title,description,steps,status,created,updated) VALUES (?,?,?,?,?,'open',?,?)",
    ).run(
      id,
      req.user.id,
      title.trim(),
      description.trim(),
      steps.trim(),
      now,
      now,
    );
    res
      .status(201)
      .json({
        id,
        title: title.trim(),
        description: description.trim(),
        steps: steps.trim(),
        status: "open",
        created: now,
        updated: now,
      });
  });
  function list(req, res, admin) {
    const { status, before } = req.query;
    if (
      Object.keys(req.query).some(
        (key) => !["status", "before"].includes(key),
      ) ||
      (status !== undefined && !statuses.includes(status)) ||
      (before !== undefined &&
        (typeof before !== "string" ||
          !/^\d{1,15}$/.test(before) ||
          Number(before) < 1))
    )
      return res.status(400).json({ error: "Invalid report filter." });
    const rows = db
      .prepare(
        `SELECT b.rowid AS cursor, b.id, b.title, b.description, b.steps,
      b.status, b.created, b.updated ${admin ? ", u.name AS reporter" : ""}
      FROM bug_reports b ${admin ? "JOIN users u ON u.id=b.user_id" : ""}
      WHERE (? IS NULL OR b.user_id=?) AND (? IS NULL OR b.status=?)
      AND (? IS NULL OR b.rowid<?) ORDER BY b.rowid DESC LIMIT 51`,
      )
      .all(
        admin ? null : req.user.id,
        req.user.id,
        status ?? null,
        status ?? null,
        before ?? null,
        before === undefined ? null : Number(before),
      );
    const page = rows.slice(0, 50);
    res.json({
      reports: page.map(({ cursor, ...report }) => report),
      nextBefore: rows.length > 50 ? page.at(-1).cursor : null,
    });
  }
  app.get("/api/bugs", (req, res) => list(req, res, false));
  app.get("/api/admin/bugs", adminOnly, (req, res) => list(req, res, true));
  app.patch("/api/admin/bugs/:id", adminOnly, (req, res) => {
    if (!statuses.includes(req.body?.status))
      return res.status(400).json({ error: "Choose a valid report status." });
    const updated = new Date().toISOString();
    const result = db
      .prepare("UPDATE bug_reports SET status=?,updated=? WHERE id=?")
      .run(req.body.status, updated, req.params.id);
    if (!result.changes)
      return res.status(404).json({ error: "Bug report not found." });
    res.json({ id: req.params.id, status: req.body.status, updated });
  });
}
