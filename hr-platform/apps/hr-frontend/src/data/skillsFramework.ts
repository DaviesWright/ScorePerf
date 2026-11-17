// ==============================================================================
// ScoreviewHR — Canonical Skills Framework (Addendum v1.2)
// 20 Skills across 5 Categories (4 per category) + 5-Level Proficiency Scale
// Shared vocabulary across Performance, Gap Analysis, ESS, Manager/HR Consoles,
// and the Skills & Gig Board. Structurally immutable in v1 (VAL-SKILL-001).
// ==============================================================================

export type SkillCategoryCode = "TECH" | "EXEC" | "PPL" | "LEAD" | "PERS";

export type ProficiencyLevelNumber = 1 | 2 | 3 | 4 | 5;

export interface SkillCategoryRecord {
  id: string;
  code: SkillCategoryCode;
  name: string;
  displayOrder: number;
  description: string;
}

export interface SkillRecord {
  id: string;
  categoryId: string;
  categoryCode: SkillCategoryCode;
  categoryName: string;
  code: string; // "1.1" .. "5.4"
  name: string;
  description: string;
  displayOrder: number;
  isActive: boolean;
}

export interface ProficiencyLevelSpec {
  level: ProficiencyLevelNumber;
  label: "Novice" | "Developing" | "Proficient" | "Advanced" | "Expert";
  descriptor: string;
}

export type GapBaselineKey =
  | "my_role"
  | "target_role"
  | "team_benchmark"
  | "company_benchmark"
  | "previous_cycle"
  | "gig_requirements";

export interface EmployeeSkillAssessmentRecord {
  skillId: string;
  skillCode: string;
  selfRating: ProficiencyLevelNumber | null;
  managerRating: ProficiencyLevelNumber | null;
  finalRating: ProficiencyLevelNumber | null;
  evidenceNote: string;
  assessedAt: string; // ISO date
  assessedBy: string;
  calibrationJustification?: string;
}

export interface GigSkillRequirement {
  skillCode: string;
  minLevel: ProficiencyLevelNumber;
}

export interface AlignedGigRecord {
  id: string;
  title: string;
  practice: string;
  duration: string;
  workload: string;
  lead: string;
  requiredSkills: GigSkillRequirement[];
  status: "Open" | "In Progress" | "Completed";
  applied?: boolean;
  completed?: boolean;
}

// §3: Single 5-level proficiency scale used everywhere
export const SKILL_PROFICIENCY_SCALE: ProficiencyLevelSpec[] = [
  {
    level: 1,
    label: "Novice",
    descriptor: "Requires close guidance; limited applied experience.",
  },
  {
    level: 2,
    label: "Developing",
    descriptor: "Works with occasional support; building confidence.",
  },
  {
    level: 3,
    label: "Proficient",
    descriptor: "Works independently to expected standard.",
  },
  {
    level: 4,
    label: "Advanced",
    descriptor: "Handles complex cases; guides others.",
  },
  {
    level: 5,
    label: "Expert",
    descriptor: "Recognized authority; sets standards; mentors broadly.",
  },
];

export const getProficiencyLabel = (level?: number | null): string => {
  if (!level) return "Not assessed";
  const found = SKILL_PROFICIENCY_SCALE.find((s) => s.level === Math.round(level));
  return found ? `${found.level} — ${found.label}` : `${level}`;
};

