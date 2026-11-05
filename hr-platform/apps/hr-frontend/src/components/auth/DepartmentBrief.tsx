import React, { useMemo } from "react";
import { colors, typography, radii } from "../../design-system/tokens";
import { Icons } from "../../design-system/Icons";
import { Badge } from "../../design-system/Badge";
import type { AuthenticatedUser } from "./LoginPage";
import type { ModuleViewKey } from "../shell/AppSidebar";
import { isViewEnabled } from "../../config/modules";
import { DEMO_ATTENTION, DEMO_EVENTS, DEMO_LEAVES, DEMO_STAFF, PROFILE_MISSING } from "../../data/demoData";

interface DepartmentBriefProps {
  user: AuthenticatedUser;
  hasPhoto: boolean;
  onNavigate: (view: ModuleViewKey) => void;
}

const WINDOW_DAYS = 7;

/** `inSentence` lowercases Today/Tomorrow for use mid-sentence. */
function dayLabel(base: Date, offset: number, inSentence = false): string {
  if (offset === 0) return inSentence ? "today" : "Today";
  if (offset === 1) return inSentence ? "tomorrow" : "Tomorrow";
  const d = new Date(base);
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
}

const card: React.CSSProperties = {
  backgroundColor: colors.surfaceSubtle,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.md,
  padding: "1rem 1.15rem",
};
const heading: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  color: colors.textPrimary,
  margin: "0 0 0.65rem 0",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  display: "flex",
  alignItems: "center",
  gap: "0.4rem",
};
const list: React.CSSProperties = { margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.55rem", fontSize: typography.sizes.xs, color: colors.textSecondary, lineHeight: 1.4 };
const empty: React.CSSProperties = { margin: 0, fontSize: typography.sizes.xs, color: colors.textMuted };

export const DepartmentBrief: React.FC<DepartmentBriefProps> = ({ user, hasPhoto, onNavigate }) => {
  const brief = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    const me = DEMO_STAFF.find((s) => s.id === user.id);
    const colleagues = DEMO_STAFF.filter((s) => s.department === user.department && s.id !== user.id);
    // A department of one (for example Executive Command) would show nothing useful, so widen to the company.
    const companyWide = colleagues.length === 0;
    const scopeIds = new Set(colleagues.map((s) => s.id));

    const away = DEMO_LEAVES.filter(
      (l) => l.staffId !== user.id && l.endOffset >= 0 && l.startOffset <= WINDOW_DAYS && (companyWide || scopeIds.has(l.staffId))
    )
      .sort((a, b) => a.startOffset - b.startOffset)
      .map((l) => ({ ...l, person: DEMO_STAFF.find((s) => s.id === l.staffId)! }));

    const events = DEMO_EVENTS.filter((e) => {
      if (e.offsetDays < 0 || e.offsetDays > WINDOW_DAYS) return false;
      if (!e.departments && !e.sites) return true;
      return !!e.departments?.includes(user.department) || (!!me && !!e.sites?.includes(me.site));
    }).sort((a, b) => a.offsetDays - b.offsetDays || a.time.localeCompare(b.time));

    const attention: { text: string; view?: ModuleViewKey }[] = DEMO_ATTENTION.filter((a) => a.personas.includes(user.persona) && (!a.view || isViewEnabled(a.view)));
    if (!hasPhoto) attention.push({ text: "Add your professional headshot so colleagues recognise you." });
    const missing = (PROFILE_MISSING[user.id] ?? []).filter((m) => m !== "Photo");
    if (missing.length > 0) attention.push({ text: `Your profile is missing: ${missing.join(", ")}.`, ...(isViewEnabled("self_service") ? { view: "self_service" as const } : {}) });

    return { base, companyWide, people: colleagues.length + 1, away, events, attention: attention.slice(0, 5) };
  }, [user.id, user.department, user.persona, hasPhoto]);

  return (
    <div>
      <p style={{ margin: "0 0 1rem 0", fontSize: typography.sizes.sm, color: colors.textSecondary }}>
        {brief.companyWide ? (
          <>
            <strong style={{ color: colors.textPrimary }}>{user.department}</strong> has no other members, so this is the company-wide view.
          </>
        ) : (
          <>
            <strong style={{ color: colors.textPrimary }}>{user.department}</strong> · {brief.people} people. Here is what the next {WINDOW_DAYS} days look like.
          </>
        )}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "1rem" }}>
        <section style={card} aria-label="Who is on leave">
          <h3 style={heading}>
            <Icons.Calendar size={14} color={colors.indigoAction} />
            Who is on leave
          </h3>
          {brief.away.length === 0 ? (
            <p style={empty}>Nobody is away this week.</p>
          ) : (
            <ul style={list}>
              {brief.away.map((l) => {
                const out = l.startOffset <= 0;
                return (
                  <li key={l.staffId}>
                    <strong style={{ color: colors.textPrimary }}>{l.person.name}</strong>{" "}
                    <Badge variant={out ? "warning" : "neutral"} size="sm">{out ? "Out now" : "Upcoming"}</Badge>
                    <div style={{ color: colors.textMuted }}>
                      {l.type} · {out ? `until ${dayLabel(brief.base, l.endOffset, true)}` : `from ${dayLabel(brief.base, l.startOffset)}`}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section style={card} aria-label="Upcoming events">
          <h3 style={heading}>
            <Icons.Activity size={14} color={colors.emeraldDark} />
            Events
          </h3>
          {brief.events.length === 0 ? (
            <p style={empty}>No events in the next {WINDOW_DAYS} days.</p>
          ) : (
            <ul style={list}>
              {brief.events.map((e) => (
                <li key={e.title}>
                  <strong style={{ color: colors.textPrimary }}>{e.title}</strong>
                  <div style={{ color: colors.textMuted }}>{dayLabel(brief.base, e.offsetDays)} · {e.time}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section style={card} aria-label="Needs your attention">
          <h3 style={heading}>
            <Icons.AlertTriangle size={14} color={colors.peachAccent} />
            Needs your attention
          </h3>
          {brief.attention.length === 0 ? (
            <p style={empty}>Nothing needs a decision from you today.</p>
          ) : (
            <ul style={list}>
              {brief.attention.map((a) => (
                <li key={a.text}>
                  {a.text}
                  {a.view && (
                    <>
                      {" "}
                      <button
                        type="button"
                        onClick={() => onNavigate(a.view!)}
                        style={{ background: "none", border: "none", padding: 0, color: colors.indigoAction, fontWeight: 600, fontSize: typography.sizes.xs, cursor: "pointer" }}
                      >
                        Open →
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};
