import test from "node:test";
import assert from "node:assert/strict";
import { createAutosave } from "../shared/autosave.mjs";

function fixture(save = async (value) => ({ ...value, updated: "saved" })) {
  const timers = new Map(),
    statuses = [],
    results = [],
    writes = [];
  let id = 0;
  const initial = { name: "Hero", notes: "" };
  const saver = createAutosave({
    initial,
    save: (value) => {
      writes.push(value);
      return save(value);
    },
    onSaved: (result, snapshot) => results.push({ result, snapshot }),
    onStatus: (status) => statuses.push(status),
    schedule: (callback, delay) => {
      assert.equal(delay, 1000);
      timers.set(++id, callback);
      return id;
    },
    cancel: (key) => timers.delete(key),
  });
  return {
    initial,
    saver,
    writes,
    timers,
    statuses,
    results,
    tick() {
      const callbacks = [...timers.values()];
      timers.clear();
      callbacks.forEach((callback) => callback());
    },
  };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("autosave debounces edits, skips unchanged sheets, and manual save cancels the timer", async () => {
  const f = fixture();
  f.saver.update(f.initial);
  assert.equal(f.timers.size, 0);
  f.saver.update({ ...f.initial, notes: "one" });
  f.saver.update({ ...f.initial, notes: "two" });
  assert.equal(f.timers.size, 1);
  assert.equal(f.writes.length, 0);
  f.tick();
  await settle();
  assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0].notes, "two");
  assert.equal(f.statuses.at(-1).phase, "saved");
  f.saver.update({ ...f.initial, notes: "three" });
  await f.saver.flush();
  assert.equal(f.timers.size, 0);
  assert.equal(f.writes.length, 2);
});

test("edits during a request are queued without concurrent writes or losing new data", async () => {
  const resolve = [];
  const f = fixture(
    (snapshot) =>
      new Promise((done) =>
        resolve.push(() => done({ ...snapshot, updated: "server" })),
      ),
  );
  f.saver.update({ ...f.initial, notes: "first" });
  const first = f.saver.flush();
  await settle();
  f.saver.update({ ...f.initial, notes: "newer" });
  assert.equal(f.saver.flush(), first);
  assert.equal(f.writes.length, 1);
  resolve.shift()();
  await first;
  assert.equal(f.timers.size, 1);
  f.tick();
  await settle();
  assert.equal(f.writes.length, 2);
  assert.equal(f.writes[1].notes, "newer");
  resolve.shift()();
  await settle();
  assert.equal(f.statuses.at(-1).phase, "saved");
  assert.equal(f.results.at(-1).result.notes, "newer");
});

test("failure retains edits without a retry loop; manual retry and later edits recover", async () => {
  let failing = true;
  const f = fixture(async (snapshot) => {
    if (failing) throw new Error("Offline");
    return snapshot;
  });
  const changed = { ...f.initial, notes: "Keep this" };
  f.saver.update(changed);
  await f.saver.flush();
  assert.equal(f.statuses.at(-1).phase, "error");
  assert.match(f.statuses.at(-1).error, /Offline/);
  f.saver.update(changed);
  assert.equal(f.timers.size, 0);
  assert.equal(f.results.length, 0);
  failing = false;
  await f.saver.flush();
  assert.equal(f.results[0].result.notes, "Keep this");
  assert.equal(f.statuses.at(-1).phase, "saved");
  failing = true;
  f.saver.update({ ...changed, notes: "Another" });
  await f.saver.flush();
  failing = false;
  f.saver.update({ ...changed, notes: "Edited after failure" });
  f.tick();
  await settle();
  assert.equal(f.results.at(-1).result.notes, "Edited after failure");
});

test("pausing cancels pending writes and disposing ignores an in-flight result", async () => {
  let finish;
  const f = fixture(
    (snapshot) =>
      new Promise((resolve) => {
        finish = () => resolve(snapshot);
      }),
  );
  f.saver.update({ ...f.initial, notes: "Draft" });
  f.saver.setPaused(true);
  assert.equal(f.timers.size, 0);
  await f.saver.flush();
  assert.equal(f.writes.length, 0);
  f.saver.setPaused(false);
  f.tick();
  await settle();
  assert.equal(f.writes.length, 1);
  const statusCount = f.statuses.length;
  f.saver.dispose();
  finish();
  await settle();
  assert.equal(f.results.length, 0);
  assert.equal(f.statuses.length, statusCount);
  assert.equal(f.timers.size, 0);
});

test("reverting edits cancels a scheduled save", () => {
  const f = fixture();
  f.saver.update({ ...f.initial, notes: "Temporary" });
  f.saver.update(f.initial);
  assert.equal(f.timers.size, 0);
  assert.equal(f.statuses.at(-1).phase, "saved");
});

test("returning to a previously failed draft retries after a new edit", async () => {
  let failing = true;
  const f = fixture(async (snapshot) => {
    if (failing) throw new Error("Offline");
    return snapshot;
  });
  const changed = { ...f.initial, notes: "Retry this" };
  f.saver.update(changed);
  await f.saver.flush();
  f.saver.update(f.initial);
  failing = false;
  f.saver.update(changed);
  assert.equal(f.timers.size, 1);
  f.tick();
  await settle();
  assert.equal(f.results.at(-1).result.notes, "Retry this");
});