// §2.1: 5 Fixed Categories
export const SKILL_CATEGORIES: SkillCategoryRecord[] = [
  {
    id: "CAT-TECH",
    code: "TECH",
    name: "1. Technical & Functional",
    displayOrder: 1,
    description: "Core domain mastery, quantitative analytics, systems fluency, and structured technical problem-solving.",
  },
  {
    id: "CAT-EXEC",
    code: "EXEC",
    name: "2. Execution & Delivery",
    displayOrder: 2,
    description: "Planning, operational rigor, deadline reliability, and fiscal/resource discipline.",
  },
  {
    id: "CAT-PPL",
    code: "PPL",
    name: "3. People & Collaboration",
    displayOrder: 3,
    description: "Clarity of communication, cross-functional teamwork, stakeholder trust, and active coaching.",
  },
  {
    id: "CAT-LEAD",
    code: "LEAD",
    name: "4. Leadership & Strategy",
    displayOrder: 4,
    description: "Long-horizon strategic thinking, sound judgment, innovation leadership, and talent development.",
  },
  {
    id: "CAT-PERS",
    code: "PERS",
    name: "5. Personal Effectiveness",
    displayOrder: 5,
    description: "End-to-end ownership, composure under pressure, learning velocity, and ethical integrity.",
  },
];

