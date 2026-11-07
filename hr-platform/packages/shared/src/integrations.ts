// Integration connections: one record per provider per company. Secrets are never stored here. A connection names
// Cloudflare Worker secrets (for example BC_CLIENT_SECRET), and the screen shows only whether each named secret is set.
// Pure: no database, no framework. The adapters that talk to providers live in apps/hr-api.

export const INTEGRATION_PROVIDERS = ["business_central", "seamless_hr", "clay_hr", "coursera"] as const;
export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

export const PROVIDER_INFO: Record<IntegrationProvider, { label: string; purpose: string; secretSlots: string[] }> = {
  business_central: { label: "Microsoft Business Central", purpose: "Payroll and finance", secretSlots: ["clientId", "clientSecret"] },
  seamless_hr: { label: "SeamlessHR API", purpose: "HRIS", secretSlots: ["apiKey"] },
  clay_hr: { label: "Clay HR API", purpose: "HR data", secretSlots: ["apiKey"] },
  coursera: { label: "Coursera", purpose: "LMS", secretSlots: ["clientId", "clientSecret"] },
};

/** Slot name (for example clientSecret) to the Worker secret name that holds the value. */
export type SecretRefs = Record<string, string>;

export const SECRET_NAME_PATTERN = /^[A-Z][A-Z0-9_]{2,63}$/;

export interface ConnectionInput {
  label: string;
  enabled: boolean;
  baseUrl: string;
  secretRefs: SecretRefs;
}

/** Returns the list of problems. An empty list means the connection can be saved. */
export function validateConnection(provider: IntegrationProvider, input: ConnectionInput): string[] {
  const errors: string[] = [];
  const label = input.label.trim();
  if (label.length < 2 || label.length > 100) errors.push("The label needs 2 to 100 characters.");
  if (input.baseUrl !== "") {
    let protocol = "";
    try {
      protocol = new URL(input.baseUrl).protocol;
    } catch {
      protocol = "";
    }
    if (protocol !== "https:") errors.push("The base URL must start with https://.");
  } else if (input.enabled) {
    errors.push("Add the base URL before enabling this connection.");
  }
  const slots = PROVIDER_INFO[provider].secretSlots;
  for (const key of Object.keys(input.secretRefs)) {
    if (!slots.includes(key)) errors.push(`Unknown secret slot: ${key}.`);
  }
  for (const slot of slots) {
    const name = input.secretRefs[slot];
    if (!name || !SECRET_NAME_PATTERN.test(name)) {
      errors.push(`The secret name for ${slot} must use only capitals, digits and underscores, such as BC_CLIENT_SECRET.`);
    }
  }
  return errors;
}

export interface SlotStatus {
  slot: string;
  secretName: string | null;
  present: boolean;
}

/** Whether each slot's named secret is set. `present` answers for one name and never sees a value. */
export function slotStatus(provider: IntegrationProvider, refs: SecretRefs, present: (name: string) => boolean): SlotStatus[] {
  return PROVIDER_INFO[provider].secretSlots.map((slot) => {
    const secretName = refs[slot] ?? null;
    return { slot, secretName, present: secretName !== null && present(secretName) };
  });
}

export interface StoredConnection {
  enabled: boolean;
  baseUrl: string;
  secretRefs: SecretRefs;
}

export type PreflightOutcome =
  | { status: "not_configured"; missing: string[]; message: string }
  | { status: "disabled"; message: string }
  | { status: "ready" };

/**
 * Runs before any adapter. A missing base URL or secret reports not_configured, so nothing calls a provider
 * without credentials. A disabled connection is not tested against the provider either.
 */
export function preflight(provider: IntegrationProvider, conn: StoredConnection | null, present: (name: string) => boolean): PreflightOutcome {
  const slots = PROVIDER_INFO[provider].secretSlots;
  if (!conn) return { status: "not_configured", missing: ["base URL", ...slots], message: "Not configured: no connection saved yet." };
  const missing = slotStatus(provider, conn.secretRefs, present)
    .filter((s) => !s.present)
    .map((s) => s.slot);
  if (conn.baseUrl === "") missing.unshift("base URL");
  if (missing.length > 0) return { status: "not_configured", missing, message: `Not configured: missing ${missing.join(", ")}.` };
  if (!conn.enabled) return { status: "disabled", message: "This connection is switched off." };
  return { status: "ready" };
}
