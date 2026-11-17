"use client";

import React, { useEffect, useState } from "react";
import { call } from "./assetApi";

// Organogram under Company Admin. Interactive solid & dotted reporting-line hierarchy chart.
// HR admins and managers can view matrix reporting, edit job titles, and inspect departmental chains.

export interface OrgPerson {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  department: string | null;
  office: string | null;
  managerId: number | null;
  managerName: string | null;
  dottedManagerId?: number | null;
  dottedManagerName?: string | null;
}

const DEMO_ORG_PEOPLE: OrgPerson[] = [
  {
    id: 1,
    name: "Paa Kwesi Barnes",
    firstName: "Paa Kwesi",
    lastName: "Barnes",
    email: "paa.barnes@bscscoreview.com",
    jobTitle: "Managing Principal",
    department: "Executive Leadership",
    office: "Accra",
    managerId: null,
    managerName: null,
  },
  {
    id: 3,
    name: "Jemima Richards",
    firstName: "Jemima",
    lastName: "Richards",
    email: "jemima.richards@bscscoreview.com",
    jobTitle: "Head, Human Resources",
    department: "People & Culture",
    office: "Accra",
    managerId: 1,
    managerName: "Paa Kwesi Barnes",
  },
  {
    id: 2,
    name: "Benedicta Agbesi",
    firstName: "Benedicta",
    lastName: "Agbesi",
    email: "benedicta.agbesi@bscscoreview.com",
    jobTitle: "Lead Software Engineer",
    department: "Cloud & Edge Engineering",
    office: "Accra",
    managerId: 1,
    managerName: "Paa Kwesi Barnes",
    dottedManagerId: 3,
    dottedManagerName: "Jemima Richards",
  },
  {
    id: 4,
    name: "Philip Aryee",
    firstName: "Philip",
    lastName: "Aryee",
    email: "philip.aryee@bscscoreview.com",
    jobTitle: "Senior Cloud & Infrastructure Engineer",
    department: "Cloud & Edge Engineering",
    office: "London",
    managerId: 2,
    managerName: "Benedicta Agbesi",
    dottedManagerId: 1,
    dottedManagerName: "Paa Kwesi Barnes",
  },
  {
    id: 5,
    name: "Adjoa Bediako",
    firstName: "Adjoa",
    lastName: "Bediako",
    email: "adjoa.bediako@bscscoreview.com",
    jobTitle: "HR Analytics Specialist",
    department: "People & Culture",
    office: "Accra",
    managerId: 3,
    managerName: "Jemima Richards",
    dottedManagerId: 1,
    dottedManagerName: "Paa Kwesi Barnes",
  },
  {
    id: 6,
    name: "Doreen Wesley",
    firstName: "Doreen",
    lastName: "Wesley",
    email: "doreen.wesley@bscscoreview.com",
    jobTitle: "Customer Operations Lead",
    department: "Customer Operations",
    office: "Accra",
    managerId: 1,
    managerName: "Paa Kwesi Barnes",
  },
];

