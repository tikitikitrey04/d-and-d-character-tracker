import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.mjs";
import { setAdmin } from "../server/audit.mjs";
import { mkdtempSync, readdirSync, unlinkSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("reports validate input, enforce player privacy and admin permissions, persist, and paginate", async () => {
  const dir = mkdtempSync(join(tmpdir(), "keeper-bugs-"));
  const path = join(dir, "test.sqlite");
  let instance = createApp({ databasePath: path, secureCookies: false });
  let server;
  async function start() {
    server = instance.app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
  }
  async function stop() {
    await new Promise((resolve) => server.close(resolve));
    instance.db.close();
  }
  await start();
  const request = async (
    path,
    { cookie, method = "GET", body, headers = {} } = {},
  ) => {
    const res = await fetch(
      `http://127.0.0.1:${server.address().port}/api${path}`,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Keeper-Request": "1",
          ...(cookie ? { Cookie: cookie } : {}),
          ...headers,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
    );
    return {
      status: res.status,
      data: await res.json(),
      cookie: res.headers.get("set-cookie")?.split(";")[0],
    };
  };
  const register = (name) =>
    request("/auth/register", {
      method: "POST",
      body: {
        name,
        email: `${name}@example.com`,
        password: "bugs-test-password",
      },
    });
  try {
    for (const [method, path] of [
      ["POST", "/bugs"],
      ["GET", "/bugs"],
      ["GET", "/admin/bugs"],
      ["PATCH", "/admin/bugs/nope"],
    ])
      assert.equal(
        (
          await request(path, {
            method,
            body: method === "GET" ? undefined : {},
          })
        ).status,
        401,
      );
    const alice = await register("Alice"),
      bob = await register("Bob"),
      admin = await register("Admin");
    setAdmin(instance.db, "Admin@example.com", true, instance.audit);
    const draft = {
      title: "  PRIVATE_BUG_TITLE  ",
      description: "<script>alert('PRIVATE_BUG_DESCRIPTION')</script>",
      steps: "PRIVATE_BUG_STEPS",
    };
    for (const invalid of [
      {},
      { ...draft, title: " " },
      { ...draft, title: "x".repeat(121) },
      { ...draft, description: " " },
      { ...draft, description: "x".repeat(5001) },
      { ...draft, steps: 123 },
      { ...draft, steps: "x".repeat(3001) },
    ])
      assert.equal(
        (
          await request("/bugs", {
            cookie: alice.cookie,
            method: "POST",
            body: invalid,
          })
        ).status,
        400,
      );
    assert.equal(
      (
        await request("/bugs", {
          cookie: alice.cookie,
          method: "POST",
          body: draft,
          headers: { Origin: "https://evil.example" },
        })
      ).status,
      403,
    );
    const created = await request("/bugs", {
      cookie: alice.cookie,
      method: "POST",
      body: { ...draft, status: "resolved", user_id: bob.data.id },
    });
    assert.equal(created.status, 201);
    assert.equal(created.data.title, draft.title.trim());
    assert.equal(created.data.status, "open");
    assert.equal(
      (await request("/bugs", { cookie: bob.cookie })).data.reports.length,
      0,
    );
    assert.equal(
      (await request("/bugs", { cookie: alice.cookie })).data.reports[0].id,
      created.data.id,
    );
    assert.equal(
      (await request("/admin/bugs", { cookie: alice.cookie })).status,
      403,
    );
    assert.equal(
      (
        await request(`/admin/bugs/${created.data.id}`, {
          cookie: alice.cookie,
          method: "PATCH",
          body: { status: "resolved" },
        })
      ).status,
      403,
    );
    assert.equal(
      (await request("/admin/bugs", { cookie: admin.cookie })).data.reports[0]
        .reporter,
      "Alice",
    );
    for (const status of ["in_progress", "resolved", "open"]) {
      const updated = await request(`/admin/bugs/${created.data.id}`, {
        cookie: admin.cookie,
        method: "PATCH",
        body: { status },
      });
      assert.equal(updated.status, 200);
      assert.equal(
        (await request("/bugs", { cookie: alice.cookie })).data.reports[0]
          .status,
        status,
      );
    }
    assert.equal(
      (
        await request(`/admin/bugs/${created.data.id}`, {
          cookie: admin.cookie,
          method: "PATCH",
          body: { status: "invalid" },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request("/admin/bugs/missing", {
          cookie: admin.cookie,
          method: "PATCH",
          body: { status: "resolved" },
        })
      ).status,
      404,
    );
    for (let i = 1; i < 10; i++)
      assert.equal(
        (
          await request("/bugs", {
            cookie: alice.cookie,
            method: "POST",
            body: draft,
          })
        ).status,
        201,
      );
    assert.equal(
      (
        await request("/bugs", {
          cookie: alice.cookie,
          method: "POST",
          body: draft,
        })
      ).status,
      429,
    );
    // Seed older reports so pagination is verified independently of submission throttling.
    const insert = instance.db.prepare(
      "INSERT INTO bug_reports (id,user_id,title,description,steps,status,created,updated) VALUES (?,?,?,?,?,?,?,?)",
    );
    for (let i = 0; i < 55; i++)
      insert.run(
        `seed-${i}`,
        bob.data.id,
        `Report ${i}`,
        "Example",
        "",
        "resolved",
        "2000-01-01T00:00:00.000Z",
        "2000-01-01T00:00:00.000Z",
      );
    const first = await request("/admin/bugs", { cookie: admin.cookie });
    assert.equal(first.data.reports.length, 50);
    const second = await request(
      `/admin/bugs?before=${first.data.nextBefore}`,
      { cookie: admin.cookie },
    );
    assert.equal(second.data.reports.length, 15);
    assert.equal(
      new Set([...first.data.reports, ...second.data.reports].map((r) => r.id))
        .size,
      65,
    );
    assert.equal(
      (await request("/admin/bugs?status=open", { cookie: admin.cookie })).data
        .reports.length,
      10,
    );
    assert.equal(
      (await request("/bugs", { cookie: bob.cookie })).data.reports.length,
      50,
    );
    for (const query of [
      "status=invalid",
      "status[]=open",
      "before=-1",
      "before=1%20OR%201",
      "user_id=someone",
    ])
      assert.equal(
        (await request(`/admin/bugs?${query}`, { cookie: admin.cookie }))
          .status,
        400,
      );
    const logs = JSON.stringify(
      (await request("/admin/logs", { cookie: admin.cookie })).data,
    );
    for (const secret of [
      "PRIVATE_BUG_TITLE",
      "PRIVATE_BUG_DESCRIPTION",
      "PRIVATE_BUG_STEPS",
    ])
      assert.ok(!logs.includes(secret));
    assert.match(logs, /bug.submitted/);
    assert.match(logs, /bug.status.updated/);
    await stop();
    instance = createApp({ databasePath: path, secureCookies: false });
    await start();
    assert.equal(
      (await request("/admin/bugs?status=open", { cookie: admin.cookie })).data
        .reports.length,
      10,
    );
    setAdmin(instance.db, "Admin@example.com", false, instance.audit);
    assert.equal(
      (await request("/admin/bugs", { cookie: admin.cookie })).status,
      403,
    );
  } finally {
    await stop();
    for (const file of readdirSync(dir)) unlinkSync(join(dir, file));
    rmdirSync(dir);
  }
});
