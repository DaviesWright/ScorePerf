// One adapter per provider behind one interface. Each is a stub until its credentials and API details are confirmed.
// index.ts calls testConnection only after preflight (packages/shared) has found every referenced secret set, so a
// connection with missing credentials never reaches a provider. Stubs make no network calls and never return secrets.

import { PROVIDER_INFO, type IntegrationProvider } from "@hr-platform/shared";

export interface ConnectionContext {
  baseUrl: string;
  /** Reads the value of a slot's secret. Only adapters that call the provider use it. */
  secret: (slot: string) => string | undefined;
}

export interface AdapterResult {
  status: "ok" | "failed" | "not_implemented";
  message: string;
}

export interface IntegrationAdapter {
  readonly provider: IntegrationProvider;
  testConnection(ctx: ConnectionContext): Promise<AdapterResult>;
}

/** Worker secrets the platform itself uses. An integration must not reference them, so their presence cannot be probed. */
export const RESERVED_SECRET_NAMES: readonly string[] = ["AUTH_JWT_SECRET"];

const stub = (provider: IntegrationProvider): IntegrationAdapter => ({
  provider,
  async testConnection() {
    return {
      status: "not_implemented",
      message: `${PROVIDER_INFO[provider].label} is not connected yet: its API details still need confirming.`,
    };
  },
});

export const ADAPTERS: Record<IntegrationProvider, IntegrationAdapter> = {
  business_central: stub("business_central"),
  seamless_hr: stub("seamless_hr"),
  clay_hr: stub("clay_hr"),
  coursera: stub("coursera"),
};
