"use client";

import React, { useState } from "react";
import type { ModuleViewKey, UserPersona } from "./AppSidebar";
import { isViewEnabled } from "../../config/modules";
import { Icons } from "../../design-system/Icons";
import { EXPERIENCE_META, type ExperienceContext, type UserContextTuple } from "../../domain/orgCore";
import { ContextNotice, ContextSwitcher } from "../common/ContextSwitcher";

interface NavLeaf {
  id: string;
  label: string;
  view: ModuleViewKey;
  badge?: number | string;
}

interface NavGroup {
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  items: NavLeaf[];
}

const C = {
  text: "#1c1b19",
  muted: "#79756c",
  border: "#e4e1da",
  surface: "#ffffff",
  page: "#f7f6f3",
  accent: "#0f5c4d",
  accentSoft: "#e7f0ed",
  borderStrong: "#c9c5bb",
  railBg: "#0D3B33",
  railText: "#f2f7f5",
  railMuted: "rgba(242, 247, 245, 0.65)",
  railHover: "rgba(255, 255, 255, 0.08)",
  railActive: "#2D5A4C",
};

const CSS = `
.ps-root {
  --sidebar-bg: ${C.railBg};
  --sidebar-item-hover: ${C.railHover};
  --sidebar-active-bg: ${C.railActive};
  --sidebar-accent: #34d399;
  display: flex; flex-direction: column; min-height: 100vh; background: ${C.page}; color: ${C.text};
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 15px;
}
.ps-header { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; min-height: 60px;
  padding: 0.5rem 1.5rem; background: ${C.surface}; border-bottom: 1px solid ${C.border}; }
.ps-menu-btn { display: none; align-items: center; justify-content: center; width: 36px; height: 36px;
  border: 1px solid ${C.border}; border-radius: 8px; background: ${C.surface}; color: ${C.text}; cursor: pointer; }
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
.ps-body { display: flex; flex: 1; min-height: 0; position: relative; }
.ps-nav { width: 268px; flex-shrink: 0; padding: 1rem 0.75rem; background: var(--sidebar-bg); color: ${C.railText};
  display: flex; flex-direction: column; transition: width 150ms ease-out; }
.ps-nav.collapsed { width: 72px; padding: 1rem 0.5rem; }
.ps-rail-top { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.25rem 0.4rem 0.75rem; }
.ps-rail-brand { display: flex; align-items: center; gap: 0.6rem; font-size: 15px; font-weight: 700; color: ${C.railText}; white-space: nowrap; }
.ps-mark { width: 28px; height: 28px; border-radius: 8px; background: #ffffff; color: ${C.railBg};
  display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; flex-shrink: 0; }
.ps-collapse-btn { width: 28px; height: 28px; border: none; border-radius: 6px; background: rgba(255,255,255,0.08);
  color: ${C.railText}; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ps-collapse-btn:hover { background: rgba(255,255,255,0.16); }
.ps-ctx-anchor { position: relative; margin-bottom: 0.85rem; padding-bottom: 0.85rem; border-bottom: 1px solid rgba(255,255,255,0.12); }
.ps-ctx-btn { width: 100%; text-align: left; padding: 0.6rem 0.7rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.05); color: ${C.railText}; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
  transition: background-color 150ms ease-out; }
.ps-ctx-btn:hover { background: rgba(255,255,255,0.1); }
.ps-ctx-menu { position: absolute; left: 0; right: 0; top: calc(100% - 0.5rem); z-index: 60; background: #0f463d;
  border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 0.35rem; box-shadow: 0 12px 24px rgba(0,0,0,0.3); }
.ps-ctx-opt { width: 100%; text-align: left; padding: 0.5rem 0.65rem; border: none; border-radius: 6px; background: transparent;
  color: ${C.railText}; cursor: pointer; display: flex; flex-direction: column; gap: 0.1rem; font-size: 13px; }
.ps-ctx-opt:hover { background: rgba(255,255,255,0.1); }
.ps-nav ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.ps-nav-btn { width: 100%; text-align: left; padding: 0.45rem 0.7rem; min-height: 36px; border: none; border-left: 3px solid transparent;
  border-radius: 8px; background: transparent; color: ${C.railText}; font: inherit; font-size: 13.5px; cursor: pointer;
  display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; transition: background-color 150ms ease-out; }
.ps-nav-btn:hover { background: var(--sidebar-item-hover); }
.ps-nav-btn[aria-current="page"] { background: var(--sidebar-active-bg); border-left-color: var(--sidebar-accent); color: #ffffff; font-weight: 600; }
.ps-group-hdr { width: 100%; text-align: left; padding: 0.45rem 0.5rem; margin-top: 0.55rem; border: none; border-radius: 6px;
  background: transparent; color: ${C.railMuted}; font: inherit; font-size: 11px; font-weight: 700; letter-spacing: 0.05em;
  text-transform: uppercase; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 0.45rem;
  transition: background-color 150ms ease-out; }
.ps-group-hdr:hover { background: var(--sidebar-item-hover); color: #ffffff; }
.ps-group-label { display: flex; align-items: center; gap: 0.5rem; min-width: 0; }
.ps-badge { font-size: 11px; font-weight: 700; padding: 0.05rem 0.4rem; border-radius: 4px; background: rgba(255,255,255,0.2); color: #ffffff; }
.ps-sub { margin: 2px 0 0 0; padding-left: 0.35rem; }
.ps-main { flex: 1; min-width: 0; }
.ps-signout { min-height: 36px; padding: 0 0.6rem; border: none; border-radius: 6px; background: transparent;
  color: ${C.muted}; font: inherit; font-size: 13px; cursor: pointer; }
.ps-signout:hover { background: ${C.page}; color: ${C.text}; }
.ps-skip { position: absolute; left: -9999px; top: 0; padding: 0.5rem 1rem; background: ${C.surface}; border: 2px solid ${C.accent}; z-index: 100; }
.ps-skip:focus { left: 0.5rem; top: 0.5rem; }
.ps-root button:focus-visible, .ps-root a:focus-visible { outline: 2px solid var(--sidebar-accent); outline-offset: 2px; }
@media (max-width: 1023px) {
  .ps-menu-btn { display: inline-flex; }
  .ps-nav { position: fixed; top: 0; bottom: 0; left: 0; z-index: 70; transform: translateX(-100%); transition: transform 150ms ease-out; overflow-y: auto; }
  .ps-nav.mobile-open { transform: translateX(0); }
}
`;

