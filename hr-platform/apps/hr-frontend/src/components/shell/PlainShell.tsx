"use client";

import React, { useState } from "react";
import type { ModuleViewKey } from "./AppSidebar";
import { ALL_VIEWS, isViewEnabled } from "../../config/modules";
import { Icons } from "../../design-system/Icons";

// Plain application frame: header, text-only navigation, content. No icons, badges, gradients, shadows,
// animation, command palette, AI drawer or persona switcher. Neutral greys with one accent colour.
// Selected by NEXT_PUBLIC_SHELL (default "plain"); "full" keeps the original frame.

const LABELS: Record<ModuleViewKey, string> = {
  dashboard: "Dashboard",
  assets: "Assets Management",
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
  organogram: "Organogram",
};

// Major sidebar sections and the views under each. Views not listed here fall into "Other", so none disappear.
const GROUPS: { label: string; views: ModuleViewKey[] }[] = [
  { label: "Dashboard", views: ["dashboard"] },
  { label: "My Self-Service", views: ["self_service", "my_profile", "payslips", "document_centre", "my_performance"] },
  { label: "People", views: ["workforce_directory", "lifecycle_portals", "disciplinary", "approval_workflows"] },
  { label: "Time & Performance", views: ["time_and_leave", "performance_pms", "performance_setup", "objectives"] },
  { label: "Assets & IT", views: ["assets", "asset_management", "helpdesk"] },
  { label: "Projects & Talent", views: ["projects", "skills_marketplace"] },
  { label: "Reports & Governance", views: ["reports_analytics", "governance_import", "policies_handbook", "admin_nerve_center"] },
  { label: "Company Admin", views: ["company_setup", "organogram", "employee_settings"] },
];

const C = {
  text: "#1c1b19",
  muted: "#79756c",
  border: "#e4e1da",
  surface: "#ffffff",
  page: "#f7f6f3",
  accent: "#0f5c4d",
  accentSoft: "#e7f0ed",
  borderStrong: "#c9c5bb",
  // Rail colours: the app's teal accent, darkened, with light text.
  railBg: "#0b3f35",
  railText: "#f2f7f5",
  railMuted: "#a9cbc1",
  railHover: "rgba(255, 255, 255, 0.08)",
  railActive: "rgba(255, 255, 255, 0.16)",
};

// One icon per sidebar group heading.
const GROUP_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  Dashboard: Icons.Activity,
  "My Self-Service": Icons.Smile,
  People: Icons.Users,
  "Time & Performance": Icons.Clock,
  "Assets & IT": Icons.Laptop,
  "Projects & Talent": Icons.Briefcase,
  "Reports & Governance": Icons.BarChart,
  "Company Admin": Icons.Building,
};

