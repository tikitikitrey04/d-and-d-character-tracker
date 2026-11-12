import express from "express";
import { mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createApp } from "./app.mjs";
mkdirSync("data", { recursive: true });
const { app, db } = createApp();
if (existsSync("dist/index.html")) {
  app.use(express.static(resolve("dist")));
  app.get("/{*path}", (req, res) => res.sendFile(resolve("dist/index.html")));
}
const server = app.listen(
  Number(process.env.PORT || 3001),
  process.env.HOST || "127.0.0.1",
  () =>
    console.log(
      "Character Keeper API: http://127.0.0.1:" + (process.env.PORT || 3001),
    ),
);
function stop() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
