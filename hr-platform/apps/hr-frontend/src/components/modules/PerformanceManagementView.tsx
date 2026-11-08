"use client";

import React, { useState, useMemo, useEffect } from "react";
import { colors, typography, radii, shadows } from "../../design-system/tokens";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { Icons } from "../../design-system/Icons";
import { drillProps } from "../../utils/drill";
import { DataTable, Column } from "../../design-system/DataTable";
import { SlideOver } from "../../design-system/SlideOver";
import { formatDate, formatDateRange } from "../../utils/date";
import { PerformanceConfigurationStudio } from "./PerformanceConfigurationStudio";

export interface CycleRecord {
  id: number;
  title: string;
  description: string;
  framework_code?: string;
  framework_name?: string;
  status: string;
  start_date: string;
  end_date: string;
}

interface PerformanceManagementViewProps {
  cycles: CycleRecord[];
  onCycleCreated?: (cycle: CycleRecord) => void;
}

interface RevieweeEvaluation {
  id: number;
  name: string;
  role: string;
  department: string;
  selfRating: number;
  managerRating: number;
  feedback: string;
  status: "CALIBRATED" | "PENDING_REVIEW";
}

export interface CheckInRecord {
  id: number;
  employeeName: string;
  employeeRole: string;
  supervisorName: string;
  cycleTitle: string;
  framework: "OKR" | "MBO" | "BSC";
  goalTitle: string;
  currentProgressPct: number;
  lastCheckInDate: string;
  nextScheduledDate: string;
  status: "ON_TRACK" | "AT_RISK" | "NEEDS_ATTENTION" | "COMPLETED";
  recentWins: string;
  blockers: string;
  actionItems: string;
  supervisorFeedback: string;
  cadence: "Bi-weekly 1-on-1" | "Weekly Sprint Touchpoint" | "Monthly Review";
}

export interface ObjectiveRequest {
  id: number;
  requestNo: number;
  ownerName: string;
  ownerStaffId: string;
  ownerRole: string;
  ownerAvatarColor: string;
  objectiveType: "BSC" | "OKR";
  status: "APPROVED" | "UNDETERMINED" | "PENDING APPROVAL" | "DECLINED";
  subsidiary: string;
  appraisalCycle: string;
  date: string;
  goals: { title: string; weight: number; target: string; metric: string }[];
}

export interface CascadingObjective {
  id: number;
  level: "Company" | "Division" | "Departments" | "Employee";
  title: string;
  lead: string;
  framework: "BSC" | "OKR";
  progressPct: number;
  alignedToParent?: string;
  targetDate: string;
  weight: number;
}