const ROLE_TITLES: Record<string, string> = {
  employee: "Employee (self-service)",
  line_manager: "Line manager",
  hr_admin: "HR administrator",
  hr_director: "HR director",
};

interface PlainShellProps {
  user: { name: string; email: string; role: string };
  persona?: UserPersona;
  onSelectPersona?: (persona: UserPersona) => void;
  availableContexts?: UserContextTuple[];
  activeContext?: UserContextTuple;
  onSelectContext?: (contextId: string) => void;
  contextNotice?: string | null;
  onDismissContextNotice?: () => void;
  pendingApprovalsCount?: number;
  showName?: boolean;
  currentView: ModuleViewKey;
  onNavigate: (view: ModuleViewKey) => void;
  onSignOut: () => void;
  onOpenDede?: () => void;
  onOpenSearch?: () => void;
  children: React.ReactNode;
}

function getContextualNav(
  experience: ExperienceContext,
  pendingApprovalsCount: number,
): { topItems: NavLeaf[]; groups: NavGroup[] } {
  if (experience === "ESS") {
    return {
      topItems: [{ id: "ess-home", label: "My Dashboard", view: "self_service" }],
      groups: [
        {
          label: "My Performance",
          icon: Icons.Target,
          items: [
            { id: "ess-goals", label: "My Goals & OKRs", view: "my_performance" },
            { id: "ess-checkins", label: "My Check-ins", view: "my_performance" },
            { id: "ess-reviews", label: "My Reviews & Assessment", view: "my_performance" },
            { id: "ess-skills", label: "My Skills & Gaps", view: "skills_marketplace" },
          ],
        },
        {
          label: "My Leave",
          icon: Icons.Calendar,
          items: [
            { id: "ess-bal", label: "Leave Balances", view: "my_leave" },
            { id: "ess-apply", label: "Apply for Leave", view: "my_leave" },
            { id: "ess-plan", label: "My Leave Plan", view: "my_leave" },
            { id: "ess-hist", label: "My History", view: "my_leave" },
          ],
        },
        {
          label: "My Records",
          icon: Icons.FileText,
          items: [
            { id: "ess-bank", label: "Bank & Tax Details", view: "my_profile" },
            { id: "ess-docs", label: "Document Centre", view: "document_centre" },
            { id: "ess-payslips", label: "Payslips", view: "payslips" },
          ],
        },
        {
          label: "Projects & Talent",
          icon: Icons.Briefcase,
          items: [
            { id: "ess-gigs", label: "Skills & Gig Board", view: "skills_marketplace" },
            { id: "ess-proj", label: "Client Engagements", view: "projects" },
          ],
        },
        {
          label: "Assets & IT",
          icon: Icons.Laptop,
          items: [
            { id: "ess-assets", label: "My Assets", view: "assets" },
            { id: "ess-help", label: "IT Helpdesk", view: "helpdesk" },
            { id: "ess-pol", label: "Policies & Handbooks", view: "policies_handbook" },
          ],
        },
      ],
    };
  }

  if (experience === "MSS") {
    return {
      topItems: [
        { id: "mss-home", label: "Team Dashboard", view: "command_centre" },
        {
          id: "mss-approvals",
          label: "Approvals Inbox",
          view: "time_and_leave",
          badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
        },
      ],
      groups: [
        {
          label: "Team Performance",
          icon: Icons.Target,
          items: [
            { id: "mss-goals", label: "Team Goals & Alignment", view: "objectives" },
            { id: "mss-reviews", label: "Report Reviews & Ratings", view: "performance_pms" },
            { id: "mss-heatmap", label: "Team Skill Heatmap", view: "skills_marketplace" },
            { id: "mss-cal", label: "Calibration", view: "performance_pms" },
          ],
        },
        {
          label: "Team Leave",
          icon: Icons.Calendar,
          items: [
            {
              id: "mss-lv-app",
              label: "Leave Approvals",
              view: "time_and_leave",
              badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
            },
            { id: "mss-lv-cal", label: "Team Leave Calendar", view: "time_and_leave" },
            { id: "mss-lv-bal", label: "Team Balances", view: "time_and_leave" },
            { id: "mss-lv-res", label: "Resumption Monitoring", view: "time_and_leave" },
          ],
        },
        {
          label: "My Team",
          icon: Icons.Users,
          items: [
            { id: "mss-roster", label: "Team Roster", view: "workforce_directory" },
            { id: "mss-org", label: "Team Hierarchy", view: "organogram" },
          ],
        },
        {
          label: "Assets & IT",
          icon: Icons.Laptop,
          items: [
            { id: "mss-assets", label: "Team Assets", view: "asset_management" },
            { id: "mss-help", label: "IT Helpdesk", view: "helpdesk" },
          ],
        },
      ],
    };
  }

  // HRMS (HR Workspace)
  return {
    topItems: [
      { id: "hr-console", label: "ScoReview Console", view: "command_centre" },
      { id: "hr-cycle", label: "Active Cycle (BSC)", view: "performance_pms" },
    ],
    groups: [
      {
        label: "Performance Admin",
        icon: Icons.Target,
        items: [
          { id: "hr-pms-setup", label: "Cycle & Framework Setup", view: "performance_setup" },
          { id: "hr-cal", label: "Calibration & Final Ratings", view: "performance_pms" },
          { id: "hr-skills", label: "Skills Taxonomy (20 Skills)", view: "skills_marketplace" },
          { id: "hr-appeals", label: "Appeals & Grievances", view: "disciplinary" },
        ],
      },
      {
        label: "Leave Admin",
        icon: Icons.Calendar,
        items: [
          {
            id: "hr-lv-pol",
            label: "Leave Policies & Entitlements",
            view: "time_and_leave",
            badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
          },
          { id: "hr-lv-blk", label: "Blocked Periods & Holidays", view: "time_and_leave" },
          { id: "hr-lv-acc", label: "Accrual & Carry-Forward Runs", view: "time_and_leave" },
          { id: "hr-lv-lia", label: "Leave Liability & Allowances", view: "time_and_leave" },
        ],
      },
      {
        label: "People & Org",
        icon: Icons.Users,
        items: [
          { id: "hr-dir", label: "Employee Records (HRIS)", view: "workforce_directory" },
          { id: "hr-org", label: "Organogram & Reporting Lines", view: "organogram" },
          { id: "hr-life", label: "Onboarding & Exit", view: "lifecycle_portals" },
        ],
      },
      {
        label: "Reports & Governance",
        icon: Icons.BarChart,
        items: [
          { id: "hr-rep", label: "Cross-Module Analytics", view: "reports_analytics" },
          { id: "hr-aud", label: "Audit Trail & Governance", view: "governance_import" },
          { id: "hr-pol", label: "Policies & Handbooks", view: "policies_handbook" },
        ],
      },
      {
        label: "System Admin",
        icon: Icons.Settings,
        items: [
          { id: "hr-wf", label: "Workflows & Delegation", view: "approval_workflows" },
          { id: "hr-co", label: "Company Admin & Integrations", view: "company_setup" },
          { id: "hr-set", label: "Employee Settings", view: "employee_settings" },
          { id: "hr-ast", label: "Hardware and Fleet", view: "asset_management" },
        ],
      },
    ],
  };
}

