"use client";

import React, { useState, useEffect } from "react";
import { colors } from "../../design-system/tokens";
import { AppSidebar, ModuleViewKey, UserPersona } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { CommandPalette } from "../../design-system/CommandPalette";
import { OmniAgentDrawer } from "../ai/OmniAgentDrawer";
import { CommandCentreView } from "../modules/CommandCentreView";
import { WorkforceDirectoryView, EmployeeRecord, AssetRecord } from "../modules/WorkforceDirectoryView";
import { PerformanceManagementView, CycleRecord } from "../modules/PerformanceManagementView";
import { SkillsMarketplaceView } from "../modules/SkillsMarketplaceView";
import { AdminNerveCenterView } from "../modules/AdminNerveCenterView";
import { LifecyclePortalView } from "../modules/LifecyclePortalView";
import { AssetManagementView } from "../modules/AssetManagementView";
import { TimeAndLeaveView, LeaveRecord } from "../modules/TimeAndLeaveView";
import { HelpdeskView, TicketRecord } from "../modules/HelpdeskView";
import { ProjectPortfolioView, ProjectRecord } from "../modules/ProjectPortfolioView";
import { GovernanceView } from "../modules/GovernanceView";
import { EmployeeSelfServiceView } from "../modules/EmployeeSelfServiceView";
import { ReportsAnalyticsView } from "../modules/ReportsAnalyticsView";
import { EmployeeSettingsView } from "../modules/EmployeeSettingsView";
import { ApprovalWorkflowsView } from "../modules/ApprovalWorkflowsView";
import { DisciplinaryManagementView } from "../modules/DisciplinaryManagementView";
import { PoliciesHandbookView } from "../modules/PoliciesHandbookView";
import { DEMO_ASSETS, DEMO_PROJECTS } from "../../data/demoData";
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
}

export const EnterpriseAppShell: React.FC<EnterpriseAppShellProps> = ({
  initialEmployees,
  initialCycles,
  initialAssets,
  initialLeaves,
  initialTickets,
  initialProjects,
  apiOnline,
}) => {
  const [currentView, setCurrentView] = useState<ModuleViewKey>("command_centre");
  const [persona, setPersona] = useState<UserPersona>("hr_director");
  const [employees, setEmployees] = useState<EmployeeRecord[]>(initialEmployees);
  const [cycles, setCycles] = useState<CycleRecord[]>(initialCycles);
  // The API sends nothing until the frontend has a login, so the demo registry stands in.
  const [assets, setAssets] = useState<AssetRecord[]>(initialAssets.length > 0 ? initialAssets : DEMO_ASSETS);
  const [leaves, setLeaves] = useState<LeaveRecord[]>(initialLeaves);
  const [tickets, setTickets] = useState<TicketRecord[]>(initialTickets);
  const [projects] = useState<ProjectRecord[]>(initialProjects.length > 0 ? initialProjects : DEMO_PROJECTS);

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isOmniAgentOpen, setIsOmniAgentOpen] = useState(false);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const [selectedDirectoryEmployee, setSelectedDirectoryEmployee] = useState<EmployeeRecord | null>(null);
  const [showLeaveModalDirectly, setShowLeaveModalDirectly] = useState(false);

  // Authentication & Session State
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Restore authenticated session from localStorage
  useEffect(() => {
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

  const handleSignOut = () => {
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
        onOpenOmniAgent={() => setIsOmniAgentOpen(true)}
      />

      {/* Omni-Agent Zero-UI AI Copilot Drawer */}
      <OmniAgentDrawer
        isOpen={isOmniAgentOpen}
        onClose={() => setIsOmniAgentOpen(false)}
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
        onOpenOmniAgent={() => setIsOmniAgentOpen(true)}
        onQuickAction={handleQuickAction}
      />

      {/* Collapsible Left Navigation Sidebar with Persona Switcher */}
      <AppSidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        persona={persona}
        onSelectPersona={setPersona}
        onOpenOmniAgent={() => setIsOmniAgentOpen(true)}
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
          onOpenOmniAgent={() => setIsOmniAgentOpen(true)}
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
          {currentView === "self_service" && (
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
            />
          )}

          {currentView === "command_centre" && (
            persona === "employee" ? (
              <RbacGuard
                currentPersona={persona}
                targetView="command_centre"
                requiredScope="workforce:read"
                onNavigate={setCurrentView}
                onSwitchPersona={setPersona}
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

          {currentView === "time_and_leave" && (
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
        </main>
      </div>
    </div>
  );
};
