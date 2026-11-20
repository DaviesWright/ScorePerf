"use client";

import React, { useState, useEffect } from "react";
import { colors } from "../../design-system/tokens";
import { AppSidebar, ModuleViewKey, UserPersona } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { CommandPalette } from "../../design-system/CommandPalette";
import { DedeWidget } from "../ai/DedeWidget";
import { WorkforceDirectoryView, EmployeeRecord, AssetRecord } from "../modules/WorkforceDirectoryView";
import { PerformanceManagementView, CycleRecord } from "../modules/PerformanceManagementView";
import { SkillsMarketplaceView } from "../modules/SkillsMarketplaceView";
import { AdminNerveCenterView } from "../modules/AdminNerveCenterView";
import { LifecyclePortalView } from "../modules/LifecyclePortalView";
import { AssetManagementView } from "../modules/AssetManagementView";
import { TimeAndLeaveView, LeaveRecord } from "../modules/TimeAndLeaveView";
import { LeaveScreen } from "../modules/LeaveSimple";
import { ObjectivesScreen } from "../modules/ObjectivesSimple";
import { DashboardScreen } from "../modules/DashboardSimple";
import { CommandCentreView } from "../modules/CommandCentreView";
import { TeamDashboardView } from "../modules/TeamDashboardView";
import { AssetsScreen } from "../modules/AssetsSimple";
import { PerformanceSetupScreen } from "../modules/PerformanceSetupScreen";
import { CompanySetupScreen } from "../modules/CompanySetupScreen";
import { EmployeeHomeScreen } from "../modules/EmployeeHomeScreen";
import { ProfileChangesScreen } from "../modules/ProfileChangesScreen";
import { PayslipsScreen } from "../modules/PayslipsScreen";
import { DocumentCentreScreen } from "../modules/DocumentCentreScreen";
import { MyPerformanceScreen } from "../modules/MyPerformanceScreen";
import { MyLeaveScreen } from "../modules/MyLeaveScreen";
import { HelpdeskView, TicketRecord } from "../modules/HelpdeskView";
import { ProjectPortfolioView, ProjectRecord } from "../modules/ProjectPortfolioView";
import { GovernanceView } from "../modules/GovernanceView";
import { EmployeeSelfServiceView } from "../modules/EmployeeSelfServiceView";
import { ReportsAnalyticsView } from "../modules/ReportsAnalyticsView";
import { EmployeeSettingsView } from "../modules/EmployeeSettingsView";
import { CelebrationsView } from "../modules/CelebrationsView";
import { ApprovalWorkflowsView } from "../modules/ApprovalWorkflowsView";
import { DisciplinaryManagementView } from "../modules/DisciplinaryManagementView";
import { PoliciesHandbookView } from "../modules/PoliciesHandbookView";
import { OrganogramView } from "../modules/OrganogramView";
import { DEFAULT_EMPLOYEES, DEMO_ASSETS, DEMO_PROJECTS } from "../../data/demoData";
import { SEEDED_EMPLOYEES, SEEDED_EMPLOYMENT_EDGES, SEEDED_LEAVE_REQUESTS } from "../../data/enterpriseSeedData";
import {
  ArchitecturalRoleCode,
  availableContexts,
  ContextSwitchAuditEntry,
  contextToPersona,
  ExperienceContext,
  switchContext,
  UserContextTuple,
} from "../../domain/orgCore";
import { ContextNotice } from "../common/ContextSwitcher";
import { SHELL_MODE, firstEnabledView, isViewEnabled } from "../../config/modules";
import { PlainShell } from "./PlainShell";
import { clearHeadshot, loadHeadshot, processHeadshot, saveHeadshot } from "../../utils/headshot";
import { PayslipModal } from "../modals/PayslipModal";
import { RbacGuard } from "../common/RbacGuard";
import { LoginPage, AuthenticatedUser, PRESET_USERS } from "../auth/LoginPage";
import { LoginWelcomeModal } from "../auth/LoginWelcomeModal";

interface EnterpriseAppShellProps {
  initialEmployees: EmployeeRecord[];
  initialCycles: CycleRecord[];
  initialAssets: AssetRecord[];
  initialLeaves: LeaveRecord[];
  initialTickets: TicketRecord[];
  initialProjects: ProjectRecord[];
  apiOnline: boolean;
  /** The signed-in user from the API, when the browser has a real session. Absent only in demo-login mode. */
  initialUser?: AuthenticatedUser | null;
  initialExperience?: ExperienceContext;
  initialDeepLinkView?: ModuleViewKey;
}

