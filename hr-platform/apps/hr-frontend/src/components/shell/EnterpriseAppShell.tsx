"use client";

import React, { useState, useEffect } from "react";
import { colors } from "../../design-system/tokens";
import { AppSidebar, ModuleViewKey, UserPersona } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { CommandPalette } from "../../design-system/CommandPalette";
import { OmniAgentDrawer } from "../ai/OmniAgentDrawer";
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
import { AssetsScreen } from "../modules/AssetsSimple";
import { PerformanceSetupScreen } from "../modules/PerformanceSetupScreen";
import { CompanySetupScreen } from "../modules/CompanySetupScreen";
import { EmployeeHomeScreen } from "../modules/EmployeeHomeScreen";
import { ProfileChangesScreen } from "../modules/ProfileChangesScreen";
import { PayslipsScreen } from "../modules/PayslipsScreen";
import { DocumentCentreScreen } from "../modules/DocumentCentreScreen";
import { MyPerformanceScreen } from "../modules/MyPerformanceScreen";
import { HelpdeskView, TicketRecord } from "../modules/HelpdeskView";
import { ProjectPortfolioView, ProjectRecord } from "../modules/ProjectPortfolioView";
import { GovernanceView } from "../modules/GovernanceView";
import { EmployeeSelfServiceView } from "../modules/EmployeeSelfServiceView";
import { ReportsAnalyticsView } from "../modules/ReportsAnalyticsView";
import { EmployeeSettingsView } from "../modules/EmployeeSettingsView";
import { ApprovalWorkflowsView } from "../modules/ApprovalWorkflowsView";
import { DisciplinaryManagementView } from "../modules/DisciplinaryManagementView";
import { PoliciesHandbookView } from "../modules/PoliciesHandbookView";
import { OrganogramView } from "../modules/OrganogramView";
import { DEFAULT_EMPLOYEES, DEMO_ASSETS, DEMO_PROJECTS } from "../../data/demoData";
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
}) => {
  // Employees with a real session land on their home (self_service). Everyone else lands on the dashboard.
  const [currentView, setCurrentViewRaw] = useState<ModuleViewKey>(() =>
    initialUser?.persona === "employee" && isViewEnabled("self_service") ? "self_service" : firstEnabledView(),
  );
  // Only enabled modules can be opened, from anywhere (sidebar, palette, links, quick actions). See src/config/modules.ts.
  // command_centre was merged into the dashboard; old links and buttons that still name it land on the dashboard.
  const setCurrentView = (requested: ModuleViewKey) => {
    const view = requested === "command_centre" ? "dashboard" : requested;
    if (isViewEnabled(view)) setCurrentViewRaw(view);
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
  const [leaves, setLeaves] = useState<LeaveRecord[]>(initialLeaves);
  const [tickets, setTickets] = useState<TicketRecord[]>(initialTickets);
  const [projects] = useState<ProjectRecord[]>(initialProjects.length > 0 || initialUser ? initialProjects : DEMO_PROJECTS);

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isOmniAgentOpen, setIsOmniAgentOpen] = useState(false);
  const [omniInitialTab, setOmniInitialTab] = useState<"prompts" | "chat">("prompts");
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const [selectedDirectoryEmployee, setSelectedDirectoryEmployee] = useState<EmployeeRecord | null>(null);
  const [showLeaveModalDirectly, setShowLeaveModalDirectly] = useState(false);

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
      } catch {}
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

  const handleLoginSuccess = (user: AuthenticatedUser) => {
    setCurrentUser(user);
    setPersona(user.persona);
    setPhotoUrl(loadHeadshot(user.id));
    try {
      localStorage.setItem("scoreview_session", JSON.stringify(user));
    } catch {}
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
      } catch {}
      window.location.assign("/login");
      return;
    }
    try {
      localStorage.removeItem("scoreview_session");
    } catch {}
    setCurrentUser(null);
    setPhotoUrl(null);
    setIsWelcomeModalOpen(false);
  };

  // Keyboard shortcut listener: ⌘J for Omni-Agent
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        setIsOmniAgentOpen((prev) => !prev);
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
        return "Dashboard";
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
        if (!isViewEnabled("time_and_leave")) break;
        setShowLeaveModalDirectly(true);
        setCurrentView("time_and_leave");
        break;
      case "new_ticket":
        setCurrentView("helpdesk");
        break;
    }
  };

  const handleOmniWorkflow = (workflow: string) => {
    if (workflow === "accra_leave") {
      const newLeave: LeaveRecord = {
        id: Date.now(),
        first_name: "Paa",
        last_name: "Barnes",
        leave_type_name: "Annual Leave",
        start_date: "2026-05-08",
        end_date: "2026-05-08",
        requested_days: "1.0",
        status: "APPROVED",
        reason: "Travel to Accra (Auto-drafted by Omni-Agent)",
      };
      setLeaves((prev) => [newLeave, ...prev]);
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

  // The module screen itself, shared by both frames.
  const viewContent = (
    <>
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
                setShowLeaveModalDirectly(true);
                setCurrentView("time_and_leave");
              }}
              onReportIssue={() => setCurrentView("helpdesk")}
              onOpenPayslip={() => setIsPayslipModalOpen(true)}
              onNavigate={setCurrentView}
            />
          )}

          {currentView === "reports_analytics" && (
            <ReportsAnalyticsView />
          )}

          {currentView === "workforce_directory" && (
            <WorkforceDirectoryView
              employees={employees}
              assets={assets}
              selectedInitialEmployee={selectedDirectoryEmployee}
              onEmployeeCreated={(newEmp) => setEmployees((prev) => [newEmp, ...prev])}
              onNavigateToSettings={() => setCurrentView("employee_settings")}
              onNavigateToWorkflows={() => setCurrentView("approval_workflows")}
            />
          )}

          {currentView === "performance_pms" && (
            <PerformanceManagementView
              cycles={cycles}
              onCycleCreated={(newCycle) => setCycles((prev) => [newCycle, ...prev])}
            />
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
            <LifecyclePortalView />
          )}

          {currentView === "asset_management" && (
            <AssetManagementView assets={assets} employees={employees} />
          )}

          {currentView === "dashboard" && <DashboardScreen user={currentUser} realSession={!!initialUser} onNavigate={setCurrentView} />}

          {currentView === "assets" && <AssetsScreen user={currentUser} realSession={!!initialUser} />}

          {currentView === "performance_setup" && <PerformanceSetupScreen user={currentUser} realSession={!!initialUser} />}
          {currentView === "company_setup" && <CompanySetupScreen user={currentUser} realSession={!!initialUser} />}
          {currentView === "my_profile" && <ProfileChangesScreen user={currentUser} realSession={!!initialUser} />}
          {currentView === "payslips" && <PayslipsScreen user={currentUser} realSession={!!initialUser} />}
          {currentView === "document_centre" && <DocumentCentreScreen user={currentUser} realSession={!!initialUser} />}
          {currentView === "my_performance" && <MyPerformanceScreen user={currentUser} realSession={!!initialUser} />}

          {currentView === "objectives" && <ObjectivesScreen user={currentUser} realSession={!!initialUser} />}

          {currentView === "time_and_leave" && SHELL_MODE === "plain" && <LeaveScreen user={currentUser} realSession={!!initialUser} />}
          {currentView === "time_and_leave" && SHELL_MODE !== "plain" && (
            <TimeAndLeaveView
              initialLeaves={leaves}
              showNewLeaveModal={showLeaveModalDirectly}
              onCloseNewLeaveModal={() => setShowLeaveModalDirectly(false)}
            />
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

          {currentView === "policies_handbook" && <PoliciesHandbookView />}
          {currentView === "organogram" && <OrganogramView />}
    </>
  );

  if (SHELL_MODE === "plain") {
    return (
      <>
        <PlainShell
          user={currentUser}
          showName={!!initialUser}
          currentView={currentView}
          onNavigate={setCurrentView}
          onSignOut={handleSignOut}
          onOpenDede={() => window.dispatchEvent(new Event("dede:open"))}
          onOpenSearch={() => setIsCommandPaletteOpen(true)}
        >
          {viewContent}
        </PlainShell>
        <DedeWidget />
        <OmniAgentDrawer
          isOpen={isOmniAgentOpen}
          onClose={() => setIsOmniAgentOpen(false)}
          onOpen={(tab) => {
            setOmniInitialTab(tab || "prompts");
            setIsOmniAgentOpen(true);
          }}
          initialTab={omniInitialTab}
          persona={persona}
          currentView={currentView}
          onNavigate={setCurrentView}
          onExecuteWorkflow={handleOmniWorkflow}
        />
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onSelectView={setCurrentView}
          employees={employees}
          onSelectEmployee={(emp) => setSelectedDirectoryEmployee(emp)}
          onOpenPayslip={() => setIsPayslipModalOpen(true)}
          onOpenOmniAgent={() => {
            setOmniInitialTab("chat");
            setIsOmniAgentOpen(true);
          }}
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
        onOpenOmniAgent={() => {
          setOmniInitialTab("prompts");
          setIsOmniAgentOpen(true);
        }}
        onStartFollowPrompt={() => {
          setOmniInitialTab("prompts");
          setIsOmniAgentOpen(true);
        }}
      />

      {/* Unified Dede AI & Follow the Prompt Floating Sidebar */}
      <OmniAgentDrawer
        isOpen={isOmniAgentOpen}
        onClose={() => setIsOmniAgentOpen(false)}
        onOpen={(tab) => {
          setOmniInitialTab(tab || "prompts");
          setIsOmniAgentOpen(true);
        }}
        initialTab={omniInitialTab}
        persona={persona}
        currentView={currentView}
        onNavigate={setCurrentView}
        onExecuteWorkflow={handleOmniWorkflow}
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
        onOpenOmniAgent={() => {
          setOmniInitialTab("chat");
          setIsOmniAgentOpen(true);
        }}
        onQuickAction={handleQuickAction}
      />

      {/* Collapsible Left Navigation Sidebar with Persona Switcher */}
      <AppSidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        persona={persona}
        onSelectPersona={setPersona}
        onOpenOmniAgent={() => {
          setOmniInitialTab("prompts");
          setIsOmniAgentOpen((prev) => !prev);
        }}
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
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenOmniAgent={() => setIsOmniAgentOpen((prev) => !prev)}
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
          {viewContent}
        </main>
      </div>
    </div>
  );
};
