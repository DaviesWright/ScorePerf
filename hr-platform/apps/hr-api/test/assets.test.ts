import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  canDecideWriteOff,
  csvCell,
  isOverdue,
  isSerialViolation,
  normaliseSerial,
  overdueThreshold,
  recoveryCloseError,
  recoveryTaskTitle,
  teamAssignments,
  toCsv,
  writeOffBlocker,
  writeOffNeedsApproval,
  type OpenAssignment,
} from "@hr-platform/shared";

// Part B assets rules (packages/shared/src/assets.ts). Pure, so the rules are tested without a database.

const HR = true;
const NOT_HR = false;

test("write-off: lost and retired assets are refused, others are allowed", () => {
  assert.match(writeOffBlocker("lost") ?? "", /already written off/);
  assert.match(writeOffBlocker("retired") ?? "", /retired/);
  assert.equal(writeOffBlocker("allocated"), null);
  assert.equal(writeOffBlocker("available"), null);
  assert.equal(writeOffBlocker("maintenance"), null);
});

test("write-off: an asset held by a current employee needs approval; a former holder or none does not", () => {
  assert.equal(writeOffNeedsApproval({ isActive: true }), true);
  assert.equal(writeOffNeedsApproval({ isActive: false }), false);
  assert.equal(writeOffNeedsApproval(null), false);
});

test("write-off: the holder's solid manager decides, and no one else from HR does", () => {
  const base = { requesterId: 10, holderSolidManagerId: 20 };
  assert.equal(canDecideWriteOff({ ...base, deciderId: 20, deciderIsHr: NOT_HR }), true, "solid manager");
  assert.equal(canDecideWriteOff({ ...base, deciderId: 30, deciderIsHr: HR }), false, "another HR user while a solid manager exists");
  assert.equal(canDecideWriteOff({ ...base, deciderId: 40, deciderIsHr: NOT_HR }), false, "unrelated employee");
});

test("write-off: the person who asked never decides their own request", () => {
  assert.equal(canDecideWriteOff({ deciderId: 10, requesterId: 10, holderSolidManagerId: null, deciderIsHr: HR }), false);
  assert.equal(canDecideWriteOff({ deciderId: 10, requesterId: 10, holderSolidManagerId: 10, deciderIsHr: HR }), false);
});

test("write-off: with no solid manager, another HR user decides", () => {
  assert.equal(canDecideWriteOff({ deciderId: 30, requesterId: 10, holderSolidManagerId: null, deciderIsHr: HR }), true);
  assert.equal(canDecideWriteOff({ deciderId: 40, requesterId: 10, holderSolidManagerId: null, deciderIsHr: NOT_HR }), false);
  // The solid manager is the requester, so the solid line cannot decide: fall back to another HR user.
  assert.equal(canDecideWriteOff({ deciderId: 30, requesterId: 20, holderSolidManagerId: 20, deciderIsHr: HR }), true);
});

test("overdue: the category threshold wins, the fallback applies when the category has none", () => {
  assert.equal(overdueThreshold(90, 365), 90);
  assert.equal(overdueThreshold(null, 365), 365);
  assert.equal(overdueThreshold(undefined, 30), 30);
});

test("overdue: held for exactly the threshold counts as overdue, one day short does not", () => {
  assert.equal(isOverdue(90, 90), true);
  assert.equal(isOverdue(89, 90), false);
});

test("recovery: closing with assets still open needs a note; closing an empty task does not", () => {
  assert.match(recoveryCloseError(2, "   ") ?? "", /needs a note/);
  assert.equal(recoveryCloseError(2, "Laptop found at the depot"), null);
  assert.equal(recoveryCloseError(0, ""), null);
  assert.equal(recoveryTaskTitle(1, "Ama Mensah"), "Recover 1 asset from Ama Mensah");
  assert.equal(recoveryTaskTitle(3, "Kofi Boateng"), "Recover 3 assets from Kofi Boateng");
});

test("serial numbers: blank becomes null, surrounding spaces are removed", () => {
  assert.equal(normaliseSerial("   "), null);
  assert.equal(normaliseSerial(""), null);
  assert.equal(normaliseSerial(null), null);
  assert.equal(normaliseSerial("  SN-0042 "), "SN-0042");
});

