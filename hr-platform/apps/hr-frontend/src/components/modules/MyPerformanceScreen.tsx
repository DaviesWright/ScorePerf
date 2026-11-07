"use client";

import React from "react";
import { C, Muted, Notice, card, cell, useLoad } from "./selfServiceUi";

// Personal performance. Read only: my objectives in the cycle, their weighted progress and where my review stands.

interface Objective {
  id: number;
  title: string;
  weight: number;
  target: string;
  metric: string;
  status: string;
  progress: number;
  locked: boolean;
}

interface MyPerformance {
  cycle: { id: number; title: string; status: string; startDate: string; endDate: string } | null;
  objectives: Objective[];
  progress: number | null;
  reviews: { status: string; updatedAt: string }[];
  assignmentStatus: string | null;
}

const OBJECTIVE_STATUS: Record<string, string> = { draft: "Draft", submitted: "Waiting for approval", approved: "Approved", returned: "Returned for changes" };

export const MyPerformanceScreen: React.FC<{ user: { id: string; persona: string }; realSession: boolean }> = () => {
  const page = useLoad<MyPerformance>("/api/hr/performance/me");

  return (
    <div style={{ padding: "1.5rem", maxWidth: 960 }}>
      <h1 style={{ fontSize: 22, margin: "0 0 0.25rem" }}>My performance</h1>
      <Muted>Your objectives and review status. This page is for reading only; changes go through your manager and HR.</Muted>
      {page.loading && <p role="status">Loading…</p>}
      <Notice kind="error" text={page.error || null} />

      {page.data && !page.data.cycle && <p style={{ color: C.muted }}>No performance cycle has been set up yet.</p>}

      {page.data?.cycle && (
        <>
          <section style={card} aria-labelledby="cycle-heading">
            <h2 id="cycle-heading" style={{ fontSize: 18, margin: "0 0 0.5rem" }}>
              {page.data.cycle.title}
            </h2>
            <p style={{ margin: "0 0 0.25rem" }}>
              {page.data.cycle.startDate} to {page.data.cycle.endDate}. Cycle status: {page.data.cycle.status}.
            </p>
            <p style={{ margin: "0.5rem 0 0", fontSize: 16 }}>
              <strong>Weighted progress: </strong>
              {page.data.progress === null ? "No weighted objectives yet" : `${page.data.progress}%`}
            </p>
          </section>

          <section style={card} aria-labelledby="objectives-heading">
            <h2 id="objectives-heading" style={{ fontSize: 18, margin: "0 0 0.5rem" }}>
              My objectives
            </h2>
            {page.data.objectives.length === 0 && <p style={{ color: C.muted }}>You have no objectives in this cycle.</p>}
            {page.data.objectives.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
                  <thead>
                    <tr>
                      <th style={cell}>Objective</th>
                      <th style={cell}>Weight</th>
                      <th style={cell}>Target</th>
                      <th style={cell}>Status</th>
                      <th style={cell}>Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.data.objectives.map((o) => (
                      <tr key={o.id}>
                        <td style={cell}>{o.title}</td>
                        <td style={cell}>{o.weight}%</td>
                        <td style={cell}>{o.target || "—"}</td>
                        <td style={cell}>{OBJECTIVE_STATUS[o.status] ?? o.status}</td>
                        <td style={cell}>{o.progress}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section style={card} aria-labelledby="review-heading">
            <h2 id="review-heading" style={{ fontSize: 18, margin: "0 0 0.5rem" }}>
              Review status
            </h2>
            <p style={{ margin: "0 0 0.5rem" }}>
              Assignment: <strong>{page.data.assignmentStatus ?? "Not assigned"}</strong>
            </p>
            {page.data.reviews.length === 0 ? (
              <p style={{ color: C.muted, margin: 0 }}>No review has started for you in this cycle.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                {page.data.reviews.map((r, i) => (
                  <li key={i}>
                    {r.status} (updated {new Date(r.updatedAt).toLocaleDateString()})
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section style={card} aria-labelledby="checkins-heading">
            <h2 id="checkins-heading" style={{ fontSize: 18, margin: "0 0 0.5rem" }}>
              Check-ins
            </h2>
            <p style={{ color: C.muted, margin: 0 }}>Check-ins are not recorded in this platform yet, so none are shown here.</p>
          </section>
        </>
      )}
    </div>
  );
};
