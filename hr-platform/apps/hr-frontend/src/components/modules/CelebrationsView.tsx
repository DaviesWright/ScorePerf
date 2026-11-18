"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { Icons } from "../../design-system/Icons";
import { colors, radii, shadows, typography } from "../../design-system/tokens";
import { SEEDED_EMPLOYEES } from "../../data/enterpriseSeedData";

export interface CelebrationItem {
  id: string;
  employee_id: number;
  employee_name: string;
  department: string;
  celebration_type: "BIRTHDAY" | "WORK_ANNIVERSARY";
  event_date: string;
  days_until: number;
  bucket: "this_week" | "this_month";
  label: string;
  years_of_service: number | null;
  custom_message: string | null;
}

interface CelebrationsViewProps {
  mode: "ess" | "mss" | "hrms";
}

function buildSeededCelebrations(): { this_week: CelebrationItem[]; this_month: CelebrationItem[] } {
  const sample = SEEDED_EMPLOYEES.slice(0, 6);
  const items: CelebrationItem[] = sample.map((e, idx) => {
    const isBday = idx % 2 === 0;
    const days = idx < 2 ? idx + 1 : 10 + idx * 3;
    const d = new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
    return {
      id: isBday ? `bday-${e.id}` : `anniv-${e.id}`,
      employee_id: e.id,
      employee_name: `${e.firstName} ${e.lastName}`,
      department: e.departmentName,
      celebration_type: isBday ? "BIRTHDAY" : "WORK_ANNIVERSARY",
      event_date: d,
      days_until: days,
      bucket: days <= 7 ? "this_week" : "this_month",
      label: isBday ? "Birthday" : `${(idx % 5) + 2}-Year Work Anniversary`,
      years_of_service: isBday ? null : (idx % 5) + 2,
      custom_message: null,
    };
  });
  return {
    this_week: items.filter((i) => i.bucket === "this_week"),
    this_month: items.filter((i) => i.bucket === "this_month"),
  };
}