// §2.1: 20 Fixed Skills (4 per category)
export const SKILLS_TAXONOMY: SkillRecord[] = [
  // 1. Technical & Functional (TECH)
  {
    id: "SK-1.1",
    categoryId: "CAT-TECH",
    categoryCode: "TECH",
    categoryName: "1. Technical & Functional",
    code: "1.1",
    name: "Domain Expertise",
    description: "Applies deep functional and statutory knowledge to deliver accurate, high-impact work outputs.",
    displayOrder: 1,
    isActive: true,
  },
  {
    id: "SK-1.2",
    categoryId: "CAT-TECH",
    categoryCode: "TECH",
    categoryName: "1. Technical & Functional",
    code: "1.2",
    name: "Data & Analytics",
    description: "Interprets metrics, builds quantitative models, and grounds decisions in verifiable evidence.",
    displayOrder: 2,
    isActive: true,
  },
  {
    id: "SK-1.3",
    categoryId: "CAT-TECH",
    categoryCode: "TECH",
    categoryName: "1. Technical & Functional",
    code: "1.3",
    name: "Tools & Systems Proficiency",
    description: "Uses core enterprise platforms, AI workflows, and technical toolchains to accelerate productivity.",
    displayOrder: 3,
    isActive: true,
  },
  {
    id: "SK-1.4",
    categoryId: "CAT-TECH",
    categoryCode: "TECH",
    categoryName: "1. Technical & Functional",
    code: "1.4",
    name: "Technical Problem-Solving",
    description: "Diagnoses root causes systematically and engineers resilient solutions to complex operational problems.",
    displayOrder: 4,
    isActive: true,
  },

  // 2. Execution & Delivery (EXEC)
  {
    id: "SK-2.1",
    categoryId: "CAT-EXEC",
    categoryCode: "EXEC",
    categoryName: "2. Execution & Delivery",
    code: "2.1",
    name: "Planning & Prioritization",
    description: "Sequences milestones effectively, focuses on high-leverage deliverables, and manages dependencies.",
    displayOrder: 5,
    isActive: true,
  },
  {
    id: "SK-2.2",
    categoryId: "CAT-EXEC",
    categoryCode: "EXEC",
    categoryName: "2. Execution & Delivery",
    code: "2.2",
    name: "Quality & Accuracy",
    description: "Maintains high craftsmanship, zero-defect verification standards, and thorough customer satisfaction.",
    displayOrder: 6,
    isActive: true,
  },
  {
    id: "SK-2.3",
    categoryId: "CAT-EXEC",
    categoryCode: "EXEC",
    categoryName: "2. Execution & Delivery",
    code: "2.3",
    name: "Time & Deadline Management",
    description: "Delivers on schedule against SLA commitments and communicates early when timelines shift.",
    displayOrder: 7,
    isActive: true,
  },
  {
    id: "SK-2.4",
    categoryId: "CAT-EXEC",
    categoryCode: "EXEC",
    categoryName: "2. Execution & Delivery",
    code: "2.4",
    name: "Resource & Budget Discipline",
    description: "Develops and manages budgets prudently, controls costs, and executes result-based fiscal actions.",
    displayOrder: 8,
    isActive: true,
  },

  // 3. People & Collaboration (PPL)
  {
    id: "SK-3.1",
    categoryId: "CAT-PPL",
    categoryCode: "PPL",
    categoryName: "3. People & Collaboration",
    code: "3.1",
    name: "Communication",
    description: "Conveys complex ideas clearly in writing and speech; listens actively across all levels.",
    displayOrder: 9,
    isActive: true,
  },
  {
    id: "SK-3.2",
    categoryId: "CAT-PPL",
    categoryCode: "PPL",
    categoryName: "3. People & Collaboration",
    code: "3.2",
    name: "Teamwork & Cross-functional Collaboration",
    description: "Works effectively across squads, supports colleagues, and puts shared outcomes ahead of silos.",
    displayOrder: 10,
    isActive: true,
  },
  {
    id: "SK-3.3",
    categoryId: "CAT-PPL",
    categoryCode: "PPL",
    categoryName: "3. People & Collaboration",
    code: "3.3",
    name: "Stakeholder Management",
    description: "Builds durable trust with internal leaders, external partners, and clients through respect and reliability.",
    displayOrder: 11,
    isActive: true,
  },
  {
    id: "SK-3.4",
    categoryId: "CAT-PPL",
    categoryCode: "PPL",
    categoryName: "3. People & Collaboration",
    code: "3.4",
    name: "Coaching & Knowledge Sharing",
    description: "Provides guidance, documentation, and hands-on mentorship to grow peers and junior colleagues.",
    displayOrder: 12,
    isActive: true,
  },

  // 4. Leadership & Strategy (LEAD)
  {
    id: "SK-4.1",
    categoryId: "CAT-LEAD",
    categoryCode: "LEAD",
    categoryName: "4. Leadership & Strategy",
    code: "4.1",
    name: "Strategic Thinking",
    description: "Connects daily execution to long-term institutional objectives and market trajectories.",
    displayOrder: 13,
    isActive: true,
  },
  {
    id: "SK-4.2",
    categoryId: "CAT-LEAD",
    categoryCode: "LEAD",
    categoryName: "4. Leadership & Strategy",
    code: "4.2",
    name: "Decision-Making",
    description: "Makes timely, well-reasoned decisions under ambiguity and commits cleanly to execution.",
    displayOrder: 14,
    isActive: true,
  },
  {
    id: "SK-4.3",
    categoryId: "CAT-LEAD",
    categoryCode: "LEAD",
    categoryName: "4. Leadership & Strategy",
    code: "4.3",
    name: "Change & Innovation",
    description: "Champions process improvements, leads organizational transitions, and turns novel ideas into practice.",
    displayOrder: 15,
    isActive: true,
  },
  {
    id: "SK-4.4",
    categoryId: "CAT-LEAD",
    categoryCode: "LEAD",
    categoryName: "4. Leadership & Strategy",
    code: "4.4",
    name: "People Leadership & Development",
    description: "Develops subordinates, sets clear expectations, and cultivates psychological safety and career growth.",
    displayOrder: 16,
    isActive: true,
  },

  // 5. Personal Effectiveness (PERS)
  {
    id: "SK-5.1",
    categoryId: "CAT-PERS",
    categoryCode: "PERS",
    categoryName: "5. Personal Effectiveness",
    code: "5.1",
    name: "Ownership & Accountability",
    description: "Accepts challenges with confidence, follows through on commitments, and owns outcomes end-to-end.",
    displayOrder: 17,
    isActive: true,
  },
  {
    id: "SK-5.2",
    categoryId: "CAT-PERS",
    categoryCode: "PERS",
    categoryName: "5. Personal Effectiveness",
    code: "5.2",
    name: "Adaptability & Resilience",
    description: "Manages pressure and setbacks constructively while sustaining productivity in changing environments.",
    displayOrder: 18,
    isActive: true,
  },
  {
    id: "SK-5.3",
    categoryId: "CAT-PERS",
    categoryCode: "PERS",
    categoryName: "5. Personal Effectiveness",
    code: "5.3",
    name: "Learning Agility",
    description: "Shows strong inner drive for self-development and rapidly applies new skills to emerging challenges.",
    displayOrder: 19,
    isActive: true,
  },
  {
    id: "SK-5.4",
    categoryId: "CAT-PERS",
    categoryCode: "PERS",
    categoryName: "5. Personal Effectiveness",
    code: "5.4",
    name: "Integrity & Professional Judgment",
    description: "Adheres to laid-down regulations, ethical codes, and sound professional judgment at all times.",
    displayOrder: 20,
    isActive: true,
  },
];

