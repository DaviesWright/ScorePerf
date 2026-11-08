"use client";

import React, { useState } from "react";
import { colors, typography, radii, shadows } from "../../design-system/tokens";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { Icons } from "../../design-system/Icons";
import { formatDate } from "../../utils/date";

interface Gig {
  id: number;
  title: string;
  practice: string;
  duration: string;
  workload: string;
  requiredSkills: string[];
  matchScore: number;
  lead: string;
  applied?: boolean;
}

interface JournalEntry {
  id: number;
  date: string;
  title: string;
  impact: string;
  tags: string[];
}

export const SkillsMarketplaceView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"t_shaped" | "gigs" | "navigator" | "journal">("t_shaped");

  // Selected Specialist Domain & Leadership Track
  const [selectedDomain, setSelectedDomain] = useState<string>("HR Technology & Analytics");
  const [selectedLeadershipTier, setSelectedLeadershipTier] = useState<"Leads Self" | "Leads Others" | "Leads Organization">("Leads Others");

  // Enrolled Upskilling Courses State
  const [enrolledCourses, setEnrolledCourses] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [gigs, setGigs] = useState<Gig[]>([
    {
      id: 1,
      title: "Cloudflare Edge TCP Multiplexing & Hyperdrive Benchmarking",
      practice: "Cloud & Edge Engineering",
      duration: "3 Weeks",
      workload: "15% Allocation",
      requiredSkills: ["Cloudflare Workers", "PostgreSQL", "Hyperdrive", "Performance Testing"],
      matchScore: 98,
      lead: "Marcus Chen (Engineering Dir)",
    },
    {
      id: 2,
      title: "West Africa Labour Compliance Harmonization (Ghana & Nigeria)",
      practice: "People & Culture & Legal",
      duration: "4 Weeks",
      workload: "10% Allocation",
      requiredSkills: ["Strategic Workforce Planning", "Global Compliance", "Labour Law"],
      matchScore: 84,
      lead: "Sarah Jenkins (Head of P&C)",
    },
    {
      id: 3,
      title: "Enterprise Design System Modernization (Apple / Linear standard)",
      practice: "Enterprise Advisory",
      duration: "2 Weeks",
      workload: "20% Allocation",
      requiredSkills: ["React 19", "Design Tokens", "Accessibility WCAG AAA"],
      matchScore: 92,
      lead: "Julian Vance (Advisory Dir)",
    },
  ]);

  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([
    {
      id: 1,
      date: "2026-11-01",
      title: "Architected Cloudflare Hyperdrive edge pool with Neon PostgreSQL",
      impact: "Eliminated server cold starts, reduced query latency to 1.4ms across 45 client connections.",
      tags: ["Cloudflare", "Performance", "Architecture"],
    },
    {
      id: 2,
      date: "2026-10-24",
      title: "Implemented Strict Single-Framework PMS Governance",
      impact: "Prevented conflicting mathematical scoring distortions across OKR, MBO, and BSC cycles.",
      tags: ["Governance", "PMS", "Methodology"],
    },
    {
      id: 3,
      date: "2026-10-15",
      title: "Equipped 100% of workforce with corporate hardware fleet",
      impact: "Procured and provisioned 54 ThinkPad P16 and MacBook Pro devices with zero onboarding downtime.",
      tags: ["Operations", "Asset Fleet"],
    },
  ]);

  const [newQuickWin, setNewQuickWin] = useState("");
  const [newImpact, setNewImpact] = useState("");
  const [aiSummaryGenerated, setAiSummaryGenerated] = useState(false);

  const handleApplyGig = (id: number) => {
    setGigs((prev) =>
      prev.map((g) => (g.id === id ? { ...g, applied: true } : g))
    );
  };

  const handleAddJournalEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuickWin) return;

    const entry: JournalEntry = {
      id: Date.now(),
      date: new Date().toISOString().slice(0, 10),
      title: newQuickWin,
      impact: newImpact || "High operational value delivered to Senrab ConsulTech.",
      tags: ["Continuous Review", "Quick Win"],
    };

    setJournalEntries([entry, ...journalEntries]);
    setNewQuickWin("");
    setNewImpact("");
  };

  return (
    <div style={{ padding: "1.75rem 2rem", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1.25rem" }}>
        <div>
          <h1
            style={{
              fontSize: typography.sizes.xl,
              fontWeight: typography.weights.bold,
              color: colors.textPrimary,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Skills & Talent Marketplace
          </h1>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button
            variant={activeTab === "t_shaped" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveTab("t_shaped")}
          >
            T-Shaped Competency Radar
          </Button>
          <Button
            variant={activeTab === "gigs" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveTab("gigs")}
          >
            Internal Gig Board ({gigs.length})
          </Button>
          <Button
            variant={activeTab === "navigator" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveTab("navigator")}
          >
            AI Career Navigator
          </Button>
          <Button
            variant={activeTab === "journal" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveTab("journal")}
          >
            Performance Journal
          </Button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.65rem 1rem",
            borderRadius: radii.md,
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            color: "#166534",
            fontSize: typography.sizes.xs,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>✓ {toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#166534", fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 0: T-SHAPED COMPETENCY RADAR & BLIND SPOT ANALYSIS                    */}
      {/* ========================================================================= */}
      {activeTab === "t_shaped" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Header Banner */}
          <div
            style={{
              padding: "1rem 1.25rem",
              borderRadius: radii.lg,
              backgroundColor: colors.indigoSubtle,
              border: `1px solid ${colors.indigoBorder}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Icons.Award size={16} color={colors.indigoAction} />
                <h2 style={{ fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary, margin: 0 }}>
                  T-Shaped Competency Framework &amp; Blind Spot Analysis
                </h2>
              </div>
              <p style={{ fontSize: typography.sizes.xs, color: colors.indigoPrimary, margin: "0.25rem 0 0 0" }}>
                Dynamic skills architecture mapping horizontal baseline competencies (5 Core Pillars) against vertical domain specialization (6 Solution Domains) and leadership maturity.
              </p>
            </div>
            <Badge variant="info" size="sm">Certified Skills Model</Badge>
          </div>

          {/* Grid Layout: Visual Radar Chart (Left) + Blind Spot & Calibration (Right) */}
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "1.5rem" }}>
            {/* Visual SVG Radar Chart */}
            <div
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.lg,
                padding: "1.5rem",
                boxShadow: shadows.sm,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div>
                  <h3 style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
                    T-Shaped Competency Radar
                  </h3>
                  <span style={{ fontSize: "11px", color: colors.textMuted }}>
                    Self-Assessment vs 360-Degree Peer & Supervisor Consensus (1-5 Scale)
                  </span>
                </div>
                <div style={{ display: "flex", gap: "0.85rem", fontSize: "11px", fontWeight: 600 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#4f46e5" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: "rgba(79, 70, 229, 0.5)", border: "1px solid #4f46e5" }} />
                    Self-Score
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#059669" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: "rgba(16, 185, 129, 0.4)", border: "1px solid #059669" }} />
                    360 Peer Consensus
                  </span>
                </div>
              </div>

              {/* SVG Pentagonal Radar Chart */}
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "1rem 0" }}>
                <svg width="340" height="340" viewBox="0 0 340 340" style={{ overflow: "visible" }}>
                  {/* Concentric Polygons for 20%, 40%, 60%, 80%, 100% */}
                  {[0.2, 0.4, 0.6, 0.8, 1.0].map((level, idx) => {
                    const r = 110 * level;
                    const cx = 170;
                    const cy = 170;
                    const points = [
                      `${cx},${cy - r}`, // Top (Business Acumen)
                      `${cx + r * 0.951},${cy - r * 0.309}`, // Top Right (Data Literacy)
                      `${cx + r * 0.588},${cy + r * 0.809}`, // Bottom Right (Digital Agility)
                      `${cx - r * 0.588},${cy + r * 0.809}`, // Bottom Left (People Advocacy)
                      `${cx - r * 0.951},${cy - r * 0.309}`, // Top Left (Execution Excellence)
                    ].join(" ");

                    return (
                      <polygon
                        key={idx}
                        points={points}
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="1"
                        strokeDasharray={idx === 4 ? "none" : "2,2"}
                      />
                    );
                  })}

                  {/* Axis lines from center to outer vertices */}
                  {[
                    { x: 170, y: 60, label: "Business Acumen", anchor: "middle", dx: 0, dy: -8 },
                    { x: 274.6, y: 136, label: "Data Literacy", anchor: "start", dx: 8, dy: 0 },
                    { x: 234.7, y: 259, label: "Digital Agility", anchor: "start", dx: 8, dy: 8 },
                    { x: 105.3, y: 259, label: "People Advocacy", anchor: "end", dx: -8, dy: 8 },
                    { x: 65.4, y: 136, label: "Execution Excellence", anchor: "end", dx: -8, dy: 0 },
                  ].map((axis, idx) => (
                    <g key={idx}>
                      <line x1="170" y1="170" x2={axis.x} y2={axis.y} stroke="#cbd5e1" strokeWidth="1" />
                      <text
                        x={axis.x + axis.dx}
                        y={axis.y + axis.dy}
                        textAnchor={axis.anchor as any}
                        fontSize="10"
                        fontWeight="700"
                        fill="#334155"
                      >
                        {axis.label}
                      </text>
                    </g>
                  ))}

                  {/* Polygon 1: 360 Peer Consensus (Green) */}
                  {/* Scores out of 5: Business Acumen: 4.2, Data Literacy: 4.8, Digital Agility: 4.6, People Advocacy: 3.7, Execution: 4.4 */}
                  <polygon
                    points={[
                      `${170},${170 - 110 * (4.2 / 5)}`,
                      `${170 + 110 * (4.8 / 5) * 0.951},${170 - 110 * (4.8 / 5) * 0.309}`,
                      `${170 + 110 * (4.6 / 5) * 0.588},${170 + 110 * (4.6 / 5) * 0.809}`,
                      `${170 - 110 * (3.7 / 5) * 0.588},${170 + 110 * (3.7 / 5) * 0.809}`,
                      `${170 - 110 * (4.4 / 5) * 0.951},${170 - 110 * (4.4 / 5) * 0.309}`,
                    ].join(" ")}
                    fill="rgba(16, 185, 129, 0.25)"
                    stroke="#059669"
                    strokeWidth="2"
                  />

                  {/* Polygon 2: Self-Score (Indigo) */}
                  {/* Scores out of 5: Business Acumen: 4.6, Data Literacy: 3.6, Digital Agility: 4.7, People Advocacy: 4.9, Execution: 4.5 */}
                  <polygon
                    points={[
                      `${170},${170 - 110 * (4.6 / 5)}`,
                      `${170 + 110 * (3.6 / 5) * 0.951},${170 - 110 * (3.6 / 5) * 0.309}`,
                      `${170 + 110 * (4.7 / 5) * 0.588},${170 + 110 * (4.7 / 5) * 0.809}`,
                      `${170 - 110 * (4.9 / 5) * 0.588},${170 + 110 * (4.9 / 5) * 0.809}`,
                      `${170 - 110 * (4.5 / 5) * 0.951},${170 - 110 * (4.5 / 5) * 0.309}`,
                    ].join(" ")}
                    fill="rgba(79, 70, 229, 0.2)"
                    stroke="#4f46e5"
                    strokeWidth="2"
                  />

                  {/* Dots for Self-Score */}
                  <circle cx="170" cy={170 - 110 * (4.6 / 5)} r="4" fill="#4f46e5" />
                  <circle cx={170 + 110 * (3.6 / 5) * 0.951} cy={170 - 110 * (3.6 / 5) * 0.309} r="4" fill="#4f46e5" />
                  <circle cx={170 + 110 * (4.7 / 5) * 0.588} cy={170 + 110 * (4.7 / 5) * 0.809} r="4" fill="#4f46e5" />
                  <circle cx={170 - 110 * (4.9 / 5) * 0.588} cy={170 + 110 * (4.9 / 5) * 0.809} r="4" fill="#4f46e5" />
                  <circle cx={170 - 110 * (4.5 / 5) * 0.951} cy={170 - 110 * (4.5 / 5) * 0.309} r="4" fill="#4f46e5" />

                  {/* Dots for 360 Peer Consensus */}
                  <circle cx="170" cy={170 - 110 * (4.2 / 5)} r="4" fill="#059669" />
                  <circle cx={170 + 110 * (4.8 / 5) * 0.951} cy={170 - 110 * (4.8 / 5) * 0.309} r="4" fill="#059669" />
                  <circle cx={170 + 110 * (4.6 / 5) * 0.588} cy={170 + 110 * (4.6 / 5) * 0.809} r="4" fill="#059669" />
                  <circle cx={170 - 110 * (3.7 / 5) * 0.588} cy={170 + 110 * (3.7 / 5) * 0.809} r="4" fill="#059669" />
                  <circle cx={170 - 110 * (4.4 / 5) * 0.951} cy={170 - 110 * (4.4 / 5) * 0.309} r="4" fill="#059669" />
                </svg>
              </div>

              {/* Radar Metric Legend */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.5rem", borderTop: `1px solid ${colors.border}`, paddingTop: "0.75rem", textAlign: "center" }}>
                {[
                  { name: "Business", self: 4.6, peer: 4.2 },
                  { name: "Data", self: 3.6, peer: 4.8 },
                  { name: "Digital", self: 4.7, peer: 4.6 },
                  { name: "People", self: 4.9, peer: 3.7 },
                  { name: "Execution", self: 4.5, peer: 4.4 },
                ].map((item) => (
                  <div key={item.name} style={{ padding: "0.35rem", backgroundColor: colors.surfaceSubtle, borderRadius: radii.sm }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: colors.textSecondary }}>{item.name}</div>
                    <div style={{ fontSize: "11px", fontWeight: 800, color: "#4f46e5" }}>{item.self} <span style={{ fontSize: "10px", color: "#059669" }}>({item.peer})</span></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Blind Spot & Hidden Strength Analysis */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Overconfidence Flag (Blind Spot) */}
              <div
                style={{
                  padding: "1.25rem",
                  borderRadius: radii.md,
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Icons.AlertTriangle size={16} color="#dc2626" />
                    <span style={{ fontSize: typography.sizes.xs, fontWeight: 800, color: "#991b1b", textTransform: "uppercase" }}>
                      Critical Blind Spot Detected (Overconfident Gap: +1.2)
                    </span>
                  </div>
                  <Badge variant="error" size="sm">Action Required</Badge>
                </div>
                <h4 style={{ margin: "0.2rem 0 0.35rem 0", fontSize: typography.sizes.sm, fontWeight: 700, color: "#991b1b" }}>
                  People Advocacy (Self: 4.9 vs 360 Peer Consensus: 3.7)
                </h4>
                <p style={{ margin: 0, fontSize: typography.sizes.xs, color: "#7f1d1d", lineHeight: 1.5 }}>
                  <strong>Diagnostic:</strong> You perceive your cross-team empathy and people advocacy at peak levels (4.9/5), but junior peers report feeling unheard during rapid sprint changes (3.7/5).
                </p>
                <div style={{ marginTop: "0.75rem", padding: "0.5rem 0.75rem", backgroundColor: "#ffffff", borderRadius: radii.sm, border: "1px solid #fca5a5", fontSize: "11px", color: "#991b1b" }}>
                  💡 <strong>Prescribed Development Action:</strong> Complete the <em>&quot;Active Listening &amp; Psychological Safety in Leadership&quot;</em> workshop.
                </div>
              </div>

              {/* Underconfidence Flag (Hidden Superpower) */}
              <div
                style={{
                  padding: "1.25rem",
                  borderRadius: radii.md,
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Icons.Sparkles size={16} color="#2563eb" />
                    <span style={{ fontSize: typography.sizes.xs, fontWeight: 800, color: "#1e40af", textTransform: "uppercase" }}>
                      Hidden Strength Revealed (Underconfident Gap: -1.2)
                    </span>
                  </div>
                  <Badge variant="info" size="sm">Superpower</Badge>
                </div>
                <h4 style={{ margin: "0.2rem 0 0.35rem 0", fontSize: typography.sizes.sm, fontWeight: 700, color: "#1e40af" }}>
                  Data Literacy (Self: 3.6 vs 360 Peer Consensus: 4.8)
                </h4>
                <p style={{ margin: 0, fontSize: typography.sizes.xs, color: "#1e3a8a", lineHeight: 1.5 }}>
                  <strong>Diagnostic:</strong> You underestimated your quantitative influence (3.6/5), yet your division relies directly on your PostgreSQL Hyperdrive telemetry and statistical models (4.8/5 consensus).
                </p>
                <div style={{ marginTop: "0.75rem", padding: "0.5rem 0.75rem", backgroundColor: "#ffffff", borderRadius: radii.sm, border: "1px solid #93c5fd", fontSize: "11px", color: "#1e40af" }}>
                  ⭐ <strong>Advancement Opportunity:</strong> Appoint as Division Data & AI Ethics Champion for Q1 FY27.
                </div>
              </div>
            </div>
          </div>

          {/* Solution Domain & Leadership Track Mapping */}
          <div
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.lg,
              padding: "1.5rem",
              boxShadow: shadows.sm,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
                  Specialist Domain & Leadership Track Progression
                </h3>
                <span style={{ fontSize: "11px", color: colors.textMuted }}>
                  Map employee into one of the 6 Solution Domains while calibrating their leadership tier.
                </span>
              </div>
              <Badge variant="success" size="sm">Active Profile: {selectedLeadershipTier}</Badge>
            </div>

            {/* Leadership Tiers Selector */}
            <div style={{ marginBottom: "1.25rem" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted, textTransform: "uppercase" }}>
                Select Leadership Dimension:
              </span>
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.4rem" }}>
                {(["Leads Self", "Leads Others", "Leads Organization"] as const).map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setSelectedLeadershipTier(tier)}
                    style={{
                      flex: 1,
                      padding: "0.6rem 1rem",
                      borderRadius: radii.md,
                      border: `1px solid ${selectedLeadershipTier === tier ? colors.indigoAction : colors.border}`,
                      backgroundColor: selectedLeadershipTier === tier ? colors.indigoSubtle : colors.surfaceSubtle,
                      color: selectedLeadershipTier === tier ? colors.indigoPrimary : colors.textSecondary,
                      fontWeight: selectedLeadershipTier === tier ? 700 : 500,
                      fontSize: typography.sizes.xs,
                      cursor: "pointer",
                      transition: "background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease",
                    }}
                  >
                    {tier === "Leads Self" && "👤 Leads Self (Personal Mastery)"}
                    {tier === "Leads Others" && "👥 Leads Others (People & Team Lead)"}
                    {tier === "Leads Organization" && "🏛️ Leads Organization (Strategic Executive)"}
                  </button>
                ))}
              </div>
            </div>

            {/* 6 Core Specialist Solution Domains */}
            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted, textTransform: "uppercase" }}>
                6 Core Specialist Solution Domains:
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginTop: "0.4rem" }}>
                {[
                  { name: "Talent Growth & Learning", icon: "🌱", desc: "Capability building, LMS, career architecture" },
                  { name: "People Operations & Payroll", icon: "⚙️", desc: "Statutory labor compliance, payroll, benefits" },
                  { name: "Total Rewards & Compensation", icon: "💎", desc: "Executive incentive plans, salary banding, equity" },
                  { name: "Organizational Development & Culture", icon: "🏛️", desc: "Org design, M&A integrations, psychological safety" },
                  { name: "HR Technology & Analytics", icon: "🤖", desc: "Cloudflare edge HRIS, D1 databases, AI copilot" },
                  { name: "Employee Experience & Relations", icon: "🤝", desc: "Engagement pulses, grievance mediation, DEI" },
                ].map((dom) => (
                  <div
                    key={dom.name}
                    onClick={() => setSelectedDomain(dom.name)}
                    style={{
                      padding: "0.85rem",
                      borderRadius: radii.md,
                      border: `1px solid ${selectedDomain === dom.name ? colors.indigoAction : colors.border}`,
                      backgroundColor: selectedDomain === dom.name ? colors.indigoSubtle : colors.surface,
                      cursor: "pointer",
                      transition: "background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.25rem" }}>
                      <span style={{ fontSize: "16px" }}>{dom.icon}</span>
                      <span style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textPrimary }}>
                        {dom.name}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: "11px", color: colors.textMuted, lineHeight: 1.4 }}>
                      {dom.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upskilling Resource Recommendations */}
          <div
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.lg,
              padding: "1.5rem",
              boxShadow: shadows.sm,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
                  Targeted Upskilling Course Library
                </h3>
                <span style={{ fontSize: "11px", color: colors.textMuted }}>
                  Course enrollments auto-debited from your corporate GH₵10,000 Annual Learning Stipend.
                </span>
              </div>
              <Badge variant="info" size="sm">Verified Credentials</Badge>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
              {[
                {
                  id: "SKILL-001",
                  title: "Strategic Commercial Fluency & Financial Acumen",
                  gap: "Business Acumen",
                  duration: "16 Hours (Self-paced)",
                  badge: "Executive Cert",
                  cost: "GH₵3,200",
                },
                {
                  id: "SKILL-002",
                  title: "Psychological Safety & Active Empathic Listening",
                  gap: "People Advocacy",
                  duration: "12 Hours (Live Masterclass)",
                  badge: "Leadership Badge",
                  cost: "GH₵2,400",
                },
                {
                  id: "SKILL-003",
                  title: "Predictive People Analytics with Python & SQL",
                  gap: "Data Literacy",
                  duration: "24 Hours (Hands-on Lab)",
                  badge: "Technical Specialist",
                  cost: "GH₵4,000",
                },
              ].map((course) => {
                const isEnrolled = enrolledCourses.includes(course.id);
                return (
                  <div
                    key={course.id}
                    style={{
                      padding: "1rem",
                      borderRadius: radii.md,
                      border: `1px solid ${colors.border}`,
                      backgroundColor: colors.surfaceSubtle,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                        <span style={{ fontSize: "10px", fontWeight: 700, color: colors.indigoAction, textTransform: "uppercase" }}>
                          Target: {course.gap}
                        </span>
                        <Badge variant="neutral" size="sm">{course.badge}</Badge>
                      </div>
                      <h4 style={{ margin: "0.2rem 0 0.4rem 0", fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textPrimary }}>
                        {course.title}
                      </h4>
                      <div style={{ fontSize: "11px", color: colors.textMuted }}>
                        ⏱ {course.duration} • <strong>{course.cost}</strong>
                      </div>
                    </div>
                    <div style={{ marginTop: "1rem" }}>
                      <Button
                        variant={isEnrolled ? "secondary" : "primary"}
                        size="sm"
                        disabled={isEnrolled}
                        onClick={() => {
                          setEnrolledCourses((prev) => [...prev, course.id]);
                          setToastMessage(`Enrolled in "${course.title}". Learning stipend updated.`);
                          setTimeout(() => setToastMessage(null), 4000);
                        }}
                        style={{ width: "100%" }}
                      >
                        {isEnrolled ? "Enrolled ✓" : "Enroll via Learning Stipend"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 1: Internal Gig Board */}
      {activeTab === "gigs" && (
        <div>
          <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: typography.sizes.sm, color: colors.textSecondary }}>
              Opportunity Marketplace: Internal short-term gigs matched to your verified competency graph.
            </span>
            <Badge variant="success" size="sm">3 Matching Gigs</Badge>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.25rem" }}>
            {gigs.map((g) => (
              <div
                key={g.id}
                style={{
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radii.md,
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <Badge variant="info" size="sm">{g.practice}</Badge>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#059669" }}>
                      ★ {g.matchScore}% Skill Match
                    </span>
                  </div>

                  <h3 style={{ fontSize: typography.sizes.base, fontWeight: typography.weights.bold, color: colors.textPrimary, margin: "0.25rem 0 0.5rem 0" }}>
                    {g.title}
                  </h3>
                  <div style={{ fontSize: typography.sizes.xs, color: colors.textMuted, marginBottom: "0.75rem" }}>
                    Led by: <strong>{g.lead}</strong> • {g.duration} ({g.workload})
                  </div>

                  {/* Required Skills */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "1rem" }}>
                    {g.requiredSkills.map((sk) => (
                      <span
                        key={sk}
                        style={{
                          fontSize: "10px",
                          padding: "0.15rem 0.45rem",
                          borderRadius: radii.sm,
                          backgroundColor: colors.surfaceSubtle,
                          color: colors.textSecondary,
                          border: `1px solid ${colors.border}`,
                        }}
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    borderTop: `1px solid ${colors.borderSubtle}`,
                    paddingTop: "0.75rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: typography.sizes.xs, color: colors.textMuted }}>
                    {g.applied ? "Application Submitted" : "Cross-Practice Project"}
                  </span>
                  <Button
                    variant={g.applied ? "secondary" : "primary"}
                    size="sm"
                    disabled={g.applied}
                    onClick={() => handleApplyGig(g.id)}
                  >
                    {g.applied ? "Applied ✓" : "Apply for Gig"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: AI Career Navigator */}
      {activeTab === "navigator" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem" }}>
          {/* Target Role & Gap Analysis */}
          <div
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              padding: "1.5rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <span style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted, textTransform: "uppercase" }}>
                  Active Trajectory Plan
                </span>
                <h3 style={{ fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.textPrimary, margin: "0.2rem 0" }}>
                  Managing Partner / Practice Director (Target: 2 Years)
                </h3>
              </div>
              <Badge variant="okr" size="sm">78% Career Readiness</Badge>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: colors.textMuted, marginBottom: "0.4rem" }}>
                <span>Skill Graph Completion</span>
                <span style={{ fontWeight: 700, color: colors.textPrimary }}>7 of 9 Competencies Verified</span>
              </div>
              <div style={{ height: "8px", backgroundColor: colors.surfaceSubtle, borderRadius: radii.full, overflow: "hidden" }}>
                <div style={{ width: "78%", height: "100%", backgroundColor: colors.brandBlue }} />
              </div>
            </div>

            {/* Verified Skills */}
            <div style={{ marginBottom: "1.25rem" }}>
              <h4 style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: colors.textMuted, marginBottom: "0.5rem" }}>
                Verified Core Competencies (Verified by Work Output)
              </h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {[
                  "Cloudflare Edge Architecture",
                  "PostgreSQL Hyperdrive Optimization",
                  "High-Integrity PMS Governance",
                  "Enterprise Client Advisory",
                  "Engineering Team Leadership",
                ].map((s) => (
                  <span
                    key={s}
                    style={{
                      padding: "0.3rem 0.6rem",
                      borderRadius: radii.sm,
                      backgroundColor: "#f0fdf4",
                      color: "#166534",
                      border: "1px solid #bbf7d0",
                      fontSize: typography.sizes.xs,
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem",
                    }}
                  >
                    ✓ {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Missing Skills & System Recommendations */}
            <div>
              <h4 style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#b91c1c", marginBottom: "0.5rem" }}>
                Identified Skill Gaps for Promotion
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <div style={{ padding: "0.75rem", backgroundColor: "#fffbeb", borderRadius: radii.sm, border: "1px solid #fde68a" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, fontSize: typography.sizes.xs, color: "#92400e" }}>
                      1. Strategic Workforce Planning
                    </span>
                    <Badge variant="warning" size="sm">Gap</Badge>
                  </div>
                  <p style={{ fontSize: "11px", color: "#78350f", margin: "0.25rem 0 0 0" }}>
                    Recommended Action: Join the internal gig <em>"West Africa Labour Compliance Harmonization"</em> to fulfill this competency requirement.
                  </p>
                </div>

                <div style={{ padding: "0.75rem", backgroundColor: "#fffbeb", borderRadius: radii.sm, border: "1px solid #fde68a" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, fontSize: typography.sizes.xs, color: "#92400e" }}>
                      2. Multi-Jurisdiction Corporate Governance
                    </span>
                    <Badge variant="warning" size="sm">Gap</Badge>
                  </div>
                  <p style={{ fontSize: "11px", color: "#78350f", margin: "0.25rem 0 0 0" }}>
                    Recommended Course: <em>African & UK Corporate Governance Masterclass</em> (Paid via your GH₵10,000 Learning Stipend).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Career Coach Nudge Card */}
          <div
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <Icons.Sparkles size={18} color={colors.brandBlue} />
                <h3 style={{ fontSize: typography.sizes.base, fontWeight: typography.weights.bold, color: colors.textPrimary, margin: 0 }}>
                  AI Career Coach Insight
                </h3>
              </div>
              <p style={{ fontSize: typography.sizes.sm, color: colors.textSecondary, lineHeight: 1.6 }}>
                "Paa, you have delivered outsized engineering and operational impact with 100% hardware coverage and sub-15ms edge latency. To transition to <strong>Practice Principal</strong> in 2027, the Board expects documented cross-practice talent development and multi-region compliance leadership."
              </p>
            </div>

            <div style={{ padding: "1rem", backgroundColor: colors.surfaceSubtle, borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted, textTransform: "uppercase" }}>
                Direct Action
              </div>
              <div style={{ fontSize: typography.sizes.xs, color: colors.textPrimary, marginTop: "0.25rem" }}>
                Your Learning Stipend balance is GH₵10,000. Book recommended executive courses with 1 click.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Continuous Performance Journal */}
      {activeTab === "journal" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem" }}>
          {/* Quick Win Log Form & Feed */}
          <div>
            {/* Entry Form */}
            <form
              onSubmit={handleAddJournalEntry}
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.md,
                padding: "1.25rem",
                marginBottom: "1.5rem",
              }}
            >
              <h3 style={{ fontSize: typography.sizes.sm, fontWeight: typography.weights.bold, color: colors.textPrimary, margin: "0 0 0.75rem 0" }}>
                Log Continuous Quick Win / High-Impact Contribution
              </h3>
              <div style={{ marginBottom: "0.75rem" }}>
                <input
                  required
                  type="text"
                  placeholder="What did you achieve? (e.g. Optimized client database query by 50%)"
                  value={newQuickWin}
                  onChange={(e) => setNewQuickWin(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: radii.md,
                    border: `1px solid ${colors.border}`,
                    fontSize: typography.sizes.sm,
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ marginBottom: "0.75rem" }}>
                <input
                  type="text"
                  placeholder="Measurable business impact or metrics..."
                  value={newImpact}
                  onChange={(e) => setNewImpact(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: radii.md,
                    border: `1px solid ${colors.border}`,
                    fontSize: typography.sizes.sm,
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button variant="primary" size="sm" type="submit">
                  + Record to Journal
                </Button>
              </div>
            </form>

            {/* Journal Entries List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
                  Recorded Quick Wins ({journalEntries.length})
                </h3>
                <span style={{ fontSize: "11px", color: colors.textMuted }}>Continuous Performance Record</span>
              </div>

              {journalEntries.map((j) => (
                <div
                  key={j.id}
                  style={{
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radii.md,
                    padding: "1rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.25rem" }}>
                    <span style={{ fontWeight: typography.weights.semibold, color: colors.textPrimary, fontSize: typography.sizes.sm }}>
                      {j.title}
                    </span>
                    <span style={{ fontSize: "11px", color: colors.textMuted, fontWeight: 500 }}>
                      {formatDate(j.date)}
                    </span>
                  </div>
                  <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0 0 0.5rem 0", lineHeight: 1.4 }}>
                    {j.impact}
                  </p>
                  <div style={{ display: "flex", gap: "0.35rem" }}>
                    {j.tags.map((t) => (
                      <span key={t} style={{ fontSize: "10px", padding: "0.1rem 0.4rem", borderRadius: radii.sm, backgroundColor: colors.surfaceSubtle, color: colors.textMuted }}>
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Performance Dossier Generator */}
          <div
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <Icons.Sparkles size={18} color={colors.frameworkOkr} />
                <h3 style={{ fontSize: typography.sizes.base, fontWeight: typography.weights.bold, color: colors.textPrimary, margin: 0 }}>
                  Bias-Free AI Performance Dossier
                </h3>
              </div>
              <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, lineHeight: 1.5, marginBottom: "1rem" }}>
                Instead of stressful annual reviews, ScoReview aggregates your continuous quick wins into a bias-free, evidence-backed annual summary with zero recency bias.
              </p>

              {aiSummaryGenerated ? (
                <div style={{ padding: "1rem", backgroundColor: "#faf5ff", borderRadius: radii.md, border: "1px solid #e9d5ff", fontSize: typography.sizes.xs, lineHeight: 1.6, color: "#581c87" }}>
                  <strong>AI Executive Summary:</strong> &quot;Paa demonstrated top-tier engineering stewardship in FY26. Key measurable deliverables include Cloudflare Hyperdrive edge pool deployment (sub-15ms latency), 100% hardware coverage across 45 consultants, and strict single-framework calibration governance. Recommended rating: <strong>4.8 / 5.0 (Exceptional Impact)</strong>.&quot;
                </div>
              ) : (
                <div style={{ padding: "1.5rem", textAlign: "center", backgroundColor: colors.surfaceSubtle, borderRadius: radii.md, color: colors.textMuted, fontSize: typography.sizes.xs }}>
                  Ready to synthesize 3 logged quick wins into executive appraisal format.
                </div>
              )}
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setAiSummaryGenerated(true)}
              style={{ marginTop: "1rem" }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Icons.Sparkles size={14} />
                <span>{aiSummaryGenerated ? "Re-synthesize Dossier" : "Generate AI Performance Summary"}</span>
              </span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