export const CelebrationsView: React.FC<CelebrationsViewProps> = ({ mode }) => {
  const [thisWeek, setThisWeek] = useState<CelebrationItem[]>([]);
  const [thisMonth, setThisMonth] = useState<CelebrationItem[]>([]);
  const [showBirthday, setShowBirthday] = useState(true);
  const [showAnniversary, setShowAnniversary] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  const [recognizeTarget, setRecognizeTarget] = useState<CelebrationItem | null>(null);
  const [recognizeMsg, setRecognizeMsg] = useState("");
  const [sendingPraise, setSendingPraise] = useState(false);
  const [praiseFeedback, setPraiseFeedback] = useState<string | null>(null);

  const loadCelebrations = useCallback(async () => {
    const endpoint =
      mode === "mss"
        ? "/api/hr/mss/celebrations"
        : mode === "hrms"
          ? "/api/hr/hrms/celebrations"
          : "/api/hr/ess/celebrations";
    try {
      const res = await fetch(endpoint, { credentials: "include" });
      if (res.ok) {
        const body = await res.json();
        setThisWeek(Array.isArray(body.this_week) ? body.this_week : []);
        setThisMonth(Array.isArray(body.this_month) ? body.this_month : []);
        if (body.settings) {
          setShowBirthday(Boolean(body.settings.show_birthday));
          setShowAnniversary(Boolean(body.settings.show_anniversary));
        }
        return;
      }
    } catch {
      // Fallback in demo mode
    }
    const seeded = buildSeededCelebrations();
    setThisWeek(seeded.this_week);
    setThisMonth(seeded.this_month);
  }, [mode]);

  useEffect(() => {
    loadCelebrations();
  }, [loadCelebrations]);

  const handleTogglePrivacy = async (nextBday: boolean, nextAnniv: boolean) => {
    setShowBirthday(nextBday);
    setShowAnniversary(nextAnniv);
    setSavingSettings(true);
    try {
      await fetch("/api/hr/ess/settings/celebrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ show_birthday: nextBday, show_anniversary: nextAnniv }),
      });
      await loadCelebrations();
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSendRecognition = async () => {
    if (!recognizeTarget || !recognizeMsg.trim()) return;
    setSendingPraise(true);
    try {
      const res = await fetch(`/api/hr/mss/celebrations/${recognizeTarget.id}/recognize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: recognizeMsg.trim(),
          to_employee_id: recognizeTarget.employee_id,
        }),
      });
      if (res.ok) {
        setPraiseFeedback(`Recognition sent to ${recognizeTarget.employee_name} (Continuous Feedback PRAISE).`);
        setRecognizeTarget(null);
        setRecognizeMsg("");
      }
    } finally {
      setSendingPraise(false);
    }
  };

  const renderCard = (item: CelebrationItem) => {
    const isAnniv = item.celebration_type === "WORK_ANNIVERSARY";
    const accentColor = isAnniv ? "#d97706" : "#ec4899";
    return (
      <div
        key={item.id}
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderTop: `3px solid ${accentColor}`,
          borderRadius: radii.md,
          padding: "0.9rem 1rem",
          boxShadow: shadows.sm,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: 4 }}>
            <Icons.Cake size={15} color={accentColor} />
            <span style={{ fontWeight: 700, fontSize: 14, color: colors.textPrimary }}>{item.employee_name}</span>
            <Badge variant={isAnniv ? "warning" : "info"} size="sm">
              {item.label}
            </Badge>
          </div>
          <div style={{ fontSize: 12, color: colors.textMuted }}>
            {item.department} · {item.event_date} ({item.days_until === 0 ? "Today!" : `in ${item.days_until} day(s)`})
          </div>
        </div>

        {mode === "mss" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRecognizeTarget(item);
              setRecognizeMsg(
                isAnniv
                  ? `Congratulations ${item.employee_name} on your ${item.label}! Thank you for your impact.`
                  : `Happy Birthday ${item.employee_name}! Wishing you a wonderful year ahead.`
              );
            }}
          >
            Send Recognition
          </Button>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: typography.sizes.xl, fontWeight: 800, color: colors.indigoPrimary }}>
            {mode === "mss" ? "Team Celebrations" : "Celebrations & Milestones"}
          </h1>
          <p style={{ margin: "0.25rem 0 0", fontSize: typography.sizes.sm, color: colors.textSecondary }}>
            {mode === "mss"
              ? "Birthdays and work anniversaries for your direct reports. Send PRAISE directly to Continuous Feedback."
              : "Birthdays and work anniversaries across the organisation (birth year hidden by default for privacy)."}
          </p>
        </div>

        {mode === "ess" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              padding: "0.5rem 0.85rem",
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              fontSize: 12,
            }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={showBirthday}
                disabled={savingSettings}
                onChange={(e) => handleTogglePrivacy(e.target.checked, showAnniversary)}
              />
              Show my birthday
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={showAnniversary}
                disabled={savingSettings}
                onChange={(e) => handleTogglePrivacy(showBirthday, e.target.checked)}
              />
              Show my anniversary
            </label>
          </div>
        )}
      </div>

      {praiseFeedback && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: radii.md,
            backgroundColor: "#ecfdf5",
            border: "1px solid #6ee7b7",
            color: "#065f46",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {praiseFeedback}
        </div>
      )}

      {/* Two-Column Layout: Left = This Week (light green highlight), Right = This Month */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
        <section
          style={{
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: radii.lg,
            padding: "1.25rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.9rem" }}>
            <h2 style={{ margin: 0, fontSize: typography.sizes.base, fontWeight: 700, color: "#14532d" }}>
              This Week
            </h2>
            <Badge variant="success" size="sm">{thisWeek.length} event(s)</Badge>
          </div>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {thisWeek.length === 0 ? (
              <p style={{ fontSize: 13, color: colors.textMuted, margin: 0 }}>No celebrations scheduled this week.</p>
            ) : (
              thisWeek.map(renderCard)
            )}
          </div>
        </section>

        <section
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radii.lg,
            padding: "1.25rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.9rem" }}>
            <h2 style={{ margin: 0, fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary }}>
              This Month
            </h2>
            <Badge variant="neutral" size="sm">{thisMonth.length} upcoming</Badge>
          </div>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {thisMonth.length === 0 ? (
              <p style={{ fontSize: 13, color: colors.textMuted, margin: 0 }}>No additional milestones in the next 30 days.</p>
            ) : (
              thisMonth.map(renderCard)
            )}
          </div>
        </section>
      </div>

      {recognizeTarget && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            zIndex: 1000,
          }}
          onClick={() => setRecognizeTarget(null)}
        >
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              padding: "1.25rem",
              width: "100%",
              maxWidth: 480,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 0.4rem", fontSize: typography.sizes.lg, color: colors.indigoPrimary }}>
              Send Recognition · {recognizeTarget.employee_name}
            </h3>
            <p style={{ margin: "0 0 0.75rem", fontSize: 12, color: colors.textMuted }}>
              {recognizeTarget.label} · Posted as PRAISE to Continuous Feedback.
            </p>
            <textarea
              rows={4}
              value={recognizeMsg}
              onChange={(e) => setRecognizeMsg(e.target.value)}
              style={{
                width: "100%",
                padding: "0.6rem",
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                fontSize: 13,
                marginBottom: "0.85rem",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <Button variant="outline" size="sm" onClick={() => setRecognizeTarget(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" disabled={sendingPraise} onClick={handleSendRecognition}>
                {sendingPraise ? "Sending…" : "Send Praise"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
