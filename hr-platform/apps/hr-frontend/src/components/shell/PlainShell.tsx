"use client";

import React from "react";
import type { ModuleViewKey } from "./AppSidebar";
import { ALL_VIEWS, isViewEnabled } from "../../config/modules";

// Plain application frame: header, text-only navigation, content. No icons, badges, gradients, shadows,
// animation, command palette, AI drawer or persona switcher. Neutral greys with one accent colour.
// Selected by NEXT_PUBLIC_SHELL (default "plain"); "full" keeps the original frame.

const LABELS: Record<ModuleViewKey, string> = {
  dashboard: "Dashboard",
  assets: "Assets",
  command_centre: "Command Centre",
  time_and_leave: "Leave",
  performance_pms: "Performance",
  performance_setup: "Performance Setup",
  company_setup: "Company Setup",
  my_performance: "My Performance",
  my_profile: "Bank & Tax Details",
  payslips: "Payslips",
  document_centre: "Document Centre",
  objectives: "Objectives",
  self_service: "My Self-Service",
  reports_analytics: "Reports",
  workforce_directory: "Workforce Directory",
  projects: "Client Engagements",
  skills_marketplace: "Skills & Gig Board",
  admin_nerve_center: "Nerve Center",
  lifecycle_portals: "Onboarding & Exit",
  asset_management: "Hardware and Fleet",
  helpdesk: "IT Helpdesk",
  employee_settings: "Employee Settings",
  approval_workflows: "Approval Workflows",
  governance_import: "Data Governance",
  disciplinary: "Disciplinary Management",
  policies_handbook: "Policies & Handbooks",
};

const C = {
  text: "#1f2937",
  muted: "#4b5563",
  border: "#d1d5db",
  surface: "#ffffff",
  page: "#f9fafb",
  accent: "#1d4ed8",
  accentSoft: "#eff6ff",
};

// Focus ring and the narrow-screen layout live in CSS because inline styles cannot express them.
const CSS = `
.ps-root { display: flex; flex-direction: column; min-height: 100vh; background: ${C.page}; color: ${C.text};
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 15px; }
.ps-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
  padding: 0.75rem 1.5rem; background: ${C.surface}; border-bottom: 1px solid ${C.border}; }
.ps-body { display: flex; flex: 1; min-height: 0; }
.ps-nav { width: 220px; flex-shrink: 0; padding: 1.5rem 0.75rem; background: ${C.surface}; border-right: 1px solid ${C.border}; }
.ps-nav ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.25rem; }
.ps-nav button { width: 100%; text-align: left; padding: 0.6rem 0.75rem; min-height: 44px; border: 1px solid transparent;
  border-radius: 4px; background: transparent; color: ${C.text}; font: inherit; cursor: pointer; }
.ps-nav button:hover { background: ${C.page}; }
.ps-nav button[aria-current="page"] { background: ${C.accentSoft}; color: ${C.accent}; border-color: ${C.accent}; font-weight: 600; }
.ps-main { flex: 1; min-width: 0; }
.ps-signout { min-height: 44px; padding: 0 1rem; border: 1px solid ${C.border}; border-radius: 4px; background: ${C.surface};
  color: ${C.text}; font: inherit; cursor: pointer; }
.ps-signout:hover { background: ${C.page}; }
.ps-skip { position: absolute; left: -9999px; top: 0; padding: 0.5rem 1rem; background: ${C.surface}; border: 2px solid ${C.accent}; z-index: 100; }
.ps-skip:focus { left: 0.5rem; top: 0.5rem; }
.ps-root button:focus-visible, .ps-root a:focus-visible, .ps-root input:focus-visible, .ps-root select:focus-visible,
.ps-root textarea:focus-visible { outline: 3px solid ${C.accent}; outline-offset: 2px; }
@media (max-width: 1023px) {
  .ps-body { flex-direction: column; }
  .ps-nav { width: auto; border-right: none; border-bottom: 1px solid ${C.border}; padding: 0.5rem 0.75rem; }
  .ps-nav ul { flex-direction: row; flex-wrap: wrap; }
  .ps-nav button { width: auto; }
}
`;

interface PlainShellProps {
  user: { name: string; email: string; role: string };
  currentView: ModuleViewKey;
  onNavigate: (view: ModuleViewKey) => void;
  onSignOut: () => void;
  children: React.ReactNode;
}

export const PlainShell: React.FC<PlainShellProps> = ({ user, currentView, onNavigate, onSignOut, children }) => {
  const items = ALL_VIEWS.filter((v) => isViewEnabled(v));
  return (
    <div className="ps-root">
      <style>{CSS}</style>
      <a className="ps-skip" href="#ps-content">
        Skip to content
      </a>
      <header className="ps-header">
        <strong style={{ fontSize: "17px" }}>ScoReview HR</strong>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <span>
            {user.name}
            {user.role ? <span style={{ color: C.muted }}> ({user.role})</span> : null}
          </span>
          <button type="button" className="ps-signout" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </header>
      <div className="ps-body">
        <nav className="ps-nav" aria-label="Main">
          <ul>
            {items.map((view) => (
              <li key={view}>
                <button type="button" aria-current={currentView === view ? "page" : undefined} onClick={() => onNavigate(view)}>
                  {LABELS[view]}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <main id="ps-content" className="ps-main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
};