// Default authenticated employee's skill assessments (H1 2026 Review)
export const INITIAL_MY_SKILL_ASSESSMENTS: EmployeeSkillAssessmentRecord[] = [
  { skillId: "SK-1.1", skillCode: "1.1", selfRating: 4, managerRating: 4, finalRating: 4, evidenceNote: "Led Pan-African multi-region cloud architecture rollout.", assessedAt: "2026-06-15", assessedBy: "Sarah Jenkins" },
  { skillId: "SK-1.2", skillCode: "1.2", selfRating: 4, managerRating: 5, finalRating: 5, evidenceNote: "Built statistical telemetry and Hyperdrive query benchmarks.", assessedAt: "2026-06-15", assessedBy: "Sarah Jenkins" },
  { skillId: "SK-1.3", skillCode: "1.3", selfRating: 5, managerRating: 5, finalRating: 5, evidenceNote: "Automated CI/CD and AI-assisted code verification across squads.", assessedAt: "2026-06-15", assessedBy: "Sarah Jenkins" },
  { skillId: "SK-1.4", skillCode: "1.4", selfRating: 4, managerRating: 4, finalRating: 4, evidenceNote: "Resolved sub-15ms edge tail-latency bottleneck.", assessedAt: "2026-06-15", assessedBy: "Sarah Jenkins" },

  { skillId: "SK-2.1", skillCode: "2.1", selfRating: 4, managerRating: 3, finalRating: 3, evidenceNote: "Quarterly sprint sequencing completed; room to tighten cross-squad buffers.", assessedAt: "2026-06-15", assessedBy: "Sarah Jenkins" },
  { skillId: "SK-2.2", skillCode: "2.2", selfRating: 4, managerRating: 4, finalRating: 4, evidenceNote: "Zero production regressions across 14 releases.", assessedAt: "2026-06-15", assessedBy: "Sarah Jenkins" },
  { skillId: "SK-2.3", skillCode: "2.3", selfRating: 4, managerRating: 4, finalRating: 4, evidenceNote: "98% SLA adherence on client deliverables.", assessedAt: "2026-06-15", assessedBy: "Sarah Jenkins" },
  { skillId: "SK-2.4", skillCode: "2.4", selfRating: 3, managerRating: 2, finalRating: 2, evidenceNote: "Needs deeper exposure to departmental OPEX forecasting and vendor cost controls.", assessedAt: "2026-06-15", assessedBy: "Sarah Jenkins" },

  { skillId: "SK-3.1", skillCode: "3.1", selfRating: 4, managerRating: 4, finalRating: 4, evidenceNote: "Authored clear RFCs and executive board briefings.", assessedAt: "2026-06-15", assessedBy: "Sarah Jenkins" },
  { skillId: "SK-3.2", skillCode: "3.2", selfRating: 4, managerRating: 4, finalRating: 4, evidenceNote: "Partnered seamlessly with People & Culture and Security teams.", assessedAt: "2026-06-15", assessedBy: "Sarah Jenkins" },
  { skillId: "SK-3.3", skillCode: "3.3", selfRating: 3, managerRating: 3, finalRating: 3, evidenceNote: "Reliable with technical leads; expanding C-suite client advisory.", assessedAt: "2026-06-15", assessedBy: "Sarah Jenkins" },
  { skillId: "SK-3.4", skillCode: "3.4", selfRating: 4, managerRating: 3, finalRating: 3, evidenceNote: "Mentored 3 associates in Accra & London; formalizing curriculum.", assessedAt: "2026-06-15", assessedBy: "Sarah Jenkins" },

  { skillId: "SK-4.1", skillCode: "4.1", selfRating: 3, managerRating: 3, finalRating: 3, evidenceNote: "Contributed to FY27 platform roadmap.", assessedAt: "2026-06-15", assessedBy: "Sarah Jenkins" },
  { skillId: "SK-4.2", skillCode: "4.2", selfRating: 4, managerRating: 4, finalRating: 4, evidenceNote: "Sound architectural trade-offs under tight deadlines.", assessedAt: "2026-06-15", assessedBy: "Sarah Jenkins" },
  { skillId: "SK-4.3", skillCode: "4.3", selfRating: 4, managerRating: 4, finalRating: 4, evidenceNote: "Led migration to zero-cold-start worker runtime.", assessedAt: "2026-06-15", assessedBy: "Sarah Jenkins" },
  { skillId: "SK-4.4", skillCode: "4.4", selfRating: 3, managerRating: 2, finalRating: 2, evidenceNote: "Transitioning from individual technical lead to formal people management.", assessedAt: "2026-06-15", assessedBy: "Sarah Jenkins" },

  { skillId: "SK-5.1", skillCode: "5.1", selfRating: 5, managerRating: 5, finalRating: 5, evidenceNote: "Consistently owns critical-path incidents through full closure.", assessedAt: "2026-06-15", assessedBy: "Sarah Jenkins" },
  { skillId: "SK-5.2", skillCode: "5.2", selfRating: 4, managerRating: 4, finalRating: 4, evidenceNote: "Steady composure during ISO-27001 external audit.", assessedAt: "2026-06-15", assessedBy: "Sarah Jenkins" },
  { skillId: "SK-5.3", skillCode: "5.3", selfRating: 5, managerRating: 4, finalRating: 4, evidenceNote: "Rapid mastery of new compliance and edge-compute paradigms.", assessedAt: "2026-06-15", assessedBy: "Sarah Jenkins" },
  { skillId: "SK-5.4", skillCode: "5.4", selfRating: 5, managerRating: 5, finalRating: 5, evidenceNote: "Exemplary adherence to data privacy and governance standards.", assessedAt: "2026-06-15", assessedBy: "Sarah Jenkins" },
];

