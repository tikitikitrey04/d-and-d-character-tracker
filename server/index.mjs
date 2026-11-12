import express from "express";
import { mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createApp } from "./app.mjs";
mkdirSync("data", { recursive: true });
const { app, db } = createApp();
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || "127.0.0.1";
if (existsSync("dist/index.html")) {
  app.use(express.static(resolve("dist")));
  app.get("/{*path}", (req, res) => res.sendFile(resolve("dist/index.html")));
}
const server = app.listen(port, host, () =>
  console.log(`Character Keeper: http://${host}:${port}`),
);
function stop() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
