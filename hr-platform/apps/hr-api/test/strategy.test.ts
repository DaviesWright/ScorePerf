import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStrategyCsv, SAMPLE_STRATEGY_CSV, splitCsvLine } from "@hr-platform/shared";

test("sample strategy loads with no errors and weights totalling 100", () => {
  const r = parseStrategyCsv(SAMPLE_STRATEGY_CSV);
  assert.deepEqual(r.errors, []);
  assert.equal(r.rows.length, 5);
  assert.equal(r.rows.reduce((s, row) => s + (row.weight ?? 0), 0), 100);
});

test("missing required column is reported on line 1", () => {
  const r = parseStrategyCsv("perspective,objective,measure\nFinancial,Grow revenue,Growth %");
  assert.deepEqual(r.errors, [{ line: 1, message: "Missing column: target." }]);
  assert.deepEqual(r.rows, []);
});

test("each bad row is reported with its own line number", () => {
  const csv = [
    "perspective,objective,measure,target",
    "Financial,Grow revenue,Growth %,15",
    ",Ok objective,Measure,5",
    "Client,No,Measure,5",
    "Client,Good objective,Measure,abc",
  ].join("\n");
  const r = parseStrategyCsv(csv);
  assert.deepEqual(r.rows, []);
  assert.deepEqual(
    r.errors.map((e) => e.line),
    [3, 4, 5],
  );
});

test("weights must total 100 when given", () => {
  const csv = "perspective,objective,measure,target,weight\nFinancial,Grow revenue,Growth %,15,40\nClient,Raise NPS,NPS,50,40";
  const r = parseStrategyCsv(csv);
  assert.match(r.errors[0].message, /total 80/);
});

test("weights must be on every row or none", () => {
  const csv = "perspective,objective,measure,target,weight\nFinancial,Grow revenue,Growth %,15,100\nClient,Raise NPS,NPS,50,";
  const r = parseStrategyCsv(csv);
  assert.match(r.errors[0].message, /every goal has a weight or none/);
});

test("quoted commas and escaped quotes are read correctly", () => {
  assert.deepEqual(splitCsvLine('a,"b, c","say ""hi"""'), ["a", "b, c", 'say "hi"']);
});