// §5.1: Role Skill Profiles & Comparison Baselines (null = "Not required" per VAL-SKILL-006)
export const ROLE_SKILL_PROFILES: Record<
  "my_role" | "target_role" | "team_benchmark" | "company_benchmark" | "previous_cycle",
  { label: string; subtitle: string; levels: Record<string, number | null> }
> = {
  my_role: {
    label: "My Role Profile (Lead Enterprise Architect)",
    subtitle: "Required proficiency levels for your current job family and grade",
    levels: {
      "1.1": 4, "1.2": 4, "1.3": 4, "1.4": 4,
      "2.1": 4, "2.2": 4, "2.3": 4, "2.4": 3,
      "3.1": 4, "3.2": 4, "3.3": 3, "3.4": 4,
      "4.1": 3, "4.2": 4, "4.3": 4, "4.4": 3,
      "5.1": 4, "5.2": 4, "5.3": 4, "5.4": 4,
    },
  },
  target_role: {
    label: "Target Role Profile (Practice Director / VP Engineering)",
    subtitle: "Required proficiency levels for your next career track milestone",
    levels: {
      "1.1": 4, "1.2": 4, "1.3": 4, "1.4": 4,
      "2.1": 5, "2.2": 4, "2.3": 4, "2.4": 4,
      "3.1": 5, "3.2": 4, "3.3": 5, "3.4": 5,
      "4.1": 5, "4.2": 5, "4.3": 4, "4.4": 5,
      "5.1": 5, "5.2": 5, "5.3": 4, "5.4": 5,
    },
  },
  team_benchmark: {
    label: "Team Benchmark (Platform Engineering Median)",
    subtitle: "Aggregate team median per skill — individual peer ratings are never exposed (FR-SKILL-011)",
    levels: {
      "1.1": 3.8, "1.2": 3.6, "1.3": 4.0, "1.4": 3.8,
      "2.1": 3.5, "2.2": 3.9, "2.3": 3.7, "2.4": 3.0,
      "3.1": 3.6, "3.2": 4.0, "3.3": 3.2, "3.4": 3.4,
      "4.1": 3.2, "4.2": 3.5, "4.3": 3.6, "4.4": 3.1,
      "5.1": 4.2, "5.2": 3.9, "5.3": 4.0, "5.4": 4.4,
    },
  },
  company_benchmark: {
    label: "Company Benchmark (Org-Wide Median — HR Console Only)",
    subtitle: "Aggregate organization-wide median across all 91 employees",
    levels: {
      "1.1": 3.5, "1.2": 3.2, "1.3": 3.4, "1.4": 3.4,
      "2.1": 3.4, "2.2": 3.7, "2.3": 3.6, "2.4": 3.1,
      "3.1": 3.7, "3.2": 3.9, "3.3": 3.4, "3.4": 3.2,
      "4.1": 3.0, "4.2": 3.3, "4.3": 3.2, "4.4": 3.0,
      "5.1": 4.0, "5.2": 3.8, "5.3": 3.7, "5.4": 4.3,
    },
  },
  previous_cycle: {
    label: "Previous Cycle (FY2025 Q4 Final Ratings)",
    subtitle: "Your own verified final ratings from the prior closed cycle",
    levels: {
      "1.1": 4, "1.2": 4, "1.3": 4, "1.4": 4,
      "2.1": 3, "2.2": 4, "2.3": 3, "2.4": 2,
      "3.1": 3, "3.2": 4, "3.3": 3, "3.4": 3,
      "4.1": 3, "4.2": 3, "4.3": 3, "4.4": 2,
      "5.1": 4, "5.2": 4, "5.3": 4, "5.4": 5,
    },
  },
};

