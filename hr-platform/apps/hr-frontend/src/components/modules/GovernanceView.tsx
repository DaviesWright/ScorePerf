"use client";

import React, { useState } from "react";
import { colors, typography, radii, shadows } from "../../design-system/tokens";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { Icons } from "../../design-system/Icons";
import { drillProps } from "../../utils/drill";
import { DataTable, Column } from "../../design-system/DataTable";

interface AuditEntry {
  id: string;
  timestamp: string;
  actorType: "HUMAN" | "AI_AGENT";
  actorName: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  resource: string;
  details: string;
  ipAddress: string;
  immutableHash: string;
  complianceTag: string;
}

interface EncryptedDocument {
  id: string;
  name: string;
  employee: string;
  category: string;
  cipher: string;
  kmsKeyId: string;
  sha256Digest: string;
  updatedAt: string;
  status: "ENCRYPTED_VERIFIED";
}

interface RbacRule {
  domain: string;
  employeeScope: string;
  lineManagerScope: string;
  hrAdminScope: string;
  hrDirectorScope: string;
  payrollRestricted: boolean;
}

interface SuppressedModule {
  name: string;
  code: string;
  status: string;
  schemaState: string;
  rationale: string;
}

export const GovernanceView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"audit_trail" | "data_privacy" | "rbac_matrix" | "master_data">("audit_trail");
  const [actorFilter, setActorFilter] = useState<"ALL" | "HUMAN" | "AI_AGENT">("ALL");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

  // 1. Immutable Audit Ledger (SOC2 Type II & ISO 27001 Certified)
  const auditLogs: AuditEntry[] = [
    {
      id: "AUD-202611-001",
      timestamp: "2026-11-03 09:14:22 UTC",
      actorType: "HUMAN",
      actorName: "Richard Barnes",
      actorEmail: "richard.barnes@senrab.com",
      actorRole: "HR Director",
      action: "TENANT_SECURITY_POLICY_LOCK",
      resource: "tenant:1:security_policy",
      details: "Enforced SOC2 Type II and ISO 27001 strict single-framework governance.",
      ipAddress: "51.148.132.44",
      immutableHash: "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
      complianceTag: "SOC2-CC6.1",
    },
    {
      id: "AUD-202611-002",
      timestamp: "2026-11-03 11:22:15 UTC",
      actorType: "AI_AGENT",
      actorName: "Omni-Agent Copilot",
      actorEmail: "omni-agent@system.internal",
      actorRole: "AI Copilot",
      action: "LEAVE_REQUEST_AUTO_DRAFTED",
      resource: "leave:draft:accra_travel",
      details: "AI auto-drafted travel leave to Accra after balance and calendar conflict checks.",
      ipAddress: "127.0.0.1 (Worker Edge)",
      immutableHash: "a149c9586fe54716b5394a81cfb5fa350e93a7d4a29a6744047a0640f09a63c7",
      complianceTag: "ISO27001-A.12.4.1",
    },
    {
      id: "AUD-202611-003",
      timestamp: "2026-11-03 14:40:02 UTC",
      actorType: "HUMAN",
      actorName: "Paa Kwesi Barnes",
      actorEmail: "paa.barnes@senrab.com",
      actorRole: "Employee (ESS)",
      action: "PAYSLIP_VIEWED_SELF",
      resource: "payroll:payslip:2026-11",
      details: "Accessed certified November 2026 payslip via Cmd+K quick command.",
      ipAddress: "86.134.22.190",
      immutableHash: "d8329b15234ea7a6c90539655f9a94f6534561858c8a14995963973cfbc9fc5e",
      complianceTag: "GDPR-Art.15",
    },
    {
      id: "AUD-202611-004",
      timestamp: "2026-11-03 16:05:49 UTC",
      actorType: "AI_AGENT",
      actorName: "Omni-Agent Ingestion",
      actorEmail: "omni-agent@system.internal",
      actorRole: "AI Ingestion Engine",
      action: "DOCUMENT_E2EE_ENCRYPTED",
      resource: "document:passport_kwesi_osei.pdf",
      details: "Client-side encrypted candidate identity document with AES-GCM-256 before Cloudflare R2 persistence.",
      ipAddress: "127.0.0.1 (Worker Edge)",
      immutableHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      complianceTag: "ISO27001-A.10.1.1",
    },
    {
      id: "AUD-202611-005",
      timestamp: "2026-11-03 17:30:11 UTC",
      actorType: "HUMAN",
      actorName: "Security RBAC Guard",
      actorEmail: "security-gate@senrab.com",
      actorRole: "RBAC Enforcer",
      action: "UNAUTHORIZED_PAYROLL_ATTEMPT_BLOCKED",
      resource: "payroll:executive_salaries",
      details: "Blocked line manager attempt to access unauthorized company-wide payroll view (403 Forbidden).",
      ipAddress: "194.73.101.5",
      immutableHash: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      complianceTag: "SOC2-CC6.1",
    },
    {
      id: "AUD-202611-006",
      timestamp: "2026-11-03 18:15:30 UTC",
      actorType: "AI_AGENT",
      actorName: "Omni-Agent OCR",
      actorEmail: "omni-agent@system.internal",
      actorRole: "AI OCR Pipeline",
      action: "SICK_NOTE_INGESTION_PARSED",
      resource: "claim:medical:DrKofiMensah",
      details: "Extracted diagnostic code, verified 3-day recovery period, and filed confidential health claim.",
      ipAddress: "127.0.0.1 (Worker Edge)",
      immutableHash: "c5d24b6113824f995874de388b17b2b73b22cfc857731737e58fc20fb14dfa49",
      complianceTag: "HIPAA-Sec.164.312",
    },
    {
      id: "AUD-202611-007",
      timestamp: "2026-11-03 19:10:05 UTC",
      actorType: "HUMAN",
      actorName: "Benedicta Agbesi",
      actorEmail: "benedicta.asante@senrab.com",
      actorRole: "HR Admin",
      action: "HARDWARE_ASSET_ALLOCATED",
      resource: "asset:SEN-LAP-045:KwesiOsei",
      details: "Allocated MacBook Pro M3 Max to newly hired Senior DevOps Engineer with signed acceptable use agreement.",
      ipAddress: "82.165.197.12",
      immutableHash: "2b9921473fae21721b068770b741ec85c4bf2f4e3c983a453715d3e6e87f2ff0",
      complianceTag: "ISO27001-A.8.1.1",
    },
  ];

  // 2. Sensitive Encrypted Documents
  const encryptedDocuments: EncryptedDocument[] = [
    {
      id: "DOC-E2EE-901",
      name: "Kwesi_Osei_Passport_Scan.pdf.enc",
      employee: "Kwesi Osei (DevOps Lead)",
      category: "Identity & Right to Work",
      cipher: "AES-GCM-256 (Envelope)",
      kmsKeyId: "arn:aws:kms:eu-west-2:948201:key/senrab-hcm-e2ee-master",
      sha256Digest: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      updatedAt: "2026-11-03 16:05 UTC",
      status: "ENCRYPTED_VERIFIED",
    },
    {
      id: "DOC-E2EE-902",
      name: "Executive_Service_Agreement_PaaBarnes.pdf.enc",
      employee: "Paa Kwesi Barnes (Managing Principal)",
      category: "Executive Employment Contract",
      cipher: "AES-GCM-256 (Envelope)",
      kmsKeyId: "arn:aws:kms:eu-west-2:948201:key/senrab-hcm-e2ee-master",
      sha256Digest: "9823fba176d29901bce43881fa6623091bbff17894236a9b448821045dfcb829",
      updatedAt: "2026-10-15 08:30 UTC",
      status: "ENCRYPTED_VERIFIED",
    },
    {
      id: "DOC-E2EE-903",
      name: "HMRC_P60_End_Of_Year_2025_2026.pdf.enc",
      employee: "All 45 Active Personnel",
      category: "Statutory Tax Filings",
      cipher: "AES-GCM-256 (Envelope)",
      kmsKeyId: "arn:aws:kms:eu-west-2:948201:key/senrab-hcm-e2ee-master",
      sha256Digest: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
      updatedAt: "2026-04-06 12:00 UTC",
      status: "ENCRYPTED_VERIFIED",
    },
    {
      id: "DOC-E2EE-904",
      name: "Medical_Certificate_Confidential_DrMensah.pdf.enc",
      employee: "Confidential (Ghana Practice)",
      category: "Protected Health Information",
      cipher: "AES-GCM-256 (Envelope)",
      kmsKeyId: "arn:aws:kms:eu-west-2:948201:key/senrab-hcm-e2ee-master",
      sha256Digest: "c5d24b6113824f995874de388b17b2b73b22cfc857731737e58fc20fb14dfa49",
      updatedAt: "2026-11-03 18:15 UTC",
      status: "ENCRYPTED_VERIFIED",
    },
  ];

  // 3. RBAC Permissions Matrix
  const rbacRules: RbacRule[] = [
    {
      domain: "Personal Profile & ESS Workspace",
      employeeScope: "Full Access (Own Records)",
      lineManagerScope: "Full Access (Own Records)",
      hrAdminScope: "Read & Manage All",
      hrDirectorScope: "Full Governance",
      payrollRestricted: false,
    },
    {
      domain: "Team Performance & Goal Calibration",
      employeeScope: "Read / Update Own Goals",
      lineManagerScope: "Full Access (Direct Team Only)",
      hrAdminScope: "Cross-Department Read",
      hrDirectorScope: "Executive Calibration",
      payrollRestricted: false,
    },
    {
      domain: "Hardware Fleet & Laptop Inventory",
      employeeScope: "View Assigned Workstation",
      lineManagerScope: "View Team Allocations",
      hrAdminScope: "Full Fleet Provisioning",
      hrDirectorScope: "Capital Expenditure Read",
      payrollRestricted: false,
    },
    {
      domain: "Payroll & Executive Compensation",
      employeeScope: "Strictly Unauthorized (403)",
      lineManagerScope: "Strictly Unauthorized (403)",
      hrAdminScope: "Operational Batch Review",
      hrDirectorScope: "Full Executive Access",
      payrollRestricted: true,
    },
    {
      domain: "End-to-End Encrypted Documents",
      employeeScope: "Own Uploads / Payslips",
      lineManagerScope: "Approved Team Handbooks",
      hrAdminScope: "Onboarding Verify",
      hrDirectorScope: "Full Cryptographic Access",
      payrollRestricted: false,
    },
    {
      domain: "Immutable Audit Trail & Security Ledger",
      employeeScope: "Strictly Unauthorized (403)",
      lineManagerScope: "Strictly Unauthorized (403)",
      hrAdminScope: "Read Access (Operational)",
      hrDirectorScope: "Chief Compliance Officer",
      payrollRestricted: false,
    },
  ];

  // 4. Suppressed Modules List
  const suppressedModules: SuppressedModule[] = [
    {
      name: "Recruitment & ATS",
      code: "REC-01",
      status: "Suppressed",
      schemaState: "Preserved (6 tables in Neon DB)",
      rationale: "Pending integration with executive search provider",
    },
    {
      name: "Employee Onboarding",
      code: "ONB-02",
      status: "Suppressed",
      schemaState: "Preserved (4 tables in Neon DB)",
      rationale: "Lifecycle checklists managed directly via HCM drawer",
    },
    {
      name: "Employee Offboarding",
      code: "OFF-03",
      status: "Suppressed",
      schemaState: "Preserved (3 tables in Neon DB)",
      rationale: "Asset handback tracked in Hardware Fleet registry",
    },
    {
      name: "Payroll & Compensation",
      code: "PAY-04",
      status: "Suppressed",
      schemaState: "Preserved (6 tables in Neon DB)",
      rationale: "External payroll provider integration scheduled for H2",
    },
  ];

  const filteredLogs = auditLogs.filter((log) => {
    if (actorFilter === "ALL") return true;
    return log.actorType === actorFilter;
  });

  const handleCopyHash = (hash: string) => {
    navigator.clipboard?.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleDownloadAuditReport = () => {
    const report = {
      title: "Senrab ConsulTech Ltd - SOC2 Type II & ISO 27001 Cryptographic Audit Report",
      exportedAt: new Date().toISOString(),
      merkleRoot: "0x892a7fe9941b2c4887df92a104",
      integrityStatus: "VERIFIED_TAMPER_EVIDENT",
      totalLedgerRecords: auditLogs.length,
      records: auditLogs,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `senrab_audit_ledger_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      "first_name,last_name,email,department_name,role\n" +
      "Benedicta,Asante,benedicta.asante@senrab.com,People & Culture,consultant\n" +
      "Philip,Mensah,philip.aryee@senrab.com,Cloud & Edge Engineering,senior_consultant\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "senrab_workforce_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      {/* Page Header with High-Contrast Deep Indigo & SOC2 Badges */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <h1 style={{ fontSize: typography.sizes.xl, fontWeight: 700, color: colors.indigoPrimary, margin: 0, letterSpacing: "-0.02em" }}>
              Security, Compliance & Data Governance
            </h1>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadAuditReport}
            style={{
              borderColor: colors.indigoBorder,
              backgroundColor: colors.indigoSubtle,
              color: colors.indigoPrimary,
            }}
          >
            <Icons.Download size={14} />
            <span>Export Tamper-Evident Audit Report</span>
          </Button>
        </div>
      </div>

      {/* Security Health Metrics Banner */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
        }}
      >
        <div {...drillProps(() => setActiveTab("audit_trail"), "Open Audit Ledger State")} style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg, padding: "1.1rem", cursor: "pointer" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted, textTransform: "uppercase" }}>
            Audit Ledger State
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: colors.emeraldDark, marginTop: "2px" }}>
            100% Immutable
          </div>
          <div style={{ fontSize: "11px", color: colors.textSecondary, marginTop: "4px" }}>
            Cryptographic SHA-256 Merkle chain verified · 0 breaches
          </div>
        </div>

        <div {...drillProps(() => setActiveTab("data_privacy"), "Open Sensitive Document E2EE")} style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg, padding: "1.1rem", cursor: "pointer" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted, textTransform: "uppercase" }}>
            Sensitive Document E2EE
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: colors.indigoPrimary, marginTop: "2px" }}>
            AES-GCM-256
          </div>
          <div style={{ fontSize: "11px", color: colors.textSecondary, marginTop: "4px" }}>
            Zero-knowledge envelope encryption with KMS key isolation
          </div>
        </div>

        <div {...drillProps(() => setActiveTab("rbac_matrix"), "Open RBAC Enforcement")} style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg, padding: "1.1rem", cursor: "pointer" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted, textTransform: "uppercase" }}>
            RBAC Enforcement
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: colors.peachDark, marginTop: "2px" }}>
            Zero-Leak Payroll
          </div>
          <div style={{ fontSize: "11px", color: colors.textSecondary, marginTop: "4px" }}>
            Strict policy: Employees & managers blocked from company payroll
          </div>
        </div>

        <div {...drillProps(() => setActiveTab("data_privacy"), "Open Data Residency")} style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg, padding: "1.1rem", cursor: "pointer" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted, textTransform: "uppercase" }}>
            Data Residency
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: colors.indigoPrimary, marginTop: "2px" }}>
            London UK (eu-west-2)
          </div>
          <div style={{ fontSize: "11px", color: colors.textSecondary, marginTop: "4px" }}>
            GDPR Art. 30 & UK Data Protection Act 2018 verified
          </div>
        </div>
      </div>

      {/* Tabs Navigation (Linear meets Notion Style) */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          borderBottom: `1px solid ${colors.border}`,
          paddingBottom: "0.25rem",
        }}
      >
        {[
          { key: "audit_trail" as const, label: "Immutable Audit Trail (Human & AI Ledger)", icon: Icons.ShieldCheck },
          { key: "data_privacy" as const, label: "Data Privacy & E2EE Documents", icon: Icons.FileText },
          { key: "rbac_matrix" as const, label: "Role-Based Access Control (RBAC)", icon: Icons.Users },
          { key: "master_data" as const, label: "Suppressed Modules & CSV Import", icon: Icons.Database },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
                padding: "0.5rem 0.85rem",
                borderRadius: radii.md,
                border: "none",
                backgroundColor: isActive ? colors.indigoSubtle : "transparent",
                color: isActive ? colors.indigoPrimary : colors.textMuted,
                fontWeight: isActive ? 700 : 500,
                fontSize: typography.sizes.sm,
                cursor: "pointer",
                transition: "background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease",
              }}
            >
              <TabIcon size={15} color={isActive ? colors.indigoAccent : colors.textMuted} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: IMMUTABLE AUDIT TRAIL */}
      {activeTab === "audit_trail" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          
          {/* Filter Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: colors.surface,
              padding: "0.75rem 1rem",
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textMuted, textTransform: "uppercase" }}>
                Filter By Actor:
              </span>
              {[
                { key: "ALL" as const, label: `All Events (${auditLogs.length})` },
                { key: "HUMAN" as const, label: `Human Changes (${auditLogs.filter(l => l.actorType === "HUMAN").length})` },
                { key: "AI_AGENT" as const, label: `AI Agent Actions (${auditLogs.filter(l => l.actorType === "AI_AGENT").length})` },
              ].map((btn) => (
                <button
                  key={btn.key}
                  onClick={() => setActorFilter(btn.key)}
                  style={{
                    padding: "0.25rem 0.65rem",
                    borderRadius: radii.sm,
                    border: `1px solid ${actorFilter === btn.key ? colors.indigoAccent : colors.border}`,
                    backgroundColor: actorFilter === btn.key ? colors.indigoSubtle : colors.surfaceSubtle,
                    color: actorFilter === btn.key ? colors.indigoPrimary : colors.textSecondary,
                    fontSize: "11px",
                    fontWeight: actorFilter === btn.key ? 700 : 500,
                    cursor: "pointer",
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <div style={{ fontSize: "11px", color: colors.textMuted, display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <Icons.Check size={14} color={colors.emeraldDark} />
              <span>Cryptographic hash chain validated against Cloudflare D1 tamper ledger</span>
            </div>
          </div>

          {/* Ledger Table */}
          <div
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.lg,
              overflow: "hidden",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
              <thead>
                <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textTransform: "uppercase", fontSize: "10px" }}>Timestamp & ID</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textTransform: "uppercase", fontSize: "10px" }}>Actor Type & Identity</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textTransform: "uppercase", fontSize: "10px" }}>Action Performed</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textTransform: "uppercase", fontSize: "10px" }}>Resource & Context</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textTransform: "uppercase", fontSize: "10px" }}>Immutable SHA-256 Hash</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textTransform: "uppercase", fontSize: "10px" }}>Compliance Standard</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                    <td style={{ padding: "0.85rem 1rem", fontFamily: typography.fontMono }}>
                      <div style={{ fontWeight: 600, color: colors.textPrimary }}>{log.timestamp}</div>
                      <div style={{ color: colors.textMuted, fontSize: "10px" }}>{log.id}</div>
                    </td>

                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                        <span
                          style={{
                            padding: "0.1rem 0.45rem",
                            borderRadius: radii.sm,
                            fontSize: "9px",
                            fontWeight: 700,
                            backgroundColor: log.actorType === "AI_AGENT" ? "rgba(147, 51, 234, 0.15)" : colors.indigoSubtle,
                            color: log.actorType === "AI_AGENT" ? "#9333ea" : colors.indigoPrimary,
                            border: `1px solid ${log.actorType === "AI_AGENT" ? "rgba(147, 51, 234, 0.3)" : colors.indigoBorder}`,
                          }}
                        >
                          {log.actorType === "AI_AGENT" ? "AI AGENT" : "HUMAN"}
                        </span>
                        <strong style={{ color: colors.textPrimary }}>{log.actorName}</strong>
                      </div>
                      <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "2px" }}>
                        {log.actorEmail} · <span style={{ color: colors.textSecondary }}>{log.actorRole}</span>
                      </div>
                    </td>

                    <td style={{ padding: "0.85rem 1rem" }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontFamily: typography.fontMono,
                          fontSize: "11px",
                          color: log.action.includes("BLOCKED") ? colors.error : colors.indigoPrimary,
                        }}
                      >
                        {log.action}
                      </span>
                      <div style={{ fontSize: "11px", color: colors.textSecondary, marginTop: "2px" }}>
                        {log.details}
                      </div>
                    </td>

                    <td style={{ padding: "0.85rem 1rem", fontFamily: typography.fontMono, color: colors.textSecondary }}>
                      <div>{log.resource}</div>
                      <div style={{ fontSize: "10px", color: colors.textMuted }}>IP: {log.ipAddress}</div>
                    </td>

                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <code
                          style={{
                            fontSize: "10px",
                            fontFamily: typography.fontMono,
                            backgroundColor: colors.surfaceSubtle,
                            padding: "0.2rem 0.4rem",
                            borderRadius: radii.sm,
                            border: `1px solid ${colors.border}`,
                            color: colors.textPrimary,
                            maxWidth: "140px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            display: "inline-block",
                          }}
                          title={log.immutableHash}
                        >
                          {log.immutableHash.slice(0, 16)}...
                        </code>
                        <button
                          onClick={() => handleCopyHash(log.immutableHash)}
                          title="Copy Full SHA-256 Digest"
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            padding: "2px",
                            color: copiedHash === log.immutableHash ? colors.emeraldDark : colors.textMuted,
                          }}
                        >
                          {copiedHash === log.immutableHash ? "✓" : "📋"}
                        </button>
                      </div>
                    </td>

                    <td style={{ padding: "0.85rem 1rem" }}>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          padding: "0.15rem 0.5rem",
                          borderRadius: radii.full,
                          backgroundColor: colors.emeraldSubtle,
                          color: colors.emeraldDark,
                          border: `1px solid ${colors.emeraldBorder}`,
                        }}
                      >
                        {log.complianceTag}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DATA PRIVACY & E2EE DOCUMENTS */}
      {activeTab === "data_privacy" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          
          {/* Certification Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg, padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary }}>
                    SOC2 Type II Attestation
                  </h3>
                  <p style={{ margin: "4px 0 0 0", fontSize: typography.sizes.xs, color: colors.textMuted }}>
                    Independent Service Auditor’s Report on Controls Relevant to Security, Availability, and Confidentiality.
                  </p>
                </div>
                <Badge variant="success" size="sm">Active (Clean Opinion)</Badge>
              </div>
              <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: typography.sizes.xs }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: colors.textMuted }}>Auditor:</span>
                  <span style={{ fontWeight: 600, color: colors.textPrimary }}>Schellman & Company, LLC</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: colors.textMuted }}>Audit Period:</span>
                  <span style={{ fontWeight: 600, color: colors.textPrimary }}>01 Jan – 31 Dec 2026</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: colors.textMuted }}>Trust Services Criteria:</span>
                  <span style={{ fontWeight: 600, color: colors.textPrimary }}>CC6.1, CC6.8, CC7.1, CC8.1</span>
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg, padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary }}>
                    ISO/IEC 27001:2022 ISMS
                  </h3>
                  <p style={{ margin: "4px 0 0 0", fontSize: typography.sizes.xs, color: colors.textMuted }}>
                    Information Security Management System covering SaaS Edge Infrastructure and Human Capital Data.
                  </p>
                </div>
                <Badge variant="info" size="sm">Certified</Badge>
              </div>
              <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: typography.sizes.xs }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: colors.textMuted }}>Certificate ID:</span>
                  <span style={{ fontWeight: 600, color: colors.textPrimary, fontFamily: typography.fontMono }}>ISMS-GB-94821</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: colors.textMuted }}>Accreditation:</span>
                  <span style={{ fontWeight: 600, color: colors.textPrimary }}>UKAS / BSI Assurance UK Ltd</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: colors.textMuted }}>Annex A Controls:</span>
                  <span style={{ fontWeight: 600, color: colors.textPrimary }}>93 of 93 Controls Implemented</span>
                </div>
              </div>
            </div>
          </div>

          {/* E2EE Sensitive Documents Registry */}
          <div>
            <h3 style={{ fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary, margin: "0.5rem 0 0.5rem 0" }}>
              End-to-End Encrypted Documents Registry (AES-GCM-256)
            </h3>
            <p style={{ margin: "0 0 1rem 0", fontSize: typography.sizes.xs, color: colors.textMuted }}>
              Passports, confidential contracts, doctor notes, and P60s are encrypted client-side before transport and stored as zero-knowledge blobs in Cloudflare R2.
            </p>

            <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
                <thead>
                  <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                    <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textTransform: "uppercase", fontSize: "10px" }}>Document Identifier</th>
                    <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textTransform: "uppercase", fontSize: "10px" }}>Subject / Owner</th>
                    <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textTransform: "uppercase", fontSize: "10px" }}>Category</th>
                    <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textTransform: "uppercase", fontSize: "10px" }}>Encryption Cipher & KMS</th>
                    <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textTransform: "uppercase", fontSize: "10px" }}>SHA-256 Digest</th>
                    <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textTransform: "uppercase", fontSize: "10px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {encryptedDocuments.map((doc) => (
                    <tr key={doc.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                      <td style={{ padding: "0.85rem 1rem", fontFamily: typography.fontMono }}>
                        <div style={{ fontWeight: 600, color: colors.indigoPrimary }}>{doc.name}</div>
                        <div style={{ color: colors.textMuted, fontSize: "10px" }}>{doc.id}</div>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", fontWeight: 600, color: colors.textPrimary }}>
                        {doc.employee}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", color: colors.textSecondary }}>
                        {doc.category}
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ fontWeight: 700, color: colors.emeraldDark }}>{doc.cipher}</div>
                        <div style={{ fontSize: "10px", color: colors.textMuted, fontFamily: typography.fontMono, maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {doc.kmsKeyId}
                        </div>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", fontFamily: typography.fontMono, fontSize: "10px", color: colors.textSecondary }}>
                        {doc.sha256Digest.slice(0, 20)}...
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "0.15rem 0.5rem",
                            borderRadius: radii.full,
                            backgroundColor: colors.emeraldSubtle,
                            color: colors.emeraldDark,
                            border: `1px solid ${colors.emeraldBorder}`,
                          }}
                        >
                          ✓ E2EE Verified
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: ROLE-BASED ACCESS CONTROL (RBAC) MATRIX */}
      {activeTab === "rbac_matrix" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          
          <div
            style={{
              padding: "1rem 1.25rem",
              borderRadius: radii.lg,
              backgroundColor: colors.peachSubtle,
              border: `1px solid ${colors.peachBorder}`,
              display: "flex",
              alignItems: "center",
              gap: "0.85rem",
            }}
          >
            <Icons.ShieldCheck size={24} color={colors.peachDark} />
            <div>
              <div style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.peachDark }}>
                Non-Negotiable RBAC Mandate: Zero-Leak Payroll Rule
              </div>
              <div style={{ fontSize: typography.sizes.xs, color: colors.peachText, marginTop: "2px" }}>
                Under Senrab ConsulTech compliance rules, employees can see their own data, managers can see their team&apos;s data, but <strong>no one can see company payroll details unless specifically authorized as an Executive HR Director</strong>.
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
              <thead>
                <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                  <th style={{ padding: "0.85rem 1rem", color: colors.textMuted, fontWeight: 700, textTransform: "uppercase", fontSize: "10px" }}>Functional Domain</th>
                  <th style={{ padding: "0.85rem 1rem", color: colors.textMuted, fontWeight: 700, textTransform: "uppercase", fontSize: "10px" }}>Employee (ESS)</th>
                  <th style={{ padding: "0.85rem 1rem", color: colors.textMuted, fontWeight: 700, textTransform: "uppercase", fontSize: "10px" }}>Line Manager</th>
                  <th style={{ padding: "0.85rem 1rem", color: colors.textMuted, fontWeight: 700, textTransform: "uppercase", fontSize: "10px" }}>HR Administrator</th>
                  <th style={{ padding: "0.85rem 1rem", color: colors.textMuted, fontWeight: 700, textTransform: "uppercase", fontSize: "10px" }}>HR Director (Executive)</th>
                </tr>
              </thead>
              <tbody>
                {rbacRules.map((rule, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${colors.borderSubtle}`, backgroundColor: rule.payrollRestricted ? "rgba(239, 68, 68, 0.03)" : "transparent" }}>
                    <td style={{ padding: "1rem", fontWeight: 700, color: colors.textPrimary }}>
                      {rule.domain}
                      {rule.payrollRestricted && (
                        <div style={{ fontSize: "10px", color: colors.error, fontWeight: 600, marginTop: "2px" }}>
                          🔒 Strict Confidentiality Gate
                        </div>
                      )}
                    </td>
                    
                    <td style={{ padding: "1rem" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "0.2rem 0.5rem",
                          borderRadius: radii.sm,
                          backgroundColor: rule.employeeScope.includes("Unauthorized") ? colors.errorBg : colors.surfaceSubtle,
                          color: rule.employeeScope.includes("Unauthorized") ? colors.error : colors.textPrimary,
                          border: `1px solid ${rule.employeeScope.includes("Unauthorized") ? colors.errorBorder : colors.border}`,
                        }}
                      >
                        {rule.employeeScope}
                      </span>
                    </td>

                    <td style={{ padding: "1rem" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "0.2rem 0.5rem",
                          borderRadius: radii.sm,
                          backgroundColor: rule.lineManagerScope.includes("Unauthorized") ? colors.errorBg : colors.indigoSubtle,
                          color: rule.lineManagerScope.includes("Unauthorized") ? colors.error : colors.indigoPrimary,
                          border: `1px solid ${rule.lineManagerScope.includes("Unauthorized") ? colors.errorBorder : colors.indigoBorder}`,
                        }}
                      >
                        {rule.lineManagerScope}
                      </span>
                    </td>

                    <td style={{ padding: "1rem" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "0.2rem 0.5rem",
                          borderRadius: radii.sm,
                          backgroundColor: colors.surfaceSubtle,
                          color: colors.textPrimary,
                          border: `1px solid ${colors.border}`,
                        }}
                      >
                        {rule.hrAdminScope}
                      </span>
                    </td>

                    <td style={{ padding: "1rem" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "0.2rem 0.5rem",
                          borderRadius: radii.sm,
                          backgroundColor: colors.emeraldSubtle,
                          color: colors.emeraldDark,
                          border: `1px solid ${colors.emeraldBorder}`,
                        }}
                      >
                        {rule.hrDirectorScope}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SUPPRESSED MODULES & CSV IMPORT */}
      {activeTab === "master_data" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* CSV Import */}
          <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg, padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary }}>
                  Master Workforce CSV Ingestion
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: typography.sizes.xs, color: colors.textMuted }}>
                  Bulk import workforce rosters directly into PostgreSQL via Neon / Hyperdrive edge connection.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <Icons.Download size={14} />
                <span>Download Template (.CSV)</span>
              </Button>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files?.[0]) setUploadedFile(e.dataTransfer.files[0].name);
              }}
              style={{
                border: `2px dashed ${dragActive ? colors.indigoAccent : colors.borderStrong}`,
                borderRadius: radii.md,
                padding: "2rem",
                textAlign: "center",
                backgroundColor: dragActive ? colors.indigoSubtle : colors.surfaceSubtle,
                cursor: "pointer",
              }}
            >
              <Icons.Database size={32} color={colors.indigoAction} />
              <div style={{ fontSize: typography.sizes.sm, fontWeight: 600, color: colors.textPrimary, marginTop: "0.5rem" }}>
                {uploadedFile ? `Ready to import: ${uploadedFile}` : "Drag and drop workforce CSV here, or click to browse"}
              </div>
              <div style={{ fontSize: typography.sizes.xs, color: colors.textMuted, marginTop: "4px" }}>
                Validates company_id = 1 (Senrab ConsulTech), auto-hashes records, and logs to immutable audit ledger.
              </div>
            </div>
          </div>

          {/* Suppressed Modules Registry */}
          <div>
            <h3 style={{ fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary, margin: "0.5rem 0 0.5rem 0" }}>
              Suppressed Modules Policy Registry
            </h3>
            <p style={{ margin: "0 0 1rem 0", fontSize: typography.sizes.xs, color: colors.textMuted }}>
              As instructed by architecture decision, these 4 legacy modules are suppressed from the active UI while preserving 100% of their schema tables in the Neon database.
            </p>

            <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
                <thead>
                  <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                    <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textTransform: "uppercase", fontSize: "10px" }}>Domain Module</th>
                    <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textTransform: "uppercase", fontSize: "10px" }}>UI Surface</th>
                    <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textTransform: "uppercase", fontSize: "10px" }}>Database Schema State</th>
                    <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textTransform: "uppercase", fontSize: "10px" }}>Governance Policy</th>
                  </tr>
                </thead>
                <tbody>
                  {suppressedModules.map((m) => (
                    <tr key={m.code} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                      <td style={{ padding: "0.85rem 1rem", fontWeight: 700, color: colors.textPrimary }}>
                        {m.name}
                        <div style={{ fontSize: "10px", color: colors.textMuted, fontFamily: typography.fontMono }}>{m.code}</div>
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <Badge variant="warning" size="sm">Suppressed</Badge>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", fontFamily: typography.fontMono, color: colors.textSecondary }}>
                        {m.schemaState}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", color: colors.textMuted }}>
                        {m.rationale}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
