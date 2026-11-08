"use client";

import React, { useState } from "react";
import { colors, typography, radii, shadows } from "../../design-system/tokens";
import { Icons } from "../../design-system/Icons";

export type SettingsTabKey =
  | "employee_code_tab"
  | "employee_document_tab"
  | "employee_contract_tab"
  | "contract_expiry_reminder"
  | "employee_contract_approval_workflow"
  | "employee_notification_setting"
  | "ess_tab"
  | "pfa"
  | "profile_completeness"
  | "document_formats"
  | "dynamic_fields"
  | "employee_dashboard"
  | "employee_subsidiary";

interface TabDefinition {
  key: SettingsTabKey;
  label: string;
  badge?: string;
  description: string;
  icon: React.ComponentType<{ size?: number | string; color?: string; style?: React.CSSProperties }>;
}

const SETTINGS_TABS: TabDefinition[] = [
  {
    key: "employee_code_tab",
    label: "Employee ID Auto-generation",
    badge: "Core",
    description: "Automated Staff ID sequencing, prefixes, zero-padding and preview generator",
    icon: Icons.Hash,
  },
  {
    key: "employee_document_tab",
    label: "Employee Documents",
    description: "Mandatory compliance checklists, verified degrees, IDs and expiry tracking",
    icon: Icons.FileCheck,
  },
  {
    key: "employee_contract_tab",
    label: "Contract Types",
    description: "Permanent, Fixed-Term, Probationary, Contingent, Trainee & C-Suite templates",
    icon: Icons.FileText,
  },
  {
    key: "contract_expiry_reminder",
    label: "Contract Expiry Reminder",
    badge: "Automated",
    description: "90/60/30/14-day expiry escalations, recipient routing and renewal triggers",
    icon: Icons.Bell,
  },
  {
    key: "employee_contract_approval_workflow",
    label: "Creation & Contract Approval",
    badge: "Maker-Checker",
    description: "Multi-tier approval chains (HR BP -> Finance -> Managing Director)",
    icon: Icons.ShieldCheck,
  },
  {
    key: "employee_notification_setting",
    label: "Notifications Matrix",
    description: "Multi-channel event triggers across Email, In-App, Slack and SMS alerts",
    icon: Icons.Bell,
  },
  {
    key: "ess_tab",
    label: "Employee Profile Settings (ESS)",
    description: "Self-service field permissions, banking 2FA lock, and next-of-kin access",
    icon: Icons.Users,
  },
  {
    key: "pfa",
    label: "Pension Fund Manager (PFM / PFA)",
    badge: "Statutory",
    description: "Registered PFM trustees (SSNIT, Enterprise, Axis, NEST) and Tier 1-3 contributions",
    icon: Icons.Wallet,
  },
  {
    key: "profile_completeness",
    label: "Profile Completeness Weight",
    badge: "100%",
    description: "Configurable scoring weights and compliance gates for hardware & reviews",
    icon: Icons.PieChart,
  },
  {
    key: "document_formats",
    label: "Document Formats",
    description: "Allowed file MIME types, 10MB size ceilings, Cloudflare AI OCR and virus scanning",
    icon: Icons.FileCheck,
  },
  {
    key: "dynamic_fields",
    label: "Dynamic Fields",
    badge: "Custom",
    description: "Custom employee schema builder for Ghana Card PIN, Clearance, Swag size",
    icon: Icons.Layers,
  },
  {
    key: "employee_dashboard",
    label: "Employee Dashboard Widgets",
    description: "Control what widgets staff see on their personalized home workspace",
    icon: Icons.CommandCentre,
  },
  {
    key: "employee_subsidiary",
    label: "Subsidiary Management",
    badge: "Multi-Entity",
    description: "Multi-entity governance across UK Ltd, West Africa Ltd and Delaware Tech entity",
    icon: Icons.Building,
  },
];

