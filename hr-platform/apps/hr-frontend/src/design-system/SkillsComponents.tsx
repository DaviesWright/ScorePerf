"use client";

import React from "react";
import { colors, radii, space, text, transitions, focusRing } from "./tokens";
import {
  SKILL_PROFICIENCY_SCALE,
  SKILL_CATEGORIES,
  ProficiencyLevelNumber,
} from "../data/skillsFramework";

// ==============================================================================
// §11.1 SkillBadge — Skill code + name pill (e.g., "1.1 Domain Expertise")
// Same typography and spacing rhythm as framework badges.
// ==============================================================================
export interface SkillBadgeProps {
  code: string;
  name: string;
  level?: number | null;
}

export const SkillBadge: React.FC<SkillBadgeProps> = ({ code, name, level }) => {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: space[1],
        padding: "2px 8px",
        borderRadius: radii.full,
        backgroundColor: colors.surfaceSubtle,
        border: `1px solid ${colors.border}`,
        color: colors.textPrimary,
        fontSize: text.micro.fontSize,
        fontWeight: 600,
        lineHeight: text.micro.lineHeight,
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ color: colors.indigoAction, fontWeight: 700 }}>{code}</span>
      <span>{name}</span>
      {typeof level === "number" && (
        <span
          style={{
            marginLeft: "2px",
            padding: "0 5px",
            borderRadius: radii.full,
            backgroundColor: colors.indigoSubtle,
            color: colors.indigoPrimary,
            fontWeight: 700,
          }}
        >
          L{level}
        </span>
      )}
    </span>
  );
};

// ==============================================================================
// §11.2 SkillRating — 5-level selector (1–5: Novice → Expert)
// Identical in ESS and Manager Console; same size, focus ring, and labels.
// ==============================================================================
export interface SkillRatingProps {
  value: ProficiencyLevelNumber | null;
  onChange?: (level: ProficiencyLevelNumber) => void;
  disabled?: boolean;
  compact?: boolean;
  ariaLabel?: string;
}

export const SkillRating: React.FC<SkillRatingProps> = ({
  value,
  onChange,
  disabled = false,
  compact = false,
  ariaLabel = "Skill proficiency rating",
}) => {
  const [focusedLevel, setFocusedLevel] = React.useState<number | null>(null);

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: space[1],
        flexWrap: "wrap",
      }}
    >
      {SKILL_PROFICIENCY_SCALE.map((spec) => {
        const selected = value === spec.level;
        return (
          <button
            key={spec.level}
            type="button"
            role="radio"
            aria-checked={selected}
            title={`${spec.level} — ${spec.label}: ${spec.descriptor}`}
            disabled={disabled}
            onFocus={() => setFocusedLevel(spec.level)}
            onBlur={() => setFocusedLevel(null)}
            onClick={() => !disabled && onChange?.(spec.level)}
            style={{
              padding: compact ? "3px 8px" : "4px 10px",
              borderRadius: radii.sm,
              border: `1px solid ${selected ? colors.indigoAction : colors.border}`,
              backgroundColor: selected ? colors.indigoSubtle : colors.surface,
              color: selected ? colors.indigoPrimary : colors.textSecondary,
              fontSize: text.micro.fontSize,
              fontWeight: selected ? 700 : 500,
              fontVariantNumeric: "tabular-nums",
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled && !selected ? 0.65 : 1,
              transition: transitions.fast,
              boxShadow: focusedLevel === spec.level ? focusRing : "none",
            }}
          >
            {compact ? `${spec.level}` : `${spec.level} · ${spec.label}`}
          </button>
        );
      })}
    </div>
  );
};

// ==============================================================================
// §11.3 GapBar — Horizontal bar showing required vs. actual with gap coloring
// gap = required_level - final_rating
//   > 0 : Deficit (amber/red; "-N levels")
//   = 0 : Met (green; "Met")
//   < 0 : Surplus (blue; "+N levels")
//   null required : "Not required" (VAL-SKILL-006)
// ==============================================================================
export interface GapBarProps {
  requiredLevel: number | null;
  finalRating: number | null;
}

