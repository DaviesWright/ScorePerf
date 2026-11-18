import test from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { computeCelebrations, createCelebrationsRoutes } from "../src/celebrations-routes";

test("TC-CELEB-01 & TC-CELEB-06: bucket assignment (this_week <= 7d, this_month 8-30d)", () => {
  const today = new Date("2026-11-18T00:00:00Z");
  const res = computeCelebrations(
    [
      {
        id: 1,
        first_name: "Ama",
        last_name: "Mensah",
        department: "Finance",
        date_of_birth: "1996-11-21", // +3 days -> this_week
        start_date: "2021-12-10", // +22 days -> this_month
        show_birthday: true,
        show_anniversary: true,
      },
    ],
    { today, showBirthYear: false }
  );

  assert.equal(res.this_week.length, 1);
  assert.equal(res.this_week[0].celebration_type, "BIRTHDAY");
  assert.equal(res.this_week[0].label, "Birthday"); // TC-CELEB-04 default hides birth year
  assert.equal(res.this_month.length, 1);
  assert.equal(res.this_month[0].celebration_type, "WORK_ANNIVERSARY");
  assert.equal(res.this_month[0].years_of_service, 5);
});

test("TC-CELEB-02 & TC-CELEB-04: opt-out hides birthday and showBirthYear reveals ordinal age", () => {
  const today = new Date("2026-11-18T00:00:00Z");
  const res = computeCelebrations(
    [
      {
        id: 1,
        first_name: "Ama",
        last_name: "Mensah",
        department: "Finance",
        date_of_birth: "1996-11-21",
        start_date: null,
        show_birthday: false, // opted out
        show_anniversary: true,
      },
      {
        id: 2,
        first_name: "Kofi",
        last_name: "Boateng",
        department: "Engineering",
        date_of_birth: "1996-11-20",
        start_date: null,
        show_birthday: true,
        show_anniversary: true,
      },
    ],
    { today, showBirthYear: true }
  );

  assert.equal(res.this_week.length, 1);
  assert.equal(res.this_week[0].employee_id, 2);
  assert.equal(res.this_week[0].label, "30th Birthday");
});

test("TC-CELEB-03 & TC-CELEB-05: MSS scopes to direct reports and recognize writes PRAISE feedback", async () => {
  const insertedFeedback: any[] = [];
  const fakeSql = (strings: TemplateStringsArray, ...values: unknown[]) => {
    const q = strings.join(" ");
    if (q.includes("FROM reporting_lines rl")) {
      return Promise.resolve([
        {
          id: 12,
          first_name: "Kofi",
          last_name: "Boateng",
          department: "Engineering",
          date_of_birth: null,
          start_date: "2021-11-18",
          show_birthday: true,
          show_anniversary: true,
          custom_message: null,
        },
      ]);
    }
    if (q.includes("INSERT INTO continuous_feedback")) {
      insertedFeedback.push({ id: values[0], to_employee_id: values[3], message: values[4] });
      return Promise.resolve([]);
    }
    return Promise.resolve([]);
  };

  const app = new Hono<any>();
  app.use("*", async (c, next) => {
    c.set("tenant", { companyId: 1, userId: 5, role: "line_manager" });
    await next();
  });
  app.route("/", createCelebrationsRoutes(() => fakeSql));

  const mssRes = await app.request("/api/v1/mss/celebrations");
  assert.equal(mssRes.status, 200);
  const mssBody = await mssRes.json();
  assert.equal(mssBody.context, "mss");

  const recRes = await app.request("/api/v1/mss/celebrations/anniv-12/recognize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Happy 5-year anniversary Kofi!" }),
  });
  assert.equal(recRes.status, 201);
  const recBody = await recRes.json();
  assert.equal(recBody.feedback_type, "PRAISE");
  assert.equal(recBody.to_employee_id, 12);
  assert.equal(insertedFeedback.length, 1);
});
