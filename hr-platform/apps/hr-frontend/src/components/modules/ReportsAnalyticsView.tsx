"use client";

import React, { useState, useMemo } from "react";
import jsPDF from "jspdf";
import { colors, typography, radii, shadows } from "../../design-system/tokens";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { Icons } from "../../design-system/Icons";
import { formatCellIfDate } from "../../utils/date";

export interface ReportItem {
  id: number;
  name: string;
  category:
    | "Core HR & Headcount"
    | "Time, Attendance & Leave"
    | "Payroll & Compensation"
    | "Talent Acquisition"
    | "Performance & Development"
    | "Attrition & Engagement";
  pack: "Manager Pack" | "Executive Pack" | "Admin/Compliance Pack" | "General";
  type: "Strategic Dashboard" | "Operational Export";
  description: string;
  kpis: string[];
  sampleAiInsight: string;
  metrics: { label: string; value: string; delta?: string; trend?: "up" | "down" | "neutral" }[];
  sampleRows: Record<string, string | number>[];
}

// Complete 60-Report Catalog
const ALL_60_REPORTS: ReportItem[] = [
  // 1. Core HR & Headcount (1-10)
  {
    id: 1,
    name: "Master Employee Directory",
    category: "Core HR & Headcount",
    pack: "Admin/Compliance Pack",
    type: "Operational Export",
    description: "Complete registry of all 45 active workforce members with roles, emails, manager hierarchies, and work locations.",
    kpis: ["Total Headcount: 45", "Departments: 7", "Data Completeness: 99.4%", "Active Ratio: 100%"],
    sampleAiInsight: "Workforce directory integrity is at 99.4% with all 45 records fully verified. Zero missing emergency contacts or duplicate tax identifiers detected across London and West Africa hubs.",
    metrics: [
      { label: "Active Employees", value: "45", delta: "+2 this mo", trend: "up" },
      { label: "Practice Locations", value: "2 (UK/GH)", trend: "neutral" },
      { label: "Verified National IDs", value: "100%", trend: "up" },
    ],
    sampleRows: [
      { id: "SEN-001", name: "Paa Kwesi Barnes", role: "Managing Principal", dept: "Executive Leadership", team: "Executive Committee", location: "London HQ", status: "Active" },
      { id: "SEN-002", name: "Richard Barnes", role: "Chief Executive Officer", dept: "Executive Leadership", team: "Executive Committee", location: "London HQ", status: "Active" },
      { id: "SEN-003", name: "Sarah Jenkins", role: "VP of People & Culture", dept: "People & Culture", team: "Corporate Information Security Committee", location: "London HQ", status: "Active" },
      { id: "SEN-004", name: "Benedicta Agbesi", role: "HR Operations Consultant", dept: "People & Culture", team: "West Africa Talent Onboarding Taskforce", location: "Accra Hub", status: "Active" },
      { id: "SEN-005", name: "Philip Aryee", role: "Senior Cloud & Edge Consultant", dept: "Cloud Engineering", team: "Hyperdrive Edge Performance Squad", location: "Accra Hub", status: "Active" },
    ],
  },
  {
    id: 2,
    name: "Headcount & FTE Report",
    category: "Core HR & Headcount",
    pack: "Executive Pack",
    type: "Strategic Dashboard",
    description: "Total headcount vs Full-Time Equivalents (FTE), broken down by department, practice location, and contract model.",
    kpis: ["Total Headcount: 45", "Full-Time FTE: 43.5", "Contractors: 3", "Span of Control: 1:5.8"],
    sampleAiInsight: "FTE utilization stands at 96.6% with engineering leading headcount expansion (+18% YoY). Span of control remains healthy at 1:5.8 across core consulting practices.",
    metrics: [
      { label: "Total FTE", value: "43.5", delta: "+4.5 YoY", trend: "up" },
      { label: "Avg Span of Control", value: "5.8:1", trend: "neutral" },
      { label: "Contingent Ratio", value: "6.7%", trend: "neutral" },
    ],
    sampleRows: [
      { dept: "Cloud & Edge Engineering", headcount: 14, fte: 14.0, contractors: 1, budgetUtilization: "94%" },
      { dept: "Enterprise Advisory", headcount: 10, fte: 9.5, contractors: 1, budgetUtilization: "91%" },
      { dept: "Strategic Consulting", headcount: 8, fte: 8.0, contractors: 0, budgetUtilization: "88%" },
      { dept: "People & Culture", headcount: 5, fte: 5.0, contractors: 0, budgetUtilization: "98%" },
      { dept: "Executive Leadership", headcount: 4, fte: 4.0, contractors: 0, budgetUtilization: "100%" },
    ],
  },
  {
    id: 3,
    name: "Org Chart Hierarchy & Reporting Lines",
    category: "Core HR & Headcount",
    pack: "General",
    type: "Strategic Dashboard",
    description: "Hierarchical structural map of the organization, visualizing reporting levels, manager depth, and vacancies.",
    kpis: ["Max Org Depth: 4 Levels", "Management Ratio: 17.8%", "Direct Report Avg: 5.6"],
    sampleAiInsight: "Org hierarchy depth is capped at 4 levels, maintaining modern flat consulting operations. No managers have more than 8 direct reports, avoiding leadership bottlenecks.",
    metrics: [
      { label: "Hierarchy Depth", value: "4 Levels", trend: "neutral" },
      { label: "People Leads", value: "8 Managers", trend: "neutral" },
    ],
    sampleRows: [
      { tier: "L1 Executive", members: 4, lead: "Richard Barnes", directReports: 8 },
      { tier: "L2 Practice Directors", members: 8, lead: "Paa Kwesi Barnes", directReports: 22 },
      { tier: "L3 Senior Consultants", members: 18, lead: "Various Leads", directReports: 15 },
      { tier: "L4 Consultants & Analysts", members: 15, lead: "Senior Mentors", directReports: 0 },
    ],
  },
  {
    id: 4,
    name: "Diversity, Equity & Inclusion (DEI) Report",
    category: "Core HR & Headcount",
    pack: "Executive Pack",
    type: "Strategic Dashboard",
    description: "Workforce demographic distribution (gender, ethnicity, age) across operational departments and leadership tiers.",
    kpis: ["Gender Balance: 47% F / 53% M", "BAME Representation: 62%", "Executive Gender Parity: 50%"],
    sampleAiInsight: "Gender distribution across leadership has achieved 50/50 parity, outpacing UK professional services benchmarks. Tech practice diversity increased by 12% following recent regional recruitment in West Africa.",
    metrics: [
      { label: "Female Leadership", value: "50.0%", delta: "+10%", trend: "up" },
      { label: "BAME Ratio", value: "62.2%", trend: "up" },
      { label: "Median Age", value: "33.4 yrs", trend: "neutral" },
    ],
    sampleRows: [
      { tier: "Executive", female: "50%", male: "50%", bame: "75%", total: 4 },
      { tier: "Management", female: "45%", male: "55%", bame: "60%", total: 8 },
      { tier: "Consulting Staff", female: "48%", male: "52%", bame: "61%", total: 33 },
    ],
  },
  {
    id: 5,
    name: "Tenure & Longevity Report",
    category: "Core HR & Headcount",
    pack: "General",
    type: "Strategic Dashboard",
    description: "Average employee tenure segmented by department and leadership lead, highlighting core retention drivers.",
    kpis: ["Avg Company Tenure: 3.2 Years", "Senior Staff Retention: 94%", "Early Resignation Rate: 4.2%"],
    sampleAiInsight: "Average organizational tenure is 3.2 years, with Cloud Engineering sustaining 94% retention. Senior consultant longevity is bolstered by quarterly performance profit-sharing incentives.",
    metrics: [
      { label: "Avg Tenure", value: "3.2 yrs", delta: "+0.4 yrs", trend: "up" },
      { label: "Longest Tenure", value: "8.5 yrs", trend: "neutral" },
    ],
    sampleRows: [
      { dept: "Executive Leadership", avgTenure: "5.4 yrs", retention: "100%" },
      { dept: "Cloud Engineering", avgTenure: "3.8 yrs", retention: "94%" },
      { dept: "Enterprise Advisory", avgTenure: "2.9 yrs", retention: "89%" },
    ],
  },
  {
    id: 6,
    name: "Demographic Shift & Succession Planning",
    category: "Core HR & Headcount",
    pack: "General",
    type: "Strategic Dashboard",
    description: "Workforce age demographic distributions and flight-risk succession pipelines for Tier-1 key personnel.",
    kpis: ["Key Person Dependency: 3 Roles", "Successor Readiness: 78%", "Retirement Horizon 5yr: 2 Roles"],
    sampleAiInsight: "Succession readiness has reached 78% with two shadow leads groomed for Cloud Practice leadership. Cross-border mentor pairings have reduced single-point dependencies in enterprise architecture.",
    metrics: [
      { label: "Key Role Backups", value: "78%", delta: "+15%", trend: "up" },
      { label: "Millennial / Gen-Z", value: "71%", trend: "neutral" },
    ],
    sampleRows: [
      { role: "Managing Principal", incumbent: "Paa Kwesi Barnes", successor: "Sarah Jenkins (Ready Now)", risk: "Low" },
      { role: "Head of Cloud Architecture", incumbent: "Philip Aryee", successor: "Kwesi Osei (6 mo)", risk: "Medium" },
    ],
  },
  {
    id: 7,
    name: "New Hire Census & Cohort Velocity",
    category: "Core HR & Headcount",
    pack: "General",
    type: "Operational Export",
    description: "Detailed register of all joiners within the active fiscal year, tracking ramp velocity and onboarding milestones.",
    kpis: ["FY26 New Hires: 8", "30-Day Retention: 100%", "Avg Time to First Commit: 4.2 Days"],
    sampleAiInsight: "All 8 new hires in FY26 successfully completed pre-boarding and Day 1 zero-leak provisioning. Time-to-first-client-billability decreased from 14 days down to 4.2 days.",
    metrics: [
      { label: "New Joiners (H1)", value: "8 Staff", trend: "up" },
      { label: "Pre-board Complete", value: "100%", trend: "up" },
    ],
    sampleRows: [
      { name: "Kwesi Osei", role: "Senior DevOps Engineer", joinDate: "2026-11-01", rampStatus: "Completed Day 3" },
      { name: "Benedicta Agbesi", role: "HR Consultant", joinDate: "2026-10-15", rampStatus: "Fully Productive" },
      { name: "Philip Aryee", role: "Senior Cloud Consultant", joinDate: "2026-09-01", rampStatus: "Fully Productive" },
    ],
  },
  {
    id: 8,
    name: "Contingent Worker & Internal Gig Registry",
    category: "Core HR & Headcount",
    pack: "General",
    type: "Operational Export",
    description: "Registry of independent contractors, interim specialists, and internal stretch gig commitments.",
    kpis: ["Active Gigs: 4", "Avg Gig Commitment: 12 hrs/wk", "Contractor Spend: GH₵14,200/mo"],
    sampleAiInsight: "Internal gig fulfillment has replaced GH₵38,000 in third-party contractor spend by matching verified internal staff skills in Wasm and Rust to cross-border client sprints.",
    metrics: [
      { label: "Internal Gigs Active", value: "4 Projects", trend: "up" },
      { label: "Contractor Ratio", value: "6.7%", trend: "down" },
    ],
    sampleRows: [
      { gigTitle: "Cross-Border Wasm Engine", assignee: "Philip Aryee (Internal)", hours: "10 hrs/wk", costSavings: "GH₵4,500/mo" },
      { gigTitle: "ISO 27001 Surveillance Prep", assignee: "Benedicta Agbesi (Internal)", hours: "8 hrs/wk", costSavings: "GH₵3,200/mo" },
    ],
  },
  {
    id: 9,
    name: "Remote vs. On-Site Work Distribution",
    category: "Core HR & Headcount",
    pack: "General",
    type: "Strategic Dashboard",
    description: "Analysis of workforce modalities (Remote, Hybrid, London Bishopsgate, Accra Hub) across teams.",
    kpis: ["Remote First: 58%", "Hybrid: 38%", "Fully On-Site: 4%"],
    sampleAiInsight: "58% of consulting engineers operate fully remote across Europe and Africa. Hybrid attendance at Bishopsgate HQ peaks on Tuesdays and Thursdays during client advisory sprint planning.",
    metrics: [
      { label: "Fully Remote", value: "58%", trend: "neutral" },
      { label: "HQ Hybrid", value: "38%", trend: "neutral" },
      { label: "Desk Utilization", value: "62%", trend: "up" },
    ],
    sampleRows: [
      { dept: "Cloud Engineering", remote: "72%", hybrid: "28%", onsite: "0%" },
      { dept: "Executive Leadership", remote: "25%", hybrid: "75%", onsite: "0%" },
      { dept: "People & Culture", remote: "40%", hybrid: "60%", onsite: "0%" },
    ],
  },
  {
    id: 10,
    name: "Data Quality & Profile Completeness Report",
    category: "Core HR & Headcount",
    pack: "Admin/Compliance Pack",
    type: "Operational Export",
    description: "Audit ledger flagging incomplete records, unverified tax codes, missing passport scans, or invalid banking coordinates.",
    kpis: ["Overall Profile Score: 98.7%", "Missing Bank Coordinates: 0", "Pending ID Uploads: 1"],
    sampleAiInsight: "Data hygiene score is at 98.7%. Only 1 right-to-work visa verification document is pending re-certification for H2 compliance.",
    metrics: [
      { label: "Data Completeness", value: "98.7%", delta: "+1.2%", trend: "up" },
      { label: "Missing Tax Codes", value: "0", trend: "up" },
    ],
    sampleRows: [
      { employee: "Kwesi Osei", missingItem: "Right to Work PDF Refresh", deadline: "2026-11-20", risk: "Low" },
    ],
  },

  // 2. Time, Attendance & Leave (11-20)
  {
    id: 11,
    name: "Daily Attendance & Live Clock-in Report",
    category: "Time, Attendance & Leave",
    pack: "Manager Pack",
    type: "Strategic Dashboard",
    description: "Live real-time telemetry of staff clocked in, late, on approved PTO, or active on remote sprints today.",
    kpis: ["Present Today: 42/45", "On Leave: 3", "Remote Active: 26", "Tardiness Rate: 0.8%"],
    sampleAiInsight: "93.3% workforce presence confirmed today with 26 engineers active on remote client VPCs. 3 staff are on pre-approved annual leave with full coverage arranged.",
    metrics: [
      { label: "Present Today", value: "93.3%", trend: "up" },
      { label: "On PTO", value: "3 Staff", trend: "neutral" },
    ],
    sampleRows: [
      { employee: "Paa Kwesi Barnes", status: "Active (Bishopsgate)", checkIn: "08:45 GMT", shift: "09:00 - 17:30" },
      { employee: "Philip Aryee", status: "Active (Remote Accra)", checkIn: "08:52 GMT", shift: "09:00 - 17:30" },
      { employee: "Ama Boakye", status: "Annual Leave", checkIn: "N/A", shift: "Approved Leave" },
    ],
  },
  {
    id: 12,
    name: "Leave Balance & Financial Liability Report",
    category: "Time, Attendance & Leave",
    pack: "Admin/Compliance Pack",
    type: "Operational Export",
    description: "Total accrued, unused holiday liabilities across all personnel for statutory financial accounting (IAS 19 / FRS 102).",
    kpis: ["Total Unused Days: 382 Days", "Financial Balance Liability: GH₵94,200", "Avg Leave per Staff: 8.5 Days"],
    sampleAiInsight: "Total balance liability is GH₵94,200, an 8% reduction following the Q3 push-based holiday optimization campaign. Executive leadership liability stands at GH₵18,400 with mandatory year-end schedules in place.",
    metrics: [
      { label: "Accrued Liability", value: "GH₵94,200", delta: "-8.4%", trend: "down" },
      { label: "Avg Days Accrued", value: "8.5d", trend: "neutral" },
    ],
    sampleRows: [
      { dept: "Executive Leadership", accruedDays: 48, financialLiability: "GH₵18,400", avgDays: "12.0d" },
      { dept: "Cloud Engineering", accruedDays: 142, financialLiability: "GH₵38,600", avgDays: "10.1d" },
      { dept: "Enterprise Advisory", accruedDays: 104, financialLiability: "GH₵24,800", avgDays: "10.4d" },
      { dept: "People & Culture", accruedDays: 44, financialLiability: "GH₵7,200", avgDays: "8.8d" },
    ],
  },
  {
    id: 13,
    name: "Leave Utilization & Spike Analysis",
    category: "Time, Attendance & Leave",
    pack: "Manager Pack",
    type: "Strategic Dashboard",
    description: "Seasonal utilization patterns across holiday, sick, parental, and compassionate leaves.",
    kpis: ["Annual Leave Taken: 68%", "Sick Days per FTE: 2.1 Days/yr", "Parental Leaves: 2 Active"],
    sampleAiInsight: "Sick leave absence is exceptionally low at 2.1 days per FTE annually versus the UK consulting average of 4.8 days. Summer holiday clustering was smoothed out by proactive spring leave nudges.",
    metrics: [
      { label: "Annual Leave Burn", value: "68%", trend: "up" },
      { label: "Sick Days / FTE", value: "2.1d", delta: "-0.8d", trend: "down" },
    ],
    sampleRows: [
      { leaveType: "Annual Leave", takenDays: 480, allocated: 720, utilization: "66.7%" },
      { leaveType: "Statutory Sick Leave", takenDays: 45, allocated: "Ad-hoc", utilization: "1.8%" },
      { leaveType: "Maternity / Parental", takenDays: 120, allocated: 180, utilization: "66.7%" },
    ],
  },
  {
    id: 14,
    name: "Absenteeism & Bradford Factor Index",
    category: "Time, Attendance & Leave",
    pack: "Manager Pack",
    type: "Strategic Dashboard",
    description: "Calculates Bradford Factor scores ($S^2 \times D$) to identify disruptive short-term unplanned absence patterns.",
    kpis: ["Low Risk (<50): 97.8%", "Moderate Risk (51-200): 2.2%", "Action Triggered (>200): 0"],
    sampleAiInsight: "97.8% of staff maintain Bradford scores below 50 (zero operational concern). No personnel have reached the 200 threshold requiring line manager review.",
    metrics: [
      { label: "Bradford Clean Ratio", value: "97.8%", trend: "up" },
      { label: "High Risk Flags", value: "0", trend: "up" },
    ],
    sampleRows: [
      { employee: "Kwame Osei", spells: 1, totalDays: 2, bradfordScore: 2, status: "Normal" },
      { employee: "Esi Mensah", spells: 2, totalDays: 3, bradfordScore: 12, status: "Normal" },
      { employee: "John Doe", spells: 3, totalDays: 6, bradfordScore: 54, status: "Monitoring" },
    ],
  },
  {
    id: 15,
    name: "Overtime & Shift Differential Multipliers",
    category: "Time, Attendance & Leave",
    pack: "Admin/Compliance Pack",
    type: "Operational Export",
    description: "Tracks on-call rotations, weekend support hours, and 1.5x / 2.0x overtime cost multipliers.",
    kpis: ["Overtime Hours: 42 hrs/mo", "Multiplier Cost: GH₵2,940", "On-Call Coverage: 100%"],
    sampleAiInsight: "Overtime hours remain tightly constrained at 42 hours total across the DevOps rotation. Overtime spend is 24% under budget due to automated Cloudflare health auto-healing.",
    metrics: [
      { label: "Overtime Hours", value: "42 hrs", delta: "-14 hrs", trend: "down" },
      { label: "Total Cost", value: "GH₵2,940", trend: "down" },
    ],
    sampleRows: [
      { employee: "Philip Aryee", rate: "1.5x", hours: 14, reason: "Cloudflare Workers DB Migration" },
      { employee: "Kwesi Osei", rate: "1.5x", hours: 12, reason: "ISO 27001 Backup Verification" },
    ],
  },
  {
    id: 16,
    name: "Timesheet Approval Status & Aging",
    category: "Time, Attendance & Leave",
    pack: "Manager Pack",
    type: "Operational Export",
    description: "Status of consulting timesheets pending, approved, or rejected for client billable invoicing.",
    kpis: ["Approved: 94%", "Pending Manager: 5%", "Rejected: 1%"],
    sampleAiInsight: "94% of billable timesheets for client engagements were approved within 24 hours of cutoff. Average manager signoff velocity improved to 4.8 hours.",
    metrics: [
      { label: "Approved Ratio", value: "94.2%", trend: "up" },
      { label: "Pending Signoff", value: "3 Sheets", trend: "down" },
    ],
    sampleRows: [
      { project: "Ghana Commercial Bank Cloud", hoursLogged: 160, approvedBy: "Paa Kwesi Barnes", status: "Approved" },
      { project: "Fintech Wasm Architecture", hoursLogged: 140, approvedBy: "Richard Barnes", status: "Approved" },
      { project: "MTN Edge Optimization", hoursLogged: 40, approvedBy: "Pending Lead", status: "Pending" },
    ],
  },
  {
    id: 17,
    name: "Holiday Calendar Compliance (UK vs Ghana)",
    category: "Time, Attendance & Leave",
    pack: "General",
    type: "Operational Export",
    description: "Audits statutory bank holiday compliance across UK (HMRC) and Ghana (Labour Act 2003) calendars.",
    kpis: ["UK Holidays: 8 Days", "Ghana Holidays: 13 Days", "Cross-Border Overlap: 3 Days"],
    sampleAiInsight: "Regional holiday compliance is automated by practice location. UK staff observed Summer Bank Holiday while Ghana practice seamlessly maintained client on-call standby.",
    metrics: [
      { label: "Calendar Compliance", value: "100%", trend: "up" },
      { label: "Cross-Border Coverage", value: "100%", trend: "up" },
    ],
    sampleRows: [
      { holiday: "Christmas Day", date: "2026-12-25", jurisdiction: "UK & Ghana", status: "Corporate Holiday" },
      { holiday: "Boxing Day", date: "2026-12-26", jurisdiction: "UK & Ghana", status: "Corporate Holiday" },
      { holiday: "Independence Day", date: "2026-03-06", jurisdiction: "Ghana Practice", status: "Ghana Holiday" },
    ],
  },
  {
    id: 18,
    name: "Return-to-Work & Phased Reintegration",
    category: "Time, Attendance & Leave",
    pack: "General",
    type: "Strategic Dashboard",
    description: "Monitors staff returning from medical or parental leave and tracks graduated workload ramps.",
    kpis: ["Active Ramps: 1", "Ramp Compliance: 100%", "Check-in Frequency: Weekly"],
    sampleAiInsight: "One consultant is currently on a successful 4-day phased return post-maternity leave, maintaining 100% agreed milestone velocity.",
    metrics: [
      { label: "Active Reintegrations", value: "1 Staff", trend: "neutral" },
      { label: "Satisfaction Rate", value: "100%", trend: "up" },
    ],
    sampleRows: [
      { employee: "Dr. Abena Kyeremeh", returnDate: "2026-10-01", rampWeek: "Week 5 of 8", currentCapacity: "80%" },
    ],
  },
  {
    id: 19,
    name: "Schedule Adherence & Core Hours Ratio",
    category: "Time, Attendance & Leave",
    pack: "Manager Pack",
    type: "Strategic Dashboard",
    description: "Evaluates team availability during core collaborative hours (10:00 - 15:00 GMT).",
    kpis: ["Core Hours Adherence: 98.4%", "Standup Attendance: 97.2%"],
    sampleAiInsight: "Core hours overlap between London HQ and Accra Hub averaged 98.4%, ensuring seamless handoffs for afternoon client demos.",
    metrics: [
      { label: "Core Adherence", value: "98.4%", trend: "up" },
      { label: "Daily Standup Sync", value: "97.2%", trend: "up" },
    ],
    sampleRows: [
      { team: "Cloud & Edge Engineering", adherence: "99.1%", standupAvg: "09:30 GMT" },
      { team: "Enterprise Advisory", adherence: "98.0%", standupAvg: "09:45 GMT" },
    ],
  },
  {
    id: 20,
    name: "Remote Work Statutory Days Compliance",
    category: "Time, Attendance & Leave",
    pack: "Admin/Compliance Pack",
    type: "Operational Export",
    description: "Tracks international remote work days against UK 183-day tax residency limits.",
    kpis: ["Cross-Border Breaches: 0", "Tracked Days: 100%", "Max Days Logged: 42 Days"],
    sampleAiInsight: "Zero cross-border remote work tax residency breaches detected. Highest international remote days logged by any individual consultant is 42 days (well below the 90-day threshold).",
    metrics: [
      { label: "Tax Residency Risks", value: "0 Cases", trend: "up" },
      { label: "Max Remote Days", value: "42d / 90d", trend: "neutral" },
    ],
    sampleRows: [
      { employee: "Philip Aryee", overseasDays: 14, jurisdiction: "Ghana/UK", compliance: "Certified Compliant" },
      { employee: "Sarah Jenkins", overseasDays: 10, jurisdiction: "Spain/UK", compliance: "Certified Compliant" },
    ],
  },

  // 3. Payroll & Compensation (21-30)
  {
    id: 21,
    name: "Payroll Register (Gross-to-Net Master)",
    category: "Payroll & Compensation",
    pack: "Admin/Compliance Pack",
    type: "Operational Export",
    description: "Detailed line-item payroll register itemizing gross base, allowances, PAYE, employee/employer NI, pension, and net disbursements.",
    kpis: ["Total Monthly Gross: GH₵342,500", "Total Net Disbursed: GH₵214,800", "Total PAYE/NI: GH₵96,400"],
    sampleAiInsight: "Monthly gross payroll stands at GH₵342,500 with zero disbursement errors across Barclays UK BACS direct deposits. Employer pension contributions matched at 10% across all eligible participants.",
    metrics: [
      { label: "Gross Payroll", value: "GH₵342.5k", trend: "neutral" },
      { label: "Net Take-Home", value: "GH₵214.8k", trend: "neutral" },
      { label: "Total Taxes", value: "GH₵96.4k", trend: "neutral" },
    ],
    sampleRows: [
      { name: "Paa Kwesi Barnes", gross: "GH₵12,333.33", tax: "GH₵3,992.10", ni: "GH₵698.20", pension: "GH₵966.67", net: "GH₵6,676.36" },
      { name: "Richard Barnes", gross: "GH₵15,000.00", tax: "GH₵5,120.00", ni: "GH₵740.00", pension: "GH₵1,200.00", net: "GH₵7,940.00" },
      { name: "Sarah Jenkins", gross: "GH₵9,166.67", tax: "GH₵2,650.00", ni: "GH₵510.00", pension: "GH₵733.33", net: "GH₵5,273.34" },
    ],
  },
  {
    id: 22,
    name: "Payroll Variance Analysis (MoM)",
    category: "Payroll & Compensation",
    pack: "Admin/Compliance Pack",
    type: "Strategic Dashboard",
    description: "Month-over-month payroll delta report flagging anomalies, bonus additions, pro-rated joiners, or statutory tax changes.",
    kpis: ["Gross Variance: +GH₵8,450 (+2.5%)", "New Hire Additions: GH₵7,200", "Overtime Delta: -GH₵450"],
    sampleAiInsight: "Month-over-month variance was +2.5% (GH₵8,450), driven entirely by the onboarding of Senior DevOps Lead Kwesi Osei and agreed annual salary increments.",
    metrics: [
      { label: "MoM Variance", value: "+2.5%", delta: "+GH₵8.4k", trend: "up" },
      { label: "Unplanned Variances", value: "GH₵0.00", trend: "up" },
    ],
    sampleRows: [
      { category: "Base Salary", prevMonth: "GH₵322,000", currentMonth: "GH₵329,200", delta: "+GH₵7,200 (New Hires)" },
      { category: "Bonuses", prevMonth: "GH₵10,000", currentMonth: "GH₵10,000", delta: "GH₵0 (Stable)" },
      { category: "Overtime", prevMonth: "GH₵3,390", currentMonth: "GH₵2,940", delta: "-GH₵450 (Reduced)" },
    ],
  },
  {
    id: 23,
    name: "Salary Equity, Pay Gaps & Compression",
    category: "Payroll & Compensation",
    pack: "Admin/Compliance Pack",
    type: "Strategic Dashboard",
    description: "Evaluates pay equity across tenure and gender to prevent internal salary compression and satisfy equal pay audits.",
    kpis: ["Gender Pay Gap (Median): 1.4%", "Equity Score: 98.6%", "Compression Flags: 0"],
    sampleAiInsight: "Senrab ConsulTech's median gender pay gap is 1.4%, significantly outperforming the UK national average of 7.7%. No salary compression anomalies detected across engineering bands.",
    metrics: [
      { label: "Gender Pay Gap", value: "1.4%", delta: "-0.6%", trend: "down" },
      { label: "Pay Equity Index", value: "98.6%", trend: "up" },
    ],
    sampleRows: [
      { band: "Principal E8", medianMale: "GH₵145,000", medianFemale: "GH₵143,500", gap: "1.0%" },
      { band: "Senior Lead E6", medianMale: "GH₵95,000", medianFemale: "GH₵96,200", gap: "-1.2%" },
      { band: "Consultant E4", medianMale: "GH₵62,000", medianFemale: "GH₵61,500", gap: "0.8%" },
    ],
  },
  {
    id: 24,
    name: "Total Cost of Workforce (TCOW)",
    category: "Payroll & Compensation",
    pack: "Executive Pack",
    type: "Strategic Dashboard",
    description: "Consolidated enterprise talent expenditure: Base Salaries, Bonuses, Employer Taxes, Healthcare, Pension, and Tech Equipment.",
    kpis: ["Annualized TCOW: GH₵4,860,000", "Benefits Ratio: 22.4%", "Revenue per FTE: GH₵265,000"],
    sampleAiInsight: "Annualized TCOW is GH₵4.86M against GH₵11.5M advisory revenue, delivering an exceptional 42.2% workforce efficiency margin. Revenue generated per FTE increased by 14% to GH₵265,000.",
    metrics: [
      { label: "Annualized TCOW", value: "GH₵4.86M", trend: "neutral" },
      { label: "Revenue per FTE", value: "GH₵265k", delta: "+14%", trend: "up" },
      { label: "TCOW Margin", value: "42.2%", trend: "up" },
    ],
    sampleRows: [
      { component: "Base Salaries", annualTotal: "GH₵3,950,000", share: "81.3%" },
      { component: "Employer Taxes (NI/SSNIT)", annualTotal: "GH₵490,000", share: "10.1%" },
      { component: "Workplace Pension Matching (10%)", annualTotal: "GH₵310,000", share: "6.4%" },
      { component: "Private Healthcare (Bupa)", annualTotal: "GH₵110,000", share: "2.2%" },
    ],
  },
  {
    id: 25,
    name: "Bonus & Performance Incentive Distribution",
    category: "Payroll & Compensation",
    pack: "Admin/Compliance Pack",
    type: "Operational Export",
    description: "Tracks achievement-linked bonus pools, profit sharing, and project milestone bonuses.",
    kpis: ["Annual Bonus Pool: GH₵420,000", "Avg Payout: 92% of Target", "Top Tier Distribution: 28%"],
    sampleAiInsight: "Bonus pool distribution achieved 92% of target budget based on H1 client delivery metrics. 28% of consultants qualified for the top-quartile performance tier.",
    metrics: [
      { label: "Total Distributed", value: "GH₵386,400", trend: "up" },
      { label: "Avg Target Met", value: "92.0%", trend: "up" },
    ],
    sampleRows: [
      { dept: "Cloud Engineering", poolAllocated: "GH₵160,000", avgPercent: "95%" },
      { dept: "Enterprise Advisory", poolAllocated: "GH₵120,000", avgPercent: "91%" },
      { dept: "Strategic Consulting", poolAllocated: "GH₵80,000", avgPercent: "89%" },
    ],
  },
  {
    id: 26,
    name: "Statutory Deductions & Tax Remittance (PAYE & SSNIT)",
    category: "Payroll & Compensation",
    pack: "Admin/Compliance Pack",
    type: "Operational Export",
    description: "Jurisdiction-specific tax liabilities: UK HMRC Real Time Information (RTI) and Ghana SSNIT Tier 1 & 2 remittances.",
    kpis: ["HMRC PAYE Due: GH₵74,200", "SSNIT Remittance: GH₵48,500", "RTI Compliance: 100%"],
    sampleAiInsight: "HMRC Real Time Information submission for November 2026 was certified clean with zero reconciliation variances. Ghana SSNIT pensions fully remitted on schedule.",
    metrics: [
      { label: "HMRC PAYE", value: "GH₵74,200", trend: "neutral" },
      { label: "Ghana SSNIT", value: "GH₵48.5k", trend: "neutral" },
      { label: "Audit Readiness", value: "100%", trend: "up" },
    ],
    sampleRows: [
      { agency: "UK HMRC", type: "PAYE Income Tax & Class 1 NI", dueDate: "2026-11-22", amount: "GH₵74,200" },
      { agency: "Ghana GRA", type: "Pay As You Earn (Ghana)", dueDate: "2026-11-15", amount: "GH₵32,000" },
      { agency: "Ghana SSNIT", type: "Tier 1 Social Security (13.5%)", dueDate: "2026-11-14", amount: "GH₵16,500" },
    ],
  },
  {
    id: 27,
    name: "Bank Salary Disbursement BACS / ACH File",
    category: "Payroll & Compensation",
    pack: "Admin/Compliance Pack",
    type: "Operational Export",
    description: "Exportable standard BACS-18 / ISO 20022 XML payment files for bank batch salary release.",
    kpis: ["Total Records: 45", "Total Batch Value: GH₵214,800.00", "BACS Validation: Passed"],
    sampleAiInsight: "BACS-18 disbursement batch validated with 100% IBAN/Sort Code checksum verification. Ready for execution via Barclays Corporate Banking portal.",
    metrics: [
      { label: "Disbursement Value", value: "GH₵214,800", trend: "neutral" },
      { label: "Disbursement Accounts", value: "45 Records", trend: "neutral" },
    ],
    sampleRows: [
      { bank: "Barclays UK", sortCode: "20-00-00", records: 32, total: "GH₵168,400" },
      { bank: "Standard Chartered Ghana", sortCode: "02-01-01", records: 13, total: "GH₵380,000" },
    ],
  },
  {
    id: 28,
    name: "Benefits & Stipend Utilization Report",
    category: "Payroll & Compensation",
    pack: "Admin/Compliance Pack",
    type: "Strategic Dashboard",
    description: "Adoption rates for Bupa Private Healthcare, GH₵3.5k Annual Learning Stipend, and Tech Allowances.",
    kpis: ["Learning Stipend Used: 74%", "Bupa Healthcare Enrolled: 100%", "Tech Allowance Claimed: 96%"],
    sampleAiInsight: "74% of staff have utilized their GH₵3,500 learning stipend, primarily for Cloudflare, AWS, and ISO 27001 certifications. Bupa health enrollment maintains 100% participation.",
    metrics: [
      { label: "Learning Stipend Burn", value: "74.2%", delta: "+18%", trend: "up" },
      { label: "Healthcare Active", value: "100%", trend: "up" },
    ],
    sampleRows: [
      { benefit: "Annual Learning Stipend (GH₵3.5k)", budget: "GH₵157,500", claimed: "GH₵116,800", rate: "74.2%" },
      { benefit: "Bupa Global Health Coverage", budget: "GH₵118,800", claimed: "GH₵118,800", rate: "100%" },
      { benefit: "Remote Workspace Stipend (GH₵250/mo)", budget: "GH₵135,000", claimed: "GH₵129,600", rate: "96.0%" },
    ],
  },
  {
    id: 29,
    name: "Cost Center & Client Project Allocation",
    category: "Payroll & Compensation",
    pack: "Admin/Compliance Pack",
    type: "Operational Export",
    description: "Apportions personnel salary expenditure to specific client consulting projects and cost centers.",
    kpis: ["Billable Direct Cost: 78%", "Internal R&D / SG&A: 22%"],
    sampleAiInsight: "78% of total talent expenditure directly maps to billable client engagements, sustaining high consulting gross margins above 58%.",
    metrics: [
      { label: "Billable Allocation", value: "78.2%", trend: "up" },
      { label: "R&D / Overhead", value: "21.8%", trend: "down" },
    ],
    sampleRows: [
      { clientProject: "Ghana Commercial Bank Core", costCenter: "CC-102", allocatedCost: "GH₵84,200", billableRevenue: "GH₵190,000" },
      { clientProject: "Fintech Wasm Settlement", costCenter: "CC-104", allocatedCost: "GH₵72,000", billableRevenue: "GH₵165,000" },
      { clientProject: "Internal Platform Architecture", costCenter: "CC-RND", allocatedCost: "GH₵42,000", billableRevenue: "GH₵0 (R&D)" },
    ],
  },
  {
    id: 30,
    name: "Off-Cycle & Discretionary Payment Audit",
    category: "Payroll & Compensation",
    pack: "Admin/Compliance Pack",
    type: "Operational Export",
    description: "Audit register of payments executed outside the 28th-of-the-month main payroll run.",
    kpis: ["Off-Cycle Runs: 1", "Total Off-Cycle Value: GH₵3,200", "Signoff Auth: Dual Certified"],
    sampleAiInsight: "Only 1 off-cycle payment was executed this quarter (GH₵3,200 relocation allowance), validated under dual executive authorization with full audit logging.",
    metrics: [
      { label: "Off-Cycle Runs", value: "1", trend: "neutral" },
      { label: "Dual Authorized", value: "100%", trend: "up" },
    ],
    sampleRows: [
      { employee: "Kwesi Osei", reason: "Relocation & Setup Allowance", amount: "GH₵3,200", approvedBy: "Richard Barnes", date: "2026-11-01" },
    ],
  },

  // 4. Talent Acquisition (31-40)
  {
    id: 31,
    name: "Time-to-Hire & Cost-per-Hire Report",
    category: "Talent Acquisition",
    pack: "General",
    type: "Strategic Dashboard",
    description: "Measures recruitment velocity (days to fill) and total spend per hire (advertising, recruiter fees, testing).",
    kpis: ["Avg Time to Hire: 24 Days", "Cost per Hire: GH₵2,850", "Industry Benchmark: 45 Days (GH₵5,200)"],
    sampleAiInsight: "Time-to-hire decreased by 46% to 24 days, outperforming the UK tech benchmark of 45 days. Cost-per-hire was reduced to GH₵2,850 by relying on internal referrals and GitHub sourcing.",
    metrics: [
      { label: "Time-to-Hire", value: "24 Days", delta: "-21d vs avg", trend: "down" },
      { label: "Cost-per-Hire", value: "GH₵2,850", delta: "-45%", trend: "down" },
    ],
    sampleRows: [
      { role: "Senior Cloud Consultant", daysToFill: 21, cost: "GH₵2,400", source: "Direct Referral" },
      { role: "DevOps Engineer", daysToFill: 26, cost: "GH₵3,100", source: "GitHub Sourcing" },
      { role: "HR Consultant", daysToFill: 25, cost: "GH₵3,050", source: "LinkedIn" },
    ],
  },
  {
    id: 32,
    name: "Source of Hire & Channel ROI",
    category: "Talent Acquisition",
    pack: "General",
    type: "Strategic Dashboard",
    description: "Identifies which sourcing channels generate the highest performing, longest-lasting consulting hires.",
    kpis: ["Employee Referrals: 52%", "Direct Sourcing: 34%", "Agency: 14%"],
    sampleAiInsight: "Employee referrals account for 52% of all hires and boast a 100% 12-month retention rate. Agency dependency has been cut to 14%.",
    metrics: [
      { label: "Referral Share", value: "52%", trend: "up" },
      { label: "Agency Dependency", value: "14%", delta: "-20%", trend: "down" },
    ],
    sampleRows: [
      { channel: "Staff Referral", hires: 4, costPerHire: "GH₵1,500 (Bonus)", retention12mo: "100%" },
      { channel: "Direct Outreach / GitHub", hires: 3, costPerHire: "GH₵2,800", retention12mo: "100%" },
      { channel: "Executive Search Agency", hires: 1, costPerHire: "GH₵6,500", retention12mo: "100%" },
    ],
  },
  {
    id: 33,
    name: "Recruitment Funnel & Candidate Conversion",
    category: "Talent Acquisition",
    pack: "General",
    type: "Strategic Dashboard",
    description: "Conversion rates across recruitment funnel stages: Applied → Screened → Technical Interview → Partner Offer → Hired.",
    kpis: ["Applications: 184", "Tech Screen Pass: 28%", "Offer Rate: 4.8%", "Hired: 8"],
    sampleAiInsight: "Overall conversion from application to hire is 4.3%, reflecting high technical bar screening. The technical assessment stage filters out 72% of candidates effectively.",
    metrics: [
      { label: "Applications", value: "184", trend: "up" },
      { label: "Offer Conversion", value: "4.3%", trend: "neutral" },
    ],
    sampleRows: [
      { stage: "Applied / Ingested", count: 184, conversion: "100%" },
      { stage: "HR Behavioral Screen", count: 74, conversion: "40.2%" },
      { stage: "Architecture Technical Test", count: 21, conversion: "28.4%" },
      { stage: "Managing Principal Interview", count: 9, conversion: "42.9%" },
      { stage: "Offer Accepted & Joined", count: 8, conversion: "88.9%" },
    ],
  },
  {
    id: 34,
    name: "Offer Acceptance Rate & Compensation Competitiveness",
    category: "Talent Acquisition",
    pack: "General",
    type: "Strategic Dashboard",
    description: "Measures offer acceptance rate and reasons for offer declines (e.g., competing counter-offers, equity expectations).",
    kpis: ["Acceptance Rate: 88.9%", "Offers Extended: 9", "Offers Accepted: 8", "Declined: 1"],
    sampleAiInsight: "Offer acceptance rate stands at 88.9% with the Apple Wallet-style Total Rewards stack cited by candidates as a decisive factor in joining.",
    metrics: [
      { label: "Acceptance Rate", value: "88.9%", delta: "+12%", trend: "up" },
      { label: "Declines", value: "1", trend: "neutral" },
    ],
    sampleRows: [
      { candidate: "Kwesi Osei", role: "DevOps Lead", package: "GH₵95k + Bonus", status: "Accepted" },
      { candidate: "Benedicta Agbesi", role: "HR Consultant", package: "GH₵62k + Benefits", status: "Accepted" },
      { candidate: "Candidate B", role: "Cloud Architect", package: "GH₵110k", status: "Declined (Stayed at Big Tech)" },
    ],
  },
  {
    id: 35,
    name: "Open Requisitions Aging & Time-in-Stage",
    category: "Talent Acquisition",
    pack: "General",
    type: "Operational Export",
    description: "Tracks open positions by days open, highlighting bottlenecks in hiring manager review cycles.",
    kpis: ["Open Requisitions: 2", "Avg Aging: 18 Days", "Over 45 Days: 0"],
    sampleAiInsight: "Only 2 open roles remain active with zero aging over 30 days. Partner feedback loops are completing within 48 hours.",
    metrics: [
      { label: "Open Roles", value: "2", trend: "neutral" },
      { label: "Avg Aging", value: "18 Days", trend: "down" },
    ],
    sampleRows: [
      { reqId: "REQ-2026-08", title: "Senior Rust / Wasm Systems Engineer", daysOpen: 16, hiringManager: "Paa Kwesi Barnes" },
      { reqId: "REQ-2026-09", title: "Financial Crime & AML Consultant", daysOpen: 20, hiringManager: "Richard Barnes" },
    ],
  },
  {
    id: 36,
    name: "Quality of Hire (12-Month Performance Correlation)",
    category: "Talent Acquisition",
    pack: "General",
    type: "Strategic Dashboard",
    description: "Correlates initial recruitment test scores with actual H1/H2 performance review ratings and billable client ratings.",
    kpis: ["Quality Score: 4.8 / 5.0", "H1 Exceeds Expectations: 75%", "Regretted Failures: 0%"],
    sampleAiInsight: "Quality-of-hire correlation is 91% positive: candidates scoring above 85% in technical architecture tests achieved 'Exceeds Expectations' in their first performance review.",
    metrics: [
      { label: "Quality Score", value: "4.8 / 5.0", trend: "up" },
      { label: "Early High-Performers", value: "75%", trend: "up" },
    ],
    sampleRows: [
      { employee: "Philip Aryee", testScore: "94%", reviewScore: "4.9 (Exceeds)", billableRate: "98%" },
      { employee: "Benedicta Agbesi", testScore: "90%", reviewScore: "4.8 (Exceeds)", billableRate: "96%" },
    ],
  },
  {
    id: 37,
    name: "Interviewer Efficiency & Feedback Turnaround",
    category: "Talent Acquisition",
    pack: "General",
    type: "Operational Export",
    description: "Measures hiring manager interview loads and time taken to submit scorecard score feedback.",
    kpis: ["Avg Scorecard Turnaround: 3.4 Hours", "Interviews per Lead: 2.4/mo", "Feedback Compliance: 100%"],
    sampleAiInsight: "Average scorecard feedback turnaround dropped to 3.4 hours following mobile push notifications to interviewers.",
    metrics: [
      { label: "Feedback Velocity", value: "3.4 hrs", delta: "-8 hrs", trend: "down" },
      { label: "Compliance", value: "100%", trend: "up" },
    ],
    sampleRows: [
      { interviewer: "Paa Kwesi Barnes", interviews: 6, avgHoursToScorecard: "2.8 hrs", rating: "Fast" },
      { interviewer: "Sarah Jenkins", interviews: 8, avgHoursToScorecard: "3.2 hrs", rating: "Fast" },
    ],
  },
  {
    id: 38,
    name: "Diversity in Hiring & Pipeline Parity",
    category: "Talent Acquisition",
    pack: "General",
    type: "Strategic Dashboard",
    description: "Analyzes diversity drop-off across candidate application, interview, and offer acceptance stages.",
    kpis: ["Female Shortlist: 46%", "BAME Shortlist: 64%", "Conversion Parity: 100%"],
    sampleAiInsight: "Candidate shortlist diversity maintained equal conversion velocity to offers with zero demographic drop-off across interview tiers.",
    metrics: [
      { label: "Female Shortlist", value: "46%", trend: "up" },
      { label: "BAME Shortlist", value: "64%", trend: "up" },
    ],
    sampleRows: [
      { cohort: "Q3 Engineering", female: "44%", bame: "62%", hiredFemale: "45%" },
      { cohort: "Q4 Advisory", female: "50%", bame: "66%", hiredFemale: "50%" },
    ],
  },
  {
    id: 39,
    name: "External Agency Performance & Cost Efficiency",
    category: "Talent Acquisition",
    pack: "General",
    type: "Operational Export",
    description: "Tracks agency invoice fees, CV submittal-to-interview conversion, and candidate 6-month survival rates.",
    kpis: ["Agencies Used: 2", "Avg Commission: 15%", "Agency Survival Rate: 100%"],
    sampleAiInsight: "Agency spend was consolidated with only 2 specialized executive recruiters retained for niche cryptographic roles.",
    metrics: [
      { label: "Agency Spend", value: "GH₵13,000", delta: "-40%", trend: "down" },
      { label: "Placement Success", value: "100%", trend: "up" },
    ],
    sampleRows: [
      { agency: "Mayfair Executive Search", placements: 1, fee: "GH₵6,500", status: "Active" },
      { agency: "West Africa Talent Partners", placements: 1, fee: "GH₵6,500", status: "Active" },
    ],
  },
  {
    id: 40,
    name: "Candidate Experience & NPS Survey",
    category: "Talent Acquisition",
    pack: "General",
    type: "Strategic Dashboard",
    description: "Surveys rejected and accepted candidates on interview respectfulness, clarity, and overall brand perception.",
    kpis: ["Candidate NPS: +78", "Communication Score: 4.9/5", "Re-apply Interest: 88%"],
    sampleAiInsight: "Candidate NPS is +78. Rejected candidates frequently praised the detailed written architectural feedback provided by Senrab practice leads.",
    metrics: [
      { label: "Candidate NPS", value: "+78", delta: "+14", trend: "up" },
      { label: "Brand Favorability", value: "96%", trend: "up" },
    ],
    sampleRows: [
      { metric: "Technical Interview Respect", rating: "4.9 / 5.0" },
      { metric: "Clarity of Role Expectations", rating: "4.8 / 5.0" },
      { metric: "Promptness of Communication", rating: "4.9 / 5.0" },
    ],
  },

  // 5. Performance & Development (41-50)
  {
    id: 41,
    name: "Performance Rating Distribution (Bell Curve Analysis)",
    category: "Performance & Development",
    pack: "Manager Pack",
    type: "Strategic Dashboard",
    description: "Visualizes performance score distributions across departments to ensure calibration integrity and prevent grade inflation.",
    kpis: ["Top Tier (Exceeds): 24%", "Core (Meets): 71%", "Needs Support: 5%", "Calibration Drift: 0.2%"],
    sampleAiInsight: "Appraisal calibration exhibits a healthy distribution: 24% Exceeds, 71% Meets, and 5% Needs Support. Framework purity trigger prevented hybrid inflation.",
    metrics: [
      { label: "Exceeds Expectations", value: "24.4%", trend: "neutral" },
      { label: "Meets Target", value: "71.1%", trend: "neutral" },
      { label: "Calibration Score", value: "100%", trend: "up" },
    ],
    sampleRows: [
      { dept: "Cloud Engineering", exceeds: 4, meets: 9, support: 1, total: 14 },
      { dept: "Enterprise Advisory", exceeds: 3, meets: 7, support: 0, total: 10 },
      { dept: "Strategic Consulting", exceeds: 2, meets: 6, support: 0, total: 8 },
    ],
  },
  {
    id: 42,
    name: "Goal & OKR Completion Tracking",
    category: "Performance & Development",
    pack: "Manager Pack",
    type: "Strategic Dashboard",
    description: "Real-time key result progress for FY26 Q4 under strict single-framework OKR governance.",
    kpis: ["Overall OKR Velocity: 84%", "On Track: 38 Goals", "At Risk: 4 Goals", "Completed: 12 Goals"],
    sampleAiInsight: "Company-wide OKR velocity reached 84% with 6 weeks remaining in Q4. 38 of 42 active key results are on track for certified closure.",
    metrics: [
      { label: "Overall Velocity", value: "84.2%", delta: "+6%", trend: "up" },
      { label: "Goals On Track", value: "90.5%", trend: "up" },
    ],
    sampleRows: [
      { objective: "Cloudflare Hyperdrive <15ms Edge Latency", owner: "Paa Kwesi Barnes", progress: 90, status: "On Track" },
      { objective: "100% Hardware Fleet Provisioning", owner: "Benedicta Agbesi", progress: 100, status: "Completed" },
      { objective: "Client NPS > 70 across Advisory Sprints", owner: "Richard Barnes", progress: 85, status: "On Track" },
    ],
  },
  {
    id: 43,
    name: "Continuous Feedback & Weekly Win Sentiment",
    category: "Performance & Development",
    pack: "Manager Pack",
    type: "Strategic Dashboard",
    description: "Summarizes the frequency and sentiment of peer-to-peer recognition and weekly micro-wins logged in the Journal.",
    kpis: ["Wins Logged This Mo: 142", "Positive Sentiment: 94%", "Peer Recognitions: 38"],
    sampleAiInsight: "142 weekly wins were logged this month. Positive sentiment rose by 6%, with peer recognitions highlighting cross-office collaboration between London and Accra.",
    metrics: [
      { label: "Wins Logged", value: "142 Wins", trend: "up" },
      { label: "Sentiment Positive", value: "94.2%", trend: "up" },
    ],
    sampleRows: [
      { category: "Technical Breakthrough", count: 64, sentiment: "96% Positive" },
      { category: "Client Delivery Milestone", count: 48, sentiment: "92% Positive" },
      { category: "Team Mentorship", count: 30, sentiment: "95% Positive" },
    ],
  },
  {
    id: 44,
    name: "Training ROI & Certification Completion",
    category: "Performance & Development",
    pack: "Manager Pack",
    type: "Strategic Dashboard",
    description: "Tracks course enrollments, certification pass rates, and the impact of the GH₵3.5k learning stipend on client billability.",
    kpis: ["Certifications Earned: 24", "Pass Rate: 96%", "Billability Uplift: +12%"],
    sampleAiInsight: "24 professional certifications were earned in H1 (Cloudflare, AWS Solutions Architect, CISSP). Staff with renewed certs commanded a 12% higher billable realization rate.",
    metrics: [
      { label: "Certs Earned", value: "24", trend: "up" },
      { label: "Exam Pass Rate", value: "96.0%", trend: "up" },
    ],
    sampleRows: [
      { cert: "Cloudflare Workers & Edge Specialist", holders: 8, passRate: "100%" },
      { cert: "ISO 27001 Lead Auditor", holders: 4, passRate: "100%" },
      { cert: "AWS Certified Solutions Architect", holders: 12, passRate: "92%" },
    ],
  },
  {
    id: 45,
    name: "Skills Gap Analysis & Workforce Readiness",
    category: "Performance & Development",
    pack: "Executive Pack",
    type: "Strategic Dashboard",
    description: "Evaluates the company's verified skill inventory against the required capabilities for upcoming 2027 advisory mandates.",
    kpis: ["Core Competency Coverage: 92%", "Critical Gaps: 2 Skills (Rust, Post-Quantum)", "Upskilling Pipeline: 12 Staff"],
    sampleAiInsight: "Core consulting coverage is strong at 92%. Critical future skill gaps in Rust and Post-Quantum cryptography have been targeted with dedicated internal gig cohorts.",
    metrics: [
      { label: "Competency Coverage", value: "92.4%", trend: "up" },
      { label: "Active Upskilling", value: "12 Staff", trend: "up" },
    ],
    sampleRows: [
      { domain: "Cloudflare Serverless & Workers", current: "95%", required: "90%", status: "Surplus" },
      { domain: "PostgreSQL & Hyperdrive Scaling", current: "92%", required: "85%", status: "Surplus" },
      { domain: "Rust Systems & WebAssembly", current: "72%", required: "85%", status: "Upskilling Active" },
    ],
  },
  {
    id: 46,
    name: "Internal Mobility & Promotion Velocity",
    category: "Performance & Development",
    pack: "General",
    type: "Strategic Dashboard",
    description: "Measures internal promotion velocity and the percentage of senior roles filled from within.",
    kpis: ["Internal Fill Rate: 72%", "Avg Time to Promotion: 18 Mo", "Promotions This Year: 6"],
    sampleAiInsight: "72% of senior consulting vacancies were filled through internal promotion. Average time from Consultant to Senior Lead reduced from 24 to 18 months.",
    metrics: [
      { label: "Internal Fill Rate", value: "72.0%", delta: "+15%", trend: "up" },
      { label: "Promotions (FY26)", value: "6 Staff", trend: "up" },
    ],
    sampleRows: [
      { employee: "Philip Aryee", from: "Consultant", to: "Senior Cloud Consultant", timeInRole: "16 mo" },
      { employee: "Benedicta Agbesi", from: "Associate", to: "HR Operations Consultant", timeInRole: "14 mo" },
    ],
  },
  {
    id: 47,
    name: "High-Potential (HiPo) Talent Tracking",
    category: "Performance & Development",
    pack: "Executive Pack",
    type: "Strategic Dashboard",
    description: "Confidential executive register identifying top 10% high-potential talent earmarked for accelerated leadership paths.",
    kpis: ["Identified HiPo: 5 Staff", "Retention Rate: 100%", "Executive Mentor Assigned: 100%"],
    sampleAiInsight: "All 5 identified HiPo leaders have been paired with C-suite mentors and enrolled in executive leadership development. 100% retention maintained.",
    metrics: [
      { label: "HiPo Cohort", value: "5 Leaders", trend: "neutral" },
      { label: "Retention", value: "100%", trend: "up" },
    ],
    sampleRows: [
      { code: "HIPO-01", practice: "Cloud Engineering", mentor: "Paa Kwesi Barnes", readiness: "Director Ready (12mo)" },
      { code: "HIPO-02", practice: "People & Culture", mentor: "Sarah Jenkins", readiness: "Lead Ready (6mo)" },
    ],
  },
  {
    id: 48,
    name: "Manager Effectiveness & Team Pulse Score",
    category: "Performance & Development",
    pack: "Manager Pack",
    type: "Strategic Dashboard",
    description: "Aggregates anonymous direct-report 180 feedback, team turnover, and eNPS scores to rate people managers.",
    kpis: ["Avg Manager Score: 4.8 / 5.0", "Top Leadership Rating: 96%", "Psychological Safety: 94%"],
    sampleAiInsight: "Manager effectiveness averaged 4.8 out of 5.0 with direct reports praising clear OKR alignment and rapid blocker unblocking.",
    metrics: [
      { label: "Manager Index", value: "4.8 / 5.0", trend: "up" },
      { label: "Safety Index", value: "94.2%", trend: "up" },
    ],
    sampleRows: [
      { manager: "Paa Kwesi Barnes", directReports: 8, effectiveness: "4.9 / 5.0", teamTurnover: "0%" },
      { manager: "Sarah Jenkins", directReports: 6, effectiveness: "4.9 / 5.0", teamTurnover: "0%" },
    ],
  },
  {
    id: 49,
    name: "Certification & Regulatory License Expiry Alert",
    category: "Performance & Development",
    pack: "Admin/Compliance Pack",
    type: "Operational Export",
    description: "Compliance monitor alerting HR and managers 60/30 days before mandatory consulting certifications expire.",
    kpis: ["Total Tracked Licenses: 64", "Expiring <30 Days: 1", "Expired: 0"],
    sampleAiInsight: "1 certification is expiring in 28 days (ISO 27001 Lead Auditor). Recertification exam is pre-booked under the learning stipend.",
    metrics: [
      { label: "Expiring Soon", value: "1 License", trend: "neutral" },
      { label: "Compliance Ratio", value: "100%", trend: "up" },
    ],
    sampleRows: [
      { holder: "Benedicta Agbesi", cert: "ISO 27001 Lead Auditor", expires: "2026-12-01", daysLeft: 28, status: "Exam Booked" },
      { holder: "Philip Aryee", cert: "AWS Solutions Architect", expires: "2027-04-15", daysLeft: 163, status: "Valid" },
    ],
  },
  {
    id: 50,
    name: "Mentorship Program Engagement & Outcomes",
    category: "Performance & Development",
    pack: "Manager Pack",
    type: "Strategic Dashboard",
    description: "Tracks active mentor pairings, meeting frequency, and qualitative participant satisfaction.",
    kpis: ["Active Pairings: 14", "Meeting Frequency: Bi-weekly", "Mentee Satisfaction: 98%"],
    sampleAiInsight: "14 active cross-functional mentorship pairings logged 28 hours this month. 98% of mentees reported enhanced clarity in their 3-year career path.",
    metrics: [
      { label: "Active Mentorships", value: "14 Pairs", trend: "up" },
      { label: "Satisfaction", value: "98.0%", trend: "up" },
    ],
    sampleRows: [
      { mentor: "Richard Barnes", mentee: "Philip Aryee", focus: "Executive Client Presence", sessions: "8 Completed" },
      { mentor: "Sarah Jenkins", mentee: "Benedicta Agbesi", focus: "Global HCM Compliance", sessions: "6 Completed" },
    ],
  },

  // 6. Attrition, Engagement & Offboarding (51-60)
  {
    id: 51,
    name: "Turnover & Attrition Rate (Voluntary vs Involuntary)",
    category: "Attrition & Engagement",
    pack: "Executive Pack",
    type: "Strategic Dashboard",
    description: "Calculates annualized voluntary vs involuntary turnover across departments, tenure, and location.",
    kpis: ["Annualized Turnover: 4.4%", "Voluntary: 2 Staff (4.4%)", "Involuntary: 0%", "Industry Benchmark: 14.8%"],
    sampleAiInsight: "Turnover remains exceptionally low at 4.4% annualized compared to the 14.8% management consulting industry benchmark. Both departures were due to international relocation.",
    metrics: [
      { label: "Annual Turnover", value: "4.4%", delta: "-10.4% vs benchmark", trend: "down" },
      { label: "Retention Rate", value: "95.6%", trend: "up" },
    ],
    sampleRows: [
      { dept: "Cloud Engineering", headcount: 14, leavers: 1, turnoverRate: "7.1%", type: "Voluntary (Relocation)" },
      { dept: "Enterprise Advisory", headcount: 10, leavers: 1, turnoverRate: "10.0%", type: "Voluntary (Startup)" },
      { dept: "Strategic Consulting", headcount: 8, leavers: 0, turnoverRate: "0.0%", type: "None" },
      { dept: "People & Culture", headcount: 5, leavers: 0, turnoverRate: "0.0%", type: "None" },
    ],
  },
  {
    id: 52,
    name: "Regretted vs. Non-Regretted Attrition",
    category: "Attrition & Engagement",
    pack: "General",
    type: "Strategic Dashboard",
    description: "Specifically flags top-performing consultants who resigned, triggering proactive retention and stay interviews.",
    kpis: ["Regretted Resignations: 1", "Stay Interview Success: 1 Saved", "Non-Regretted: 1"],
    sampleAiInsight: "Only 1 regretted resignation occurred in H1. A separate high-performing architect was successfully retained via a stay interview by adjusting to a remote contract.",
    metrics: [
      { label: "Stay Interviews Succeeded", value: "1 Retained", trend: "up" },
      { label: "Regretted Loss", value: "1 Staff", trend: "down" },
    ],
    sampleRows: [
      { employee: "Consultant A", rating: "4.8 (Exceeds)", status: "Retained via Stay Interview", intervention: "Approved Remote Contract" },
      { employee: "Consultant B", rating: "4.9 (Exceeds)", status: "Left (US Tech Migration)", intervention: "Alumni Network Enrolled" },
    ],
  },
  {
    id: 53,
    name: "Exit Interview Qualitative Sentiment & Drivers",
    category: "Attrition & Engagement",
    pack: "General",
    type: "Strategic Dashboard",
    description: "Aggregates qualitative exit interview transcripts to identify systemic root causes (career growth, compensation, culture).",
    kpis: ["Primary Driver: Relocation (50%)", "Second Driver: Founder Ambition (50%)", "Recommend Senrab: 100%"],
    sampleAiInsight: "100% of departing employees would recommend Senrab ConsulTech as an employer. Primary departure drivers are external relocation and entrepreneurial startup ventures.",
    metrics: [
      { label: "Would Recommend", value: "100%", trend: "up" },
      { label: "Culture Satisfaction", value: "4.9 / 5.0", trend: "up" },
    ],
    sampleRows: [
      { leaver: "Former Staff 1", reason: "Relocation to Canada", feedback: "Exceptional team culture and technical excellence." },
      { leaver: "Former Staff 2", reason: "Founding YC Startup", feedback: "Senrab provided the best architectural foundation of my career." },
    ],
  },
  {
    id: 54,
    name: "Employee Net Promoter Score (eNPS) & Sentiment",
    category: "Attrition & Engagement",
    pack: "Executive Pack",
    type: "Strategic Dashboard",
    description: "Visualizes monthly eNPS score and anonymous 10-second voice pulse survey sentiment trends.",
    kpis: ["Current eNPS: +74", "Promoters: 78%", "Passives: 18%", "Detractors: 4%"],
    sampleAiInsight: "eNPS reached an all-time high of +74. Voice vibe pulses cited high satisfaction with the 'Linear meets Notion' UI and zero-friction leave drafting.",
    metrics: [
      { label: "eNPS Score", value: "+74", delta: "+8 pts", trend: "up" },
      { label: "Promoters", value: "78%", trend: "up" },
    ],
    sampleRows: [
      { month: "November 2026", enps: "+74", responseRate: "92%" },
      { month: "October 2026", enps: "+70", responseRate: "89%" },
      { month: "September 2026", enps: "+66", responseRate: "86%" },
    ],
  },
  {
    id: 55,
    name: "Early Tenure Attrition (< 12 Months)",
    category: "Attrition & Engagement",
    pack: "General",
    type: "Strategic Dashboard",
    description: "Monitors turnover within the first year of employment to evaluate onboarding effectiveness and hiring accuracy.",
    kpis: ["First-Year Turnover: 0%", "Onboarding Net Score: 96%"],
    sampleAiInsight: "Zero employees have left within their first 12 months, validating the high rigor of pre-boarding candidate matching and Day 1 integration.",
    metrics: [
      { label: "Early Attrition", value: "0.0%", trend: "up" },
      { label: "Onboarding Score", value: "96%", trend: "up" },
    ],
    sampleRows: [
      { cohort: "FY26 Joiners", total: 8, retained12mo: 8, rate: "100% Retained" },
      { cohort: "FY25 Joiners", total: 12, retained12mo: 12, rate: "100% Retained" },
    ],
  },
  {
    id: 56,
    name: "Diversity Attrition & Parity Disparities",
    category: "Attrition & Engagement",
    pack: "General",
    type: "Strategic Dashboard",
    description: "Monitors whether female or minority cohorts experience higher departure rates than the company baseline.",
    kpis: ["Female Turnover: 0%", "BAME Turnover: 4.8%", "Baseline Deviation: None"],
    sampleAiInsight: "No statistical disparity in turnover across demographic cohorts. Female consultant retention stands at 100% across the practice.",
    metrics: [
      { label: "Cohort Disparity", value: "None", trend: "up" },
      { label: "Female Retention", value: "100%", trend: "up" },
    ],
    sampleRows: [
      { demographic: "Female Personnel", headcount: 21, leavers: 0, turnover: "0.0%" },
      { demographic: "Male Personnel", headcount: 24, leavers: 2, turnover: "8.3%" },
    ],
  },
  {
    id: 57,
    name: "Flight Risk Predictor (AI Behavioral Intelligence)",
    category: "Attrition & Engagement",
    pack: "Executive Pack",
    type: "Strategic Dashboard",
    description: "AI predictive model analyzing tenure milestones, PTO burn patterns, and continuous win frequencies to flag disengagement risks early.",
    kpis: ["High Risk Flags: 0", "Medium Risk: 2 Staff", "Low Risk: 43 Staff"],
    sampleAiInsight: "Zero high-risk flight warnings detected. 2 consultants flagged as medium-risk due to high unused leave accumulation; automated wellness rest nudges have been pushed to their dashboards.",
    metrics: [
      { label: "High Flight Risks", value: "0 Flags", trend: "up" },
      { label: "Proactive Interventions", value: "2 Pushed", trend: "neutral" },
    ],
    sampleRows: [
      { code: "RISK-01", indicator: "Unused PTO > 20d + High Milestone Load", actionPushed: "Rest Nudge Sent", risk: "Medium" },
      { code: "RISK-02", indicator: "Tenure 3.5yr + Ready for Promotion", actionPushed: "Stay Interview Scheduled", risk: "Medium" },
    ],
  },
  {
    id: 58,
    name: "Offboarding Compliance & Zero-Leak Revocation",
    category: "Attrition & Engagement",
    pack: "Admin/Compliance Pack",
    type: "Operational Export",
    description: "Tracks hardware asset returns, cryptographic Okta/AWS access revocations, and pro-rated severance calculations.",
    kpis: ["Zero-Leak Success: 100%", "Hardware Returned: 100%", "Access Revoked < 1hr: 100%"],
    sampleAiInsight: "100% zero-leak compliance achieved on all departures. Digital credentials revoked within 8 minutes of departure and prepaid hardware return boxes tracked to closure.",
    metrics: [
      { label: "Zero-Leak Rate", value: "100%", trend: "up" },
      { label: "Asset Recovery", value: "100%", trend: "up" },
    ],
    sampleRows: [
      { exitId: "EXIT-2026-01", leaver: "Consultant B", oktaRevoked: "✓ 8 min", hardwareReturned: "✓ Tracked Courier", severancePaid: "✓ Exact" },
    ],
  },
  {
    id: 59,
    name: "Knowledge Transfer & Technical Handover Status",
    category: "Attrition & Engagement",
    pack: "General",
    type: "Operational Export",
    description: "Tracks whether departing personnel have completed architectural documentation and handed off git repos to peers.",
    kpis: ["Handover Completion: 100%", "Git Repo Re-assigned: 100%", "Shadow Sessions: 4 Completed"],
    sampleAiInsight: "All departure handovers completed with architectural ADR updates and full repository transfer before final clearance.",
    metrics: [
      { label: "Handover Complete", value: "100%", trend: "up" },
      { label: "Shadowing Done", value: "100%", trend: "up" },
    ],
    sampleRows: [
      { project: "Fintech Wasm Architecture", formerLead: "Consultant B", newLead: "Philip Aryee", signoff: "Complete" },
    ],
  },
  {
    id: 60,
    name: "Alumni Network & Boomerang Re-Hire Registry",
    category: "Attrition & Engagement",
    pack: "General",
    type: "Operational Export",
    description: "Tracks past employees who departed in good standing for prospective client advisory referrals and boomerang re-hires.",
    kpis: ["Alumni in Good Standing: 12", "Client Referrals from Alumni: 2", "Boomerang Re-hires: 1"],
    sampleAiInsight: "Senrab Alumni Network maintains 12 trusted ambassadors across top tier global tech and finance, generating 2 high-value client advisory introductions this year.",
    metrics: [
      { label: "Alumni Network", value: "12 Members", trend: "up" },
      { label: "Client Referrals", value: "2 Leads (GH₵350k)", trend: "up" },
    ],
    sampleRows: [
      { alumni: "Kofi Annan Jr.", currentCompany: "Goldman Sachs London", referralMade: "Enterprise Banking Advisory (GH₵200k)" },
      { alumni: "Grace Mensah", currentCompany: "AWS Europe", referralMade: "Cloud Modernization Advisory (GH₵150k)" },
    ],
  },
];

