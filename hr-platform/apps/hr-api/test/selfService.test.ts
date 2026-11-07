import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  acknowledgmentError,
  canDecideProfileChange,
  isPdf,
  isProfileField,
  netPay,
  payslipError,
  profileValueError,
  weightedProgress,
} from "@hr-platform/shared";

// Pure rules (packages/shared/src/selfService.ts).

test("profile values must match their field format", () => {
  assert.equal(profileValueError("accountNumber", "12345678"), null);
  assert.match(profileValueError("accountNumber", "12 34") ?? "", /6 to 34/);
  assert.equal(profileValueError("routingCode", "040-004"), null);
  assert.match(profileValueError("taxId", "AB") ?? "", /5 to 20/);
  assert.equal(profileValueError("accountHolderName", "Ama O'Brien-Mensah"), null);
  assert.match(profileValueError("accountHolderName", "Ama123") ?? "", /letters/);
});

test("only the five banking and tax fields are accepted", () => {
  assert.equal(isProfileField("bankName"), true);
  assert.equal(isProfileField("salary"), false);
  assert.equal(isProfileField("__proto__"), false);
});

test("only HR can decide a profile change, and never their own", () => {
  assert.equal(canDecideProfileChange({ userId: 1, role: "hr_admin" }, 2), null);
  assert.equal(canDecideProfileChange({ userId: 3, role: "hr_director" }, 2), null);
  assert.match(canDecideProfileChange({ userId: 2, role: "line_manager" }, 5) ?? "", /Only HR/);
  assert.match(canDecideProfileChange({ userId: 2, role: "hr_admin" }, 2) ?? "", /your own/);
});

test("uploads must start with the PDF signature", () => {
  assert.equal(isPdf(new TextEncoder().encode("%PDF-1.7 rest")), true);
  assert.equal(isPdf(new TextEncoder().encode("GIF89a")), false);
  assert.equal(isPdf(new Uint8Array([0x25, 0x50])), false);
});

test("payslip period and amounts are checked", () => {
  const ok = { month: 10, year: 2026, grossPay: 5000, deductions: 1200.5 };
  assert.equal(payslipError(ok), null);
  assert.match(payslipError({ ...ok, month: 13 }) ?? "", /Month/);
  assert.match(payslipError({ ...ok, year: 1999 }) ?? "", /Year/);
  assert.match(payslipError({ ...ok, grossPay: -1 }) ?? "", /Gross pay/);
  assert.match(payslipError({ ...ok, deductions: 5000.01 }) ?? "", /Deductions/);
});

test("net pay is gross minus deductions in whole cents", () => {
  assert.equal(netPay(0.3, 0.1), 0.2);
  assert.equal(netPay(5000, 1200.5), 3799.5);
  assert.equal(netPay(100, 0), 100);
});

test("a document can be acknowledged once", () => {
  assert.equal(acknowledgmentError("pending"), null);
  assert.match(acknowledgmentError("acknowledged") ?? "", /already/);
});

test("weighted progress rounds across weights and is empty when nothing is weighted", () => {
  assert.equal(
    weightedProgress([
      { progress: 50, weight: 30 },
      { progress: 100, weight: 70 },
    ]),
    85,
  );
  assert.equal(weightedProgress([{ progress: 40, weight: 0 }]), null);
  assert.equal(weightedProgress([]), null);
});

// Route rules (src/index.ts). index.ts imports Cloudflare-only modules, so these checks read it as text.
const src = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
// The text from the route's registration to the end of its handler. The closing "});" sits at column 0.
const routeBody = (path: string, method = "get") => {
  const start = src.indexOf(`app.${method}("${path}"`);
  if (start === -1) return "";
  const end = src.indexOf("\n});", start);
  return end === -1 ? "" : src.slice(start, end + 4);
};

test("profile decisions are HR-only, refuse self-decisions, and change the stored value only inside the transaction", () => {
  const body = routeBody("/api/v1/profile/changes/:id/decision", "post");
  assert.match(body, /canDecideProfileChange\(\{ userId, role \}/);
  const begin = body.indexOf("sql.begin(");
  const apply = body.indexOf("INSERT INTO employee_bank_tax_fields");
  assert.ok(begin !== -1 && apply > begin, "the stored value must be written inside sql.begin");
  assert.match(body, /AND status = 'pending' RETURNING id/, "the decision must re-check the pending status in its UPDATE");
});

test("profile audit rows name the field and outcome, never a value", () => {
  const body = routeBody("/api/v1/profile/changes/:id/decision", "post");
  const audit = /INSERT INTO audit_logs[\s\S]*?::jsonb/.exec(body)?.[0] ?? "";
  assert.ok(audit, "the decision must write an audit row");
  assert.doesNotMatch(audit, /new_value|old_value|pr\.new/);
});

test("the profile change request writes only the requester's own rows", () => {
  const body = routeBody("/api/v1/profile/changes", "post");
  assert.match(body, /VALUES \(\$\{companyId\}, \$\{userId\}/);
  assert.match(body, /employee_id = \$\{userId\}|employee_id, field/);
});

test("payslip and document files are open only to their owner or HR", () => {
  for (const route of ["/api/v1/payslips/:id/file", "/api/v1/documents/:id/file"]) {
    const body = routeBody(route);
    assert.ok(body, `${route} not found`);
    assert.match(body, /!== userId && !isHrRole\(role\)/, `${route} must check owner or HR`);
  }
});

test("payslip upload is HR-only and recomputes net pay on the server", () => {
  const body = routeBody("/api/v1/payslips", "post");
  assert.match(body, /if \(!isHrRole\(role\)\)/);
  assert.match(body, /netPay\(body\.grossPay, body\.deductions\)/);
});

test("acknowledgment is limited to the owner and to pending copies", () => {
  const body = routeBody("/api/v1/documents/:id/acknowledge", "post");
  assert.match(body, /Number\(doc\.employee_id\) !== userId/);
  assert.match(body, /status = 'pending' RETURNING id/);
});

test("self-service paths stay off /api/v1/payroll, which is blocked for employees", () => {
  for (const path of ["/api/v1/profile", "/api/v1/payslips", "/api/v1/documents/me", "/api/v1/performance/me"]) {
    assert.ok(src.includes(`"${path}`), `${path} is not defined`);
  }
  assert.doesNotMatch(src, /app\.(get|post)\("\/api\/v1\/payroll\/(upload|publish|me)/);
});

test("the personal performance page is read only", () => {
  assert.ok(routeBody("/api/v1/performance/me", "get"), "GET /api/v1/performance/me is missing");
  assert.equal(routeBody("/api/v1/performance/me", "post"), "");
});

test("the document list for everyone is HR-only", () => {
  const body = routeBody("/api/v1/documents");
  assert.match(body, /if \(!isHrRole\(role\)\)/);
});
