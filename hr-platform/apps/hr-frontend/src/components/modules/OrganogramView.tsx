"use client";

import React, { useEffect, useState } from "react";
import { call } from "./assetApi";
import { S } from "./assetStyles";

// Organogram under Company Admin. The tree is generated from the solid reporting lines. HR admins and HR directors
// fill in each person's job title. Importers: EnterpriseAppShell.tsx. Calls: org-chart and employees/:id/role.

interface OrgPerson {
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
}

export function OrganogramView() {
  const [people, setPeople] = useState<OrgPerson[] | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    call<{ results: OrgPerson[] }>("GET", "org-chart").then((r) => {
      if (cancelled) return;
      if (r.ok) {
        setPeople(r.data.results ?? []);
        setError("");
      } else {
        setError(r.data.error === "Forbidden" ? "Only HR admins and HR directors can open the organogram." : r.data.error ?? "The organogram could not be loaded.");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  if (error) {
    return (
      <section style={S.panel} aria-label="Organogram">
        <h2 style={{ ...S.h2, marginTop: 0 }}>Organogram</h2>
        <p role="alert" style={S.error}>{error}</p>
      </section>
    );
  }
  if (people === null) return <p role="status" style={S.note}>Loading organogram…</p>;

  const known = new Set(people.map((p) => p.id));
  const kids = new Map<number, OrgPerson[]>();
  const roots: OrgPerson[] = [];
  for (const p of people) {
    if (p.managerId !== null && known.has(p.managerId)) {
      const list = kids.get(p.managerId) ?? [];
      list.push(p);
      kids.set(p.managerId, list);
    } else {
      roots.push(p);
    }
  }

  return (
    <section style={S.panel} aria-label="Organogram">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <h2 style={{ ...S.h2, marginTop: 0 }}>Organogram</h2>
        <button type="button" style={S.btn} onClick={() => setReload((n) => n + 1)}>Regenerate</button>
      </div>
      <p style={S.note}>Generated from the solid reporting lines. HR fills in each person&apos;s job title.</p>
      {people.length === 0 ? (
        <p style={S.note}>No employees yet.</p>
      ) : (
        <ul style={{ listStyle: "none", margin: "0.75rem 0 0", padding: 0 }}>
          {roots.map((p) => (
            <OrgNode key={p.id} person={p} kids={kids} path={new Set<number>()} onSaved={() => setReload((n) => n + 1)} />
          ))}
        </ul>
      )}
    </section>
  );
}

function OrgNode({ person, kids, path, onSaved }: { person: OrgPerson; kids: Map<number, OrgPerson[]>; path: Set<number>; onSaved: () => void }) {
  const nextPath = new Set<number>([...path, person.id]);
  // Ancestors are excluded so a bad loop in the lines cannot recurse forever.
  const children = (kids.get(person.id) ?? []).filter((c) => !path.has(c.id));
  return (
    <li style={{ padding: "0.5rem 0" }}>
      <JobTitleRow person={person} onSaved={onSaved} />
      {children.length > 0 && (
        <ul style={{ listStyle: "none", margin: "0.25rem 0 0 0.5rem", padding: "0 0 0 1rem", borderLeft: "2px solid #d1d5db" }}>
          {children.map((c) => (
            <OrgNode key={c.id} person={c} kids={kids} path={nextPath} onSaved={onSaved} />
          ))}
        </ul>
      )}
    </li>
  );
}

function JobTitleRow({ person, onSaved }: { person: OrgPerson; onSaved: () => void }) {
  const [title, setTitle] = useState(person.jobTitle);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => setTitle(person.jobTitle), [person.jobTitle]);

  const save = async () => {
    setBusy(true);
    setMessage("");
    const r = await call("POST", `employees/${person.id}/role`, { jobTitle: title.trim() });
    setBusy(false);
    if (!r.ok) return setMessage(r.data.error ?? "The job title could not be saved.");
    onSaved();
  };

  const detail = [person.department, person.office].filter(Boolean).join(" · ");
  const unchanged = title.trim() === person.jobTitle;

  return (
    <div>
      <strong>{person.name}</strong>
      {detail && <span style={{ ...S.note, marginLeft: "0.5rem" }}>{detail}</span>}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", marginTop: "0.25rem" }}>
        <input
          aria-label={`Job title for ${person.name}`}
          maxLength={100}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ ...S.input, width: "240px" }}
        />
        <button type="button" style={S.btn} disabled={busy || title.trim().length < 2 || unchanged} onClick={save}>
          {busy ? "Saving…" : "Save title"}
        </button>
        <button type="button" style={S.btn} disabled={editing} onClick={() => setEditing(true)}>
          Edit details
        </button>
        {message && <span role="alert" style={S.error}>{message}</span>}
      </div>
      {editing && (
        <DetailsEditor
          person={person}
          onCancel={() => setEditing(false)}
          onDone={() => {
            setEditing(false);
            onSaved();
          }}
        />
      )}
    </div>
  );
}

// Name, email and office corrections for one person. HR only: the API refuses everyone else.
function DetailsEditor({ person, onDone, onCancel }: { person: OrgPerson; onDone: () => void; onCancel: () => void }) {
  const [firstName, setFirstName] = useState(person.firstName);
  const [lastName, setLastName] = useState(person.lastName);
  const [email, setEmail] = useState(person.email);
  const [office, setOffice] = useState(person.office ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const r = await call("POST", `employees/${person.id}/update`, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      office: office || null,
    });
    setBusy(false);
    if (!r.ok) return setMessage(r.data.error ?? "The details could not be saved.");
    onDone();
  };

  const label = { display: "flex", flexDirection: "column" as const, gap: "0.25rem", fontSize: "13px" };
  return (
    <form
      onSubmit={save}
      aria-label={`Details for ${person.name}`}
      style={{ marginTop: "0.5rem", padding: "0.75rem", border: "1px solid #d1d5db", background: "#f9fafb", display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", maxWidth: "720px" }}
    >
      <label style={label}>
        First name
        <input required maxLength={100} value={firstName} onChange={(e) => setFirstName(e.target.value)} style={S.input} />
      </label>
      <label style={label}>
        Last name
        <input required maxLength={100} value={lastName} onChange={(e) => setLastName(e.target.value)} style={S.input} />
      </label>
      <label style={label}>
        Email
        <input type="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} style={S.input} />
      </label>
      <label style={label}>
        Office
        <select value={office} onChange={(e) => setOffice(e.target.value)} style={S.input}>
          <option value="">Not set</option>
          <option value="London">London</option>
          <option value="Accra">Accra</option>
          <option value="Windhoek">Windhoek</option>
        </select>
      </label>
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" style={S.primary} disabled={busy}>
          {busy ? "Saving…" : "Save details"}
        </button>
        <button type="button" style={S.btn} onClick={onCancel}>
          Cancel
        </button>
        {message && <span role="alert" style={S.error}>{message}</span>}
      </div>
    </form>
  );
}