export const GapBar: React.FC<GapBarProps> = ({ requiredLevel, finalRating }) => {
  if (requiredLevel === null || requiredLevel === undefined) {
    return (
      <span
        style={{
          fontSize: text.small.fontSize,
          color: colors.textMuted,
          fontStyle: "italic",
        }}
      >
        Not required
      </span>
    );
  }

  if (finalRating === null || finalRating === undefined) {
    return (
      <span
        style={{
          fontSize: text.small.fontSize,
          color: colors.warning,
          fontWeight: 600,
        }}
      >
        Not assessed
      </span>
    );
  }

  // Spec §5.2: gap = required_level - final_rating
  const rawGap = Number((requiredLevel - finalRating).toFixed(1));
  const isDeficit = rawGap > 0;
  const isSurplus = rawGap < 0;

  const barColor = isDeficit
    ? rawGap >= 1.5
      ? colors.ragRed
      : colors.ragAmber
    : isSurplus
    ? colors.frameworkBscAccent
    : colors.ragGreen;

  const badgeBg = isDeficit
    ? rawGap >= 1.5
      ? colors.errorBg
      : colors.warningBg
    : isSurplus
    ? colors.frameworkBscBg
    : colors.successBg;

  const badgeBorder = isDeficit
    ? rawGap >= 1.5
      ? colors.errorBorder
      : colors.warningBorder
    : isSurplus
    ? colors.frameworkBscBorder
    : colors.successBorder;

  const badgeText = isDeficit
    ? `−${rawGap} lvl${rawGap === 1 ? "" : "s"} (Deficit)`
    : isSurplus
    ? `+${Math.abs(rawGap)} lvl${Math.abs(rawGap) === 1 ? "" : "s"} (Surplus)`
    : "Met";

  const actualPct = Math.min(100, Math.max(0, (finalRating / 5) * 100));
  const reqPct = Math.min(100, Math.max(0, (requiredLevel / 5) * 100));

  return (
    <div style={{ display: "flex", alignItems: "center", gap: space[3], minWidth: "210px" }}>
      <div
        style={{
          position: "relative",
          flex: 1,
          height: "8px",
          backgroundColor: colors.surfaceSubtle,
          borderRadius: radii.full,
          border: `1px solid ${colors.borderSubtle}`,
          overflow: " visible",
        }}
        aria-label={`Actual ${finalRating} of 5 versus required ${requiredLevel} of 5`}
      >
        <div
          style={{
            width: `${actualPct}%`,
            height: "100%",
            backgroundColor: barColor,
            borderRadius: radii.full,
            transition: transitions.default,
          }}
        />
        {/* Target marker line */}
        <div
          title={`Required level: ${requiredLevel}`}
          style={{
            position: "absolute",
            left: `${reqPct}%`,
            top: "-3px",
            bottom: "-3px",
            width: "2px",
            backgroundColor: colors.textPrimary,
          }}
        />
      </div>

      <span
        style={{
          padding: "2px 8px",
          borderRadius: radii.full,
          backgroundColor: badgeBg,
          border: `1px solid ${badgeBorder}`,
          color: barColor,
          fontSize: text.micro.fontSize,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
          minWidth: "104px",
          textAlign: "center",
        }}
      >
        {badgeText}
      </span>
    </div>
  );
};

// ==============================================================================
// §11.4 CategoryHeatmap — 5-category × N-row aggregate grid
// Used in Manager Console (team scope) and HR Console (company scope).
// ==============================================================================
export interface CategoryHeatmapRow {
  id: string;
  label: string;
  subtitle?: string;
  categoryAverages: Record<string, number>; // categoryCode -> 1..5 average
}

export interface CategoryHeatmapProps {
  rows: CategoryHeatmapRow[];
  caption?: string;
}

export const CategoryHeatmap: React.FC<CategoryHeatmapProps> = ({ rows, caption }) => {
  const cellColors = (val: number) => {
    if (val >= 4.2) return { bg: colors.successBg, text: colors.success, border: colors.successBorder };
    if (val >= 3.3) return { bg: colors.frameworkBscBg, text: colors.frameworkBsc, border: colors.frameworkBscBorder };
    if (val >= 2.6) return { bg: colors.warningBg, text: colors.warning, border: colors.warningBorder };
    return { bg: colors.errorBg, text: colors.error, border: colors.errorBorder };
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        aria-label={caption || "5-Category Skill Heatmap"}
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: text.body.fontSize,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <thead>
          <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}` }}>
            <th style={{ padding: space[3], textAlign: "left", fontSize: text.small.fontSize, fontWeight: 600, color: colors.textSecondary }}>
              COHORT / SQUAD
            </th>
            {SKILL_CATEGORIES.map((cat) => (
              <th
                key={cat.code}
                style={{
                  padding: space[3],
                  textAlign: "center",
                  fontSize: text.small.fontSize,
                  fontWeight: 600,
                  color: colors.textSecondary,
                }}
              >
                <div>{cat.code}</div>
                <div style={{ fontSize: text.micro.fontSize, fontWeight: 400, color: colors.textMuted }}>
                  {cat.name.replace(/^\d+\.\s*/, "")}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
              <td style={{ padding: space[3] }}>
                <div style={{ fontWeight: 600, color: colors.textPrimary }}>{row.label}</div>
                {row.subtitle && (
                  <div style={{ fontSize: text.small.fontSize, color: colors.textMuted }}>{row.subtitle}</div>
                )}
              </td>
              {SKILL_CATEGORIES.map((cat) => {
                const avg = row.categoryAverages[cat.code] ?? 0;
                const c = cellColors(avg);
                return (
                  <td key={cat.code} style={{ padding: space[2], textAlign: "center" }}>
                    <span
                      style={{
                        display: "inline-block",
                        minWidth: "56px",
                        padding: "4px 8px",
                        borderRadius: radii.sm,
                        backgroundColor: c.bg,
                        border: `1px solid ${c.border}`,
                        color: c.text,
                        fontWeight: 700,
                        fontSize: text.small.fontSize,
                      }}
                    >
                      {avg.toFixed(1)} / 5
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
