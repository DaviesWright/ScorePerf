import { test } from "node:test";
import assert from "node:assert/strict";
import { preflight, slotStatus, validateConnection, validateOffice, type StoredConnection } from "@hr-platform/shared";

const office = { name: "Accra", address: "", country: "GH" };

test("an office needs a name of 2 to 100 characters and a two-letter country code", () => {
  assert.equal(validateOffice(office), null);
  assert.match(validateOffice({ ...office, name: "A" }) ?? "", /at least 2/);
  assert.match(validateOffice({ ...office, name: "x".repeat(101) }) ?? "", /100 characters/);
  assert.match(validateOffice({ ...office, country: "Ghana" }) ?? "", /two-letter code/);
});

const bc = { label: "Payroll", enabled: true, baseUrl: "https://api.businesscentral.example", secretRefs: { clientId: "BC_CLIENT_ID", clientSecret: "BC_CLIENT_SECRET" } };

test("a valid connection passes; the base URL must be https", () => {
  assert.deepEqual(validateConnection("business_central", bc), []);
  assert.match(validateConnection("business_central", { ...bc, baseUrl: "http://x.example" }).join(" "), /https/);
});

test("an enabled connection needs a base URL; a disabled one may leave it empty", () => {
  assert.match(validateConnection("business_central", { ...bc, baseUrl: "" }).join(" "), /Add the base URL/);
  assert.deepEqual(validateConnection("business_central", { ...bc, baseUrl: "", enabled: false }), []);
});

test("secret references must be Worker secret names, one per slot, and no other keys", () => {
  const lower = { ...bc, secretRefs: { clientId: "bc_client_id", clientSecret: "BC_CLIENT_SECRET" } };
  assert.match(validateConnection("business_central", lower).join(" "), /capitals, digits and underscores/);
  const missing = { ...bc, secretRefs: { clientId: "BC_CLIENT_ID" } };
  assert.match(validateConnection("business_central", missing).join(" "), /secret name for clientSecret/);
  const extra = { ...bc, secretRefs: { ...bc.secretRefs, password: "BC_PASSWORD" } };
  assert.match(validateConnection("business_central", extra).join(" "), /Unknown secret slot: password/);
});

test("the slot status reports presence only", () => {
  const set = new Set(["BC_CLIENT_ID"]);
  const status = slotStatus("business_central", bc.secretRefs, (name) => set.has(name));
  assert.deepEqual(status, [
    { slot: "clientId", secretName: "BC_CLIENT_ID", present: true },
    { slot: "clientSecret", secretName: "BC_CLIENT_SECRET", present: false },
  ]);
});

const stored = (over: Partial<StoredConnection> = {}): StoredConnection => ({ enabled: true, baseUrl: bc.baseUrl, secretRefs: bc.secretRefs, ...over });

test("a missing referenced secret reports not configured, and no provider is called", () => {
  const set = new Set(["BC_CLIENT_ID"]);
  const outcome = preflight("business_central", stored(), (n) => set.has(n));
  assert.equal(outcome.status, "not_configured");
  assert.deepEqual((outcome as { missing: string[] }).missing, ["clientSecret"]);
});

test("no saved connection, or no base URL, reports not configured", () => {
  const all = () => true;
  assert.equal(preflight("seamless_hr", null, all).status, "not_configured");
  const noUrl = preflight("business_central", stored({ baseUrl: "", enabled: false }), all);
  assert.equal(noUrl.status, "not_configured");
  assert.deepEqual((noUrl as { missing: string[] }).missing, ["base URL"]);
});

test("with every secret set a switched-off connection is disabled, and an enabled one is ready", () => {
  const all = () => true;
  assert.equal(preflight("business_central", stored({ enabled: false }), all).status, "disabled");
  assert.equal(preflight("business_central", stored(), all).status, "ready");
});
