"use client";

import React, { useState } from "react";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { colors, radii, shadows, typography } from "../../design-system/tokens";
import { SEEDED_EMPLOYEES } from "../../data/enterpriseSeedData";

export const EmployeeBulkUploadPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [csvInput, setCsvInput] = useState(
    "Employee ID,First Name,Last Name,Email,Department,Role,Location,Employment Type,Start Date\nEMP-055,Kwame,Osei,kwame.osei@bscscoreview.com,Cloud Engineering,Cloud Engineer,Accra,Permanent,2026-11-20\nEMP-056,Ama,,invalid-email,Finance,Analyst,Accra,Permanent,2026-11-20"
  );
  const [validationResults, setValidationResults] = useState<
    Array<{ rowNum: number; valid: boolean; errors: string[]; summary: string }>
  >([]);

  const downloadTemplate = () => {
    const template = [
      "Employee ID (Required),First Name (Required),Last Name (Required),Email (Required),Department (Required),Role (Required),Location (Optional),Employment Type (Optional),Start Date (YYYY-MM-DD Required)",
      "EMP-055,Kwame,Osei,kwame.osei@bscscoreview.com,Cloud Engineering,Cloud Engineer,Accra,Permanent,2026-11-20",
    ].join("\r\n");
    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Employee_Bulk_Upload_Template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const validateCsv = () => {
    const lines = csvInput.trim().split(/\r?\n/).slice(1);
    const results = lines.map((line, idx) => {
      const cols = line.split(",").map((c) => c.trim());
      const [empId, first, last, email, dept, role, , , startDate] = cols;
      const errors: string[] = [];
      if (!empId) errors.push("Missing Employee ID");
      if (!first) errors.push("Missing First Name");
      if (!last) errors.push("Missing Last Name");
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Invalid Email");
      if (!dept) errors.push("Missing Department");
      if (!role) errors.push("Missing Role");
      if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) errors.push("Start Date must be YYYY-MM-DD");
      return {
        rowNum: idx + 2,
        valid: errors.length === 0,
        errors,
        summary: `${empId || "—"} · ${first || "?"} ${last || "?"} (${dept || "?"})`,
      };
    });
    setValidationResults(results);
  };

  return (
    <div style={{ marginBottom: "1rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          Download Bulk Upload Template (CSV)
        </Button>
        <Button variant="outline" size="sm" onClick={() => setOpen((p) => !p)}>
          {open ? "Hide Bulk Upload Validator" : "Validate & Import CSV (P7.1)"}
        </Button>
      </div>

      {open && (
        <div style={{ marginTop: "0.75rem", padding: "1rem", backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.md, boxShadow: shadows.xs }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: colors.indigoPrimary, marginBottom: 4 }}>
            Bulk Employee CSV Validator (Required: ID, First, Last, Email, Dept, Role, Start Date)
          </div>
          <textarea
            rows={4}
            value={csvInput}
            onChange={(e) => setCsvInput(e.target.value)}
            style={{ width: "100%", padding: "0.5rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, fontFamily: typography.fontMono, fontSize: 11, marginBottom: 8 }}
          />
          <Button variant="primary" size="sm" onClick={validateCsv}>Run Row Validation</Button>

          {validationResults.length > 0 && (
            <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.35rem", fontSize: 12 }}>
              {validationResults.map((r) => (
                <div key={r.rowNum} style={{ padding: "0.4rem 0.65rem", borderRadius: radii.sm, backgroundColor: r.valid ? "#f0fdf4" : "#fef2f2", border: `1px solid ${r.valid ? "#86efac" : "#fecaca"}`, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                  <span><strong>Row {r.rowNum}:</strong> {r.summary}</span>
                  {r.valid ? (
                    <Badge variant="success" size="sm">Valid</Badge>
                  ) : (
                    <span style={{ color: "#991b1b", fontWeight: 600 }}>Errors: {r.errors.join("; ")}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const EmployeeFourSectionProfilePanel: React.FC = () => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [section, setSection] = useState<"profile" | "history" | "dependents" | "professional">("profile");
  const emp = SEEDED_EMPLOYEES[selectedIdx] ?? SEEDED_EMPLOYEES[0];

  return (
    <div style={{ marginBottom: "1.25rem", backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg, padding: "1.1rem 1.25rem", boxShadow: shadows.xs }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary }}>
            4-Section Employee Record Inspector (P7.2)
          </h3>
          <p style={{ margin: "0.1rem 0 0", fontSize: 11, color: colors.textMuted }}>
            Structured into Profile, Employment History, Dependents, and Professional Profile.
          </p>
        </div>
        <select
          value={selectedIdx}
          onChange={(e) => setSelectedIdx(Number(e.target.value))}
          style={{ padding: "0.35rem 0.6rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: 12 }}
        >
          {SEEDED_EMPLOYEES.map((e, idx) => (
            <option key={e.id} value={idx}>
              {e.staffId} · {e.firstName} {e.lastName} ({e.departmentName})
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.85rem" }}>
        {[
          { key: "profile", label: "1. Profile (Personal & Contact)" },
          { key: "history", label: "2. Employment History" },
          { key: "dependents", label: "3. Dependents" },
          { key: "professional", label: "4. Professional Profile (CV & Certs)" },
        ].map((t) => (
          <Button key={t.key} variant={section === t.key ? "primary" : "outline"} size="sm" onClick={() => setSection(t.key as any)}>
            {t.label}
          </Button>
        ))}
      </div>

      {section === "profile" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", fontSize: 12 }}>
          <div><span style={{ color: colors.textMuted }}>Full Name:</span> <strong>{emp.firstName} {emp.lastName}</strong></div>
          <div><span style={{ color: colors.textMuted }}>Work Email:</span> <strong>{emp.email}</strong></div>
          <div><span style={{ color: colors.textMuted }}>Office / Hub:</span> <strong>{emp.office}</strong></div>
          <div><span style={{ color: colors.textMuted }}>Staff ID:</span> <strong>{emp.staffId}</strong></div>
        </div>
      )}
      {section === "history" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", fontSize: 12 }}>
          <div><span style={{ color: colors.textMuted }}>Current Role:</span> <strong>{emp.jobTitle} ({emp.grade})</strong></div>
          <div><span style={{ color: colors.textMuted }}>Department:</span> <strong>{emp.departmentName}</strong></div>
          <div><span style={{ color: colors.textMuted }}>Join Date:</span> <strong>{emp.joinDate}</strong></div>
          <div><span style={{ color: colors.textMuted }}>Reporting Line:</span> <strong>{emp.managerName || "Executive"}</strong></div>
          <div><span style={{ color: colors.textMuted }}>Pay Group:</span> <strong>{emp.office === "London" ? "UK-GBP-Salaried" : "GH-GHS-Salaried"}</strong></div>
        </div>
      )}
      {section === "dependents" && (
        <div style={{ fontSize: 12, color: colors.textSecondary }}>
          <strong>Registered Dependents:</strong> Primary Beneficiary on file (Medical &amp; Group Life coverage active).
        </div>
      )}
      {section === "professional" && (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", fontSize: 12 }}>
          <Badge variant="info" size="sm">CV_{emp.firstName}_{emp.lastName}.pdf</Badge>
          <Badge variant="success" size="sm">Annual Security &amp; Compliance Cert (2026)</Badge>
          <Badge variant="neutral" size="sm">{emp.departmentName} Practice Accreditation</Badge>
        </div>
      )}
    </div>
  );
};