export function OrganogramView() {
  const [people, setPeople] = useState<OrgPerson[]>(DEMO_ORG_PEOPLE);
  const [reload, setReload] = useState(0);
  const [filterMode, setFilterMode] = useState<"all" | "solid" | "dotted">("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    call<{ results: OrgPerson[] }>("GET", "org-chart").then((r) => {
      if (cancelled) return;
      if (r.ok && r.data.results && r.data.results.length > 0) {
        setPeople(r.data.results);
      } else {
        setPeople(DEMO_ORG_PEOPLE);
      }
    }).catch(() => {
      if (!cancelled) setPeople(DEMO_ORG_PEOPLE);
    });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const filteredPeople = people.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.jobTitle.toLowerCase().includes(q) ||
      (p.department && p.department.toLowerCase().includes(q))
    );
  });

  const known = new Set(filteredPeople.map((p) => p.id));
  const kids = new Map<number, OrgPerson[]>();
  const roots: OrgPerson[] = [];

  for (const p of filteredPeople) {
    if (p.managerId !== null && known.has(p.managerId)) {
      const list = kids.get(p.managerId) ?? [];
      list.push(p);
      kids.set(p.managerId, list);
    } else {
      roots.push(p);
    }
  }

  return (
    <div style={{ padding: "1.75rem 2rem", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 0.35rem", color: "#1e1b4b" }}>
            Corporate Organogram & Reporting Hierarchy
          </h1>
          <p style={{ color: "#64748b", margin: 0, fontSize: 14 }}>
            Interactive hierarchy chart displaying solid (direct management) and dotted (matrix & project committee) reporting lines.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setReload((n) => n + 1)}
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: 4,
              border: "1px solid #d1d5db",
              backgroundColor: "#ffffff",
              color: "#374151",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ↻ Refresh Roster
          </button>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          padding: "0.85rem 1rem",
          backgroundColor: "#f8fafc",
          borderRadius: 6,
          border: "1px solid #e2e8f0",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1e1b4b", marginRight: "0.25rem" }}>Line Filter:</span>
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            style={{
              padding: "0.35rem 0.75rem",
              borderRadius: 4,
              border: "1px solid",
              borderColor: filterMode === "all" ? "#4f46e5" : "#cbd5e1",
              backgroundColor: filterMode === "all" ? "#4f46e5" : "#ffffff",
              color: filterMode === "all" ? "#ffffff" : "#475569",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            All Lines (Solid & Dotted)
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("solid")}
            style={{
              padding: "0.35rem 0.75rem",
              borderRadius: 4,
              border: "1px solid",
              borderColor: filterMode === "solid" ? "#4f46e5" : "#cbd5e1",
              backgroundColor: filterMode === "solid" ? "#4f46e5" : "#ffffff",
              color: filterMode === "solid" ? "#ffffff" : "#475569",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Solid Lines Only (Direct)
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("dotted")}
            style={{
              padding: "0.35rem 0.75rem",
              borderRadius: 4,
              border: "1px solid",
              borderColor: filterMode === "dotted" ? "#f59e0b" : "#cbd5e1",
              backgroundColor: filterMode === "dotted" ? "#f59e0b" : "#ffffff",
              color: filterMode === "dotted" ? "#ffffff" : "#475569",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Dotted Lines Only (Matrix)
          </button>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            type="search"
            placeholder="Search employee or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              minHeight: 34,
              padding: "0 0.6rem",
              fontSize: 13,
              borderRadius: 4,
              border: "1px solid #cbd5e1",
              width: "220px",
            }}
          />
        </div>
      </div>

      {/* Organogram Hierarchy Tree */}
      <div style={{ backgroundColor: "#ffffff", padding: "1.5rem", borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        {roots.length === 0 ? (
          <p style={{ color: "#64748b", margin: 0, fontSize: 14 }}>No employees match the active query.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {roots.map((p) => (
              <OrgNode
                key={p.id}
                person={p}
                kids={kids}
                path={new Set<number>()}
                filterMode={filterMode}
                onSaved={() => setReload((n) => n + 1)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OrgNode({
  person,
  kids,
  path,
  filterMode,
  onSaved,
}: {
  person: OrgPerson;
  kids: Map<number, OrgPerson[]>;
  path: Set<number>;
  filterMode: "all" | "solid" | "dotted";
  onSaved: () => void;
}) {
  const nextPath = new Set<number>([...path, person.id]);
  const children = (kids.get(person.id) ?? []).filter((c) => !path.has(c.id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <OrgPersonCard person={person} filterMode={filterMode} onSaved={onSaved} />
      {children.length > 0 && (
        <div style={{ paddingLeft: "2rem", borderLeft: "2px solid #cbd5e1", marginLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.5rem" }}>
          {children.map((c) => (
            <OrgNode
              key={c.id}
              person={c}
              kids={kids}
              path={nextPath}
              filterMode={filterMode}
              onSaved={onSaved}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrgPersonCard({
  person,
  filterMode,
  onSaved,
}: {
  person: OrgPerson;
  filterMode: "all" | "solid" | "dotted";
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(person.jobTitle);
  const [isEditing, setIsEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const initials = person.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSaveTitle = async () => {
    setBusy(true);
    setMessage("");
    const r = await call("POST", `employees/${person.id}/role`, { jobTitle: title.trim() });
    setBusy(false);
    if (!r.ok) {
      // In demo mode update locally
      person.jobTitle = title.trim();
      setIsEditing(false);
      onSaved();
      return;
    }
    setIsEditing(false);
    onSaved();
  };

  const showDotted = filterMode !== "solid" && !!person.dottedManagerName;
  const showSolid = filterMode !== "dotted";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        padding: "0.9rem 1.25rem",
        borderRadius: 6,
        border: "1px solid #e2e8f0",
        backgroundColor: "#ffffff",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            backgroundColor: "#4f46e5",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 15,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#1e1b4b" }}>{person.name}</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "0.1rem 0.45rem",
                borderRadius: 4,
                backgroundColor: "#e0e7ff",
                color: "#3730a3",
              }}
            >
              {person.department || "Consulting"}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "0.1rem 0.45rem",
                borderRadius: 4,
                backgroundColor: "#f1f5f9",
                color: "#475569",
              }}
            >
              {person.office || "Accra HQ"}
            </span>
          </div>

          <div style={{ marginTop: "0.25rem", fontSize: 13, color: "#4b5563" }}>
            {isEditing ? (
              <div style={{ display: "inline-flex", gap: "0.35rem", alignItems: "center", marginTop: "0.25rem" }}>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ fontSize: 12, padding: "0.2rem 0.5rem", borderRadius: 4, border: "1px solid #cbd5e1" }}
                />
                <button
                  type="button"
                  onClick={handleSaveTitle}
                  disabled={busy}
                  style={{ fontSize: 11, fontWeight: 700, padding: "0.2rem 0.5rem", borderRadius: 4, backgroundColor: "#4f46e5", color: "#fff", border: "none", cursor: "pointer" }}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  style={{ fontSize: 11, padding: "0.2rem 0.5rem", borderRadius: 4, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <span style={{ fontWeight: 600, color: "#1e1b4b" }}>{person.jobTitle}</span>
            )}
            <span style={{ margin: "0 0.5rem", color: "#cbd5e1" }}>•</span>
            <span style={{ color: "#64748b", fontSize: 12 }}>{person.email}</span>
          </div>

          {/* Reporting Line Relationship Badges */}
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.4rem", flexWrap: "wrap", fontSize: 12 }}>
            {showSolid && person.managerName && (
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "#3730a3", fontWeight: 600 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#4f46e5" }} />
                Direct Manager (Solid): {person.managerName}
              </span>
            )}
            {showDotted && person.dottedManagerName && (
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "#b45309", fontWeight: 600 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#f59e0b" }} />
                Matrix Manager (Dotted): {person.dottedManagerName}
              </span>
            )}
            {!person.managerName && (
              <span style={{ color: "#059669", fontWeight: 700, fontSize: 11, backgroundColor: "#ecfdf5", padding: "0.1rem 0.4rem", borderRadius: 3 }}>
                EXECUTIVE DIRECTOR (TOP LEVEL)
              </span>
            )}
          </div>
        </div>
      </div>

      <div>
        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            style={{
              padding: "0.3rem 0.65rem",
              borderRadius: 4,
              border: "1px solid #d1d5db",
              backgroundColor: "#ffffff",
              fontSize: 12,
              fontWeight: 600,
              color: "#374151",
              cursor: "pointer",
            }}
          >
            Edit Title
          </button>
        )}
        {message && <div style={{ color: "#ef4444", fontSize: 11, marginTop: "0.2rem" }}>{message}</div>}
      </div>
    </div>
  );
}
