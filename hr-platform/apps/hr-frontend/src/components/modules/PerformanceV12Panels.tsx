"use client";

import React, { useCallback, useEffect, useState } from "react";
import { jsPDF } from "jspdf";

const DEMO_DISCLAIMER = "DEMO — NOT A LIVE APPRAISAL";

export function ObjectiveVolumeChip({ employeeId, cycleId }: { employeeId?: string; cycleId?: string }) {
  const [data, setData] = useState<{
    count: number;
    policy: { minObjectives: number; maxObjectives: number };
    validation: { valid: boolean; code: string; message: string; remainingToMin: number };
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams();
      if (employeeId) qs.set("employeeId", employeeId);
      if (cycleId) qs.set("cycleId", cycleId);
      const res = await fetch(`/api/hr/performance/objectives/count?${qs.toString()}`);
      if (!res.ok) return;
      setData(await res.json());
    } catch {
      // non-blocking
    }
  }, [employeeId, cycleId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!data) return null;

  const { count, policy, validation } = data;
  const isBelow = count < policy.minObjectives;
  const isAbove = count > policy.maxObjectives;

  const badgeClass = isAbove
    ? "bg-red-50 text-red-700 border-red-200"
    : isBelow
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : "bg-emerald-50 text-emerald-700 border-emerald-200";

  return (
    <div className="space-y-2">
      <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${badgeClass}`}>
        <span>{isAbove || isBelow ? "⚠" : "✓"}</span>
        <span>
          Objectives: {count} / {policy.minObjectives} min · {policy.maxObjectives} max
        </span>
      </div>
      {!validation.valid && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-900">
          <span>🔒</span>
          <span>{validation.message}</span>
        </div>
      )}
    </div>
  );
}

interface TeamQueueItem {
  assessmentId: string;
  employeeId: string;
  employeeName: string;
  role: string;
  cycleId: string;
  stage: string;
  managerSubStatus: string;
  selfRating: number | null;
  managerRating: number | null;
  revisionRound: number;
  maxRevisionRounds: number;
  objectiveCount: number;
  objectivePolicyValid: boolean;
  delegated: boolean;
  onBehalfOfManagerId: string | null;
}

export function ManagerAssessmentQueuePanel() {
  const [items, setItems] = useState<TeamQueueItem[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    notStarted: number;
    draft: number;
    submitted: number;
    revisionRequested: number;
    awaitingSelf: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null);
  const [managerView, setManagerView] = useState<any>(null);
  const [overallRating, setOverallRating] = useState<string>("4");
  const [strengths, setStrengths] = useState("");
  const [developmentAreas, setDevelopmentAreas] = useState("");
  const [recommendedActions, setRecommendedActions] = useState("");
  const [revisionReason, setRevisionReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const [delegations, setDelegations] = useState<any[]>([]);
  const [delegateId, setDelegateId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
  const [delegationReason, setDelegationReason] = useState("");

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [qRes, sRes, dRes] = await Promise.all([
        fetch("/api/hr/performance/reviews/team"),
        fetch("/api/hr/performance/reviews/team/summary"),
        fetch("/api/hr/performance/settings/delegations"),
      ]);
      if (qRes.ok) {
        const qJson = await qRes.json();
        setItems(qJson.items ?? []);
      }
      if (sRes.ok) {
        setSummary(await sRes.json());
      }
      if (dRes.ok) {
        const dJson = await dRes.json();
        setDelegations(dJson.delegations ?? []);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load manager assessment queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const openAssessment = async (assessmentId: string) => {
    setFeedbackMsg(null);
    setError(null);
    try {
      const res = await fetch(`/api/hr/performance/assessments/${encodeURIComponent(assessmentId)}/manager-view`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Unable to open manager assessment.");
        return;
      }
      setActiveAssessmentId(assessmentId);
      setManagerView(json);
      setOverallRating(json.managerAssessment?.overallRating != null ? String(json.managerAssessment.overallRating) : "4");
      setStrengths(json.managerAssessment?.strengths ?? "");
      setDevelopmentAreas(json.managerAssessment?.developmentAreas ?? "");
      setRecommendedActions(json.managerAssessment?.recommendedActions ?? "");
    } catch (e: any) {
      setError(e?.message || "Failed to load assessment detail.");
    }
  };

  const saveDraftOrSubmit = async (submit: boolean) => {
    if (!activeAssessmentId) return;
    setSaving(true);
    setFeedbackMsg(null);
    setError(null);
    try {
      const endpoint = submit
        ? `/api/hr/performance/assessments/${encodeURIComponent(activeAssessmentId)}/manager`
        : `/api/hr/performance/assessments/${encodeURIComponent(activeAssessmentId)}/manager/draft`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overallRating: overallRating ? Number(overallRating) : null,
          strengths,
          developmentAreas,
          recommendedActions,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to save manager assessment.");
        return;
      }
      setFeedbackMsg(submit ? "Manager assessment submitted." : "Draft saved.");
      await loadQueue();
      await openAssessment(activeAssessmentId);
    } catch (e: any) {
      setError(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!activeAssessmentId || revisionReason.trim().length < 3) {
      setError("Please enter a revision reason (at least 3 characters).");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/hr/performance/assessments/${encodeURIComponent(activeAssessmentId)}/manager/request-revision`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: revisionReason.trim() }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Could not request revision.");
        return;
      }
      setRevisionReason("");
      setFeedbackMsg(`Revision requested (round ${json.revisionRound}/${json.maxRevisionRounds}).`);
      await loadQueue();
      await openAssessment(activeAssessmentId);
    } catch (e: any) {
      setError(e?.message || "Revision request failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateDelegation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delegateId.trim()) return;
    setError(null);
    try {
      const res = await fetch("/api/hr/performance/settings/delegations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delegateId: delegateId.trim(),
          startDate,
          endDate,
          reason: delegationReason.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Delegation could not be created.");
        return;
      }
      setDelegateId("");
      setDelegationReason("");
      setFeedbackMsg("Manager delegation created.");
      await loadQueue();
    } catch (err: any) {
      setError(err?.message || "Failed to create delegation.");
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            Manager Assessment Queue
          </h3>
          <p className="text-xs text-slate-500">
            Direct & delegated reports awaiting manager review (segregation-of-duties enforced).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadQueue()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          ↻ Refresh
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <div className="rounded-lg bg-slate-50 p-2.5 text-xs">
            <div className="text-slate-500">Not Started</div>
            <div className="text-base font-semibold text-slate-900">{summary.notStarted}</div>
          </div>
          <div className="rounded-lg bg-indigo-50 p-2.5 text-xs">
            <div className="text-indigo-600">In Progress (Draft)</div>
            <div className="text-base font-semibold text-indigo-900">{summary.draft}</div>
          </div>
          <div className="rounded-lg bg-emerald-50 p-2.5 text-xs">
            <div className="text-emerald-700">Submitted</div>
            <div className="text-base font-semibold text-emerald-900">{summary.submitted}</div>
          </div>
          <div className="rounded-lg bg-amber-50 p-2.5 text-xs">
            <div className="text-amber-700">Revision Requested</div>
            <div className="text-base font-semibold text-amber-900">{summary.revisionRequested}</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-2.5 text-xs">
            <div className="text-slate-500">Awaiting Self</div>
            <div className="text-base font-semibold text-slate-900">{summary.awaitingSelf}</div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
      )}
      {feedbackMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {feedbackMsg}
        </div>
      )}

      {loading ? (
        <div className="py-6 text-center text-xs text-slate-500">Loading manager queue...</div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
          No direct or delegated reports currently assigned to you.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-2 pr-3 font-medium">Employee</th>
                <th className="py-2 pr-3 font-medium">Stage / Status</th>
                <th className="py-2 pr-3 font-medium">Objectives</th>
                <th className="py-2 pr-3 font-medium">Self</th>
                <th className="py-2 pr-3 font-medium">Manager</th>
                <th className="py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.assessmentId} className="hover:bg-slate-50/60">
                  <td className="py-2.5 pr-3">
                    <div className="font-medium text-slate-900">{item.employeeName}</div>
                    <div className="text-[11px] text-slate-500">
                      {item.role}
                      {item.delegated && (
                        <span className="ml-1.5 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                          Delegated (on behalf of #{item.onBehalfOfManagerId})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      {item.managerSubStatus}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">
                    <span
                      className={`font-medium ${
                        item.objectivePolicyValid ? "text-emerald-700" : "text-amber-700"
                      }`}
                    >
                      {item.objectiveCount} / 8–10
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">{item.selfRating ?? "—"}</td>
                  <td className="py-2.5 pr-3">{item.managerRating ?? "—"}</td>
                  <td className="py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => void openAssessment(item.assessmentId)}
                      className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                    >
                      {item.managerSubStatus === "MANAGER_COMPLETE"
                        ? "View"
                        : item.managerSubStatus === "MANAGER_DRAFT"
                          ? "Continue"
                          : "Assess"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {managerView && activeAssessmentId && (
        <div className="mt-4 grid gap-4 rounded-xl border border-indigo-200 bg-indigo-50/20 p-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                🔒 Employee Self-Assessment (Read-Only)
              </h4>
              <span className="text-xs text-slate-500">
                Self Rating: <strong>{managerView.selfAssessment?.selfRating ?? "Not rated"}</strong>
              </span>
            </div>
            <p className="rounded bg-slate-50 p-3 text-xs text-slate-700">
              {managerView.selfAssessment?.selfSummary || "No self-assessment narrative submitted yet."}
            </p>
            <div className="text-xs text-slate-600">
              Objective Volume:{" "}
              <span className={managerView.objectiveVolume?.valid ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
                {managerView.objectiveVolume?.count ?? 0} / 8 min · 10 max
              </span>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
            <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              Manager Assessment
            </h4>
            <div className="grid gap-2">
              <label className="text-xs font-medium text-slate-700">
                Overall Rating (1–5)
                <input
                  type="number"
                  min={1}
                  max={5}
                  step={0.1}
                  value={overallRating}
                  onChange={(e) => setOverallRating(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                />
              </label>
              <label className="text-xs font-medium text-slate-700">
                Strengths
                <textarea
                  rows={2}
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                />
              </label>
              <label className="text-xs font-medium text-slate-700">
                Development Areas
                <textarea
                  rows={2}
                  value={developmentAreas}
                  onChange={(e) => setDevelopmentAreas(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                />
              </label>
              <label className="text-xs font-medium text-slate-700">
                Recommended Actions
                <textarea
                  rows={2}
                  value={recommendedActions}
                  onChange={(e) => setRecommendedActions(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveDraftOrSubmit(false)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Save draft
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveDraftOrSubmit(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
              >
                Submit assessment
              </button>
            </div>

            <div className="border-t border-slate-100 pt-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Revision reason (if returning to employee)..."
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                />
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleRequestRevision()}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
                >
                  Request revision
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-slate-100 pt-4">
        <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-800">
          Acting Manager Delegations ({delegations.length})
        </h4>
        <form onSubmit={handleCreateDelegation} className="grid gap-2 sm:grid-cols-5">
          <input
            type="text"
            placeholder="Delegate Employee ID"
            value={delegateId}
            onChange={(e) => setDelegateId(e.target.value)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          />
          <input
            type="text"
            placeholder="Reason (e.g. Annual leave)"
            value={delegationReason}
            onChange={(e) => setDelegationReason(e.target.value)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
          >
            Add Delegation
          </button>
        </form>
      </div>
    </div>
  );
}

export function DemoAppraisalWorkspacePanel() {
  const [items, setItems] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [framework, setFramework] = useState<string>("BSC");
  const [overallRating, setOverallRating] = useState<string>("4.2");
  const [selfSummary, setSelfSummary] = useState<string>("Delivered all core deliverables ahead of schedule.");
  const [managerSummary, setManagerSummary] = useState<string>("Consistent execution across 8–10 aligned objectives.");
  const [strengths, setStrengths] = useState<string>("Cross-functional delivery, analytical rigor");
  const [developmentAreas, setDevelopmentAreas] = useState<string>("Executive stakeholder storytelling");
  const [objectives, setObjectives] = useState<any[]>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadDemoList = useCallback(async () => {
    try {
      const res = await fetch("/api/hr/performance/demo/appraisals");
      if (!res.ok) return;
      const json = await res.json();
      const list = json.items ?? [];
      setItems(list);
      if (list.length > 0 && !selectedId) {
        const first = list[0];
        setSelectedId(first.assessmentId);
        if (first.demo) {
          setFramework(first.demo.framework || "BSC");
          setOverallRating(first.demo.overall_rating != null ? String(first.demo.overall_rating) : "4.2");
          setSelfSummary(first.demo.self_summary || "");
          setManagerSummary(first.demo.manager_summary || "");
          setStrengths(first.demo.strengths || "");
          setDevelopmentAreas(first.demo.development_areas || "");
          setObjectives(Array.isArray(first.demo.objectives_json) ? first.demo.objectives_json : []);
        }
      }
    } catch {
      // ignore
    }
  }, [selectedId]);

  useEffect(() => {
    void loadDemoList();
  }, [loadDemoList]);

  const currentItem = items.find((i) => i.assessmentId === selectedId) ?? items[0];

  const handleSeed = async () => {
    if (!selectedId) return;
    setBusy(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/hr/performance/demo/appraisals/${encodeURIComponent(selectedId)}/seed-objectives`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          framework,
          employeeId: currentItem?.employeeId,
          employeeName: currentItem?.employeeName,
          cycleId: currentItem?.cycleId,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setObjectives(json.objectives ?? []);
        setStatusMsg(`Seeded ${json.count ?? 8} isolated demo objectives (${framework}).`);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setBusy(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/hr/performance/demo/appraisals/${encodeURIComponent(selectedId)}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: currentItem?.employeeId,
          employeeName: currentItem?.employeeName,
          cycleId: currentItem?.cycleId,
          framework,
          overallRating: overallRating ? Number(overallRating) : null,
          selfSummary,
          managerSummary,
          strengths,
          developmentAreas,
          objectives,
        }),
      });
      if (res.ok) {
        setStatusMsg("Demo appraisal saved in isolated demo store.");
        await loadDemoList();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadCsv = async () => {
    if (!selectedId) return;
    const res = await fetch(`/api/hr/performance/demo/appraisals/${encodeURIComponent(selectedId)}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "CSV" }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `demo-appraisal-${selectedId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async () => {
    if (!selectedId) return;
    await fetch(`/api/hr/performance/demo/appraisals/${encodeURIComponent(selectedId)}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "PDF" }),
    });

    const doc = new jsPDF();
    const stampHeader = (pageNum: number) => {
      doc.setFontSize(9);
      doc.setTextColor(180, 40, 40);
      doc.text(`${DEMO_DISCLAIMER}  |  Page ${pageNum}`, 14, 12);
      doc.setTextColor(20, 25, 35);
    };

    stampHeader(1);
    doc.setFontSize(15);
    doc.text("Demo Appraisal Report", 14, 24);
    doc.setFontSize(10);
    doc.text(`Employee: ${currentItem?.employeeName ?? "Demo Employee"}   |   Framework: ${framework}`, 14, 32);
    doc.text(`Assessment ID: ${selectedId}   |   Overall Rating: ${overallRating || "N/A"} / 5.0`, 14, 38);

    let y = 48;
    const writeSection = (title: string, body: string) => {
      doc.setFontSize(11);
      doc.text(title, 14, y);
      y += 5;
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(body || "—", 180);
      doc.text(lines, 14, y);
      y += lines.length * 4.5 + 4;
    };

    writeSection("Self-Assessment Summary", selfSummary);
    writeSection("Manager Assessment Summary", managerSummary);
    writeSection("Strengths", strengths);
    writeSection("Development Areas", developmentAreas);

    doc.setFontSize(11);
    doc.text(`Objectives (${objectives.length})`, 14, y);
    y += 6;
    doc.setFontSize(9);
    objectives.forEach((obj, idx) => {
      if (y > 270) {
        doc.addPage();
        stampHeader(doc.getNumberOfPages());
        y = 22;
      }
      doc.text(
        `${idx + 1}. ${obj.title} (${obj.perspective ?? "General"}) — Weight ${obj.weightPct ?? 10}% | Progress ${obj.progressPct ?? 0}% | Rating ${obj.rating ?? "—"}`,
        14,
        y
      );
      y += 5.5;
    });

    doc.save(`demo-appraisal-${selectedId}.pdf`);
  };

  return (
    <div className="space-y-4 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/30 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-600 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
              DEMO
            </span>
            <h3 className="text-base font-semibold text-slate-900">Demo Appraisal Workspace</h3>
          </div>
          <p className="mt-0.5 text-xs text-amber-900">
            {DEMO_DISCLAIMER} — Isolated from live analytics & reporting. Fill any open appraisal, seed 8–10 objectives, save, and download PDF/CSV.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSeed()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-50"
          >
            Seed Sample Objectives (8)
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSave()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
          >
            Save Demo
          </button>
          <button
            type="button"
            onClick={() => void handleDownloadPdf()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
          >
            Download PDF
          </button>
          <button
            type="button"
            onClick={() => void handleDownloadCsv()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Download CSV
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {statusMsg}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-medium text-slate-700">
          Open Appraisal
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
          >
            {items.map((item) => (
              <option key={item.assessmentId} value={item.assessmentId}>
                {item.employeeName} ({item.assessmentId})
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-700">
          Framework Lens
          <select
            value={framework}
            onChange={(e) => setFramework(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
          >
            <option value="BSC">BSC</option>
            <option value="OKR">OKR</option>
            <option value="MBO">MBO</option>
          </select>
        </label>
        <label className="text-xs font-medium text-slate-700">
          Demo Overall Rating (1–5)
          <input
            type="number"
            min={1}
            max={5}
            step={0.1}
            value={overallRating}
            onChange={(e) => setOverallRating(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-slate-700">
          Self-Assessment Narrative
          <textarea
            rows={2}
            value={selfSummary}
            onChange={(e) => setSelfSummary(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
          />
        </label>
        <label className="text-xs font-medium text-slate-700">
          Manager Assessment Narrative
          <textarea
            rows={2}
            value={managerSummary}
            onChange={(e) => setManagerSummary(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
          />
        </label>
        <label className="text-xs font-medium text-slate-700">
          Strengths
          <input
            type="text"
            value={strengths}
            onChange={(e) => setStrengths(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
          />
        </label>
        <label className="text-xs font-medium text-slate-700">
          Development Areas
          <input
            type="text"
            value={developmentAreas}
            onChange={(e) => setDevelopmentAreas(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
          />
        </label>
      </div>

      {objectives.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="mb-2 text-xs font-semibold text-slate-800">
            Demo Objectives ({objectives.length} / 8 min · 10 max)
          </div>
          <div className="grid gap-1.5 text-xs">
            {objectives.map((obj, idx) => (
              <div key={obj.id ?? idx} className="flex items-center justify-between rounded bg-slate-50 px-2.5 py-1.5">
                <span className="font-medium text-slate-800">
                  {idx + 1}. {obj.title}
                </span>
                <span className="text-slate-500">
                  {obj.perspective} · {obj.weightPct}% · Rating {obj.rating ?? "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
