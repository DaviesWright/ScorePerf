"use client";

import React, { useEffect, useState } from "react";
import { colors, radii, shadows, typography } from "../../design-system/tokens";
import { useRealSession } from "../../lib/sessionMode";
import { call } from "./assetApi";

// "My squad" for employees: the squads you belong to or lead, and who else is in them (to-do P1).
// Signed in, the list comes from the API, which only returns squads you are part of, with each colleague's
// name, job title and department. In the demo, members are worked out from the sample team names.

interface SquadMember {
  id: number;
  name: string;
  jobTitle: string;
  department: string | null;
}
interface MySquad {
  id: number;
  name: string;
  leadName: string | null;
  mission: string;
  members: SquadMember[];
}

export const MySquadCard: React.FC<{ demoSquads?: MySquad[] }> = ({ demoSquads = [] }) => {
  const realSession = useRealSession();
  const [squads, setSquads] = useState<MySquad[] | null>(realSession ? null : demoSquads);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!realSession) {
      setSquads(demoSquads);
      return;
    }
    let cancelled = false;
    call<{ results: MySquad[] }>("GET", "squads/me").then((r) => {
      if (cancelled) return;
      if (!r.ok) setError(r.data.error ?? "Could not load your squads.");
      else setSquads(r.data.results ?? []);
    });
    return () => {
      cancelled = true;
    };
    // demoSquads is rebuilt each render in the demo; its content only changes with the persona.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realSession]);

  return (
    <section
      aria-label="My squad"
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radii.lg,
        padding: "1rem 1.25rem",
        margin: "1rem 1.5rem",
        boxShadow: shadows.xs,
      }}
    >
      <h2 style={{ margin: 0, fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary }}>My squad</h2>
      <p style={{ margin: "0.15rem 0 0.75rem", fontSize: typography.sizes.xs, color: colors.textMuted }}>
        The groups you belong to and the colleagues in them.
      </p>
      {error && <div role="alert" style={{ fontSize: 12, color: "#991b1b" }}>{error}</div>}
      {!error && squads === null && <div style={{ fontSize: 12, color: colors.textMuted }}>Loading…</div>}
      {!error && squads !== null && squads.length === 0 && (
        <div style={{ fontSize: 12, color: colors.textMuted }}>You are not in a squad yet. Your manager or HR can add you.</div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "0.75rem" }}>
        {(squads ?? []).map((s) => (
          <div key={s.id} style={{ border: `1px solid ${colors.borderSubtle}`, borderRadius: radii.md, padding: "0.75rem" }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: colors.textPrimary }}>{s.name}</div>
            <div style={{ fontSize: 11, color: colors.textMuted, margin: "0.15rem 0 0.5rem" }}>
              Lead: {s.leadName ?? "Not set"} · {s.members.length} {s.members.length === 1 ? "member" : "members"}
            </div>
            {s.mission && <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: "0.5rem" }}>{s.mission}</div>}
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.25rem" }}>
              {s.members.map((m) => (
                <li key={m.id} style={{ fontSize: 12, color: colors.textPrimary }}>
                  {m.name}
                  <span style={{ color: colors.textMuted }}>
                    {" "}· {m.jobTitle}
                    {m.department ? `, ${m.department}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
};
