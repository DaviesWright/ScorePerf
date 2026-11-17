"use client";

import React, { useState } from "react";
import { colors, typography, radii, shadows } from "../../design-system/tokens";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { Icons } from "../../design-system/Icons";
import { formatDate } from "../../utils/date";

export interface SkillItem {
  no: number;
  title: string;
  category: "Core Skills" | "Non-Core Skills" | "Human Capacity Building" | "Leadership Skills" | "Functional Skills";
  status: "Active" | "Inactive";
  description?: string;
}

export interface SkillCategoryItem {
  no: number;
  title: string;
  description: string;
  count: number;
}

export interface SkillReviewRecord {
  no: number;
  employeeName: string;
  employeeId: string;
  role: string;
  status: "Pending Approval Benjamin Arthur" | "Pending Employee" | "No Pending Assessment" | "Completed";
  lastAssessment: string;
}

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
  const [activeTab, setActiveTab] = useState<
    "skills" | "categories" | "gap_analysis" | "reviews" | "gigs" | "t_shaped" | "navigator" | "journal"
  >("skills");

  // Filter & Search states
  const [searchSkill, setSearchSkill] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("All");
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [openReviewDropdownId, setOpenReviewDropdownId] = useState<number | null>(null);

  // Modal states
  const [showAddSkillModal, setShowAddSkillModal] = useState(false);
  const [newCompTitle, setNewCompTitle] = useState("");
  const [newCompCategory, setNewCompCategory] = useState<SkillItem["category"]>("Core Skills");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected skill for Gap Analysis
  const [gapSelectedCompId, setGapSelectedCompId] = useState<number>(3); // Default to AI skill
  const [gapSearchQuery, setGapSearchQuery] = useState("");

  // 1. The 20 Skills (Exact User Master List)
  const [skills, setSkills] = useState<SkillItem[]>([
    {
      no: 1,
      title: "Title",
      category: "Non-Core Skills",
      status: "Active",
      description: "Foundational professional etiquette and title designation clarity.",
    },
    {
      no: 2,
      title: "Knowledge of Books",
      category: "Core Skills",
      status: "Active",
      description: "Thorough understanding of regulatory statutes, corporate ledgers, and operational manuals.",
    },
    {
      no: 3,
      title: "Ability to use AI to accelerate productivity and achieve work goals",
      category: "Core Skills",
      status: "Active",
      description: "Leveraging generative AI workflows, intelligent automation, and LLM tooling for high-speed delivery.",
    },
    {
      no: 4,
      title: "Time Management",
      category: "Core Skills",
      status: "Active",
      description: "Prioritizing high-leverage milestones and meeting delivery SLAs consistently.",
    },
    {
      no: 5,
      title: "Managing and Developing Workforce",
      category: "Human Capacity Building",
      status: "Active",
      description: "Optimally assigning talent, mentoring direct reports, and building long-term bench strength.",
    },
    {
      no: 6,
      title: "Ability to show emotional intelligence on the job",
      category: "Functional Skills",
      status: "Active",
      description: "Navigating workplace dynamics, showing empathy, and de-escalating interpersonal tensions.",
    },
    {
      no: 7,
      title: "Delivering Results & Ensuring Customer Satisfaction - Ensuring Customer Satisfaction",
      category: "Non-Core Skills",
      status: "Active",
      description: "Proactive client engagement and exceptional service satisfaction ratings.",
    },
    {
      no: 8,
      title: "Ability to Develop Staff - Able to provide guidance and support to staff for career development",
      category: "Non-Core Skills",
      status: "Active",
      description: "Providing structured career progression plans and coaching to junior colleagues.",
    },
    {
      no: 9,
      title: "Delivering Results & Ensuring Customer Satisfaction - Ensuring the delivery of quality service and products",
      category: "Non-Core Skills",
      status: "Active",
      description: "Maintaining strict QA protocols and zero-defect product standards.",
    },
    {
      no: 10,
      title: "Ability to work Effectively in a Team - Ability to function in a Team",
      category: "Non-Core Skills",
      status: "Active",
      description: "Seamless cross-functional collaboration and accountability across squad deliverables.",
    },
    {
      no: 11,
      title: "Respect and Commitment - Respect for superiors, colleagues and customers",
      category: "Non-Core Skills",
      status: "Active",
      description: "Demonstrating high professional respect and ethical decorum across all engagements.",
    },
    {
      no: 12,
      title: "Ability to Develop Staff - Able to develop others (subordinates)",
      category: "Non-Core Skills",
      status: "Active",
      description: "Delivering hands-on skills transfer and structured performance feedback to team members.",
    },
    {
      no: 13,
      title: "Commitment to own personal development and training - Eagerness for self development",
      category: "Non-Core Skills",
      status: "Active",
      description: "Proactive self-learning and pursuit of certifications outside scheduled working hours.",
    },
    {
      no: 14,
      title: "Commitment to own personal development and training - Inner drive to supplement training from organization",
      category: "Non-Core Skills",
      status: "Active",
      description: "Independently mastering new paradigms to stay ahead of industry disruptions.",
    },
    {
      no: 15,
      title: "Following Instructions and Working Towards Organisational Goals - Keeping to laid down regulations and procedures",
      category: "Non-Core Skills",
      status: "Active",
      description: "Strict adherence to statutory compliance, audit guidelines, and operating policies.",
    },
    {
      no: 16,
      title: "Respect and Commitment - Commitment to work and organisational development",
      category: "Non-Core Skills",
      status: "Active",
      description: "Deep engagement with institutional growth, brand stewardship, and collective success.",
    },
    {
      no: 17,
      title: "Developing/Managing Budgets & Saving Costs - Executing result-based actions",
      category: "Core Skills",
      status: "Active",
      description: "Fiscal stewardship, cost containment, and ROI-driven expenditure management.",
    },
    {
      no: 18,
      title: "Maximising and maintaining Productivity - Ability to manage pressure and setbacks effectively",
      category: "Core Skills",
      status: "Active",
      description: "Resilience under critical deadlines and maintaining operational poise amidst turbulence.",
    },
    {
      no: 19,
      title: "Supporting & Cooperating - Ability to work effectively with teams, clients and staff",
      category: "Core Skills",
      status: "Active",
      description: "Fostering psychological safety, mutual support, and team synergy.",
    },
    {
      no: 20,
      title: "Maximising and maintaining Productivity - Ability to accept challenges and execute them with confidence",
      category: "Core Skills",
      status: "Active",
      description: "Taking ownership of complex mandates and delivering with confidence and precision.",
    },
  ]);

  // 2. The 5 Skill Categories
  const [categories] = useState<SkillCategoryItem[]>([
    {
      no: 1,
      title: "Non-Core Skills",
      description: "Non-Core Skills for the Public Service Commission, Ghana",
      count: 10,
    },
    {
      no: 2,
      title: "Core Skills",
      description: "Skills essential for all employees of the public service commission, Ghana",
      count: 7,
    },
    {
      no: 3,
      title: "Human Capacity Building",
      description: "Managing workforce optimally",
      count: 1,
    },
    {
      no: 4,
      title: "Leadership Skills",
      description: "These are skills for managerial roles",
      count: 1,
    },
    {
      no: 5,
      title: "Functional Skills",
      description: "These are role specific skills",
      count: 1,
    },
  ]);

  // 3. Skill Reviews Records (from screenshot)
  const [reviewRecords, setReviewRecords] = useState<SkillReviewRecord[]>([
    {
      no: 1,
      employeeName: "Richard Mamphey",
      employeeId: "SHR/GH/038",
      role: "Head, Human Resources",
      status: "Pending Approval Benjamin Arthur",
      lastAssessment: "Thu, Jun 11, 2026. 10:11 pm",
    },
    {
      no: 2,
      employeeName: "Isaac Boateng",
      employeeId: "SHR/GH/010",
      role: "Chief Financial Officer",
      status: "Pending Employee",
      lastAssessment: "Mon, Sep 2, 2024.",
    },
    {
      no: 3,
      employeeName: "Joel Mawutor",
      employeeId: "GH/2024/10/18/127",
      role: "Administrative Officer",
      status: "No Pending Assessment",
      lastAssessment: "-- -- --",
    },
    {
      no: 4,
      employeeName: "John Asamoah",
      employeeId: "GH/2022/2/1/103",
      role: "R&D Lead",
      status: "No Pending Assessment",
      lastAssessment: "-- -- --",
    },
    {
      no: 5,
      employeeName: "Philip Arthur",
      employeeId: "HFTL143",
      role: "Customer Service Executive",
      status: "No Pending Assessment",
      lastAssessment: "-- -- --",
    },
    {
      no: 6,
      employeeName: "Dave Nii",
      employeeId: "HFTL145",
      role: "IT Infrastructure Officer",
      status: "No Pending Assessment",
      lastAssessment: "-- -- --",
    },
  ]);

  // Selected Specialist Domain & Leadership Track
  const [selectedDomain, setSelectedDomain] = useState<string>("HR Technology & Analytics");
  const [selectedLeadershipTier, setSelectedLeadershipTier] = useState<"Leads Self" | "Leads Others" | "Leads Organization">("Leads Others");

  // Enrolled Upskilling Courses State
  const [enrolledCourses, setEnrolledCourses] = useState<string[]>([]);

  // Gigs State
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

  // Journal Entries
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
      title: "Standardized Appraisal Calibration & Governance",
      impact: "Prevented conflicting scoring distortions across OKR, MBO, and BSC cycles.",
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

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompTitle.trim()) return;

    const newItem: SkillItem = {
      no: skills.length + 1,
      title: newCompTitle.trim(),
      category: newCompCategory,
      status: "Active",
      description: "Custom organizational skill added by HR Administrator.",
    };

    setSkills([...skills, newItem]);
    setShowAddSkillModal(false);
    setNewCompTitle("");
    setToastMessage(`Skill "${newItem.title}" created successfully.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const toggleSkillStatus = (no: number) => {
    setSkills(
      skills.map((c) =>
        c.no === no ? { ...c, status: c.status === "Active" ? "Inactive" : "Active" } : c
      )
    );
    setOpenDropdownId(null);
  };

  const deleteSkill = (no: number) => {
    if (confirm("Are you sure you want to delete this skill?")) {
      setSkills(skills.filter((c) => c.no !== no));
      setOpenDropdownId(null);
    }
  };

  const handleApplyGig = (id: number) => {
    setGigs((prev) => prev.map((g) => (g.id === id ? { ...g, applied: true } : g)));
    setToastMessage("Gig application submitted to Practice Director.");
    setTimeout(() => setToastMessage(null), 4000);
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

  // Filtered skills
  const filteredSkills = skills.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(searchSkill.toLowerCase());
    const matchesCat = selectedCategoryFilter === "All" || c.category === selectedCategoryFilter;
    return matchesSearch && matchesCat;
  });

  const selectedGapComp = skills.find((c) => c.no === gapSelectedCompId) || skills[2];

  return (
    <div style={{ padding: "1.75rem 2rem", maxWidth: "1440px", margin: "0 auto" }}>
      {/* Header Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Icons.Compass size={22} color={colors.indigoAction} />
            <h1
              style={{
                fontSize: typography.sizes.xl,
                fontWeight: typography.weights.bold,
                color: colors.textPrimary,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              Talent, Skills &amp; Gig Board
            </h1>
            <Badge variant="okr" size="sm">20 Skills Configured</Badge>
          </div>
          <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0.3rem 0 0 0" }}>
            Organizational skill framework, employee reviews, gap analysis diagnostics, and internal gig marketplace.
          </p>
        </div>

        {/* Global Action */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button variant="primary" size="sm" onClick={() => setShowAddSkillModal(true)}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Icons.Plus size={14} />
              <span>Add Skill</span>
            </span>
          </Button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div
        style={{
          display: "flex",
          gap: "0.4rem",
          borderBottom: `1px solid ${colors.borderSubtle}`,
          paddingBottom: "0.5rem",
          marginBottom: "1.25rem",
          overflowX: "auto",
        }}
      >
        {[
          { key: "skills", label: `Skills (${skills.length})`, icon: Icons.Award },
          { key: "categories", label: `Skill Categories (${categories.length})`, icon: Icons.Layers },
          { key: "gap_analysis", label: "Skill Gap Analysis", icon: Icons.Crosshair },
          { key: "reviews", label: `Skill Reviews (${reviewRecords.length})`, icon: Icons.Users },
          { key: "gigs", label: `Internal Gig Board (${gigs.length})`, icon: Icons.Briefcase },
          { key: "t_shaped", label: "T-Shaped Radar", icon: Icons.Target },
          { key: "navigator", label: "AI Career Navigator", icon: Icons.Sparkles },
          { key: "journal", label: `Performance Journal (${journalEntries.length})`, icon: Icons.FileText },
        ].map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <tab.icon size={14} />
              <span>{tab.label}</span>
            </span>
          </Button>
        ))}
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
      {/* TAB 1: SKILLS MASTER LIST (Exact Table from Screenshot 1 & 20 items) */}
      {/* ========================================================================= */}
      {activeTab === "skills" && (
        <div style={{ backgroundColor: colors.surface, borderRadius: radii.lg, border: `1px solid ${colors.border}`, overflow: "hidden", boxShadow: shadows.xs }}>
          {/* Controls Bar: Search & Category Filter */}
          <div
            style={{
              padding: "1rem 1.25rem",
              borderBottom: `1px solid ${colors.borderSubtle}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem",
              backgroundColor: colors.surfaceSubtle,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, maxWidth: "480px" }}>
              <div style={{ position: "relative", width: "100%" }}>
                <Icons.Search size={15} color={colors.textMuted} style={{ position: "absolute", left: "10px", top: "10px" }} />
                <input
                  type="text"
                  placeholder="Search skills by keyword..."
                  value={searchSkill}
                  onChange={(e) => setSearchSkill(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem 0.5rem 2.25rem",
                    borderRadius: radii.md,
                    border: `1px solid ${colors.border}`,
                    fontSize: typography.sizes.xs,
                    backgroundColor: colors.surface,
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted, textTransform: "uppercase" }}>Category:</span>
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                style={{
                  padding: "0.45rem 0.75rem",
                  borderRadius: radii.md,
                  border: `1px solid ${colors.border}`,
                  fontSize: typography.sizes.xs,
                  backgroundColor: colors.surface,
                  color: colors.textPrimary,
                  cursor: "pointer",
                }}
              >
                <option value="All">All Categories ({skills.length})</option>
                <option value="Core Skills">Core Skills</option>
                <option value="Non-Core Skills">Non-Core Skills</option>
                <option value="Human Capacity Building">Human Capacity Building</option>
                <option value="Functional Skills">Functional Skills</option>
                <option value="Leadership Skills">Leadership Skills</option>
              </select>

              <Button variant="primary" size="sm" onClick={() => setShowAddSkillModal(true)}>
                + Add Skill
              </Button>
            </div>
          </div>

          {/* Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: `1.5px solid ${colors.border}`, textAlign: "left" }}>
                <th style={{ padding: "0.85rem 1rem", color: "#1e3a8a", fontWeight: 700, width: "60px" }}>NO</th>
                <th style={{ padding: "0.85rem 1rem", color: "#1e3a8a", fontWeight: 700 }}>SKILL</th>
                <th style={{ padding: "0.85rem 1rem", color: "#1e3a8a", fontWeight: 700 }}>CATEGORY</th>
                <th style={{ padding: "0.85rem 1rem", color: "#1e3a8a", fontWeight: 700, width: "110px" }}>STATUS</th>
                <th style={{ padding: "0.85rem 1rem", color: "#1e3a8a", fontWeight: 700, width: "130px", textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredSkills.map((comp) => (
                <tr
                  key={comp.no}
                  style={{
                    borderBottom: `1px solid ${colors.borderSubtle}`,
                    transition: "background-color 0.12s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <td style={{ padding: "0.9rem 1rem", fontWeight: 700, color: colors.textSecondary }}>
                    {comp.no}
                  </td>
                  <td style={{ padding: "0.9rem 1rem" }}>
                    <div style={{ fontWeight: 700, color: colors.textPrimary, lineHeight: 1.4 }}>
                      {comp.title}
                    </div>
                    {comp.description && (
                      <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "0.2rem" }}>
                        {comp.description}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "0.9rem 1rem" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: comp.category === "Core Skills" ? "#1e40af" : "#475569",
                        backgroundColor: comp.category === "Core Skills" ? "#eff6ff" : "#f1f5f9",
                        padding: "0.25rem 0.6rem",
                        borderRadius: radii.sm,
                        border: `1px solid ${comp.category === "Core Skills" ? "#bfdbfe" : "#e2e8f0"}`,
                        display: "inline-block",
                      }}
                    >
                      {comp.category}
                    </span>
                  </td>
                  <td style={{ padding: "0.9rem 1rem" }}>
                    <span
                      style={{
                        padding: "0.25rem 0.65rem",
                        borderRadius: radii.full,
                        fontSize: "11px",
                        fontWeight: 700,
                        backgroundColor: comp.status === "Active" ? "#ecfdf5" : "#f1f5f9",
                        color: comp.status === "Active" ? "#059669" : "#64748b",
                        border: `1px solid ${comp.status === "Active" ? "#a7f3d0" : "#cbd5e1"}`,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                      }}
                    >
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: comp.status === "Active" ? "#10b981" : "#94a3b8" }} />
                      {comp.status}
                    </span>
                  </td>
                  <td style={{ padding: "0.9rem 1rem", textAlign: "right", position: "relative" }}>
                    <button
                      type="button"
                      onClick={() => setOpenDropdownId(openDropdownId === comp.no ? null : comp.no)}
                      style={{
                        backgroundColor: "#2563eb",
                        color: "#ffffff",
                        padding: "0.35rem 0.75rem",
                        borderRadius: radii.sm,
                        border: "none",
                        fontSize: "11.5px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                      }}
                    >
                      <span>Action</span>
                      <Icons.ChevronDown size={12} color="#ffffff" />
                    </button>

                    {/* Dropdown Menu (Matches Screenshot 1) */}
                    {openDropdownId === comp.no && (
                      <div
                        style={{
                          position: "absolute",
                          right: "1rem",
                          top: "2.75rem",
                          backgroundColor: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: radii.md,
                          boxShadow: shadows.md,
                          zIndex: 50,
                          minWidth: "150px",
                          textAlign: "left",
                          overflow: "hidden",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            alert(`Editing skill #${comp.no}: ${comp.title}`);
                            setOpenDropdownId(null);
                          }}
                          style={{
                            width: "100%",
                            padding: "0.6rem 0.85rem",
                            border: "none",
                            background: "none",
                            textAlign: "left",
                            fontSize: "11.5px",
                            color: colors.textPrimary,
                            cursor: "pointer",
                            display: "block",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            alert(`Assigning job role mapping for: ${comp.title}`);
                            setOpenDropdownId(null);
                          }}
                          style={{
                            width: "100%",
                            padding: "0.6rem 0.85rem",
                            border: "none",
                            background: "none",
                            textAlign: "left",
                            fontSize: "11.5px",
                            color: colors.textPrimary,
                            cursor: "pointer",
                            display: "block",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          Add job role
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSkillStatus(comp.no)}
                          style={{
                            width: "100%",
                            padding: "0.6rem 0.85rem",
                            border: "none",
                            background: "none",
                            textAlign: "left",
                            fontSize: "11.5px",
                            color: comp.status === "Active" ? "#d97706" : "#059669",
                            cursor: "pointer",
                            display: "block",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          {comp.status === "Active" ? "De-activate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSkill(comp.no)}
                          style={{
                            width: "100%",
                            padding: "0.6rem 0.85rem",
                            border: "none",
                            background: "none",
                            textAlign: "left",
                            fontSize: "11.5px",
                            color: "#dc2626",
                            cursor: "pointer",
                            display: "block",
                            borderTop: "1px solid #f1f5f9",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fef2f2")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SKILL CATEGORIES (Matches Screenshot 2)                       */}
      {/* ========================================================================= */}
      {activeTab === "categories" && (
        <div style={{ backgroundColor: colors.surface, borderRadius: radii.lg, border: `1px solid ${colors.border}`, padding: "1.5rem", boxShadow: shadows.xs }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: typography.sizes.lg, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
              Skill Categories
            </h2>
            <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: "0.3rem", lineHeight: 1.5 }}>
              This is a list of all the skill categories in your organization. You can create, edit, activate, and deactivate new categories, and skills that are close to the categories you have created.
            </p>
          </div>

          <div style={{ border: `1px solid ${colors.border}`, borderRadius: radii.md, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: `1.5px solid ${colors.border}`, textAlign: "left" }}>
                  <th style={{ padding: "0.85rem 1rem", color: "#1e3a8a", fontWeight: 700, width: "60px" }}>NO</th>
                  <th style={{ padding: "0.85rem 1rem", color: "#1e3a8a", fontWeight: 700, width: "240px" }}>TITLE</th>
                  <th style={{ padding: "0.85rem 1rem", color: "#1e3a8a", fontWeight: 700 }}>DESCRIPTION</th>
                  <th style={{ padding: "0.85rem 1rem", color: "#1e3a8a", fontWeight: 700, textAlign: "right", width: "120px" }}>SKILLS</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.no} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                    <td style={{ padding: "0.95rem 1rem", fontWeight: 700, color: colors.textSecondary }}>
                      {cat.no}
                    </td>
                    <td style={{ padding: "0.95rem 1rem", fontWeight: 700, color: colors.indigoPrimary }}>
                      {cat.title}
                    </td>
                    <td style={{ padding: "0.95rem 1rem", color: colors.textSecondary }}>
                      {cat.description}
                    </td>
                    <td style={{ padding: "0.95rem 1rem", textAlign: "right" }}>
                      <Badge variant="okr" size="sm">{cat.count} Items</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SKILL GAP ANALYSIS (Matches Screenshot 3)                     */}
      {/* ========================================================================= */}
      {activeTab === "gap_analysis" && (
        <div style={{ backgroundColor: colors.surface, borderRadius: radii.lg, border: `1px solid ${colors.border}`, padding: "1.5rem", boxShadow: shadows.xs }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: typography.sizes.lg, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
              Skill Gap Analysis
            </h2>
            <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: "0.3rem" }}>
              Analyse the skills in your organisation and discover the best ways to reduce gaps.
            </p>
          </div>

          <div style={{ maxWidth: "680px", marginBottom: "2rem" }}>
            <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 700, color: "#1e40af", marginBottom: "0.5rem" }}>
              Select a skill to conduct gap analysis on *
            </label>

            {/* Select Box with Search Filter inside */}
            <div style={{ border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: "0.75rem", backgroundColor: "#f8fafc" }}>
              <div style={{ position: "relative", marginBottom: "0.5rem" }}>
                <Icons.Search size={14} color={colors.textMuted} style={{ position: "absolute", left: "8px", top: "8px" }} />
                <input
                  type="text"
                  placeholder="Search here..."
                  value={gapSearchQuery}
                  onChange={(e) => setGapSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.45rem 0.6rem 0.45rem 1.85rem",
                    borderRadius: radii.sm,
                    border: `1px solid ${colors.border}`,
                    fontSize: typography.sizes.xs,
                    backgroundColor: "#ffffff",
                  }}
                />
              </div>

              <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                {skills
                  .filter((c) => c.title.toLowerCase().includes(gapSearchQuery.toLowerCase()))
                  .map((comp) => (
                    <button
                      key={comp.no}
                      type="button"
                      onClick={() => setGapSelectedCompId(comp.no)}
                      style={{
                        padding: "0.5rem 0.75rem",
                        textAlign: "left",
                        backgroundColor: gapSelectedCompId === comp.no ? "#eff6ff" : "transparent",
                        border: `1px solid ${gapSelectedCompId === comp.no ? "#bfdbfe" : "transparent"}`,
                        borderRadius: radii.sm,
                        color: gapSelectedCompId === comp.no ? "#1e40af" : colors.textPrimary,
                        fontSize: typography.sizes.xs,
                        fontWeight: gapSelectedCompId === comp.no ? 700 : 400,
                        cursor: "pointer",
                      }}
                    >
                      {comp.no}. {comp.title}
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* Diagnostic Card for Selected Skill */}
          {selectedGapComp && (
            <div
              style={{
                padding: "1.25rem",
                borderRadius: radii.md,
                backgroundColor: colors.surfaceSubtle,
                border: `1px solid ${colors.border}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: colors.indigoAction, textTransform: "uppercase" }}>
                    Skill Gap Diagnostic: #{selectedGapComp.no}
                  </span>
                  <h3 style={{ fontSize: typography.sizes.sm, fontWeight: 800, color: colors.indigoPrimary, margin: "0.2rem 0" }}>
                    {selectedGapComp.title}
                  </h3>
                  <span style={{ fontSize: "11px", color: colors.textMuted }}>Category: {selectedGapComp.category}</span>
                </div>
                <Badge variant="warning" size="md">Identified Workforce Gap: 24%</Badge>
              </div>

              {/* Metric Breakdown */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginTop: "1rem" }}>
                <div style={{ padding: "0.75rem 1rem", backgroundColor: "#ffffff", borderRadius: radii.sm, border: `1px solid ${colors.border}` }}>
                  <div style={{ fontSize: "11px", color: colors.textMuted }}>Organizational Benchmark</div>
                  <div style={{ fontSize: typography.sizes.base, fontWeight: 800, color: colors.indigoPrimary, marginTop: "0.2rem" }}>
                    4.5 / 5.0
                  </div>
                  <div style={{ fontSize: "10.5px", color: "#166534" }}>Target standard for PSC Ghana</div>
                </div>

                <div style={{ padding: "0.75rem 1rem", backgroundColor: "#ffffff", borderRadius: radii.sm, border: `1px solid ${colors.border}` }}>
                  <div style={{ fontSize: "11px", color: colors.textMuted }}>Current Workforce Readiness</div>
                  <div style={{ fontSize: typography.sizes.base, fontWeight: 800, color: "#d97706", marginTop: "0.2rem" }}>
                    3.4 / 5.0
                  </div>
                  <div style={{ fontSize: "10.5px", color: "#b45309" }}>Evaluated across 91 employees</div>
                </div>

                <div style={{ padding: "0.75rem 1rem", backgroundColor: "#ffffff", borderRadius: radii.sm, border: `1px solid ${colors.border}` }}>
                  <div style={{ fontSize: "11px", color: colors.textMuted }}>Prescribed Intervention</div>
                  <div style={{ fontSize: typography.sizes.base, fontWeight: 800, color: colors.emeraldDark, marginTop: "0.2rem" }}>
                    1 Gig + 2 Courses
                  </div>
                  <div style={{ fontSize: "10.5px", color: colors.textSecondary }}>Ready to dispatch via Gig Board</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SKILL REVIEWS (Matches Screenshot 4)                          */}
      {/* ========================================================================= */}
      {activeTab === "reviews" && (
        <div style={{ backgroundColor: colors.surface, borderRadius: radii.lg, border: `1px solid ${colors.border}`, overflow: "hidden", boxShadow: shadows.xs }}>
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: `1px solid ${colors.borderSubtle}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div>
                <h2 style={{ fontSize: typography.sizes.lg, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
                  Skill Reviews
                </h2>
                <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: "0.25rem" }}>
                  This is the list of all skills to be reviewed.
                </p>
              </div>

              <div style={{ fontSize: "12px", color: colors.textMuted }}>
                Showing 1 to 6 of 91 employees • Page 1 of 5
              </div>
            </div>
          </div>

          {/* Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: `1.5px solid ${colors.border}`, textAlign: "left" }}>
                <th style={{ padding: "0.85rem 1rem", color: "#1e3a8a", fontWeight: 700, width: "60px" }}>NO</th>
                <th style={{ padding: "0.85rem 1rem", color: "#1e3a8a", fontWeight: 700 }}>EMPLOYEE</th>
                <th style={{ padding: "0.85rem 1rem", color: "#1e3a8a", fontWeight: 700 }}>STATUS</th>
                <th style={{ padding: "0.85rem 1rem", color: "#1e3a8a", fontWeight: 700 }}>LAST ASSESSMENT</th>
                <th style={{ padding: "0.85rem 1rem", color: "#1e3a8a", fontWeight: 700, textAlign: "right", width: "130px" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {reviewRecords.map((rec) => (
                <tr key={rec.no} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                  <td style={{ padding: "0.9rem 1rem", fontWeight: 700, color: colors.textSecondary }}>
                    {rec.no}
                  </td>
                  <td style={{ padding: "0.9rem 1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          backgroundColor: "#e0e7ff",
                          color: "#3730a3",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "11px",
                        }}
                      >
                        {rec.employeeName.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: colors.textPrimary }}>{rec.employeeName}</div>
                        <div style={{ fontSize: "11px", color: colors.textMuted }}>
                          {rec.employeeId} • {rec.role}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "0.9rem 1rem" }}>
                    <span
                      style={{
                        padding: "0.25rem 0.65rem",
                        borderRadius: radii.full,
                        fontSize: "11px",
                        fontWeight: 600,
                        backgroundColor:
                          rec.status.includes("Pending Approval")
                            ? "#fae8ff"
                            : rec.status.includes("Pending Employee")
                            ? "#fef3c7"
                            : "#f1f5f9",
                        color:
                          rec.status.includes("Pending Approval")
                            ? "#86198f"
                            : rec.status.includes("Pending Employee")
                            ? "#b45309"
                            : "#64748b",
                        border: `1px solid ${
                          rec.status.includes("Pending Approval")
                            ? "#f0abfc"
                            : rec.status.includes("Pending Employee")
                            ? "#fde68a"
                            : "#e2e8f0"
                        }`,
                        display: "inline-block",
                      }}
                    >
                      {rec.status}
                    </span>
                  </td>
                  <td style={{ padding: "0.9rem 1rem", color: colors.textSecondary }}>
                    {rec.lastAssessment}
                  </td>
                  <td style={{ padding: "0.9rem 1rem", textAlign: "right", position: "relative" }}>
                    <button
                      type="button"
                      onClick={() => setOpenReviewDropdownId(openReviewDropdownId === rec.no ? null : rec.no)}
                      style={{
                        backgroundColor: "#2563eb",
                        color: "#ffffff",
                        padding: "0.35rem 0.75rem",
                        borderRadius: radii.sm,
                        border: "none",
                        fontSize: "11.5px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                      }}
                    >
                      <span>Action</span>
                      <Icons.ChevronDown size={12} color="#ffffff" />
                    </button>

                    {/* Review Actions Dropdown (Matches Screenshot 4) */}
                    {openReviewDropdownId === rec.no && (
                      <div
                        style={{
                          position: "absolute",
                          right: "1rem",
                          top: "2.75rem",
                          backgroundColor: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: radii.md,
                          boxShadow: shadows.md,
                          zIndex: 50,
                          minWidth: "190px",
                          textAlign: "left",
                          overflow: "hidden",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            alert(`Nudge sent to line manager for ${rec.employeeName}`);
                            setOpenReviewDropdownId(null);
                          }}
                          style={{
                            width: "100%",
                            padding: "0.6rem 0.85rem",
                            border: "none",
                            background: "none",
                            textAlign: "left",
                            fontSize: "11.5px",
                            color: colors.textPrimary,
                            cursor: "pointer",
                            display: "block",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          Nudge line manager
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            alert(`Viewing assigned skills for ${rec.employeeName}`);
                            setOpenReviewDropdownId(null);
                          }}
                          style={{
                            width: "100%",
                            padding: "0.6rem 0.85rem",
                            border: "none",
                            background: "none",
                            textAlign: "left",
                            fontSize: "11.5px",
                            color: colors.textPrimary,
                            cursor: "pointer",
                            display: "block",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          View skills
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            alert(`Loading assessment audit history for ${rec.employeeName}`);
                            setOpenReviewDropdownId(null);
                          }}
                          style={{
                            width: "100%",
                            padding: "0.6rem 0.85rem",
                            border: "none",
                            background: "none",
                            textAlign: "left",
                            fontSize: "11.5px",
                            color: colors.textPrimary,
                            cursor: "pointer",
                            display: "block",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          View assessment history
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Cancel pending skill assessment for ${rec.employeeName}?`)) {
                              setReviewRecords(
                                reviewRecords.map((r) =>
                                  r.no === rec.no ? { ...r, status: "No Pending Assessment" } : r
                                )
                              );
                              setOpenReviewDropdownId(null);
                            }
                          }}
                          style={{
                            width: "100%",
                            padding: "0.6rem 0.85rem",
                            border: "none",
                            background: "none",
                            textAlign: "left",
                            fontSize: "11.5px",
                            color: "#dc2626",
                            cursor: "pointer",
                            display: "block",
                            borderTop: "1px solid #f1f5f9",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fef2f2")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          Cancel skill assessment
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: INTERNAL GIG BOARD                                                 */}
      {/* ========================================================================= */}
      {activeTab === "gigs" && (
        <div>
          <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: typography.sizes.sm, color: colors.textSecondary }}>
              Opportunity Marketplace: Internal short-term gigs matched to your verified skill graph.
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

      {/* ========================================================================= */}
      {/* TAB 6: T-SHAPED RADAR                                                     */}
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
                  T-Shaped Skill Framework &amp; Blind Spot Analysis
                </h2>
              </div>
              <p style={{ fontSize: typography.sizes.xs, color: colors.indigoPrimary, margin: "0.25rem 0 0 0" }}>
                Dynamic skills architecture mapping horizontal baseline skills (5 Core Pillars) against vertical domain specialization (6 Solution Domains) and leadership maturity.
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
                    T-Shaped Skill Radar
                  </h3>
                  <span style={{ fontSize: "11px", color: colors.textMuted }}>
                    Self-Assessment vs 360-Degree Peer &amp; Supervisor Consensus (1-5 Scale)
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
                  {[0.2, 0.4, 0.6, 0.8, 1.0].map((level, idx) => {
                    const r = 110 * level;
                    const cx = 170;
                    const cy = 170;
                    const points = [
                      `${cx},${cy - r}`,
                      `${cx + r * 0.951},${cy - r * 0.309}`,
                      `${cx + r * 0.588},${cy + r * 0.809}`,
                      `${cx - r * 0.588},${cy + r * 0.809}`,
                      `${cx - r * 0.951},${cy - r * 0.309}`,
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
                </svg>
              </div>
            </div>

            {/* Blind Spot Diagnostic */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div
                style={{
                  padding: "1.25rem",
                  borderRadius: radii.md,
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: typography.sizes.xs, fontWeight: 800, color: "#991b1b", textTransform: "uppercase" }}>
                    Critical Blind Spot (Overconfidence Gap: +1.2)
                  </span>
                  <Badge variant="error" size="sm">Action Required</Badge>
                </div>
                <h4 style={{ margin: "0.2rem 0 0.35rem 0", fontSize: typography.sizes.sm, fontWeight: 700, color: "#991b1b" }}>
                  People Advocacy (Self: 4.9 vs 360 Peer Consensus: 3.7)
                </h4>
                <p style={{ margin: 0, fontSize: typography.sizes.xs, color: "#7f1d1d", lineHeight: 1.5 }}>
                  Diagnostic: Self-perceived high advocacy contrasts with peer feedback on listening during rapid sprints.
                </p>
              </div>

              <div
                style={{
                  padding: "1.25rem",
                  borderRadius: radii.md,
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: typography.sizes.xs, fontWeight: 800, color: "#1e40af", textTransform: "uppercase" }}>
                    Hidden Superpower (Underconfidence Gap: -1.2)
                  </span>
                  <Badge variant="info" size="sm">Superpower</Badge>
                </div>
                <h4 style={{ margin: "0.2rem 0 0.35rem 0", fontSize: typography.sizes.sm, fontWeight: 700, color: "#1e40af" }}>
                  Data Literacy (Self: 3.6 vs 360 Peer Consensus: 4.8)
                </h4>
                <p style={{ margin: 0, fontSize: typography.sizes.xs, color: "#1e3a8a", lineHeight: 1.5 }}>
                  Diagnostic: Division heavily leverages your quantitative architecture and query models.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: AI CAREER NAVIGATOR                                                */}
      {/* ========================================================================= */}
      {activeTab === "navigator" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem" }}>
          <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <span style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted, textTransform: "uppercase" }}>Active Trajectory Plan</span>
                <h3 style={{ fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.textPrimary, margin: "0.2rem 0" }}>
                  Managing Partner / Practice Director (Target: 2 Years)
                </h3>
              </div>
              <Badge variant="okr" size="sm">78% Career Readiness</Badge>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: colors.textMuted, marginBottom: "0.4rem" }}>
                <span>Skill Graph Completion</span>
                <span style={{ fontWeight: 700, color: colors.textPrimary }}>15 of 20 Skills Verified</span>
              </div>
              <div style={{ height: "8px", backgroundColor: colors.surfaceSubtle, borderRadius: radii.full, overflow: "hidden" }}>
                <div style={{ width: "78%", height: "100%", backgroundColor: colors.brandBlue }} />
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <Icons.Sparkles size={18} color={colors.brandBlue} />
              <h3 style={{ fontSize: typography.sizes.base, fontWeight: typography.weights.bold, color: colors.textPrimary, margin: 0 }}>
                AI Career Coach Insight
              </h3>
            </div>
            <p style={{ fontSize: typography.sizes.sm, color: colors.textSecondary, lineHeight: 1.6 }}>
              Paa has demonstrated top-tier engineering stewardship. Focus on <strong>Managing and Developing Workforce</strong> and <strong>Fiscal Budgeting</strong> to prepare for Senior Principal track in 2027.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: PERFORMANCE JOURNAL                                                */}
      {/* ========================================================================= */}
      {activeTab === "journal" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem" }}>
          <div>
            <form
              onSubmit={handleAddJournalEntry}
              style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: "1.25rem", marginBottom: "1.5rem" }}
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
                  style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
                />
              </div>
              <div style={{ marginBottom: "0.75rem" }}>
                <input
                  type="text"
                  placeholder="Measurable business impact or metrics..."
                  value={newImpact}
                  onChange={(e) => setNewImpact(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button variant="primary" size="sm" type="submit">
                  + Record to Journal
                </Button>
              </div>
            </form>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {journalEntries.map((j) => (
                <div key={j.id} style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.25rem" }}>
                    <span style={{ fontWeight: typography.weights.semibold, color: colors.textPrimary, fontSize: typography.sizes.sm }}>{j.title}</span>
                    <span style={{ fontSize: "11px", color: colors.textMuted }}>{formatDate(j.date)}</span>
                  </div>
                  <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0 0 0.5rem 0" }}>{j.impact}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <Icons.Sparkles size={18} color={colors.frameworkOkr} />
              <h3 style={{ fontSize: typography.sizes.base, fontWeight: typography.weights.bold, color: colors.textPrimary, margin: 0 }}>
                AI Performance Dossier
              </h3>
            </div>
            {aiSummaryGenerated ? (
              <div style={{ padding: "1rem", backgroundColor: "#faf5ff", borderRadius: radii.md, border: "1px solid #e9d5ff", fontSize: typography.sizes.xs, lineHeight: 1.6, color: "#581c87" }}>
                <strong>AI Executive Summary:</strong> &quot;Paa demonstrated top-tier engineering stewardship in FY26. Key measurable deliverables include database platform deployment (sub-15ms latency), 100% hardware coverage across 45 consultants, and rigorous performance calibration governance.&quot;
              </div>
            ) : (
              <div style={{ padding: "1.5rem", textAlign: "center", backgroundColor: colors.surfaceSubtle, borderRadius: radii.md, color: colors.textMuted, fontSize: typography.sizes.xs }}>
                Ready to synthesize continuous quick wins into executive appraisal format.
              </div>
            )}
            <Button variant="primary" size="sm" onClick={() => setAiSummaryGenerated(true)} style={{ marginTop: "1rem", width: "100%" }}>
              Generate AI Performance Summary
            </Button>
          </div>
        </div>
      )}

      {/* Add Skill Modal */}
      {showAddSkillModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              maxWidth: "500px",
              width: "100%",
              boxShadow: shadows.lg,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: `1px solid ${colors.borderSubtle}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: colors.surfaceSubtle,
              }}
            >
              <h3 style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.indigoPrimary, margin: 0 }}>
                Add New Organizational Skill
              </h3>
              <button
                type="button"
                onClick={() => setShowAddSkillModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: colors.textMuted }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSkill} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                  Skill Title &amp; Definition *
                </label>
                <input
                  type="text"
                  value={newCompTitle}
                  onChange={(e) => setNewCompTitle(e.target.value)}
                  placeholder="e.g. Delivering Results & Ensuring Customer Satisfaction"
                  style={{ width: "100%", padding: "0.55rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                  Category *
                </label>
                <select
                  value={newCompCategory}
                  onChange={(e) => setNewCompCategory(e.target.value as SkillItem["category"])}
                  style={{ width: "100%", padding: "0.55rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
                >
                  <option value="Core Skills">Core Skills</option>
                  <option value="Non-Core Skills">Non-Core Skills</option>
                  <option value="Human Capacity Building">Human Capacity Building</option>
                  <option value="Functional Skills">Functional Skills</option>
                  <option value="Leadership Skills">Leadership Skills</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                <Button variant="outline" size="sm" type="button" onClick={() => setShowAddSkillModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Save Skill
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
