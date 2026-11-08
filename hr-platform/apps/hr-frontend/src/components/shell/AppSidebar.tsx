import React, { useState, useEffect } from "react";
import { colors, typography, radii } from "../../design-system/tokens";
import { Icons } from "../../design-system/Icons";
import { UserAvatar } from "../common/UserAvatar";
import { isViewEnabled } from "../../config/modules";

export type ModuleViewKey =
  | "self_service"
  | "command_centre"
  | "reports_analytics"
  | "employee_settings"
  | "workforce_directory"
  | "dashboard"
  | "assets"
  | "performance_pms"
  | "performance_setup"
  | "company_setup"
  | "objectives"
  | "my_profile"
  | "payslips"
  | "document_centre"
  | "my_performance"
  | "skills_marketplace"
  | "admin_nerve_center"
  | "lifecycle_portals"
  | "asset_management"
  | "time_and_leave"
  | "helpdesk"
  | "projects"
  | "governance_import"
  | "approval_workflows"
  | "disciplinary"
  | "policies_handbook"
  | "organogram";

export type UserPersona = "hr_director" | "hr_admin" | "line_manager" | "employee";

interface AppSidebarProps {
  currentView: ModuleViewKey;
  onSelectView: (view: ModuleViewKey) => void;
  persona: UserPersona;
  onSelectPersona: (p: UserPersona) => void;
  onOpenOmniAgent: () => void;
  currentUser?: { name: string; email: string; avatarText: string } | null;
  photoUrl?: string | null;
  onSignOut?: () => void;
  counts: {
    employees: number;
    cycles: number;
    assets: number;
    leaves: number;
    tickets: number;
    projects: number;
  };
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentView,
  onSelectView,
  persona,
  onSelectPersona,
  onOpenOmniAgent,
  currentUser,
  photoUrl,
  onSignOut,
  counts,
}) => {
  // By default, sidebar is auto-hide (unpinned). Users can pin to stop auto-hide.
  const [isPinned, setIsPinned] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("scoreview_sidebar_pinned");
        return stored === "true";
      } catch (e) { }
    }
    return false; // Auto-hide by default!
  });

  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // When pinned, effective collapsed state is controlled by manual toggle (default open)
  // When NOT pinned (auto-hide by default), effective collapsed is !isSidebarHovered!
  const isEffectiveCollapsed = isPinned ? collapsed : !isSidebarHovered;

  const togglePin = (pinnedState?: boolean) => {
    setIsPinned((prev) => {
      const next = pinnedState !== undefined ? pinnedState : !prev;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("scoreview_sidebar_pinned", next ? "true" : "false");
        } catch (e) { }
      }
      if (next) {
        setCollapsed(false);
      }
      return next;
    });
  };

  // Shortcut ⌘[ or Ctrl+[ to toggle sidebar collapse / pin
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "[") {
        e.preventDefault();
        if (!isPinned) {
          togglePin(true);
        } else {
          setCollapsed((prev) => !prev);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPinned]);

  const personaLabels: Record<UserPersona, { title: string; badge: string }> = {
    hr_director: { title: "HR Director", badge: "Executive" },
    hr_admin: { title: "HR Administrator", badge: "Operations" },
    line_manager: { title: "Line Manager", badge: "People Lead" },
    employee: { title: "Employee (ESS)", badge: "Self-Service" },
  };

  const navSections = [
    {
      group: "MY WORKSPACE",
      items: [
        {
          key: "self_service" as ModuleViewKey,
          label: "My Self-Service",
          icon: Icons.Users,
          badge: "ESS",
          badgeType: "peach" as const,
        },
        { key: "my_profile" as ModuleViewKey, label: "Bank & Tax Details", icon: Icons.Wallet },
        { key: "payslips" as ModuleViewKey, label: "Payslips", icon: Icons.FileText },
        { key: "document_centre" as ModuleViewKey, label: "Document Centre", icon: Icons.BookOpen },
        { key: "my_performance" as ModuleViewKey, label: "My Performance", icon: Icons.Target },
      ],
    },
    {
      group: "WORKFORCE INTELLIGENCE",
      items: [
        { key: "command_centre" as ModuleViewKey, label: "Command Centre", icon: Icons.CommandCentre },
        {
          key: "reports_analytics" as ModuleViewKey,
          label: "Strategic Reports & AI",
          icon: Icons.BarChart,
          badge: "60 Reports",
          badgeType: "indigo" as const,
        },
        {
          key: "workforce_directory" as ModuleViewKey,
          label: "Workforce Directory",
          icon: Icons.Users,
          badge: `${counts.employees}`,
          badgeType: "emerald" as const,
        },
        {
          key: "projects" as ModuleViewKey,
          label: "Client Engagements",
          icon: Icons.Briefcase,
          badge: `${counts.projects}`,
          badgeType: "neutral" as const,
        },
      ],
    },
    {
      group: "TALENT & CAREER",
      items: [
        {
          key: "performance_pms" as ModuleViewKey,
          label: "Appraisals (PMS)",
          icon: Icons.Target,
          badge: `${counts.cycles}`,
          badgeType: "indigo" as const,
        },
        {
          key: "skills_marketplace" as ModuleViewKey,
          label: "Skills & Gig Board",
          icon: Icons.Compass,
          badge: "AI",
          badgeType: "emerald" as const,
        },
      ],
    },
    {
      group: "AUTOMATION & REWARDS",
      items: [
        {
          key: "admin_nerve_center" as ModuleViewKey,
          label: "Nerve Center & Wallet",
          icon: Icons.Wallet,
          badge: "Wallet",
          badgeType: "peach" as const,
        },
        {
          key: "lifecycle_portals" as ModuleViewKey,
          label: "Onboarding & Exit",
          icon: Icons.Plane,
        },
      ],
    },
    {
      group: "TIME & OPERATIONS",
      items: [
        {
          key: "time_and_leave" as ModuleViewKey,
          label: "Leaves & Shifts",
          icon: Icons.Calendar,
          badge: counts.leaves > 0 ? `${counts.leaves}` : undefined,
          badgeType: "peach" as const,
        },
        {
          key: "asset_management" as ModuleViewKey,
          label: "Hardware and Fleet",
          icon: Icons.Laptop,
          badge: `${counts.assets}`,
          badgeType: "neutral" as const,
        },
        {
          key: "helpdesk" as ModuleViewKey,
          label: "IT Helpdesk",
          icon: Icons.LifeBuoy,
          badge: counts.tickets > 0 ? `${counts.tickets}` : undefined,
          badgeType: "emerald" as const,
        },
      ],
    },
    {
      group: "GOVERNANCE & DATA",
      items: [
        {
          key: "employee_settings" as ModuleViewKey,
          label: "Employee Settings",
          icon: Icons.Settings,
          badge: "Config",
          badgeType: "indigo" as const,
        },
        {
          key: "approval_workflows" as ModuleViewKey,
          label: "Approval Workflows",
          icon: Icons.FileCheck,
          badge: "Maker-Checker",
          badgeType: "emerald" as const,
        },
        { key: "company_setup" as ModuleViewKey, label: "Company Setup", icon: Icons.Settings },
        { key: "governance_import" as ModuleViewKey, label: "Data Governance", icon: Icons.ShieldCheck },
        { key: "disciplinary" as ModuleViewKey, label: "Disciplinary Management", icon: Icons.AlertTriangle },
        { key: "policies_handbook" as ModuleViewKey, label: "Policies & Handbooks", icon: Icons.BookOpen },
      ],
    },
  ];

  // Disabled modules are hidden (not removed); groups left empty disappear with them.
  const visibleNavSections = navSections
    .map((section) => ({ ...section, items: section.items.filter((item) => isViewEnabled(item.key)) }))
    .filter((section) => section.items.length > 0);

  return (
    <div
      style={{
        width: isPinned ? (collapsed ? "68px" : "240px") : "68px",
        flexShrink: 0,
        position: "relative",
        transition: "width 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <aside
        onMouseEnter={() => {
          if (!isPinned) setIsSidebarHovered(true);
        }}
        onMouseLeave={() => {
          if (!isPinned) {
            setIsSidebarHovered(false);
            setShowPersonaMenu(false);
          }
        }}
        style={{
          width: isEffectiveCollapsed ? "68px" : "240px",
          backgroundColor: colors.indigoPrimary,
          color: colors.textInverse,
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          height: "100vh",
          position: isPinned ? "sticky" : "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          borderRight: "1px solid rgba(255, 255, 255, 0.08)",
          transition: "width 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease",
          userSelect: "none",
          zIndex: 40,
          boxShadow: (!isPinned && isSidebarHovered)
            ? "0 20px 25px -5px rgba(0, 0, 0, 0.5), 4px 0 16px rgba(0, 0, 0, 0.35)"
            : "none",
        }}
      >
        {/* Brand & Organization Header */}
        <div
          style={{
            padding: isEffectiveCollapsed ? "1rem 0.5rem" : "1.1rem 0.85rem",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: isEffectiveCollapsed ? "center" : "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", overflow: "hidden" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: radii.md,
                backgroundColor: colors.indigoAction,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "13px",
                letterSpacing: "-0.02em",
                color: "#ffffff",
                flexShrink: 0,
                boxShadow: "0 2px 6px rgba(79, 70, 229, 0.35)",
              }}
            >
              SC
            </div>
            {!isEffectiveCollapsed && (
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <span
                  style={{
                    fontSize: typography.sizes.sm,
                    fontWeight: 700,
                    color: "#ffffff",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Senrab ConsulTech
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <span
                    style={{
                      width: "5px",
                      height: "5px",
                      borderRadius: "50%",
                      backgroundColor: colors.emeraldAction,
                    }}
                  />
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#94a3b8",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    Enterprise 45
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Pin / Auto-Hide Mode Toggle Button */}
          {!isEffectiveCollapsed && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <button
                onClick={() => togglePin()}
                title={
                  isPinned
                    ? "Sidebar is Pinned Open. Click to enable Auto-Hide by default."
                    : "Auto-Hide is Active by default. Click to Pin sidebar open."
                }
                style={{
                  background: isPinned ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.08)",
                  border: `1px solid ${isPinned ? colors.emeraldAction : "rgba(255, 255, 255, 0.15)"}`,
                  color: isPinned ? colors.emeraldAction : "#cbd5e1",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: radii.sm,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  fontSize: "10px",
                  fontWeight: 700,
                  transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
                }}
              >
                {isPinned ? <Icons.Pin size={12} color={colors.emeraldAction} /> : <Icons.PinOff size={12} color="#94a3b8" />}
                <span>{isPinned ? "Pinned" : "Auto-Hide"}</span>
              </button>

              {isPinned && (
                <button
                  onClick={() => setCollapsed(!collapsed)}
                  title={collapsed ? "Expand sidebar (⌘[)" : "Collapse sidebar (⌘[)"}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    padding: "4px",
                    borderRadius: radii.sm,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "color 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
                >
                  {collapsed ? <Icons.SidebarExpand size={15} /> : <Icons.SidebarCollapse size={15} />}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Role / Persona Switcher Bar */}
        {!isEffectiveCollapsed && (
          <div style={{ padding: "0.6rem 0.85rem", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", position: "relative" }}>
            <button
              onClick={() => setShowPersonaMenu(!showPersonaMenu)}
              style={{
                width: "100%",
                padding: "0.45rem 0.65rem",
                borderRadius: radii.md,
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                fontSize: "11px",
                textAlign: "left",
              }}
            >
              <div>
                <div style={{ color: "#94a3b8", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Viewing As</div>
                <div style={{ fontWeight: 600, color: "#ffffff", marginTop: "1px" }}>{personaLabels[persona].title}</div>
              </div>
              <Icons.ChevronDown size={14} color="#94a3b8" />
            </button>

            {showPersonaMenu && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: "0.85rem",
                  right: "0.85rem",
                  backgroundColor: colors.indigoDark,
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: radii.md,
                  boxShadow: "0 8px 18px rgba(0,0,0,0.45)",
                  zIndex: 35,
                  marginTop: "4px",
                  overflow: "hidden",
                }}
              >
                {(Object.keys(personaLabels) as UserPersona[]).map((pKey) => (
                  <div
                    key={pKey}
                    onClick={() => {
                      onSelectPersona(pKey);
                      setShowPersonaMenu(false);
                      if (pKey === "employee") onSelectView("self_service");
                      if (pKey === "hr_director") onSelectView("dashboard");
                      if (pKey === "hr_admin") onSelectView("workforce_directory");
                      if (pKey === "line_manager") onSelectView("time_and_leave");
                    }}
                    style={{
                      padding: "0.55rem 0.75rem",
                      cursor: "pointer",
                      fontSize: "11px",
                      color: persona === pKey ? "#ffffff" : "#cbd5e1",
                      backgroundColor: persona === pKey ? colors.indigoAction : "transparent",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                    onMouseEnter={(e) => {
                      if (persona !== pKey) e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
                    }}
                    onMouseLeave={(e) => {
                      if (persona !== pKey) e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <span style={{ fontWeight: persona === pKey ? 600 : 400 }}>{personaLabels[pKey].title}</span>
                    <span style={{ fontSize: "9px", color: persona === pKey ? "#ffffff" : "#94a3b8" }}>{personaLabels[pKey].badge}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Omni-Agent AI Copilot Trigger */}
        <div style={{ padding: isEffectiveCollapsed ? "0.6rem 0.4rem 0" : "0.6rem 0.85rem 0" }}>
          <button
            onClick={onOpenOmniAgent}
            style={{
              width: "100%",
              padding: "0.5rem 0.65rem",
              borderRadius: radii.md,
              background: `linear-gradient(135deg, rgba(79, 70, 229, 0.3) 0%, rgba(147, 51, 234, 0.3) 100%)`,
              border: "1px solid rgba(168, 85, 247, 0.4)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: isEffectiveCollapsed ? "center" : "space-between",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: 600,
              transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
            }}
            title="Open Omni-Agent Copilot (⌘J)"
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(168, 85, 247, 0.8)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(168, 85, 247, 0.4)")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Icons.Sparkles size={14} color="#c084fc" />
              {!collapsed && <span>Omni-Agent AI</span>}
            </div>
            {!isEffectiveCollapsed && (
              <span style={{ fontSize: "10px", padding: "0.1rem 0.35rem", borderRadius: radii.sm, backgroundColor: "rgba(255,255,255,0.15)" }}>
                ⌘J
              </span>
            )}
          </button>
        </div>

        {/* Navigation Sections */}
        <nav style={{ flex: 1, padding: isEffectiveCollapsed ? "0.85rem 0.35rem" : "0.85rem", overflowY: "auto" }}>
          {visibleNavSections.map((section, sIdx) => (
            <div key={sIdx} style={{ marginBottom: "1.15rem" }}>
              {!isEffectiveCollapsed && (
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: "#64748b",
                    padding: "0.25rem 0.5rem 0.35rem",
                    textTransform: "uppercase",
                  }}
                >
                  {section.group}
                </div>
              )}
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {section.items.map((item) => {
                  const isActive = currentView === item.key;
                  const IconComponent = item.icon;
                  const isHovered = hoveredItem === item.key;

                  return (
                    <li key={item.key} style={{ margin: "2px 0", position: "relative" }}>
                      <button
                        onClick={() => {
                          onSelectView(item.key);
                          if (!isPinned) {
                            setIsSidebarHovered(false);
                            setShowPersonaMenu(false);
                          }
                        }}
                        onMouseEnter={() => setHoveredItem(item.key)}
                        onMouseLeave={() => setHoveredItem(null)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.65rem",
                          padding: isEffectiveCollapsed ? "0.65rem 0" : "0.5rem",
                          justifyContent: isEffectiveCollapsed ? "center" : "space-between",
                          backgroundColor: isActive
                            ? "rgba(79, 70, 229, 0.22)"
                            : isHovered
                              ? "rgba(255, 255, 255, 0.05)"
                              : "transparent",
                          border: "none",
                          borderRadius: radii.md,
                          cursor: "pointer",
                          color: isActive ? "#ffffff" : isHovered ? "#f1f5f9" : "#94a3b8",
                          fontWeight: isActive ? 600 : 400,
                          fontSize: typography.sizes.sm,
                          textAlign: "left",
                          transition: "background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease",
                          borderLeft: isActive && !isEffectiveCollapsed ? `3px solid ${colors.indigoAction}` : "3px solid transparent",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                          <IconComponent
                            size={16}
                            color={isActive ? "#818cf8" : isHovered ? "#ffffff" : "#94a3b8"}
                          />
                          {!collapsed && <span>{item.label}</span>}
                        </div>

                        {!collapsed && item.badge && (
                          <span
                            style={{
                              fontSize: "10px",
                              padding: "0.1rem 0.45rem",
                              borderRadius: radii.full,
                              fontWeight: 600,
                              fontVariantNumeric: "tabular-nums",
                              backgroundColor:
                                item.badgeType === "emerald"
                                  ? "rgba(16, 185, 129, 0.2)"
                                  : item.badgeType === "peach"
                                    ? "rgba(249, 115, 22, 0.2)"
                                    : item.badgeType === "indigo"
                                      ? "rgba(99, 102, 241, 0.25)"
                                      : "rgba(255, 255, 255, 0.1)",
                              color:
                                item.badgeType === "emerald"
                                  ? "#6ee7b7"
                                  : item.badgeType === "peach"
                                    ? "#fdba74"
                                    : item.badgeType === "indigo"
                                      ? "#c7d2fe"
                                      : "#cbd5e1",
                              border: `1px solid ${item.badgeType === "emerald"
                                  ? "rgba(16, 185, 129, 0.35)"
                                  : item.badgeType === "peach"
                                    ? "rgba(249, 115, 22, 0.35)"
                                    : item.badgeType === "indigo"
                                      ? "rgba(99, 102, 241, 0.35)"
                                      : "rgba(255, 255, 255, 0.15)"
                                }`,
                            }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>

                      {/* Collapsed Tooltip Flyout */}
                      {isEffectiveCollapsed && isHovered && (
                        <div
                          style={{
                            position: "absolute",
                            left: "72px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            backgroundColor: colors.indigoDark,
                            color: "#ffffff",
                            padding: "0.35rem 0.65rem",
                            borderRadius: radii.md,
                            fontSize: "11px",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            zIndex: 60,
                            pointerEvents: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.4rem",
                          }}
                        >
                          <span>{item.label}</span>
                          {item.badge && (
                            <span
                              style={{
                                fontSize: "9px",
                                padding: "0.05rem 0.3rem",
                                borderRadius: radii.sm,
                                backgroundColor: "rgba(255,255,255,0.2)",
                              }}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User Session Bar */}
        <div
          style={{
            padding: isEffectiveCollapsed ? "0.85rem 0.5rem" : "0.85rem 0.85rem",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: isEffectiveCollapsed ? "center" : "space-between",
            gap: "0.65rem",
            backgroundColor: "rgba(0, 0, 0, 0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", minWidth: 0, flex: 1 }}>
            <UserAvatar name={currentUser?.name || "Paa Kwesi Barnes"} initials={currentUser?.avatarText || "PB"} photoUrl={photoUrl} size={30} />
            {!isEffectiveCollapsed && (
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                <span
                  style={{
                    fontSize: typography.sizes.xs,
                    fontWeight: 600,
                    color: "#ffffff",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {currentUser?.name || "Paa Kwesi Barnes"}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    color: "#94a3b8",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {currentUser?.email || "paa.barnes@bscscoreview.com"}
                </span>
              </div>
            )}
          </div>
          {onSignOut && !isEffectiveCollapsed && (
            <button
              onClick={onSignOut}
              title="Sign Out / Lock Session"
              style={{
                background: "none",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                padding: "0.25rem",
                borderRadius: radii.sm,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
            >
              <Icons.LogOut size={14} />
            </button>
          )}
        </div>
      </aside>
    </div>
  );
};