export const EmployeeSettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTabKey>("employee_code_tab");
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // 1. Employee ID Auto-generation State
  const [useAutoGenerator, setUseAutoGenerator] = useState<boolean>(true);
  const [staffIdPrefix, setStaffIdPrefix] = useState<string>("DW");
  const [includeYear, setIncludeYear] = useState<boolean>(true);
  const [nextAutoNumber, setNextAutoNumber] = useState<number>(46);
  const [numberDigits, setNumberDigits] = useState<number>(4);
  const [staffIdSuffix, setStaffIdSuffix] = useState<string>("");

  // 2. Documents State
  const [documentsList] = useState([
    { id: "doc_1", name: "National ID / Biometric Passport", required: true, audience: "All Employees", validity: "10 Years", category: "Statutory Identity" },
    { id: "doc_2", name: "Certified Academic Degree / Transcripts", required: true, audience: "Grade L3 and above", validity: "Permanent", category: "Education" },
    { id: "doc_3", name: "Tax Identification Clearance (GRA TIN / HMRC NI)", required: true, audience: "All Employees", validity: "Annual", category: "Statutory Tax" },
    { id: "doc_4", name: "Signed Employment Agreement & NDA", required: true, audience: "All Employees", validity: "Permanent", category: "Contract" },
    { id: "doc_5", name: "Proof of Address (Utility Bill < 90 days)", required: true, audience: "All Employees", validity: "Annual", category: "Verification" },
    { id: "doc_6", name: "Criminal Record Check / DBS Clearance", required: false, audience: "Finance & C-Suite", validity: "3 Years", category: "Security" },
    { id: "doc_7", name: "Medical Fitness Certificate", required: false, audience: "Field & Hardware Team", validity: "2 Years", category: "Occupational Health" },
  ]);

  // 3. Contract Types State
  const [contractTypes] = useState([
    { id: "ct_1", name: "Full-Time Permanent", noticePeriod: "3 Months", probation: "6 Months", autoConvert: false, benefits: "Full Medical + Tier 1/2 Pension" },
    { id: "ct_2", name: "Fixed-Term Contract", noticePeriod: "1 Month", probation: "3 Months", autoConvert: false, benefits: "Statutory Holiday + Pension" },
    { id: "ct_3", name: "Probationary Contract", noticePeriod: "2 Weeks", probation: "3 Months", autoConvert: true, benefits: "Base Salary + Equipment" },
    { id: "ct_4", name: "Contingent / Advisory Consultant", noticePeriod: "14 Days", probation: "None", autoConvert: false, benefits: "Gross Withholding Tax (No Leave)" },
    { id: "ct_5", name: "Graduate Trainee / Intern", noticePeriod: "1 Month", probation: "3 Months", autoConvert: true, benefits: "Living Stipend + Health Cover" },
    { id: "ct_6", name: "Executive / C-Suite", noticePeriod: "6 Months", probation: "None", autoConvert: false, benefits: "Executive Car + Shares + Full Health" },
  ]);

  // 4. Contract Expiry Reminder State
  const [expiryReminders, setExpiryReminders] = useState({
    day90: true,
    day60: true,
    day30: true,
    day14: true,
    notifyManager: true,
    notifyHrBp: true,
    autoDraftRenewal: true,
  });

  // 5. Creation & Contract Approval Workflow
  const [approvalStages] = useState([
    { stage: 1, role: "HR Operations / Recruiter", description: "Creates draft profile, inputs compensation & verifies bio data", sla: "24 Hours" },
    { stage: 2, role: "Line Manager / Department Head", description: "Verifies organizational reporting line, job level & equipment needs", sla: "48 Hours" },
    { stage: 3, role: "Compensation & Benefits Lead", description: "Verifies salary equity band, budget code and zero-leak payroll bounds", sla: "24 Hours" },
    { stage: 4, role: "Managing Director / HR Director", description: "Final digital signature, letter issuance and formal offer release", sla: "24 Hours" },
  ]);

  // 6. Notifications Matrix
  const [notificationSettings, setNotificationSettings] = useState([
    { event: "New Employee Created", email: true, inApp: true, slack: true, sms: false },
    { event: "Contract Sent for E-Signature", email: true, inApp: true, slack: true, sms: false },
    { event: "Contract Signed by Candidate", email: true, inApp: true, slack: true, sms: true },
    { event: "Probation 30-Day Evaluation Milestone", email: true, inApp: true, slack: false, sms: false },
    { event: "Contract Expiry Warning (< 60 Days)", email: true, inApp: true, slack: true, sms: false },
    { event: "Mandatory Document Expiry (< 14 Days)", email: true, inApp: true, slack: false, sms: false },
    { event: "Bank Account Detail Modified (2FA Trigger)", email: true, inApp: true, slack: true, sms: true },
    { event: "Next of Kin / Emergency Contact Updated", email: false, inApp: true, slack: false, sms: false },
  ]);

  // 7. ESS Permissions
  const [essPermissions, setEssPermissions] = useState({
    allowEditAddress: true,
    allowEditPhone: true,
    allowEditEmergencyContact: true,
    allowUploadAvatar: true,
    allowEditBankDetails: false, // Requires 2FA + HR Approval
    allowEditLegalName: false,   // Requires official certificate upload
    allowViewCompensation: true,
    allowDownloadP60: true,
  });

  // 8. Pension Fund Managers (PFM / PFA)
  const [pfmList] = useState([
    { code: "SSNIT-01", name: "SSNIT (Social Security and National Insurance Trust)", jurisdiction: "Ghana", tier: "Tier 1 (Mandatory)", employerRate: "13.5%", employeeRate: "5.5%", contact: "enquiries@ssnit.org.gh" },
    { code: "ENT-TRUST", name: "Enterprise Trustees Ghana", jurisdiction: "Ghana", tier: "Tier 2 & Tier 3", employerRate: "5.0%", employeeRate: "0.0% (Voluntary)", contact: "support@enterprisetrustees.com" },
    { code: "AXIS-PEN", name: "Axis Pension Trust Limited", jurisdiction: "Ghana", tier: "Tier 2 & Tier 3", employerRate: "5.0%", employeeRate: "Voluntary", contact: "info@axispensions.com" },
    { code: "STANBIC-IBTC", name: "Stanbic IBTC Trustees / Pension Managers", jurisdiction: "Ghana & Nigeria", tier: "Tier 2 Corporate", employerRate: "5.0%", employeeRate: "Voluntary", contact: "corporate@stanbicibtc.com" },
    { code: "UK-NEST", name: "NEST Workplace Pension UK", jurisdiction: "United Kingdom", tier: "Auto-Enrolment", employerRate: "3.0%", employeeRate: "5.0%", contact: "support@nestpensions.org.uk" },
    { code: "UK-STANLIFE", name: "Standard Life Master Trust", jurisdiction: "United Kingdom", tier: "Executive Master Trust", employerRate: "6.0%", employeeRate: "4.0%", contact: "workplace@standardlife.com" },
  ]);

  // 9. Profile Completeness Weights (Sum to 100)
  const [weights, setWeights] = useState({
    bioAndContact: 15,
    nextOfKin: 15,
    bankingAndTax: 25,
    documentsAndIdentity: 25,
    educationAndSkills: 20,
  });
  const [enforceCompletenessGate, setEnforceCompletenessGate] = useState(true);
  const totalWeight = weights.bioAndContact + weights.nextOfKin + weights.bankingAndTax + weights.documentsAndIdentity + weights.educationAndSkills;

  // 10. Document Formats
  const [docFormatConfig, setDocFormatConfig] = useState({
    allowedPdf: true,
    allowedPng: true,
    allowedJpg: true,
    allowedDocx: true,
    maxSizeMb: 10,
    enableWorkersAiOcr: true,
    watermarkConfidential: true,
  });

  // 11. Dynamic Custom Fields
  const [dynamicFields] = useState([
    { id: "df_1", label: "Ghana Card National ID PIN", type: "Text (Pattern Validated)", section: "Statutory Identity", required: true, defaultValue: "GHA-XXXXXXXXX-X" },
    { id: "df_2", label: "Security Clearance Tier", type: "Dropdown (Confidential, Secret, Top Secret)", section: "Governance", required: false, defaultValue: "Confidential" },
    { id: "df_3", label: "Corporate Swag & T-Shirt Size", type: "Dropdown (XS, S, M, L, XL, XXL)", section: "Personal", required: false, defaultValue: "L" },
    { id: "df_4", label: "Emergency Evacuation Assembly Zone", type: "Dropdown (Zone A, Zone B, Quad)", section: "Workplace Health & Safety", required: true, defaultValue: "Zone A" },
    { id: "df_5", label: "Hardware Desk Bay Serial", type: "Text", section: "Facilities", required: false, defaultValue: "DESK-FLOOR-2-BAY-14" },
    { id: "df_6", label: "Dietary Preferences & Allergies", type: "Multi-Select (Vegan, Halal, Kosher, Nut Allergy)", section: "Wellness", required: false, defaultValue: "None" },
  ]);

  // 12. Employee Dashboard Widgets
  const [dashboardWidgets, setDashboardWidgets] = useState({
    dailyBrief: true,
    payslipPeek: true,
    leaveBalance: true,
    anniversariesCarousel: true,
    internalGigs: true,
    vibeCheckVoice: true,
    companyFinancialRunway: false,
  });

  // 13. Subsidiary Management
  type SubsidiaryRecord = {
    id: string;
    name: string;
    legalEntity: string;
    hq: string;
    currency: string;
    taxAuthority: string;
    defaultAnnualLeave: number;
    signatory: string;
    status: string;
  };
  const [subsidiaries, setSubsidiaries] = useState<SubsidiaryRecord[]>([
    {
      id: "sub_gh",
      name: "Davies & Wright West Africa Ltd",
      legalEntity: "Limited Liability Company (Registrar General's Dept, Ghana)",
      hq: "One Airport Square, Airport City, Accra, Ghana",
      currency: "GHS (GH₵)",
      taxAuthority: "Ghana Revenue Authority (GRA) & SSNIT Tier 1/2",
      defaultAnnualLeave: 22,
      signatory: "Paa Kwesi Barnes (Head of Technology)",
      status: "Primary Corporate HQ",
    },
    {
      id: "sub_uk",
      name: "Davies & Wright UK Limited",
      legalEntity: "Private Limited Company (Registered England & Wales)",
      hq: "100 Bishopsgate, London EC2N 4AG, UK",
      currency: "GHS (GH₵) / GBP Equivalent",
      taxAuthority: "HMRC (PAYE / Real Time Information RTI)",
      defaultAnnualLeave: 25,
      signatory: "Richard Barnes (Managing Director)",
      status: "Regional Office",
    },
    {
      id: "sub_us",
      name: "ScoRePerf Technology EMEA LLC",
      legalEntity: "Delaware Registered LLC (USA / Global Remote Hub)",
      hq: "1209 North Orange Street, Wilmington, DE 19801, USA",
      currency: "USD ($)",
      taxAuthority: "Internal Revenue Service (IRS W-8BEN / 1099)",
      defaultAnnualLeave: 28,
      signatory: "Chief Executive Officer",
      status: "Active Global Remote",
    },
  ]);

  // Register / edit a subsidiary. `subForm` is the open form (null = closed); `editingSubId` is null when registering.
  const emptySub: SubsidiaryRecord = { id: "", name: "", legalEntity: "", hq: "", currency: "", taxAuthority: "", defaultAnnualLeave: 20, signatory: "", status: "Regional Office" };
  const [subForm, setSubForm] = useState<SubsidiaryRecord | null>(null);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const openSubForm = (sub: SubsidiaryRecord | null) => {
    setEditingSubId(sub ? sub.id : null);
    setSubForm(sub ? { ...sub } : { ...emptySub });
  };
  const saveSubForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subForm) return;
    const days = Number(subForm.defaultAnnualLeave);
    if (!subForm.name.trim() || !Number.isFinite(days) || days < 0 || days > 60) return;
    const record = { ...subForm, name: subForm.name.trim(), defaultAnnualLeave: days };
    if (editingSubId) {
      setSubsidiaries(subsidiaries.map((s) => (s.id === editingSubId ? { ...record, id: editingSubId } : s)));
      showNotification(`${record.name} updated.`);
    } else {
      setSubsidiaries([...subsidiaries, { ...record, id: `sub_${Date.now()}` }]);
      showNotification(`${record.name} registered.`);
    }
    setSubForm(null);
  };

  // Helper for generating sample auto IDs
  const generatePreviewId = (offset: number = 0) => {
    const yearStr = includeYear ? `${new Date().getFullYear()}-` : "";
    const num = (nextAutoNumber + offset).toString().padStart(numberDigits, "0");
    const prefix = staffIdPrefix ? `${staffIdPrefix}-` : "";
    const suffix = staffIdSuffix ? `-${staffIdSuffix}` : "";
    return `${prefix}${yearStr}${num}${suffix}`;
  };

  const showNotification = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3500);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
        padding: "1.5rem",
        maxWidth: "1400px",
        margin: "0 auto",
      }}
    >
      {/* Toast Notification */}
      {saveToast && (
        <div
          style={{
            position: "fixed",
            bottom: "2rem",
            right: "2rem",
            backgroundColor: colors.indigoPrimary,
            color: colors.textInverse,
            padding: "0.85rem 1.4rem",
            borderRadius: radii.md,
            boxShadow: shadows.modal,
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            zIndex: 100,
            fontSize: typography.sizes.sm,
            border: "1px solid rgba(255, 255, 255, 0.15)",
          }}
        >
          <Icons.Check size={16} color={colors.emeraldAction} />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Header & Sub-title */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span
              style={{
                fontSize: typography.sizes.xs,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: colors.indigoAccent,
              }}
            >
              Enterprise HR Configuration
            </span>
          </div>
          <h1
            style={{
              fontSize: typography.sizes.xl,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: colors.textPrimary,
              margin: 0,
            }}
          >
            Employee Settings & Policy Governance
          </h1>
        </div>

        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button
            onClick={() => showNotification("All settings synchronized to Cloudflare Hyperdrive Postgres.")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              backgroundColor: colors.indigoAction,
              color: colors.textInverse,
              border: "none",
              padding: "0.55rem 1.1rem",
              borderRadius: radii.md,
              fontSize: typography.sizes.sm,
              fontWeight: 500,
              cursor: "pointer",
              boxShadow: shadows.sm,
            }}
          >
            <Icons.Check size={15} />
            <span>Save All Changes</span>
          </button>
        </div>
      </div>

      {/* Layout: Sidebar Tabs + Active Settings Panel */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "300px 1fr",
          gap: "1.25rem",
          alignItems: "start",
        }}
      >
        {/* Navigation Sidebar Tabs */}
        <div
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.lg,
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.sm,
            padding: "0.6rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
          }}
        >
          <div
            style={{
              padding: "0.5rem 0.6rem",
              fontSize: "0.72rem",
              fontWeight: 700,
              color: colors.textSecondary,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Setting Modules (13)
          </div>

          {SETTINGS_TABS.map((tab) => {
            const isSelected = activeTab === tab.key;
            const IconComp = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.65rem 0.75rem",
                  borderRadius: radii.md,
                  border: "none",
                  backgroundColor: isSelected ? "rgba(99, 102, 241, 0.08)" : "transparent",
                  color: isSelected ? colors.indigoAction : colors.textPrimary,
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
                  fontWeight: isSelected ? 600 : 400,
                  fontSize: typography.sizes.sm,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <IconComp size={16} color={isSelected ? colors.indigoAction : colors.textSecondary} />
                  <span>{tab.label}</span>
                </div>
                {tab.badge && (
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      padding: "0.1rem 0.45rem",
                      borderRadius: radii.full,
                      backgroundColor: isSelected ? colors.indigoPrimary : colors.surfaceSubtle,
                      color: isSelected ? colors.textInverse : colors.textSecondary,
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Active Module Panel */}
        <div
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.lg,
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.sm,
            padding: "1.75rem",
            minHeight: "700px",
          }}
        >
          {/* TAB 1: Employee ID Auto-generation */}
          {activeTab === "employee_code_tab" && (
            <div>
              <div style={{ borderBottom: `1px solid ${colors.border}`, paddingBottom: "1rem", marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: typography.sizes.lg, margin: "0 0 0.35rem 0", color: colors.textPrimary }}>
                  Employee ID Auto-generation
                </h2>
                <p style={{ fontSize: typography.sizes.sm, color: colors.textSecondary, margin: 0 }}>
                  Configure programmatic staff identification code numbering, prefixes, zero padding, and collision prevention.
                </p>
              </div>

              {/* Toggle: Do you want to use employee ID auto-generator? */}
              <div
                style={{
                  backgroundColor: colors.surfaceSubtle,
                  borderRadius: radii.md,
                  padding: "1.1rem 1.25rem",
                  marginBottom: "1.75rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  border: `1px solid ${colors.border}`,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: typography.sizes.sm, color: colors.textPrimary }}>
                    Do you want to use the employee ID auto-generator?
                  </div>
                  <div style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: "0.15rem" }}>
                    When enabled, ScoReview HR automatically creates the next sequential Staff ID upon new hire onboarding.
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => setUseAutoGenerator(true)}
                    style={{
                      padding: "0.45rem 1rem",
                      borderRadius: radii.md,
                      border: `1px solid ${useAutoGenerator ? colors.indigoAction : colors.border}`,
                      backgroundColor: useAutoGenerator ? colors.indigoAction : colors.surface,
                      color: useAutoGenerator ? colors.textInverse : colors.textPrimary,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: typography.sizes.sm,
                    }}
                  >
                    Yes (Enabled)
                  </button>
                  <button
                    onClick={() => setUseAutoGenerator(false)}
                    style={{
                      padding: "0.45rem 1rem",
                      borderRadius: radii.md,
                      border: `1px solid ${!useAutoGenerator ? colors.indigoAction : colors.border}`,
                      backgroundColor: !useAutoGenerator ? colors.indigoAction : colors.surface,
                      color: !useAutoGenerator ? colors.textInverse : colors.textPrimary,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: typography.sizes.sm,
                    }}
                  >
                    No (Manual)
                  </button>
                </div>
              </div>

              {useAutoGenerator ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                    {/* Staff ID Prefix */}
                    <div>
                      <label style={{ display: "block", fontSize: typography.sizes.sm, fontWeight: 600, marginBottom: "0.4rem", color: colors.textPrimary }}>
                        Staff ID Prefix
                      </label>
                      <input
                        type="text"
                        value={staffIdPrefix}
                        onChange={(e) => setStaffIdPrefix(e.target.value.toUpperCase())}
                        placeholder="e.g. DW or EMP"
                        style={{
                          width: "100%",
                          padding: "0.6rem 0.8rem",
                          borderRadius: radii.md,
                          border: `1px solid ${colors.border}`,
                          fontSize: typography.sizes.sm,
                          backgroundColor: colors.surface,
                        }}
                      />
                      <span style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: "0.25rem", display: "block" }}>
                        Corporate prefix appended to all workforce IDs
                      </span>
                    </div>

                    {/* Next auto increment number */}
                    <div>
                      <label style={{ display: "block", fontSize: typography.sizes.sm, fontWeight: 600, marginBottom: "0.4rem", color: colors.textPrimary }}>
                        Next auto increment number
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={nextAutoNumber}
                        onChange={(e) => setNextAutoNumber(parseInt(e.target.value) || 1)}
                        style={{
                          width: "100%",
                          padding: "0.6rem 0.8rem",
                          borderRadius: radii.md,
                          border: `1px solid ${colors.border}`,
                          fontSize: typography.sizes.sm,
                          backgroundColor: colors.surface,
                        }}
                      />
                      <span style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: "0.25rem", display: "block" }}>
                        Starting sequence counter for the next registered employee
                      </span>
                    </div>

                    {/* Auto increment number digits */}
                    <div>
                      <label style={{ display: "block", fontSize: typography.sizes.sm, fontWeight: 600, marginBottom: "0.4rem", color: colors.textPrimary }}>
                        Auto increment number digits (Zero Padding)
                      </label>
                      <select
                        value={numberDigits}
                        onChange={(e) => setNumberDigits(parseInt(e.target.value))}
                        style={{
                          width: "100%",
                          padding: "0.6rem 0.8rem",
                          borderRadius: radii.md,
                          border: `1px solid ${colors.border}`,
                          fontSize: typography.sizes.sm,
                          backgroundColor: colors.surface,
                        }}
                      >
                        <option value={3}>3 digits (e.g. 046)</option>
                        <option value={4}>4 digits (e.g. 0046) - Standard Enterprise</option>
                        <option value={5}>5 digits (e.g. 00046)</option>
                        <option value={6}>6 digits (e.g. 000046)</option>
                      </select>
                      <span style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: "0.25rem", display: "block" }}>
                        Length of numeric component padded with leading zeros
                      </span>
                    </div>

                    {/* Optional Suffix */}
                    <div>
                      <label style={{ display: "block", fontSize: typography.sizes.sm, fontWeight: 600, marginBottom: "0.4rem", color: colors.textPrimary }}>
                        Optional Suffix or Jurisdiction Tag
                      </label>
                      <input
                        type="text"
                        value={staffIdSuffix}
                        onChange={(e) => setStaffIdSuffix(e.target.value.toUpperCase())}
                        placeholder="e.g. HQ or UK (Optional)"
                        style={{
                          width: "100%",
                          padding: "0.6rem 0.8rem",
                          borderRadius: radii.md,
                          border: `1px solid ${colors.border}`,
                          fontSize: typography.sizes.sm,
                          backgroundColor: colors.surface,
                        }}
                      />
                      <span style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: "0.25rem", display: "block" }}>
                        Optional entity suffix appended after the number
                      </span>
                    </div>
                  </div>

                  {/* Year Token Toggle */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.85rem 1rem",
                      backgroundColor: colors.surfaceSubtle,
                      borderRadius: radii.md,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <input
                      type="checkbox"
                      id="year_token"
                      checked={includeYear}
                      onChange={(e) => setIncludeYear(e.target.checked)}
                      style={{ cursor: "pointer", width: "16px", height: "16px" }}
                    />
                    <label htmlFor="year_token" style={{ cursor: "pointer", fontSize: typography.sizes.sm, color: colors.textPrimary }}>
                      <strong>Include 4-digit Year Token ({new Date().getFullYear()})</strong> — IDs will be generated as <code>{staffIdPrefix}-{new Date().getFullYear()}-XXXX</code>
                    </label>
                  </div>

                  {/* Live Interactive Preview Box */}
                  <div
                    style={{
                      border: `1px solid ${colors.indigoBorder}`,
                      backgroundColor: "rgba(99, 102, 241, 0.04)",
                      borderRadius: radii.lg,
                      padding: "1.25rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: colors.indigoAction, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Live ID Generation Preview
                      </span>
                      <span style={{ fontSize: "0.75rem", color: colors.textSecondary }}>
                        Format Pattern: <code>{`{PREFIX}-{YEAR}-{${"0".repeat(numberDigits)}}{SUFFIX}`}</code>
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                      <div
                        style={{
                          padding: "0.75rem 1.5rem",
                          backgroundColor: colors.surface,
                          borderRadius: radii.md,
                          border: `2px solid ${colors.indigoAction}`,
                          fontSize: "1.35rem",
                          fontFamily: "monospace",
                          fontWeight: 700,
                          color: colors.indigoPrimary,
                          boxShadow: shadows.sm,
                        }}
                      >
                        {generatePreviewId(0)}
                      </div>
                      <div style={{ fontSize: typography.sizes.sm, color: colors.textSecondary }}>
                        ← <strong>Next Assigned Staff ID</strong> on new onboarding
                      </div>
                    </div>

                    {/* Sequence Table */}
                    <div style={{ fontSize: "0.78rem", fontWeight: 600, color: colors.textSecondary, marginBottom: "0.4rem" }}>
                      Subsequent 4 Generated IDs in Sequence:
                    </div>
                    <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                      {[1, 2, 3, 4].map((offset) => (
                        <div
                          key={offset}
                          style={{
                            padding: "0.35rem 0.75rem",
                            backgroundColor: colors.surface,
                            borderRadius: radii.sm,
                            border: `1px solid ${colors.border}`,
                            fontFamily: "monospace",
                            fontSize: "0.8rem",
                            color: colors.textPrimary,
                          }}
                        >
                          {generatePreviewId(offset)}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Collision prevention */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.85rem 1rem",
                      borderRadius: radii.md,
                      backgroundColor: "rgba(16, 185, 129, 0.06)",
                      border: "1px solid rgba(16, 185, 129, 0.2)",
                    }}
                  >
                    <Icons.ShieldCheck size={18} color={colors.emeraldDark} />
                    <div style={{ fontSize: typography.sizes.sm, color: colors.textPrimary }}>
                      <strong>Strict Collision Safeguard Active:</strong> The Cloudflare D1 / Hyperdrive Postgres index enforces unique constraints. If an existing ID exists in the database, the generator automatically increments to the next free integer.
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: "2rem", textAlign: "center", color: colors.textSecondary, backgroundColor: colors.surfaceSubtle, borderRadius: radii.md }}>
                  Manual Staff ID mode selected. HR administrators will be required to type an arbitrary employee ID manually during candidate record creation.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Employee Documents */}
          {activeTab === "employee_document_tab" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `1px solid ${colors.border}`, paddingBottom: "1rem", marginBottom: "1.5rem" }}>
                <div>
                  <h2 style={{ fontSize: typography.sizes.lg, margin: "0 0 0.35rem 0", color: colors.textPrimary }}>
                    Employee Document Requirements
                  </h2>
                  <p style={{ fontSize: typography.sizes.sm, color: colors.textSecondary, margin: 0 }}>
                    Define mandatory and optional document checklists for onboarding, legal verification and audit readiness.
                  </p>
                </div>
                <button
                  onClick={() => showNotification("New document requirement modal opened.")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.45rem 0.9rem",
                    backgroundColor: colors.indigoAction,
                    color: colors.textInverse,
                    border: "none",
                    borderRadius: radii.md,
                    fontSize: typography.sizes.sm,
                    cursor: "pointer",
                  }}
                >
                  <Icons.Plus size={15} />
                  <span>Add Document Type</span>
                </button>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.sm }}>
                  <thead>
                    <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}` }}>
                      <th style={{ textAlign: "left", padding: "0.75rem 1rem", color: colors.textSecondary, fontWeight: 600 }}>Document Name</th>
                      <th style={{ textAlign: "left", padding: "0.75rem 1rem", color: colors.textSecondary, fontWeight: 600 }}>Category</th>
                      <th style={{ textAlign: "left", padding: "0.75rem 1rem", color: colors.textSecondary, fontWeight: 600 }}>Applicable Staff</th>
                      <th style={{ textAlign: "left", padding: "0.75rem 1rem", color: colors.textSecondary, fontWeight: 600 }}>Validity Period</th>
                      <th style={{ textAlign: "left", padding: "0.75rem 1rem", color: colors.textSecondary, fontWeight: 600 }}>Mandatory</th>
                      <th style={{ textAlign: "right", padding: "0.75rem 1rem", color: colors.textSecondary, fontWeight: 600 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documentsList.map((doc) => (
                      <tr key={doc.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                        <td style={{ padding: "0.85rem 1rem", fontWeight: 600, color: colors.textPrimary }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <Icons.FileText size={15} color={colors.indigoAction} />
                            <span>{doc.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: "0.85rem 1rem", color: colors.textSecondary }}>{doc.category}</td>
                        <td style={{ padding: "0.85rem 1rem", color: colors.textSecondary }}>{doc.audience}</td>
                        <td style={{ padding: "0.85rem 1rem", color: colors.textSecondary }}>{doc.validity}</td>
                        <td style={{ padding: "0.85rem 1rem" }}>
                          <span
                            style={{
                              padding: "0.2rem 0.55rem",
                              borderRadius: radii.full,
                              fontSize: "0.72rem",
                              fontWeight: 600,
                              backgroundColor: doc.required ? "rgba(239, 68, 68, 0.1)" : "rgba(107, 114, 128, 0.1)",
                              color: doc.required ? "#b91c1c" : colors.textSecondary,
                            }}
                          >
                            {doc.required ? "Mandatory" : "Optional"}
                          </span>
                        </td>
                        <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                          <button
                            onClick={() => showNotification(`Configuring policy for ${doc.name}`)}
                            style={{
                              background: "none",
                              border: `1px solid ${colors.border}`,
                              borderRadius: radii.sm,
                              padding: "0.25rem 0.55rem",
                              fontSize: "0.75rem",
                              cursor: "pointer",
                              color: colors.indigoAction,
                            }}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Employee Contract Types */}
          {activeTab === "employee_contract_tab" && (
            <div>
              <div style={{ borderBottom: `1px solid ${colors.border}`, paddingBottom: "1rem", marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: typography.sizes.lg, margin: "0 0 0.35rem 0", color: colors.textPrimary }}>
                  Employee Contract Types & Terms
                </h2>
                <p style={{ fontSize: typography.sizes.sm, color: colors.textSecondary, margin: 0 }}>
                  Standardized legal contracts, default notice period windows, statutory entitlements, and probation rules.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                {contractTypes.map((ct) => (
                  <div
                    key={ct.id}
                    style={{
                      border: `1px solid ${colors.border}`,
                      borderRadius: radii.md,
                      padding: "1.25rem",
                      backgroundColor: colors.surfaceSubtle,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                        <span style={{ fontWeight: 600, fontSize: typography.sizes.base, color: colors.textPrimary }}>{ct.name}</span>
                        {ct.autoConvert && (
                          <span style={{ fontSize: "0.7rem", backgroundColor: colors.emeraldSubtle, color: colors.emeraldDark, padding: "0.15rem 0.5rem", borderRadius: radii.full, fontWeight: 600 }}>
                            Auto-Converts
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: typography.sizes.sm, color: colors.textSecondary, marginBottom: "0.5rem" }}>
                        Benefits: {ct.benefits}
                      </div>
                      <div style={{ display: "flex", gap: "1.5rem", fontSize: typography.sizes.xs, color: colors.textPrimary }}>
                        <div><strong>Notice:</strong> {ct.noticePeriod}</div>
                        <div><strong>Probation:</strong> {ct.probation}</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", borderTop: `1px solid ${colors.border}`, paddingTop: "0.6rem" }}>
                      <button
                        onClick={() => showNotification(`Updated contract template: ${ct.name}`)}
                        style={{
                          background: "none",
                          border: "none",
                          color: colors.indigoAction,
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Edit Terms & Template →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Contract Expiry Reminder */}
          {activeTab === "contract_expiry_reminder" && (
            <div>
              <div style={{ borderBottom: `1px solid ${colors.border}`, paddingBottom: "1rem", marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: typography.sizes.lg, margin: "0 0 0.35rem 0", color: colors.textPrimary }}>
                  Contract Expiry Reminder & Automated Escalation
                </h2>
                <p style={{ fontSize: typography.sizes.sm, color: colors.textSecondary, margin: 0 }}>
                  Automated background cron triggers alerting line managers and HR BPs before fixed-term contracts expire.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div style={{ backgroundColor: colors.surfaceSubtle, padding: "1.25rem", borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
                  <div style={{ fontWeight: 600, fontSize: typography.sizes.sm, marginBottom: "0.75rem", color: colors.textPrimary }}>
                    Reminder Notification Schedule Windows:
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    {[
                      { key: "day90", label: "90 Days Before Expiry (Initial Planning Window)" },
                      { key: "day60", label: "60 Days Before Expiry (Line Manager Renewal Trigger)" },
                      { key: "day30", label: "30 Days Before Expiry (Employee Formal Discussion)" },
                      { key: "day14", label: "14 Days Before Expiry (Urgent Executive Offboarding or Extension)" },
                    ].map((item) => (
                      <label key={item.key} style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: typography.sizes.sm, cursor: "pointer", color: colors.textPrimary }}>
                        <input
                          type="checkbox"
                          checked={expiryReminders[item.key as keyof typeof expiryReminders] as boolean}
                          onChange={(e) => setExpiryReminders((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                          style={{ width: "16px", height: "16px", cursor: "pointer" }}
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ backgroundColor: colors.surfaceSubtle, padding: "1.25rem", borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
                  <div style={{ fontWeight: 600, fontSize: typography.sizes.sm, marginBottom: "0.75rem", color: colors.textPrimary }}>
                    Notification Recipients & AI Drafting:
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: typography.sizes.sm, cursor: "pointer", color: colors.textPrimary }}>
                      <input
                        type="checkbox"
                        checked={expiryReminders.notifyManager}
                        onChange={(e) => setExpiryReminders((p) => ({ ...p, notifyManager: e.target.checked }))}
                      />
                      <span>Notify Employee's Direct Line Manager</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: typography.sizes.sm, cursor: "pointer", color: colors.textPrimary }}>
                      <input
                        type="checkbox"
                        checked={expiryReminders.notifyHrBp}
                        onChange={(e) => setExpiryReminders((p) => ({ ...p, notifyHrBp: e.target.checked }))}
                      />
                      <span>Notify Designated HR Business Partner</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: typography.sizes.sm, cursor: "pointer", color: colors.textPrimary }}>
                      <input
                        type="checkbox"
                        checked={expiryReminders.autoDraftRenewal}
                        onChange={(e) => setExpiryReminders((p) => ({ ...p, autoDraftRenewal: e.target.checked }))}
                      />
                      <span><strong>Auto-draft contract renewal addendum</strong> via Omni-Agent when manager clicks "Renew"</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Employee Creation & Contract Approval Workflow */}
          {activeTab === "employee_contract_approval_workflow" && (
            <div>
              <div style={{ borderBottom: `1px solid ${colors.border}`, paddingBottom: "1rem", marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: typography.sizes.lg, margin: "0 0 0.35rem 0", color: colors.textPrimary }}>
                  Employee Creation & Contract Approval Workflow
                </h2>
                <p style={{ fontSize: typography.sizes.sm, color: colors.textSecondary, margin: 0 }}>
                  Multi-tier Maker-Checker governance preventing unverified hires from being injected into payroll or active systems.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {approvalStages.map((stage) => (
                  <div
                    key={stage.stage}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1.25rem",
                      padding: "1.1rem 1.25rem",
                      borderRadius: radii.md,
                      backgroundColor: colors.surfaceSubtle,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: radii.full,
                        backgroundColor: colors.indigoPrimary,
                        color: colors.textInverse,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        flexShrink: 0,
                      }}
                    >
                      {stage.stage}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 600, fontSize: typography.sizes.base, color: colors.textPrimary }}>{stage.role}</span>
                        <span style={{ fontSize: "0.72rem", backgroundColor: colors.surface, padding: "0.15rem 0.5rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, color: colors.textSecondary }}>
                          SLA: {stage.sla}
                        </span>
                      </div>
                      <div style={{ fontSize: typography.sizes.sm, color: colors.textSecondary, marginTop: "0.2rem" }}>
                        {stage.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: Notifications Matrix */}
          {activeTab === "employee_notification_setting" && (
            <div>
              <div style={{ borderBottom: `1px solid ${colors.border}`, paddingBottom: "1rem", marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: typography.sizes.lg, margin: "0 0 0.35rem 0", color: colors.textPrimary }}>
                  Notifications & Alert Routing Matrix
                </h2>
                <p style={{ fontSize: typography.sizes.sm, color: colors.textSecondary, margin: 0 }}>
                  Configure delivery channels across Email, In-App Notifications, Slack bot alerts, and high-security SMS.
                </p>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.sm }}>
                  <thead>
                    <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}` }}>
                      <th style={{ textAlign: "left", padding: "0.75rem 1rem", color: colors.textSecondary, fontWeight: 600 }}>Event Trigger</th>
                      <th style={{ textAlign: "center", padding: "0.75rem 1rem", color: colors.textSecondary, fontWeight: 600 }}>Email</th>
                      <th style={{ textAlign: "center", padding: "0.75rem 1rem", color: colors.textSecondary, fontWeight: 600 }}>In-App Push</th>
                      <th style={{ textAlign: "center", padding: "0.75rem 1rem", color: colors.textSecondary, fontWeight: 600 }}>Slack / Teams</th>
                      <th style={{ textAlign: "center", padding: "0.75rem 1rem", color: colors.textSecondary, fontWeight: 600 }}>SMS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notificationSettings.map((notif, idx) => (
                      <tr key={idx} style={{ borderBottom: `1px solid ${colors.border}` }}>
                        <td style={{ padding: "0.85rem 1rem", fontWeight: 500, color: colors.textPrimary }}>{notif.event}</td>
                        <td style={{ textAlign: "center", padding: "0.85rem 1rem" }}>
                          <input
                            type="checkbox"
                            checked={notif.email}
                            onChange={(e) => {
                              const updated = [...notificationSettings];
                              updated[idx].email = e.target.checked;
                              setNotificationSettings(updated);
                            }}
                          />
                        </td>
                        <td style={{ textAlign: "center", padding: "0.85rem 1rem" }}>
                          <input
                            type="checkbox"
                            checked={notif.inApp}
                            onChange={(e) => {
                              const updated = [...notificationSettings];
                              updated[idx].inApp = e.target.checked;
                              setNotificationSettings(updated);
                            }}
                          />
                        </td>
                        <td style={{ textAlign: "center", padding: "0.85rem 1rem" }}>
                          <input
                            type="checkbox"
                            checked={notif.slack}
                            onChange={(e) => {
                              const updated = [...notificationSettings];
                              updated[idx].slack = e.target.checked;
                              setNotificationSettings(updated);
                            }}
                          />
                        </td>
                        <td style={{ textAlign: "center", padding: "0.85rem 1rem" }}>
                          <input
                            type="checkbox"
                            checked={notif.sms}
                            onChange={(e) => {
                              const updated = [...notificationSettings];
                              updated[idx].sms = e.target.checked;
                              setNotificationSettings(updated);
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: Employee Profile Settings (ESS) */}
          {activeTab === "ess_tab" && (
            <div>
              <div style={{ borderBottom: `1px solid ${colors.border}`, paddingBottom: "1rem", marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: typography.sizes.lg, margin: "0 0 0.35rem 0", color: colors.textPrimary }}>
                  Employee Self-Service (ESS) Permissions
                </h2>
                <p style={{ fontSize: typography.sizes.sm, color: colors.textSecondary, margin: 0 }}>
                  Control which profile fields employees can edit autonomously versus those requiring HR review or dual 2FA approval.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {[
                  { key: "allowEditAddress", label: "Residential Address & Postcode", desc: "Allow employees to update their current residential address directly." },
                  { key: "allowEditPhone", label: "Personal Mobile Number & Emergency Contact", desc: "Keep contact information accurate for health and safety compliance." },
                  { key: "allowUploadAvatar", label: "Profile Photo & Biography", desc: "Allow employees to customize their avatar and about-me bio." },
                  { key: "allowEditBankDetails", label: "Bank Account & Sort Code (Requires HR Approval + 2FA)", desc: "Zero-Leak Payroll Rule: Changes trigger an SMS verification code and require HR signoff." },
                  { key: "allowEditLegalName", label: "Legal Name & Marital Status (Requires Certificate)", desc: "Must be accompanied by a legal marriage certificate or deed poll document." },
                  { key: "allowViewCompensation", label: "View Total Compensation Breakdown", desc: "Enables visibility of base salary, bonus target, and equity grant details." },
                  { key: "allowDownloadP60", label: "Download Annual P60 & Tax Certificates", desc: "Instant PDF generation for employee tax filing and mortgage verification." },
                ].map((item) => (
                  <div
                    key={item.key}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "1rem 1.25rem",
                      borderRadius: radii.md,
                      backgroundColor: colors.surfaceSubtle,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: typography.sizes.sm, color: colors.textPrimary }}>{item.label}</div>
                      <div style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: "0.2rem" }}>{item.desc}</div>
                    </div>

                    <input
                      type="checkbox"
                      checked={essPermissions[item.key as keyof typeof essPermissions]}
                      onChange={(e) => setEssPermissions((p) => ({ ...p, [item.key]: e.target.checked }))}
                      style={{ width: "18px", height: "18px", cursor: "pointer" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: Pension Fund Manager (PFM / PFA) */}
          {activeTab === "pfa" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `1px solid ${colors.border}`, paddingBottom: "1rem", marginBottom: "1.5rem" }}>
                <div>
                  <h2 style={{ fontSize: typography.sizes.lg, margin: "0 0 0.35rem 0", color: colors.textPrimary }}>
                    Pension Fund Manager (PFM / PFA) Directory
                  </h2>
                  <p style={{ fontSize: typography.sizes.sm, color: colors.textSecondary, margin: 0 }}>
                    Configure authorized pension administrators, statutory Tier 1-3 contribution rates, and corporate trustee contacts.
                  </p>
                </div>
                <button
                  onClick={() => showNotification("Add Pension Administrator dialog opened.")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.45rem 0.9rem",
                    backgroundColor: colors.indigoAction,
                    color: colors.textInverse,
                    border: "none",
                    borderRadius: radii.md,
                    fontSize: typography.sizes.sm,
                    cursor: "pointer",
                  }}
                >
                  <Icons.Plus size={15} />
                  <span>Register PFM</span>
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
                {pfmList.map((pfm) => (
                  <div
                    key={pfm.code}
                    style={{
                      border: `1px solid ${colors.border}`,
                      borderRadius: radii.md,
                      padding: "1.25rem",
                      backgroundColor: colors.surfaceSubtle,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "1rem",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.25rem" }}>
                        <span style={{ fontWeight: 600, fontSize: typography.sizes.base, color: colors.textPrimary }}>{pfm.name}</span>
                        <span style={{ fontSize: "0.7rem", backgroundColor: colors.surface, padding: "0.15rem 0.5rem", borderRadius: radii.full, border: `1px solid ${colors.border}`, color: colors.indigoAction, fontWeight: 600 }}>
                          {pfm.code}
                        </span>
                        <span style={{ fontSize: "0.7rem", backgroundColor: colors.surface, padding: "0.15rem 0.5rem", borderRadius: radii.full, border: `1px solid ${colors.border}`, color: colors.textSecondary }}>
                          {pfm.jurisdiction}
                        </span>
                      </div>
                      <div style={{ fontSize: typography.sizes.sm, color: colors.textSecondary }}>
                        <strong>{pfm.tier}</strong> · Contact: <code>{pfm.contact}</code>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.72rem", color: colors.textSecondary, textTransform: "uppercase" }}>Employer Match</div>
                        <div style={{ fontWeight: 700, fontSize: "1.05rem", color: colors.emeraldDark }}>{pfm.employerRate}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.72rem", color: colors.textSecondary, textTransform: "uppercase" }}>Employee Deduct</div>
                        <div style={{ fontWeight: 700, fontSize: "1.05rem", color: colors.indigoPrimary }}>{pfm.employeeRate}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 9: Profile Completeness Weight */}
          {activeTab === "profile_completeness" && (
            <div>
              <div style={{ borderBottom: `1px solid ${colors.border}`, paddingBottom: "1rem", marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: typography.sizes.lg, margin: "0 0 0.35rem 0", color: colors.textPrimary }}>
                  Profile Completeness Scoring Weight
                </h2>
                <p style={{ fontSize: typography.sizes.sm, color: colors.textSecondary, margin: 0 }}>
                  Allocate percentage weightings across profile sections. Total must equal exactly 100%.
                </p>
              </div>

              {/* Live Weight Sum Indicator */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1rem 1.25rem",
                  borderRadius: radii.md,
                  backgroundColor: totalWeight === 100 ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
                  border: `1px solid ${totalWeight === 100 ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                  marginBottom: "1.5rem",
                }}
              >
                <div>
                  <span style={{ fontWeight: 700, fontSize: typography.sizes.base, color: totalWeight === 100 ? colors.emeraldDark : "#b91c1c" }}>
                    Total Allocation: {totalWeight}% / 100%
                  </span>
                  <div style={{ fontSize: typography.sizes.xs, color: colors.textSecondary }}>
                    {totalWeight === 100 ? "Valid configuration ready to enforce." : `Adjust weights to sum to 100% (currently ${totalWeight > 100 ? "over by " + (totalWeight - 100) : "under by " + (100 - totalWeight)}%)`}
                  </div>
                </div>

                <div
                  style={{
                    padding: "0.35rem 0.75rem",
                    borderRadius: radii.full,
                    backgroundColor: totalWeight === 100 ? colors.emeraldAction : "#ef4444",
                    color: colors.textInverse,
                    fontWeight: 700,
                    fontSize: "0.8rem",
                  }}
                >
                  {totalWeight === 100 ? "BALANCED" : "REQUIRES ADJUSTMENT"}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {[
                  { key: "bioAndContact", label: "Basic Personal Info & Contact", value: weights.bioAndContact },
                  { key: "nextOfKin", label: "Emergency Contact & Next of Kin", value: weights.nextOfKin },
                  { key: "bankingAndTax", label: "Bank Account & Statutory Tax ID (TIN / NI)", value: weights.bankingAndTax },
                  { key: "documentsAndIdentity", label: "Certified Identity & Academic Documents", value: weights.documentsAndIdentity },
                  { key: "educationAndSkills", label: "Education & Verified Skills Inventory", value: weights.educationAndSkills },
                ].map((item) => (
                  <div key={item.key} style={{ backgroundColor: colors.surfaceSubtle, padding: "1rem 1.25rem", borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <span style={{ fontWeight: 600, fontSize: typography.sizes.sm, color: colors.textPrimary }}>{item.label}</span>
                      <span style={{ fontWeight: 700, fontSize: typography.sizes.sm, color: colors.indigoPrimary }}>{item.value}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="5"
                      value={item.value}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setWeights((p) => ({ ...p, [item.key]: val }));
                      }}
                      style={{ width: "100%", cursor: "pointer" }}
                    />
                  </div>
                ))}

                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1rem", backgroundColor: colors.surfaceSubtle, borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
                  <input
                    type="checkbox"
                    id="enforce_completeness"
                    checked={enforceCompletenessGate}
                    onChange={(e) => setEnforceCompletenessGate(e.target.checked)}
                    style={{ width: "16px", height: "16px", cursor: "pointer" }}
                  />
                  <label htmlFor="enforce_completeness" style={{ fontSize: typography.sizes.sm, color: colors.textPrimary, cursor: "pointer" }}>
                    <strong>Enforce Compliance Gate:</strong> Block company laptop assignment and appraisal cycle enrollment if employee profile score is below 80%.
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: Document Formats */}
          {activeTab === "document_formats" && (
            <div>
              <div style={{ borderBottom: `1px solid ${colors.border}`, paddingBottom: "1rem", marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: typography.sizes.lg, margin: "0 0 0.35rem 0", color: colors.textPrimary }}>
                  Document Formats & Ingestion Governance
                </h2>
                <p style={{ fontSize: typography.sizes.sm, color: colors.textSecondary, margin: 0 }}>
                  File format restrictions, upload limits, automated OCR text extraction and antivirus scanning rules.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div style={{ backgroundColor: colors.surfaceSubtle, padding: "1.25rem", borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
                  <div style={{ fontWeight: 600, fontSize: typography.sizes.sm, marginBottom: "0.75rem", color: colors.textPrimary }}>
                    Allowed File Upload MIME Formats:
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    {[
                      { key: "allowedPdf", label: "PDF Documents (.pdf) - Recommended for Contracts" },
                      { key: "allowedPng", label: "PNG Images (.png) - For Photo IDs" },
                      { key: "allowedJpg", label: "JPEG / JPG Images (.jpg, .jpeg)" },
                      { key: "allowedDocx", label: "Word Documents (.docx, .doc)" },
                    ].map((item) => (
                      <label key={item.key} style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: typography.sizes.sm, color: colors.textPrimary, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={docFormatConfig[item.key as keyof typeof docFormatConfig] as boolean}
                          onChange={(e) => setDocFormatConfig((p) => ({ ...p, [item.key]: e.target.checked }))}
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ backgroundColor: colors.surfaceSubtle, padding: "1.25rem", borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
                  <div style={{ fontWeight: 600, fontSize: typography.sizes.sm, marginBottom: "0.5rem", color: colors.textPrimary }}>
                    Maximum File Upload Size Ceiling
                  </div>
                  <select
                    value={docFormatConfig.maxSizeMb}
                    onChange={(e) => setDocFormatConfig((p) => ({ ...p, maxSizeMb: parseInt(e.target.value) }))}
                    style={{ padding: "0.6rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, width: "220px", fontSize: typography.sizes.sm }}
                  >
                    <option value={5}>5 MB (Strict)</option>
                    <option value={10}>10 MB (Enterprise Recommended)</option>
                    <option value={25}>25 MB (Generous)</option>
                  </select>
                </div>

                <div style={{ backgroundColor: colors.surfaceSubtle, padding: "1.25rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: typography.sizes.sm, color: colors.textPrimary, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={docFormatConfig.enableWorkersAiOcr}
                      onChange={(e) => setDocFormatConfig((p) => ({ ...p, enableWorkersAiOcr: e.target.checked }))}
                    />
                    <span><strong>Enable Cloudflare Workers AI OCR</strong> — Automatically transcribe uploaded medical notes, passports, and utility bills for instant verification.</span>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: typography.sizes.sm, color: colors.textPrimary, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={docFormatConfig.watermarkConfidential}
                      onChange={(e) => setDocFormatConfig((p) => ({ ...p, watermarkConfidential: e.target.checked }))}
                    />
                    <span><strong>Apply Dynamic Watermark</strong> ("CONFIDENTIAL - SCO-REVIEW HR") to all downloaded employee identification documents.</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 11: Dynamic Fields */}
          {activeTab === "dynamic_fields" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `1px solid ${colors.border}`, paddingBottom: "1rem", marginBottom: "1.5rem" }}>
                <div>
                  <h2 style={{ fontSize: typography.sizes.lg, margin: "0 0 0.35rem 0", color: colors.textPrimary }}>
                    Dynamic Custom Fields Engine
                  </h2>
                  <p style={{ fontSize: typography.sizes.sm, color: colors.textSecondary, margin: 0 }}>
                    Extend employee schemas without engineering releases. Define custom fields, dropdowns, and validation rules.
                  </p>
                </div>
                <button
                  onClick={() => showNotification("Add Custom Dynamic Field drawer opened.")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.45rem 0.9rem",
                    backgroundColor: colors.indigoAction,
                    color: colors.textInverse,
                    border: "none",
                    borderRadius: radii.md,
                    fontSize: typography.sizes.sm,
                    cursor: "pointer",
                  }}
                >
                  <Icons.Plus size={15} />
                  <span>Create Custom Field</span>
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {dynamicFields.map((field) => (
                  <div
                    key={field.id}
                    style={{
                      border: `1px solid ${colors.border}`,
                      borderRadius: radii.md,
                      padding: "1rem 1.25rem",
                      backgroundColor: colors.surfaceSubtle,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <span style={{ fontWeight: 600, fontSize: typography.sizes.base, color: colors.textPrimary }}>{field.label}</span>
                        {field.required && (
                          <span style={{ fontSize: "0.68rem", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#b91c1c", padding: "0.1rem 0.4rem", borderRadius: radii.full, fontWeight: 600 }}>
                            Required
                          </span>
                        )}
                        <span style={{ fontSize: "0.72rem", backgroundColor: colors.surface, padding: "0.1rem 0.5rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, color: colors.indigoAction }}>
                          {field.section}
                        </span>
                      </div>
                      <div style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: "0.25rem" }}>
                        Type: <code>{field.type}</code> · Default / Pattern: <code>{field.defaultValue}</code>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        onClick={() => showNotification(`Editing field definition: ${field.label}`)}
                        style={{
                          background: "none",
                          border: `1px solid ${colors.border}`,
                          padding: "0.3rem 0.6rem",
                          borderRadius: radii.sm,
                          fontSize: "0.75rem",
                          color: colors.indigoAction,
                          cursor: "pointer",
                        }}
                      >
                        Configure
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 12: Employee Dashboard */}
          {activeTab === "employee_dashboard" && (
            <div>
              <div style={{ borderBottom: `1px solid ${colors.border}`, paddingBottom: "1rem", marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: typography.sizes.lg, margin: "0 0 0.35rem 0", color: colors.textPrimary }}>
                  Employee Dashboard (ESS) Widget Customization
                </h2>
                <p style={{ fontSize: typography.sizes.sm, color: colors.textSecondary, margin: 0 }}>
                  Toggle which interactive widgets, self-service tools, and AI cards appear on an employee's personal workspace.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {[
                  { key: "dailyBrief", label: "AI Morning Daily Briefing", desc: "Shows pending approvals, upcoming milestones, and personal schedule summary." },
                  { key: "payslipPeek", label: "Instant Payslip Peek Card", desc: "Allows employees to view latest net pay and HMRC / GRA RTI breakdown." },
                  { key: "leaveBalance", label: "Annual Leave Allowance & 1-Click Request", desc: "Displays remaining leave balance and instant draft request." },
                  { key: "anniversariesCarousel", label: "Birthdays & Work Anniversaries Carousel", desc: "Social community feed celebrating colleague milestones." },
                  { key: "internalGigs", label: "Internal Gig Board & Skill Matches", desc: "Recommends cross-functional projects matching verified employee competencies." },
                  { key: "vibeCheckVoice", label: "10-Second Voice & Emoji Vibe Check", desc: "Allows anonymous weekly pulse feedback with sentiment waveform analysis." },
                  { key: "companyFinancialRunway", label: "Company Financial Runway & Burn Rate", desc: "CONFIDENTIAL: Restrict strictly to Executive & Finance roles." },
                ].map((widget) => (
                  <div
                    key={widget.key}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "1rem 1.25rem",
                      borderRadius: radii.md,
                      backgroundColor: colors.surfaceSubtle,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: typography.sizes.sm, color: colors.textPrimary }}>{widget.label}</div>
                      <div style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: "0.2rem" }}>{widget.desc}</div>
                    </div>

                    <input
                      type="checkbox"
                      checked={dashboardWidgets[widget.key as keyof typeof dashboardWidgets]}
                      onChange={(e) => setDashboardWidgets((p) => ({ ...p, [widget.key]: e.target.checked }))}
                      style={{ width: "18px", height: "18px", cursor: "pointer" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 13: Employee Subsidiary Management */}
          {activeTab === "employee_subsidiary" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `1px solid ${colors.border}`, paddingBottom: "1rem", marginBottom: "1.5rem" }}>
                <div>
                  <h2 style={{ fontSize: typography.sizes.lg, margin: "0 0 0.35rem 0", color: colors.textPrimary }}>
                    Corporate Subsidiary & Multi-Entity Management
                  </h2>
                  <p style={{ fontSize: typography.sizes.sm, color: colors.textSecondary, margin: 0 }}>
                    Configure corporate legal entities across international jurisdictions, localized tax authorities, and currencies.
                  </p>
                </div>
                <button
                  onClick={() => openSubForm(null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.45rem 0.9rem",
                    backgroundColor: colors.indigoAction,
                    color: colors.textInverse,
                    border: "none",
                    borderRadius: radii.md,
                    fontSize: typography.sizes.sm,
                    cursor: "pointer",
                  }}
                >
                  <Icons.Plus size={15} />
                  <span>Register Subsidiary</span>
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {subsidiaries.map((sub) => (
                  <div
                    key={sub.id}
                    style={{
                      border: `1px solid ${colors.border}`,
                      borderRadius: radii.md,
                      padding: "1.35rem",
                      backgroundColor: colors.surfaceSubtle,
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <Icons.Building size={18} color={colors.indigoAction} />
                        <span style={{ fontWeight: 700, fontSize: typography.sizes.base, color: colors.textPrimary }}>{sub.name}</span>
                        <span style={{ fontSize: "0.72rem", backgroundColor: colors.emeraldSubtle, color: colors.emeraldDark, padding: "0.15rem 0.5rem", borderRadius: radii.full, fontWeight: 600 }}>
                          {sub.status}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
                        <div style={{ fontWeight: 600, fontSize: typography.sizes.sm, color: colors.indigoPrimary }}>
                          Currency: {sub.currency}
                        </div>
                        <button
                          type="button"
                          onClick={() => openSubForm(sub)}
                          aria-label={`Edit ${sub.name}`}
                          style={{ padding: "0.3rem 0.75rem", borderRadius: radii.md, border: `1px solid ${colors.indigoBorder}`, backgroundColor: colors.surface, color: colors.indigoAccent, fontSize: typography.sizes.xs, fontWeight: 600, cursor: "pointer" }}
                        >
                          Edit
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: typography.sizes.sm, color: colors.textSecondary }}>
                      {sub.legalEntity} · HQ: {sub.hq}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", fontSize: typography.sizes.xs, backgroundColor: colors.surface, padding: "0.75rem 1rem", borderRadius: radii.sm, border: `1px solid ${colors.border}` }}>
                      <div><strong>Tax Authority:</strong> {sub.taxAuthority}</div>
                      <div><strong>Annual Leave Policy:</strong> {sub.defaultAnnualLeave} Days</div>
                      <div><strong>Primary Signatory:</strong> {sub.signatory}</div>
                    </div>
                  </div>
                ))}
              </div>

              {subForm && (
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label={editingSubId ? "Edit subsidiary" : "Register subsidiary"}
                  onClick={() => setSubForm(null)}
                  style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}
                >
                  <form
                    onSubmit={saveSubForm}
                    onClick={(e) => e.stopPropagation()}
                    style={{ backgroundColor: colors.surface, borderRadius: radii.md, padding: "1.5rem", width: "min(560px, 94vw)", maxHeight: "90vh", overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}
                  >
                    <h3 style={{ gridColumn: "1 / -1", margin: 0, fontSize: typography.sizes.lg, color: colors.textPrimary }}>
                      {editingSubId ? "Edit Subsidiary" : "Register Subsidiary"}
                    </h3>
                    {(
                      [
                        { key: "name", label: "Entity name", wide: true, required: true },
                        { key: "legalEntity", label: "Legal entity type", wide: true },
                        { key: "hq", label: "Headquarters address", wide: true },
                        { key: "currency", label: "Currency" },
                        { key: "status", label: "Status" },
                        { key: "taxAuthority", label: "Tax authority", wide: true },
                        { key: "signatory", label: "Primary signatory", wide: true },
                      ] as { key: keyof SubsidiaryRecord; label: string; wide?: boolean; required?: boolean }[]
                    ).map((f) => (
                      <label key={f.key} style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: typography.sizes.xs, color: colors.textSecondary, gridColumn: f.wide ? "1 / -1" : undefined }}>
                        {f.label}
                        <input
                          required={f.required}
                          value={String(subForm[f.key])}
                          onChange={(e) => setSubForm({ ...subForm, [f.key]: e.target.value })}
                          style={{ padding: "0.5rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
                        />
                      </label>
                    ))}
                    <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: typography.sizes.xs, color: colors.textSecondary }}>
                      Annual leave (days, 0 to 60)
                      <input
                        type="number"
                        min={0}
                        max={60}
                        required
                        value={subForm.defaultAnnualLeave}
                        onChange={(e) => setSubForm({ ...subForm, defaultAnnualLeave: Number(e.target.value) })}
                        style={{ padding: "0.5rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
                      />
                    </label>
                    <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "0.25rem" }}>
                      <button type="button" onClick={() => setSubForm(null)} style={{ padding: "0.45rem 0.9rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, backgroundColor: colors.surface, cursor: "pointer", fontSize: typography.sizes.sm }}>
                        Cancel
                      </button>
                      <button type="submit" style={{ padding: "0.45rem 0.9rem", borderRadius: radii.md, border: "none", backgroundColor: colors.indigoAction, color: colors.textInverse, cursor: "pointer", fontSize: typography.sizes.sm, fontWeight: 600 }}>
                        {editingSubId ? "Save changes" : "Register"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
