"use client";

import React, { useEffect, useState, useRef } from "react";
import { colors, typography, radii, shadows } from "./tokens";
import { Icons } from "./Icons";
import { ModuleViewKey } from "../components/shell/AppSidebar";
import { EmployeeRecord } from "../components/modules/WorkforceDirectoryView";
import { FeatureKey, isFeatureEnabled, isViewEnabled } from "../config/modules";

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "Direct Action" | "Navigation" | "Workforce" | "Personal";
  icon: React.ReactNode;
  keywords: string[];
  onSelect: () => void;
  /** The module this entry opens; hidden when that module is disabled. */
  view?: ModuleViewKey;
  /** The optional feature this entry needs; hidden when it is off. */
  feature?: FeatureKey;
  badge?: string;
  badgeVariant?: "emerald" | "indigo" | "peach";
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectView: (view: ModuleViewKey) => void;
  employees: EmployeeRecord[];
  onSelectEmployee?: (emp: EmployeeRecord) => void;
  onOpenPayslip?: () => void;
  onOpenOmniAgent?: () => void;
  onQuickAction?: (action: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectView,
  employees,
  onSelectEmployee,
  onOpenPayslip,
  onOpenOmniAgent,
  onQuickAction,
}) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input whenever opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isOpen]);

  // Global Keyboard Listener (Cmd+K to toggle, Esc to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Build the complete Command List
  const baseActions: CommandItem[] = [
    {
      id: "action_payslip",
      feature: "payslip",
      title: "View Latest Payslip · November 2026 (GH₵28,450.00 Net)",
      subtitle: "Instant payslip inspection & certified GRA / SSNIT breakdown",
      category: "Direct Action",
      icon: <Icons.FileText size={16} color={colors.emeraldDark} />,
      keywords: ["payslip", "pay", "salary", "wage", "slip", "payslips", "remuneration", "net pay", "p60", "tax", "ghs"],
      badge: "Instant Open",
      badgeVariant: "emerald",
      onSelect: () => {
        if (onOpenPayslip) onOpenPayslip();
        onClose();
      },
    },
    {
      id: "action_omni_agent",
      feature: "ai_assistant",
      title: "Launch Dede AI Copilot (⌘J)",
      subtitle: "Zero-UI conversational assistant, leave drafting & OCR document parser",
      category: "Direct Action",
      icon: <Icons.Sparkles size={16} color={colors.indigoAction} />,
      keywords: ["dede", "omni", "agent", "ai", "copilot", "samira", "assistant", "workflow", "accra"],
      badge: "⌘J",
      badgeVariant: "indigo",
      onSelect: () => {
        if (onOpenOmniAgent) onOpenOmniAgent();
        onClose();
      },
    },
    {
      id: "action_ai_report_builder",
      view: "reports_analytics",
      title: "AI Report Builder & 60-Report Catalog",
      subtitle: "Instant natural language query e.g. 'Turnover vs last quarter' or full HR catalog",
      category: "Direct Action",
      icon: <Icons.BarChart size={16} color={colors.indigoAction} />,
      keywords: ["report", "reports", "builder", "ai report", "turnover", "analytics", "catalog", "export", "csv", "bradford", "headcount", "kpi"],
      badge: "60 Catalog",
      badgeVariant: "indigo",
      onSelect: () => {
        onSelectView("reports_analytics");
        onClose();
      },
    },
    {
      id: "action_employee_id_settings",
      view: "employee_settings",
      title: "Staff ID Auto-Generator & Employee Settings",
      subtitle: "Configure DW-2026-0046 numbering, zero-padding, PFM pension trustees, & contracts",
      category: "Direct Action",
      icon: <Icons.Hash size={16} color={colors.indigoAction} />,
      keywords: ["staff id", "employee id", "auto increment", "settings", "generator", "pension", "pfm", "pfa", "completeness", "subsidiary", "contract"],
      badge: "13 Tabs",
      badgeVariant: "indigo",
      onSelect: () => {
        onSelectView("employee_settings");
        onClose();
      },
    },
    {
      id: "action_request_leave",
      view: "time_and_leave",
      title: "Request Annual Leave (Instant Draft)",
      subtitle: "Book time off, check allowance balance (18 days remaining)",
      category: "Direct Action",
      icon: <Icons.Calendar size={16} color={colors.indigoAccent} />,
      keywords: ["leave", "holiday", "vacation", "pto", "time off", "annual leave", "sick", "absence"],
      badge: "ESS",
      badgeVariant: "peach",
      onSelect: () => {
        if (onQuickAction) onQuickAction("request_leave");
        else onSelectView("time_and_leave");
        onClose();
      },
    },
    {
      id: "action_vibe_check",
      view: "command_centre",
      title: "Record 10-Second Voice Vibe Check",
      subtitle: "Anonymous pulse feedback with AI waveform sentiment classification",
      category: "Direct Action",
      icon: <Icons.Mic size={16} color={colors.peachAccent} />,
      keywords: ["vibe", "sentiment", "voice", "pulse", "mood", "check", "audio"],
      badge: "Wellness",
      badgeVariant: "peach",
      onSelect: () => {
        onSelectView("command_centre");
        onClose();
      },
    },
    {
      id: "action_rewards_wallet",
      view: "admin_nerve_center",
      title: "Total Rewards Wallet & Apple Card Stack",
      subtitle: "View Base (GH₵145k), Bonus (GH₵25k), Equity (GH₵60k), Healthcare (GH₵3.5k)",
      category: "Personal",
      icon: <Icons.Wallet size={16} color={colors.indigoPrimary} />,
      keywords: ["wallet", "rewards", "compensation", "bonus", "equity", "shares", "benefits", "stipend", "ghs"],
      badge: "GH₵188.5k Total",
      badgeVariant: "indigo",
      onSelect: () => {
        onSelectView("admin_nerve_center");
        onClose();
      },
    },
    {
      id: "action_checkin_progress",
      view: "performance_pms",
      title: "Supervisor & Employee Check-in (1-on-1 Review)",
      subtitle: "Log goal progression, obstacles, action items and bilateral signoff",
      category: "Direct Action",
      icon: <Icons.Target size={16} color={colors.indigoAction} />,
      keywords: ["checkin", "check-in", "1-on-1", "progress", "supervisor", "employee", "review", "pms", "goals"],
      badge: "PMS",
      badgeVariant: "indigo",
      onSelect: () => {
        onSelectView("performance_pms");
        onClose();
      },
    },
    {
      id: "action_career_gigs",
      view: "skills_marketplace",
      title: "Browse Internal Gig Board & Skills Navigator",
      subtitle: "Explore high-impact projects matched to verified competencies",
      category: "Direct Action",
      icon: <Icons.Compass size={16} color={colors.emeraldDark} />,
      keywords: ["gig", "gigs", "skills", "marketplace", "career", "projects", "internal mobility", "learning"],
      badge: "AI Match",
      badgeVariant: "emerald",
      onSelect: () => {
        onSelectView("skills_marketplace");
        onClose();
      },
    },
    {
      id: "action_continuous_win",
      view: "skills_marketplace",
      title: "Log Continuous Performance Win",
      subtitle: "Record a weekly accomplishment for bias-free annual synthesis",
      category: "Direct Action",
      icon: <Icons.Target size={16} color={colors.indigoAction} />,
      keywords: ["performance", "win", "journal", "okr", "mbo", "bsc", "goal", "accomplishment"],
      badge: "Journal",
      badgeVariant: "indigo",
      onSelect: () => {
        onSelectView("skills_marketplace");
        onClose();
      },
    },
    // Module Navigation Items
    {
      id: "nav_self_service",
      view: "self_service",
      title: "My Self-Service & Personal Workspace (ESS)",
      subtitle: "Personal profile, assigned laptop, holiday balance & quick payslip",
      category: "Navigation",
      icon: <Icons.Users size={16} color={colors.textSecondary} />,
      keywords: ["self service", "ess", "profile", "personal", "my space", "home"],
      onSelect: () => {
        onSelectView("self_service");
        onClose();
      },
    },
    {
      id: "nav_command_centre",
      view: "command_centre",
      title: "Workforce Command Centre",
      subtitle: "AI Daily Brief, company vibe pulse & executive KPI oversight",
      category: "Navigation",
      icon: <Icons.CommandCentre size={16} color={colors.textSecondary} />,
      keywords: ["command centre", "dashboard", "overview", "brief", "daily brief", "kpis"],
      onSelect: () => {
        onSelectView("command_centre");
        onClose();
      },
    },
    {
      id: "nav_reports_analytics",
      view: "reports_analytics",
      title: "Strategic Dashboards & 60 HR Reports Catalog",
      subtitle: "Executive, Manager & Compliance packs with 1-click CSV/JSON export & AI diagnosis",
      category: "Navigation",
      icon: <Icons.BarChart size={16} color={colors.textSecondary} />,
      keywords: ["reports", "analytics", "catalog", "dashboards", "metrics", "export", "dei", "turnover", "payroll", "headcount", "bradford"],
      badge: "60 Reports",
      badgeVariant: "indigo",
      onSelect: () => {
        onSelectView("reports_analytics");
        onClose();
      },
    },
    {
      id: "nav_workforce_directory",
      view: "workforce_directory",
      title: "Employee Directory & Workforce Roster",
      subtitle: "45 active staff, departments, management hierarchies & profiles",
      category: "Navigation",
      icon: <Icons.Users size={16} color={colors.textSecondary} />,
      keywords: ["directory", "employees", "staff", "people", "team", "roster", "workforce"],
      badge: `${employees.length} Staff`,
      onSelect: () => {
        onSelectView("workforce_directory");
        onClose();
      },
    },
    {
      id: "nav_performance_pms",
      view: "performance_pms",
      title: "Performance Management (OKR / MBO / BSC)",
      subtitle: "Strict single-framework appraisal cycles & competency reviews",
      category: "Navigation",
      icon: <Icons.Target size={16} color={colors.textSecondary} />,
      keywords: ["performance", "pms", "appraisals", "reviews", "okr", "mbo", "bsc", "framework"],
      onSelect: () => {
        onSelectView("performance_pms");
        onClose();
      },
    },
    {
      id: "nav_hardware_fleet",
      view: "asset_management",
      title: "Hardware and Fleet",
      subtitle: "Vehicles, laptops and mobile phones, with assignments",
      category: "Navigation",
      icon: <Icons.Laptop size={16} color={colors.textSecondary} />,
      keywords: ["assets", "hardware", "laptops", "fleet", "macbook", "equipment", "monitors"],
      onSelect: () => {
        onSelectView("asset_management");
        onClose();
      },
    },
    {
      id: "nav_time_leave",
      view: "time_and_leave",
      title: "Time & Leave Approvals",
      subtitle: "Pending leave requests, team calendar & shift scheduling",
      category: "Navigation",
      icon: <Icons.Calendar size={16} color={colors.textSecondary} />,
      keywords: ["leave", "time", "calendar", "shifts", "absence", "pto", "approvals"],
      onSelect: () => {
        onSelectView("time_and_leave");
        onClose();
      },
    },
    {
      id: "nav_lifecycle_portals",
      view: "lifecycle_portals",
      title: "Lifecycle Portals (Pre-Boarding & Offboarding)",
      subtitle: "Candidate day -14 portal & zero-leak exit flight plan",
      category: "Navigation",
      icon: <Icons.Plane size={16} color={colors.textSecondary} />,
      keywords: ["lifecycle", "onboarding", "offboarding", "flight plan", "pre-boarding", "exit"],
      onSelect: () => {
        onSelectView("lifecycle_portals");
        onClose();
      },
    },
    {
      id: "nav_helpdesk",
      view: "helpdesk",
      title: "IT Support Helpdesk & Service Desk",
      subtitle: "Incident triage, hardware provisioning & SLA tracking",
      category: "Navigation",
      icon: <Icons.LifeBuoy size={16} color={colors.textSecondary} />,
      keywords: ["helpdesk", "tickets", "support", "it", "incidents", "service desk"],
      onSelect: () => {
        onSelectView("helpdesk");
        onClose();
      },
    },
    {
      id: "nav_projects",
      view: "projects",
      title: "Client Engagements",
      subtitle: "Client project portfolio and delivery progress",
      category: "Navigation",
      icon: <Icons.Briefcase size={16} color={colors.textSecondary} />,
      keywords: ["projects", "clients", "advisory", "engagements", "sprints", "consulting"],
      onSelect: () => {
        onSelectView("projects");
        onClose();
      },
    },
    {
      id: "nav_disciplinary",
      view: "disciplinary",
      title: "Disciplinary Management",
      subtitle: "Cases, hearings and case reviews",
      category: "Navigation",
      icon: <Icons.AlertTriangle size={16} color={colors.textSecondary} />,
      keywords: ["disciplinary", "case", "review", "hearing", "warning", "misconduct", "grievance"],
      onSelect: () => {
        onSelectView("disciplinary");
        onClose();
      },
    },
    {
      id: "nav_policies_handbook",
      view: "policies_handbook",
      title: "Policies & Handbooks",
      subtitle: "Add policies and handbooks, track profile completeness",
      category: "Navigation",
      icon: <Icons.BookOpen size={16} color={colors.textSecondary} />,
      keywords: ["policy", "policies", "handbook", "profile", "completeness", "acknowledge"],
      onSelect: () => {
        onSelectView("policies_handbook");
        onClose();
      },
    },
    {
      id: "nav_employee_settings",
      view: "employee_settings",
      title: "Employee Settings & Policy Governance",
      subtitle: "13 sub-modules: ID Auto-generation, Documents, Contracts, PFM, Dynamic Fields, Multi-Subsidiary",
      category: "Navigation",
      icon: <Icons.Settings size={16} color={colors.textSecondary} />,
      keywords: ["settings", "employee settings", "configuration", "auto generator", "documents", "contracts", "pfa", "pfm", "subsidiary", "custom fields"],
      badge: "Config",
      badgeVariant: "indigo",
      onSelect: () => {
        onSelectView("employee_settings");
        onClose();
      },
    },
    {
      id: "nav_approval_workflows",
      view: "approval_workflows",
      title: "Approval Workflows & Maker-Checker Engine",
      subtitle: "Multi-tier approval chains, reporting line & admin role routing, comment controls",
      category: "Navigation",
      icon: <Icons.FileCheck size={16} color={colors.emeraldDark} />,
      keywords: ["workflows", "approval", "approval workflows", "maker checker", "routing", "maternity workflow", "expense policy", "requisition workflow", "steps"],
      badge: "Engine",
      badgeVariant: "emerald",
      onSelect: () => {
        onSelectView("approval_workflows");
        onClose();
      },
    },
    {
      id: "nav_governance",
      view: "governance_import",
      title: "Data Governance & Architecture Audit",
      subtitle: "Master data sync, database schema integrity & regulatory audit",
      category: "Navigation",
      icon: <Icons.ShieldCheck size={16} color={colors.textSecondary} />,
      keywords: ["governance", "data", "audit", "import", "compliance"],
      onSelect: () => {
        onSelectView("governance_import");
        onClose();
      },
    },
  ];

  // Employee matching items
  const employeeItems: CommandItem[] = employees
    .filter(
      (e) =>
        query.trim().length > 1 &&
        (`${e.first_name} ${e.last_name}`.toLowerCase().includes(query.toLowerCase()) ||
          e.email.toLowerCase().includes(query.toLowerCase()) ||
          (e.department_name && e.department_name.toLowerCase().includes(query.toLowerCase())))
    )
    .slice(0, 4)
    .map((e) => ({
      id: `emp_${e.id}`,
      title: `${e.first_name} ${e.last_name}`,
      subtitle: `${e.email} · ${e.department_name || "General Consulting"}`,
      category: "Workforce",
      icon: <Icons.Users size={16} color={colors.indigoAccent} />,
      keywords: [e.first_name.toLowerCase(), e.last_name.toLowerCase(), e.email.toLowerCase()],
      badge: "Employee Profile",
      badgeVariant: "indigo",
      onSelect: () => {
        if (onSelectEmployee) onSelectEmployee(e);
        onSelectView("workforce_directory");
        onClose();
      },
    }));

  // Filtering logic
  const filteredActions = baseActions.filter((item) => {
    if (item.view && !isViewEnabled(item.view)) return false;
    if (item.feature && !isFeatureEnabled(item.feature)) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase().trim();
    if (item.title.toLowerCase().includes(q)) return true;
    if (item.subtitle && item.subtitle.toLowerCase().includes(q)) return true;
    return item.keywords.some((kw) => kw.includes(q) || q.includes(kw));
  });

  const combinedItems = [...filteredActions, ...employeeItems];

  // Keyboard navigation inside list
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < combinedItems.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : combinedItems.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (combinedItems[selectedIndex]) {
        combinedItems[selectedIndex].onSelect();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(5px)",
        zIndex: 120,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "10vh",
        animation: "fadeIn 0.12s ease-out",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "640px",
          backgroundColor: colors.surface,
          borderRadius: radii.xl,
          boxShadow: shadows.modal,
          border: `1px solid ${colors.borderStrong}`,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar (Linear / Notion Speed) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "1rem 1.25rem",
            borderBottom: `1px solid ${colors.border}`,
            backgroundColor: "#ffffff",
          }}
        >
          <Icons.Search size={19} color={colors.indigoAction} />
          <input
            ref={inputRef}
            autoFocus
            type="text"
            placeholder="Type 'Payslip', 'Leave', 'Vibe', 'Wallet', or search workforce..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: typography.sizes.md,
              fontFamily: typography.fontFamily,
              color: colors.textPrimary,
              backgroundColor: "transparent",
              fontWeight: 500,
            }}
          />
          <span
            style={{
              fontSize: "11px",
              padding: "0.2rem 0.45rem",
              borderRadius: radii.sm,
              backgroundColor: colors.surfaceSubtle,
              color: colors.textMuted,
              border: `1px solid ${colors.border}`,
              fontFamily: typography.fontMono,
            }}
          >
            ESC
          </span>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          style={{
            maxHeight: "420px",
            overflowY: "auto",
            padding: "0.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          {combinedItems.length === 0 ? (
            <div
              style={{
                padding: "2.5rem 1rem",
                textAlign: "center",
                color: colors.textMuted,
                fontSize: typography.sizes.sm,
              }}
            >
              No commands matching &quot;{query}&quot;. Try typing &quot;Payslip&quot;, &quot;Leave&quot;, or &quot;Wallet&quot;.
            </div>
          ) : (
            combinedItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.onSelect}
                  onMouseEnter={() => setSelectedIndex(index)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.65rem 0.85rem",
                    borderRadius: radii.md,
                    cursor: "pointer",
                    backgroundColor: isSelected ? colors.indigoSubtle : "transparent",
                    borderLeft: isSelected ? `3px solid ${colors.indigoAccent}` : "3px solid transparent",
                    transition: "background-color 0.08s ease, border-color 0.08s ease, color 0.08s ease, box-shadow 0.08s ease, opacity 0.08s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: radii.md,
                        backgroundColor: isSelected ? "#ffffff" : colors.surfaceSubtle,
                        border: `1px solid ${isSelected ? colors.indigoBorder : colors.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {item.icon}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: typography.sizes.sm,
                          fontWeight: isSelected ? 600 : 500,
                          color: isSelected ? colors.indigoPrimary : colors.textPrimary,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div
                          style={{
                            fontSize: typography.sizes.xs,
                            color: colors.textMuted,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            marginTop: "1px",
                          }}
                        >
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                    {item.badge && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          padding: "0.15rem 0.45rem",
                          borderRadius: radii.sm,
                          backgroundColor:
                            item.badgeVariant === "emerald"
                              ? colors.emeraldSubtle
                              : item.badgeVariant === "peach"
                              ? colors.peachSubtle
                              : colors.surfaceSubtle,
                          color:
                            item.badgeVariant === "emerald"
                              ? colors.emeraldDark
                              : item.badgeVariant === "peach"
                              ? colors.peachText
                              : colors.indigoAccent,
                          border: `1px solid ${
                            item.badgeVariant === "emerald"
                              ? colors.emeraldBorder
                              : item.badgeVariant === "peach"
                              ? colors.peachBorder
                              : colors.border
                          }`,
                        }}
                      >
                        {item.badge}
                      </span>
                    )}

                    {isSelected && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontFamily: typography.fontMono,
                          color: colors.indigoAccent,
                          backgroundColor: "#ffffff",
                          border: `1px solid ${colors.indigoBorder}`,
                          padding: "0.15rem 0.4rem",
                          borderRadius: radii.sm,
                          fontWeight: 600,
                        }}
                      >
                        ↵ Enter
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div
          style={{
            padding: "0.6rem 1.25rem",
            backgroundColor: colors.surfaceSubtle,
            borderTop: `1px solid ${colors.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "11px",
            color: colors.textMuted,
          }}
        >
          <div style={{ display: "flex", gap: "1rem" }}>
            <span>
              <strong style={{ color: colors.textSecondary }}>↑ ↓</strong> to navigate
            </span>
            <span>
              <strong style={{ color: colors.textSecondary }}>↵ Enter</strong> to select
            </span>
            <span>
              <strong style={{ color: colors.textSecondary }}>esc</strong> to dismiss
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span>Speed:</span>
            <span style={{ color: colors.emeraldDark, fontWeight: 600 }}>Linear sub-10ms</span>
          </div>
        </div>

      </div>
    </div>
  );
};
