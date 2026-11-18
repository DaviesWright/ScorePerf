"use client";

import React, { useEffect, useMemo, useState } from "react";
import { canEditObjective, checkWeights, isDecider, isHr, totalWeight, type AccessRole } from "@hr-platform/shared";
import { formatDateTime } from "../../utils/date";
import { ProgressHeatmap } from "./ProgressHeatmap";
import {
  createMemoryObjectivesApi,
  httpObjectivesApi,
  type AmendmentView,
  type CycleInfo,
  type ObjectiveFields,
  type ObjectiveView,
  type ObjectivesApi,
} from "../../lib/objectivesApi";

// Plain Objectives screens: My objectives (draft, submit, track progress), Approvals (managers and HR), and
// Amendments (HR). Approved objectives are locked: they show no edit or delete control, and the only way to
// change one is an HR amendment with a reason. Visual language matches PlainShell.

type Tab = "mine" | "approvals" | "amend" | "progress";

const C = { text: "#1f2937", muted: "#4b5563", border: "#d1d5db", surface: "#ffffff", page: "#f9fafb", accent: "#1d4ed8", danger: "#b91c1c", ok: "#166534", warn: "#92400e" };

const S = {
  page: { padding: "1.5rem", maxWidth: "1100px" } as React.CSSProperties,
  h1: { margin: "0 0 1rem", fontSize: "22px" } as React.CSSProperties,
  h2: { margin: "1.5rem 0 0.5rem", fontSize: "17px" } as React.CSSProperties,
  tabs: { display: "flex", gap: "0.25rem", flexWrap: "wrap", borderBottom: `1px solid ${C.border}`, marginBottom: "1rem" } as React.CSSProperties,
  table: { width: "100%", borderCollapse: "collapse", background: C.surface, border: `1px solid ${C.border}` } as React.CSSProperties,
  th: { textAlign: "left", padding: "0.6rem 0.75rem", borderBottom: `1px solid ${C.border}`, background: C.page, fontWeight: 600 } as React.CSSProperties,
  td: { padding: "0.6rem 0.75rem", borderBottom: `1px solid ${C.border}`, verticalAlign: "top" } as React.CSSProperties,
  btn: { minHeight: "40px", padding: "0 0.9rem", border: `1px solid ${C.border}`, borderRadius: "4px", background: C.surface, color: C.text, font: "inherit", cursor: "pointer" } as React.CSSProperties,
  primary: { minHeight: "44px", padding: "0 1.2rem", border: `1px solid ${C.accent}`, borderRadius: "4px", background: C.accent, color: "#ffffff", font: "inherit", cursor: "pointer" } as React.CSSProperties,
  field: { display: "flex", flexDirection: "column", gap: "0.3rem", marginBottom: "1rem" } as React.CSSProperties,
  input: { minHeight: "40px", padding: "0.4rem 0.6rem", border: `1px solid ${C.border}`, borderRadius: "4px", font: "inherit", background: C.surface } as React.CSSProperties,
  note: { color: C.muted, margin: "0.25rem 0 0" } as React.CSSProperties,
  panel: { border: `1px solid ${C.border}`, background: C.surface, padding: "1rem", marginBottom: "1rem" } as React.CSSProperties,
};

const STATUS_COLOR: Record<string, string> = { draft: C.muted, submitted: C.warn, approved: C.ok, returned: C.danger };
const STATUS_LABEL: Record<string, string> = { draft: "Draft", submitted: "Awaiting approval", approved: "Approved (locked)", returned: "Returned for changes" };

function Status({ value }: { value: string }) {
  const color = STATUS_COLOR[value] ?? C.muted;
  return (
    <span style={{ display: "inline-block", padding: "0.1rem 0.5rem", border: `1px solid ${color}`, borderRadius: "3px", color, fontWeight: 600 }}>
      {STATUS_LABEL[value] ?? value}
    </span>
  );
}

const Caption = ({ children }: { children: string }) => <caption style={{ textAlign: "left", position: "absolute", left: "-9999px" }}>{children}</caption>;

