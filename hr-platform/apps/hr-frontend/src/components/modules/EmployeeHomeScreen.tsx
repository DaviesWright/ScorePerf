"use client";

import React from "react";
import type { ModuleViewKey } from "../shell/AppSidebar";
import { C, card, cell, useLoad } from "./selfServiceUi";

// Employee home: the landing page for an employee after sign-in. Reads only what the employee may see, from the
// existing endpoints: their profile, their leave balances, their latest payslip and their unread notifications.

interface Me { firstName: string; lastName: string; jobTitle: string; department: string | null }
interface Balance { leaveTypeId: number; name: string; total: number; used: number; pending: number; remaining: number }
interface LeaveMe { balances: Balance[] }
interface Payslip { id: number; month: number; year: number; netPay: number }
interface Notifications { unread: number }

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const Panel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section style={card}>
    <h2 style={{ fontSize: 16, margin: "0 0 0.5rem" }}>{title}</h2>
    {children}
  </section>
);

const Link: React.FC<{ label: string; view: ModuleViewKey; onNavigate: (v: ModuleViewKey) => void }> = ({ label, view, onNavigate }) => (
  <button
    type="button"
    onClick={() => onNavigate(view)}
    style={{ minHeight: 40, padding: "0 0.9rem", border: `1px solid ${C.accent}`, borderRadius: 4, background: "#fff", color: C.accent, font: "inherit", cursor: "pointer" }}
  >
    {label}
  </button>
);

export const EmployeeHomeScreen: React.FC<{ onNavigate: (view: ModuleViewKey) => void }> = ({ onNavigate }) => {
  const me = useLoad<Me>("/api/hr/me");
  const leave = useLoad<LeaveMe>("/api/hr/leave/me");
  const payslips = useLoad<{ results: Payslip[] }>("/api/hr/payslips");
  const notes = useLoad<Notifications>("/api/hr/notifications");

  const latest = payslips.data?.results[0];

  return (
    <div style={{ padding: "1.5rem", color: C.text, background: C.page }}>
      <h1 style={{ fontSize: 22, margin: "0 0 0.25rem" }}>
        {me.data ? `Welcome, ${me.data.firstName}` : "Welcome"}
      </h1>
      <p style={{ color: C.muted, margin: "0 0 1rem" }}>
        {me.data ? [me.data.jobTitle, me.data.department].filter(Boolean).join(" · ") : me.error}
      </p>

      <Panel title="Your leave">
        {leave.error && <p role="alert" style={{ color: C.danger }}>{leave.error}</p>}
        {leave.data && leave.data.balances.length === 0 && <p style={{ color: C.muted }}>No leave types set up yet.</p>}
        {leave.data && leave.data.balances.length > 0 && (
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
            <thead>
              <tr>
                <th style={cell}>Type</th>
                <th style={cell}>Remaining</th>
                <th style={cell}>Pending</th>
              </tr>
            </thead>
            <tbody>
              {leave.data.balances.map((b) => (
                <tr key={b.leaveTypeId}>
                  <td style={cell}>{b.name}</td>
                  <td style={cell}>{b.remaining} of {b.total}</td>
                  <td style={cell}>{b.pending}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ marginTop: "0.75rem" }}>
          <Link label="Request leave" view="time_and_leave" onNavigate={onNavigate} />
        </div>
      </Panel>

      <Panel title="Latest payslip">
        {payslips.error && <p role="alert" style={{ color: C.danger }}>{payslips.error}</p>}
        {payslips.data && !latest && <p style={{ color: C.muted }}>No payslips have been uploaded for you yet.</p>}
        {latest && (
          <p style={{ margin: 0 }}>
            {MONTHS[latest.month - 1]} {latest.year}: net pay {latest.netPay.toLocaleString()}
          </p>
        )}
        <div style={{ marginTop: "0.75rem" }}>
          <Link label="All payslips" view="payslips" onNavigate={onNavigate} />
        </div>
      </Panel>

      <Panel title="Notifications">
        {notes.data && <p style={{ margin: 0 }}>{notes.data.unread === 0 ? "Nothing new." : `${notes.data.unread} unread.`}</p>}
        {notes.error && <p role="alert" style={{ color: C.danger }}>{notes.error}</p>}
      </Panel>

      <Panel title="Quick links">
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link label="Bank & Tax Details" view="my_profile" onNavigate={onNavigate} />
          <Link label="Document Centre" view="document_centre" onNavigate={onNavigate} />
          <Link label="My Performance" view="my_performance" onNavigate={onNavigate} />
        </div>
      </Panel>
    </div>
  );
};