// Focus ring and the narrow-screen layout live in CSS because inline styles cannot express them.
const CSS = `
.ps-root { display: flex; flex-direction: column; min-height: 100vh; background: ${C.page}; color: ${C.text};
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 15px; }
.ps-header { display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap; min-height: 64px;
  padding: 0.5rem 1.5rem; background: ${C.surface}; border-bottom: 1px solid ${C.border}; }
.ps-brand { display: flex; align-items: center; gap: 0.6rem; font-size: 16px; font-weight: 600; color: ${C.text}; white-space: nowrap; }
.ps-mark { width: 28px; height: 28px; border-radius: 8px; background: ${C.accent}; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; }
.ps-search { flex: 0 1 360px; margin-left: auto; min-height: 36px; padding: 0 0.75rem; border: 1px solid ${C.border}; border-radius: 8px;
  background: ${C.page}; color: ${C.muted}; font: inherit; font-size: 14px; text-align: left; cursor: pointer;
  transition: border-color 150ms ease-out, background-color 150ms ease-out; }
.ps-search:hover { border-color: ${C.borderStrong}; background: ${C.surface}; }
.ps-header-actions { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.ps-ask { min-height: 36px; padding: 0 0.9rem; border: 1px solid ${C.accent}; border-radius: 8px; background: ${C.surface}; color: ${C.accent};
  font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; transition: background-color 150ms ease-out; }
.ps-ask:hover { background: ${C.accentSoft}; }
.ps-user { display: flex; align-items: center; gap: 0.6rem; padding-left: 0.75rem; border-left: 1px solid ${C.border}; }
.ps-avatar { width: 34px; height: 34px; border-radius: 999px; background: ${C.accentSoft}; color: ${C.accent};
  display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; }
.ps-user-text { display: flex; flex-direction: column; line-height: 1.25; }
.ps-user-name { font-size: 14px; font-weight: 600; color: ${C.text}; }
.ps-user-role { font-size: 12px; color: ${C.muted}; }
.ps-body { display: flex; flex: 1; min-height: 0; }
.ps-nav { width: 248px; flex-shrink: 0; padding: 1.25rem 0.75rem; background: ${C.railBg}; color: ${C.railText}; }
.ps-rail-brand { display: flex; align-items: center; gap: 0.6rem; padding: 0.25rem 0.5rem 1.25rem; font-size: 16px; font-weight: 600; color: ${C.railText}; white-space: nowrap; }
.ps-rail-brand .ps-mark { background: #ffffff; color: ${C.railBg}; }
.ps-nav ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.ps-nav button { width: 100%; text-align: left; padding: 0 0.75rem; min-height: 36px; border: none; border-radius: 8px;
  background: transparent; color: ${C.railText}; font: inherit; font-size: 14px; cursor: pointer;
  transition: background-color 150ms ease-out, color 150ms ease-out; }
.ps-nav button:hover { background: ${C.railHover}; }
.ps-nav button[aria-current="page"] { background: ${C.railActive}; color: #ffffff; font-weight: 600; }
.ps-main { flex: 1; min-width: 0; }
.ps-nav .ps-group { display: flex; justify-content: space-between; align-items: center; gap: 0.6rem; margin-top: 0.75rem; font-size: 14px; font-weight: 600; color: ${C.railText}; }
.ps-group-label { display: flex; align-items: center; gap: 0.6rem; min-width: 0; }
.ps-group-chev { display: flex; color: ${C.railMuted}; transition: transform 150ms ease-out; }
.ps-group[aria-expanded="false"] .ps-group-chev { transform: rotate(-90deg); }
.ps-sub { margin: 2px 0 0 0; padding-left: 0.5rem; }
.ps-sub button { padding-left: 2.1rem; font-size: 13.5px; color: ${C.railMuted}; }
.ps-sub button[aria-current="page"] { color: #ffffff; }
@media (prefers-reduced-motion: reduce) { .ps-nav button, .ps-group-chev { transition: none; } }
.ps-signout { min-height: 36px; padding: 0 0.6rem; border: none; border-radius: 6px; background: transparent;
  color: ${C.muted}; font: inherit; font-size: 13px; cursor: pointer; }
.ps-signout:hover { background: ${C.page}; color: ${C.text}; }
.ps-skip { position: absolute; left: -9999px; top: 0; padding: 0.5rem 1rem; background: ${C.surface}; border: 2px solid ${C.accent}; z-index: 100; }
.ps-skip:focus { left: 0.5rem; top: 0.5rem; }
.ps-root button:focus-visible, .ps-root a:focus-visible, .ps-root input:focus-visible, .ps-root select:focus-visible,
.ps-root textarea:focus-visible { outline: 3px solid ${C.accent}; outline-offset: 2px; }
@media (max-width: 1023px) {
  .ps-body { flex-direction: column; }
  .ps-nav { width: auto; padding: 0.5rem 0.75rem; }
  .ps-rail-brand { display: none; }
  .ps-nav ul { flex-direction: row; flex-wrap: wrap; }
  .ps-nav button { width: auto; }
}
`;

