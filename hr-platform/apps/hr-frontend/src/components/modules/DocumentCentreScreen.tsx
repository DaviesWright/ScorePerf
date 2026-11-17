"use client";

import React, { useState } from "react";
import { colors, typography, radii, shadows } from "../../design-system/tokens";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { Icons } from "../../design-system/Icons";
import { formatDate } from "../../utils/date";
import { downloadPolicyPdf } from "../../utils/pdfGenerator";

export interface ExpectedEmployeeDoc {
  id: number;
  title: string;
  category: "Identity" | "Academic & Professional" | "Legal & Contract" | "Compliance";
  status: "VERIFIED" | "PENDING_REVIEW" | "ACTION_REQUIRED";
  fileName?: string;
  uploadedAt?: string;
  notes: string;
}

export interface CompanyPolicyDoc {
  id: number;
  title: string;
  version: string;
  effectiveDate: string;
  category: "Code of Conduct" | "Governance" | "Information Security" | "Workplace Guidelines";
  status: "ACKNOWLEDGED" | "UNACKNOWLEDGED";
  acknowledgedAt?: string;
  fileSize: string;
}

interface DocumentCentreScreenProps {
  user?: { id: string; persona: string; name?: string };
  realSession?: boolean;
  onNavigateToPolicies?: () => void;
}

