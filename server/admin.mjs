// Local operator command only; public registration cannot grant admin access.
import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import { initializeAudit, setAdmin } from "./audit.mjs";

const [action, email] = process.argv.slice(2);
const databasePath = "data/keeper.sqlite";
if (!["grant", "revoke"].includes(action) || !email) {
  console.error("Usage: node server/admin.mjs grant|revoke ACCOUNT_EMAIL");
  process.exitCode = 1;
} else if (!existsSync(databasePath)) {
  console.error(
    "Database not found. Run the app and register an account first.",
  );
  process.exitCode = 1;
} else {
  const db = new DatabaseSync(databasePath);
  try {
    db.exec("PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;");
    setAdmin(db, email, action === "grant", initializeAudit(db));
    console.log(
      `Admin access ${action === "grant" ? "granted" : "revoked"}. Refresh the app to update navigation.`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}