// §6: Internal Gigs referencing the exact 20-skill taxonomy (VAL-SKILL-008)
export const ALIGNED_GIGS: AlignedGigRecord[] = [
  {
    id: "GIG-101",
    title: "Cloudflare Edge TCP Multiplexing & Hyperdrive Benchmarking",
    practice: "Cloud & Edge Engineering",
    duration: "3 Weeks",
    workload: "15% Allocation",
    lead: "Marcus Chen (Engineering Director)",
    status: "Open",
    requiredSkills: [
      { skillCode: "1.1", minLevel: 4 },
      { skillCode: "1.2", minLevel: 4 },
      { skillCode: "1.3", minLevel: 4 },
      { skillCode: "1.4", minLevel: 4 },
    ],
  },
  {
    id: "GIG-102",
    title: "West Africa OPEX Budget & Resource Optimization Taskforce",
    practice: "Finance & Corporate Strategy",
    duration: "4 Weeks",
    workload: "10% Allocation",
    lead: "Sarah Jenkins (Managing Director)",
    status: "Open",
    requiredSkills: [
      { skillCode: "2.1", minLevel: 4 },
      { skillCode: "2.4", minLevel: 3 },
      { skillCode: "4.1", minLevel: 3 },
      { skillCode: "3.3", minLevel: 3 },
    ],
  },
  {
    id: "GIG-103",
    title: "Accra & London Associate Engineering Mentorship Cohort",
    practice: "People & Capability Development",
    duration: "6 Weeks",
    workload: "15% Allocation",
    lead: "Jemima Richards (Head of People & Strategy)",
    status: "Open",
    requiredSkills: [
      { skillCode: "3.4", minLevel: 4 },
      { skillCode: "4.4", minLevel: 4 },
      { skillCode: "3.1", minLevel: 4 },
      { skillCode: "5.1", minLevel: 4 },
    ],
  },
  {
    id: "GIG-104",
    title: "Enterprise Design System & Accessibility Modernization (WCAG 2.1 AA)",
    practice: "Product & Design Systems",
    duration: "2 Weeks",
    workload: "20% Allocation",
    lead: "Julian Vance (Advisory Director)",
    status: "Open",
    requiredSkills: [
      { skillCode: "2.2", minLevel: 4 },
      { skillCode: "3.2", minLevel: 4 },
      { skillCode: "4.3", minLevel: 4 },
      { skillCode: "5.4", minLevel: 4 },
    ],
  },
];