function useLoad<T>(load: () => Promise<T>, deps: React.DependencyList) {
  const [state, setState] = useState<{ data: T | null; error: string; loading: boolean }>({ data: null, error: "", loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: "" }));
    load()
      .then((data) => !cancelled && setState({ data, error: "", loading: false }))
      .catch((e: unknown) => !cancelled && setState({ data: null, error: e instanceof Error ? e.message : "Could not load.", loading: false }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { ...state, reload: () => setTick((n) => n + 1) };
}

function LoadState({ loading, error }: { loading: boolean; error: string }) {
  if (loading) return <p role="status">Loading…</p>;
  if (error) return <p role="alert" style={{ color: C.danger }}>{error}</p>;
  return null;
}

const CycleLine = ({ cycle }: { cycle: CycleInfo }) => (
  <p style={S.note}>
    Cycle: <strong>{cycle.title}</strong>. {cycle.open ? "Goal setting is open." : "Goal setting is closed, so objectives can no longer be added or changed."}
  </p>
);

/** Real API for a real session (numeric database id), in-memory demo for the demo login. */
export const ObjectivesScreen: React.FC<{ user: { id: string; persona: AccessRole }; realSession: boolean }> = ({ user, realSession }) => {
  const userId = Number(user.id.replace(/\D/g, "")) || 0;
  const api = useMemo(
    () => (realSession ? httpObjectivesApi : createMemoryObjectivesApi({ userId, role: user.persona })),
    [realSession, userId, user.persona]
  );
  return <ObjectivesSimple key={`${realSession}-${user.id}-${user.persona}`} api={api} user={{ userId, role: user.persona }} />;
};

export const ObjectivesSimple: React.FC<{ api: ObjectivesApi; user: { userId: number; role: AccessRole } }> = ({ api, user }) => {
  const [tab, setTab] = useState<Tab>("mine");
  const [message, setMessage] = useState("");
  const tabs: { key: Tab; label: string }[] = [
    { key: "mine", label: "My objectives" },
    ...(isDecider(user.role) ? [{ key: "approvals" as Tab, label: "Approvals" }] : []),
    ...(isHr(user.role) ? [{ key: "amend" as Tab, label: "Amendments" }] : []),
    ...(isHr(user.role) ? [{ key: "progress" as Tab, label: "Progress" }] : []),
  ];

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Objectives</h1>
      <div role="tablist" aria-label="Objectives sections" style={S.tabs}>
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={tab === t.key}
            onClick={() => {
              setTab(t.key);
              setMessage("");
            }}
            style={{ ...S.btn, border: "none", borderBottom: `3px solid ${tab === t.key ? C.accent : "transparent"}`, borderRadius: 0, fontWeight: tab === t.key ? 700 : 400, color: tab === t.key ? C.accent : C.text }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {message && <p role="status" style={{ color: C.ok, fontWeight: 600 }}>{message}</p>}
      {tab === "mine" && <MyObjectives api={api} user={user} onMessage={setMessage} />}
      {tab === "approvals" && isDecider(user.role) && <Approvals api={api} onMessage={setMessage} />}
      {tab === "amend" && isHr(user.role) && <Amendments api={api} onMessage={setMessage} />}
      {tab === "progress" && isHr(user.role) && <ProgressHeatmap />}
    </div>
  );
};

interface Draft {
  id: number | null;
  title: string;
  weight: string;
  target: string;
  metric: string;
}
const EMPTY: Draft = { id: null, title: "", weight: "", target: "", metric: "" };

function ObjectiveForm({ draft, setDraft, onSave, onCancel, saving, error }: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string;
}) {
  return (
    <form
      style={{ ...S.panel, maxWidth: "560px" }}
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <h2 style={{ ...S.h2, marginTop: 0 }}>{draft.id === null ? "Add an objective" : "Edit objective"}</h2>
      <label style={S.field}>
        Objective *
        <input required minLength={3} maxLength={200} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} style={S.input} />
      </label>
      <label style={S.field}>
        Weight (% of your total) *
        <input required type="number" min={0.01} max={100} step={0.01} value={draft.weight} onChange={(e) => setDraft({ ...draft, weight: e.target.value })} style={S.input} />
      </label>
      <label style={S.field}>
        Target
        <input maxLength={255} value={draft.target} onChange={(e) => setDraft({ ...draft, target: e.target.value })} style={S.input} />
      </label>
      <label style={S.field}>
        How it is measured
        <input maxLength={255} value={draft.metric} onChange={(e) => setDraft({ ...draft, metric: e.target.value })} style={S.input} />
      </label>
      {error && <p role="alert" style={{ color: C.danger, fontWeight: 600 }}>{error}</p>}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button type="submit" style={S.primary} disabled={saving}>{saving ? "Saving…" : "Save objective"}</button>
        <button type="button" style={S.btn} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function MyObjectives({ api, user, onMessage }: { api: ObjectivesApi; user: { userId: number; role: AccessRole }; onMessage: (m: string) => void }) {
  const { data, error, loading, reload } = useLoad(() => api.me(), [api]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Record<number, string>>({});

  const objectives = data?.objectives ?? [];
  const cycle = data?.cycle ?? null;
  const total = totalWeight(objectives.map((o) => o.weight));
  const weightProblem = objectives.length > 0 ? checkWeights(objectives.map((o) => o.weight)) : null;
  const pendingSubmit = objectives.some((o) => o.status === "draft" || o.status === "returned");
  const lockedAny = objectives.some((o) => o.locked);

  const run = async (fn: () => Promise<{ ok: true } | { ok: false; error: string }>, done?: string): Promise<boolean> => {
    setBusy(true);
    setActionError("");
    const r = await fn();
    setBusy(false);
    if (!r.ok) {
      setActionError(r.error);
      return false;
    }
    if (done) onMessage(done);
    reload();
    return true;
  };

  const save = async () => {
    if (!draft || !cycle) return;
    const fields: ObjectiveFields = { title: draft.title, weight: Number(draft.weight), target: draft.target, metric: draft.metric };
    setBusy(true);
    setFormError("");
    const r = draft.id === null ? await api.create(cycle.id, fields) : await api.update(draft.id, fields);
    setBusy(false);
    if (!r.ok) return setFormError(r.error);
    setDraft(null);
    reload();
  };

  return (
    <>
      <LoadState loading={loading && !data} error={error} />
      {data && !cycle && <p style={S.note}>No performance cycle is open for goal setting yet. HR opens one by moving a cycle to configured.</p>}
      {data && cycle && (
        <>
          <CycleLine cycle={cycle} />
          <p aria-live="polite" style={{ fontWeight: 600, color: objectives.length === 0 || total === 100 ? C.text : C.warn }}>
            Total weight: {total}% of 100%
          </p>
          {lockedAny && <p style={S.note}>Approved objectives are locked. To change one, ask HR to record an amendment.</p>}
          {actionError && <p role="alert" style={{ color: C.danger, fontWeight: 600 }}>{actionError}</p>}

          {objectives.length === 0 ? (
            <p style={S.note}>You have not set any objectives for this cycle.</p>
          ) : (
            <table style={S.table}>
              <Caption>My objectives</Caption>
              <thead>
                <tr>{["Objective", "Target", "Measured by", "Weight", "Status", "Progress", "Action"].map((h) => <th key={h} scope="col" style={S.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {objectives.map((o: ObjectiveView) => {
                  const editable = cycle.open && canEditObjective({ userId: user.userId, role: user.role }, { id: o.id, employeeId: o.employeeId, status: o.status, weight: o.weight });
                  return (
                    <tr key={o.id}>
                      <td style={S.td}><strong>{o.title}</strong></td>
                      <td style={S.td}>{o.target || "-"}</td>
                      <td style={S.td}>{o.metric || "-"}</td>
                      <td style={S.td}>{o.weight}%</td>
                      <td style={S.td}><Status value={o.status} /></td>
                      <td style={S.td}>
                        {o.status === "approved" ? (
                          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
                            <label>
                              <span style={{ position: "absolute", left: "-9999px" }}>Progress for {o.title}, percent</span>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={progress[o.id] ?? String(o.progress)}
                                onChange={(e) => setProgress({ ...progress, [o.id]: e.target.value })}
                                style={{ ...S.input, width: "5.5rem" }}
                              />
                            </label>
                            <button type="button" style={S.btn} disabled={busy} onClick={() => run(() => api.progress(o.id, Number(progress[o.id] ?? o.progress)), "Progress saved.")}>
                              Save
                            </button>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td style={S.td}>
                        {editable ? (
                          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              style={S.btn}
                              onClick={() => {
                                setFormError("");
                                setDraft({ id: o.id, title: o.title, weight: String(o.weight), target: o.target, metric: o.metric });
                              }}
                              aria-label={`Edit ${o.title}`}
                            >
                              Edit
                            </button>
                            <button type="button" style={{ ...S.btn, color: C.danger, borderColor: C.danger }} disabled={busy} onClick={() => run(() => api.remove(o.id))} aria-label={`Delete ${o.title}`}>
                              Delete
                            </button>
                          </div>
                        ) : o.locked ? (
                          <span style={{ color: C.muted }}>Locked</span>
                        ) : (
                          <span style={{ color: C.muted }}>With approver</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {weightProblem && pendingSubmit && <p role="status" style={{ color: C.warn }}>{weightProblem} You can submit once they total 100%.</p>}

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", margin: "1rem 0" }}>
            {cycle.open && !draft && (
              <button type="button" style={S.btn} onClick={() => { setFormError(""); setDraft({ ...EMPTY }); }}>
                Add an objective
              </button>
            )}
            {cycle.open && pendingSubmit && (
              <button type="button" style={S.primary} disabled={busy || weightProblem !== null} onClick={() => run(() => api.submit(cycle.id), "Submitted. Your objectives are now awaiting approval.")}>
                Submit for approval
              </button>
            )}
          </div>

          {draft && <ObjectiveForm draft={draft} setDraft={setDraft} onSave={save} onCancel={() => setDraft(null)} saving={busy} error={formError} />}
        </>
      )}
    </>
  );
}

function Approvals({ api, onMessage }: { api: ObjectivesApi; onMessage: (m: string) => void }) {
  const { data, error, loading, reload } = useLoad(() => api.pending(), [api]);
  const [busy, setBusy] = useState<number | null>(null);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");

  const groups = useMemo(() => {
    const map = new Map<number, ObjectiveView[]>();
    for (const o of data?.results ?? []) map.set(o.employeeId, [...(map.get(o.employeeId) ?? []), o]);
    return [...map.entries()];
  }, [data]);

  const decide = async (employeeId: number, decision: "approve" | "return") => {
    if (!data?.cycle) return;
    setBusy(employeeId);
    setActionError("");
    const r = await api.decide(data.cycle.id, employeeId, decision);
    setBusy(null);
    setConfirming(null);
    if (!r.ok) setActionError(r.error);
    else onMessage(decision === "approve" ? "Approved. These objectives are now locked." : "Returned. The employee can edit and resubmit.");
    reload();
  };

  return (
    <>
      <h2 style={{ ...S.h2, marginTop: 0 }}>Objectives awaiting approval {data ? `(${groups.length} ${groups.length === 1 ? "person" : "people"})` : ""}</h2>
      <p style={S.note}>Approving locks the objectives. After that they change only through an HR amendment.</p>
      <LoadState loading={loading && !data} error={error} />
      {actionError && <p role="alert" style={{ color: C.danger }}>{actionError}</p>}
      {data && groups.length === 0 && <p style={S.note}>Nothing is waiting for approval.</p>}
      {groups.map(([employeeId, items]) => (
        <section key={employeeId} style={S.panel} aria-label={`Objectives of ${items[0].employeeName ?? `Employee ${employeeId}`}`}>
          <h3 style={{ margin: "0 0 0.5rem", fontSize: "16px" }}>
            {items[0].employeeName ?? `Employee ${employeeId}`}
            {items[0].department ? <span style={{ color: C.muted, fontWeight: 400 }}> ({items[0].department})</span> : null}
          </h3>
          <table style={S.table}>
            <Caption>Submitted objectives</Caption>
            <thead>
              <tr>{["Objective", "Target", "Measured by", "Weight"].map((h) => <th key={h} scope="col" style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr key={o.id}>
                  <td style={S.td}><strong>{o.title}</strong></td>
                  <td style={S.td}>{o.target || "-"}</td>
                  <td style={S.td}>{o.metric || "-"}</td>
                  <td style={S.td}>{o.weight}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontWeight: 600 }}>Total weight: {totalWeight(items.map((o) => o.weight))}%</p>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            <button type="button" style={S.primary} disabled={busy === employeeId} onClick={() => decide(employeeId, "approve")}>
              Approve and lock
            </button>
            {confirming === employeeId ? (
              <>
                <button type="button" style={{ ...S.btn, borderColor: C.danger, color: C.danger }} disabled={busy === employeeId} onClick={() => decide(employeeId, "return")}>
                  Confirm return
                </button>
                <button type="button" style={S.btn} onClick={() => setConfirming(null)}>Keep waiting</button>
              </>
            ) : (
              <button type="button" style={S.btn} onClick={() => setConfirming(employeeId)}>Return for changes</button>
            )}
          </div>
        </section>
      ))}
    </>
  );
}

function Amendments({ api, onMessage }: { api: ObjectivesApi; onMessage: (m: string) => void }) {
  const list = useLoad(() => api.all(), [api]);
  const log = useLoad(() => api.amendments(), [api]);
  const [target, setTarget] = useState<ObjectiveView | null>(null);
  const [form, setForm] = useState({ title: "", weight: "", targetText: "", metric: "", reason: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const open = (o: ObjectiveView) => {
    setFormError("");
    setTarget(o);
    setForm({ title: o.title, weight: String(o.weight), targetText: o.target, metric: o.metric, reason: "" });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    setSaving(true);
    setFormError("");
    const r = await api.amend(target.id, { reason: form.reason.trim(), title: form.title, weight: Number(form.weight), target: form.targetText, metric: form.metric });
    setSaving(false);
    if (!r.ok) return setFormError(r.error);
    setTarget(null);
    onMessage("Amendment recorded.");
    list.reload();
    log.reload();
  };

  const approved = (list.data?.results ?? []).filter((o) => o.status === "approved");

  return (
    <>
      <h2 style={{ ...S.h2, marginTop: 0 }}>Amend an approved objective</h2>
      <p style={S.note}>Each amendment records who changed what, the old and new values, and your reason. The owner&apos;s weights must still total 100%.</p>
      <LoadState loading={list.loading && !list.data} error={list.error} />
      {list.data && approved.length === 0 && <p style={S.note}>There are no approved objectives to amend.</p>}
      {approved.length > 0 && (
        <table style={S.table}>
          <Caption>Approved objectives</Caption>
          <thead>
            <tr>{["Employee", "Objective", "Weight", "Action"].map((h) => <th key={h} scope="col" style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {approved.map((o) => (
              <tr key={o.id}>
                <td style={S.td}>{o.employeeName ?? `Employee ${o.employeeId}`}</td>
                <td style={S.td}><strong>{o.title}</strong></td>
                <td style={S.td}>{o.weight}%</td>
                <td style={S.td}>
                  <button type="button" style={S.btn} onClick={() => open(o)} aria-label={`Amend ${o.title} for ${o.employeeName ?? `employee ${o.employeeId}`}`}>
                    Amend
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {target && (
        <form onSubmit={save} style={{ ...S.panel, maxWidth: "560px", marginTop: "1rem" }}>
          <h3 style={{ margin: "0 0 0.75rem", fontSize: "16px" }}>Amend: {target.title}</h3>
          <label style={S.field}>Objective<input required minLength={3} maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={S.input} /></label>
          <label style={S.field}>Weight (%)<input required type="number" min={0.01} max={100} step={0.01} value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} style={S.input} /></label>
          <label style={S.field}>Target<input maxLength={255} value={form.targetText} onChange={(e) => setForm({ ...form, targetText: e.target.value })} style={S.input} /></label>
          <label style={S.field}>Measured by<input maxLength={255} value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })} style={S.input} /></label>
          <label style={S.field}>
            Reason for the amendment *
            <textarea required minLength={5} maxLength={1000} rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} style={{ ...S.input, minHeight: "80px" }} />
          </label>
          {formError && <p role="alert" style={{ color: C.danger, fontWeight: 600 }}>{formError}</p>}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button type="submit" style={S.primary} disabled={saving}>{saving ? "Saving…" : "Record amendment"}</button>
            <button type="button" style={S.btn} onClick={() => setTarget(null)}>Cancel</button>
          </div>
        </form>
      )}

      <h2 style={S.h2}>Amendment history</h2>
      <LoadState loading={log.loading && !log.data} error={log.error} />
      {log.data && log.data.length === 0 && <p style={S.note}>No objective has been amended.</p>}
      {log.data && log.data.length > 0 && (
        <table style={S.table}>
          <Caption>Amendment history</Caption>
          <thead>
            <tr>{["When", "Employee", "Objective", "Change", "Reason", "By"].map((h) => <th key={h} scope="col" style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {log.data.map((a: AmendmentView) => (
              <tr key={a.id}>
                <td style={S.td}>{formatDateTime(a.createdAt)}</td>
                <td style={S.td}>{a.owner ?? "-"}</td>
                <td style={S.td}>{a.objectiveTitle ?? "(removed)"}</td>
                <td style={S.td}>{describeChange(a)}</td>
                <td style={S.td}>{a.reason}</td>
                <td style={S.td}>{a.amendedBy ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function describeChange(a: AmendmentView): string {
  const names: (keyof ObjectiveFields)[] = ["title", "weight", "target", "metric"];
  const parts = names
    .filter((k) => a.before[k] !== a.after[k])
    .map((k) => `${k}: ${String(a.before[k] ?? "-")} to ${String(a.after[k] ?? "-")}`);
  return parts.join("; ") || "-";
}