test("serial numbers: only the serial unique index counts as a duplicate", () => {
  assert.equal(isSerialViolation({ code: "23505", constraint_name: "company_assets_company_serial_unique" }), true);
  assert.equal(isSerialViolation({ code: "23505", constraint_name: "company_assets_asset_code_key" }), false, "asset code clash");
  assert.equal(isSerialViolation({ code: "23503", constraint_name: "company_assets_company_serial_unique" }), false);
  assert.equal(isSerialViolation(new Error("boom")), false);
});

const open = (employeeId: number, daysHeld = 10): OpenAssignment => ({
  assetId: employeeId * 100,
  assetCode: `AS-${employeeId}`,
  name: "Laptop",
  employeeId,
  employeeName: `Person ${employeeId}`,
  allocatedDate: "2026-01-01",
  daysHeld,
});

test("manager scope: a manager sees open assets of solid direct reports only", () => {
  const lines = [
    { employeeId: 1, managerId: 100, kind: "solid" }, // direct report
    { employeeId: 2, managerId: 100, kind: "dotted" }, // dotted line: visibility only, not a direct report
    { employeeId: 3, managerId: 200, kind: "solid" }, // belongs to another manager
  ];
  const rows = [open(1), open(2), open(3), open(4)]; // 4 has no line at all
  const seen = teamAssignments(lines, 100, rows).map((r) => r.employeeId);
  assert.deepEqual(seen, [1]);
});

test("manager scope: a manager with no solid reports sees nothing", () => {
  assert.deepEqual(teamAssignments([{ employeeId: 2, managerId: 100, kind: "dotted" }], 100, [open(2)]), []);
});

test("CSV: quotes cells with commas, quotes or line breaks, and doubles inner quotes", () => {
  assert.equal(csvCell("Laptop, 14in"), '"Laptop, 14in"');
  assert.equal(csvCell('Says "hi"'), '"Says ""hi"""');
  assert.equal(csvCell("line\nbreak"), '"line\nbreak"');
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(7), "7");
});

test("CSV: a cell starting with a formula trigger is prefixed so a spreadsheet will not run it", () => {
  assert.equal(csvCell('=HYPERLINK("http://x")'), `"'=HYPERLINK(""http://x"")"`);
  assert.equal(csvCell("+1+1"), "'+1+1");
  assert.equal(csvCell("@cmd"), "'@cmd");
});

test("CSV: the register file has a header row and CRLF line endings", () => {
  const out = toCsv(["Asset code", "Name"], [["AS-1", "Laptop"], ["AS-2", "Desk, standing"]]);
  assert.equal(out, 'Asset code,Name\r\nAS-1,Laptop\r\nAS-2,"Desk, standing"\r\n');
});

// Mounting and offboarding wiring. index.ts imports Cloudflare-only modules, so these checks read it as text.
const indexSrc = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");

test("assets part B routes are mounted after authenticate", () => {
  const auth = indexSrc.indexOf('app.use("/api/v1/*", authenticate)');
  const mount = indexSrc.indexOf('app.route("/", createAssetRoutes(getSql))');
  assert.notEqual(mount, -1, "createAssetRoutes is not mounted");
  assert.ok(auth !== -1 && auth < mount, "assets routes are mounted before authenticate");
});

test("offboarding opens a recovery task and still refuses while assets are open", () => {
  const route = /app\.post\("\/api\/v1\/employees\/:id\/offboard",[\s\S]*?\n\}\);/.exec(indexSrc)?.[0] ?? "";
  assert.ok(route, "offboard route not found");
  const block = route.indexOf("if (held.length > 0)");
  const task = route.indexOf("openRecoveryTask(");
  const refuse = route.indexOf("409", block);
  assert.notEqual(block, -1, "offboard no longer checks for open assets");
  assert.ok(task > block && task < refuse, "recovery task is not opened inside the open-assets block");
  assert.ok(refuse > block, "offboard no longer returns 409 while assets are open");
  assert.ok(!/UPDATE employees SET is_active = false/.test(route.slice(0, block)), "employee deactivated before the open-assets check");
});

test("overdue report uses the per-category threshold through overdueAssets", () => {
  const route = /app\.get\("\/api\/v1\/assets\/overdue",[\s\S]*?\n\}\);/.exec(indexSrc)?.[0] ?? "";
  assert.match(route, /overdueAssets\(/);
  assert.doesNotMatch(route, /CURRENT_DATE - \$\{days\}/, "overdue still uses the single threshold only");
});