const SUBSIDIARIES = [
  { id: "COMP-SENRAB-GH", name: "Senrab Holdings", location: "Accra HQ (Ghana)" },
  { id: "COMP-SENRAB-UK", name: "Senrab UK Ltd", location: "London Hub (UK)" },
  { id: "COMP-SENRAB-NA", name: "Senrab Namibia", location: "Windhoek (Namibia)" },
];

export const PlainShell: React.FC<PlainShellProps> = ({
  user,
  persona = "hr_director",
  availableContexts = [],
  activeContext,
  onSelectContext,
  contextNotice,
  onDismissContextNotice,
  pendingApprovalsCount = 0,
  showName = true,
  currentView,
  onNavigate,
  onSignOut,
  onOpenDede,
  onOpenSearch,
  children,
}) => {
  const [openState, setOpenState] = useState<Record<string, boolean>>({});
  const [activeLeafId, setActiveLeafId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [ctxMenuOpen, setCtxMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [activeCompanyId, setActiveCompanyId] = useState<string>(() => {
    if (typeof window === "undefined") return SUBSIDIARIES[0].id;
    try {
      return localStorage.getItem("scoreview_active_company") || SUBSIDIARIES[0].id;
    } catch {
      return SUBSIDIARIES[0].id;
    }
  });
  const activeSubsidiary =
    SUBSIDIARIES.find((s) => s.id === activeCompanyId) ?? SUBSIDIARIES[0];

  const activeExperience: ExperienceContext =
    activeContext?.experience ??
    (persona === "employee" ? "ESS" : persona === "line_manager" ? "MSS" : "HRMS");

  const { topItems, groups } = getContextualNav(activeExperience, pendingApprovalsCount);
  const filteredGroups = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => isViewEnabled(i.view)) }))
    .filter((g) => g.items.length > 0);

  const isOpen = (label: string) => openState[label] ?? true;
  const roleTitle = ROLE_TITLES[persona] ?? ROLE_TITLES[user.role] ?? user.role;
  const initials = (showName ? user.name : roleTitle)
    .replace(/[^A-Za-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const accentColor =
    activeExperience === "ESS"
      ? "#34d399"
      : activeExperience === "MSS"
      ? "#f59e0b"
      : "#38bdf8";

  const sidebarBorderLeft =
    activeExperience === "MSS"
      ? "4px solid #f59e0b"
      : activeExperience === "HRMS"
      ? "4px solid #38bdf8"
      : "4px solid transparent";

  const handleLeafClick = (item: NavLeaf) => {
    setActiveLeafId(item.id);
    setMobileOpen(false);
    onNavigate(item.view);
  };

  const isLeafActive = (item: NavLeaf) =>
    activeLeafId ? activeLeafId === item.id && currentView === item.view : currentView === item.view;

  return (
    <div
      className="ps-root"
      style={{ ["--sidebar-accent" as string]: accentColor }}
    >
      <style>{CSS}</style>
      <a className="ps-skip" href="#ps-content">
        Skip to content
      </a>
      <header className="ps-header">
        <button
          type="button"
          className="ps-menu-btn"
          aria-label="Open navigation drawer"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <span aria-hidden="true" style={{ fontSize: "16px", lineHeight: 1 }}>☰</span>
        </button>
        {(onOpenSearch || onOpenDede) && (
          <button
            type="button"
            className="ps-search"
            onClick={onOpenSearch ?? onOpenDede}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <Icons.Sparkles size={14} color={C.accent} />
              <span>Ask or Search with Dede</span>
            </span>
            <span style={{ fontSize: "11px", fontWeight: 600, color: C.muted, border: `1px solid ${C.border}`, borderRadius: "4px", padding: "0.05rem 0.35rem", background: C.surface }}>
              ⌘K
            </span>
          </button>
        )}
        <div className="ps-header-actions">
          {activeContext && onSelectContext && (
            <ContextSwitcher
              contexts={availableContexts}
              activeContext={activeContext}
              onSelectContext={onSelectContext}
              compact
            />
          )}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={profileMenuOpen}
              onClick={() => setProfileMenuOpen((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.2rem 0.55rem 0.2rem 0.2rem",
                borderRadius: "999px",
                border: `1px solid ${C.border}`,
                background: C.surface,
                cursor: "pointer",
              }}
            >
              <span className="ps-avatar" aria-hidden="true" style={{ width: 28, height: 28, fontSize: "11px" }}>
                {initials}
              </span>
              <span style={{ fontSize: "12px", fontWeight: 600, color: C.text, whiteSpace: "nowrap" }}>
                {showName ? user.name : activeSubsidiary.name}
              </span>
              <Icons.ChevronDown size={13} color={C.muted} />
            </button>
            {profileMenuOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  top: "120%",
                  right: 0,
                  width: "260px",
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: "10px",
                  boxShadow: "0 12px 28px rgba(0,0,0,0.12)",
                  zIndex: 60,
                  overflow: "hidden",
                }}
              >
                <div style={{ padding: "0.75rem 0.85rem", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: C.text }}>{user.name}</div>
                  <div style={{ fontSize: "11px", color: C.muted }}>{user.email}</div>
                </div>
                <div style={{ padding: "0.5rem 0.85rem 0.25rem", fontSize: "10px", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Company / Subsidiary
                </div>
                {SUBSIDIARIES.map((sub) => {
                  const selected = sub.id === activeSubsidiary.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      onClick={() => {
                        setActiveCompanyId(sub.id);
                        try {
                          localStorage.setItem("scoreview_active_company", sub.id);
                        } catch { }
                        setProfileMenuOpen(false);
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "0.45rem 0.85rem",
                        border: "none",
                        background: selected ? C.accentSoft : "transparent",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "12px",
                        color: C.text,
                      }}
                    >
                      <span>
                        <strong style={{ display: "block", fontWeight: selected ? 700 : 600 }}>{sub.name}</strong>
                        <span style={{ fontSize: "11px", color: C.muted }}>{sub.location}</span>
                      </span>
                      {selected && <span style={{ color: C.accent, fontWeight: 700 }}>●</span>}
                    </button>
                  );
                })}
                <div style={{ borderTop: `1px solid ${C.border}`, padding: "0.25rem 0" }}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      onNavigate("my_profile");
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "0.5rem 0.85rem",
                      border: "none",
                      background: "transparent",
                      fontSize: "12.5px",
                      color: C.text,
                      cursor: "pointer",
                    }}
                  >
                    My Profile &amp; Bank Details
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      onSignOut();
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "0.5rem 0.85rem",
                      border: "none",
                      background: "transparent",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      color: "#b91c1c",
                      cursor: "pointer",
                    }}
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      {contextNotice && onDismissContextNotice && (
        <ContextNotice message={contextNotice} onDismiss={onDismissContextNotice} />
      )}
      <div className="ps-body">
        <nav
          className={`ps-nav${collapsed ? " collapsed" : ""}${mobileOpen ? " mobile-open" : ""}`}
          aria-label="Main"
          style={{ borderLeft: sidebarBorderLeft }}
        >
          <div className="ps-rail-top">
            <div className="ps-rail-brand">
              <span className="ps-mark" aria-hidden="true">
                SR
              </span>
              {!collapsed && <span>ScoReview HR</span>}
            </div>
            <button
              type="button"
              className="ps-collapse-btn"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setCollapsed((v) => !v)}
            >
              <Icons.ChevronRight
                size={14}
                style={{ transform: collapsed ? "none" : "rotate(180deg)", transition: "transform 150ms ease-out" }}
              />
            </button>
          </div>

          {/* Tier 1: Context Anchor Card (replaces static "My Self-Service" header) */}
          {!collapsed && activeContext && (
            <div className="ps-ctx-anchor">
              <button
                type="button"
                className="ps-ctx-btn"
                aria-expanded={ctxMenuOpen}
                onClick={() => availableContexts.length > 1 && setCtxMenuOpen((v) => !v)}
              >
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#ffffff" }}>
                    {showName ? user.name : roleTitle}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "11px", color: C.railMuted, marginTop: "0.1rem" }}>
                    <span style={{ color: accentColor }}>●</span>
                    <span>
                      {EXPERIENCE_META[activeExperience].shortLabel} ({activeExperience})
                      {activeExperience !== "ESS" ? ` · ${activeContext.scopeLabel}` : ""}
                    </span>
                  </span>
                </span>
                {availableContexts.length > 1 && <Icons.ChevronDown size={14} color={C.railMuted} />}
              </button>
              {ctxMenuOpen && availableContexts.length > 1 && onSelectContext && (
                <div className="ps-ctx-menu" role="menu">
                  {availableContexts.map((ctx) => {
                    const isCurr = ctx.contextId === activeContext.contextId;
                    return (
                      <button
                        key={ctx.contextId}
                        type="button"
                        role="menuitemradio"
                        aria-checked={isCurr}
                        className="ps-ctx-opt"
                        onClick={() => {
                          setCtxMenuOpen(false);
                          setActiveLeafId(null);
                          onSelectContext(ctx.contextId);
                        }}
                      >
                        <span style={{ fontWeight: isCurr ? 700 : 500 }}>
                          {isCurr ? "● " : "○ "}
                          {EXPERIENCE_META[ctx.experience].shortLabel} ({ctx.experience})
                        </span>
                        {ctx.experience !== "ESS" && (
                          <span style={{ fontSize: "11px", color: C.railMuted, paddingLeft: "0.9rem" }}>
                            {ctx.subLabel}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Top Anchor Links */}
          <ul>
            {topItems
              .filter((i) => isViewEnabled(i.view))
              .map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="ps-nav-btn"
                    title={item.label}
                    aria-current={isLeafActive(item) ? "page" : undefined}
                    onClick={() => handleLeafClick(item)}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                      <Icons.Activity size={15} color={C.railText} />
                      {!collapsed && <span>{item.label}</span>}
                    </span>
                    {!collapsed && item.badge !== undefined && (
                      <span className="ps-badge">{item.badge}</span>
                    )}
                  </button>
                </li>
              ))}
          </ul>

          {/* Tier 2 & Tier 3: Contextual Module Groups */}
          <ul>
            {filteredGroups.map((g) => {
              const expanded = isOpen(g.label);
              const GroupIcon = g.icon;
              return (
                <li key={g.label}>
                  <button
                    type="button"
                    className="ps-group-hdr"
                    title={g.label}
                    aria-expanded={expanded}
                    onClick={() =>
                      collapsed
                        ? handleLeafClick(g.items[0])
                        : setOpenState({ ...openState, [g.label]: !expanded })
                    }
                  >
                    <span className="ps-group-label">
                      <GroupIcon size={15} color={C.railMuted} />
                      {!collapsed && <span>{g.label}</span>}
                    </span>
                    {!collapsed && (
                      <span aria-hidden="true">
                        {expanded ? <Icons.ChevronDown size={13} /> : <Icons.ChevronRight size={13} />}
                      </span>
                    )}
                  </button>
                  {!collapsed && expanded && (
                    <ul className="ps-sub">
                      {g.items.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            className="ps-nav-btn"
                            aria-current={isLeafActive(item) ? "page" : undefined}
                            onClick={() => handleLeafClick(item)}
                          >
                            <span>{item.label}</span>
                            {item.badge !== undefined && (
                              <span className="ps-badge">{item.badge}</span>
                            )}
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