// §6.2: Compute Gig Fit against an employee's final ratings
export interface GigFitResult {
  tier: "Strong fit" | "Partial fit" | "Stretch gig" | "Not assessed";
  metCount: number;
  totalRequired: number;
  matchPercent: number;
  deficits: { skillCode: string; skillName: string; required: number; actual: number | null; deficit: number }[];
  surpluses: { skillCode: string; skillName: string; required: number; actual: number; surplus: number }[];
  asOfDate: string;
  isStale: boolean;
}

export const computeGigFit = (
  gig: AlignedGigRecord,
  assessments: EmployeeSkillAssessmentRecord[],
  referenceDateStr = "2026-11-17"
): GigFitResult => {
  const byCode = new Map(assessments.map((a) => [a.skillCode, a]));
  const skillByCode = new Map(SKILLS_TAXONOMY.map((s) => [s.code, s]));

  let metCount = 0;
  let unassessedCount = 0;
  const deficits: GigFitResult["deficits"] = [];
  const surpluses: GigFitResult["surpluses"] = [];
  let latestDate = "2026-06-15";

  for (const req of gig.requiredSkills) {
    const rec = byCode.get(req.skillCode);
    const skill = skillByCode.get(req.skillCode);
    const actual = rec?.finalRating ?? rec?.selfRating ?? null;
    if (rec?.assessedAt && rec.assessedAt > latestDate) {
      latestDate = rec.assessedAt;
    }
    if (actual === null) {
      unassessedCount++;
      deficits.push({
        skillCode: req.skillCode,
        skillName: skill?.name || req.skillCode,
        required: req.minLevel,
        actual: null,
        deficit: req.minLevel,
      });
      continue;
    }
    const diff = actual - req.minLevel; // fit_level = final_rating - min_level
    if (diff >= 0) {
      metCount++;
      if (diff > 0) {
        surpluses.push({
          skillCode: req.skillCode,
          skillName: skill?.name || req.skillCode,
          required: req.minLevel,
          actual,
          surplus: diff,
        });
      }
    } else {
      deficits.push({
        skillCode: req.skillCode,
        skillName: skill?.name || req.skillCode,
        required: req.minLevel,
        actual,
        deficit: Math.abs(diff),
      });
    }
  }

  const totalRequired = gig.requiredSkills.length;
  const matchPercent = totalRequired > 0 ? Math.round((metCount / totalRequired) * 100) : 100;

  // Freshness check (>12 months = 365 days)
  const refMs = new Date(referenceDateStr).getTime();
  const asOfMs = new Date(latestDate).getTime();
  const ageDays = (refMs - asOfMs) / (1000 * 60 * 60 * 24);
  const isStale = ageDays > 365;

  let tier: GigFitResult["tier"] = "Strong fit";
  if (unassessedCount > 0) {
    tier = "Not assessed";
  } else if (deficits.length === 0) {
    tier = "Strong fit";
  } else if (metCount >= Math.ceil(totalRequired / 2)) {
    tier = "Partial fit";
  } else {
    tier = "Stretch gig";
  }

  return {
    tier,
    metCount,
    totalRequired,
    matchPercent,
    deficits,
    surpluses,
    asOfDate: latestDate,
    isStale,
  };
};
