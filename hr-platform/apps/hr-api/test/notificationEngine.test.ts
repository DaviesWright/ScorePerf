import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import {
  applyPiiFilter,
  createNotificationEngineRoutes,
  isWithinQuietHours,
  resolveRecipients,
  shouldDeduplicate,
} from "../src/notification-engine-routes.ts";

describe("Notification Handling Mechanism v1.0 Tests", () => {
  it("TC-NOTIF-04/05/06/19: PII filter strips birthYear, peer identity, sick reason & salary", () => {
    const bday = applyPiiFilter(
      "BirthdayThisWeek",
      { subjectName: "Ama", birthYear: 1990, age: 36, eventDate: "11-24" },
      "employee"
    );
    assert.equal(bday.birthYear, undefined);
    assert.equal(bday.age, undefined);
    assert.equal(bday.eventDate, "11-24");

    const peer = applyPiiFilter("PeerInputRequested", { peerId: 99, peerName: "Kwame" }, "employee");
    assert.equal(peer.peerId, undefined);
    assert.equal(peer.peerName, undefined);
    assert.equal(peer.peerLabel, "A colleague");

    const leaveMgr = applyPiiFilter(
      "LeaveApplicationSubmitted",
      { subjectName: "Ama", leaveType: "SICK", reason: "Surgery", startDate: "2026-11-25" },
      "line_manager"
    );
    assert.equal(leaveMgr.reason, undefined);
    assert.equal(leaveMgr.leaveType, undefined);
  });

  it("TC-NOTIF-07: quiet hours defer non-URGENT but allow URGENT bypass", () => {
    const qh = { enabled: true, from: "22:00", to: "07:00" };
    assert.equal(isWithinQuietHours(qh, "23:30", "NORMAL").deferred, true);
    assert.equal(isWithinQuietHours(qh, "23:30", "URGENT").deferred, false);
    assert.equal(isWithinQuietHours(qh, "12:00", "NORMAL").deferred, false);
  });

  it("TC-NOTIF-08: deduplicates identical aggregate_id + event_type within window", () => {
    const now = Date.UTC(2026, 10, 21, 10, 0, 0);
    const recent = [{ aggregate_id: "leave-42", event_type: "LeaveApproved", occurred_at: new Date(now - 60_000).toISOString() }];
    assert.equal(shouldDeduplicate(recent, "leave-42", "LeaveApproved", 5, now), true);
    assert.equal(shouldDeduplicate(recent, "leave-99", "LeaveApproved", 5, now), false);
  });

  it("TC-NOTIF-03: delegation-aware recipient resolution routes to active delegate", () => {
    const recs = resolveRecipients({
      resolver: "MANAGER_OF_SUBJECT",
      subjectId: 21,
      reportingRows: [{ employee_id: 21, manager_id: 10, kind: "solid" }],
      delegationRows: [{ delegator_id: 10, delegate_id: 15, status: "ACTIVE" }],
    });
    assert.equal(recs.some((r) => r.userId === 15 && r.delegatedFrom === 10), true);
    assert.equal(recs.some((r) => r.userId === 10), true);
  });

  it("TC-NOTIF-16 & RBAC: unhandled events logged and admin rules gated to HR", async () => {
    const mockSql = () => Promise.resolve([]);
    const empApp = new Hono<any>();
    empApp.use("*", async (c, next) => {
      c.set("tenant", { companyId: 1, userId: 21, role: "employee" });
      await next();
    });
    empApp.route("/", createNotificationEngineRoutes(() => mockSql));

    const unhandledRes = await empApp.request("/api/v1/notifications/emit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "UnknownCustomEvent", aggregateId: "x-1" }),
    });
    assert.equal(unhandledRes.status, 202);
    assert.equal(((await unhandledRes.json()) as any).status, "EVENT_UNHANDLED");

    assert.equal((await empApp.request("/api/v1/notifications/admin/rules")).status, 403);
  });
});