// Role descriptions shown in the header. Demo sessions show these instead of a person's name.
const ROLE_TITLES: Record<string, string> = {
  employee: "Employee (self-service)",
  line_manager: "Line manager",
  hr_admin: "HR administrator",
  hr_director: "HR director",
};

interface PlainShellProps {
  user: { name: string; email: string; role: string };
  showName?: boolean;
  currentView: ModuleViewKey;
  onNavigate: (view: ModuleViewKey) => void;
  onSignOut: () => void;
  onOpenDede?: () => void;
  onOpenSearch?: () => void;
  children: React.ReactNode;
}

export const PlainShell: React.FC<PlainShellProps> = ({ user, showName = true, currentView, onNavigate, onSignOut, onOpenDede, onOpenSearch, children }) => {
  const [openState, setOpenState] = useState<Record<string, boolean>>({});
  const enabled = ALL_VIEWS.filter((v) => isViewEnabled(v));
  const grouped = GROUPS.map((g) => ({ label: g.label, views: g.views.filter((v) => enabled.includes(v)) })).filter((g) => g.views.length > 0);
  const placed = new Set<ModuleViewKey>(GROUPS.flatMap((g) => g.views));
  const other = enabled.filter((v) => !placed.has(v));
  if (other.length > 0) grouped.push({ label: "Other", views: other });
  // Every section starts open so each page is visible in the sidebar; the user can collapse any section.
  const isOpen = (label: string) => openState[label] ?? true;
  const roleTitle = ROLE_TITLES[user.role] ?? user.role;
  const initials = (showName ? user.name : roleTitle)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div className="ps-root">
      <style>{CSS}</style>
      <a className="ps-skip" href="#ps-content">
        Skip to content
      </a>
      <header className="ps-header">
        {onOpenSearch && (
          <button type="button" className="ps-search" onClick={onOpenSearch}>
            Search people, pages and reports
          </button>
        )}
        <div className="ps-header-actions">
          {onOpenDede && (
            <button type="button" className="ps-ask" onClick={onOpenDede}>
              Ask Dede
            </button>
          )}
          <div className="ps-user">
            <span className="ps-avatar" aria-hidden="true">{initials}</span>
            <span className="ps-user-text">
              <span className="ps-user-name">{showName ? user.name : roleTitle}</span>
              {showName && user.role ? <span className="ps-user-role">{roleTitle}</span> : null}
            </span>
          </div>
          <button type="button" className="ps-signout" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </header>
      <div className="ps-body">
        <nav className="ps-nav" aria-label="Main">
          <div className="ps-rail-brand">
            <span className="ps-mark" aria-hidden="true">SR</span>
            <span>ScoReview HR</span>
          </div>
          <ul>
            {grouped.map((g) => {
              const expanded = isOpen(g.label);
              const id = `ps-group-${g.label.replace(/[^A-Za-z0-9]+/g, "-").toLowerCase()}`;
              return (
                <li key={g.label}>
                  <button
                    type="button"
                    className="ps-group"
                    aria-expanded={expanded}
                    aria-controls={id}
                    onClick={() => setOpenState({ ...openState, [g.label]: !expanded })}
                  >
                    <span className="ps-group-label">
                      {(() => {
                        const GroupIcon = GROUP_ICONS[g.label];
                        return GroupIcon ? <GroupIcon size={16} color={C.railText} /> : null;
                      })()}
                      <span>{g.label}</span>
                    </span>
                    <span className="ps-group-chev" aria-hidden="true">
                      <Icons.ChevronDown size={14} />
                    </span>
                  </button>
                  {expanded && (
                    <ul id={id} className="ps-sub">
                      {g.views.map((view) => (
                        <li key={view}>
                          <button type="button" aria-current={currentView === view ? "page" : undefined} onClick={() => onNavigate(view)}>
                            {LABELS[view]}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
        <main id="ps-content" className="ps-main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
};