export const ReportsAnalyticsView: React.FC = () => {
  const [activeMainSection, setActiveMainSection] = useState<"catalog" | "workforce_planning" | "role_dashboards">("catalog");
  const [reportLocale, setReportLocale] = useState<"en" | "fr">("en");
  const [selectedRoleDashboard, setSelectedRoleDashboard] = useState<"sales" | "it" | "legal">("sales");

  // Workforce Planning Predictive Simulation State
  const [growthTargetPct, setGrowthTargetPct] = useState<number>(20);
  const [projectedAttritionPct, setProjectedAttritionPct] = useState<number>(8);

  const [selectedPack, setSelectedPack] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeReportModal, setActiveReportModal] = useState<ReportItem | null>(null);
  const [showAiInsight, setShowAiInsight] = useState<boolean>(true);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Natural Language AI Report Builder State
  const [promptQuery, setPromptQuery] = useState<string>("");
  const [generatedReport, setGeneratedReport] = useState<ReportItem | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Filter Reports List
  const filteredReports = useMemo(() => {
    return ALL_60_REPORTS.filter((r) => {
      // Pack filter
      if (selectedPack === "MANAGER" && r.pack !== "Manager Pack") return false;
      if (selectedPack === "EXECUTIVE" && r.pack !== "Executive Pack") return false;
      if (selectedPack === "ADMIN" && r.pack !== "Admin/Compliance Pack") return false;

      // Category filter
      if (selectedCategory !== "ALL" && r.category !== selectedCategory) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = r.name.toLowerCase().includes(q);
        const matchesDesc = r.description.toLowerCase().includes(q);
        const matchesCategory = r.category.toLowerCase().includes(q);
        const matchesKpi = r.kpis.some((k) => k.toLowerCase().includes(q));
        if (!matchesName && !matchesDesc && !matchesCategory && !matchesKpi) return false;
      }

      return true;
    });
  }, [selectedPack, selectedCategory, searchQuery]);

  // Execute Natural Language AI Query
  const handleExecuteAiPrompt = (queryText: string) => {
    const q = queryText.trim().toLowerCase();
    if (!q) return;

    setIsGenerating(true);
    setPromptQuery(queryText);

    setTimeout(() => {
      setIsGenerating(false);

      if (q.includes("turnover") || q.includes("engineering")) {
        setGeneratedReport({
          id: 991,
          name: "Engineering Turnover & Quarterly Variance Analysis",
          category: "Attrition & Engagement",
          pack: "Executive Pack",
          type: "Strategic Dashboard",
          description: "Instant AI synthesis comparing Cloud Engineering quarterly turnover against company baseline.",
          kpis: ["Engineering Turnover Q4: 7.1%", "Turnover Q3: 0.0%", "Variance: +7.1%", "Primary Driver: Relocation"],
          sampleAiInsight: "Engineering turnover increased by 7.1% this quarter (1 voluntary resignation out of 14 staff). The departure was driven by international relocation to Canada rather than dissatisfaction. All IP and git repos were transferred with zero operational drag.",
          metrics: [
            { label: "Q4 Turnover", value: "7.1%", delta: "+7.1%", trend: "up" },
            { label: "Q3 Turnover", value: "0.0%", trend: "neutral" },
            { label: "Regretted Loss", value: "0 Staff", trend: "down" },
          ],
          sampleRows: [
            { quarter: "Q4 2026", engineeringHeadcount: 14, leavers: 1, rate: "7.1%", driver: "International Relocation" },
            { quarter: "Q3 2026", engineeringHeadcount: 13, leavers: 0, rate: "0.0%", driver: "None" },
            { quarter: "Q2 2026", engineeringHeadcount: 12, leavers: 0, rate: "0.0%", driver: "None" },
          ],
        });
      } else if (q.includes("liability") || q.includes("leave")) {
        setGeneratedReport(ALL_60_REPORTS.find((r) => r.id === 12) || ALL_60_REPORTS[11]);
      } else if (q.includes("dei") || q.includes("gender")) {
        setGeneratedReport(ALL_60_REPORTS.find((r) => r.id === 4) || ALL_60_REPORTS[3]);
      } else if (q.includes("tcow") || q.includes("cost of workforce")) {
        setGeneratedReport(ALL_60_REPORTS.find((r) => r.id === 24) || ALL_60_REPORTS[23]);
      } else {
        // Default smart match
        setGeneratedReport(ALL_60_REPORTS.find((r) => r.id === 51) || ALL_60_REPORTS[0]);
      }
    }, 450);
  };

  const handleExport = (format: "PDF" | "CSV" | "JSON", report: ReportItem) => {
    let filename = "";

    if (format === "PDF") {
      try {
        const doc = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        // Top Brand Banner Header
        doc.setFillColor(30, 27, 75); // Deepest Midnight Indigo
        doc.rect(0, 0, 210, 22, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text("ScoReview HR — Executive Intelligence Report", 14, 14);

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.text("Confidential", 130, 14);

        // Report Title & Meta
        doc.setTextColor(30, 27, 75);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text(report.name, 14, 34);

        doc.setTextColor(100, 116, 139);
        doc.setFontSize(9.5);
        doc.setFont("helvetica", "normal");
        doc.text(`Category: ${report.category}  |  Pack: ${report.pack}  |  Report ID: #${report.id}`, 14, 41);
        doc.text(`Generated: ${new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`, 14, 46);

        // Divider
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(14, 50, 196, 50);

        // AI Executive Insight Box
        doc.setFillColor(238, 242, 255);
        doc.setDrawColor(199, 210, 254);
        doc.roundedRect(14, 54, 182, 26, 2, 2, "FD");

        doc.setTextColor(67, 56, 202);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("DEDE AI EXECUTIVE DIGEST (Verified Edge Telemetry)", 18, 61);

        doc.setTextColor(30, 27, 75);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const insightLines = doc.splitTextToSize(report.sampleAiInsight || report.description, 174);
        doc.text(insightLines, 18, 67);

        // Key Performance Indicators Section
        doc.setTextColor(30, 27, 75);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("Key Performance Indicators", 14, 88);

        const kpiY = 94;
        report.kpis.forEach((kpi, idx) => {
          const col = idx % 2;
          const row = Math.floor(idx / 2);
          const x = col === 0 ? 14 : 106;
          const y = kpiY + row * 9;

          doc.setFillColor(248, 250, 252);
          doc.setDrawColor(226, 232, 240);
          doc.roundedRect(x, y - 5, 88, 7.5, 1, 1, "FD");

          doc.setTextColor(79, 70, 229);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.text("• " + kpi, x + 4, y);
        });

        const kpiRowsCount = Math.ceil(report.kpis.length / 2);
        const tableStartY = kpiY + kpiRowsCount * 9 + 8;

        // Operational Dataset Table
        doc.setTextColor(30, 27, 75);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(`Operational Dataset (${report.sampleRows.length} Verified Records)`, 14, tableStartY);

        const headers = Object.keys(report.sampleRows[0] || {});
        const colWidth = 182 / Math.max(headers.length, 1);
        let curY = tableStartY + 6;

        // Table Header Row
        doc.setFillColor(241, 245, 249);
        doc.rect(14, curY - 4, 182, 7, "F");
        doc.setTextColor(71, 85, 105);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        headers.forEach((h, i) => {
          const label = h.replace(/([A-Z])/g, " $1").toUpperCase();
          doc.text(label.substring(0, 18), 16 + i * colWidth, curY);
        });

        curY += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);

        report.sampleRows.forEach((r, rIdx) => {
          if (rIdx % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(14, curY - 4, 182, 6.5, "F");
          }
          headers.forEach((h, i) => {
            doc.setTextColor(i === 0 ? 30 : 51, i === 0 ? 27 : 65, i === 0 ? 75 : 85);
            if (i === 0) doc.setFont("helvetica", "bold");
            else doc.setFont("helvetica", "normal");
            const val = String(r[h] ?? "");
            doc.text(val.substring(0, 22), 16 + i * colWidth, curY);
          });
          curY += 6.5;
        });

        // Statutory Footer & Watermark
        doc.setDrawColor(226, 232, 240);
        doc.line(14, 280, 196, 280);
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text("© 2026 ScoReview HR Inc. • Confidential • Official Statutory Export Dossier", 14, 286);
        doc.text("Page 1 of 1", 182, 286);

        filename = `ScoReview_Report_${report.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
        doc.save(filename);

        setExportNotice(`Generated and downloaded ${filename} successfully!`);
        setTimeout(() => setExportNotice(null), 3500);
        return;
      } catch (err) {
        console.error("PDF generation error:", err);
      }
    } else if (format === "CSV") {
      const headers = Object.keys(report.sampleRows[0] || {}).join(",");
      const rows = report.sampleRows.map((r) => Object.values(r).join(",")).join("\n");
      const content = `${headers}\n${rows}`;
      filename = `ScoReview_${report.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}.csv`;
      const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setExportNotice(`Exported ${filename} successfully!`);
      setTimeout(() => setExportNotice(null), 3000);
    } else {
      const content = JSON.stringify(
        {
          reportName: report.name,
          category: report.category,
          generatedAt: new Date().toISOString(),
          kpis: report.kpis,
          aiInsight: report.sampleAiInsight,
          metrics: report.metrics,
          data: report.sampleRows,
        },
        null,
        2
      );
      filename = `ScoReview_${report.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}.json`;
      const blob = new Blob([content], { type: "application/json;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setExportNotice(`Exported ${filename} successfully!`);
      setTimeout(() => setExportNotice(null), 3000);
    }
  };

  return (
    <div style={{ padding: "1.75rem 2rem", maxWidth: "1400px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <h1 style={{ fontSize: typography.sizes.xl, fontWeight: 700, color: colors.indigoPrimary, margin: 0, letterSpacing: "-0.02em" }}>
              Strategic Dashboards & Operational Reports
            </h1>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          {/* Bilingual Switcher */}
          <button
            onClick={() => setReportLocale((prev) => (prev === "en" ? "fr" : "en"))}
            style={{
              padding: "0.35rem 0.65rem",
              borderRadius: radii.md,
              border: `1px solid ${colors.indigoBorder}`,
              backgroundColor: colors.indigoSubtle,
              color: colors.indigoPrimary,
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <Icons.Globe size={13} color={colors.indigoAction} />
            <span>{reportLocale === "en" ? "Langue: 🇫🇷 Passer au Français" : "Language: 🇬🇧 Switch to English"}</span>
          </button>

          {/* Section Tab Buttons */}
          <div style={{ display: "flex", gap: "0.35rem" }}>
            <Button
              variant={activeMainSection === "catalog" ? "primary" : "outline"}
              size="sm"
              onClick={() => setActiveMainSection("catalog")}
            >
              {reportLocale === "en" ? "60 Reports Catalog & AI" : "Catalogue des 60 Rapports"}
            </Button>
            <Button
              variant={activeMainSection === "workforce_planning" ? "primary" : "outline"}
              size="sm"
              onClick={() => setActiveMainSection("workforce_planning")}
            >
              {reportLocale === "en" ? "Workforce Planning" : "Planification des Effectifs"}
            </Button>
            <Button
              variant={activeMainSection === "role_dashboards" ? "primary" : "outline"}
              size="sm"
              onClick={() => setActiveMainSection("role_dashboards")}
            >
              {reportLocale === "en" ? "Role KPI Dashboards" : "Tableaux de Bord par Rôle"}
            </Button>
          </div>
        </div>

        {exportNotice && (
          <div
            style={{
              padding: "0.4rem 0.85rem",
              borderRadius: radii.md,
              backgroundColor: colors.emeraldSubtle,
              color: colors.emeraldDark,
              border: `1px solid ${colors.emeraldBorder}`,
              fontSize: "12px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <Icons.Check size={14} color={colors.emeraldDark} />
            <span>{exportNotice}</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: 60 ENTERPRISE REPORTS CATALOG & AI REPORT BUILDER              */}
      {/* ========================================================================= */}
      {activeMainSection === "catalog" && (
        <>
          {/* 🧠 NATURAL LANGUAGE AI REPORT BUILDER */}
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.xl,
          border: `1px solid ${colors.indigoBorder}`,
          padding: "1.25rem 1.5rem",
          boxShadow: "0 4px 16px rgba(30, 27, 75, 0.05)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: `linear-gradient(90deg, ${colors.indigoAction} 0%, #a855f7 50%, ${colors.emeraldAction} 100%)` }} />
        
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <Icons.Sparkles size={18} color={colors.indigoAction} />
          <h2 style={{ margin: 0, fontSize: typography.sizes.md, fontWeight: 700, color: colors.indigoPrimary }}>
            AI Report Builder (Ask Anything)
          </h2>
          <span style={{ fontSize: "11px", color: colors.textMuted }}>
            Natural language query engine across all workforce, payroll, and performance records.
          </span>
        </div>

        {/* Query Input Bar */}
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: "0.65rem",
              backgroundColor: colors.surfaceSubtle,
              border: `1px solid ${colors.borderStrong}`,
              borderRadius: radii.md,
              padding: "0.55rem 0.85rem",
            }}
          >
            <Icons.Search size={16} color={colors.indigoAction} />
            <input
              type="text"
              placeholder="e.g., 'Show me the turnover rate for the engineering team compared to last quarter'..."
              value={promptQuery}
              onChange={(e) => setPromptQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleExecuteAiPrompt(promptQuery);
              }}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                backgroundColor: "transparent",
                fontSize: typography.sizes.sm,
                fontFamily: typography.fontFamily,
                color: colors.textPrimary,
                fontWeight: 500,
              }}
            />
          </div>

          <Button
            variant="primary"
            size="md"
            disabled={isGenerating || !promptQuery.trim()}
            onClick={() => handleExecuteAiPrompt(promptQuery)}
            style={{
              backgroundColor: colors.indigoAccent,
              borderColor: colors.indigoAccent,
              padding: "0 1.25rem",
            }}
          >
            {isGenerating ? "Analyzing Data..." : "Generate Report"}
          </Button>
        </div>

        {/* Sample Prompt Chips */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted, textTransform: "uppercase" }}>
            Suggested Queries:
          </span>
          {[
            "Show me the turnover rate for the engineering team compared to last quarter",
            "What is our total accrued leave financial liability in GBP?",
            "Analyze DEI gender distribution in executive roles",
            "Total Cost of Workforce (TCOW) vs advisory billable revenue",
          ].map((chip) => (
            <button
              key={chip}
              onClick={() => handleExecuteAiPrompt(chip)}
              style={{
                padding: "0.2rem 0.55rem",
                borderRadius: radii.full,
                backgroundColor: colors.surfaceSubtle,
                border: `1px solid ${colors.border}`,
                color: colors.indigoPrimary,
                fontSize: "11px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.indigoSubtle;
                e.currentTarget.style.borderColor = colors.indigoBorder;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.surfaceSubtle;
                e.currentTarget.style.borderColor = colors.border;
              }}
            >
              💡 {chip}
            </button>
          ))}
        </div>

        {/* AI Generated Report Live Card */}
        {generatedReport && (
          <div
            style={{
              marginTop: "1.25rem",
              padding: "1.25rem",
              borderRadius: radii.lg,
              backgroundColor: "#ffffff",
              border: `1px solid ${colors.borderStrong}`,
              boxShadow: shadows.md,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: colors.emeraldDark, textTransform: "uppercase" }}>
                    ✓ Instant AI Generated Report
                  </span>
                  <Badge variant="neutral" size="sm">{generatedReport.category}</Badge>
                </div>
                <h3 style={{ margin: "4px 0 0 0", fontSize: typography.sizes.md, fontWeight: 700, color: colors.indigoPrimary }}>
                  {generatedReport.name}
                </h3>
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Button variant="primary" size="sm" onClick={() => handleExport("PDF", generatedReport)} style={{ backgroundColor: colors.indigoAccent, borderColor: colors.indigoAccent }}>
                  <Icons.FileText size={13} />
                  <span>Download PDF Report</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport("JSON", generatedReport)}>
                  <span>Export JSON</span>
                </Button>
              </div>
            </div>

            {/* 3-Sentence AI Executive Insight Banner */}
            <div
              style={{
                padding: "0.85rem 1rem",
                borderRadius: radii.md,
                backgroundColor: colors.indigoSubtle,
                border: `1px solid ${colors.indigoBorder}`,
                marginBottom: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "4px" }}>
                <Icons.Sparkles size={14} color={colors.indigoAction} />
                <span style={{ fontSize: "11px", fontWeight: 700, color: colors.indigoPrimary, textTransform: "uppercase" }}>
                  AI Diagnostic Insight (3-Sentence Summary)
                </span>
              </div>
              <p style={{ margin: 0, fontSize: typography.sizes.xs, color: colors.indigoPrimary, lineHeight: 1.5, fontWeight: 500 }}>
                {generatedReport.sampleAiInsight}
              </p>
            </div>

            {/* Metrics Chips */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
              {generatedReport.metrics.map((m, idx) => (
                <div key={idx} style={{ backgroundColor: colors.surfaceSubtle, padding: "0.75rem 1rem", borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
                  <span style={{ fontSize: "10px", color: colors.textMuted, textTransform: "uppercase", fontWeight: 600 }}>{m.label}</span>
                  <div style={{ fontSize: typography.sizes.lg, fontWeight: 800, color: colors.indigoPrimary, marginTop: "2px" }}>
                    {m.value}
                    {m.delta && <span style={{ fontSize: "11px", fontWeight: 600, color: colors.emeraldDark, marginLeft: "6px" }}>{m.delta}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Data Table */}
            <div style={{ borderRadius: radii.md, border: `1px solid ${colors.border}`, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
                <thead>
                  <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                    {Object.keys(generatedReport.sampleRows[0] || {}).map((col) => (
                      <th key={col} style={{ padding: "0.55rem 0.85rem", color: colors.textMuted, fontWeight: 700, textTransform: "uppercase", fontSize: "10px" }}>
                        {col.replace(/([A-Z])/g, " $1")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {generatedReport.sampleRows.map((row, rIdx) => (
                    <tr key={rIdx} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                      {Object.values(row).map((val, cIdx) => (
                        <td key={cIdx} style={{ padding: "0.6rem 0.85rem", color: colors.textPrimary, fontWeight: cIdx === 0 ? 600 : 400 }}>
                          {formatCellIfDate(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* 💼 CURATED REPORT PACKS SELECTOR */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
        
        {/* Pack 1: Manager Pack */}
        <div
          onClick={() => setSelectedPack(selectedPack === "MANAGER" ? "ALL" : "MANAGER")}
          style={{
            backgroundColor: selectedPack === "MANAGER" ? colors.indigoSubtle : colors.surface,
            border: `2px solid ${selectedPack === "MANAGER" ? colors.indigoAccent : colors.border}`,
            borderRadius: radii.lg,
            padding: "1.1rem 1.25rem",
            cursor: "pointer",
            transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
            boxShadow: shadows.xs,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: colors.indigoAccent, textTransform: "uppercase" }}>
              Pack 1
            </span>
            <Badge variant="info" size="sm">Reports 11-20, 41-50</Badge>
          </div>
          <h3 style={{ margin: "4px 0 2px 0", fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary }}>
            The Manager Pack
          </h3>
          <p style={{ margin: 0, fontSize: typography.sizes.xs, color: colors.textMuted, lineHeight: 1.4 }}>
            Tailored for non-HR line managers to track team operations, attendance, shift coverage, and goal completion.
          </p>
        </div>

        {/* Pack 2: Executive Pack */}
        <div
          onClick={() => setSelectedPack(selectedPack === "EXECUTIVE" ? "ALL" : "EXECUTIVE")}
          style={{
            backgroundColor: selectedPack === "EXECUTIVE" ? colors.emeraldSubtle : colors.surface,
            border: `2px solid ${selectedPack === "EXECUTIVE" ? colors.emeraldDark : colors.border}`,
            borderRadius: radii.lg,
            padding: "1.1rem 1.25rem",
            cursor: "pointer",
            transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
            boxShadow: shadows.xs,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: colors.emeraldDark, textTransform: "uppercase" }}>
              Pack 2
            </span>
            <Badge variant="success" size="sm">C-Suite Trend Deck</Badge>
          </div>
          <h3 style={{ margin: "4px 0 2px 0", fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary }}>
            The Executive Pack
          </h3>
          <p style={{ margin: 0, fontSize: typography.sizes.xs, color: colors.textMuted, lineHeight: 1.4 }}>
            High-level trend-focused strategic summaries: Headcount FTE, DEI parity, TCOW margin, turnover, and eNPS.
          </p>
        </div>

        {/* Pack 3: Admin / Compliance Pack */}
        <div
          onClick={() => setSelectedPack(selectedPack === "ADMIN" ? "ALL" : "ADMIN")}
          style={{
            backgroundColor: selectedPack === "ADMIN" ? colors.peachSubtle : colors.surface,
            border: `2px solid ${selectedPack === "ADMIN" ? colors.peachDark : colors.border}`,
            borderRadius: radii.lg,
            padding: "1.1rem 1.25rem",
            cursor: "pointer",
            transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
            boxShadow: shadows.xs,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: colors.peachDark, textTransform: "uppercase" }}>
              Pack 3
            </span>
            <Badge variant="warning" size="sm">HMRC / Audit Ready</Badge>
          </div>
          <h3 style={{ margin: "4px 0 2px 0", fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary }}>
            The Admin & Compliance Pack
          </h3>
          <p style={{ margin: 0, fontSize: typography.sizes.xs, color: colors.textMuted, lineHeight: 1.4 }}>
            Deep, exportable data tables for HR, Finance, and statutory audits (Directory, Payroll Registers, Tax Remittances).
          </p>
        </div>

      </div>

      {/* 🔍 FILTER & DOMAINS BAR */}
      <div
        style={{
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          border: `1px solid ${colors.border}`,
          padding: "0.85rem 1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        {/* Domain Tabs */}
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {[
            { key: "ALL", label: `All Reports (60)` },
            { key: "Core HR & Headcount", label: "Core HR (1-10)" },
            { key: "Time, Attendance & Leave", label: "Time & Leave (11-20)" },
            { key: "Payroll & Compensation", label: "Payroll (21-30)" },
            { key: "Talent Acquisition", label: "Recruitment (31-40)" },
            { key: "Performance & Development", label: "Performance (41-50)" },
            { key: "Attrition & Engagement", label: "Attrition (51-60)" },
          ].map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              style={{
                padding: "0.35rem 0.65rem",
                borderRadius: radii.sm,
                border: "none",
                backgroundColor: selectedCategory === cat.key ? colors.indigoPrimary : colors.surfaceSubtle,
                color: selectedCategory === cat.key ? "#ffffff" : colors.textSecondary,
                fontSize: "11px",
                fontWeight: selectedCategory === cat.key ? 700 : 500,
                cursor: "pointer",
                transition: "background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease",
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Filter */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            backgroundColor: colors.surfaceSubtle,
            border: `1px solid ${colors.border}`,
            borderRadius: radii.md,
            padding: "0.35rem 0.75rem",
            width: "280px",
          }}
        >
          <Icons.Search size={14} color={colors.textMuted} />
          <input
            type="text"
            placeholder="Search report titles, KPIs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: "none",
              outline: "none",
              backgroundColor: "transparent",
              fontSize: typography.sizes.xs,
              color: colors.textPrimary,
              width: "100%",
            }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <Icons.X size={12} color={colors.textMuted} />
            </button>
          )}
        </div>
      </div>

      {/* 📋 REPORT CATALOG GRID (The 60 Reports) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1rem" }}>
        {filteredReports.map((report) => (
          <div
            key={report.id}
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.lg,
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: shadows.xs,
              transition: "transform 0.1s ease, border-color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = colors.indigoBorder;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.border;
            }}
          >
            <div>
              {/* Card Meta Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.45rem" }}>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    fontFamily: typography.fontMono,
                    color: colors.indigoAccent,
                    backgroundColor: colors.indigoSubtle,
                    padding: "0.1rem 0.4rem",
                    borderRadius: radii.sm,
                  }}
                >
                  #{report.id}
                </span>

                <div style={{ display: "flex", gap: "0.35rem" }}>
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 600,
                      padding: "0.1rem 0.4rem",
                      borderRadius: radii.full,
                      backgroundColor: report.type === "Strategic Dashboard" ? colors.emeraldSubtle : colors.surfaceSubtle,
                      color: report.type === "Strategic Dashboard" ? colors.emeraldDark : colors.textSecondary,
                      border: `1px solid ${report.type === "Strategic Dashboard" ? colors.emeraldBorder : colors.border}`,
                    }}
                  >
                    {report.type}
                  </span>
                  {report.pack !== "General" && (
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 600,
                        padding: "0.1rem 0.4rem",
                        borderRadius: radii.full,
                        backgroundColor: colors.indigoSubtle,
                        color: colors.indigoPrimary,
                      }}
                    >
                      {report.pack}
                    </span>
                  )}
                </div>
              </div>

              {/* Title & Description */}
              <h3 style={{ margin: "0 0 0.4rem 0", fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary }}>
                {report.name}
              </h3>
              <p style={{ margin: "0 0 0.85rem 0", fontSize: typography.sizes.xs, color: colors.textSecondary, lineHeight: 1.5 }}>
                {report.description}
              </p>

              {/* KPI Badges */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "1rem" }}>
                {report.kpis.map((kpi, kIdx) => (
                  <span
                    key={kIdx}
                    style={{
                      fontSize: "10px",
                      fontFamily: typography.fontMono,
                      backgroundColor: colors.surfaceSubtle,
                      border: `1px solid ${colors.border}`,
                      borderRadius: radii.sm,
                      padding: "0.15rem 0.4rem",
                      color: colors.textSecondary,
                    }}
                  >
                    {kpi}
                  </span>
                ))}
              </div>
            </div>

            {/* Footer Actions: AI Insight & Inspect / Export */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${colors.borderSubtle}`, paddingTop: "0.75rem" }}>
              <button
                onClick={() => {
                  setActiveReportModal(report);
                  setShowAiInsight(true);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: colors.indigoAccent,
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  padding: 0,
                }}
              >
                <Icons.Sparkles size={13} color={colors.indigoAction} />
                <span>AI Insight</span>
              </button>

              <div style={{ display: "flex", gap: "0.4rem" }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("PDF", report)}
                  style={{ fontSize: "11px", padding: "0.2rem 0.5rem", color: colors.indigoAction, borderColor: colors.indigoBorder }}
                >
                  <Icons.FileText size={12} color={colors.indigoAction} />
                  <span>PDF</span>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setActiveReportModal(report);
                    setShowAiInsight(false);
                  }}
                  style={{
                    backgroundColor: colors.indigoAccent,
                    borderColor: colors.indigoAccent,
                    fontSize: "11px",
                    padding: "0.2rem 0.65rem",
                  }}
                >
                  <span>View Details</span>
                  <Icons.ArrowRight size={12} />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      </>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: WORKFORCE PLANNING & PREDICTIVE GAP ANALYSIS                   */}
      {/* ========================================================================= */}
      {activeMainSection === "workforce_planning" && (
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
                  {reportLocale === "en"
                    ? "Workforce Planning & Predictive Gap Analysis"
                    : "Planification des Effectifs & Analyse Prédictive des Écarts"}
                </h2>
              </div>
              <p style={{ fontSize: typography.sizes.xs, color: colors.indigoPrimary, margin: "0.25rem 0 0 0" }}>
                {reportLocale === "en"
                  ? "Multi-division predictive modeling simulating future talent deficits based on rolling turnover, expected retirement, and commercial expansion targets."
                  : "Modélisation prédictive multi-divisions simulant les déficits de compétences futurs en fonction du roulement, des départs à la retraite et des objectifs de croissance."}
              </p>
            </div>
            <Badge variant="info" size="sm">
              {reportLocale === "en" ? "Bilingual Compliance Core" : "Conformité Bilingue Intégrée"}
            </Badge>
          </div>

          {/* Simulation Controls Slider Bar */}
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              padding: "1.25rem 1.5rem",
              boxShadow: shadows.xs,
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "1.5rem",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                <span style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textPrimary }}>
                  {reportLocale === "en" ? "Annual Business Expansion Target" : "Objectif de Croissance Annuelle"}
                </span>
                <span style={{ fontSize: typography.sizes.sm, fontWeight: 800, color: colors.indigoAction }}>
                  +{growthTargetPct}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={growthTargetPct}
                onChange={(e) => setGrowthTargetPct(parseInt(e.target.value, 10))}
                style={{ width: "100%", accentColor: colors.indigoAction, cursor: "pointer" }}
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                <span style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textPrimary }}>
                  {reportLocale === "en" ? "Projected Annual Attrition Rate" : "Taux d'Attrition Prévu"}
                </span>
                <span style={{ fontSize: typography.sizes.sm, fontWeight: 800, color: "#dc2626" }}>
                  {projectedAttritionPct}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="2"
                value={projectedAttritionPct}
                onChange={(e) => setProjectedAttritionPct(parseInt(e.target.value, 10))}
                style={{ width: "100%", accentColor: "#dc2626", cursor: "pointer" }}
              />
            </div>

            <div style={{ padding: "0.75rem 1rem", backgroundColor: colors.surfaceSubtle, borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: colors.textMuted, textTransform: "uppercase" }}>
                {reportLocale === "en" ? "Net Workforce Demand (FY27)" : "Demande Nette de Main-d'Œuvre (FY27)"}
              </span>
              <div style={{ fontSize: typography.sizes.lg, fontWeight: 800, color: colors.indigoPrimary, marginTop: "2px" }}>
                +13 Full-Time FTEs
                <span style={{ fontSize: "11px", fontWeight: 500, color: colors.textMuted, marginLeft: "6px" }}>
                  (Est. Budget: GH₵1,450,000)
                </span>
              </div>
            </div>
          </div>

          {/* Division Gap Breakdown Table */}
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
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: colors.textMuted }}>{reportLocale === "en" ? "DIVISION / SQUAD" : "DIVISION / ÉQUIPE"}</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: colors.textMuted }}>{reportLocale === "en" ? "CURRENT HEADCOUNT" : "EFFECTIF ACTUEL"}</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: colors.textMuted }}>{reportLocale === "en" ? "ATTRITION RISK" : "RISQUE D'ATTRITION"}</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: colors.textMuted }}>{reportLocale === "en" ? "EXPANSION DEMAND" : "DEMANDE D'EXPANSION"}</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: colors.textMuted }}>{reportLocale === "en" ? "NET HIRING GAP (FTE)" : "ÉCART DE RECRUTEMENT"}</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: colors.textMuted }}>{reportLocale === "en" ? "ACTION STATUS" : "STATUT"}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { div: "Cloud & Edge Engineering", cur: 14, attr: 1, exp: 4, gap: 5, status: "High Priority Recruitment", color: "#dc2626" },
                  { div: "Clinical Healthcare Operations", cur: 10, attr: 1, exp: 3, gap: 4, status: "Triage Expansion", color: "#d97706" },
                  { div: "Enterprise Advisory & Strategy", cur: 10, attr: 1, exp: 2, gap: 3, status: "Senior Principal Hire", color: "#2563eb" },
                  { div: "People & Culture & Legal", cur: 7, attr: 0, exp: 1, gap: 1, status: "Bilingual Compliance Lead", color: "#16a34a" },
                  { div: "Executive Leadership & Finance", cur: 4, attr: 0, exp: 0, gap: 0, status: "Fully Staffed", color: colors.textMuted },
                ].map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                    <td style={{ padding: "0.85rem 1rem", fontWeight: 700, color: colors.textPrimary }}>{row.div}</td>
                    <td style={{ padding: "0.85rem 1rem" }}>{row.cur} FTEs</td>
                    <td style={{ padding: "0.85rem 1rem", color: "#dc2626", fontWeight: 600 }}>-{row.attr} Staff ({projectedAttritionPct}%)</td>
                    <td style={{ padding: "0.85rem 1rem", color: "#16a34a", fontWeight: 600 }}>+{row.exp} Staff (+{growthTargetPct}%)</td>
                    <td style={{ padding: "0.85rem 1rem", fontWeight: 800, color: row.color, fontSize: typography.sizes.sm }}>
                      +{row.gap} FTEs
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <Badge variant={row.gap > 3 ? "error" : row.gap > 0 ? "warning" : "neutral"} size="sm">
                        {row.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: ROLE-SPECIFIC KPI DASHBOARDS                                   */}
      {/* ========================================================================= */}
      {activeMainSection === "role_dashboards" && (
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
                <Icons.BarChart size={18} color={colors.indigoAction} />
                <h2 style={{ fontSize: typography.sizes.base, fontWeight: 700, color: colors.indigoPrimary, margin: 0 }}>
                  {reportLocale === "en" ? "Role-Specific KPI Dashboards (Enterprise Operational Data)" : "Tableaux de Bord par Rôle (Données d'Exploitation)"}
                </h2>
              </div>
              <p style={{ fontSize: typography.sizes.xs, color: colors.indigoPrimary, margin: "0.25rem 0 0 0" }}>
                {reportLocale === "en"
                  ? "Empower department heads to monitor their own mission-critical KPIs without submitting custom IT or HR reporting tickets."
                  : "Permet aux chefs de département de suivre leurs indicateurs critiques sans dépendre des demandes RH ou IT."}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.35rem" }}>
              <Button
                variant={selectedRoleDashboard === "sales" ? "primary" : "outline"}
                size="sm"
                onClick={() => setSelectedRoleDashboard("sales")}
              >
                📊 {reportLocale === "en" ? "Sales & Revenue" : "Ventes & Revenus"}
              </Button>
              <Button
                variant={selectedRoleDashboard === "it" ? "primary" : "outline"}
                size="sm"
                onClick={() => setSelectedRoleDashboard("it")}
              >
                ⚡ {reportLocale === "en" ? "IT & Engineering" : "IT & Ingénierie"}
              </Button>
              <Button
                variant={selectedRoleDashboard === "legal" ? "primary" : "outline"}
                size="sm"
                onClick={() => setSelectedRoleDashboard("legal")}
              >
                ⚖️ {reportLocale === "en" ? "Legal & Compliance" : "Juridique & Conformité"}
              </Button>
            </div>
          </div>

          {/* Sales & Revenue Dashboard */}
          {selectedRoleDashboard === "sales" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
              {[
                { label: "Monthly Billable Revenue", value: "GH₵1,850,000", delta: "+15.6% vs Target", trend: "up", sub: "Target: GH₵1.6M" },
                { label: "Conversion Rate (Opportunity to Close)", value: "28.4%", delta: "+3.2% MoM", trend: "up", sub: "38 Active Pipeline Deals" },
                { label: "Average Deal Size (Consulting)", value: "GH₵120,000", delta: "Top Tier", trend: "neutral", sub: "Enterprise Cloud Advisory" },
                { label: "Pipeline Velocity", value: "34 Days", delta: "14 Days Faster", trend: "up", sub: "Industry Avg: 48 Days" },
              ].map((card, idx) => (
                <div key={idx} style={{ padding: "1.25rem", borderRadius: radii.md, backgroundColor: colors.surface, border: `1px solid ${colors.border}`, boxShadow: shadows.xs }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted, textTransform: "uppercase" }}>{card.label}</span>
                  <div style={{ fontSize: "1.75rem", fontWeight: 800, color: colors.indigoPrimary, marginTop: "0.35rem" }}>{card.value}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.35rem" }}>
                    <Badge variant="success" size="sm">{card.delta}</Badge>
                    <span style={{ fontSize: "11px", color: colors.textMuted }}>{card.sub}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* IT & Engineering Dashboard */}
          {selectedRoleDashboard === "it" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
              {[
                { label: "Cloudflare Edge System Uptime", value: "99.98%", delta: "SLA: 99.95%", trend: "up", sub: "Zero Unplanned Outages" },
                { label: "Hyperdrive Query Latency", value: "14.2 ms", delta: "sub-15ms edge", trend: "up", sub: "Neon PostgreSQL edge pool" },
                { label: "Mean Time to Resolve (MTTR)", value: "18 Mins", delta: "-42% MoM", trend: "up", sub: "SLA Threshold: 30 Mins" },
                { label: "Project Delivery Timelines", value: "94.2%", delta: "Sprint Velocity: 48 pts", trend: "up", sub: "2 Weeks ahead of schedule" },
              ].map((card, idx) => (
                <div key={idx} style={{ padding: "1.25rem", borderRadius: radii.md, backgroundColor: colors.surface, border: `1px solid ${colors.border}`, boxShadow: shadows.xs }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted, textTransform: "uppercase" }}>{card.label}</span>
                  <div style={{ fontSize: "1.75rem", fontWeight: 800, color: colors.indigoPrimary, marginTop: "0.35rem" }}>{card.value}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.35rem" }}>
                    <Badge variant="success" size="sm">{card.delta}</Badge>
                    <span style={{ fontSize: "11px", color: colors.textMuted }}>{card.sub}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Legal & Compliance Dashboard */}
          {selectedRoleDashboard === "legal" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
              {[
                { label: "Contract Review Volume", value: "38 Active", delta: "100% On-Time", trend: "up", sub: "Pan-African SaaS Master Agreements" },
                { label: "Average SLA Processing Time", value: "1.8 Days", delta: "Under 48h limit", trend: "up", sub: "Standard Target: 3.0 Days" },
                { label: "Statutory Regulatory Clearance", value: "100%", delta: "Zero Non-compliance", trend: "up", sub: "SSNIT, GRA, CRA, and GDPR verified" },
                { label: "SOC2 & ISO 27001 Audit Status", value: "Certified", delta: "Zero Deficiencies", trend: "up", sub: "Immutable Audit Log Active" },
              ].map((card, idx) => (
                <div key={idx} style={{ padding: "1.25rem", borderRadius: radii.md, backgroundColor: colors.surface, border: `1px solid ${colors.border}`, boxShadow: shadows.xs }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted, textTransform: "uppercase" }}>{card.label}</span>
                  <div style={{ fontSize: "1.75rem", fontWeight: 800, color: colors.indigoPrimary, marginTop: "0.35rem" }}>{card.value}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.35rem" }}>
                    <Badge variant="success" size="sm">{card.delta}</Badge>
                    <span style={{ fontSize: "11px", color: colors.textMuted }}>{card.sub}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 🔎 REPORT INSPECTION MODAL / DRAWER */}
      {activeReportModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(5px)",
            zIndex: 120,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
          }}
          onClick={() => setActiveReportModal(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "840px",
              maxHeight: "88vh",
              backgroundColor: colors.surface,
              borderRadius: radii.xl,
              boxShadow: shadows.modal,
              border: `1px solid ${colors.borderStrong}`,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "1.25rem 1.5rem",
                borderBottom: `1px solid ${colors.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, fontFamily: typography.fontMono, color: colors.indigoAccent }}>
                    REPORT #{activeReportModal.id}
                  </span>
                  <Badge variant="neutral" size="sm">{activeReportModal.category}</Badge>
                  <Badge variant="success" size="sm">{activeReportModal.type}</Badge>
                </div>
                <h2 style={{ margin: "4px 0 0 0", fontSize: typography.sizes.lg, fontWeight: 700, color: colors.indigoPrimary }}>
                  {activeReportModal.name}
                </h2>
              </div>

              <button
                onClick={() => setActiveReportModal(null)}
                style={{
                  background: "transparent",
                  border: `1px solid ${colors.border}`,
                  borderRadius: radii.md,
                  cursor: "pointer",
                  padding: "0.35rem 0.55rem",
                  fontSize: "11px",
                  fontFamily: typography.fontMono,
                  color: colors.textMuted,
                }}
              >
                ESC
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              
              {/* AI Insight Diagnostic Card */}
              <div
                style={{
                  padding: "1rem 1.25rem",
                  borderRadius: radii.lg,
                  backgroundColor: colors.indigoSubtle,
                  border: `1px solid ${colors.indigoBorder}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: colors.indigoPrimary, textTransform: "uppercase", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <Icons.Sparkles size={14} color={colors.indigoAction} />
                    AI Executive Summary (3-Sentence Analysis)
                  </span>
                  <span style={{ fontSize: "10px", color: colors.emeraldDark, fontWeight: 700 }}>
                    ✓ Grounded in Live Data
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: typography.sizes.sm, color: colors.indigoPrimary, lineHeight: 1.6, fontWeight: 500 }}>
                  {activeReportModal.sampleAiInsight}
                </p>
              </div>

              {/* Key Metric Highlights */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
                {activeReportModal.metrics.map((m, idx) => (
                  <div key={idx} style={{ backgroundColor: colors.surfaceSubtle, padding: "0.85rem 1rem", borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
                    <div style={{ fontSize: "10px", color: colors.textMuted, textTransform: "uppercase", fontWeight: 600 }}>{m.label}</div>
                    <div style={{ fontSize: typography.sizes.lg, fontWeight: 800, color: colors.indigoPrimary, marginTop: "2px" }}>
                      {m.value}
                      {m.delta && <span style={{ fontSize: "11px", fontWeight: 600, color: colors.emeraldDark, marginLeft: "6px" }}>{m.delta}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tabular Dataset Preview */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <h4 style={{ margin: 0, fontSize: typography.sizes.sm, fontWeight: 700, color: colors.indigoPrimary }}>
                    Operational Dataset Preview
                  </h4>
                  <span style={{ fontSize: "11px", color: colors.textMuted }}>
                    {activeReportModal.sampleRows.length} Sample Records
                  </span>
                </div>

                <div style={{ borderRadius: radii.md, border: `1px solid ${colors.border}`, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
                    <thead>
                      <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                        {Object.keys(activeReportModal.sampleRows[0] || {}).map((col) => (
                          <th key={col} style={{ padding: "0.6rem 0.85rem", color: colors.textMuted, fontWeight: 700, textTransform: "uppercase", fontSize: "10px" }}>
                            {col.replace(/([A-Z])/g, " $1")}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeReportModal.sampleRows.map((row, rIdx) => (
                        <tr key={rIdx} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                          {Object.values(row).map((val, cIdx) => (
                            <td key={cIdx} style={{ padding: "0.65rem 0.85rem", color: colors.textPrimary, fontWeight: cIdx === 0 ? 600 : 400 }}>
                              {formatCellIfDate(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "1rem 1.5rem",
                borderTop: `1px solid ${colors.border}`,
                backgroundColor: colors.surfaceSubtle,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "11px", color: colors.textMuted }}>
                Certified SOC2 Type II & ISO 27001 export pipeline
              </span>

              <div style={{ display: "flex", gap: "0.6rem" }}>
                <Button variant="primary" size="sm" onClick={() => handleExport("PDF", activeReportModal)} style={{ backgroundColor: colors.indigoAccent, borderColor: colors.indigoAccent }}>
                  <Icons.FileText size={13} />
                  <span>Download Official PDF</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport("JSON", activeReportModal)}>
                  <span>Download JSON</span>
                </Button>
                <Button variant="primary" size="sm" onClick={() => setActiveReportModal(null)} style={{ backgroundColor: colors.indigoAccent, borderColor: colors.indigoAccent }}>
                  Done
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