export const EnterpriseAppShell: React.FC<EnterpriseAppShellProps> = ({
  initialEmployees,
  initialCycles,
  initialAssets,
  initialLeaves,
  initialTickets,
  initialProjects,
  apiOnline,
  initialUser = null,
  initialExperience,
  initialDeepLinkView,
}) => {
  // Employees with a real session land on their home (self_service). Everyone else lands on the dashboard.
  const [currentView, setCurrentViewRaw] = useState<ModuleViewKey>(() =>
    initialUser?.persona === "employee" && isViewEnabled("self_service") ? "self_service" : firstEnabledView(),
  );
  const [viewHistory, setViewHistory] = useState<ModuleViewKey[]>([]);
  const scrollPositionsRef = React.useRef<Record<string, number>>({});

  // Only enabled modules can be opened, from anywhere (sidebar, palette, links, quick actions). See src/config/modules.ts.
  const setCurrentView = (requested: ModuleViewKey) => {
    if (!isViewEnabled(requested) || requested === currentView) return;
    if (typeof window !== "undefined") {
      scrollPositionsRef.current[currentView] = window.scrollY;
    }
    setViewHistory((prev) => [...prev.slice(-19), currentView]);
    setCurrentViewRaw(requested);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  };

  const handleGoBack = () => {
    if (viewHistory.length === 0) return;
    const prevView = viewHistory[viewHistory.length - 1];
    setViewHistory((prev) => prev.slice(0, -1));
    setCurrentViewRaw(prevView);
    const savedY = scrollPositionsRef.current[prevView] ?? 0;
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => window.scrollTo({ top: savedY, behavior: "instant" as ScrollBehavior }));
    }
  };
  const [persona, setPersona] = useState<UserPersona>(initialUser?.persona ?? "hr_director");

  const [employees, setEmployees] = useState<EmployeeRecord[]>(() => {
    const source = initialEmployees.length > 0 || initialUser ? initialEmployees : DEFAULT_EMPLOYEES;
    return source.map((emp) => {
      if (emp.team_name) return emp;
      const dept = emp.department_name || "";
      let team = "General Workforce Squad";
      if (dept.includes("Engineering") || dept.includes("Cloud")) team = "Hyperdrive Edge Performance Squad";
      else if (dept.includes("People") || dept.includes("Culture") || dept.includes("HR")) team = "West Africa Talent Onboarding Taskforce";
      else if (dept.includes("Executive") || dept.includes("Leadership")) team = "Executive Committee";
      else if (dept.includes("Advisory")) team = "Solutions Delivery Squad";
      else if (dept.includes("Customer") || dept.includes("Client")) team = "Customer Success & Service Quality Guild";
      else if (dept.includes("Security") || dept.includes("Governance")) team = "Corporate Information Security Committee";
      else if (dept.includes("Finance")) team = "Corporate Governance & Audit Committee";
      else if (dept.includes("Operations") || dept.includes("Healthcare")) team = "Workforce Logistics & Facilities Squad";
      return { ...emp, team_name: team };
    });
  });
  const [cycles, setCycles] = useState<CycleRecord[]>(initialCycles);
  // The API sends nothing until the frontend has a login, so the demo registry stands in.
  const [assets, setAssets] = useState<AssetRecord[]>(initialAssets.length > 0 || initialUser ? initialAssets : DEMO_ASSETS);
  const [leaves, setLeaves] = useState<LeaveRecord[]>(() => {
    if (initialLeaves.length >= 50 || initialUser) return initialLeaves;
    return SEEDED_LEAVE_REQUESTS.map((r) => ({
      id: r.id,
      first_name: r.firstName,
      last_name: r.lastName,
      staff_id: r.staffId,
      department: r.department,
      leave_type_name: r.leaveType,
      start_date: r.startDate,
      end_date: r.endDate,
      requested_days: String(r.requestedDays),
      status: r.status,
      reason: r.reason,
      approver: r.approverName,
    }));
  });
  const [tickets, setTickets] = useState<TicketRecord[]>(initialTickets);
  const [projects] = useState<ProjectRecord[]>(initialProjects.length > 0 || initialUser ? initialProjects : DEMO_PROJECTS);

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const [selectedDirectoryEmployee, setSelectedDirectoryEmployee] = useState<EmployeeRecord | null>(null);
  const [showLeaveModalDirectly, setShowLeaveModalDirectly] = useState(false);
  const [leaveSubTab, setLeaveSubTab] = useState<string | undefined>(undefined);
  const [contextNotice, setContextNotice] = useState<string | null>(null);
  const [contextAuditLog, setContextAuditLog] = useState<ContextSwitchAuditEntry[]>([]);
  const [activeContextId, setActiveContextId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem("scoreview_last_context_id");
    } catch {
      return null;
    }
  });

  // Authentication & Session State
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(initialUser);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Restore the session. A real session comes from the server (initialUser); the localStorage path is demo mode only.
  useEffect(() => {
    if (initialUser) {
      setPhotoUrl(loadHeadshot(initialUser.id));
      try {
        // Set by /login/verify right after a fresh sign-in, so the welcome brief shows once.
        if (sessionStorage.getItem("scoreview_show_welcome") === "1") {
          sessionStorage.removeItem("scoreview_show_welcome");
          setIsWelcomeModalOpen(true);
        }
      } catch { }
      setHasCheckedAuth(true);
      return;
    }
    try {
      const stored = localStorage.getItem("scoreview_session");
      if (stored) {
        const parsed = JSON.parse(stored) as AuthenticatedUser;
        setCurrentUser(parsed);
        setPersona(parsed.persona);
        setPhotoUrl(loadHeadshot(parsed.id));
      }
    } catch (e) {
      console.warn("Session restore failed:", e);
    } finally {
      setHasCheckedAuth(true);
    }
  }, []);

  const handleSelectPersona = (newPersona: UserPersona) => {
    setPersona(newPersona);
    setCurrentUser((prev) => {
      if (!prev) return prev;
      const roleMap: Record<UserPersona, string> = {
        employee: "Employee (Self-Service)",
        line_manager: "Team Lead / Supervisor",
        hr_admin: "HR Administrator",
        hr_director: "Managing Principal",
      };
      const updated = {
        ...prev,
        persona: newPersona,
        role: roleMap[newPersona] || prev.role,
      };
      try {
        localStorage.setItem("scoreview_session", JSON.stringify(updated));
      } catch { }
      return updated;
    });

    if (
      newPersona === "employee" &&
      (currentView === "company_setup" ||
        currentView === "performance_setup" ||
        currentView === "admin_nerve_center" ||
        currentView === "approval_workflows" ||
        currentView === "workforce_directory" ||
        currentView === "command_centre" ||
        currentView === "dashboard" ||
        currentView === "performance_pms" ||
        currentView === "time_and_leave" ||
        currentView === "objectives" ||
        currentView === "reports_analytics")
    ) {
      setCurrentView("self_service");
    }
  };

  // Compute available contexts for the signed-in user (FR-CTX-001..004)
  const userContexts: UserContextTuple[] = React.useMemo(() => {
    const matchedSeed = currentUser
      ? SEEDED_EMPLOYEES.find(
        (e) =>
          e.email.toLowerCase() === currentUser.email.toLowerCase() ||
          e.staffId === currentUser.id,
      )
      : undefined;

    // Base held roles come from the user's record (or demo login role), NOT the currently active persona,
    // so switching to ESS does not drop MSS/HRMS from the ContextSwitcher.
    const demoBasePersona = initialUser?.persona ?? "hr_director";
    const roles: ArchitecturalRoleCode[] = matchedSeed
      ? matchedSeed.architecturalRoles ?? [matchedSeed.architecturalRole]
      : demoBasePersona === "employee"
        ? ["EMPLOYEE"]
        : demoBasePersona === "line_manager"
          ? ["DEPARTMENT_HEAD"]
          : ["SUPER_ADMIN", "HR_MANAGER"];

    return availableContexts({
      employeeId: String(matchedSeed?.id ?? "EMP-PKB-001"),
      roles,
      departmentName: matchedSeed?.departmentName ?? currentUser?.department ?? "Platform & Edge Engineering",
      assignedHrUnits: matchedSeed?.assignedHrUnits,
      edges: matchedSeed ? SEEDED_EMPLOYMENT_EDGES : undefined,
    });
  }, [currentUser, initialUser]);

  // FR-CTX-014 / VAL-CTX-007: Enforce deep-link experience (/ess, /mss, /hrms)
  useEffect(() => {
    if (!initialExperience || !hasCheckedAuth) return;
    const targetCtx = userContexts.find((c) => c.experience === initialExperience);
    if (!targetCtx) {
      const ess = userContexts[0];
      setActiveContextId(ess.contextId);
      setPersona("employee");
      setCurrentView("self_service");
      setContextNotice(
        `Access denied (403): You do not hold the ${initialExperience} context. Redirected to My Work (ESS).`,
      );
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", "/ess");
      }
      return;
    }
    setActiveContextId(targetCtx.contextId);
    const nextPersona = contextToPersona(targetCtx.experience, targetCtx.role);
    setPersona(nextPersona);
    if (initialDeepLinkView && isViewEnabled(initialDeepLinkView)) {
      setCurrentViewRaw(initialDeepLinkView);
    } else if (targetCtx.experience === "ESS") {
      setCurrentViewRaw("self_service");
    } else {
      setCurrentViewRaw("command_centre");
    }
  }, [initialExperience, initialDeepLinkView, hasCheckedAuth, userContexts]);

  const activeContext: UserContextTuple = React.useMemo(() => {
    if (activeContextId) {
      const found = userContexts.find((c) => c.contextId === activeContextId);
      if (found) return found;
    }
    const desiredExp = persona === "employee" ? "ESS" : persona === "line_manager" ? "MSS" : "HRMS";
    return userContexts.find((c) => c.experience === desiredExp) ?? userContexts[0];
  }, [activeContextId, userContexts, persona]);

  const handleSelectContext = (requestedContextId: string) => {
    const result = switchContext({
      available: userContexts,
      requestedContextId,
      userId: currentUser?.id ?? "EMP-PKB-001",
      employeeId: currentUser?.id ?? "EMP-PKB-001",
      fromContext: activeContext.experience,
    });
    if (!result.ok) {
      setContextNotice("That context is no longer available. You've been returned to My Work.");
      const ess = userContexts[0];
      setActiveContextId(ess.contextId);
      handleSelectPersona("employee");
      setCurrentView("self_service");
      return;
    }
    setContextAuditLog((prev) => [result.audit, ...prev.slice(0, 49)]);
    setActiveContextId(result.context.contextId);
    try {
      localStorage.setItem("scoreview_last_context_id", result.context.contextId);
    } catch { }
    const nextPersona = contextToPersona(result.context.experience, result.context.role);
    handleSelectPersona(nextPersona);
    if (result.context.experience === "ESS") {
      setCurrentView("self_service");
    } else {
      setCurrentView("command_centre");
    }

    // Server-side context token issuance & scope verification (FR-CTX-007, FR-CTX-008)
    void fetch("/api/context/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contextId: requestedContextId,
        employeeId: currentUser?.email ?? currentUser?.id ?? "1",
        userId: currentUser?.id ?? "1",
        fromContext: activeContext.experience,
      }),
    })
      .then(async (res) => {
        if (res.status === 403) {
          setContextNotice("Your selected context is no longer authorized. You've been returned to My Work.");
          const ess = userContexts[0];
          setActiveContextId(ess.contextId);
          handleSelectPersona("employee");
          setCurrentView("self_service");
        }
      })
      .catch(() => {
        // Offline / static fallback preserves local domain switch
      });
  };

  const handleLoginSuccess = (user: AuthenticatedUser) => {
    setCurrentUser(user);
    setPersona(user.persona);
    setPhotoUrl(loadHeadshot(user.id));
    try {
      localStorage.setItem("scoreview_session", JSON.stringify(user));
    } catch { }
    setIsWelcomeModalOpen(true);
  };

  // Resolves to an error message for the upload button to show, or null when the photo was saved.
  const handleUploadPhoto = async (file: File): Promise<string | null> => {
    if (!currentUser) return "Sign in first.";
    try {
      const dataUrl = await processHeadshot(file);
      if (!saveHeadshot(currentUser.id, dataUrl)) return "This browser has no room to keep the photo.";
      setPhotoUrl(dataUrl);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "The photo could not be uploaded.";
    }
  };

  const handleRemovePhoto = () => {
    if (currentUser) clearHeadshot(currentUser.id);
    setPhotoUrl(null);
  };

  const handleSignOut = async () => {
    if (initialUser) {
      // Real session: clear the httpOnly cookie on the server, then go to the sign-in screen.
      try {
        await fetch("/api/session", { method: "DELETE" });
      } catch { }
      window.location.assign("/login");
      return;
    }
    try {
      localStorage.removeItem("scoreview_session");
    } catch { }
    setCurrentUser(null);
    setPhotoUrl(null);
    setIsWelcomeModalOpen(false);
  };

  // Keyboard shortcut listener: ⌘J / Ctrl+J for Dede AI
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        window.dispatchEvent(new Event("dede:open"));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getBreadcrumb = () => {
    switch (currentView) {
      case "self_service":
        return "Employee Self-Service";
      case "command_centre":
        return "Workforce Intelligence";
      case "reports_analytics":
        return "Strategic Reports & AI Builder (60 Catalog)";
      case "employee_settings":
        return "Employee Settings & Policy Governance (13 Modules)";
      case "workforce_directory":
        return "Employee Directory";
      case "performance_pms":
        return "Appraisal Oversight";
      case "performance_setup":
        return "Performance Setup: Strategy & Reporting Lines";
      case "company_setup":
        return "Company Setup: Offices, Approval Levels & Integrations";
      case "my_profile":
        return "Bank & Tax Details: Changes Need HR Approval";
      case "payslips":
        return "Payslips";
      case "document_centre":
        return "Document Centre: Policies and Acknowledgments";
      case "my_performance":
        return "My Performance (read only)";
      case "objectives":
        return "Objectives";
      case "dashboard":
        return "ScoReview Console";
      case "assets":
        return "Assets";
      case "skills_marketplace":
        return "Skills & Talent Marketplace";
      case "admin_nerve_center":
        return "Nerve Center & Total Rewards";
      case "lifecycle_portals":
        return "Onboarding & Offboarding Portals";
      case "asset_management":
        return "Hardware and Fleet";
      case "time_and_leave":
        return "Leaves & Shifts";
      case "helpdesk":
        return "Service Desk";
      case "projects":
        return "Client Engagements";
      case "governance_import":
        return "Data Governance";
      case "approval_workflows":
        return "Approval Workflows & Maker-Checker Engine";
      case "disciplinary":
        return "Disciplinary Management & Case Reviews";
      case "policies_handbook":
        return "Policies & Handbooks";
      case "organogram":
        return "Organogram";
      case "my_leave":
        return "My Leave Portal";
      case "celebrations":
        return "Celebrations & Milestones";
      case "team_celebrations":
        return "Team Celebrations";
      default:
        return "Workforce Intelligence";
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "new_employee":
        setCurrentView("workforce_directory");
        break;
      case "new_cycle":
        setCurrentView("performance_pms");
        break;
      case "allocate_asset":
        setCurrentView("asset_management");
        break;
      case "request_leave":
        if (persona === "employee") {
          setCurrentView("my_leave");
          break;
        }
        if (!isViewEnabled("time_and_leave")) break;
        setShowLeaveModalDirectly(true);
        setCurrentView("time_and_leave");
        break;
      case "new_ticket":
        setCurrentView("helpdesk");
        break;
    }
  };



  if (!hasCheckedAuth) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.bgApp,
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "8px",
              backgroundColor: colors.indigoPrimary,
              color: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "16px",
              marginBottom: "0.75rem",
              boxShadow: "0 2px 4px rgba(30, 27, 75, 0.2)",
            }}
          >
            SR
          </div>
          <div style={{ fontSize: "13px", fontWeight: 600, color: colors.textPrimary }}>
            ScoReview HR
          </div>
          <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "0.25rem" }}>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Staging environment (staging.bscscoreview.com) uses the dark teal rail ("plain");
  // Production (hr.bscscoreview.com) maintains its original full colors ("full").
  const isStaging = typeof window !== "undefined" && window.location.hostname.includes("staging");
  const effectiveShellMode = isStaging ? "plain" : (SHELL_MODE === "plain" && !isStaging ? "full" : SHELL_MODE);

  const formatCrumb = (v: ModuleViewKey) =>
    v
      .replace(/_/g, " ")
      .replace(/\b\w/g, (ch) => ch.toUpperCase());

  // The module screen itself, shared by both frames.
  const viewContent = (
    <>
      {viewHistory.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.65rem",
            padding: "0.55rem 1.5rem",
            backgroundColor: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            fontSize: "12px",
          }}
        >
          <button
            type="button"
            onClick={handleGoBack}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              padding: "0.25rem 0.65rem",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              color: "#1e293b",
              fontWeight: 700,
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            ← Back
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#64748b", flexWrap: "wrap" }}>
            {viewHistory.slice(-3).map((v, idx) => (
              <React.Fragment key={`${v}-${idx}`}>
                <button
                  type="button"
                  onClick={() => {
                    const targetIdx = viewHistory.length - Math.min(3, viewHistory.length) + idx;
                    const target = viewHistory[targetIdx];
                    setViewHistory((prev) => prev.slice(0, targetIdx));
                    setCurrentViewRaw(target);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "#4f46e5",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  {formatCrumb(v)}
                </button>
                <span>/</span>
              </React.Fragment>
            ))}
            <span style={{ color: "#0f172a", fontWeight: 700 }}>{formatCrumb(currentView)}</span>
          </div>
        </nav>
      )}
      {!isViewEnabled(currentView) && (
        <div role="alert" style={{ padding: "2rem" }}>
          This module is not enabled for this deployment.
        </div>
      )}
      {currentView === "self_service" && initialUser && <EmployeeHomeScreen onNavigate={setCurrentView} />}
      {currentView === "self_service" && !initialUser && (
        <EmployeeSelfServiceView
          currentEmployee={{
            id: 1,
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role,
            department: currentUser.department,
            manager: "Board of Directors",
            annualLeaveTotal: 25,
            annualLeaveUsed: 7,
          }}
          assignedAsset={assets.find((a) => a.employee_id === 1) || assets[0]}
          personalLeaves={leaves.filter((l) => l.first_name === "Paa" || l.id % 2 === 0).slice(0, 3)}
          onRequestLeave={() => {
            if (persona === "employee") {
              setCurrentView("my_leave");
            } else {
              setShowLeaveModalDirectly(true);
              setCurrentView("time_and_leave");
            }
          }}
          onReportIssue={() => setCurrentView("helpdesk")}
          onOpenPayslip={() => setIsPayslipModalOpen(true)}
          onNavigate={setCurrentView}
        />
      )}

      {currentView === "reports_analytics" && (
        <ReportsAnalyticsView persona={persona} />
      )}

      {currentView === "workforce_directory" && (
        persona === "employee" ? (
          <RbacGuard
            currentPersona={persona}
            targetView="workforce_directory"
            requiredScope="employees:read"
            onNavigate={setCurrentView}
            onSwitchPersona={setPersona}
          />
        ) : (
          <WorkforceDirectoryView
            employees={employees}
            assets={assets}
            selectedInitialEmployee={selectedDirectoryEmployee}
            onEmployeeCreated={(newEmp) => setEmployees((prev) => [newEmp, ...prev])}
            onNavigateToSettings={() => setCurrentView("employee_settings")}
            onNavigateToWorkflows={() => setCurrentView("approval_workflows")}
          />
        )
      )}

      {currentView === "performance_pms" && (
        persona === "employee" ? (
          <RbacGuard
            currentPersona={persona}
            targetView="performance_pms"
            requiredScope="appraisals:evaluate"
            onNavigate={setCurrentView}
            onSwitchPersona={setPersona}
          />
        ) : (
          <PerformanceManagementView
            cycles={cycles}
            onCycleCreated={(newCycle) => setCycles((prev) => [newCycle, ...prev])}
          />
        )
      )}

      {currentView === "skills_marketplace" && (
        <SkillsMarketplaceView />
      )}

      {currentView === "admin_nerve_center" && (
        persona === "employee" || persona === "line_manager" ? (
          <RbacGuard
            currentPersona={persona}
            targetView="admin_nerve_center"
            requiredScope="payroll:read"
            onNavigate={setCurrentView}
            onSwitchPersona={setPersona}
          />
        ) : (
          <AdminNerveCenterView />
        )
      )}

      {currentView === "lifecycle_portals" && (
        persona === "employee" ? (
          <RbacGuard
            currentPersona={persona}
            targetView="lifecycle_portals"
            requiredScope="workforce:lifecycle"
            onNavigate={setCurrentView}
            onSwitchPersona={setPersona}
          />
        ) : (
          <LifecyclePortalView />
        )
      )}

      {currentView === "asset_management" && (
        persona === "employee" ? (
          <RbacGuard
            currentPersona={persona}
            targetView="asset_management"
            requiredScope="assets:write"
            onNavigate={setCurrentView}
            onSwitchPersona={setPersona}
          />
        ) : (
          <AssetManagementView assets={assets} employees={employees} />
        )
      )}

      {(currentView === "command_centre" || currentView === "dashboard") && (
        persona === "employee" ? (
          <RbacGuard
            currentPersona={persona}
            targetView="command_centre"
            requiredScope="analytics:view"
            onNavigate={setCurrentView}
            onSwitchPersona={setPersona}
          />
        ) : activeContext.experience === "MSS" ? (
          <TeamDashboardView
            activeContext={activeContext}
            managerEmployeeId={activeContext.scopeId ?? "1"}
            onNavigate={setCurrentView}
          />
        ) : (
          <CommandCentreView
            employees={employees}
            assets={assets}
            cycles={cycles}
            stats={{
              totalEmployees: employees.length,
              activeCycles: cycles.length,
              totalAssets: assets.length,
              pendingLeaves: leaves.filter((l) => l.status === "PENDING").length,
              openTickets: tickets.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length,
              activeProjects: projects.length,
            }}
            onNavigate={setCurrentView}
          />
        )
      )}

      {currentView === "assets" && <AssetsScreen user={currentUser} realSession={!!initialUser} />}

      {currentView === "performance_setup" && (
        persona === "employee" || persona === "line_manager" ? (
          <RbacGuard
            currentPersona={persona}
            targetView="performance_setup"
            requiredScope="cycles:manage"
            onNavigate={setCurrentView}
            onSwitchPersona={setPersona}
          />
        ) : (
          <PerformanceSetupScreen user={currentUser} realSession={!!initialUser} />
        )
      )}

      {currentView === "company_setup" && (
        persona === "employee" || persona === "line_manager" ? (
          <RbacGuard
            currentPersona={persona}
            targetView="company_setup"
            requiredScope="roles:manage"
            onNavigate={setCurrentView}
            onSwitchPersona={setPersona}
          />
        ) : (
          <CompanySetupScreen user={currentUser} realSession={!!initialUser} />
        )
      )}

      {currentView === "my_profile" && <ProfileChangesScreen user={currentUser} realSession={!!initialUser} />}
      {currentView === "payslips" && <PayslipsScreen user={currentUser} realSession={!!initialUser} />}
      {currentView === "document_centre" && (
        <DocumentCentreScreen
          user={currentUser}
          realSession={!!initialUser}
          onNavigateToPolicies={() => setCurrentView("policies_handbook")}
        />
      )}
      {currentView === "my_performance" && <MyPerformanceScreen user={currentUser} realSession={!!initialUser} />}
      {currentView === "my_leave" && (
        <MyLeaveScreen user={currentUser} realSession={!!initialUser} initialSubTab={leaveSubTab} />
      )}
      {currentView === "celebrations" && <CelebrationsView mode="ess" />}
      {currentView === "team_celebrations" && <CelebrationsView mode="mss" />}

      {currentView === "objectives" && (
        persona === "employee" ? (
          <RbacGuard
            currentPersona={persona}
            targetView="objectives"
            requiredScope="objectives:corporate"
            onNavigate={setCurrentView}
            onSwitchPersona={setPersona}
          />
        ) : (
          <ObjectivesScreen user={currentUser} realSession={!!initialUser} />
        )
      )}

      {currentView === "time_and_leave" && (
        persona === "employee" ? (
          <RbacGuard
            currentPersona={persona}
            targetView="time_and_leave"
            requiredScope="leaves:approve"
            onNavigate={setCurrentView}
            onSwitchPersona={setPersona}
          />
        ) : (
          <TimeAndLeaveView
            initialLeaves={leaves}
            showNewLeaveModal={showLeaveModalDirectly}
            onCloseNewLeaveModal={() => setShowLeaveModalDirectly(false)}
            onNavigateToWorkflows={() => setCurrentView("approval_workflows")}
            userName={currentUser.name}
            userRole={currentUser.role}
          />
        )
      )}

      {currentView === "helpdesk" && (
        <HelpdeskView initialTickets={tickets} />
      )}

      {currentView === "projects" && (
        <ProjectPortfolioView initialProjects={projects} />
      )}

      {currentView === "employee_settings" && (
        persona === "employee" ? (
          <RbacGuard
            currentPersona={persona}
            targetView="employee_settings"
            requiredScope="settings:write"
            onNavigate={setCurrentView}
            onSwitchPersona={setPersona}
          />
        ) : (
          <EmployeeSettingsView />
        )
      )}

      {currentView === "governance_import" && (
        persona === "employee" ? (
          <RbacGuard
            currentPersona={persona}
            targetView="governance_import"
            requiredScope="compliance:audit"
            onNavigate={setCurrentView}
            onSwitchPersona={setPersona}
          />
        ) : (
          <GovernanceView />
        )
      )}

      {currentView === "approval_workflows" && (
        persona === "employee" ? (
          <RbacGuard
            currentPersona={persona}
            targetView="approval_workflows"
            requiredScope="settings:write"
            onNavigate={setCurrentView}
            onSwitchPersona={setPersona}
          />
        ) : (
          <ApprovalWorkflowsView onNavigateToView={(view) => setCurrentView(view as ModuleViewKey)} />
        )
      )}

      {currentView === "disciplinary" && (
        persona === "employee" ? (
          <RbacGuard
            currentPersona={persona}
            targetView="disciplinary"
            requiredScope="compliance:audit"
            onNavigate={setCurrentView}
            onSwitchPersona={setPersona}
          />
        ) : (
          <DisciplinaryManagementView />
        )
      )}

      {currentView === "policies_handbook" && (
        <PoliciesHandbookView isHr={persona === "hr_admin" || persona === "hr_director"} />
      )}
      {currentView === "organogram" && <OrganogramView />}
    </>
  );

  if (effectiveShellMode === "plain") {
    return (
      <>
        <PlainShell
          user={currentUser}
          persona={persona}
          onSelectPersona={handleSelectPersona}
          availableContexts={userContexts}
          activeContext={activeContext}
          onSelectContext={handleSelectContext}
          contextNotice={contextNotice}
          onDismissContextNotice={() => setContextNotice(null)}
          pendingApprovalsCount={leaves.filter((l) => l.status === "PENDING").length}
          showName={!!initialUser}
          currentView={currentView}
          onNavigate={(v, sub) => {
            setLeaveSubTab(sub);
            setCurrentView(v);
          }}
          onSignOut={handleSignOut}
          onOpenDede={() => window.dispatchEvent(new Event("dede:open"))}
          onOpenSearch={() => setIsCommandPaletteOpen(true)}
        >
          {viewContent}
        </PlainShell>
        <DedeWidget />
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onSelectView={setCurrentView}
          employees={employees}
          onSelectEmployee={(emp) => setSelectedDirectoryEmployee(emp)}
          onOpenPayslip={() => setIsPayslipModalOpen(true)}
          onOpenDede={() => window.dispatchEvent(new Event("dede:open"))}
          onQuickAction={handleQuickAction}
        />
      </>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: colors.bgApp,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Post-Login Welcome Briefing Modal */}
      <LoginWelcomeModal
        isOpen={isWelcomeModalOpen}
        onClose={() => setIsWelcomeModalOpen(false)}
        user={currentUser}
        photoUrl={photoUrl}
        onUploadPhoto={handleUploadPhoto}
        onNavigate={setCurrentView}
        onOpenOmniAgent={() => window.dispatchEvent(new Event("dede:open"))}
        onStartFollowPrompt={() => window.dispatchEvent(new Event("dede:open"))}
      />

      {/* Interactive Official Payslip Modal (Triggered via Cmd+K 'Payslip', ESS or Header) */}
      <PayslipModal
        isOpen={isPayslipModalOpen}
        onClose={() => setIsPayslipModalOpen(false)}
        employeeName={currentUser.name}
        employeeRole={currentUser.role}
      />

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectView={setCurrentView}
        employees={employees}
        onSelectEmployee={(emp) => setSelectedDirectoryEmployee(emp)}
        onOpenPayslip={() => setIsPayslipModalOpen(true)}
        onOpenOmniAgent={() => window.dispatchEvent(new Event("dede:open"))}
        onOpenDede={() => window.dispatchEvent(new Event("dede:open"))}
        onQuickAction={handleQuickAction}
      />

      {/* Collapsible Left Navigation Sidebar with Persona Switcher */}
      <AppSidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        persona={persona}
        onSelectPersona={handleSelectPersona}
        onOpenDede={() => window.dispatchEvent(new Event("dede:open"))}
        onOpenOmniAgent={() => window.dispatchEvent(new Event("dede:open"))}
        currentUser={currentUser}
        photoUrl={photoUrl}
        onSignOut={handleSignOut}
        counts={{
          employees: employees.length,
          cycles: cycles.length,
          assets: assets.length,
          leaves: leaves.filter((l) => l.status === "PENDING").length,
          tickets: tickets.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length,
          projects: projects.length,
        }}
      />

      {/* Main App Canvas */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflowY: "auto" }}>
        <AppHeader
          breadcrumb={getBreadcrumb()}
          apiOnline={apiOnline}
          persona={persona}
          onSelectPersona={handleSelectPersona}
          availableContexts={userContexts}
          activeContext={activeContext}
          onSelectContext={handleSelectContext}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenOmniAgent={() => window.dispatchEvent(new Event("dede:open"))}
          onQuickAction={handleQuickAction}
          onOpenPayslip={() => setIsPayslipModalOpen(true)}
          user={currentUser}
          photoUrl={photoUrl}
          onUploadPhoto={handleUploadPhoto}
          onRemovePhoto={handleRemovePhoto}
          onNavigate={setCurrentView}
          onSignOut={handleSignOut}
        />

        <main style={{ flex: 1 }}>
          {contextNotice && (
            <ContextNotice message={contextNotice} onDismiss={() => setContextNotice(null)} />
          )}
          {viewContent}
        </main>
      </div>

      {/* Floating Dede AI Assistant Launcher & Chat Panel */}
      <DedeWidget />
    </div>
  );
};
