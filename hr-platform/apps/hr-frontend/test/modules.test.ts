import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ALL_FEATURES,
  ALL_VIEWS,
  DEFAULT_VIEWS,
  firstEnabledView,
  isFeatureEnabled,
  isViewEnabled,
  parseEnabledFeatures,
  parseEnabledViews,
  parseShellMode,
} from "../src/config/modules";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

test("default is every view", () => {
  assert.deepEqual([...parseEnabledViews(undefined)].sort(), [...ALL_VIEWS].sort());
  assert.deepEqual([...parseEnabledViews("")].sort(), [...ALL_VIEWS].sort());
});

test("aliases and view keys are accepted, case and spacing ignored", () => {
  assert.deepEqual([...parseEnabledViews(" Leave , helpdesk ")].sort(), ["helpdesk", "time_and_leave"]);
  assert.deepEqual([...parseEnabledViews("performance")], ["performance_pms"]);
});

test('"all" restores every module', () => {
  assert.deepEqual([...parseEnabledViews("all")].sort(), [...ALL_VIEWS].sort());
});

test("unknown names are ignored, and an all-unknown list falls back to every view", () => {
  assert.deepEqual([...parseEnabledViews("nonsense,leave")], ["time_and_leave"]);
  assert.deepEqual([...parseEnabledViews("nonsense")].sort(), [...ALL_VIEWS].sort());
});

test("features are off unless named; 'all' turns them all on", () => {
  assert.equal(parseEnabledFeatures(undefined).size, 0);
  assert.deepEqual([...parseEnabledFeatures("payslip,bogus")], ["payslip"]);
  assert.deepEqual([...parseEnabledFeatures("all")].sort(), [...ALL_FEATURES].sort());
});

test("shell mode is plain unless set to full", () => {
  assert.equal(parseShellMode(undefined), "plain");
  assert.equal(parseShellMode("nonsense"), "plain");
  assert.equal(parseShellMode(" FULL "), "full");
});

test("with no env set, the running config matches the default", () => {
  assert.equal(isViewEnabled("time_and_leave"), true);
  assert.equal(isViewEnabled("performance_pms"), true);
  assert.equal(isViewEnabled("helpdesk"), true);
  assert.equal(isFeatureEnabled("ai_assistant"), false);
  assert.equal(firstEnabledView(), "dashboard");
});

test("the registry lists exactly the views in the ModuleViewKey type", () => {
  const union = /export type ModuleViewKey =([^;]+);/.exec(read("../src/components/shell/AppSidebar.tsx"));
  assert.ok(union, "ModuleViewKey type not found");
  const typeKeys = [...union[1].matchAll(/"([a-z_]+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual([...ALL_VIEWS].sort(), typeKeys);
});

test("every registered view has a render branch in the shell", () => {
  const shell = read("../src/components/shell/EnterpriseAppShell.tsx");
  for (const view of ALL_VIEWS) {
    assert.ok(shell.includes(`currentView === "${view}"`), `no render branch for ${view}`);
  }
});

test("the shell only changes view through the guarded setter", () => {
  const shell = read("../src/components/shell/EnterpriseAppShell.tsx");
  assert.match(shell, /const setCurrentView = \(view: ModuleViewKey\) => \{\s*if \(isViewEnabled\(view\)\)/);
  assert.equal((shell.match(/setCurrentViewRaw\(/g) ?? []).length, 1, "setCurrentViewRaw must be called only inside the guard");
});