export const DocumentCentreScreen: React.FC<DocumentCentreScreenProps> = ({ user, onNavigateToPolicies }) => {
  // Section 1: Documents expected to be uploaded by the employee
  const [employeeDocs, setEmployeeDocs] = useState<ExpectedEmployeeDoc[]>([
    {
      id: 1,
      title: "Government National ID / Passport / Ghana Card",
      category: "Identity",
      status: "VERIFIED",
      fileName: "ghana_card_verified.pdf",
      uploadedAt: "2026-01-14",
      notes: "Verified by HR Operations on onboarding.",
    },
    {
      id: 2,
      title: "Academic Degree & Professional Certificates",
      category: "Academic & Professional",
      status: "VERIFIED",
      fileName: "bsc_computer_science_cert.pdf",
      uploadedAt: "2026-01-14",
      notes: "Highest educational qualification.",
    },
    {
      id: 3,
      title: "Signed Employment Contract & Confidentiality Agreement",
      category: "Legal & Contract",
      status: "VERIFIED",
      fileName: "signed_employment_agreement.pdf",
      uploadedAt: "2026-01-10",
      notes: "Full-time permanent engagement agreement.",
    },
    {
      id: 4,
      title: "Proof of Residential Address / Utility Bill",
      category: "Compliance",
      status: "ACTION_REQUIRED",
      notes: "HR requirement: Upload recent proof of address (within past 3 months).",
    },
  ]);

  // Section 2: HR & Company Documents the employee must be abreast with
  const [companyPolicies, setCompanyPolicies] = useState<CompanyPolicyDoc[]>([
    {
      id: 101,
      title: "Code of Business Conduct & Ethics",
      version: "v2026.1",
      effectiveDate: "2026-01-01",
      category: "Code of Conduct",
      status: "ACKNOWLEDGED",
      acknowledgedAt: "2026-01-12",
      fileSize: "1.4 MB",
    },
    {
      id: 102,
      title: "Whistleblowing, Anti-Bribery & Corruption Policy",
      version: "v2026.1",
      effectiveDate: "2026-01-01",
      category: "Governance",
      status: "ACKNOWLEDGED",
      acknowledgedAt: "2026-01-12",
      fileSize: "850 KB",
    },
    {
      id: 103,
      title: "Information Security, AI Usage & Acceptable Use Policy",
      version: "v2026.2",
      effectiveDate: "2026-03-01",
      category: "Information Security",
      status: "ACKNOWLEDGED",
      acknowledgedAt: "2026-03-05",
      fileSize: "2.1 MB",
    },
    {
      id: 104,
      title: "Employee Handbook & Operational Guidelines",
      version: "v2026.1",
      effectiveDate: "2026-01-01",
      category: "Workplace Guidelines",
      status: "UNACKNOWLEDGED",
      fileSize: "3.8 MB",
    },
    {
      id: 105,
      title: "Equal Opportunity, Diversity & Anti-Harassment Policy",
      version: "v2026.1",
      effectiveDate: "2026-01-01",
      category: "Workplace Guidelines",
      status: "ACKNOWLEDGED",
      acknowledgedAt: "2026-01-12",
      fileSize: "920 KB",
    },
  ]);

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<number>(4);
  const [customTitle, setCustomTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState<ExpectedEmployeeDoc["category"]>("Compliance");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("Please select a file to upload.");
      return;
    }

    if (selectedDocId === 0) {
      // Custom new document
      const newDoc: ExpectedEmployeeDoc = {
        id: Date.now(),
        title: customTitle || selectedFile.name,
        category: uploadCategory,
        status: "PENDING_REVIEW",
        fileName: selectedFile.name,
        uploadedAt: new Date().toISOString().split("T")[0],
        notes: "Uploaded by employee. Awaiting HR Admin verification.",
      };
      setEmployeeDocs([...employeeDocs, newDoc]);
    } else {
      // Existing expected document upload
      setEmployeeDocs(
        employeeDocs.map((doc) =>
          doc.id === selectedDocId
            ? {
              ...doc,
              status: "PENDING_REVIEW",
              fileName: selectedFile.name,
              uploadedAt: new Date().toISOString().split("T")[0],
              notes: "Uploaded by employee. Awaiting HR Admin verification.",
            }
            : doc
        )
      );
    }

    setShowUploadModal(false);
    setSelectedFile(null);
    setCustomTitle("");
    setStatusMessage("Document uploaded successfully and routed to HR for verification.");
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleAcknowledgePolicy = (id: number) => {
    setCompanyPolicies(
      companyPolicies.map((p) =>
        p.id === id
          ? {
            ...p,
            status: "ACKNOWLEDGED",
            acknowledgedAt: new Date().toISOString().split("T")[0],
          }
          : p
      )
    );
    setStatusMessage("Policy acknowledged. Your digital signature has been recorded in the HR compliance registry.");
    setTimeout(() => setStatusMessage(null), 4000);
  };

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1140px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header Banner */}
      <div
        style={{
          padding: "1.25rem 1.5rem",
          borderRadius: radii.lg,
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.xs,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Icons.BookOpen size={20} color={colors.indigoAction} />
            <h1 style={{ fontSize: typography.sizes.lg, fontWeight: 800, color: colors.indigoPrimary, margin: 0 }}>
              Document Centre
            </h1>
            <Badge variant="info" size="sm">Governance &amp; Employee Vault</Badge>
          </div>
          <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0.35rem 0 0 0" }}>
            Central repository for employee records upload and mandatory HR governance documents (Code of Conduct, Whistleblowing, Policies).
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {onNavigateToPolicies && (
            <Button variant="outline" size="sm" onClick={onNavigateToPolicies}>
              <span>View Full Policies Repository &rarr;</span>
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={() => { setSelectedDocId(0); setShowUploadModal(true); }}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Icons.Plus size={14} />
              <span>Upload Document</span>
            </span>
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div style={{ padding: "0.75rem 1rem", borderRadius: radii.md, backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", fontSize: typography.sizes.xs, fontWeight: 600 }}>
          ✓ {statusMessage}
        </div>
      )}

      {/* SECTION 1: DOCUMENTS EXPECTED TO BE UPLOADED BY EMPLOYEE */}
      <div style={{ backgroundColor: colors.surface, borderRadius: radii.lg, border: `1px solid ${colors.border}`, overflow: "hidden", boxShadow: shadows.xs }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${colors.borderSubtle}`, display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surfaceSubtle }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Icons.Paperclip size={16} color={colors.indigoAction} />
              <h2 style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
                1. Required Employee Document Submissions (Uploads)
              </h2>
            </div>
            <p style={{ fontSize: "11px", color: colors.textMuted, margin: "0.2rem 0 0 0" }}>
              Mandatory documents required by HR. Upload your files directly through this portal for HR verification.
            </p>
          </div>
          <Badge variant="info" size="sm">
            {employeeDocs.filter((d) => d.status === "VERIFIED").length} of {employeeDocs.length} Verified
          </Badge>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
          <thead>
            <tr style={{ backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
              <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>REQUIRED DOCUMENT</th>
              <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>CATEGORY</th>
              <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>STATUS</th>
              <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>SUBMITTED FILE</th>
              <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>VERIFICATION NOTES</th>
              <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textAlign: "right" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {employeeDocs.map((doc) => (
              <tr key={doc.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                <td style={{ padding: "0.85rem 1rem" }}>
                  <div style={{ fontWeight: 700, color: colors.textPrimary }}>{doc.title}</div>
                </td>
                <td style={{ padding: "0.85rem 1rem" }}>
                  <Badge variant="neutral" size="sm">{doc.category}</Badge>
                </td>
                <td style={{ padding: "0.85rem 1rem" }}>
                  <Badge
                    variant={doc.status === "VERIFIED" ? "success" : doc.status === "PENDING_REVIEW" ? "warning" : "error"}
                    size="sm"
                  >
                    {doc.status === "VERIFIED" ? "Verified ✓" : doc.status === "PENDING_REVIEW" ? "Awaiting HR Review" : "Upload Required"}
                  </Badge>
                </td>
                <td style={{ padding: "0.85rem 1rem", color: colors.textSecondary }}>
                  {doc.fileName ? (
                    <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <Icons.FileText size={13} color={colors.indigoAction} />
                      <strong>{doc.fileName}</strong>
                      <span style={{ fontSize: "10px", color: colors.textMuted }}>({doc.uploadedAt})</span>
                    </span>
                  ) : (
                    <span style={{ color: colors.textMuted, fontStyle: "italic" }}>No file uploaded yet</span>
                  )}
                </td>
                <td style={{ padding: "0.85rem 1rem", color: colors.textMuted, fontSize: "11px", maxWidth: "240px" }}>
                  {doc.notes}
                </td>
                <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                  <Button
                    variant={doc.status === "ACTION_REQUIRED" ? "primary" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedDocId(doc.id);
                      setShowUploadModal(true);
                    }}
                  >
                    {doc.status === "ACTION_REQUIRED" ? "Upload Now" : "Replace File"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SECTION 2: HR & COMPANY DOCUMENTS TO BE ABREAST WITH (Code of Conduct, etc.) */}
      <div style={{ backgroundColor: colors.surface, borderRadius: radii.lg, border: `1px solid ${colors.border}`, overflow: "hidden", boxShadow: shadows.xs }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${colors.borderSubtle}`, display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surfaceSubtle }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Icons.ShieldCheck size={16} color={colors.emeraldDark} />
              <h2 style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
                2. HR &amp; Company Governance Documents (Code of Conduct, Handbook &amp; Policies)
              </h2>
            </div>
            <p style={{ fontSize: "11px", color: colors.textMuted, margin: "0.2rem 0 0 0" }}>
              Controlled by HR Directorate. Employees must remain abreast with these policies and complete required digital acknowledgments.
            </p>
          </div>
          <Badge variant="success" size="sm">
            {companyPolicies.filter((p) => p.status === "ACKNOWLEDGED").length} of {companyPolicies.length} Acknowledged
          </Badge>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
          <thead>
            <tr style={{ backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
              <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>DOCUMENT / POLICY TITLE</th>
              <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>CATEGORY</th>
              <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>VERSION</th>
              <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>EFFECTIVE DATE</th>
              <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>COMPLIANCE STATUS</th>
              <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textAlign: "right" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {companyPolicies.map((policy) => (
              <tr key={policy.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                <td style={{ padding: "0.85rem 1rem" }}>
                  <div style={{ fontWeight: 700, color: colors.textPrimary }}>{policy.title}</div>
                  <div style={{ fontSize: "10px", color: colors.textMuted }}>File Size: {policy.fileSize} • Controlled by HR</div>
                </td>
                <td style={{ padding: "0.85rem 1rem" }}>
                  <Badge variant="neutral" size="sm">{policy.category}</Badge>
                </td>
                <td style={{ padding: "0.85rem 1rem", color: colors.textSecondary }}>
                  {policy.version}
                </td>
                <td style={{ padding: "0.85rem 1rem", color: colors.textSecondary }}>
                  {formatDate(policy.effectiveDate)}
                </td>
                <td style={{ padding: "0.85rem 1rem" }}>
                  <Badge variant={policy.status === "ACKNOWLEDGED" ? "success" : "warning"} size="sm">
                    {policy.status === "ACKNOWLEDGED" ? `Acknowledged (${policy.acknowledgedAt})` : "Pending Acknowledgment"}
                  </Badge>
                </td>
                <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", alignItems: "center" }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadPolicyPdf(policy.title, policy.category, policy.effectiveDate)}
                    >
                      <Icons.Download size={13} style={{ marginRight: 4 }} />
                      View PDF
                    </Button>
                    {policy.status === "UNACKNOWLEDGED" && (
                      <Button variant="primary" size="sm" onClick={() => handleAcknowledgePolicy(policy.id)}>
                        I Acknowledge
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Upload File Modal */}
      {showUploadModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              maxWidth: "500px",
              width: "100%",
              boxShadow: shadows.lg,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: `1px solid ${colors.borderSubtle}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: colors.surfaceSubtle,
              }}
            >
              <h3 style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.indigoPrimary, margin: 0 }}>
                Upload Document to Vault
              </h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: colors.textMuted }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              {selectedDocId === 0 ? (
                <div>
                  <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                    Document Title
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. Professional Indemnity / Driver's License"
                    style={{ width: "100%", padding: "0.55rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
                    required
                  />
                </div>
              ) : (
                <div>
                  <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                    Selected Document
                  </label>
                  <div style={{ padding: "0.6rem", borderRadius: radii.md, backgroundColor: colors.surfaceSubtle, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs, fontWeight: 700 }}>
                    {employeeDocs.find((d) => d.id === selectedDocId)?.title}
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                  Select File (PDF, PNG, JPG - Max 10MB)
                </label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  style={{ width: "100%", padding: "0.5rem 0", fontSize: typography.sizes.xs }}
                  required
                />
              </div>

              <div style={{ padding: "0.6rem 0.75rem", borderRadius: radii.md, backgroundColor: colors.indigoSubtle, border: `1px solid ${colors.indigoBorder}`, fontSize: "11px", color: colors.indigoPrimary }}>
                🔒 <strong>HR Vault Privacy:</strong> Your uploaded documents are securely stored and accessible only to HR Administrators and your direct reporting Line Manager.
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                <Button variant="outline" size="sm" type="button" onClick={() => setShowUploadModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Upload &amp; Submit for Verification
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
