import { beforeAll, describe, expect, it } from "vitest";
import { anon, failure, user } from "./helpers";
import { createWorld, type World } from "./world";

let w: World;
beforeAll(async () => {
  w = await createWorld();
}, 120_000);

// Service-role helper to create a notification
const createNotification = async (userId: string, env: World["env"]) =>
  (
    await env.admin<{ id: string }>(
      `insert into public.notifications (user_id, title, message, notification_type)
       values ($1, 'Test Notification', 'You have a new enquiry.', 'enquiry_received')
       returning id`,
      [userId],
    )
  )[0]!.id;

describe("RLS: notifications", () => {
  it("users can read only their own notifications", async () => {
    const nA = await createNotification(w.buyerA, w.env);
    const nB = await createNotification(w.buyerB, w.env);

    const rowsA = await w.env.as<{ id: string }>(user(w.buyerA), "select id from public.notifications");
    const idsA = rowsA.map((r) => r.id);
    expect(idsA).toContain(nA);
    expect(idsA).not.toContain(nB);

    const rowsB = await w.env.as<{ id: string }>(user(w.buyerB), "select id from public.notifications");
    const idsB = rowsB.map((r) => r.id);
    expect(idsB).toContain(nB);
    expect(idsB).not.toContain(nA);
  });

  it("users can mark their own notifications as read", async () => {
    const nid = await createNotification(w.buyerA, w.env);
    await w.env.as(user(w.buyerA), "update public.notifications set is_read = true where id = $1", [nid]);
    const rows = await w.env.admin<{ is_read: boolean }>(
      "select is_read from public.notifications where id = $1",
      [nid],
    );
    expect(rows[0]?.is_read).toBe(true);
  });

  it("users cannot mark another user's notifications as read", async () => {
    const nidB = await createNotification(w.buyerB, w.env);
    // buyerA updates — RLS means 0 rows affected, not an error (UPDATE using policy)
    await w.env.as(user(w.buyerA), "update public.notifications set is_read = true where id = $1", [nidB]);
    const rows = await w.env.admin<{ is_read: boolean }>(
      "select is_read from public.notifications where id = $1",
      [nidB],
    );
    // Should still be false because the UPDATE didn't touch any visible rows
    expect(rows[0]?.is_read).toBe(false);
  });

  it("users can delete their own notifications", async () => {
    const nid = await createNotification(w.buyerA, w.env);
    await w.env.as(user(w.buyerA), "delete from public.notifications where id = $1", [nid]);
    const rows = await w.env.admin<{ id: string }>("select id from public.notifications where id = $1", [nid]);
    expect(rows).toEqual([]);
  });

  it("users cannot delete another user's notifications", async () => {
    const nidB = await createNotification(w.buyerB, w.env);
    await w.env.as(user(w.buyerA), "delete from public.notifications where id = $1", [nidB]);
    const rows = await w.env.admin<{ id: string }>("select id from public.notifications where id = $1", [nidB]);
    // Still present — buyerA's delete was a no-op due to RLS
    expect(rows).toHaveLength(1);
  });

  it("authenticated clients cannot INSERT notifications directly (no INSERT grant)", async () => {
    expect(
      await failure(
        w.env.as(
          user(w.buyerA),
          `insert into public.notifications (user_id, title, message, notification_type)
           values ($1, 'Fake', 'Hack attempt.', 'system')`,
          [w.buyerA],
        ),
      ),
    ).toMatch(/permission denied/);
  });

  it("anonymous users have no access to notifications", async () => {
    expect(await failure(w.env.as(anon, "select * from public.notifications"))).toMatch(/permission denied/);
    expect(
      await failure(
        w.env.as(anon, "insert into public.notifications (user_id, title, message, notification_type) values ($1, 'X', 'Y', 'system')", [w.buyerA]),
      ),
    ).toMatch(/permission denied/);
  });
});