export const PerformanceManagementView: React.FC<PerformanceManagementViewProps> = ({
  cycles,
  onCycleCreated,
}) => {
  // Navigation tabs matching Enterprise Standard
  const [activeMainTab, setActiveMainTab] = useState<
    | "dashboard"
    | "cycles"
    | "cascading_bsc"
    | "military_chain"
    | "trait_matrix"
    | "okr_heatmap"
    | "nine_box"
    | "requests"
    | "objectives_setup"
    | "appraisals"
    | "bulk_actions"
    | "checkins"
    | "insights"
    | "settings"
  >("dashboard");

  // State 1: Cascading Scorecard Builder (Balanced Scorecard: Fin 40%, Cust 35%, Int 15%, Lrn 10%)
  const [bscWeights, setBscWeights] = useState({
    financial: 40,
    customer: 35,
    internal: 15,
    learning: 10,
  });

  // Dashboard Stat Cards Interactive Drilldown State
  const [dashboardDrilldownCohort, setDashboardDrilldownCohort] = useState<
    "NO_OBJECTIVES" | "ACTIVE" | "PENDING_APPROVAL" | "APPROVED" | "DECLINED" | null
  >(null);
  const [dashboardDrilldownSearch, setDashboardDrilldownSearch] = useState("");

  // State 2: Sequential Multi-tier Sign-off Chain
  const [militaryChain, setMilitaryChain] = useState([
    {
      id: 1,
      tier: "Tier 1: Self-Assessment",
      role: "Appraisee (Self)",
      officer: "Emmanuel K. Quarshie (HR Operations Lead)",
      serviceId: "GH/SC-OPS/7821",
      score: 4.2,
      status: "LOCKED_AND_SIGNED",
      timestamp: "2026-10-28 09:30:15 UTC",
      digitalStamp: "SIGN-SEAL #094-SELF-VERIFIED",
    },
    {
      id: 2,
      tier: "Tier 2: Direct Supervisor Sign-off",
      role: "Immediate Supervisor",
      officer: "Richard Mamphey (Senior Clinical Administrator)",
      serviceId: "GH/SC-OPS/3091",
      score: 4.0,
      status: "LOCKED_AND_SIGNED",
      timestamp: "2026-10-30 14:12:40 UTC",
      digitalStamp: "SUPERVISOR-SIGN-STAMP #3091-PASSED",
    },
    {
      id: 3,
      tier: "Tier 3: HOD Endorsement",
      role: "Head of Department (HOD)",
      officer: "Sarah Jenkins (Head of Healthcare Operations)",
      serviceId: "GH/SC-OPS/1104",
      score: 4.1,
      status: "PENDING_ENDORSEMENT",
      timestamp: "Pending Sign-off",
      digitalStamp: "PENDING-HOD-ENDORSEMENT",
    },
    {
      id: 4,
      tier: "Tier 4: Divisional Director Approval",
      role: "Director of Administration",
      officer: "Kwame Mensah (Director of Administration)",
      serviceId: "GH/SC-OPS/0082",
      score: 0.0,
      status: "QUEUED_IN_CHAIN",
      timestamp: "Awaiting Tier 3",
      digitalStamp: "AWAITING-DIRECTOR-STAMP",
    },
    {
      id: 5,
      tier: "Tier 5: Executive Final Approval",
      role: "Executive Committee / Board",
      officer: "Paa Kwesi Barnes (Managing Principal)",
      serviceId: "GH/SC-OPS/0001",
      score: 0.0,
      status: "QUEUED_IN_CHAIN",
      timestamp: "Awaiting Tier 4",
      digitalStamp: "EXECUTIVE-DIRECTOR-SEAL",
    },
  ]);

  // State 3: Strict Numeric Trait-Based Competency Matrix (1-5 Scale)
  const [traitScores, setTraitScores] = useState<Record<string, number>>({
    "Communication & Tactical Briefing": 4,
    "Team Collaboration & Joint Interoperability": 5,
    "Statutory & Regulatory Protocol Compliance": 5,
    "Crisis Decision-Making Under Pressure": 4,
    "Resource Stewardship & Equipment Care": 5,
  });

  // Military PDF stamp state
  const [militaryPdfGenerated, setMilitaryPdfGenerated] = useState(false);

  // Active Appraisal Cycle Selector (Screenshot 3)
  const [selectedAppraisalCycle, setSelectedAppraisalCycle] = useState("Enterprise Annual Appraisal");

  // Objectives Setup Sub-tab (Screenshot 5)
  const [objectivesSetupTab, setObjectivesSetupTab] = useState<
    "Company" | "Division" | "Departments" | "Employee" | "Objective Bulk Upload" | "Objective Backlog"
  >("Company");

  // Performance Management Governance & Settings State
  const [settingsPrimaryTab, setSettingsPrimaryTab] = useState<
    | "Framework & Methodology"
    | "Multi-Tier Sign-Off Chains"
    | "Competency & Trait Matrix"
    | "360° Peer Review & Calibration"
    | "Nine-Box Talent Matrix"
    | "PIP & Governance Exceptions"
    | "Configuration Studio (Rules Engine)"
  >("Framework & Methodology");

  // Search & Filter in Requests Table (Screenshot 4)
  const [requestSearchQuery, setRequestSearchQuery] = useState("");
  const [requestStatusFilter, setRequestStatusFilter] = useState<string>("ALL");
  const [selectedRequestForDetail, setSelectedRequestForDetail] = useState<ObjectiveRequest | null>(null);
  const [nudgedStaffIds, setNudgedStaffIds] = useState<Record<string, boolean>>({});

  // Synthetic deterministic list of 84 staff members pending goal drafting (Drill-down from Image 3 KPI)
  const pendingGoalStaffList = useMemo(() => {
    const firstNames = ["Kofi", "Ama", "Kwame", "Akua", "Yaw", "Yaa", "Kwesi", "Abena", "Esi", "Kojo", "Afia", "Kwabena", "Fafali", "Mawuli", "Esenam", "Kweku", "Baaba", "Nana", "Jojo", "Maame"];
    const lastNames = ["Mensah", "Osei", "Appiah", "Boakye", "Agyemang", "Frimpong", "Annan", "Quaye", "Tetteh", "Asante", "Darko", "Arthur", "Owusu", "Adjei", "Boateng", "Danquah", "Kwarteng", "Sarpong", "Addison", "Koomson"];
    const depts = [
      { dept: "Healthcare Operations", team: "Clinical Governance Unit", manager: "Dr. Emmanuel K. Quarshie", role: "Clinical Operations Officer", color: "#0284c7" },
      { dept: "Engineering & Cloud", team: "Hyperdrive Edge Performance Squad", manager: "Benedicta Agbesi", role: "Cloud Infrastructure Engineer", color: "#6366f1" },
      { dept: "People & Culture", team: "West Africa Talent Onboarding Taskforce", manager: "Richard Mamphey", role: "People Operations Specialist", color: "#ec4899" },
      { dept: "Technology Advisory", team: "Corporate Information Security Committee", manager: "Paa Kwesi Barnes", role: "Security & Governance Consultant", color: "#8b5cf6" },
      { dept: "Finance & Accounting", team: "Statutory Tax & Audit Reconciliation Team", manager: "Kojo Antwi", role: "Financial Planning Analyst", color: "#f59e0b" },
      { dept: "Client Success", team: "Regional Enterprise Client Care Hub", manager: "Clara Nukunu", role: "Enterprise Client Account Partner", color: "#10b981" },
    ];
    return Array.from({ length: 84 }, (_, i) => {
      const deptInfo = depts[i % depts.length];
      const fn = firstNames[(i * 3 + 1) % firstNames.length];
      const ln = lastNames[(i * 5 + 2) % lastNames.length];
      const idNum = String(41 + i).padStart(3, "0");
      return {
        id: 1000 + i,
        staffId: `SHR/GH/${idNum}`,
        name: `${fn} ${ln}`,
        role: deptInfo.role,
        department: deptInfo.dept,
        team: deptInfo.team,
        manager: deptInfo.manager,
        avatarColor: deptInfo.color,
        daysOverdue: 6 + ((i * 3) % 18),
        cycle: "2026 Annual Performance Cycle",
      };
    });
  }, []);

  // Formal Cycle Evaluations & Check-in selections
  const [selectedCycleForReview, setSelectedCycleForReview] = useState<CycleRecord | null>(null);
  const [selectedCheckInForDetails, setSelectedCheckInForDetails] = useState<CheckInRecord | null>(null);

  // Status message alert
  const [statusMessage, setStatusMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // Initial Objective Requests matching Screenshot 4
  const [objectiveRequests, setObjectiveRequests] = useState<ObjectiveRequest[]>([
    {
      id: 1,
      requestNo: 1,
      ownerName: "Richard Mamphey",
      ownerStaffId: "SHR/GH/038",
      ownerRole: "Head, Human Resources",
      ownerAvatarColor: "#6366f1",
      objectiveType: "BSC",
      status: "APPROVED",
      subsidiary: "ScoReview Ghana",
      appraisalCycle: "Senrab Cycle",
      date: "2026-10-02",
      goals: [
        { title: "Financial: Reduce annual recruitment spend by 22% via internal gig sourcing", weight: 30, target: "GH₵120,000 saved", metric: "Cost Variance" },
        { title: "Customer: Achieve 98% internal SLA adherence on HR advisory queries", weight: 25, target: "98% Positive CSAT", metric: "SLA Index" },
        { title: "Internal Processes: Roll out automated Pre-boarding across all African entities", weight: 25, target: "100% Entities", metric: "Entity Rollout" },
        { title: "Learning & Growth: Certify 4 People & Culture analysts in single-framework calibration standards", weight: 20, target: "4 Certified", metric: "Certs Issued" },
      ],
    },
    {
      id: 2,
      requestNo: 2,
      ownerName: "Clara Nukunu",
      ownerStaffId: "SCG153",
      ownerRole: "Customer Service Executive",
      ownerAvatarColor: "#10b981",
      objectiveType: "OKR",
      status: "UNDETERMINED",
      subsidiary: "ScoReview Ghana",
      appraisalCycle: "SFA",
      date: "2026-06-11",
      goals: [
        { title: "Objective: Elevate client onboarding satisfaction across West Africa enterprise hubs", weight: 50, target: "NPS +45", metric: "Quarterly NPS" },
        { title: "KR 1: Deliver first-response resolution in under 4 minutes on priority tickets", weight: 50, target: "< 4 mins", metric: "Avg FRT" },
      ],
    },
    {
      id: 3,
      requestNo: 3,
      ownerName: "Adjoa Asare",
      ownerStaffId: "GH/2017/6/13/094",
      ownerRole: "HR Analytics & Information System Specialist",
      ownerAvatarColor: "#ec4899",
      objectiveType: "BSC",
      status: "APPROVED",
      subsidiary: "ScoReview Ghana",
      appraisalCycle: "2026 Q1 Performance Appraisal for Henley Resources",
      date: "2026-04-16",
      goals: [
        { title: "Internal Process: Build 60 automated strategic HR reports with AI builder", weight: 35, target: "60 Cataloged", metric: "Report Count" },
        { title: "Customer: Deliver sub-second query latency for employee self-service analytics", weight: 35, target: "< 1.2s", metric: "P95 Latency" },
        { title: "Financial: Reconcile all Ghana SSNIT and GRA PAYE tax deduction feeds", weight: 30, target: "100% Balanced", metric: "Recon Delta" },
      ],
    },
    {
      id: 4,
      requestNo: 4,
      ownerName: "Kwame Mensah",
      ownerStaffId: "KSP/2024/0220",
      ownerRole: "Assembly Worker",
      ownerAvatarColor: "#ef4444",
      objectiveType: "BSC",
      status: "UNDETERMINED",
      subsidiary: "ScoReview Ghana",
      appraisalCycle: "2026 Q1 Performance Appraisal for Henley Resources",
      date: "2026-04-16",
      goals: [
        { title: "Internal Processes: Maintain zero workplace safety violations throughout cycle", weight: 50, target: "0 Incidents", metric: "Safety Audit" },
        { title: "Customer: Achieve 99.4% first-pass yield on hardware terminal assembly line", weight: 50, target: "99.4%", metric: "QA Yield" },
      ],
    },
    {
      id: 5,
      requestNo: 5,
      ownerName: "Paa Kwesi Barnes",
      ownerStaffId: "SEN/001",
      ownerRole: "Managing Principal & Systems Architect",
      ownerAvatarColor: "#0284c7",
      objectiveType: "OKR",
      status: "APPROVED",
      subsidiary: "Senrab ConsulTech UK",
      appraisalCycle: "Senrab Cycle",
      date: "2026-10-01",
      goals: [
        { title: "Objective: Establish zero-latency multi-region Cloudflare edge network with Neon Hyperdrive", weight: 60, target: "Zero Latency Tier", metric: "Edge Latency" },
        { title: "KR 1: Deliver 100% compliance with SOC2 Type II, ISO 27001, and mathematical scoring calibration", weight: 40, target: "100% Audit Pass", metric: "Compliance" },
      ],
    },
    {
      id: 6,
      requestNo: 6,
      ownerName: "Benedicta Agbesi",
      ownerStaffId: "SEN/004",
      ownerRole: "HR Operations Lead",
      ownerAvatarColor: "#8b5cf6",
      objectiveType: "OKR",
      status: "PENDING APPROVAL",
      subsidiary: "Senrab ConsulTech Ghana Hub",
      appraisalCycle: "Senrab Cycle",
      date: "2026-11-02",
      goals: [
        { title: "Objective: Modernize all onboarding journeys with automated zero-touch contract pipelines", weight: 50, target: "Zero-Touch Onboarding", metric: "Turnaround Time" },
        { title: "KR 1: Achieve 100% Ghana Card National ID PIN validation on pre-boarding", weight: 50, target: "100% Verified", metric: "ID PIN Verification" },
      ],
    },
    {
      id: 7,
      requestNo: 7,
      ownerName: "Philip Aryee",
      ownerStaffId: "SEN/008",
      ownerRole: "Cloud Engineer",
      ownerAvatarColor: "#0284c7",
      objectiveType: "BSC",
      status: "UNDETERMINED",
      subsidiary: "Senrab ConsulTech Namibia",
      appraisalCycle: "Senrab Cycle",
      date: "2026-10-14",
      goals: [
        { title: "Internal Processes: Deliver 99.99% uptime on multi-region OpenNext worker clusters", weight: 50, target: "99.99%", metric: "Cluster Availability" },
        { title: "Financial: Optimize serverless compute unit consumption by 18%", weight: 50, target: "18% Reduction", metric: "Compute Spend" },
      ],
    },
    {
      id: 8,
      requestNo: 8,
      ownerName: "Ndapewa Shikongo",
      ownerStaffId: "SEN/011",
      ownerRole: "Solutions Architect",
      ownerAvatarColor: "#10b981",
      objectiveType: "OKR",
      status: "UNDETERMINED",
      subsidiary: "Senrab ConsulTech Namibia",
      appraisalCycle: "Senrab Cycle",
      date: "2026-10-18",
      goals: [
        { title: "Objective: Author and publish zero-trust enterprise edge design blueprints", weight: 50, target: "4 Blueprints", metric: "Docs Authored" },
        { title: "KR 1: Lead 12 technical discovery architectures for SADC public sector clients", weight: 50, target: "12 Sessions", metric: "Discovery Workshops" },
      ],
    },
    {
      id: 9,
      requestNo: 9,
      ownerName: "Tangeni Haufiku",
      ownerStaffId: "SEN/014",
      ownerRole: "Delivery Manager",
      ownerAvatarColor: "#f59e0b",
      objectiveType: "BSC",
      status: "UNDETERMINED",
      subsidiary: "Senrab ConsulTech Namibia",
      appraisalCycle: "Senrab Cycle",
      date: "2026-10-20",
      goals: [
        { title: "Customer: Achieve 95% client sprint sign-off satisfaction", weight: 50, target: "95%", metric: "Client CSAT" },
        { title: "Internal Processes: Zero missed milestone SLA breaches across advisory track", weight: 50, target: "0 Breaches", metric: "SLA Variance" },
      ],
    },
    {
      id: 10,
      requestNo: 10,
      ownerName: "Kojo Antwi",
      ownerStaffId: "SEN/019",
      ownerRole: "Finance Analyst",
      ownerAvatarColor: "#d97706",
      objectiveType: "BSC",
      status: "UNDETERMINED",
      subsidiary: "ScoReview Ghana",
      appraisalCycle: "Senrab Cycle",
      date: "2026-10-25",
      goals: [
        { title: "Financial: Automate multi-currency exchange reconciliations between GHS and GBP", weight: 50, target: "Daily Zero Variance", metric: "FX Recon" },
        { title: "Internal Processes: Cut monthly close cycle duration from 6 days to 2 days", weight: 50, target: "2 Days", metric: "Close Timeline" },
      ],
    },
  ]);

  // Cascading Objectives Data (Screenshot 5)
  const [cascadingObjectives, setCascadingObjectives] = useState<CascadingObjective[]>([
    {
      id: 1,
      level: "Company",
      title: "ConsulTech 2026 Vision: Expand Enterprise Managed Services across West Africa & UK Corridor",
      lead: "Executive Leadership Team",
      framework: "BSC",
      progressPct: 78,
      targetDate: "2026-12-31",
      weight: 100,
    },
    {
      id: 2,
      level: "Division",
      title: "Technology Advisory Division: Drive 40% Growth in Cloud Edge Engineering & Zero-Trust Governance",
      lead: "Paa Kwesi Barnes (Managing Principal)",
      framework: "OKR",
      progressPct: 84,
      alignedToParent: "ConsulTech 2026 Vision",
      targetDate: "2026-11-30",
      weight: 40,
    },
    {
      id: 3,
      level: "Departments",
      title: "People & Culture Department: Implement Continuous Bilateral Check-ins and Eliminate Performance Drift",
      lead: "Sarah Jenkins (VP People)",
      framework: "OKR",
      progressPct: 91,
      alignedToParent: "ConsulTech 2026 Vision",
      targetDate: "2026-11-15",
      weight: 30,
    },
    {
      id: 4,
      level: "Employee",
      title: "Automate Pre-boarding for 15 West Africa Consultants with Auto Staff ID Generation",
      lead: "Benedicta Agbesi",
      framework: "OKR",
      progressPct: 85,
      alignedToParent: "People & Culture Department",
      targetDate: "2026-11-15",
      weight: 30,
    },
    {
      id: 5,
      level: "Employee",
      title: "Build and deploy 60 Interactive HR Reports with AI Query Translation",
      lead: "Adjoa Asare",
      framework: "BSC",
      progressPct: 95,
      alignedToParent: "Technology Advisory Division",
      targetDate: "2026-11-20",
      weight: 35,
    },
  ]);

  // Check-ins State
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([
    {
      id: 101,
      employeeName: "Benedicta Agbesi",
      employeeRole: "People & Culture Consultant",
      supervisorName: "Sarah Jenkins",
      cycleTitle: "Enterprise Annual Appraisal",
      framework: "OKR",
      goalTitle: "KR 1.2: Automate Day -14 Pre-boarding for 15 West Africa Consultants",
      currentProgressPct: 85,
      lastCheckInDate: "2026-11-01",
      nextScheduledDate: "2026-11-15",
      status: "ON_TRACK",
      recentWins: "Completed contract templates and auto-generated Staff IDs for 12 incoming analysts.",
      blockers: "Awaiting final medical clearance from 2 candidates.",
      actionItems: "Follow up with occupational health partner by Thursday; push pre-boarding welcome pack.",
      supervisorFeedback: "Superb momentum. Benedicta resolved candidate inquiries within 2 hours.",
      cadence: "Bi-weekly 1-on-1",
    },
    {
      id: 102,
      employeeName: "Philip Aryee",
      employeeRole: "Senior Edge Systems Consultant",
      supervisorName: "Paa Kwesi Barnes",
      cycleTitle: "Enterprise Annual Appraisal",
      framework: "OKR",
      goalTitle: "KR 2.1: Reduce Cloudflare Hyperdrive Postgres Query Latency to < 18ms",
      currentProgressPct: 92,
      lastCheckInDate: "2026-10-28",
      nextScheduledDate: "2026-11-12",
      status: "COMPLETED",
      recentWins: "Hyperdrive connection pool operating with 1.4ms edge round trips in London & Accra.",
      blockers: "None. All Neon serverless endpoints fully pooled.",
      actionItems: "Document edge failover protocol in team engineering handbook.",
      supervisorFeedback: "Groundbreaking architectural execution. Zero cold start degradation observed.",
      cadence: "Weekly Sprint Touchpoint",
    },
    {
      id: 103,
      employeeName: "Julian Vance",
      employeeRole: "Director of Enterprise Advisory",
      supervisorName: "Richard Barnes",
      cycleTitle: "Enterprise Annual Appraisal",
      framework: "BSC",
      goalTitle: "Objective 4: Expand Enterprise Managed Accounts Portfolio by GH₵450,000",
      currentProgressPct: 68,
      lastCheckInDate: "2026-10-25",
      nextScheduledDate: "2026-11-08",
      status: "NEEDS_ATTENTION",
      recentWins: "Signed two Tier-1 financial institutions for managed governance retaining services.",
      blockers: "Procurement legal cycles taking 3 weeks longer than projected in Lagos subsidiary.",
      actionItems: "Host executive alignment session with regional General Counsel.",
      supervisorFeedback: "Strong commercial pipeline; need to mitigate legal cycle turnaround friction.",
      cadence: "Monthly Review",
    },
    {
      id: 104,
      employeeName: "Clara Nukunu",
      employeeRole: "Customer Service Executive",
      supervisorName: "Richard Mamphey",
      cycleTitle: "Enterprise Annual Appraisal",
      framework: "OKR",
      goalTitle: "Deliver first-response resolution in under 4 minutes on priority tickets",
      currentProgressPct: 74,
      lastCheckInDate: "2026-11-02",
      nextScheduledDate: "2026-11-16",
      status: "ON_TRACK",
      recentWins: "Resolved 42 consecutive user requests within SLA; CSAT at 4.9/5.0.",
      blockers: "Occasional peak-hour ticket congestion during Monday payroll runs.",
      actionItems: "Configure Dede AI auto-responder for routine payslip inquiries.",
      supervisorFeedback: "Outstanding empathy and customer focus. Exemplary work ethic.",
      cadence: "Bi-weekly 1-on-1",
    },
  ]);

  // Evaluations State
  const [evaluations, setEvaluations] = useState<RevieweeEvaluation[]>([
    {
      id: 1,
      name: "Benedicta Agbesi",
      role: "People & Culture Consultant",
      department: "People & Culture",
      selfRating: 4.5,
      managerRating: 4.2,
      feedback: "Exceptional ownership of workforce onboarding and policy documentation.",
      status: "PENDING_REVIEW",
    },
    {
      id: 2,
      name: "Philip Aryee",
      role: "Senior Edge Systems Consultant",
      department: "Cloud & Edge Engineering",
      selfRating: 4.8,
      managerRating: 4.7,
      feedback: "Led Hyperdrive edge caching architecture with remarkable technical rigor.",
      status: "CALIBRATED",
    },
    {
      id: 3,
      name: "Julian Vance",
      role: "Director of Enterprise Advisory",
      department: "Enterprise Advisory",
      selfRating: 4.3,
      managerRating: 4.5,
      feedback: "Strong commercial alignment and strategic engagement leadership.",
      status: "PENDING_REVIEW",
    },
  ]);

  // Modals state
  const [showNewCycleModal, setShowNewCycleModal] = useState(false);
  const [showNewCheckInModal, setShowNewCheckInModal] = useState(false);
  const [cycleTitle, setCycleTitle] = useState("");
  const [cycleDesc, setCycleDesc] = useState("");
  const [selectedFramework, setSelectedFramework] = useState<"OKR" | "MBO" | "BSC">("OKR");
  const [startDate, setStartDate] = useState("2026-04-01");
  const [endDate, setEndDate] = useState("2026-06-30");

  // New Check-in modal form state
  const [newCheckInEmployee, setNewCheckInEmployee] = useState("Benedicta Agbesi");
  const [newCheckInSupervisor, setNewCheckInSupervisor] = useState("Sarah Jenkins");
  const [newCheckInGoal, setNewCheckInGoal] = useState("");
  const [newCheckInProgress, setNewCheckInProgress] = useState<number>(50);
  const [newCheckInWins, setNewCheckInWins] = useState("");
  const [newCheckInBlockers, setNewCheckInBlockers] = useState("");
  const [newCheckInActions, setNewCheckInActions] = useState("");
  const [newCheckInFeedback, setNewCheckInFeedback] = useState("");
  const [newCheckInCadence, setNewCheckInCadence] = useState<"Bi-weekly 1-on-1" | "Weekly Sprint Touchpoint" | "Monthly Review">("Bi-weekly 1-on-1");
  const [newCheckInNextDate, setNewCheckInNextDate] = useState("2026-11-20");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Performance Management Settings Configuration State
  const [frameworkConfig, setFrameworkConfig] = useState({
    financialWeight: 30,
    customerWeight: 50,
    internalWeight: 15,
    learningWeight: 5,
    minObjectivesPerEmployee: 5,
    maxObjectivesPerEmployee: 8,
    mandatoryCorporateAlignment: true,
    allowEmployeeProposeKeyResults: true,
  });
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Load the company's saved settings once. Until they arrive, the form shows the defaults above.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/hr/performance/settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { settings?: { pillarWeights: { financial: number; customer: number; internal: number; learning: number }; minObjectives: number; maxObjectives: number; mandatoryCorporateAlignment: boolean; allowEmployeeProposeKeyResults: boolean } } | null) => {
        const s = data?.settings;
        if (cancelled || !s) return;
        setFrameworkConfig({
          financialWeight: s.pillarWeights.financial,
          customerWeight: s.pillarWeights.customer,
          internalWeight: s.pillarWeights.internal,
          learningWeight: s.pillarWeights.learning,
          minObjectivesPerEmployee: s.minObjectives,
          maxObjectivesPerEmployee: s.maxObjectives,
          mandatoryCorporateAlignment: s.mandatoryCorporateAlignment,
          allowEmployeeProposeKeyResults: s.allowEmployeeProposeKeyResults,
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Saves only after the server confirms. Errors from the server (validation, or not HR) are shown as they come back.
  const saveFrameworkSettings = async () => {
    setSettingsSaving(true);
    try {
      const res = await fetch("/api/hr/performance/settings/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pillarWeights: {
            financial: frameworkConfig.financialWeight,
            customer: frameworkConfig.customerWeight,
            internal: frameworkConfig.internalWeight,
            learning: frameworkConfig.learningWeight,
          },
          minObjectives: frameworkConfig.minObjectivesPerEmployee,
          maxObjectives: frameworkConfig.maxObjectivesPerEmployee,
          mandatoryCorporateAlignment: frameworkConfig.mandatoryCorporateAlignment,
          allowEmployeeProposeKeyResults: frameworkConfig.allowEmployeeProposeKeyResults,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; errors?: string[] };
      if (!res.ok) {
        setStatusMessage({ text: [data.error ?? "The settings were not saved.", ...(data.errors ?? [])].join(" "), error: true });
        return;
      }
      setStatusMessage({ text: "Performance framework and cascading scorecard weights saved." });
    } catch {
      setStatusMessage({ text: "The server could not be reached. Settings were not saved.", error: true });
    } finally {
      setSettingsSaving(false);
    }
  };

  const [signOffChainConfig, setSignOffChainConfig] = useState({
    immutableSelfScore: true,
    requireCryptographicDigitalStamp: true,
    slaDaysPerTier: 5,
    autoNudgePendingManagers: true,
    tiers: [
      { step: 1, role: "Employee Self-Evaluation", description: "Dossier & self-score submission; locked permanently upon sign-off", required: true },
      { step: 2, role: "Immediate Line Supervisor", description: "Independent supervisor grading & achievement evidence review", required: true },
      { step: 3, role: "Head of Department (HOD)", description: "Departmental calibration & operational budget verification", required: true },
      { step: 4, role: "Executive Director / Division Head", description: "High-level strategic alignment & promotion sign-off", required: true },
      { step: 5, role: "HR Appraisal Review Board", description: "Final normalization across company talent bands & merit allocation", required: true },
    ],
  });

  const [competencyMatrixConfig, setCompetencyMatrixConfig] = useState({
    competencyWeightPercent: 30,
    goalWeightPercent: 70,
    mandatoryPassingGrade: 3.0,
    traits: [
      { id: "discipline", name: "Professional Discipline & Compliance", description: "Adherence to regulatory statutes, security policies, and ethics", weight: 25 },
      { id: "communication", name: "Communication & Executive Briefing", description: "Written precision, active listening, and transparent documentation", weight: 20 },
      { id: "teamwork", name: "Cross-Functional Collaboration", description: "Breaking organizational silos and driving peer success", weight: 20 },
      { id: "initiative", name: "Proactive Problem Resolution", description: "Anticipating blockers and deploying timely innovations", weight: 20 },
      { id: "cultural_iq", name: "Cultural Intelligence & Inclusion", description: "Empathetic engagement across Accra, London, and remote hubs", weight: 15 },
    ],
  });

  const [peerReviewConfig, setPeerReviewConfig] = useState({
    minPeersRequired: 2,
    includeDirectReports: true,
    managerApprovalOfRaters: true,
    anonymityThreshold: 3,
    blindSpotGapThreshold: 1.0,
    enableBellCurveGuidance: true,
    bellCurveTargets: {
      exceeds: 10,
      meets: 70,
      needsCoaching: 15,
      unsatisfactory: 5,
    },
  });

  const [pipSettings, setPipSettings] = useState({
    autoTriggerUnderScore: 2.5,
    durationWeeks: 8,
    mandatoryWeeklyCheckIns: true,
    hrDirectorNotification: true,
    exemptions: {
      maternityPaternity: true,
      medicalSabbatical: true,
      probationUnder90Days: true,
    },
    makerCheckerRequired: true,
  });

  // Handler for Approving Objective Request (Screenshot 4)
  const handleApproveRequest = (id: number) => {
    setObjectiveRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "APPROVED" } : r))
    );
    setStatusMessage({ text: `Objective Request #${id} approved successfully.` });
  };

  const handleDeclineRequest = (id: number) => {
    setObjectiveRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "DECLINED" } : r))
    );
    setStatusMessage({ text: `Objective Request #${id} marked as Declined.`, error: true });
  };

  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cycleTitle) return;

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const newCycle: CycleRecord = {
        id: Date.now(),
        title: cycleTitle,
        description: cycleDesc,
        framework_code: selectedFramework,
        framework_name:
          selectedFramework === "OKR"
            ? "Objectives & Key Results (Single-Framework)"
            : selectedFramework === "MBO"
            ? "Management by Objectives (Single-Framework)"
            : "Balanced Scorecard (Single-Framework)",
        status: "ACTIVE",
        start_date: startDate,
        end_date: endDate,
      };

      onCycleCreated?.(newCycle);
      setShowNewCycleModal(false);
      setCycleTitle("");
      setCycleDesc("");
      setStatusMessage({ text: `Appraisal Cycle "${newCycle.title}" successfully launched.` });
    } catch {
      setStatusMessage({ text: "Failed to create cycle.", error: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCheckInGoal.trim()) return;

    const record: CheckInRecord = {
      id: Date.now(),
      employeeName: newCheckInEmployee,
      employeeRole: "Team Member",
      supervisorName: newCheckInSupervisor,
      cycleTitle: selectedAppraisalCycle,
      framework: "OKR",
      goalTitle: newCheckInGoal,
      currentProgressPct: newCheckInProgress,
      lastCheckInDate: new Date().toISOString().slice(0, 10),
      nextScheduledDate: newCheckInNextDate,
      status: newCheckInProgress >= 90 ? "COMPLETED" : newCheckInProgress < 40 ? "NEEDS_ATTENTION" : "ON_TRACK",
      recentWins: newCheckInWins || "Continuous alignment established.",
      blockers: newCheckInBlockers || "No blockers recorded.",
      actionItems: newCheckInActions || "Execute next milestones before upcoming check-in.",
      supervisorFeedback: newCheckInFeedback || "Good collaboration and steady progress.",
      cadence: newCheckInCadence,
    };

    setCheckIns([record, ...checkIns]);
    setShowNewCheckInModal(false);
    setNewCheckInGoal("");
    setNewCheckInWins("");
    setNewCheckInBlockers("");
    setNewCheckInActions("");
    setNewCheckInFeedback("");
    setStatusMessage({ text: `1-on-1 Check-in between ${newCheckInEmployee} & ${newCheckInSupervisor} logged.` });
  };

  // Filtered Objective Requests
  const filteredObjectiveRequests = useMemo(() => {
    return objectiveRequests.filter((r) => {
      const matchesSearch =
        requestSearchQuery.trim() === "" ||
        r.ownerName.toLowerCase().includes(requestSearchQuery.toLowerCase()) ||
        r.ownerStaffId.toLowerCase().includes(requestSearchQuery.toLowerCase()) ||
        r.ownerRole.toLowerCase().includes(requestSearchQuery.toLowerCase()) ||
        r.subsidiary.toLowerCase().includes(requestSearchQuery.toLowerCase());

      const matchesStatus =
        requestStatusFilter === "ALL" ||
        (requestStatusFilter === "ACTIVE"
          ? (r.status === "APPROVED" || r.status === "UNDETERMINED")
          : r.status === requestStatusFilter);

      return matchesSearch && matchesStatus;
    });
  }, [objectiveRequests, requestSearchQuery, requestStatusFilter]);

  // Filtered pending goal drafting staff (84 count)
  const filteredPendingGoalStaff = useMemo(() => {
    if (requestStatusFilter !== "NO_OBJECTIVES") return [];
    return pendingGoalStaffList.filter((s) => {
      if (!requestSearchQuery.trim()) return true;
      const q = requestSearchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.staffId.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q) ||
        s.team.toLowerCase().includes(q) ||
        s.manager.toLowerCase().includes(q)
      );
    });
  }, [pendingGoalStaffList, requestStatusFilter, requestSearchQuery]);

  // Status Metrics Counts (Screenshot 3)
  const objectiveMetrics = useMemo(() => {
    const active = objectiveRequests.filter((r) => r.status === "APPROVED" || r.status === "UNDETERMINED").length;
    const pending = objectiveRequests.filter((r) => r.status === "PENDING APPROVAL").length;
    const approved = objectiveRequests.filter((r) => r.status === "APPROVED").length;
    const declined = objectiveRequests.filter((r) => r.status === "DECLINED").length;
    return {
      noObjectives: 84, // Benchmark count from Image 3
      activeObjectives: active,
      pendingApproval: pending,
      approvedObjectives: approved,
      declinedObjectives: declined,
    };
  }, [objectiveRequests]);

  return (
    <div style={{ padding: "1.75rem 2rem", maxWidth: "1440px", margin: "0 auto" }}>
      {/* Platform Header & Navigation Tabs */}
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <span style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.indigoAction, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Enterprise Performance Suite
              </span>
            </div>
            <h1
              style={{
                fontSize: typography.sizes.xl,
                fontWeight: 800,
                color: colors.indigoPrimary,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              Performance Management & Objectives
            </h1>
          </div>

          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveMainTab("settings")}
              style={{ borderColor: activeMainTab === "settings" ? colors.indigoAction : colors.border }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Icons.Settings size={14} />
                <span>PMS Settings</span>
              </span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowNewCheckInModal(true)}
              style={{ borderColor: colors.emeraldDark, color: colors.emeraldDark }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Icons.Target size={14} />
                <span>Log 1-on-1 Check-in</span>
              </span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowNewCycleModal(true)}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Icons.Plus size={14} />
                <span>Initiate Cycle</span>
              </span>
            </Button>
          </div>
        </div>

        {/* PMS Sub-Navigation Menu Bar (Screenshot 2 & 5) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            borderBottom: `1px solid ${colors.border}`,
            paddingBottom: "0.35rem",
            overflowX: "auto",
          }}
        >
          {[
            { key: "dashboard", label: "Dashboard", icon: Icons.CommandCentre },
            { key: "cascading_bsc", label: "Cascading BSC", icon: Icons.Layers },
            { key: "military_chain", label: "Sequential Sign-off", icon: Icons.ShieldCheck },
            { key: "trait_matrix", label: "Strict Trait Matrix", icon: Icons.Award },
            { key: "okr_heatmap", label: "OKR Heatmap", icon: Icons.Activity },
            { key: "nine_box", label: "9-Box Succession", icon: Icons.Users },
            { key: "cycles", label: "Appraisal Cycles", icon: Icons.Calendar },
            { key: "requests", label: "Requests", icon: Icons.FileText },
            { key: "objectives_setup", label: "Objectives Setup", icon: Icons.Target },
            { key: "appraisals", label: "Appraisals", icon: Icons.BookOpen },
            { key: "bulk_actions", label: "Bulk Actions", icon: Icons.Crosshair },
            { key: "checkins", label: "1-on-1 Check-ins", icon: Icons.Users },
            { key: "settings", label: "Settings", icon: Icons.Settings },
            { key: "insights", label: "Performance Insights", icon: Icons.BarChart },
          ].map((tab) => {
            const isActive = activeMainTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveMainTab(tab.key as typeof activeMainTab)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  padding: "0.55rem 0.9rem",
                  borderRadius: radii.md,
                  border: "none",
                  backgroundColor: isActive ? colors.surfaceSubtle : "transparent",
                  color: isActive ? colors.indigoAction : colors.textSecondary,
                  fontWeight: isActive ? 700 : 500,
                  fontSize: typography.sizes.xs,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
                  borderBottom: isActive ? `2px solid ${colors.indigoAction}` : "2px solid transparent",
                }}
              >
                <tab.icon size={14} color={isActive ? colors.indigoAction : colors.textMuted} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {statusMessage && (
        <div
          style={{
            padding: "0.75rem 1rem",
            marginBottom: "1.25rem",
            borderRadius: radii.md,
            backgroundColor: statusMessage.error ? colors.errorBg : colors.successBg,
            border: `1px solid ${statusMessage.error ? colors.errorBorder : colors.successBorder}`,
            color: statusMessage.error ? colors.error : colors.success,
            fontSize: typography.sizes.sm,
            fontWeight: 500,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{statusMessage.text}</span>
          <button
            onClick={() => setStatusMessage(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: DASHBOARD (Screenshot 3)                                           */}
      {/* ========================================================================= */}
      {activeMainTab === "dashboard" && (
        <div>
          {/* Top Appraisal Cycle Selector Bar (Screenshot 3) */}
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              padding: "1rem 1.5rem",
              marginBottom: "1.25rem",
              boxShadow: shadows.xs,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                Appraisal cycle
              </span>
              <span style={{ fontSize: typography.sizes.sm, fontWeight: 800, color: colors.brandBlue }}>
                {selectedAppraisalCycle}
              </span>
              <select
                value={selectedAppraisalCycle}
                onChange={(e) => setSelectedAppraisalCycle(e.target.value)}
                style={{
                  fontSize: typography.sizes.xs,
                  padding: "0.25rem 0.5rem",
                  borderRadius: radii.md,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.surfaceSubtle,
                  color: colors.textSecondary,
                  cursor: "pointer",
                }}
              >
                <option value="Enterprise Annual Appraisal">Enterprise Annual Appraisal</option>
                <option value="Senrab Cycle">Senrab Q1 Cycle (Ghana & UK)</option>
                <option value="2026 Q1 Performance Appraisal for Henley Resources">2026 Q1 Performance Appraisal for Henley Resources</option>
              </select>
            </div>

            {/* Quick Action Navigation Pills (Screenshot 3) */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {[
                { label: "Manage appraisal cycle", tab: "cycles" as const },
                { label: "Setup objectives", tab: "objectives_setup" as const },
                { label: "Score upload", tab: "appraisals" as const },
                { label: "Reports", tab: "insights" as const },
              ].map((pill) => (
                <button
                  key={pill.label}
                  onClick={() => setActiveMainTab(pill.tab)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.45rem",
                    padding: "0.4rem 0.85rem",
                    borderRadius: radii.full,
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.surfaceSubtle,
                    color: colors.textPrimary,
                    fontSize: typography.sizes.xs,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
                  }}
                >
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: colors.brandBlue }} />
                  <span>{pill.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 5 Distinct Objective Status Cards with Left Accent Lines (Screenshot 3) */}
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              padding: "1.5rem",
              marginBottom: "1.5rem",
              boxShadow: shadows.xs,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {/* Card 1: No Objectives */}
            <div
              {...drillProps(() => setDashboardDrilldownCohort((prev) => prev === "NO_OBJECTIVES" ? null : "NO_OBJECTIVES"), "Drill down to 84 staff pending goal drafting")}
              style={{
                borderLeft: "3.5px solid #2563eb",
                padding: "0.6rem 0.85rem",
                borderRadius: radii.md,
                backgroundColor: dashboardDrilldownCohort === "NO_OBJECTIVES" ? "rgba(37, 99, 235, 0.1)" : "transparent",
                outline: dashboardDrilldownCohort === "NO_OBJECTIVES" ? "2px solid #2563eb" : "none",
                cursor: "pointer",
                transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                <span style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, fontWeight: 700 }}>
                  No Objectives
                </span>
                <span style={{ fontSize: "10px", color: "#2563eb", fontWeight: 700 }}>
                  {dashboardDrilldownCohort === "NO_OBJECTIVES" ? "▲ Close" : "Drill down →"}
                </span>
              </div>
              <div style={{ fontSize: "2.25rem", fontWeight: 800, color: colors.textPrimary, lineHeight: 1 }}>
                {objectiveMetrics.noObjectives}
              </div>
              <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "0.4rem" }}>
                Staff pending goal drafting
              </div>
            </div>

            {/* Card 2: Active Objectives */}
            <div
              {...drillProps(() => setDashboardDrilldownCohort((prev) => prev === "ACTIVE" ? null : "ACTIVE"), "Drill down to 9 active objectives")}
              style={{
                borderLeft: "3.5px solid #f97316",
                padding: "0.6rem 0.85rem",
                borderRadius: radii.md,
                backgroundColor: dashboardDrilldownCohort === "ACTIVE" ? "rgba(249, 115, 22, 0.1)" : "transparent",
                outline: dashboardDrilldownCohort === "ACTIVE" ? "2px solid #f97316" : "none",
                cursor: "pointer",
                transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                <span style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, fontWeight: 700 }}>
                  Active Objectives
                </span>
                <span style={{ fontSize: "10px", color: "#ea580c", fontWeight: 700 }}>
                  {dashboardDrilldownCohort === "ACTIVE" ? "▲ Close" : "Drill down →"}
                </span>
              </div>
              <div style={{ fontSize: "2.25rem", fontWeight: 800, color: colors.textPrimary, lineHeight: 1 }}>
                {objectiveMetrics.activeObjectives}
              </div>
              <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "0.4rem" }}>
                Currently in execution
              </div>
            </div>

            {/* Card 3: Objectives Pending Approval */}
            <div
              {...drillProps(() => setDashboardDrilldownCohort((prev) => prev === "PENDING_APPROVAL" ? null : "PENDING_APPROVAL"), "Drill down to 1 pending approval objective")}
              style={{
                borderLeft: "3.5px solid #ef4444",
                padding: "0.6rem 0.85rem",
                borderRadius: radii.md,
                backgroundColor: dashboardDrilldownCohort === "PENDING_APPROVAL" ? "rgba(239, 68, 68, 0.1)" : "transparent",
                outline: dashboardDrilldownCohort === "PENDING_APPROVAL" ? "2px solid #ef4444" : "none",
                cursor: "pointer",
                transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                <span style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, fontWeight: 700 }}>
                  Objectives Pending Approval
                </span>
                <span style={{ fontSize: "10px", color: "#dc2626", fontWeight: 700 }}>
                  {dashboardDrilldownCohort === "PENDING_APPROVAL" ? "▲ Close" : "Drill down →"}
                </span>
              </div>
              <div style={{ fontSize: "2.25rem", fontWeight: 800, color: colors.textPrimary, lineHeight: 1 }}>
                {objectiveMetrics.pendingApproval}
              </div>
              <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "0.4rem" }}>
                Awaiting line manager signoff
              </div>
            </div>

            {/* Card 4: Approved Objectives */}
            <div
              {...drillProps(() => setDashboardDrilldownCohort((prev) => prev === "APPROVED" ? null : "APPROVED"), "Drill down to 3 approved objectives")}
              style={{
                borderLeft: "3.5px solid #8b5cf6",
                padding: "0.6rem 0.85rem",
                borderRadius: radii.md,
                backgroundColor: dashboardDrilldownCohort === "APPROVED" ? "rgba(139, 92, 246, 0.1)" : "transparent",
                outline: dashboardDrilldownCohort === "APPROVED" ? "2px solid #8b5cf6" : "none",
                cursor: "pointer",
                transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                <span style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, fontWeight: 700 }}>
                  Approved Objectives
                </span>
                <span style={{ fontSize: "10px", color: "#7c3aed", fontWeight: 700 }}>
                  {dashboardDrilldownCohort === "APPROVED" ? "▲ Close" : "Drill down →"}
                </span>
              </div>
              <div style={{ fontSize: "2.25rem", fontWeight: 800, color: colors.textPrimary, lineHeight: 1 }}>
                {objectiveMetrics.approvedObjectives}
              </div>
              <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "0.4rem" }}>
                Locked for current cycle
              </div>
            </div>

            {/* Card 5: Declined Objectives */}
            <div
              {...drillProps(() => setDashboardDrilldownCohort((prev) => prev === "DECLINED" ? null : "DECLINED"), "Drill down to declined objectives")}
              style={{
                borderLeft: "3.5px solid #10b981",
                padding: "0.6rem 0.85rem",
                borderRadius: radii.md,
                backgroundColor: dashboardDrilldownCohort === "DECLINED" ? "rgba(16, 185, 129, 0.1)" : "transparent",
                outline: dashboardDrilldownCohort === "DECLINED" ? "2px solid #10b981" : "none",
                cursor: "pointer",
                transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                <span style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, fontWeight: 700 }}>
                  Declined Objectives
                </span>
                <span style={{ fontSize: "10px", color: "#059669", fontWeight: 700 }}>
                  {dashboardDrilldownCohort === "DECLINED" ? "▲ Close" : "Drill down →"}
                </span>
              </div>
              <div style={{ fontSize: "2.25rem", fontWeight: 800, color: colors.textPrimary, lineHeight: 1 }}>
                {objectiveMetrics.declinedObjectives}
              </div>
              <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "0.4rem" }}>
                Returned for revision
              </div>
            </div>
          </div>

          {/* Interactive Dashboard Drill-down Panel */}
          {dashboardDrilldownCohort && (
            <div
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                border: `2px solid ${
                  dashboardDrilldownCohort === "NO_OBJECTIVES"
                    ? "#2563eb"
                    : dashboardDrilldownCohort === "ACTIVE"
                    ? "#f97316"
                    : dashboardDrilldownCohort === "PENDING_APPROVAL"
                    ? "#ef4444"
                    : dashboardDrilldownCohort === "APPROVED"
                    ? "#8b5cf6"
                    : "#10b981"
                }`,
                padding: "1.25rem 1.5rem",
                marginBottom: "1.5rem",
                boxShadow: shadows.md,
              }}
            >
              {/* Header Bar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem", borderBottom: `1px solid ${colors.borderSubtle}`, paddingBottom: "0.75rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "16px" }}>
                      {dashboardDrilldownCohort === "NO_OBJECTIVES" ? "📋" : dashboardDrilldownCohort === "ACTIVE" ? "⚡" : dashboardDrilldownCohort === "PENDING_APPROVAL" ? "⏳" : dashboardDrilldownCohort === "APPROVED" ? "🔒" : "↩️"}
                    </span>
                    <h3 style={{ fontSize: typography.sizes.base, fontWeight: 800, color: colors.textPrimary, margin: 0 }}>
                      {dashboardDrilldownCohort === "NO_OBJECTIVES" && "Staff Pending Goal Formulation (84 Employees)"}
                      {dashboardDrilldownCohort === "ACTIVE" && "Active Objectives in Execution (9 Objectives)"}
                      {dashboardDrilldownCohort === "PENDING_APPROVAL" && "Objectives Pending Line Manager Approval (1 Objective)"}
                      {dashboardDrilldownCohort === "APPROVED" && "Approved & Locked Objectives (3 Objectives)"}
                      {dashboardDrilldownCohort === "DECLINED" && "Declined / Returned Objectives (0 Objectives)"}
                    </h3>
                  </div>
                  <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0.25rem 0 0 0" }}>
                    {dashboardDrilldownCohort === "NO_OBJECTIVES" && `Employees enrolled in ${selectedAppraisalCycle} who have not drafted strategic BSC/OKR objectives.`}
                    {dashboardDrilldownCohort === "ACTIVE" && "Approved and active strategic objectives currently being executed across Accra and London."}
                    {dashboardDrilldownCohort === "PENDING_APPROVAL" && "Objectives submitted by appraisees awaiting line manager review and signoff."}
                    {dashboardDrilldownCohort === "APPROVED" && "Finalized objectives approved and locked for the active evaluation cycle."}
                    {dashboardDrilldownCohort === "DECLINED" && "Objectives returned to appraisee for scope adjustment or realignment."}
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input
                    type="text"
                    placeholder="Filter list..."
                    value={dashboardDrilldownSearch}
                    onChange={(e) => setDashboardDrilldownSearch(e.target.value)}
                    style={{
                      padding: "0.35rem 0.65rem",
                      borderRadius: radii.md,
                      border: `1px solid ${colors.border}`,
                      fontSize: typography.sizes.xs,
                      width: "180px",
                    }}
                  />
                  {dashboardDrilldownCohort === "NO_OBJECTIVES" && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setStatusMessage({ text: "Dede AI sent Slack & Email drafting nudges to all 84 pending staff members." });
                      }}
                    >
                      Nudge All 84 Staff
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRequestStatusFilter(
                        dashboardDrilldownCohort === "PENDING_APPROVAL" ? "PENDING APPROVAL" : dashboardDrilldownCohort
                      );
                      setActiveMainTab("requests");
                    }}
                  >
                    Open in Requests Workspace →
                  </Button>
                  <button
                    onClick={() => setDashboardDrilldownCohort(null)}
                    style={{
                      border: "none",
                      backgroundColor: "transparent",
                      color: colors.textMuted,
                      cursor: "pointer",
                      padding: "0.25rem 0.5rem",
                      fontSize: "14px",
                      fontWeight: 700,
                    }}
                    title="Close Drilldown"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Drilldown Content Table */}
              <div style={{ maxHeight: "360px", overflowY: "auto", border: `1px solid ${colors.border}`, borderRadius: radii.md }}>
                {dashboardDrilldownCohort === "NO_OBJECTIVES" && (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
                    <thead>
                      <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left", position: "sticky", top: 0 }}>
                        <th style={{ padding: "0.6rem 0.75rem", color: colors.textMuted }}>#</th>
                        <th style={{ padding: "0.6rem 0.75rem", color: colors.textMuted }}>STAFF MEMBER</th>
                        <th style={{ padding: "0.6rem 0.75rem", color: colors.textMuted }}>STAFF ID</th>
                        <th style={{ padding: "0.6rem 0.75rem", color: colors.textMuted }}>DEPARTMENT</th>
                        <th style={{ padding: "0.6rem 0.75rem", color: colors.textMuted }}>TEAM / SQUAD</th>
                        <th style={{ padding: "0.6rem 0.75rem", color: colors.textMuted }}>LINE MANAGER</th>
                        <th style={{ padding: "0.6rem 0.75rem", color: colors.textMuted }}>OVERDUE</th>
                        <th style={{ padding: "0.6rem 0.75rem", color: colors.textMuted, textAlign: "right" }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingGoalStaffList
                        .filter((s) => {
                          if (!dashboardDrilldownSearch.trim()) return true;
                          const q = dashboardDrilldownSearch.toLowerCase();
                          return (
                            s.name.toLowerCase().includes(q) ||
                            s.staffId.toLowerCase().includes(q) ||
                            s.department.toLowerCase().includes(q) ||
                            s.team.toLowerCase().includes(q) ||
                            s.manager.toLowerCase().includes(q)
                          );
                        })
                        .map((s, idx) => (
                          <tr key={s.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                            <td style={{ padding: "0.55rem 0.75rem", color: colors.textMuted }}>{idx + 1}</td>
                            <td style={{ padding: "0.55rem 0.75rem", fontWeight: 700, color: colors.textPrimary }}>{s.name}</td>
                            <td style={{ padding: "0.55rem 0.75rem", fontFamily: typography.fontMono, color: colors.textSecondary }}>{s.staffId}</td>
                            <td style={{ padding: "0.55rem 0.75rem", color: colors.textSecondary }}>{s.department}</td>
                            <td style={{ padding: "0.55rem 0.75rem", color: colors.indigoPrimary, fontWeight: 600 }}>{s.team}</td>
                            <td style={{ padding: "0.55rem 0.75rem", color: colors.textMuted }}>{s.manager}</td>
                            <td style={{ padding: "0.55rem 0.75rem", color: "#b91c1c", fontWeight: 700 }}>{s.daysOverdue} days</td>
                            <td style={{ padding: "0.55rem 0.75rem", textAlign: "right" }}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setStatusMessage({ text: `Automated Slack reminder sent to ${s.name} (${s.manager} CC'd).` });
                                }}
                              >
                                Nudge
                              </Button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}

                {dashboardDrilldownCohort === "ACTIVE" && (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
                    <thead>
                      <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left", position: "sticky", top: 0 }}>
                        <th style={{ padding: "0.6rem 0.75rem", color: colors.textMuted }}>OWNER</th>
                        <th style={{ padding: "0.6rem 0.75rem", color: colors.textMuted }}>OBJECTIVE TITLE</th>
                        <th style={{ padding: "0.6rem 0.75rem", color: colors.textMuted }}>FRAMEWORK</th>
                        <th style={{ padding: "0.6rem 0.75rem", color: colors.textMuted }}>TARGET / CURRENT</th>
                        <th style={{ padding: "0.6rem 0.75rem", color: colors.textMuted }}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {objectiveRequests
                        .filter((r) => r.status === "APPROVED" || r.status === "UNDETERMINED")
                        .map((r) => (
                          <tr key={r.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                            <td style={{ padding: "0.55rem 0.75rem", fontWeight: 700, color: colors.textPrimary }}>{r.ownerName}</td>
                            <td style={{ padding: "0.55rem 0.75rem", color: colors.textPrimary }}>{r.goals[0]?.title || "Strategic Objective Set"}</td>
                            <td style={{ padding: "0.55rem 0.75rem", color: colors.indigoPrimary, fontWeight: 600 }}>{r.objectiveType} ({r.goals[0]?.weight || 25}%)</td>
                            <td style={{ padding: "0.55rem 0.75rem", color: colors.textMuted }}>{r.goals[0]?.target || "100% Target"} ({r.goals[0]?.metric || "Execution Metric"})</td>
                            <td style={{ padding: "0.55rem 0.75rem" }}>
                              <span style={{ fontSize: "10px", fontWeight: 700, padding: "0.15rem 0.45rem", borderRadius: radii.full, backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#065f46" }}>
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}

                {dashboardDrilldownCohort === "PENDING_APPROVAL" && (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
                    <thead>
                      <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left", position: "sticky", top: 0 }}>
                        <th style={{ padding: "0.6rem 0.75rem", color: colors.textMuted }}>OWNER</th>
                        <th style={{ padding: "0.6rem 0.75rem", color: colors.textMuted }}>OBJECTIVE TITLE</th>
                        <th style={{ padding: "0.6rem 0.75rem", color: colors.textMuted }}>SUBSIDIARY / HUB</th>
                        <th style={{ padding: "0.6rem 0.75rem", color: colors.textMuted }}>SUBMITTED DATE</th>
                        <th style={{ padding: "0.6rem 0.75rem", color: colors.textMuted, textAlign: "right" }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {objectiveRequests
                        .filter((r) => r.status === "PENDING APPROVAL")
                        .map((r) => (
                          <tr key={r.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                            <td style={{ padding: "0.55rem 0.75rem", fontWeight: 700, color: colors.textPrimary }}>{r.ownerName}</td>
                            <td style={{ padding: "0.55rem 0.75rem", color: colors.textPrimary }}>{r.goals[0]?.title || "Strategic Objective Set"}</td>
                            <td style={{ padding: "0.55rem 0.75rem", color: colors.textSecondary }}>{r.subsidiary}</td>
                            <td style={{ padding: "0.55rem 0.75rem", color: colors.textMuted }}>{r.date}</td>
                            <td style={{ padding: "0.55rem 0.75rem", textAlign: "right" }}>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                  setStatusMessage({ text: `Objective '${r.goals[0]?.title || "Strategic Objective"}' approved for ${r.ownerName}.` });
                                }}
                              >
                                Approve
                              </Button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}

                {dashboardDrilldownCohort === "APPROVED" && (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
                    <thead>
                      <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left", position: "sticky", top: 0 }}>
                        <th style={{ padding: "0.6rem 0.75rem", color: colors.textMuted }}>OWNER</th>
                        <th style={{ padding: "0.6rem 0.75rem", color: colors.textMuted }}>OBJECTIVE TITLE</th>
                        <th style={{ padding: "0.6rem 0.75rem", color: colors.textMuted }}>FRAMEWORK</th>
                        <th style={{ padding: "0.6rem 0.75rem", color: colors.textMuted }}>LOCKED DATE</th>
                        <th style={{ padding: "0.6rem 0.75rem", color: colors.textMuted, textAlign: "right" }}>LOCKED STATE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {objectiveRequests
                        .filter((r) => r.status === "APPROVED")
                        .map((r) => (
                          <tr key={r.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                            <td style={{ padding: "0.55rem 0.75rem", fontWeight: 700, color: colors.textPrimary }}>{r.ownerName}</td>
                            <td style={{ padding: "0.55rem 0.75rem", color: colors.textPrimary }}>{r.goals[0]?.title || "Strategic Objective Set"}</td>
                            <td style={{ padding: "0.55rem 0.75rem", color: colors.indigoPrimary, fontWeight: 600 }}>{r.objectiveType} ({r.goals[0]?.weight || 25}%)</td>
                            <td style={{ padding: "0.55rem 0.75rem", color: colors.textMuted }}>{r.date}</td>
                            <td style={{ padding: "0.55rem 0.75rem", textAlign: "right" }}>
                              <span style={{ fontSize: "10px", fontWeight: 700, padding: "0.15rem 0.45rem", borderRadius: radii.full, backgroundColor: "rgba(139, 92, 246, 0.15)", color: "#7c3aed" }}>
                                LOCKED &amp; ACTIVE
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}

                {dashboardDrilldownCohort === "DECLINED" && (
                  <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: colors.textMuted }}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✓</div>
                    <div style={{ fontWeight: 700, fontSize: typography.sizes.sm, color: colors.textPrimary }}>
                      No Objectives Declined
                    </div>
                    <div style={{ fontSize: typography.sizes.xs, marginTop: "0.25rem" }}>
                      Zero objectives have been declined or returned for revision in {selectedAppraisalCycle}.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dede AI Performance Co-pilot Briefing */}
          <div
            style={{
              backgroundColor: "rgba(99, 102, 241, 0.04)",
              border: `1px solid rgba(99, 102, 241, 0.2)`,
              borderRadius: radii.lg,
              padding: "1.25rem 1.5rem",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "1rem",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: radii.md,
                backgroundColor: colors.indigoAccent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: colors.surface,
                flexShrink: 0,
              }}
            >
              <Icons.Sparkles size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <span style={{ fontWeight: 800, color: colors.indigoPrimary, fontSize: typography.sizes.sm }}>
                  Dede — Strategic Performance Digest
                </span>
              </div>
              <p style={{ margin: 0, fontSize: typography.sizes.xs, color: colors.textSecondary, lineHeight: 1.5 }}>
                In <strong>{selectedAppraisalCycle}</strong>, 38 total objective requests have been processed. Ghana Practice exhibits a <strong>100% adherence rate</strong> to Balanced Scorecard four-pillar weighting (Financial, Customer, Internal Processes, Learning & Growth). <strong>4 continuous 1-on-1 check-ins</strong> were logged this sprint with an average progress velocity of <strong>79.8%</strong>.
              </p>
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem" }}>
                <button
                  onClick={() => setActiveMainTab("requests")}
                  style={{
                    backgroundColor: "transparent",
                    border: "none",
                    padding: 0,
                    fontSize: typography.sizes.xs,
                    color: colors.indigoAction,
                    fontWeight: 700,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Review Objective Requests ({objectiveRequests.length}) →
                </button>
                <button
                  onClick={() => setActiveMainTab("checkins")}
                  style={{
                    backgroundColor: "transparent",
                    border: "none",
                    padding: 0,
                    fontSize: typography.sizes.xs,
                    color: colors.emeraldDark,
                    fontWeight: 700,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Inspect Continuous Check-ins ({checkIns.length}) →
                </button>
              </div>
            </div>
          </div>

          {/* Dual Panel: Active Cycles Summary & Recent Check-ins */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            {/* Active Cycles Overview */}
            <div
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                border: `1px solid ${colors.border}`,
                padding: "1.25rem",
                boxShadow: shadows.xs,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ margin: 0, fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                  Active Appraisal Cycles
                </h3>
                <Button variant="outline" size="sm" onClick={() => setActiveMainTab("cycles")}>
                  View All ({cycles.length})
                </Button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {cycles.slice(0, 3).map((cycle) => (
                  <div
                    key={cycle.id}
                    style={{
                      padding: "0.85rem",
                      borderRadius: radii.md,
                      border: `1px solid ${colors.borderSubtle}`,
                      backgroundColor: colors.surfaceSubtle,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary }}>
                        {cycle.title}
                      </div>
                      <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "2px" }}>
                        Period: {formatDateRange(cycle.start_date, cycle.end_date)}
                      </div>
                    </div>
                    <Badge variant="bsc" size="sm">
                      {cycle.framework_code || "OKR"} Pure
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent 1-on-1 Check-ins */}
            <div
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                border: `1px solid ${colors.border}`,
                padding: "1.25rem",
                boxShadow: shadows.xs,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ margin: 0, fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                  Recent 1-on-1 Check-ins
                </h3>
                <Button variant="outline" size="sm" onClick={() => setActiveMainTab("checkins")}>
                  Manage Check-ins
                </Button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {checkIns.slice(0, 3).map((ci) => (
                  <div
                    key={ci.id}
                    style={{
                      padding: "0.85rem",
                      borderRadius: radii.md,
                      border: `1px solid ${colors.borderSubtle}`,
                      backgroundColor: colors.surfaceSubtle,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary }}>
                        {ci.employeeName} ↔ {ci.supervisorName}
                      </div>
                      <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "2px" }}>
                        {ci.goalTitle.slice(0, 48)}...
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: colors.emeraldDark }}>
                        {ci.currentProgressPct}%
                      </div>
                      <span style={{ fontSize: "10px", color: colors.textMuted }}>
                        Next: {formatDate(ci.nextScheduledDate)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: CASCADING SCORECARD BUILDER (Balanced Scorecard)          */}
      {/* ========================================================================= */}
      {activeMainTab === "cascading_bsc" && (
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
                <Icons.Layers size={18} color={colors.indigoAction} />
                <h2 style={{ fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary, margin: 0 }}>
                  Cascading Scorecard Builder (Balanced Scorecard)
                </h2>
              </div>
              <p style={{ fontSize: typography.sizes.xs, color: colors.indigoPrimary, margin: "0.25rem 0 0 0" }}>
                Four-pillar strategic weighting (Financial {bscWeights.financial}%, Customer {bscWeights.customer}%, Internal Processes {bscWeights.internal}%, Learning &amp; Growth {bscWeights.learning}%). Direct ladder-up from individual contributor KPIs to executive corporate objectives.
              </p>
            </div>
          </div>

          {/* Interactive Weight Calibrator */}
          <div
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.lg,
              padding: "1.25rem 1.5rem",
              boxShadow: shadows.xs,
            }}
          >
            <h3 style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary, margin: "0 0 0.75rem 0" }}>
              Balanced Scorecard Perspective Weight Distribution (Must Equal 100%)
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
              {[
                { key: "financial" as const, label: "1. Financial Perspective", weight: bscWeights.financial, color: "#2563eb", icon: "💰" },
                { key: "customer" as const, label: "2. Customer / Stakeholder", weight: bscWeights.customer, color: "#16a34a", icon: "🤝" },
                { key: "internal" as const, label: "3. Internal Processes", weight: bscWeights.internal, color: "#d97706", icon: "⚙️" },
                { key: "learning" as const, label: "4. Learning & Growth", weight: bscWeights.learning, color: "#9333ea", icon: "🌱" },
              ].map((p) => (
                <div
                  key={p.key}
                  style={{
                    padding: "0.85rem 1rem",
                    borderRadius: radii.md,
                    backgroundColor: colors.surfaceSubtle,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: colors.textPrimary }}>
                      {p.icon} {p.label}
                    </span>
                    <span style={{ fontSize: typography.sizes.sm, fontWeight: 800, color: p.color }}>
                      {p.weight}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={p.weight}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 0;
                      setBscWeights((prev) => ({ ...prev, [p.key]: val }));
                    }}
                    style={{ width: "100%", accentColor: p.color, cursor: "pointer" }}
                  />
                </div>
              ))}
            </div>
            {bscWeights.financial + bscWeights.customer + bscWeights.internal + bscWeights.learning !== 100 && (
              <div style={{ marginTop: "0.75rem", padding: "0.5rem 0.75rem", borderRadius: radii.sm, backgroundColor: "#fef2f2", color: "#991b1b", fontSize: "11px", fontWeight: 600 }}>
                ⚠️ Warning: Weights currently sum to {bscWeights.financial + bscWeights.customer + bscWeights.internal + bscWeights.learning}%. Balanced Scorecard governance requires strictly 100%.
              </div>
            )}
          </div>

          {/* Cascading Goal Tree (Ladder-Up View) */}
          <div
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.lg,
              padding: "1.5rem",
              boxShadow: shadows.xs,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div>
                <h3 style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
                  Visual Goal Ladder: Individual Contributor ➔ Department ➔ Corporate North Star
                </h3>
                <span style={{ fontSize: "11px", color: colors.textMuted }}>
                  Live cascade trace for Emmanuel K. Quarshie (Healthcare Operations &amp; HR)
                </span>
              </div>
            </div>

            {/* Tree Flow Nodes */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Level 1: Corporate North Star */}
              <div
                style={{
                  padding: "1rem 1.25rem",
                  borderRadius: radii.md,
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                <div style={{ width: "36px", height: "36px", borderRadius: radii.full, backgroundColor: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontWeight: 800, fontSize: "14px", flexShrink: 0 }}>
                  L1
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#1e40af", textTransform: "uppercase" }}>
                    Corporate Strategic North Star (Board Directive)
                  </div>
                  <div style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                    Achieve 99.8% Patient Care Reliability &amp; Operational Self-Sufficiency across Regional Health Facilities
                  </div>
                </div>
                <Badge variant="info" size="sm">Strategic Horizon 2026-2028</Badge>
              </div>

              {/* Cascade Arrow Down */}
              <div style={{ display: "flex", justifyContent: "center", color: colors.indigoAction, fontWeight: 800 }}>
                ↓ Cascades directly into Division &amp; Department KPIs
              </div>

              {/* Level 2: Department Target */}
              <div
                style={{
                  padding: "1rem 1.25rem",
                  borderRadius: radii.md,
                  backgroundColor: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  marginLeft: "2rem",
                }}
              >
                <div style={{ width: "36px", height: "36px", borderRadius: radii.full, backgroundColor: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontWeight: 800, fontSize: "14px", flexShrink: 0 }}>
                  L2
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>
                    Department Objective: Healthcare Operations &amp; HR Services
                  </div>
                  <div style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                    Maintain Zero Medical/Nursing Errors, Reduce Triage Wait Times by 25%, and Ensure 100% Medical Protocol Compliance
                  </div>
                </div>
                <Badge variant="success" size="sm">Dept Weight: 40%</Badge>
              </div>

              {/* Cascade Arrow Down */}
              <div style={{ display: "flex", justifyContent: "center", color: colors.indigoAction, fontWeight: 800, marginLeft: "2rem" }}>
                ↓ Cascades into 4-Pillar Balanced Scorecard
              </div>

              {/* Level 3: Individual Scorecard */}
              <div style={{ marginLeft: "4rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {[
                  {
                    pillar: `Customer / Stakeholder (${bscWeights.customer}%)`,
                    badge: `Weight: ${bscWeights.customer}%`,
                    icon: "🤝",
                    kpi: "Patient Care Satisfaction & Ward Feedback Index > 95%",
                    target: "Target: 95.0% (Current: 96.4%)",
                    color: "#16a34a",
                    status: "EXCEEDING",
                  },
                  {
                    pillar: `Financial Perspective (${bscWeights.financial}%)`,
                    badge: `Weight: ${bscWeights.financial}%`,
                    icon: "💰",
                    kpi: "Clinical Supplies & Consumables Budget Variance < 3% under allocated budget",
                    target: "Target: < 3.0% (Current: 2.1%)",
                    color: "#2563eb",
                    status: "ON_TRACK",
                  },
                  {
                    pillar: `Internal Processes (${bscWeights.internal}%)`,
                    badge: `Weight: ${bscWeights.internal}%`,
                    icon: "⚙️",
                    kpi: "Clinical Shift Handover Audit & Biometric Attendance Adherence > 98%",
                    target: "Target: 98.0% (Current: 99.2%)",
                    color: "#d97706",
                    status: "ON_TRACK",
                  },
                  {
                    pillar: `Learning & Growth (${bscWeights.learning}%)`,
                    badge: `Weight: ${bscWeights.learning}%`,
                    icon: "🌱",
                    kpi: "Complete Advanced Clinical Triage & Emergency Preparedness Recertification",
                    target: "Target: 100% Complete (Current: 100%)",
                    color: "#9333ea",
                    status: "COMPLETED",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "0.85rem 1rem",
                      borderRadius: radii.md,
                      backgroundColor: colors.surfaceSubtle,
                      border: `1px solid ${colors.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.2rem" }}>
                        <span style={{ fontSize: "14px" }}>{item.icon}</span>
                        <span style={{ fontSize: "11px", fontWeight: 800, color: item.color, textTransform: "uppercase" }}>
                          {item.pillar}
                        </span>
                        <Badge variant="neutral" size="sm">{item.badge}</Badge>
                      </div>
                      <div style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textPrimary }}>
                        {item.kpi}
                      </div>
                      <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "0.2rem" }}>
                        {item.target}
                      </div>
                    </div>
                    <Badge variant="success" size="sm">✓ {item.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* TAB: SEQUENTIAL MULTI-TIER SIGN-OFF CHAIN                                 */}
      {/* ========================================================================= */}
      {activeMainTab === "military_chain" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Header Banner */}
          <div
            style={{
              padding: "1rem 1.25rem",
              borderRadius: radii.lg,
              backgroundColor: "#f8fafc",
              border: `1px solid ${colors.borderStrong}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Icons.ShieldCheck size={18} color="#0f172a" />
                <h2 style={{ fontSize: typography.sizes.base, fontWeight: 800, color: "#0f172a", margin: 0 }}>
                  Sequential Hierarchical Appraisal Workflow (5-Tier Chain)
                </h2>
              </div>
              <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0.25rem 0 0 0" }}>
                Multi-tier sequential appraisal protocol: Immutable score locks at each level, employee credential verification, cryptographic digital stamps, and automated executive PDF dossier generation.
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMilitaryPdfGenerated(true);
                  setStatusMessage({ text: "Official Executive Appraisal PDF generated with cryptographic digital stamps." });
                }}
              >
                <Icons.FileText size={14} />
                <span>Generate Stamped PDF</span>
              </Button>
            </div>
          </div>

          {/* Sequential 5-Tier Command Sign-Off Chain */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {militaryChain.map((step) => {
              const isLocked = step.status === "LOCKED_AND_SIGNED";
              const isPending = step.status === "PENDING_ENDORSEMENT";
              return (
                <div
                  key={step.id}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: radii.lg,
                    border: `1px solid ${isPending ? colors.indigoAction : isLocked ? "#bbf7d0" : colors.border}`,
                    padding: "1.25rem 1.5rem",
                    boxShadow: isPending ? shadows.sm : shadows.xs,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: radii.full,
                        backgroundColor: isLocked ? "#16a34a" : isPending ? colors.indigoAction : colors.surfaceSubtle,
                        color: isLocked || isPending ? "#ffffff" : colors.textMuted,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: "14px",
                        flexShrink: 0,
                      }}
                    >
                      {isLocked ? "✓" : step.id}
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "11px", fontWeight: 800, color: colors.textMuted, textTransform: "uppercase" }}>
                          {step.tier}
                        </span>
                        <Badge variant={isLocked ? "success" : isPending ? "warning" : "neutral"} size="sm">
                          {step.status.replace(/_/g, " ")}
                        </Badge>
                      </div>

                      <h4 style={{ margin: "0.2rem 0", fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                        {step.officer} <span style={{ fontSize: "11px", color: colors.textMuted }}>({step.serviceId})</span>
                      </h4>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "11px", color: colors.textSecondary }}>
                        <span>Role: <strong>{step.role}</strong></span>
                        <span>•</span>
                        <span>Timestamp: <code>{step.timestamp}</code></span>
                      </div>

                      {/* Digital Stamp Seal */}
                      <div style={{ marginTop: "0.4rem", display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.2rem 0.5rem", borderRadius: radii.sm, backgroundColor: isLocked ? "#f0fdf4" : colors.surfaceSubtle, border: `1px solid ${isLocked ? "#86efac" : colors.border}`, fontSize: "10px", fontFamily: typography.fontMono, color: isLocked ? "#166534" : colors.textMuted }}>
                        <Icons.Lock size={11} />
                        <span>{step.digitalStamp}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Score & Interactive Endorsement Button */}
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "11px", color: colors.textMuted, fontWeight: 600 }}>Appraisal Score (1-5)</div>
                    <div style={{ fontSize: "1.75rem", fontWeight: 800, color: step.score > 0 ? colors.indigoPrimary : colors.textMuted }}>
                      {step.score > 0 ? `${step.score.toFixed(1)} / 5.0` : "Pending"}
                    </div>

                    {isPending && (
                      <Button
                        variant="primary"
                        size="sm"
                        style={{ marginTop: "0.5rem" }}
                        onClick={() => {
                          setMilitaryChain((prev) =>
                            prev.map((s) =>
                              s.id === 3
                                ? { ...s, status: "LOCKED_AND_SIGNED", timestamp: new Date().toISOString().slice(0, 19).replace("T", " ") + " UTC", digitalStamp: "HOD-SEAL #1104-PASSED" }
                                : s.id === 4
                                ? { ...s, status: "PENDING_ENDORSEMENT" }
                                : s
                            )
                          );
                          setStatusMessage({ text: "Tier 3 (HOD) endorsed successfully. Routed to Divisional Director." });
                        }}
                      >
                        <Icons.Check size={13} />
                        <span>Endorse &amp; Route to Director</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stamped Executive PDF Preview Modal Banner */}
          {militaryPdfGenerated && (
            <div
              style={{
                padding: "1.25rem 1.5rem",
                borderRadius: radii.lg,
                backgroundColor: "#f8fafc",
                border: "2px solid #0f172a",
                boxShadow: shadows.md,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Icons.Award size={18} color="#0f172a" />
                  <span style={{ fontSize: typography.sizes.sm, fontWeight: 800, color: "#0f172a", textTransform: "uppercase" }}>
                    Official Form EXEC-GH/APPRAISAL/2026 Ready
                  </span>
                </div>
                <Badge variant="success" size="sm">Tamper-Proof Audit Hash Verified</Badge>
              </div>
              <p style={{ margin: 0, fontSize: typography.sizes.xs, color: colors.textSecondary, lineHeight: 1.5 }}>
                The appraisal dossier for <strong>Emmanuel K. Quarshie</strong> has been bundled with locked self-scores, line manager grades, and cryptographic digital stamps. This document complies with statutory health service guidelines and ISO 27001 audit standards.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: STRICT NUMERIC COMPETENCY TRAIT MATRIX (1-5 Scale)                   */}
      {/* ========================================================================= */}
      {activeMainTab === "trait_matrix" && (
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
                <Icons.Award size={18} color={colors.indigoAction} />
                <h2 style={{ fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary, margin: 0 }}>
                  Strict Numeric Competency Scoring Matrix (1-5 Scale)
                </h2>
              </div>
              <p style={{ fontSize: typography.sizes.xs, color: colors.indigoPrimary, margin: "0.25rem 0 0 0" }}>
                Evaluates behavioral, operational, and disciplinary traits on a strict numeric scale (1 = Unsatisfactory, 2 = Marginal, 3 = Competent, 4 = Superior, 5 = Exemplary) completely independent of goal OKRs.
              </p>
            </div>
          </div>

          {/* Scoring Rows */}
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              padding: "1.5rem",
              boxShadow: shadows.xs,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {[
                {
                  trait: "Communication & Professional Briefing",
                  desc: "Precision in operational briefings, handover reports, and crisis team updates.",
                  icon: "🗣️",
                },
                {
                  trait: "Team Collaboration & Joint Interoperability",
                  desc: "Cross-functional cooperation across medical, engineering, and administrative departments.",
                  icon: "🤝",
                },
                {
                  trait: "Statutory & Regulatory Protocol Compliance",
                  desc: "Strict adherence to statutory regulations, clinical hygiene, and code of conduct.",
                  icon: "⚖️",
                },
                {
                  trait: "Crisis Decision-Making Under Pressure",
                  desc: "Composure and sound executive judgment during emergency casualty intakes or system outages.",
                  icon: "⚡",
                },
                {
                  trait: "Resource Stewardship & Equipment Care",
                  desc: "Meticulous care and accountability for state medical apparatus and enterprise IT assets.",
                  icon: "🛡️",
                },
              ].map((t) => {
                const currentScore = traitScores[t.trait] || 3;
                return (
                  <div
                    key={t.trait}
                    style={{
                      padding: "1rem",
                      borderRadius: radii.md,
                      backgroundColor: colors.surfaceSubtle,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
                      <div>
                        <span style={{ fontSize: "16px", marginRight: "6px" }}>{t.icon}</span>
                        <strong style={{ fontSize: typography.sizes.sm, color: colors.textPrimary }}>{t.trait}</strong>
                        <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: colors.textMuted }}>{t.desc}</p>
                      </div>
                      <span style={{ fontSize: typography.sizes.base, fontWeight: 800, color: colors.indigoAction }}>
                        {currentScore} / 5
                      </span>
                    </div>

                    {/* 1-5 Radio Buttons */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.5rem", marginTop: "0.5rem" }}>
                      {[
                        { score: 1, label: "1: Unsatisfactory" },
                        { score: 2, label: "2: Marginal" },
                        { score: 3, label: "3: Competent" },
                        { score: 4, label: "4: Superior" },
                        { score: 5, label: "5: Exemplary" },
                      ].map((lvl) => (
                        <button
                          key={lvl.score}
                          onClick={() => setTraitScores((prev) => ({ ...prev, [t.trait]: lvl.score }))}
                          style={{
                            padding: "0.45rem 0.5rem",
                            borderRadius: radii.sm,
                            border: `1px solid ${currentScore === lvl.score ? colors.indigoAction : colors.border}`,
                            backgroundColor: currentScore === lvl.score ? colors.indigoSubtle : colors.surface,
                            color: currentScore === lvl.score ? colors.indigoPrimary : colors.textSecondary,
                            fontWeight: currentScore === lvl.score ? 700 : 500,
                            fontSize: "11px",
                            cursor: "pointer",
                            transition: "background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease",
                          }}
                        >
                          {lvl.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: CONTINUOUS OKR HEATMAP & GOAL RADAR                                  */}
      {/* ========================================================================= */}
      {activeMainTab === "okr_heatmap" && (
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
                <Icons.Activity size={18} color={colors.indigoAction} />
                <h2 style={{ fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary, margin: 0 }}>
                  Continuous OKR Heatmap &amp; Velocity Radar
                </h2>
              </div>
              <p style={{ fontSize: typography.sizes.xs, color: colors.indigoPrimary, margin: "0.25rem 0 0 0" }}>
                Real-time organizational heatmap categorizing key results across 4 performance thresholds: 🚨 Critical (&lt;30%), 🛠 Off Track (30-69%), 👌 On Track (70-99%), 🚀 Exceeded (&gt;100%).
              </p>
            </div>
          </div>

          {/* Threshold Summary Stat Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
            {[
              { label: "🚀 Exceeded (>100%)", count: 4, pct: "18%", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
              { label: "👌 On Track (70-99%)", count: 12, pct: "55%", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
              { label: "🛠 Off Track (30-69%)", count: 5, pct: "23%", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
              { label: "🚨 Critical (<30%)", count: 1, pct: "4%", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  padding: "1rem",
                  borderRadius: radii.md,
                  backgroundColor: stat.bg,
                  border: `1px solid ${stat.border}`,
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700, color: stat.color, textTransform: "uppercase" }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: stat.color, marginTop: "0.25rem" }}>
                  {stat.count} <span style={{ fontSize: "12px", fontWeight: 500, color: colors.textMuted }}>({stat.pct})</span>
                </div>
              </div>
            ))}
          </div>

          {/* Departmental OKR Heatmap Grid */}
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              padding: "1.5rem",
              boxShadow: shadows.xs,
            }}
          >
            <h3 style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary, margin: "0 0 1rem 0" }}>
              Active Key Results by Department
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[
                { dept: "Cloud & Edge Engineering", okr: "Achieve sub-15ms edge latency across UK & Accra hubs", progress: 104, threshold: "🚀 Exceeded", color: "#16a34a" },
                { dept: "Healthcare Operations", okr: "Zero clinical medication errors and 98% shift handover compliance", progress: 99, threshold: "👌 On Track", color: "#2563eb" },
                { dept: "People & Culture", okr: "Close 84 missing objective submissions via Dede automated nudges", progress: 88, threshold: "👌 On Track", color: "#2563eb" },
                { dept: "Advisory & Client Delivery", okr: "Deliver 12 enterprise digital twin roadmaps for Pan-African clients", progress: 74, threshold: "👌 On Track", color: "#2563eb" },
                { dept: "Finance & Total Rewards", okr: "Automate Ghana SSNIT, GRA, and UK PAYE tax compliance filing", progress: 58, threshold: "🛠 Off Track", color: "#d97706" },
                { dept: "Commercial & Business Development", okr: "Expand West Africa FinTech client pipeline by GHS 2.5M", progress: 28, threshold: "🚨 Critical", color: "#dc2626" },
              ].map((row, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "0.85rem 1rem",
                    borderRadius: radii.md,
                    backgroundColor: colors.surfaceSubtle,
                    border: `1px solid ${colors.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ flex: 1, marginRight: "1.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted }}>{row.dept}</span>
                      <span style={{ fontSize: "11px", fontWeight: 800, color: row.color }}>{row.threshold}</span>
                    </div>
                    <div style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textPrimary }}>
                      {row.okr}
                    </div>
                  </div>

                  <div style={{ width: "160px", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ flex: 1, height: "8px", borderRadius: radii.full, backgroundColor: "#e2e8f0", overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(row.progress, 100)}%`, height: "100%", backgroundColor: row.color }} />
                    </div>
                    <span style={{ fontSize: typography.sizes.xs, fontWeight: 800, color: row.color, minWidth: "40px", textAlign: "right" }}>
                      {row.progress}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: 9-BOX SUCCESSION PLANNING & FLIGHT RISK GRID                         */}
      {/* ========================================================================= */}
      {activeMainTab === "nine_box" && (
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
                <Icons.Users size={18} color={colors.indigoAction} />
                <h2 style={{ fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary, margin: 0 }}>
                  Succession Planning 9-Box Grid &amp; Flight Risk Heatmap
                </h2>
              </div>
              <p style={{ fontSize: typography.sizes.xs, color: colors.indigoPrimary, margin: "0.25rem 0 0 0" }}>
                Cross-references actual Performance (X-Axis) against Leadership Potential (Y-Axis) to identify high-potentials (HiPo), flight risk candidates, and future C-suite successors.
              </p>
            </div>
          </div>

          {/* 9-Box Matrix Grid */}
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              padding: "1.5rem",
              boxShadow: shadows.xs,
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
              {[
                { box: "Rough Diamond", pot: "High Potential", perf: "Low Performance", staff: "1 Employee", names: ["K. Mensah (Assembly Worker)"], alert: "Needs Mentorship" },
                { box: "Future Star", pot: "High Potential", perf: "Moderate Performance", staff: "2 Employees", names: ["Clara Nukunu", "P. Mensah"], alert: "Accelerate" },
                { box: "Consistent Star (HiPo)", pot: "High Potential", perf: "High Performance", staff: "3 Employees", names: ["Emmanuel K. Quarshie", "Sarah Jenkins"], alert: "Executive Pipeline ⭐" },

                { box: "Inconsistent Performer", pot: "Medium Potential", perf: "Low Performance", staff: "0 Employees", names: [], alert: "Review" },
                { box: "Core Contributor", pot: "Medium Potential", perf: "Moderate Performance", staff: "8 Employees", names: ["Adjoa Asare", "Benedicta Agbesi"], alert: "Stable Core" },
                { box: "High Performer", pot: "Medium Potential", perf: "High Performance", staff: "4 Employees", names: ["Marcus Chen", "Julian Vance"], alert: "Reward & Retain" },

                { box: "Risk / Talent Action", pot: "Low Potential", perf: "Low Performance", staff: "1 Employee", names: ["E. Quaye"], alert: "8-Week PIP ⚠️" },
                { box: "Solid Professional", pot: "Low Potential", perf: "Moderate Performance", staff: "3 Employees", names: ["B. Appiah"], alert: "Specialist" },
                { box: "Trusted Master", pot: "Low Potential", perf: "High Performance", staff: "2 Employees", names: ["Richard Mamphey"], alert: "Flight Risk Alert 🚨" },
              ].map((q, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "1rem",
                    borderRadius: radii.md,
                    backgroundColor: q.box.includes("HiPo") ? "#f0fdf4" : q.box.includes("Risk") ? "#fef2f2" : colors.surfaceSubtle,
                    border: `1px solid ${q.box.includes("HiPo") ? "#bbf7d0" : q.box.includes("Risk") ? "#fecaca" : colors.border}`,
                    minHeight: "130px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <strong style={{ fontSize: typography.sizes.xs, color: colors.textPrimary }}>{q.box}</strong>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: colors.textMuted }}>{q.staff}</span>
                    </div>
                    <div style={{ fontSize: "10px", color: colors.textMuted, marginTop: "2px" }}>
                      {q.pot} • {q.perf}
                    </div>

                    <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                      {q.names.map((n) => (
                        <span key={n} style={{ fontSize: "10px", padding: "0.1rem 0.35rem", borderRadius: radii.sm, backgroundColor: "#ffffff", border: `1px solid ${colors.border}`, color: colors.textPrimary }}>
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: "0.5rem", fontSize: "10px", fontWeight: 700, color: q.alert.includes("HiPo") || q.alert.includes("⭐") ? "#16a34a" : q.alert.includes("🚨") || q.alert.includes("⚠️") ? "#dc2626" : colors.indigoAction }}>
                    {q.alert}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: OBJECTIVE REQUESTS (Screenshot 4)                                  */}
      {/* ========================================================================= */}
      {activeMainTab === "requests" && (
        <div>
          {/* Header & Subtitle */}
          <div style={{ marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: typography.sizes.lg, fontWeight: 800, color: colors.indigoPrimary, margin: 0 }}>
              Objective Requests
            </h2>
            <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0.25rem 0 0 0" }}>
              This is the list of all your objective requests across subsidiaries and appraisal cycles.
            </p>
          </div>

          {/* Drill-down Active Banner */}
          {requestStatusFilter !== "ALL" && (
            <div
              style={{
                marginBottom: "1rem",
                padding: "0.65rem 1rem",
                backgroundColor: "rgba(37, 99, 235, 0.08)",
                border: "1px solid rgba(37, 99, 235, 0.25)",
                borderRadius: radii.md,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.75rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: typography.sizes.xs, fontWeight: 800, color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Active Drill-Down:
                </span>
                <span style={{ fontSize: typography.sizes.xs, color: colors.textPrimary, fontWeight: 700 }}>
                  {requestStatusFilter === "NO_OBJECTIVES" && "84 Staff Members Pending Objective Formulation"}
                  {requestStatusFilter === "ACTIVE" && "9 Active Objectives (Currently in Execution)"}
                  {requestStatusFilter === "PENDING APPROVAL" && "1 Objective Awaiting Line Manager Sign-off"}
                  {requestStatusFilter === "APPROVED" && "3 Approved Objectives (Locked for Current Cycle)"}
                  {requestStatusFilter === "DECLINED" && "0 Declined Objectives (Returned for Revision)"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {requestStatusFilter === "NO_OBJECTIVES" && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setStatusMessage({ text: "Drafting reminder notifications dispatched to all 84 staff members and their line managers." });
                    }}
                    style={{ fontSize: "11px", padding: "0.3rem 0.65rem" }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <Icons.Sparkles size={12} />
                      <span>Send Bulk Reminder to All 84 Staff</span>
                    </span>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRequestStatusFilter("ALL")}
                  style={{ fontSize: "11px", padding: "0.3rem 0.65rem" }}
                >
                  Clear Filter / Show All
                </Button>
              </div>
            </div>
          )}

          {/* Card Container (Screenshot 4) */}
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              overflow: "hidden",
              boxShadow: shadows.xs,
            }}
          >
            {/* Toolbar */}
            <div
              style={{
                padding: "0.85rem 1.25rem",
                borderBottom: `1px solid ${colors.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.75rem",
                backgroundColor: colors.surfaceSubtle,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {requestStatusFilter === "NO_OBJECTIVES" ? "STAFF PENDING GOAL FORMULATION" : "REQUEST LIST"}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                {/* Search Box */}
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder={requestStatusFilter === "NO_OBJECTIVES" ? "Search pending staff, team, manager..." : "Search by owner, staff ID, role..."}
                    value={requestSearchQuery}
                    onChange={(e) => setRequestSearchQuery(e.target.value)}
                    style={{
                      padding: "0.4rem 0.75rem 0.4rem 2rem",
                      borderRadius: radii.md,
                      border: `1px solid ${colors.border}`,
                      fontSize: typography.sizes.xs,
                      width: "240px",
                      backgroundColor: colors.surface,
                    }}
                  />
                  <div style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: colors.textMuted }}>
                    <Icons.Search size={13} />
                  </div>
                </div>

                {/* Filter Selector */}
                <select
                  value={requestStatusFilter}
                  onChange={(e) => setRequestStatusFilter(e.target.value)}
                  style={{
                    padding: "0.4rem 0.65rem",
                    borderRadius: radii.md,
                    border: `1px solid ${colors.border}`,
                    fontSize: typography.sizes.xs,
                    backgroundColor: colors.surface,
                    color: colors.textSecondary,
                  }}
                >
                  <option value="ALL">All Requests ({objectiveRequests.length})</option>
                  <option value="NO_OBJECTIVES">No Objectives (84 Staff Pending)</option>
                  <option value="ACTIVE">Active Objectives (9)</option>
                  <option value="PENDING APPROVAL">Pending Approval (1)</option>
                  <option value="APPROVED">Approved (3)</option>
                  <option value="UNDETERMINED">Undetermined (6)</option>
                  <option value="DECLINED">Declined (0)</option>
                </select>

                {/* Export Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (requestStatusFilter === "NO_OBJECTIVES") {
                      const csv = "NO,NAME,STAFF_ID,ROLE,DEPARTMENT,TEAM_SQUAD,LINE_MANAGER,DAYS_OVERDUE,CYCLE\n" +
                        pendingGoalStaffList.map((s, idx) => `${idx + 1},"${s.name}","${s.staffId}","${s.role}","${s.department}","${s.team}","${s.manager}",${s.daysOverdue},"${s.cycle}"`).join("\n");
                      const blob = new Blob([csv], { type: "text/csv" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `scoreview_staff_pending_goals_${new Date().toISOString().slice(0, 10)}.csv`;
                      a.click();
                      return;
                    }
                    const csv = "NO,OWNER,STAFF_ID,ROLE,TYPE,STATUS,SUBSIDIARY,CYCLE,DATE\n" +
                      objectiveRequests.map((r) => `${r.requestNo},"${r.ownerName}","${r.ownerStaffId}","${r.ownerRole}",${r.objectiveType},${r.status},"${r.subsidiary}","${r.appraisalCycle}",${r.date}`).join("\n");
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `scoreview_objective_requests_${new Date().toISOString().slice(0, 10)}.csv`;
                    a.click();
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <Icons.Download size={13} />
                    <span>Export</span>
                  </span>
                </Button>

                {/* Pagination indicator */}
                <div style={{ fontSize: "11px", color: colors.textMuted, marginLeft: "0.5rem" }}>
                  {requestStatusFilter === "NO_OBJECTIVES"
                    ? `Showing ${filteredPendingGoalStaff.length} of 84 Staff Pending`
                    : `Showing 1 to ${filteredObjectiveRequests.length} of ${objectiveRequests.length}`}
                </div>
              </div>
            </div>

            {/* Table View */}
            {requestStatusFilter === "NO_OBJECTIVES" ? (
              <div style={{ maxHeight: "560px", overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
                  <thead>
                    <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left", position: "sticky", top: 0, zIndex: 1 }}>
                      <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700, width: "40px" }}>NO</th>
                      <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>STAFF MEMBER</th>
                      <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>ROLE &amp; DEPARTMENT</th>
                      <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>ASSIGNED TEAM / SQUAD</th>
                      <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>LINE MANAGER</th>
                      <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>CYCLE</th>
                      <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>STATUS</th>
                      <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700, textAlign: "right" }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPendingGoalStaff.map((staff, idx) => {
                      const isNudged = !!nudgedStaffIds[staff.staffId];
                      return (
                        <tr
                          key={staff.id}
                          style={{
                            borderBottom: `1px solid ${colors.borderSubtle}`,
                            transition: "background-color 0.1s ease",
                          }}
                        >
                          <td style={{ padding: "0.75rem 0.85rem", color: colors.textMuted, fontWeight: 600 }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: "0.75rem 0.85rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                              <div
                                style={{
                                  width: "30px",
                                  height: "30px",
                                  borderRadius: "50%",
                                  backgroundColor: staff.avatarColor,
                                  color: colors.surface,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontWeight: 700,
                                  fontSize: "11px",
                                  flexShrink: 0,
                                }}
                              >
                                {staff.name.split(" ").map((n) => n[0]).join("")}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: colors.textPrimary }}>
                                  {staff.name}
                                </div>
                                <div style={{ fontSize: "11px", color: colors.textMuted, fontFamily: typography.fontMono }}>
                                  {staff.staffId}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "0.75rem 0.85rem" }}>
                            <div style={{ fontWeight: 600, color: colors.textPrimary }}>
                              {staff.role}
                            </div>
                            <div style={{ fontSize: "11px", color: colors.textSecondary }}>
                              {staff.department}
                            </div>
                          </td>
                          <td style={{ padding: "0.75rem 0.85rem" }}>
                            <span
                              style={{
                                fontSize: "11px",
                                padding: "0.2rem 0.5rem",
                                borderRadius: radii.sm,
                                backgroundColor: "rgba(99, 102, 241, 0.08)",
                                color: colors.indigoPrimary,
                                fontWeight: 600,
                                border: "1px solid rgba(99, 102, 241, 0.2)",
                              }}
                            >
                              {staff.team}
                            </span>
                          </td>
                          <td style={{ padding: "0.75rem 0.85rem", color: colors.textPrimary, fontWeight: 500 }}>
                            {staff.manager}
                          </td>
                          <td style={{ padding: "0.75rem 0.85rem", color: colors.textSecondary }}>
                            {staff.cycle}
                          </td>
                          <td style={{ padding: "0.75rem 0.85rem" }}>
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                padding: "0.2rem 0.55rem",
                                borderRadius: radii.full,
                                backgroundColor: "rgba(239, 68, 68, 0.12)",
                                color: "#b91c1c",
                                display: "inline-block",
                              }}
                            >
                              Overdue ({staff.daysOverdue}d)
                            </span>
                          </td>
                          <td style={{ padding: "0.75rem 0.85rem", textAlign: "right", whiteSpace: "nowrap" }}>
                            <Button
                              variant={isNudged ? "outline" : "primary"}
                              size="sm"
                              onClick={() => {
                                setNudgedStaffIds((prev) => ({ ...prev, [staff.staffId]: true }));
                                setStatusMessage({ text: `Nudge notification sent to ${staff.name} and CC'd to ${staff.manager}.` });
                              }}
                              style={{ padding: "0.25rem 0.55rem", fontSize: "11px" }}
                            >
                              {isNudged ? "✓ Nudged" : "Send Nudge"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : filteredObjectiveRequests.length === 0 ? (
              <div style={{ padding: "3rem 2rem", textAlign: "center" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: colors.surfaceSubtle, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem auto", color: colors.textMuted }}>
                  <Icons.ShieldCheck size={24} />
                </div>
                <h4 style={{ margin: 0, fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                  {requestStatusFilter === "DECLINED" ? "No Declined Objectives in Current Cycle" : "No Objective Requests Found"}
                </h4>
                <p style={{ margin: "0.4rem 0 1rem 0", fontSize: typography.sizes.xs, color: colors.textMuted, maxWidth: "420px", marginLeft: "auto", marginRight: "auto" }}>
                  {requestStatusFilter === "DECLINED"
                    ? "Zero objectives have been returned for revision. All 9 active employee scorecards comply with single-framework standards."
                    : "No objective records matched your search query or status filter."}
                </p>
                <Button size="sm" variant="outline" onClick={() => { setRequestStatusFilter("ALL"); setRequestSearchQuery(""); }}>
                  Reset Filters &amp; View All Requests
                </Button>
              </div>
            ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
              <thead>
                <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                  <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700, width: "40px" }}>NO</th>
                  <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>OWNER</th>
                  <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>OBJECTIVE TYPE</th>
                  <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>OBJECTIVE REQUESTS STATUS</th>
                  <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>SUBSIDIARY</th>
                  <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>APPRAISAL CYCLE</th>
                  <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>DATE</th>
                  <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700, textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredObjectiveRequests.map((req) => (
                  <tr
                    key={req.id}
                    style={{
                      borderBottom: `1px solid ${colors.borderSubtle}`,
                      transition: "background-color 0.1s ease",
                    }}
                  >
                    <td style={{ padding: "0.75rem 0.85rem", color: colors.textMuted, fontWeight: 600 }}>
                      {req.requestNo}
                    </td>

                    {/* OWNER Cell (Screenshot 4) */}
                    <td style={{ padding: "0.75rem 0.85rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            backgroundColor: req.ownerAvatarColor,
                            color: colors.surface,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "11px",
                            flexShrink: 0,
                          }}
                        >
                          {req.ownerName.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: colors.textPrimary }}>
                            {req.ownerName}
                          </div>
                          <div style={{ fontSize: "11px", color: colors.textMuted, fontFamily: typography.fontMono }}>
                            {req.ownerStaffId}
                          </div>
                          <div style={{ fontSize: "11px", color: colors.textSecondary }}>
                            {req.ownerRole}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* OBJECTIVE TYPE */}
                    <td style={{ padding: "0.75rem 0.85rem" }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "11px",
                          padding: "0.2rem 0.5rem",
                          borderRadius: radii.sm,
                          backgroundColor: req.objectiveType === "BSC" ? "rgba(99, 102, 241, 0.1)" : "rgba(16, 185, 129, 0.1)",
                          color: req.objectiveType === "BSC" ? colors.indigoPrimary : colors.emeraldDark,
                        }}
                      >
                        {req.objectiveType}
                      </span>
                    </td>

                    {/* OBJECTIVE REQUESTS STATUS (Pill styles from Screenshot 4) */}
                    <td style={{ padding: "0.75rem 0.85rem" }}>
                      {req.status === "APPROVED" && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "0.25rem 0.7rem",
                            borderRadius: radii.full,
                            backgroundColor: "rgba(16, 185, 129, 0.15)",
                            color: "#059669",
                            display: "inline-block",
                            letterSpacing: "0.04em",
                          }}
                        >
                          APPROVED
                        </span>
                      )}
                      {req.status === "UNDETERMINED" && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "0.25rem 0.7rem",
                            borderRadius: radii.full,
                            backgroundColor: "rgba(168, 85, 247, 0.15)",
                            color: "#7e22ce",
                            display: "inline-block",
                            letterSpacing: "0.04em",
                          }}
                        >
                          UNDETERMINED
                        </span>
                      )}
                      {req.status === "PENDING APPROVAL" && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "0.25rem 0.7rem",
                            borderRadius: radii.full,
                            backgroundColor: "rgba(249, 115, 22, 0.15)",
                            color: "#c2410c",
                            display: "inline-block",
                            letterSpacing: "0.04em",
                          }}
                        >
                          PENDING APPROVAL
                        </span>
                      )}
                      {req.status === "DECLINED" && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "0.25rem 0.7rem",
                            borderRadius: radii.full,
                            backgroundColor: "rgba(239, 68, 68, 0.15)",
                            color: "#b91c1c",
                            display: "inline-block",
                            letterSpacing: "0.04em",
                          }}
                        >
                          DECLINED
                        </span>
                      )}
                    </td>

                    {/* SUBSIDIARY */}
                    <td style={{ padding: "0.75rem 0.85rem", color: colors.textSecondary }}>
                      {req.subsidiary}
                    </td>

                    {/* APPRAISAL CYCLE */}
                    <td style={{ padding: "0.75rem 0.85rem", color: colors.textPrimary, fontWeight: 500 }}>
                      {req.appraisalCycle}
                    </td>

                    {/* DATE (Clean formatted date) */}
                    <td style={{ padding: "0.75rem 0.85rem", color: colors.textSecondary, whiteSpace: "nowrap" }}>
                      {formatDate(req.date)}
                    </td>

                    {/* ACTIONS */}
                    <td style={{ padding: "0.75rem 0.85rem", textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: "0.35rem", justifyContent: "flex-end" }}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRequestForDetail(req)}
                          style={{ padding: "0.25rem 0.5rem", fontSize: "11px" }}
                        >
                          Inspect
                        </Button>
                        {req.status !== "APPROVED" && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleApproveRequest(req.id)}
                            style={{ padding: "0.25rem 0.5rem", fontSize: "11px", backgroundColor: colors.emeraldDark, borderColor: colors.emeraldDark }}
                          >
                            Approve
                          </Button>
                        )}
                        {req.status !== "DECLINED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeclineRequest(req.id)}
                            style={{ padding: "0.25rem 0.5rem", fontSize: "11px", color: colors.error }}
                          >
                            Decline
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {activeMainTab === "bulk_actions" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <span style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.indigoAction, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Operational Automation
                </span>
                
              </div>
              <h2 style={{ fontSize: typography.sizes.lg, fontWeight: 800, color: colors.indigoPrimary, margin: 0 }}>
                Bulk Actions & Mass Management
              </h2>
              <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0.25rem 0 0 0" }}>
                Accelerate appraisal operations: bulk objective cascading, mass spreadsheet score uploads, automated reminder nudges, and cycle freezes.
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setStatusMessage({ text: "Dede AI dispatched 38 nudges to line managers via Slack & email." });
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <Icons.Sparkles size={14} />
                  <span>Dispatch Dede Nudges</span>
                </span>
              </Button>
            </div>
          </div>

          {/* 4 Bulk Operation Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem", marginBottom: "1.5rem" }}>
            {/* Card 1: Bulk Assign Objectives */}
            <div
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                border: `1px solid ${colors.border}`,
                padding: "1.5rem",
                boxShadow: shadows.xs,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: radii.md, backgroundColor: "rgba(99, 102, 241, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: colors.indigoPrimary }}>
                    <Icons.Target size={16} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                    Bulk Objective Cascading
                  </h3>
                </div>
                <p style={{ margin: "0 0 1rem 0", fontSize: typography.sizes.xs, color: colors.textSecondary, lineHeight: 1.5 }}>
                  Mass assign corporate or departmental goals to all {objectiveMetrics.noObjectives} employees currently with zero objectives.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: colors.textMuted, marginBottom: "0.25rem" }}>
                      TARGET SUBSIDIARY / DIVISION
                    </label>
                    <select
                      style={{ width: "100%", padding: "0.45rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs, backgroundColor: colors.surfaceSubtle }}
                    >
                      <option value="ALL">All Subsidiaries (Ghana, UK & Regional Subsidiaries)</option>
                      <option value="GH">Ghana Subsidiary Only</option>
                      <option value="UK">Senrab ConsulTech UK Only</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: colors.textMuted, marginBottom: "0.25rem" }}>
                      STRATEGIC OBJECTIVE TEMPLATE
                    </label>
                    <select
                      style={{ width: "100%", padding: "0.45rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs, backgroundColor: colors.surfaceSubtle }}
                    >
                      <option value="BSC_FIN">BSC: Revenue Retention & Advisory CSAT (Weight: 25%)</option>
                      <option value="OKR_EDGE">OKR: Zero Latency Cloudflare Edge Reliability (Weight: 30%)</option>
                      <option value="BSC_OPS">BSC: ISO 27001 & SOC2 Compliance Certification (Weight: 20%)</option>
                    </select>
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setStatusMessage({ text: `Successfully cascaded strategic objective to 84 employees in ${selectedAppraisalCycle}.` });
                }}
              >
                Assign to 84 Staff Without Objectives
              </Button>
            </div>

            {/* Card 2: Bulk Score & Rating Upload */}
            <div
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                border: `1px solid ${colors.border}`,
                padding: "1.5rem",
                boxShadow: shadows.xs,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: radii.md, backgroundColor: "rgba(16, 185, 129, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: colors.emeraldDark }}>
                    <Icons.FileCheck size={16} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                    Score & Appraisal Upload
                  </h3>
                </div>
                <p style={{ margin: "0 0 1rem 0", fontSize: typography.sizes.xs, color: colors.textSecondary, lineHeight: 1.5 }}>
                  Import external spreadsheet ratings (CSV / Excel) directly into active cycle scores with single-framework mathematical validation.
                </p>

                <div
                  style={{
                    border: `2px dashed ${colors.border}`,
                    borderRadius: radii.md,
                    padding: "1.25rem",
                    textAlign: "center",
                    backgroundColor: colors.surfaceSubtle,
                    marginBottom: "1rem",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setStatusMessage({ text: "Spreadsheet template parsed. 91 employee appraisal rows validated with 0 errors." });
                  }}
                >
                  <Icons.Plus size={20} color={colors.textMuted} />
                  <div style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textPrimary, marginTop: "0.35rem" }}>
                    Drop CSV here or Browse
                  </div>
                  <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "2px" }}>
                    Columns: staff_id, cycle, self_score, manager_score, comments
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <a
                  href="#download-template"
                  onClick={(e) => {
                    e.preventDefault();
                    setStatusMessage({ text: "Downloaded 'Score_Upload_Template.csv'." });
                  }}
                  style={{ fontSize: "11px", color: colors.brandBlue, fontWeight: 600, textDecoration: "underline" }}
                >
                  Download CSV Template
                </a>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatusMessage({ text: "Scores for 91 employees uploaded and calibrated." });
                  }}
                >
                  Process Upload
                </Button>
              </div>
            </div>

            {/* Card 3: Mass Approval of Objectives */}
            <div
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                border: `1px solid ${colors.border}`,
                padding: "1.5rem",
                boxShadow: shadows.xs,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: radii.md, backgroundColor: "rgba(249, 115, 22, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#c2410c" }}>
                    <Icons.Check size={16} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                    Mass Request Approval
                  </h3>
                </div>
                <p style={{ margin: "0 0 1rem 0", fontSize: typography.sizes.xs, color: colors.textSecondary, lineHeight: 1.5 }}>
                  Approve all pending objective requests across departments after leadership calibration.
                </p>

                <div style={{ padding: "0.75rem", borderRadius: radii.md, backgroundColor: colors.surfaceSubtle, border: `1px solid ${colors.borderSubtle}`, marginBottom: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: typography.sizes.xs, marginBottom: "0.25rem" }}>
                    <span style={{ color: colors.textSecondary }}>Pending Signoff:</span>
                    <strong style={{ color: colors.textPrimary }}>{objectiveRequests.filter((r) => r.status === "PENDING APPROVAL" || r.status === "UNDETERMINED").length} Requests</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: typography.sizes.xs }}>
                    <span style={{ color: colors.textSecondary }}>Cycle:</span>
                    <strong style={{ color: colors.brandBlue }}>{selectedAppraisalCycle}</strong>
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setObjectiveRequests((prev) => prev.map((r) => ({ ...r, status: "APPROVED" })));
                  setStatusMessage({ text: "All outstanding objective requests bulk approved." });
                }}
                style={{ backgroundColor: colors.emeraldDark, borderColor: colors.emeraldDark }}
              >
                Approve All Pending ({objectiveRequests.filter((r) => r.status !== "APPROVED").length})
              </Button>
            </div>

            {/* Card 4: Freeze & Lock Objectives */}
            <div
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                border: `1px solid ${colors.border}`,
                padding: "1.5rem",
                boxShadow: shadows.xs,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: radii.md, backgroundColor: "rgba(239, 68, 68, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#b91c1c" }}>
                    <Icons.Lock size={16} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                    Cycle Freeze & Goal Lock
                  </h3>
                </div>
                <p style={{ margin: "0 0 1rem 0", fontSize: typography.sizes.xs, color: colors.textSecondary, lineHeight: 1.5 }}>
                  Lock all objective weights and targets to prohibit retrospective goal alterations during mid-year or annual reviews.
                </p>

                <div style={{ padding: "0.75rem", borderRadius: radii.md, backgroundColor: "rgba(239, 68, 68, 0.05)", border: `1px solid rgba(239, 68, 68, 0.2)`, marginBottom: "1rem" }}>
                  <div style={{ fontSize: "11px", color: "#b91c1c", fontWeight: 600 }}>
                    ⚠️ Once locked, amendments require HR Director & Managing Principal cryptographic override.
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusMessage({ text: `Cycle '${selectedAppraisalCycle}' locked. All 91 employee scorecards frozen for formal evaluation.` });
                }}
                style={{ color: "#b91c1c", borderColor: "#fca5a5" }}
              >
                Lock Current Cycle Objectives
              </Button>
            </div>
          </div>
        </div>
      )}

      

      {/* ========================================================================= */}
      {/* TAB 3: OBJECTIVES SETUP (Screenshot 5)                                     */}
      {/* ========================================================================= */}
      {activeMainTab === "objectives_setup" && (
        <div>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h2 style={{ fontSize: typography.sizes.lg, fontWeight: 800, color: colors.indigoPrimary, margin: 0 }}>
                Objectives Setup & Alignment Hierarchy
              </h2>
              <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0.25rem 0 0 0" }}>
                Establish strategic cascading goals from Corporate Vision through Division, Department, down to Individual Contributors.
              </p>
            </div>
            <Button variant="primary" size="sm">
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Icons.Plus size={14} />
                <span>Create Strategic Objective</span>
              </span>
            </Button>
          </div>

          {/* Expanded Sub-navigation matching Screenshot 5 */}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              padding: "0.75rem 1rem",
              borderRadius: radii.lg,
              backgroundColor: colors.surfaceSubtle,
              border: `1px solid ${colors.border}`,
              marginBottom: "1.5rem",
              overflowX: "auto",
            }}
          >
            {[
              "Company",
              "Division",
              "Departments",
              "Employee",
              "Objective Bulk Upload",
              "Objective Backlog",
            ].map((subTab) => {
              const isSelected = objectivesSetupTab === subTab;
              return (
                <button
                  key={subTab}
                  onClick={() => setObjectivesSetupTab(subTab as typeof objectivesSetupTab)}
                  style={{
                    padding: "0.45rem 1rem",
                    borderRadius: radii.md,
                    border: "none",
                    backgroundColor: isSelected ? colors.indigoPrimary : "transparent",
                    color: isSelected ? colors.surface : colors.textPrimary,
                    fontSize: typography.sizes.xs,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
                  }}
                >
                  {subTab}
                </button>
              );
            })}
          </div>

          {/* Bulk Upload Sub-view */}
          {objectivesSetupTab === "Objective Bulk Upload" && (
            <div
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                border: `2px dashed ${colors.border}`,
                padding: "2.5rem 2rem",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  backgroundColor: colors.indigoSubtle,
                  color: colors.indigoPrimary,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem auto",
                }}
              >
                <Icons.FileText size={28} />
              </div>
              <h3 style={{ margin: "0 0 0.5rem 0", fontSize: typography.sizes.base, fontWeight: 700, color: colors.textPrimary }}>
                Bulk Upload Objectives Spreadsheet (.xlsx, .csv)
              </h3>
              <p style={{ margin: "0 0 1.25rem 0", fontSize: typography.sizes.xs, color: colors.textMuted, maxWidth: "480px", marginInline: "auto" }}>
                Upload mass department or employee objectives directly. Dede AI will parse framework codes (BSC/OKR), validate metric weights, and ensure 100% mathematical framework compliance.
              </p>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
                <Button variant="outline" size="sm">
                  Download Sample CSV Template
                </Button>
                <Button variant="primary" size="sm">
                  Choose File & Upload
                </Button>
              </div>
            </div>
          )}

          {/* Objective Backlog Sub-view */}
          {objectivesSetupTab === "Objective Backlog" && (
            <div
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                border: `1px solid ${colors.border}`,
                padding: "1.5rem",
              }}
            >
              <h3 style={{ margin: "0 0 0.5rem 0", fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                Pre-Approved Corporate Goal Library & Metric Repository
              </h3>
              <p style={{ margin: "0 0 1rem 0", fontSize: typography.sizes.xs, color: colors.textMuted }}>
                Standardized measurable KPIs ready for line managers and employees to clone during cycle initiation.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                {[
                  { category: "Financial (BSC)", title: "Reduce Third-Party Contractor Spend by > 18%", metric: "Variance in GHS", defaultWeight: 25 },
                  { category: "Customer (BSC)", title: "Sustain P99 Helpdesk Resolution SLA < 4 Hours", metric: "First-Touch Resolution Rate", defaultWeight: 25 },
                  { category: "Internal Process (BSC)", title: "Achieve 100% Zero-Touch Hardware & Identity Deprovisioning", metric: "Deprovision Audit Hours", defaultWeight: 25 },
                  { category: "Engineering (OKR)", title: "Zero Server Cold Starts via Cloudflare Workers & Neon Hyperdrive", metric: "P95 TTFB < 20ms", defaultWeight: 30 },
                ].map((item, idx) => (
                  <div key={idx} style={{ padding: "1rem", borderRadius: radii.md, border: `1px solid ${colors.borderSubtle}`, backgroundColor: colors.surfaceSubtle }}>
                    <Badge variant="info" size="sm">{item.category}</Badge>
                    <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary, marginTop: "0.4rem" }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "2px" }}>
                      Metric: {item.metric} • Default Weight: {item.defaultWeight}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hierarchy Objectives List (Company, Division, Departments, Employee) */}
          {(objectivesSetupTab === "Company" || objectivesSetupTab === "Division" || objectivesSetupTab === "Departments" || objectivesSetupTab === "Employee") && (
            <div
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                border: `1px solid ${colors.border}`,
                overflow: "hidden",
                boxShadow: shadows.xs,
              }}
            >
              <div style={{ padding: "0.85rem 1.25rem", borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.surfaceSubtle, fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary }}>
                {objectivesSetupTab.toUpperCase()} OBJECTIVES MATRIX ({cascadingObjectives.filter((o) => o.level === objectivesSetupTab).length} Active)
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {cascadingObjectives
                  .filter((o) => o.level === objectivesSetupTab)
                  .map((obj) => (
                    <div
                      key={obj.id}
                      style={{
                        padding: "1.25rem",
                        borderBottom: `1px solid ${colors.borderSubtle}`,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "1.5rem",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                          <Badge variant={obj.framework === "BSC" ? "bsc" : "okr"} size="sm">
                            {obj.framework}
                          </Badge>
                          <span style={{ fontSize: "11px", color: colors.textMuted }}>
                            Owner: <strong>{obj.lead}</strong>
                          </span>
                          {obj.alignedToParent && (
                            <span style={{ fontSize: "11px", color: colors.brandBlue, backgroundColor: "rgba(37, 99, 235, 0.08)", padding: "0.1rem 0.4rem", borderRadius: radii.sm }}>
                              Cascaded from: {obj.alignedToParent}
                            </span>
                          )}
                        </div>
                        <h4 style={{ margin: "0 0 0.5rem 0", fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                          {obj.title}
                        </h4>
                        <div style={{ display: "flex", gap: "1rem", fontSize: "11px", color: colors.textMuted }}>
                          <span>Target Date: <strong>{formatDate(obj.targetDate)}</strong></span>
                          <span>Allocation Weight: <strong>{obj.weight}%</strong></span>
                        </div>
                      </div>

                      <div style={{ width: "160px", textAlign: "right" }}>
                        <div style={{ fontSize: typography.sizes.sm, fontWeight: 800, color: colors.emeraldDark, marginBottom: "4px" }}>
                          {obj.progressPct}% Progress
                        </div>
                        <div style={{ height: "6px", width: "100%", backgroundColor: colors.borderSubtle, borderRadius: radii.full, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${obj.progressPct}%`, backgroundColor: colors.emeraldDark, borderRadius: radii.full }} />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: 1-ON-1 PROGRESS CHECK-INS (Continuous Touchpoints)                 */}
      {/* ========================================================================= */}
      {activeMainTab === "checkins" && (
        <div>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h2 style={{ fontSize: typography.sizes.lg, fontWeight: 800, color: colors.indigoPrimary, margin: 0 }}>
                Bilateral 1-on-1 Performance Check-ins
              </h2>
              <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0.25rem 0 0 0" }}>
                Continuous check-ins between supervisors and team members. Progress updates, blockers, and bilateral feedback logged without waiting for annual cycle close.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowNewCheckInModal(true)}
              style={{ backgroundColor: colors.emeraldDark, borderColor: colors.emeraldDark }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Icons.Plus size={14} />
                <span>Log 1-on-1 Check-in</span>
              </span>
            </Button>
          </div>

          {/* Check-ins Top Metric Tiles (Vibrant Colors) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
            <div
              style={{
                background: "linear-gradient(180deg, rgba(99, 102, 241, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                borderTop: `3px solid ${colors.indigoAction}`,
                borderRadius: radii.md,
                padding: "1.1rem 1.25rem",
                boxShadow: shadows.xs,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: colors.indigoPrimary, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Active 1-on-1 Touchpoints
                </span>
                <Badge variant="info" size="sm">Scheduled</Badge>
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: colors.indigoPrimary, fontVariantNumeric: "tabular-nums" }}>
                {checkIns.length} Active
              </div>
              <div style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: "0.25rem" }}>
                Across Accra Hub & London Leadership
              </div>
            </div>

            <div
              style={{
                background: "linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderTop: "3px solid #10b981",
                borderRadius: radii.md,
                padding: "1.1rem 1.25rem",
                boxShadow: shadows.xs,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#065f46", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  On-Track Velocity
                </span>
                <Badge variant="success" size="sm">Healthy</Badge>
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#065f46", fontVariantNumeric: "tabular-nums" }}>
                79.8% Avg
              </div>
              <div style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: "0.25rem" }}>
                3 of 4 objectives trending on-time
              </div>
            </div>

            <div
              style={{
                background: "linear-gradient(180deg, rgba(249, 115, 22, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)",
                border: "1px solid rgba(249, 115, 22, 0.3)",
                borderTop: "3px solid #f97316",
                borderRadius: radii.md,
                padding: "1.1rem 1.25rem",
                boxShadow: shadows.xs,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#9a3412", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Blockers Flagged
                </span>
                <Badge variant="warning" size="sm">Attention</Badge>
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#9a3412", fontVariantNumeric: "tabular-nums" }}>
                1 Item
              </div>
              <div style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: "0.25rem" }}>
                Lagos GC legal review turnaround
              </div>
            </div>

            <div
              style={{
                background: "linear-gradient(180deg, rgba(236, 72, 153, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)",
                border: "1px solid rgba(236, 72, 153, 0.3)",
                borderTop: "3px solid #ec4899",
                borderRadius: radii.md,
                padding: "1.1rem 1.25rem",
                boxShadow: shadows.xs,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#9d174d", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Next Touchpoint
                </span>
                <Badge variant="info" size="sm">Scheduled</Badge>
              </div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#9d174d" }}>
                {formatDate("2026-11-08")}
              </div>
              <div style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: "0.25rem" }}>
                Julian Vance ↔ Richard Barnes
              </div>
            </div>
          </div>

          {/* Check-ins Roster Table */}
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              overflow: "hidden",
              boxShadow: shadows.xs,
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
              <thead>
                <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>PARTICIPANTS</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>KEY OBJECTIVE / KR</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>PROGRESS</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>CADENCE</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>LAST CHECK-IN</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>NEXT SCHEDULED</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>STATUS</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textAlign: "right" }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {checkIns.map((ci) => (
                  <tr
                    key={ci.id}
                    style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}
                  >
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ fontWeight: 700, color: colors.textPrimary }}>
                        {ci.employeeName}
                      </div>
                      <div style={{ fontSize: "11px", color: colors.textMuted }}>
                        Lead: {ci.supervisorName}
                      </div>
                    </td>

                    <td style={{ padding: "0.85rem 1rem", maxWidth: "260px" }}>
                      <div style={{ fontWeight: 600, color: colors.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {ci.goalTitle}
                      </div>
                      <span style={{ fontSize: "10px", color: colors.indigoAction, fontWeight: 600 }}>
                        [{ci.framework}] {ci.cycleTitle}
                      </span>
                    </td>

                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ width: "80px", height: "6px", backgroundColor: colors.borderSubtle, borderRadius: radii.full, overflow: "hidden" }}>
                          <div style={{ width: `${ci.currentProgressPct}%`, height: "100%", backgroundColor: ci.currentProgressPct >= 80 ? "#10b981" : ci.currentProgressPct >= 50 ? colors.brandBlue : "#f59e0b" }} />
                        </div>
                        <span style={{ fontWeight: 700, color: colors.textPrimary }}>
                          {ci.currentProgressPct}%
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: "0.85rem 1rem", color: colors.textSecondary }}>
                      {ci.cadence}
                    </td>

                    <td style={{ padding: "0.85rem 1rem", color: colors.textSecondary }}>
                      {formatDate(ci.lastCheckInDate)}
                    </td>

                    <td style={{ padding: "0.85rem 1rem", color: colors.textPrimary, fontWeight: 600 }}>
                      {formatDate(ci.nextScheduledDate)}
                    </td>

                    <td style={{ padding: "0.85rem 1rem" }}>
                      <Badge
                        variant={
                          ci.status === "COMPLETED"
                            ? "success"
                            : ci.status === "ON_TRACK"
                            ? "info"
                            : ci.status === "NEEDS_ATTENTION"
                            ? "warning"
                            : "error"
                        }
                        size="sm"
                      >
                        {ci.status.replace("_", " ")}
                      </Badge>
                    </td>

                    <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCheckInForDetails(ci)}
                      >
                        Details →
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      

      

      {/* ========================================================================= */}
      {/* TAB 5: FORMAL APPRAISAL CYCLES                                            */}
      {/* ========================================================================= */}
      {activeMainTab === "cycles" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h2 style={{ fontSize: typography.sizes.lg, fontWeight: 800, color: colors.indigoPrimary, margin: 0 }}>
                Formal Appraisal Cycles
              </h2>
              <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0.25rem 0 0 0" }}>
                Enforces strict single-framework mathematical purity. Cycles cannot mix OKR and Balanced Scorecard scoring models.
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setShowNewCycleModal(true)}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Icons.Plus size={14} />
                <span>Launch Cycle</span>
              </span>
            </Button>
          </div>

          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              overflow: "hidden",
              boxShadow: shadows.xs,
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
              <thead>
                <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>CYCLE TITLE</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>FRAMEWORK (SINGLE-FRAMEWORK)</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>PERIOD</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>STATUS</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {cycles.map((c) => (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ fontWeight: 700, color: colors.textPrimary }}>{c.title}</div>
                      <div style={{ fontSize: "11px", color: colors.textMuted }}>{c.description}</div>
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <Badge variant="bsc" size="sm">
                        {c.framework_code || "OKR"} Pure
                      </Badge>
                    </td>
                    <td style={{ padding: "0.85rem 1rem", color: colors.textSecondary }}>
                      {formatDateRange(c.start_date, c.end_date)}
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <Badge variant={c.status === "ACTIVE" ? "success" : "neutral"} size="sm">
                        {c.status}
                      </Badge>
                    </td>
                    <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCycleForReview(c)}
                      >
                        Assessments & Calibration →
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      

      

      {/* ========================================================================= */}
      {/* TAB 6: APPRAISALS & CALIBRATION                                           */}
      {/* ========================================================================= */}
      {activeMainTab === "appraisals" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h2 style={{ fontSize: typography.sizes.lg, fontWeight: 800, color: colors.indigoPrimary, margin: 0 }}>
                Appraisal Calibration & Evaluation Queue
              </h2>
              <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0.25rem 0 0 0" }}>
                Review self-assessments, calibrate manager scoring, and finalize cycle ratings across departments.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEvaluations((prev) => prev.map((e) => ({ ...e, status: "CALIBRATED" })));
                setStatusMessage({ text: "All outstanding evaluations calibrated and locked." });
              }}
            >
              Calibrate All ({evaluations.filter((e) => e.status !== "CALIBRATED").length} Pending)
            </Button>
          </div>

          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              overflow: "hidden",
              boxShadow: shadows.xs,
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
              <thead>
                <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>EMPLOYEE</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>DEPARTMENT</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>SELF RATING</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>MANAGER RATING</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>FEEDBACK</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700 }}>STATUS</th>
                  <th style={{ padding: "0.75rem 1rem", color: colors.textMuted, fontWeight: 700, textAlign: "right" }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map((ev) => (
                  <tr key={ev.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ fontWeight: 700, color: colors.textPrimary }}>{ev.name}</div>
                      <div style={{ fontSize: "11px", color: colors.textMuted }}>{ev.role}</div>
                    </td>
                    <td style={{ padding: "0.85rem 1rem", color: colors.textSecondary }}>{ev.department}</td>
                    <td style={{ padding: "0.85rem 1rem", fontWeight: 700, color: colors.brandBlue }}>
                      {ev.selfRating} / 5.0
                    </td>
                    <td style={{ padding: "0.85rem 1rem", fontWeight: 700, color: colors.emeraldDark }}>
                      {ev.managerRating} / 5.0
                    </td>
                    <td style={{ padding: "0.85rem 1rem", color: colors.textSecondary, fontStyle: "italic", maxWidth: "240px" }}>
                      &ldquo;{ev.feedback}&rdquo;
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <Badge variant={ev.status === "CALIBRATED" ? "success" : "warning"} size="sm">
                        {ev.status === "CALIBRATED" ? "Calibrated ✓" : "Pending Signoff"}
                      </Badge>
                    </td>
                    <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                      {ev.status !== "CALIBRATED" && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setEvaluations((prev) =>
                              prev.map((item) => (item.id === ev.id ? { ...item, status: "CALIBRATED" } : item))
                            );
                            setStatusMessage({ text: `Calibrated rating finalized for ${ev.name}.` });
                          }}
                        >
                          Calibrate
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      

      {/* ========================================================================= */}
      {/* TAB 7: PERFORMANCE INSIGHTS & 9-BOX TALENT MATRIX                          */}
      {/* ========================================================================= */}
      {activeMainTab === "insights" && (
        <div>
          <div style={{ marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: typography.sizes.lg, fontWeight: 800, color: colors.indigoPrimary, margin: 0 }}>
              Performance Insights & 9-Box Talent Matrix
            </h2>
            <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, margin: "0.25rem 0 0 0" }}>
              Evaluate performance vs potential across your entire workforce to guide succession planning and leadership development.
            </p>
          </div>

          {/* 9-Box Grid */}
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              padding: "1.5rem",
              marginBottom: "1.5rem",
              boxShadow: shadows.xs,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                Organization 9-Box Matrix (Q1 Calibrated)
              </h3>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
              {/* Box 1: High Potential, Low Performance */}
              <div style={{ padding: "1rem", borderRadius: radii.md, border: `1px solid ${colors.borderSubtle}`, backgroundColor: "rgba(249, 115, 22, 0.05)" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#c2410c", textTransform: "uppercase" }}>Enigma (High Pot / Low Perf)</span>
                <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary, marginTop: "0.35rem" }}>Kwame Mensah</div>
                <div style={{ fontSize: "11px", color: colors.textMuted }}>Assembly Operations</div>
              </div>

              {/* Box 2: High Potential, Moderate Performance */}
              <div style={{ padding: "1rem", borderRadius: radii.md, border: `1px solid ${colors.borderSubtle}`, backgroundColor: "rgba(99, 102, 241, 0.05)" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: colors.indigoPrimary, textTransform: "uppercase" }}>High Potential (Growth)</span>
                <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary, marginTop: "0.35rem" }}>Clara Nukunu</div>
                <div style={{ fontSize: "11px", color: colors.textMuted }}>Customer Service</div>
              </div>

              {/* Box 3: High Potential, High Performance */}
              <div style={{ padding: "1rem", borderRadius: radii.md, border: `2px solid #10b981`, backgroundColor: "rgba(16, 185, 129, 0.08)" }}>
                <span style={{ fontSize: "10px", fontWeight: 800, color: "#065f46", textTransform: "uppercase" }}>★ Star (Top Talent)</span>
                <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary, marginTop: "0.35rem" }}>Philip Aryee</div>
                <div style={{ fontSize: "11px", color: colors.textMuted }}>Senior Edge Consultant</div>
              </div>

              {/* Box 4: Moderate Potential, Low Performance */}
              <div style={{ padding: "1rem", borderRadius: radii.md, border: `1px solid ${colors.borderSubtle}`, backgroundColor: colors.surfaceSubtle }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: colors.textMuted, textTransform: "uppercase" }}>Dilemma</span>
                <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "0.35rem" }}>0 Direct Reports</div>
              </div>

              {/* Box 5: Moderate Potential, Moderate Performance */}
              <div style={{ padding: "1rem", borderRadius: radii.md, border: `1px solid ${colors.borderSubtle}`, backgroundColor: "rgba(37, 99, 235, 0.05)" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: colors.brandBlue, textTransform: "uppercase" }}>Core Contributor</span>
                <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary, marginTop: "0.35rem" }}>Julian Vance</div>
                <div style={{ fontSize: "11px", color: colors.textMuted }}>Advisory Practice</div>
              </div>

              {/* Box 6: Moderate Potential, High Performance */}
              <div style={{ padding: "1rem", borderRadius: radii.md, border: `1px solid ${colors.borderSubtle}`, backgroundColor: "rgba(16, 185, 129, 0.05)" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#065f46", textTransform: "uppercase" }}>High Performer</span>
                <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary, marginTop: "0.35rem" }}>Benedicta Agbesi</div>
                <div style={{ fontSize: "11px", color: colors.textMuted }}>People & Culture</div>
              </div>

              {/* Box 7: Low Potential, Low Performance */}
              <div style={{ padding: "1rem", borderRadius: radii.md, border: `1px solid ${colors.borderSubtle}`, backgroundColor: "rgba(239, 68, 68, 0.05)" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#b91c1c", textTransform: "uppercase" }}>Underperformer / PIP Candidate</span>
                <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "0.35rem" }}>0 Direct Reports</div>
              </div>

              {/* Box 8: Low Potential, Moderate Performance */}
              <div style={{ padding: "1rem", borderRadius: radii.md, border: `1px solid ${colors.borderSubtle}`, backgroundColor: colors.surfaceSubtle }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: colors.textMuted, textTransform: "uppercase" }}>Effective Specialist</span>
                <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary, marginTop: "0.35rem" }}>Richard Mamphey</div>
                <div style={{ fontSize: "11px", color: colors.textMuted }}>HR Head</div>
              </div>

              {/* Box 9: Low Potential, High Performance */}
              <div style={{ padding: "1rem", borderRadius: radii.md, border: `1px solid ${colors.borderSubtle}`, backgroundColor: "rgba(16, 185, 129, 0.05)" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#065f46", textTransform: "uppercase" }}>Trusted Professional</span>
                <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary, marginTop: "0.35rem" }}>Adjoa Asare</div>
                <div style={{ fontSize: "11px", color: colors.textMuted }}>HRIS & Analytics</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: SETTINGS (Screenshot 1)                                            */}
      {/* ========================================================================= */}
      {activeMainTab === "settings" && (
        <div>
          {/* Header & Subtitle (Screenshot 1) */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h1 style={{ fontSize: typography.sizes.xl, fontWeight: 800, color: colors.indigoPrimary, margin: 0 }}>
                Settings
              </h1>
            </div>

            {/* Search Input with ctr K / cmd K (Screenshot 1) */}
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search settings..."
                style={{
                  padding: "0.45rem 0.75rem 0.45rem 2rem",
                  borderRadius: radii.md,
                  border: `1px solid ${colors.border}`,
                  fontSize: typography.sizes.xs,
                  width: "220px",
                  backgroundColor: colors.surface,
                }}
              />
              <div style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: colors.textMuted }}>
                <Icons.Search size={13} />
              </div>
              <span
                style={{
                  position: "absolute",
                  right: "6px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "10px",
                  fontWeight: 600,
                  padding: "0.1rem 0.35rem",
                  borderRadius: radii.sm,
                  backgroundColor: colors.surfaceSubtle,
                  color: colors.textMuted,
                  border: `1px solid ${colors.border}`,
                }}
              >
                ctr K
              </span>
            </div>
          </div>

          {/* Primary Top Settings Tabs */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1.25rem",
              borderBottom: `1px solid ${colors.border}`,
              paddingBottom: "0.6rem",
              marginBottom: "1.5rem",
              overflowX: "auto",
            }}
          >
            {[
              "Framework & Methodology",
              "Multi-Tier Sign-Off Chains",
              "Competency & Trait Matrix",
              "360° Peer Review & Calibration",
              "Nine-Box Talent Matrix",
              "PIP & Governance Exceptions",
              "Configuration Studio (Rules Engine)",
            ].map((tab) => {
              const isActive = settingsPrimaryTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setSettingsPrimaryTab(tab as typeof settingsPrimaryTab)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: "0 0 0.4rem 0",
                    fontSize: typography.sizes.xs,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? colors.indigoAction : colors.textSecondary,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    position: "relative",
                  }}
                >
                  {tab}
                  {isActive && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: "-0.6rem",
                        left: 0,
                        right: 0,
                        height: "3px",
                        backgroundColor: colors.indigoAction,
                        borderRadius: radii.full,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* TAB 1: FRAMEWORK & METHODOLOGY */}
          {settingsPrimaryTab === "Framework & Methodology" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radii.lg,
                  border: `1px solid ${colors.border}`,
                  padding: "1.75rem",
                  boxShadow: shadows.xs,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", borderBottom: `1px solid ${colors.borderSubtle}`, paddingBottom: "0.75rem" }}>
                  <div>
                    <h3 style={{ fontSize: typography.sizes.sm, fontWeight: 800, color: colors.textPrimary, margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Performance Framework &amp; Cascading Governance
                    </h3>
                    <p style={{ margin: "0.25rem 0 0 0", fontSize: typography.sizes.xs, color: colors.textMuted }}>
                      Configure enterprise objective models, 4-pillar Balanced Scorecard weights, OKR stretch thresholds, and single-framework purity rules.
                    </p>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.75rem" }}>
                  {/* Left Column: Methodology Selection & Single Framework */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textSecondary, marginBottom: "0.5rem" }}>
                        Primary Organizational Methodology
                      </label>
                      <div
                        style={{
                          padding: "0.85rem 1rem",
                          borderRadius: radii.md,
                          border: `1px solid ${colors.border}`,
                          backgroundColor: colors.surfaceSubtle,
                          fontSize: "11px",
                          color: colors.textMuted,
                          lineHeight: 1.45,
                        }}
                      >
                        Each appraisal cycle takes one framework (Balanced Scorecard, OKR or MBO) when it is created. The framework cannot be changed after that.
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "1rem",
                        borderRadius: radii.md,
                        backgroundColor: "rgba(99, 102, 241, 0.05)",
                        border: `1px solid rgba(99, 102, 241, 0.2)`,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.indigoPrimary }}>
                          Single-Framework Mathematical Integrity
                        </span>
                        <Badge variant="bsc" size="sm">Enforced</Badge>
                      </div>
                      <p style={{ margin: "6px 0 0 0", fontSize: "11px", color: colors.textSecondary, lineHeight: 1.45 }}>
                        Individual appraisal cycles are locked to a single framework. Combining qualitative OKRs with mathematical BSC quadrant scores within the same cycle is prohibited to prevent compensation distortion.
                      </p>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={frameworkConfig.mandatoryCorporateAlignment}
                          onChange={(e) => setFrameworkConfig({ ...frameworkConfig, mandatoryCorporateAlignment: e.target.checked })}
                          style={{ width: "16px", height: "16px", accentColor: colors.indigoPrimary }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary }}>
                            Mandatory Cascading Alignment
                          </div>
                          <div style={{ fontSize: "11px", color: colors.textMuted }}>
                            Individual KPIs cannot be submitted without a parent Department or Division link.
                          </div>
                        </div>
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={frameworkConfig.allowEmployeeProposeKeyResults}
                          onChange={(e) => setFrameworkConfig({ ...frameworkConfig, allowEmployeeProposeKeyResults: e.target.checked })}
                          style={{ width: "16px", height: "16px", accentColor: colors.indigoPrimary }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary }}>
                            Employee Self-Proposal Permitted
                          </div>
                          <div style={{ fontSize: "11px", color: colors.textMuted }}>
                            Permits employees to propose custom stretch key results during goal-setting.
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Right Column: Balanced Scorecard Weights & Quotas */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                        <label style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textSecondary }}>
                          Balanced Scorecard Pillar Weightings
                        </label>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "0.15rem 0.5rem",
                            borderRadius: radii.full,
                            backgroundColor:
                              frameworkConfig.financialWeight + frameworkConfig.customerWeight + frameworkConfig.internalWeight + frameworkConfig.learningWeight === 100
                                ? colors.emeraldSubtle
                                : "#fee2e2",
                            color:
                              frameworkConfig.financialWeight + frameworkConfig.customerWeight + frameworkConfig.internalWeight + frameworkConfig.learningWeight === 100
                                ? colors.emeraldDark
                                : "#b91c1c",
                          }}
                        >
                          Total: {frameworkConfig.financialWeight + frameworkConfig.customerWeight + frameworkConfig.internalWeight + frameworkConfig.learningWeight}%
                        </span>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                        <div style={{ padding: "0.65rem 0.85rem", borderRadius: radii.md, backgroundColor: colors.surfaceSubtle, border: `1px solid ${colors.borderSubtle}` }}>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: colors.textPrimary }}>Financial Performance</div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.3rem" }}>
                            <input
                              type="number"
                              value={frameworkConfig.financialWeight}
                              onChange={(e) => setFrameworkConfig({ ...frameworkConfig, financialWeight: parseInt(e.target.value, 10) || 0 })}
                              style={{ width: "65px", padding: "0.35rem 0.5rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs, fontWeight: 700 }}
                            />
                            <span style={{ fontSize: "12px", color: colors.textMuted }}>%</span>
                          </div>
                        </div>

                        <div style={{ padding: "0.65rem 0.85rem", borderRadius: radii.md, backgroundColor: colors.surfaceSubtle, border: `1px solid ${colors.borderSubtle}` }}>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: colors.textPrimary }}>Customer &amp; Stakeholder</div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.3rem" }}>
                            <input
                              type="number"
                              value={frameworkConfig.customerWeight}
                              onChange={(e) => setFrameworkConfig({ ...frameworkConfig, customerWeight: parseInt(e.target.value, 10) || 0 })}
                              style={{ width: "65px", padding: "0.35rem 0.5rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs, fontWeight: 700 }}
                            />
                            <span style={{ fontSize: "12px", color: colors.textMuted }}>%</span>
                          </div>
                        </div>

                        <div style={{ padding: "0.65rem 0.85rem", borderRadius: radii.md, backgroundColor: colors.surfaceSubtle, border: `1px solid ${colors.borderSubtle}` }}>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: colors.textPrimary }}>Internal Processes</div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.3rem" }}>
                            <input
                              type="number"
                              value={frameworkConfig.internalWeight}
                              onChange={(e) => setFrameworkConfig({ ...frameworkConfig, internalWeight: parseInt(e.target.value, 10) || 0 })}
                              style={{ width: "65px", padding: "0.35rem 0.5rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs, fontWeight: 700 }}
                            />
                            <span style={{ fontSize: "12px", color: colors.textMuted }}>%</span>
                          </div>
                        </div>

                        <div style={{ padding: "0.65rem 0.85rem", borderRadius: radii.md, backgroundColor: colors.surfaceSubtle, border: `1px solid ${colors.borderSubtle}` }}>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: colors.textPrimary }}>Learning &amp; Growth</div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.3rem" }}>
                            <input
                              type="number"
                              value={frameworkConfig.learningWeight}
                              onChange={(e) => setFrameworkConfig({ ...frameworkConfig, learningWeight: parseInt(e.target.value, 10) || 0 })}
                              style={{ width: "65px", padding: "0.35rem 0.5rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs, fontWeight: 700 }}
                            />
                            <span style={{ fontSize: "12px", color: colors.textMuted }}>%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                        Objective Quota per Employee
                      </label>
                      <div style={{ display: "flex", gap: "0.75rem" }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: "11px", color: colors.textMuted }}>Minimum Objectives</span>
                          <input
                            type="number"
                            value={frameworkConfig.minObjectivesPerEmployee}
                            onChange={(e) => setFrameworkConfig({ ...frameworkConfig, minObjectivesPerEmployee: parseInt(e.target.value, 10) || 1 })}
                            style={{ width: "100%", padding: "0.45rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: "11px", color: colors.textMuted }}>Maximum Objectives</span>
                          <input
                            type="number"
                            value={frameworkConfig.maxObjectivesPerEmployee}
                            onChange={(e) => setFrameworkConfig({ ...frameworkConfig, maxObjectivesPerEmployee: parseInt(e.target.value, 10) || 8 })}
                            style={{ width: "100%", padding: "0.45rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs }}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={settingsSaving}
                        onClick={saveFrameworkSettings}
                      >
                        Save Framework Settings
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MULTI-TIER SIGN-OFF CHAINS */}
          {settingsPrimaryTab === "Multi-Tier Sign-Off Chains" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radii.lg,
                  border: `1px solid ${colors.border}`,
                  padding: "1.75rem",
                  boxShadow: shadows.xs,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", borderBottom: `1px solid ${colors.borderSubtle}`, paddingBottom: "0.75rem" }}>
                  <div>
                    <h3 style={{ fontSize: typography.sizes.sm, fontWeight: 800, color: colors.textPrimary, margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Hierarchical Sign-Off Chain &amp; Digital Seals
                    </h3>
                    <p style={{ margin: "0.25rem 0 0 0", fontSize: typography.sizes.xs, color: colors.textMuted }}>
                      Sequential multi-tier approval hierarchy with stage-locking, immutable self-scores, and tamper-proof verification stamps.
                    </p>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "1.75rem" }}>
                  {/* Left: Interactive Sequential Steps */}
                  <div>
                    <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textSecondary, marginBottom: "0.75rem" }}>
                      Sequential Routing Pipeline
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                      {signOffChainConfig.tiers.map((tier) => (
                        <div
                          key={tier.step}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.85rem",
                            padding: "0.85rem 1rem",
                            borderRadius: radii.md,
                            backgroundColor: colors.surfaceSubtle,
                            border: `1px solid ${colors.borderSubtle}`,
                          }}
                        >
                          <div
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: radii.full,
                              backgroundColor: colors.indigoPrimary,
                              color: "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 800,
                              fontSize: "12px",
                              flexShrink: 0,
                            }}
                          >
                            {tier.step}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <strong style={{ fontSize: typography.sizes.xs, color: colors.textPrimary }}>{tier.role}</strong>
                              <span style={{ fontSize: "10px", color: colors.indigoAction, fontWeight: 700 }}>Tier {tier.step}</span>
                            </div>
                            <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "2px" }}>
                              {tier.description}
                            </div>
                          </div>
                          <Badge variant="neutral" size="sm">Mandatory</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Security & SLA Governance */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div
                      style={{
                        padding: "1.1rem",
                        borderRadius: radii.md,
                        backgroundColor: colors.surfaceSubtle,
                        border: `1px solid ${colors.border}`,
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.85rem",
                      }}
                    >
                      <h4 style={{ margin: 0, fontSize: typography.sizes.xs, fontWeight: 800, color: colors.textPrimary, textTransform: "uppercase" }}>
                        Digital Integrity &amp; Stage Locking
                      </h4>

                      <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={signOffChainConfig.immutableSelfScore}
                          onChange={(e) => setSignOffChainConfig({ ...signOffChainConfig, immutableSelfScore: e.target.checked })}
                          style={{ width: "16px", height: "16px", accentColor: colors.indigoPrimary }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary }}>
                            Immutable Self-Scores
                          </div>
                          <div style={{ fontSize: "11px", color: colors.textMuted }}>
                            Supervisors cannot edit employee self-scores; only submit calibrated evaluation.
                          </div>
                        </div>
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={signOffChainConfig.requireCryptographicDigitalStamp}
                          onChange={(e) => setSignOffChainConfig({ ...signOffChainConfig, requireCryptographicDigitalStamp: e.target.checked })}
                          style={{ width: "16px", height: "16px", accentColor: colors.indigoPrimary }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary }}>
                            Cryptographic Digital Stamp &amp; Hash
                          </div>
                          <div style={{ fontSize: "11px", color: colors.textMuted }}>
                            Embeds SHA-256 digital signature seal on approved appraisal dossiers.
                          </div>
                        </div>
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={signOffChainConfig.autoNudgePendingManagers}
                          onChange={(e) => setSignOffChainConfig({ ...signOffChainConfig, autoNudgePendingManagers: e.target.checked })}
                          style={{ width: "16px", height: "16px", accentColor: colors.indigoPrimary }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary }}>
                            Automated Turnaround Nudges
                          </div>
                          <div style={{ fontSize: "11px", color: colors.textMuted }}>
                            Dede AI nudges approvers when an appraisal is pending over SLA threshold.
                          </div>
                        </div>
                      </label>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                        Turnaround SLA per Approval Tier
                      </label>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <input
                          type="number"
                          value={signOffChainConfig.slaDaysPerTier}
                          onChange={(e) => setSignOffChainConfig({ ...signOffChainConfig, slaDaysPerTier: parseInt(e.target.value, 10) || 1 })}
                          style={{ width: "80px", padding: "0.45rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs }}
                        />
                        <span style={{ fontSize: typography.sizes.xs, color: colors.textMuted }}>Business Days per Sign-off Step</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setStatusMessage({ text: "Sequential approval chain and stage-locking rules saved." })}
                      >
                        Save Sign-Off Workflow
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COMPETENCY & TRAIT MATRIX */}
          {settingsPrimaryTab === "Competency & Trait Matrix" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radii.lg,
                  border: `1px solid ${colors.border}`,
                  padding: "1.75rem",
                  boxShadow: shadows.xs,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", borderBottom: `1px solid ${colors.borderSubtle}`, paddingBottom: "0.75rem" }}>
                  <div>
                    <h3 style={{ fontSize: typography.sizes.sm, fontWeight: 800, color: colors.textPrimary, margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Behavioral Competencies &amp; Trait Scoring Matrix
                    </h3>
                    <p style={{ margin: "0.25rem 0 0 0", fontSize: typography.sizes.xs, color: colors.textMuted }}>
                      Evaluate non-negotiable professional behaviors on a strict 1–5 scale, decoupled from goal OKR percentages.
                    </p>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "1.75rem" }}>
                  {/* Left Column: Core Trait Definitions */}
                  <div>
                    <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textSecondary, marginBottom: "0.75rem" }}>
                      Evaluated Behavioral Traits (Weights must sum to 100%)
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                      {competencyMatrixConfig.traits.map((trait) => (
                        <div
                          key={trait.id}
                          style={{
                            padding: "0.75rem 1rem",
                            borderRadius: radii.md,
                            backgroundColor: colors.surfaceSubtle,
                            border: `1px solid ${colors.borderSubtle}`,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <strong style={{ fontSize: typography.sizes.xs, color: colors.textPrimary }}>{trait.name}</strong>
                            <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "2px" }}>{trait.description}</div>
                          </div>
                          <span style={{ fontSize: "11px", fontWeight: 700, padding: "0.2rem 0.55rem", borderRadius: radii.full, backgroundColor: colors.surface, border: `1px solid ${colors.border}`, color: colors.indigoAction }}>
                            {trait.weight}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Weighting Split & Passing Gates */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div
                      style={{
                        padding: "1.1rem",
                        borderRadius: radii.md,
                        backgroundColor: colors.surfaceSubtle,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      <h4 style={{ margin: "0 0 0.75rem 0", fontSize: typography.sizes.xs, fontWeight: 800, color: colors.textPrimary, textTransform: "uppercase" }}>
                        Appraisal Score Weighting Split
                      </h4>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                        <div>
                          <label style={{ fontSize: "11px", color: colors.textMuted, display: "block" }}>Goals / BSC Weight</label>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.25rem" }}>
                            <input
                              type="number"
                              value={competencyMatrixConfig.goalWeightPercent}
                              onChange={(e) => setCompetencyMatrixConfig({ ...competencyMatrixConfig, goalWeightPercent: parseInt(e.target.value, 10) || 0 })}
                              style={{ width: "65px", padding: "0.35rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs, fontWeight: 700 }}
                            />
                            <span style={{ fontSize: "12px", color: colors.textMuted }}>%</span>
                          </div>
                        </div>

                        <div>
                          <label style={{ fontSize: "11px", color: colors.textMuted, display: "block" }}>Competencies Weight</label>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.25rem" }}>
                            <input
                              type="number"
                              value={competencyMatrixConfig.competencyWeightPercent}
                              onChange={(e) => setCompetencyMatrixConfig({ ...competencyMatrixConfig, competencyWeightPercent: parseInt(e.target.value, 10) || 0 })}
                              style={{ width: "65px", padding: "0.35rem", borderRadius: radii.sm, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs, fontWeight: 700 }}
                            />
                            <span style={{ fontSize: "12px", color: colors.textMuted }}>%</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: "11px", color: colors.emeraldDark, fontWeight: 600, marginTop: "0.6rem" }}>
                        Total: {competencyMatrixConfig.goalWeightPercent + competencyMatrixConfig.competencyWeightPercent}%
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                        Mandatory Passing Competency Gate
                      </label>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <input
                          type="number"
                          step="0.1"
                          value={competencyMatrixConfig.mandatoryPassingGrade}
                          onChange={(e) => setCompetencyMatrixConfig({ ...competencyMatrixConfig, mandatoryPassingGrade: parseFloat(e.target.value) || 3.0 })}
                          style={{ width: "75px", padding: "0.45rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs }}
                        />
                        <span style={{ fontSize: "11px", color: colors.textMuted }}>
                          Min. score out of 5.0 required for merit bonus qualification.
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setStatusMessage({ text: "Behavioral competency scoring matrix and passing gate saved." })}
                      >
                        Save Competency Settings
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: 360° PEER REVIEW & CALIBRATION */}
          {settingsPrimaryTab === "360° Peer Review & Calibration" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radii.lg,
                  border: `1px solid ${colors.border}`,
                  padding: "1.75rem",
                  boxShadow: shadows.xs,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", borderBottom: `1px solid ${colors.borderSubtle}`, paddingBottom: "0.75rem" }}>
                  <div>
                    <h3 style={{ fontSize: typography.sizes.sm, fontWeight: 800, color: colors.textPrimary, margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      360° Multi-Rater Evaluations &amp; Bell-Curve Calibration
                    </h3>
                    <p style={{ margin: "0.25rem 0 0 0", fontSize: typography.sizes.xs, color: colors.textMuted }}>
                      Configure peer rater quotas, anonymity protection thresholds, blind spot detection rules, and enterprise bell-curve targets.
                    </p>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.75rem" }}>
                  {/* Left Column: 360 Rules & Anonymity */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                          Minimum Peer Raters per Employee
                        </label>
                        <input
                          type="number"
                          value={peerReviewConfig.minPeersRequired}
                          onChange={(e) => setPeerReviewConfig({ ...peerReviewConfig, minPeersRequired: parseInt(e.target.value, 10) || 1 })}
                          style={{ width: "90px", padding: "0.45rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs }}
                        />
                      </div>

                      <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={peerReviewConfig.includeDirectReports}
                          onChange={(e) => setPeerReviewConfig({ ...peerReviewConfig, includeDirectReports: e.target.checked })}
                          style={{ width: "16px", height: "16px", accentColor: colors.indigoPrimary }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary }}>
                            Mandatory Direct Report Feedback (Managers)
                          </div>
                          <div style={{ fontSize: "11px", color: colors.textMuted }}>
                            People managers must receive at least 1 upward evaluation from a direct subordinate.
                          </div>
                        </div>
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={peerReviewConfig.managerApprovalOfRaters}
                          onChange={(e) => setPeerReviewConfig({ ...peerReviewConfig, managerApprovalOfRaters: e.target.checked })}
                          style={{ width: "16px", height: "16px", accentColor: colors.indigoPrimary }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary }}>
                            Supervisor Rater Approval
                          </div>
                          <div style={{ fontSize: "11px", color: colors.textMuted }}>
                            Line managers must review and confirm the employee&apos;s nominated peer reviewer list.
                          </div>
                        </div>
                      </label>
                    </div>

                    <div
                      style={{
                        padding: "1rem",
                        borderRadius: radii.md,
                        backgroundColor: "rgba(16, 185, 129, 0.05)",
                        border: `1px solid rgba(16, 185, 129, 0.2)`,
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.emeraldDark }}>
                        Anonymity &amp; Blind Spot Detection Shield
                      </div>
                      <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: colors.textSecondary }}>
                        Peer feedback comments are blinded if reviewer group is $\ge {peerReviewConfig.anonymityThreshold}$ personnel. Automatic Blind Spot alerts fire when self-evaluations diverge by $\ge {peerReviewConfig.blindSpotGapThreshold}$ points from peer consensus.
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Bell Curve Targets */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <label style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textSecondary }}>
                          Enterprise Bell-Curve Normalization Targets
                        </label>
                        <Badge variant="neutral" size="sm">Guidance Benchmark</Badge>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.65rem 0.85rem", borderRadius: radii.md, backgroundColor: colors.surfaceSubtle, border: `1px solid ${colors.borderSubtle}` }}>
                          <div>
                            <span style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textPrimary }}>Role Model / Exceeds All</span>
                            <span style={{ fontSize: "11px", color: colors.textMuted, display: "block" }}>Top performers, fast-track promotions</span>
                          </div>
                          <span style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.emeraldDark }}>10% Target</span>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.65rem 0.85rem", borderRadius: radii.md, backgroundColor: colors.surfaceSubtle, border: `1px solid ${colors.borderSubtle}` }}>
                          <div>
                            <span style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textPrimary }}>Strong Performer / Meets All</span>
                            <span style={{ fontSize: "11px", color: colors.textMuted, display: "block" }}>Dependable organizational backbone</span>
                          </div>
                          <span style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.indigoAction }}>70% Target</span>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.65rem 0.85rem", borderRadius: radii.md, backgroundColor: colors.surfaceSubtle, border: `1px solid ${colors.borderSubtle}` }}>
                          <div>
                            <span style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textPrimary }}>Needs Coaching / Partial</span>
                            <span style={{ fontSize: "11px", color: colors.textMuted, display: "block" }}>Skill development &amp; mentoring targeted</span>
                          </div>
                          <span style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: "#d97706" }}>15% Target</span>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.65rem 0.85rem", borderRadius: radii.md, backgroundColor: colors.surfaceSubtle, border: `1px solid ${colors.borderSubtle}` }}>
                          <div>
                            <span style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textPrimary }}>Unsatisfactory / PIP Action</span>
                            <span style={{ fontSize: "11px", color: colors.textMuted, display: "block" }}>Enrolled in performance improvement plan</span>
                          </div>
                          <span style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: "#dc2626" }}>5% Target</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setStatusMessage({ text: "360-degree peer rules and bell-curve benchmarks saved." })}
                      >
                        Save 360° &amp; Calibration Rules
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: NINE-BOX TALENT MATRIX */}
          {settingsPrimaryTab === "Nine-Box Talent Matrix" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div
                style={{
                  padding: "1.25rem 1.5rem",
                  borderRadius: radii.lg,
                  backgroundColor: colors.indigoSubtle,
                  border: `1px solid ${colors.indigoBorder}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Icons.Users size={18} color={colors.indigoAction} />
                    <h3 style={{ fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary, margin: 0 }}>
                      Nine Box Talent Matrix &amp; Succession Governance
                    </h3>
                  </div>
                  <p style={{ fontSize: typography.sizes.xs, color: colors.indigoPrimary, margin: "0.25rem 0 0 0" }}>
                    Calibrates actual Performance ratings (X-Axis) against Leadership Potential evaluations (Y-Axis) to identify future executive successors and retain high-impact talent.
                  </p>
                </div>
              </div>

              {/* Nine Box Matrix Visual Grid */}
              <div
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radii.lg,
                  border: `1px solid ${colors.border}`,
                  padding: "1.5rem",
                  boxShadow: shadows.xs,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Y-AXIS: LEADERSHIP POTENTIAL ↑  |  X-AXIS: PERFORMANCE →
                  </div>
                  <div style={{ fontSize: "11px", color: colors.textMuted }}>
                    Total Staff Placed: <strong style={{ color: colors.textPrimary }}>24 Personnel</strong>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
                  {[
                    { box: "Rough Diamond", pot: "High Potential", perf: "Low Performance", staff: "1 Staff", names: ["K. Mensah (Assembly Worker)"], alert: "Mentorship & Alignment", color: "#fef3c7", border: "#fde68a" },
                    { box: "Future Star", pot: "High Potential", perf: "Moderate Performance", staff: "2 Staff", names: ["Clara Nukunu", "P. Mensah"], alert: "Fast-Track Stretch Assignments", color: "#ecfdf5", border: "#a7f3d0" },
                    { box: "Consistent Star (HiPo)", pot: "High Potential", perf: "High Performance", staff: "3 Staff", names: ["Emmanuel K. Quarshie", "Sarah Jenkins"], alert: "Executive Succession Pipeline ⭐", color: "#dcfce7", border: "#86efac" },

                    { box: "Inconsistent Performer", pot: "Moderate Potential", perf: "Low Performance", staff: "0 Staff", names: [], alert: "Targeted Coaching", color: "#f8fafc", border: "#e2e8f0" },
                    { box: "Core Contributor", pot: "Moderate Potential", perf: "Moderate Performance", staff: "8 Staff", names: ["Adjoa Asare", "Benedicta Agbesi"], alert: "Stable Organizational Core", color: "#f1f5f9", border: "#cbd5e1" },
                    { box: "High Performer", pot: "Moderate Potential", perf: "High Performance", staff: "4 Staff", names: ["Marcus Chen", "Julian Vance"], alert: "Reward & Retain", color: "#e0e7ff", border: "#c7d2fe" },

                    { box: "Risk / Talent Action", pot: "Low Potential", perf: "Low Performance", staff: "1 Staff", names: ["E. Quaye"], alert: "8-Week Structured PIP ⚠️", color: "#fef2f2", border: "#fecaca" },
                    { box: "Solid Professional", pot: "Low Potential", perf: "Moderate Performance", staff: "3 Staff", names: ["B. Appiah"], alert: "Deep Technical Specialist", color: "#f8fafc", border: "#e2e8f0" },
                    { box: "Trusted Master", pot: "Low Potential", perf: "High Performance", staff: "2 Staff", names: ["Richard Mamphey"], alert: "Flight Risk Alert 🚨", color: "#fff1f2", border: "#fecdd3" },
                  ].map((q, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "1rem",
                        borderRadius: radii.md,
                        backgroundColor: q.color,
                        border: `1px solid ${q.border}`,
                        minHeight: "135px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <strong style={{ fontSize: typography.sizes.xs, color: colors.textPrimary }}>{q.box}</strong>
                          <span style={{ fontSize: "10px", fontWeight: 700, color: colors.textMuted }}>{q.staff}</span>
                        </div>
                        <div style={{ fontSize: "10px", color: colors.textMuted, marginTop: "2px" }}>
                          {q.pot} • {q.perf}
                        </div>

                        <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                          {q.names.map((n) => (
                            <span key={n} style={{ fontSize: "10px", padding: "0.15rem 0.4rem", borderRadius: radii.sm, backgroundColor: "#ffffff", border: `1px solid ${colors.border}`, color: colors.textPrimary, fontWeight: 500 }}>
                              {n}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginTop: "0.6rem", fontSize: "10.5px", fontWeight: 700, color: q.alert.includes("⭐") ? "#15803d" : q.alert.includes("🚨") || q.alert.includes("⚠️") ? "#b91c1c" : colors.indigoAction }}>
                        {q.alert}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.25rem", borderTop: `1px solid ${colors.borderSubtle}`, paddingTop: "1rem" }}>
                  <span style={{ fontSize: "11px", color: colors.textMuted }}>
                    Calibrated against Q4 Single-Framework appraisal scores.
                  </span>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Button variant="outline" size="sm" onClick={() => setStatusMessage({ text: "Dede AI calibrated 9-Box talent matrix: 4 HiPo successors verified." })}>
                      Recalibrate with Dede AI
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => setStatusMessage({ text: "Succession plan configuration saved." })} style={{ backgroundColor: colors.indigoAccent, borderColor: colors.indigoAccent }}>
                      Save Matrix Settings
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PIP & GOVERNANCE EXCEPTIONS */}
          {settingsPrimaryTab === "PIP & Governance Exceptions" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radii.lg,
                  border: `1px solid ${colors.border}`,
                  padding: "1.75rem",
                  boxShadow: shadows.xs,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", borderBottom: `1px solid ${colors.borderSubtle}`, paddingBottom: "0.75rem" }}>
                  <div>
                    <h3 style={{ fontSize: typography.sizes.sm, fontWeight: 800, color: colors.textPrimary, margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Performance Improvement Plan (PIP) &amp; Statutory Exceptions
                    </h3>
                    <p style={{ margin: "0.25rem 0 0 0", fontSize: typography.sizes.xs, color: colors.textMuted }}>
                      Configure automated remediation triggers for low performers and manage policy-approved statutory appraisal exceptions.
                    </p>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.75rem" }}>
                  {/* Left Column: Automated PIP Rules */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <h4 style={{ margin: 0, fontSize: typography.sizes.xs, fontWeight: 800, color: colors.textPrimary, textTransform: "uppercase" }}>
                      Automated Remediation Triggers
                    </h4>

                    <div>
                      <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                        Auto-Trigger PIP Threshold (Appraisal Score out of 5.0)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={pipSettings.autoTriggerUnderScore}
                        onChange={(e) => setPipSettings({ ...pipSettings, autoTriggerUnderScore: parseFloat(e.target.value) || 2.5 })}
                        style={{ width: "100%", padding: "0.5rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs }}
                      />
                      <span style={{ fontSize: "11px", color: colors.textMuted, marginTop: "4px", display: "block" }}>
                        Personnel scoring below {pipSettings.autoTriggerUnderScore} automatically enroll in structured remediation.
                      </span>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                        Standard Remediation Period
                      </label>
                      <select
                        value={pipSettings.durationWeeks}
                        onChange={(e) => setPipSettings({ ...pipSettings, durationWeeks: parseInt(e.target.value, 10) })}
                        style={{ width: "100%", padding: "0.5rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs }}
                      >
                        <option value={4}>4 Weeks (Accelerated Milestone)</option>
                        <option value={8}>8 Weeks (Standard Corporate PIP)</option>
                        <option value={12}>12 Weeks (Extended Executive Remediation)</option>
                      </select>
                    </div>

                    <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={pipSettings.mandatoryWeeklyCheckIns}
                        onChange={(e) => setPipSettings({ ...pipSettings, mandatoryWeeklyCheckIns: e.target.checked })}
                        style={{ width: "16px", height: "16px", accentColor: colors.indigoPrimary }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary }}>
                          Mandatory Weekly 1-on-1 Check-Ins
                        </div>
                        <div style={{ fontSize: "11px", color: colors.textMuted }}>
                          Logged in immutable audit ledger; triggers manager escalation if missed.
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Right Column: Statutory & Leave Exemption Rules */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <h4 style={{ margin: 0, fontSize: typography.sizes.xs, fontWeight: 800, color: colors.textPrimary, textTransform: "uppercase" }}>
                      Statutory Exceptions &amp; Leave Overrides
                    </h4>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={pipSettings.exemptions.maternityPaternity}
                          onChange={(e) => setPipSettings({ ...pipSettings, exemptions: { ...pipSettings.exemptions, maternityPaternity: e.target.checked } })}
                          style={{ width: "16px", height: "16px", accentColor: colors.indigoPrimary }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary }}>
                            Maternity / Paternity Leave Protection
                          </div>
                          <div style={{ fontSize: "11px", color: colors.textMuted }}>
                            Personnel on statutory maternity/paternity are exempted; bonuses pro-rated to active tenure.
                          </div>
                        </div>
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={pipSettings.exemptions.medicalSabbatical}
                          onChange={(e) => setPipSettings({ ...pipSettings, exemptions: { ...pipSettings.exemptions, medicalSabbatical: e.target.checked } })}
                          style={{ width: "16px", height: "16px", accentColor: colors.indigoPrimary }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary }}>
                            Prolonged Medical Sabbatical Exemption
                          </div>
                          <div style={{ fontSize: "11px", color: colors.textMuted }}>
                            Freezes appraisal cycle clock with verified medical practitioner clearance.
                          </div>
                        </div>
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={pipSettings.exemptions.probationUnder90Days}
                          onChange={(e) => setPipSettings({ ...pipSettings, exemptions: { ...pipSettings.exemptions, probationUnder90Days: e.target.checked } })}
                          style={{ width: "16px", height: "16px", accentColor: colors.indigoPrimary }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary }}>
                            Tenure Under 90 Days Exemption
                          </div>
                          <div style={{ fontSize: "11px", color: colors.textMuted }}>
                            New hires joined within 90 days of cycle close are evaluated under probation review instead.
                          </div>
                        </div>
                      </label>
                    </div>

                    <div
                      style={{
                        padding: "0.85rem 1rem",
                        borderRadius: radii.md,
                        backgroundColor: colors.surfaceSubtle,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary }}>
                        Maker-Checker Authorization
                      </div>
                      <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: colors.textMuted }}>
                        All manual appraisal score overrides or exception grants require Dual-Control sign-off: HR Administrator submission + HR Director authorization.
                      </p>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setStatusMessage({ text: "PIP remediation thresholds and statutory exception policies saved." })}
                      >
                        Save PIP &amp; Exemption Rules
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: CONFIGURATION STUDIO (RULES ENGINE) */}
          {settingsPrimaryTab === "Configuration Studio (Rules Engine)" && (
            <PerformanceConfigurationStudio />
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRAWER: OBJECTIVE REQUEST DETAILS (Screenshot 4 inspect)                   */}
      {/* ========================================================================= */}
      <SlideOver
        isOpen={Boolean(selectedRequestForDetail)}
        onClose={() => setSelectedRequestForDetail(null)}
        title={selectedRequestForDetail ? `Objective Request #${selectedRequestForDetail.requestNo}` : ""}
        subtitle={selectedRequestForDetail ? `${selectedRequestForDetail.ownerName} (${selectedRequestForDetail.ownerStaffId})` : ""}
      >
        {selectedRequestForDetail && (
          <div>
            <div
              style={{
                padding: "1rem",
                borderRadius: radii.md,
                backgroundColor: colors.surfaceSubtle,
                border: `1px solid ${colors.border}`,
                marginBottom: "1.25rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: typography.sizes.xs, color: colors.textMuted }}>Cycle & Subsidiary</span>
                <Badge variant={selectedRequestForDetail.objectiveType === "BSC" ? "bsc" : "okr"} size="sm">
                  {selectedRequestForDetail.objectiveType} Pure
                </Badge>
              </div>
              <div style={{ fontWeight: 700, fontSize: typography.sizes.sm, color: colors.textPrimary }}>
                {selectedRequestForDetail.appraisalCycle}
              </div>
              <div style={{ fontSize: "11px", color: colors.textSecondary, marginTop: "2px" }}>
                Entity: {selectedRequestForDetail.subsidiary} • Submission: {formatDate(selectedRequestForDetail.date)}
              </div>
            </div>

            <h4 style={{ margin: "0 0 0.75rem 0", fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textPrimary, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Submitted Objectives ({selectedRequestForDetail.goals.length})
            </h4>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
              {selectedRequestForDetail.goals.map((g, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "0.85rem",
                    borderRadius: radii.md,
                    border: `1px solid ${colors.borderSubtle}`,
                    backgroundColor: colors.surface,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.35rem" }}>
                    <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary, flex: 1 }}>
                      {g.title}
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: colors.indigoAction, marginLeft: "0.5rem" }}>
                      Weight: {g.weight}%
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "1rem", fontSize: "11px", color: colors.textMuted }}>
                    <span>Target: <strong>{g.target}</strong></span>
                    <span>Metric: <strong>{g.metric}</strong></span>
                  </div>
                </div>
              ))}
            </div>

            {selectedRequestForDetail.status !== "APPROVED" && (
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    handleApproveRequest(selectedRequestForDetail.id);
                    setSelectedRequestForDetail(null);
                  }}
                  style={{ flex: 1, backgroundColor: colors.emeraldDark, borderColor: colors.emeraldDark }}
                >
                  Approve Request
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleDeclineRequest(selectedRequestForDetail.id);
                    setSelectedRequestForDetail(null);
                  }}
                  style={{ flex: 1, color: colors.error }}
                >
                  Decline
                </Button>
              </div>
            )}
          </div>
        )}
      </SlideOver>

      {/* ========================================================================= */}
      {/* DRAWER: 1-ON-1 CHECK-IN DETAILS                                           */}
      {/* ========================================================================= */}
      <SlideOver
        isOpen={Boolean(selectedCheckInForDetails)}
        onClose={() => setSelectedCheckInForDetails(null)}
        title={selectedCheckInForDetails ? `1-on-1 Touchpoint: ${selectedCheckInForDetails.employeeName}` : ""}
        subtitle={selectedCheckInForDetails ? `Supervisor: ${selectedCheckInForDetails.supervisorName} • ${selectedCheckInForDetails.cadence}` : ""}
      >
        {selectedCheckInForDetails && (
          <div>
            <div
              style={{
                padding: "1rem",
                borderRadius: radii.md,
                backgroundColor: colors.surfaceSubtle,
                border: `1px solid ${colors.border}`,
                marginBottom: "1rem",
              }}
            >
              <span style={{ fontSize: "11px", color: colors.textMuted }}>Primary Strategic Goal</span>
              <div style={{ fontWeight: 700, fontSize: typography.sizes.sm, color: colors.textPrimary, marginTop: "2px" }}>
                {selectedCheckInForDetails.goalTitle}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem" }}>
                <span style={{ fontSize: "11px", color: colors.textMuted }}>Current Progress Velocity</span>
                <span style={{ fontSize: typography.sizes.sm, fontWeight: 800, color: colors.emeraldDark }}>
                  {selectedCheckInForDetails.currentProgressPct}%
                </span>
              </div>
              <div style={{ height: "6px", width: "100%", backgroundColor: colors.borderSubtle, borderRadius: radii.full, marginTop: "4px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${selectedCheckInForDetails.currentProgressPct}%`, backgroundColor: colors.emeraldDark, borderRadius: radii.full }} />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ padding: "0.85rem", borderRadius: radii.md, backgroundColor: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: "#065f46", marginBottom: "0.25rem" }}>
                  Recent Sprint Wins
                </div>
                <div style={{ fontSize: typography.sizes.xs, color: colors.textPrimary, lineHeight: 1.4 }}>
                  {selectedCheckInForDetails.recentWins}
                </div>
              </div>

              <div style={{ padding: "0.85rem", borderRadius: radii.md, backgroundColor: "rgba(249, 115, 22, 0.05)", border: "1px solid rgba(249, 115, 22, 0.2)" }}>
                <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: "#9a3412", marginBottom: "0.25rem" }}>
                  Blockers & Dependencies
                </div>
                <div style={{ fontSize: typography.sizes.xs, color: colors.textPrimary, lineHeight: 1.4 }}>
                  {selectedCheckInForDetails.blockers}
                </div>
              </div>

              <div style={{ padding: "0.85rem", borderRadius: radii.md, backgroundColor: colors.surfaceSubtle, border: `1px solid ${colors.border}` }}>
                <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.indigoPrimary, marginBottom: "0.25rem" }}>
                  Action Items for Next Touchpoint
                </div>
                <div style={{ fontSize: typography.sizes.xs, color: colors.textPrimary, lineHeight: 1.4 }}>
                  {selectedCheckInForDetails.actionItems}
                </div>
              </div>

              <div style={{ padding: "0.85rem", borderRadius: radii.md, backgroundColor: colors.surfaceSubtle, border: `1px solid ${colors.border}` }}>
                <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary, marginBottom: "0.25rem" }}>
                  Supervisor Feedback & Coaching
                </div>
                <div style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, fontStyle: "italic", lineHeight: 1.4 }}>
                  &ldquo;{selectedCheckInForDetails.supervisorFeedback}&rdquo;
                </div>
              </div>
            </div>
          </div>
        )}
      </SlideOver>

      {/* ========================================================================= */}
      {/* MODAL: LOG NEW 1-ON-1 CHECK-IN                                            */}
      {/* ========================================================================= */}
      {showNewCheckInModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
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
              borderRadius: radii.xl,
              border: `1px solid ${colors.border}`,
              width: "100%",
              maxWidth: "560px",
              boxShadow: shadows.lg,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: `1px solid ${colors.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Icons.Target size={18} color={colors.emeraldDark} />
                <h3 style={{ margin: 0, fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary }}>
                  Log Bilateral 1-on-1 Check-in
                </h3>
              </div>
              <button
                onClick={() => setShowNewCheckInModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: colors.textMuted, fontSize: "16px" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCheckIn} style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                    Employee / Reviewee
                  </label>
                  <select
                    value={newCheckInEmployee}
                    onChange={(e) => setNewCheckInEmployee(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs }}
                  >
                    <option value="Benedicta Agbesi">Benedicta Agbesi</option>
                    <option value="Philip Aryee">Philip Aryee</option>
                    <option value="Julian Vance">Julian Vance</option>
                    <option value="Clara Nukunu">Clara Nukunu</option>
                    <option value="Adjoa Asare">Adjoa Asare</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                    Supervisor / People Lead
                  </label>
                  <select
                    value={newCheckInSupervisor}
                    onChange={(e) => setNewCheckInSupervisor(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs }}
                  >
                    <option value="Sarah Jenkins">Sarah Jenkins (VP People)</option>
                    <option value="Paa Kwesi Barnes">Paa Kwesi Barnes (Managing Principal)</option>
                    <option value="Richard Barnes">Richard Barnes (CEO)</option>
                    <option value="Richard Mamphey">Richard Mamphey (HR Head)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                  Strategic Objective / Key Result
                </label>
                <input
                  type="text"
                  placeholder="e.g. KR 1.2: Automate Day -14 Pre-boarding across African Hubs"
                  value={newCheckInGoal}
                  onChange={(e) => setNewCheckInGoal(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs }}
                  required
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                  <label style={{ fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary }}>
                    Current Progress Velocity
                  </label>
                  <span style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.emeraldDark }}>
                    {newCheckInProgress}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={newCheckInProgress}
                  onChange={(e) => setNewCheckInProgress(parseInt(e.target.value, 10))}
                  style={{ width: "100%", accentColor: colors.emeraldDark }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                    Touchpoint Cadence
                  </label>
                  <select
                    value={newCheckInCadence}
                    onChange={(e) => setNewCheckInCadence(e.target.value as typeof newCheckInCadence)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs }}
                  >
                    <option value="Bi-weekly 1-on-1">Bi-weekly 1-on-1</option>
                    <option value="Weekly Sprint Touchpoint">Weekly Sprint Touchpoint</option>
                    <option value="Monthly Review">Monthly Review</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                    Next Scheduled Date
                  </label>
                  <input
                    type="date"
                    value={newCheckInNextDate}
                    onChange={(e) => setNewCheckInNextDate(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                  Wins & Progress Summary
                </label>
                <textarea
                  rows={2}
                  placeholder="Key milestones completed since last touchpoint..."
                  value={newCheckInWins}
                  onChange={(e) => setNewCheckInWins(e.target.value)}
                  style={{ width: "100%", padding: "0.45rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                  Blockers or Needed Support
                </label>
                <textarea
                  rows={2}
                  placeholder="Dependencies, legal friction, technical blockers..."
                  value={newCheckInBlockers}
                  onChange={(e) => setNewCheckInBlockers(e.target.value)}
                  style={{ width: "100%", padding: "0.45rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "0.5rem" }}>
                <Button variant="outline" size="sm" type="button" onClick={() => setShowNewCheckInModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" style={{ backgroundColor: colors.emeraldDark, borderColor: colors.emeraldDark }}>
                  Log Check-in Record
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: INITIATE FORMAL APPRAISAL CYCLE                                    */}
      {/* ========================================================================= */}
      {showNewCycleModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
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
              borderRadius: radii.xl,
              border: `1px solid ${colors.border}`,
              width: "100%",
              maxWidth: "540px",
              boxShadow: shadows.lg,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: `1px solid ${colors.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Icons.Calendar size={18} color={colors.indigoPrimary} />
                <h3 style={{ margin: 0, fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary }}>
                  Initiate Formal Appraisal Cycle
                </h3>
              </div>
              <button
                onClick={() => setShowNewCycleModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: colors.textMuted, fontSize: "16px" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCycle} style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                  Cycle Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2026 Q2 Performance Appraisal (West Africa Hub)"
                  value={cycleTitle}
                  onChange={(e) => setCycleTitle(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                  Methodology Framework (Single-Framework Pure)
                </label>
                <select
                  value={selectedFramework}
                  onChange={(e) => setSelectedFramework(e.target.value as typeof selectedFramework)}
                  style={{ width: "100%", padding: "0.55rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
                >
                  <option value="OKR">OKR — Objectives & Key Results (0.0 to 1.0 scoring)</option>
                  <option value="BSC">BSC — Balanced Scorecard (4 Quadrants, weighted %)</option>
                  <option value="MBO">MBO — Management by Objectives (Target % completion)</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                  Scope & Objective
                </label>
                <textarea
                  rows={3}
                  placeholder="Define the strategic intent and evaluation criteria..."
                  value={cycleDesc}
                  onChange={(e) => setCycleDesc(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "0.5rem" }}>
                <Button variant="outline" size="sm" type="button" onClick={() => setShowNewCycleModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Launching..." : "Launch Appraisal Cycle"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRAWER: CYCLE EVALUATION REVIEW & CALIBRATION                              */}
      {/* ========================================================================= */}
      <SlideOver
        isOpen={Boolean(selectedCycleForReview)}
        onClose={() => setSelectedCycleForReview(null)}
        title={selectedCycleForReview ? selectedCycleForReview.title : ""}
        subtitle={selectedCycleForReview ? `Calibration & Manager Assessments • [${selectedCycleForReview.framework_code || "OKR"} Pure]` : ""}
      >
        {selectedCycleForReview && (
          <div>
            <div style={{ marginBottom: "1rem", fontSize: typography.sizes.xs, color: colors.textSecondary }}>
              Review self-ratings, submit manager scores, and calibrate performance scores for your direct reports under {selectedCycleForReview.framework_code || "OKR"} methodology.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {evaluations.map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    backgroundColor: colors.surfaceSubtle,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radii.md,
                    padding: "1rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <div>
                      <div style={{ fontWeight: typography.weights.semibold, color: colors.textPrimary, fontSize: typography.sizes.sm }}>
                        {ev.name}
                      </div>
                      <div style={{ fontSize: typography.sizes.xs, color: colors.textMuted }}>
                        {ev.role} • {ev.department}
                      </div>
                    </div>
                    <Badge variant={ev.status === "CALIBRATED" ? "success" : "warning"} size="sm">
                      {ev.status === "CALIBRATED" ? "Calibrated ✓" : "Pending Sign-off"}
                    </Badge>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", margin: "0.75rem 0", padding: "0.5rem 0.75rem", backgroundColor: colors.surface, borderRadius: radii.sm, border: `1px solid ${colors.border}` }}>
                    <div>
                      <span style={{ fontSize: "11px", color: colors.textMuted }}>Self Assessment</span>
                      <div style={{ fontSize: typography.sizes.base, fontWeight: 700, color: colors.brandBlue }}>
                        {ev.selfRating} / 5.0
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: "11px", color: colors.textMuted }}>Manager Calibration</span>
                      <div style={{ fontSize: typography.sizes.base, fontWeight: 700, color: colors.emeraldDark }}>
                        {ev.managerRating} / 5.0
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, fontStyle: "italic", margin: "0 0 0.75rem 0" }}>
                    &ldquo;{ev.feedback}&rdquo;
                  </p>

                  {ev.status !== "CALIBRATED" && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setEvaluations((prev) =>
                          prev.map((item) => (item.id === ev.id ? { ...item, status: "CALIBRATED" } : item))
                        );
                        setStatusMessage({ text: `Calibrated rating for ${ev.name} submitted.` });
                      }}
                      style={{ width: "100%" }}
                    >
                      Calibrate & Finalize Score
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
};
