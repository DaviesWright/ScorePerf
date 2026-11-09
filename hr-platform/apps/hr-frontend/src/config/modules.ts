import type { ModuleViewKey } from "../components/shell/AppSidebar";

// Single switchboard for which modules (views) and optional features are visible.
// Nothing is deleted when a module is off: its component, data and API routes stay, and the navigation,
// the route guard in the shell and every cross-link (palette, quick menu, welcome brief) consult this file.
//
//   NEXT_PUBLIC_ENABLED_MODULES   comma list of view keys or aliases, or "all". Default: all.
//   NEXT_PUBLIC_ENABLED_FEATURES  comma list of features, or "all". Default: none.
//
// Both are inlined at build time, so changing them needs a rebuild or a dev-server restart.

/** Every view, in the order the default landing page is chosen from. Must list every ModuleViewKey. */
export const ALL_VIEWS: readonly ModuleViewKey[] = [
  "dashboard",
  "assets",
  "time_and_leave",
  "performance_pms",
  "performance_setup",
  "objectives",
  "my_performance",
  "my_profile",
  "payslips",
  "document_centre",
  "self_service",
  "reports_analytics",
  "workforce_directory",
  "projects",
  "skills_marketplace",
  "admin_nerve_center",
  "lifecycle_portals",
  "asset_management",
  "helpdesk",
  "employee_settings",
  "approval_workflows",
  "company_setup",
  "organogram",
  "governance_import",
  "disciplinary",
  "policies_handbook",
];

export type FeatureKey = "ai_assistant" | "payslip";
export const ALL_FEATURES: readonly FeatureKey[] = ["ai_assistant", "payslip"];

export const DEFAULT_VIEWS: readonly ModuleViewKey[] = [
  "dashboard",
  "self_service",
  "time_and_leave",
  "performance_pms",
  "performance_setup",
  "objectives",
  "my_performance",
  "my_profile",
  "payslips",
  "document_centre",
  "assets",
];

const VIEW_ALIASES: Record<string, ModuleViewKey> = {
  leave: "time_and_leave",
  performance: "performance_pms",
};

function tokens(raw: string | undefined): string[] {
  return (raw ?? "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
}

/** Unknown names are ignored; an empty or all-unknown list falls back to the default so the app is never blank. */
export function parseEnabledViews(raw: string | undefined): Set<ModuleViewKey> {
  const list = tokens(raw);
  if (list.includes("all")) return new Set(ALL_VIEWS);
  const found = new Set<ModuleViewKey>();
  for (const t of list) {
    const key = VIEW_ALIASES[t] ?? ALL_VIEWS.find((v) => v === t);
    if (key) found.add(key);
  }
  return found.size > 0 ? found : new Set(ALL_VIEWS);
}

export function parseEnabledFeatures(raw: string | undefined): Set<FeatureKey> {
  const list = tokens(raw);
  if (list.includes("all")) return new Set(ALL_FEATURES);
  return new Set(ALL_FEATURES.filter((f) => list.includes(f)));
}

/** NEXT_PUBLIC_SHELL: "plain" (default) uses PlainShell; "full" keeps the original decorated frame. */
export const parseShellMode = (raw: string | undefined): "plain" | "full" => (raw?.trim().toLowerCase() === "full" ? "full" : "plain");
export const SHELL_MODE = parseShellMode(process.env.NEXT_PUBLIC_SHELL);

const enabledViews = parseEnabledViews(process.env.NEXT_PUBLIC_ENABLED_MODULES);
const enabledFeatures = parseEnabledFeatures(process.env.NEXT_PUBLIC_ENABLED_FEATURES);

// Payslips belong to the payroll module. The view stays hidden until the payslip feature is switched on.
export const isViewEnabled = (view: ModuleViewKey): boolean =>
  enabledViews.has(view) && (view !== "payslips" || enabledFeatures.has("payslip"));
export const isFeatureEnabled = (feature: FeatureKey): boolean => enabledFeatures.has(feature);

/** The view to open at start: the first enabled one in ALL_VIEWS order. */
export const firstEnabledView = (): ModuleViewKey => ALL_VIEWS.find((v) => enabledViews.has(v)) ?? DEFAULT_VIEWS[0];
