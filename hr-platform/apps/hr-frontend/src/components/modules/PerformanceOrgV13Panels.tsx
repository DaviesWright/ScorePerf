"use client";

import React, { useCallback, useEffect, useState } from "react";

export function ContextualOrganogramDrawer({
  open,
  focusEmployeeId,
  onClose,
  onOpenAdminOrg,
}: {
  open: boolean;
  focusEmployeeId?: string;
  onClose: () => void;
  onOpenAdminOrg?: () => void;
}) {
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [overlay, setOverlay] = useState<"objectives" | "alignment">("objectives");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadContextual = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ asOf, depth: "2", overlay });
      if (focusEmployeeId) qs.set("focusId", focusEmployeeId);
      const res = await fetch(`/api/hr/performance/org/contextual?${qs.toString()}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [open, focusEmployeeId, asOf, overlay]);

  useEffect(() => {
    void loadContextual();
  }, [loadContextual]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[1px]">
      <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Contextual Organogram</h3>
            <p className="text-xs text-slate-500">Effective-dated reporting chain, matrix links & objective coverage</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-5 py-2.5">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            As at:
            <input
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
              className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"
            />
          </label>
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setOverlay("objectives")}
              className={`rounded px-2 py-1 font-medium ${overlay === "objectives" ? "bg-indigo-600 text-white" : "text-slate-600"}`}
            >
              Objectives
            </button>
            <button
              type="button"
              onClick={() => setOverlay("alignment")}
              className={`rounded px-2 py-1 font-medium ${overlay === "alignment" ? "bg-indigo-600 text-white" : "text-slate-600"}`}
            >
              Alignment
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading organogram subgraph...</div>
          ) : !data ? (
            <div className="py-8 text-center text-xs text-slate-500">No organogram data available.</div>
          ) : (
            <>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">Focus Node</div>
                    <div className="text-sm font-bold text-slate-900">{data.focus?.name}</div>
                    <div className="text-xs text-slate-600">{data.focus?.role}</div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      data.focus?.objectivePolicyValid
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {data.focus?.objectiveCount ?? 0} / 8–10 objectives
                  </span>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Reporting Chain (to Root)
                </h4>
                <div className="space-y-1.5">
                  {(data.reportingChain ?? []).map((node: any, idx: number) => (
                    <div
                      key={node.employeeId}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                    >
                      <div>
                        <span className="mr-2 text-slate-400">{idx === 0 ? "●" : "↑"}</span>
                        <span className="font-semibold text-slate-900">{node.name}</span>
                        <span className="ml-2 text-slate-500">{node.role}</span>
                      </div>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        {node.relationship}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {(data.matrixLinks ?? []).length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Matrix & Dotted-Line Relationships
                  </h4>
                  <div className="space-y-1.5">
                    {data.matrixLinks.map((m: any) => (
                      <div
                        key={m.edgeId}
                        className="flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50/40 px-3 py-2 text-xs"
                      >
                        <span className="font-medium text-slate-900">{m.managerName}</span>
                        <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-800">
                          {m.type} · {m.scope}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Direct & Downstream Reports ({(data.descendants ?? []).length})
                </h4>
                {(data.descendants ?? []).length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 p-3 text-xs text-slate-500">
                    No downstream reports under this node as at {asOf}.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {data.descendants.map((d: any) => (
                      <div
                        key={`${d.employeeId}-${d.relationship}`}
                        className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs"
                        style={{ marginLeft: `${Math.max(0, (d.level - 1) * 14)}px` }}
                      >
                        <div>
                          <div className="font-medium text-slate-900">{d.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {d.role} · {d.relationship}
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            d.objectivePolicyValid
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-800"
                          }`}
                        >
                          {d.objectiveCount} / 8–10
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3">
          <span className="text-[11px] text-slate-500">Snapshot as at {asOf}</span>
          {onOpenAdminOrg && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAdminOrg();
              }}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
            >
              Open Full Organogram
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ExecutiveOrgOverlayCard({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  const [data, setData] = useState<{ asOf: string; units: any[] } | null>(null);

  useEffect(() => {
    fetch("/api/hr/performance/org/overlay")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json) setData(json);
      })
      .catch(() => undefined);
  }, []);

  if (!data) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Organisation Health Overlay</h3>
          <p className="text-[11px] text-slate-500">
            8–10 Objective Coverage & Progress by Org Unit (as at {data.asOf})
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenDrawer}
          className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
        >
          View Org Chart
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {(data.units ?? []).slice(0, 8).map((u: any) => (
          <div key={u.unitId} className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 text-xs">
            <div className="truncate font-semibold text-slate-900">{u.unitName}</div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-600">
              <span>{u.headcount} staff</span>
              <span className={u.coveragePct >= 80 ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
                {u.coveragePct}% 8–10
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminOrganisationPanel() {
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [units, setUnits] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [validation, setValidation] = useState<any>(null);
  const [coverage, setCoverage] = useState<any>(null);
  const [delegations, setDelegations] = useState<any[]>([]);
  const [audit, setAudit] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [subjectEmployeeId, setSubjectEmployeeId] = useState("");
  const [objectEmployeeId, setObjectEmployeeId] = useState("");
  const [edgeType, setEdgeType] = useState("PRIMARY_MANAGER");
  const [edgeScope, setEdgeScope] = useState("ALL");
  const [edgeReason, setEdgeReason] = useState("");

  const [unitName, setUnitName] = useState("");
  const [unitType, setUnitType] = useState("DEPARTMENT");

  const loadAll = useCallback(async () => {
    setErr(null);
    const qs = `?asOf=${encodeURIComponent(asOf)}`;
    const [uRes, eRes, vRes, cRes, dRes, aRes] = await Promise.all([
      fetch(`/api/hr/performance/org/units${qs}`),
      fetch(`/api/hr/performance/org/edges${qs}`),
      fetch(`/api/hr/performance/org/validation${qs}`),
      fetch(`/api/hr/performance/org/coverage${qs}`),
      fetch("/api/hr/performance/org/delegations"),
      fetch("/api/hr/performance/org/audit"),
    ]);
    if (uRes.ok) setUnits((await uRes.json()).units ?? []);
    if (eRes.ok) setEdges((await eRes.json()).edges ?? []);
    if (vRes.ok) setValidation(await vRes.json());
    if (cRes.ok) setCoverage(await cRes.json());
    if (dRes.ok) setDelegations((await dRes.json()).delegations ?? []);
    if (aRes.ok) setAudit(await aRes.json());
  }, [asOf]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleHrisSync = async () => {
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/hr/performance/org/import", { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      setErr(json.error || "HRIS sync failed.");
      return;
    }
    setMsg(`HRIS Sync completed: ${json.edgesSynced} edges synced, ${json.conflictsDetected} conflicts detected.`);
    await loadAll();
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitName.trim()) return;
    setErr(null);
    const res = await fetch("/api/hr/performance/org/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: unitName.trim(), type: unitType, effectiveFrom: asOf }),
    });
    const json = await res.json();
    if (!res.ok) {
      setErr(json.error || "Could not create org unit.");
      return;
    }
    setUnitName("");
    setMsg("Org unit created (effective-dated & audited).");
    await loadAll();
  };

  const handleCreateEdge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectEmployeeId.trim() || !objectEmployeeId.trim()) return;
    setErr(null);
    const res = await fetch("/api/hr/performance/org/edges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectEmployeeId: subjectEmployeeId.trim(),
        objectEmployeeId: objectEmployeeId.trim(),
        type: edgeType,
        scope: edgeScope,
        effectiveFrom: asOf,
        reason: edgeReason.trim() || "Org update",
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setErr(`${json.code || "ERROR"}: ${json.error}`);
      return;
    }
    setSubjectEmployeeId("");
    setObjectEmployeeId("");
    setEdgeReason("");
    setMsg("Org reporting edge created & audited.");
    await loadAll();
  };

  const handleDelegationAction = async (id: string, action: "approve" | "revoke") => {
    const res = await fetch(`/api/hr/performance/org/delegations/${encodeURIComponent(id)}/${action}`, {
      method: "POST",
    });
    if (res.ok) {
      setMsg(`Delegation ${action}d.`);
      await loadAll();
    }
  };

  const handleCloseEdge = async (edgeId: string) => {
    setErr(null);
    const res = await fetch(`/api/hr/performance/org/edges/${encodeURIComponent(edgeId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ effectiveTo: asOf, status: "CLOSED", reason: "Closed via Admin Organisation" }),
    });
    if (res.ok) {
      setMsg("Reporting edge closed (effective-dated & audited).");
      await loadAll();
    }
  };

  const handleResolveConflict = async (conflictId: string, resolution: "RESOLVED_HRIS" | "RESOLVED_LOCAL") => {
    setErr(null);
    const res = await fetch(`/api/hr/performance/org/conflicts/${encodeURIComponent(conflictId)}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolution }),
    });
    if (res.ok) {
      setMsg(`Sync conflict resolved (${resolution}).`);
      await loadAll();
    }
  };

  return (
    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Admin — Organisation Graph (v1.3)</h3>
          <p className="text-xs text-slate-500">
            Effective-dated org units, multi-manager reporting edges, HRIS sync, coverage & audit history.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
            As at:
            <input
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs"
            />
          </label>
          <button
            type="button"
            onClick={() => void handleHrisSync()}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
          >
            Sync from HRIS
          </button>
        </div>
      </div>

      {err && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div>}
      {msg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{msg}</div>}

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-slate-50 p-3 text-xs">
          <div className="text-slate-500">Active Org Units</div>
          <div className="text-lg font-bold text-slate-900">{units.length}</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-xs">
          <div className="text-slate-500">Active Edges</div>
          <div className="text-lg font-bold text-slate-900">{edges.length}</div>
        </div>
        <div className="rounded-lg bg-amber-50 p-3 text-xs">
          <div className="text-amber-700">Missing Primary Mgr</div>
          <div className="text-lg font-bold text-amber-900">{validation?.missingPrimaryManagerCount ?? 0}</div>
        </div>
        <div className="rounded-lg bg-indigo-50 p-3 text-xs">
          <div className="text-indigo-700">Below 8 Objectives</div>
          <div className="text-lg font-bold text-indigo-900">{coverage?.belowMinCount ?? 0}</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={handleCreateUnit} className="space-y-2 rounded-lg border border-slate-200 p-3">
          <div className="text-xs font-semibold text-slate-800">Add Org Unit (Effective {asOf})</div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Unit Name"
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              className="flex-1 rounded border border-slate-200 px-2.5 py-1.5 text-xs"
            />
            <select
              value={unitType}
              onChange={(e) => setUnitType(e.target.value)}
              className="rounded border border-slate-200 px-2 py-1.5 text-xs"
            >
              <option value="BUSINESS_UNIT">Business Unit</option>
              <option value="DEPARTMENT">Department</option>
              <option value="TEAM">Team</option>
              <option value="COST_CENTER">Cost Center</option>
            </select>
            <button type="submit" className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white">
              Add Unit
            </button>
          </div>
        </form>

        <form onSubmit={handleCreateEdge} className="space-y-2 rounded-lg border border-slate-200 p-3">
          <div className="text-xs font-semibold text-slate-800">Add Reporting / Matrix Edge (Acyclic)</div>
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              type="text"
              placeholder="Employee ID"
              value={subjectEmployeeId}
              onChange={(e) => setSubjectEmployeeId(e.target.value)}
              className="rounded border border-slate-200 px-2 py-1.5 text-xs"
            />
            <input
              type="text"
              placeholder="Manager ID"
              value={objectEmployeeId}
              onChange={(e) => setObjectEmployeeId(e.target.value)}
              className="rounded border border-slate-200 px-2 py-1.5 text-xs"
            />
            <select
              value={edgeType}
              onChange={(e) => setEdgeType(e.target.value)}
              className="rounded border border-slate-200 px-2 py-1.5 text-xs"
            >
              <option value="PRIMARY_MANAGER">Primary Manager</option>
              <option value="MATRIX_MANAGER">Matrix Manager</option>
              <option value="DOTTED_LINE">Dotted Line</option>
            </select>
          </div>
          <div className="flex gap-2">
            <select
              value={edgeScope}
              onChange={(e) => setEdgeScope(e.target.value)}
              className="rounded border border-slate-200 px-2 py-1.5 text-xs"
            >
              <option value="ALL">Scope: ALL</option>
              <option value="APPRAISAL">Scope: APPRAISAL</option>
              <option value="GOALS">Scope: GOALS</option>
            </select>
            <input
              type="text"
              placeholder="Reason (audited)"
              value={edgeReason}
              onChange={(e) => setEdgeReason(e.target.value)}
              className="flex-1 rounded border border-slate-200 px-2 py-1.5 text-xs"
            />
            <button type="submit" className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white">
              Add Edge
            </button>
          </div>
        </form>
      </div>

      {(validation?.openSyncConflicts ?? []).length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
          <div className="mb-2 text-xs font-semibold text-amber-900">
            HRIS Sync Conflicts ({validation.openSyncConflicts.length})
          </div>
          <div className="space-y-1.5 text-xs">
            {validation.openSyncConflicts.map((c: any) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded bg-white px-3 py-2">
                <span>
                  Employee #{c.subject_employee_id}: HRIS Manager #{c.hris_manager_id} vs Local #{c.local_manager_id}
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => void handleResolveConflict(c.id, "RESOLVED_HRIS")}
                    className="rounded bg-slate-900 px-2 py-1 text-[11px] font-medium text-white"
                  >
                    Use HRIS
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleResolveConflict(c.id, "RESOLVED_LOCAL")}
                    className="rounded border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-700"
                  >
                    Keep Local
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {edges.length > 0 && (
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="mb-2 text-xs font-semibold text-slate-800">
            Active Reporting & Matrix Edges ({edges.length})
          </div>
          <div className="max-h-48 space-y-1 overflow-y-auto text-xs">
            {edges.slice(0, 25).map((e: any) => (
              <div key={e.id} className="flex items-center justify-between rounded bg-slate-50 px-3 py-1.5">
                <span>
                  #{e.subject_employee_id} → #{e.object_employee_id} · <strong>{e.type}</strong> ({e.scope}) ·{" "}
                  <span className="text-slate-500">{e.source}</span>
                </span>
                {!String(e.id).startsWith("hris-rl-") && (
                  <button
                    type="button"
                    onClick={() => void handleCloseEdge(e.id)}
                    className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] text-slate-700 hover:bg-slate-100"
                  >
                    Close
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {delegations.length > 0 && (
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="mb-2 text-xs font-semibold text-slate-800">Delegation Governance</div>
          <div className="space-y-1.5 text-xs">
            {delegations.map((d: any) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded bg-slate-50 px-3 py-2">
                <span>
                  #{d.delegator_id} → #{d.delegate_id} ({d.start_date} to {d.end_date}) · <strong>{d.status}</strong>
                </span>
                <div className="flex gap-1.5">
                  {d.status === "PROPOSED" && (
                    <button
                      type="button"
                      onClick={() => void handleDelegationAction(d.id, "approve")}
                      className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-medium text-white"
                    >
                      Approve
                    </button>
                  )}
                  {d.status !== "REVOKED" && (
                    <button
                      type="button"
                      onClick={() => void handleDelegationAction(d.id, "revoke")}
                      className="rounded border border-red-200 bg-white px-2 py-1 text-[11px] font-medium text-red-700"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {audit && (audit.edgeHistory?.length > 0 || audit.unitHistory?.length > 0) && (
        <div className="rounded-lg border border-slate-200 p-3 text-xs">
          <div className="mb-1.5 font-semibold text-slate-800">
            Recent Org Audit Events ({(audit.edgeHistory?.length ?? 0) + (audit.unitHistory?.length ?? 0)})
          </div>
          <div className="max-h-36 space-y-1 overflow-y-auto text-[11px] text-slate-600">
            {(audit.edgeHistory ?? []).slice(0, 8).map((ev: any) => (
              <div key={ev.id}>
                [{ev.action}] Edge {ev.edge_id} by #{ev.actor_employee_id} — {ev.reason}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
