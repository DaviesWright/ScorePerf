"use client";

import React, { useState } from "react";
import { C, Muted, Notice, btn, card, cell, fieldStyle, isHr, readFileAsBase64, readJson, useLoad } from "./selfServiceUi";

// Payslips. Employees see and download their own. HR uploads one PDF per employee and month.

interface Payslip {
  id: number;
  month: number;
  year: number;
  grossPay: number;
  deductions: number;
  netPay: number;
  paidAt: string | null;
}

interface DirectoryPerson {
  id: number;
  name: string;
  jobTitle: string;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const UploadForm: React.FC<{ people: DirectoryPerson[]; onUploaded: () => void }> = ({ people, onUploaded }) => {
  const now = new Date();
  const [employeeId, setEmployeeId] = useState("");
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [gross, setGross] = useState("");
  const [deductions, setDeductions] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const fileBase64 = await readFileAsBase64(file);
      const res = await fetch("/api/hr/payslips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: Number(employeeId),
          month: Number(month),
          year: Number(year),
          grossPay: Number(gross),
          deductions: Number(deductions || 0),
          fileBase64,
        }),
      });
      const data = await readJson<{ id?: number }>(res);
      if (!res.ok) {
        setError(data.error ?? "The payslip was not uploaded.");
        return;
      }
      setNotice("Payslip uploaded. The employee can now download it.");
      setFile(null);
      setGross("");
      setDeductions("");
      onUploaded();
    } catch {
      setError("The file could not be read or the server could not be reached. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={card} aria-labelledby="upload-heading">
      <h2 id="upload-heading" style={{ fontSize: 18, margin: "0 0 0.5rem" }}>
        Upload a payslip
      </h2>
      <Muted>Upload one PDF per employee and month. Net pay is worked out from gross pay and deductions.</Muted>
      <form onSubmit={submit} style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", maxWidth: 900 }}>
        <label>
          Employee
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required style={fieldStyle}>
            <option value="">Choose an employee</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Month
          <select value={month} onChange={(e) => setMonth(e.target.value)} style={fieldStyle}>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label>
          Year
          <input type="number" min={2000} max={2100} value={year} onChange={(e) => setYear(e.target.value)} required style={fieldStyle} />
        </label>
        <label>
          Gross pay
          <input type="number" min={0} step="0.01" value={gross} onChange={(e) => setGross(e.target.value)} required style={fieldStyle} />
        </label>
        <label>
          Deductions
          <input type="number" min={0} step="0.01" value={deductions} onChange={(e) => setDeductions(e.target.value)} style={fieldStyle} />
        </label>
        <label>
          PDF file
          <input type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required style={{ display: "block", marginTop: "0.25rem" }} />
        </label>
        <div style={{ alignSelf: "end" }}>
          <button type="submit" style={{ ...btn, opacity: busy || !file ? 0.6 : 1 }} disabled={busy || !file}>
            {busy ? "Uploading…" : "Upload payslip"}
          </button>
        </div>
      </form>
      <Notice kind="error" text={error} />
      <Notice kind="ok" text={notice} />
    </section>
  );
};

export const PayslipsScreen: React.FC<{ user: { id: string; persona: string }; realSession: boolean }> = ({ user }) => {
  const hr = isHr(user.persona);
  const payslips = useLoad<{ results: Payslip[] }>("/api/hr/payslips");
  const home = useLoad<{ directory: DirectoryPerson[] }>(hr ? "/api/hr/home" : null);

  return (
    <div style={{ padding: "1.5rem", maxWidth: 960 }}>
      <h1 style={{ fontSize: 22, margin: "0 0 0.25rem" }}>Payslips</h1>
      <Muted>Your payslips, newest first. Each opens as a PDF.</Muted>

      <section style={card} aria-labelledby="mine-heading">
        <h2 id="mine-heading" style={{ fontSize: 18, margin: "0 0 0.5rem" }}>
          My payslips
        </h2>
        {payslips.loading && <p role="status">Loading…</p>}
        <Notice kind="error" text={payslips.error || null} />
        {payslips.data && payslips.data.results.length === 0 && <p style={{ color: C.muted }}>No payslips have been uploaded for you yet.</p>}
        {payslips.data && payslips.data.results.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={cell}>Period</th>
                  <th style={cell}>Gross pay</th>
                  <th style={cell}>Deductions</th>
                  <th style={cell}>Net pay</th>
                  <th style={cell}>File</th>
                </tr>
              </thead>
              <tbody>
                {payslips.data.results.map((p) => (
                  <tr key={p.id}>
                    <td style={cell}>
                      {MONTHS[p.month - 1]} {p.year}
                    </td>
                    <td style={cell}>{money(p.grossPay)}</td>
                    <td style={cell}>{money(p.deductions)}</td>
                    <td style={cell}>{money(p.netPay)}</td>
                    <td style={cell}>
                      <a href={`/api/hr/payslips/${p.id}/file`} download style={{ color: C.accent }}>
                        Download PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {hr && home.data && <UploadForm people={home.data.directory} onUploaded={() => payslips.reload()} />}
      {hr && home.error && <Notice kind="error" text={home.error} />}
    </div>
  );
};
