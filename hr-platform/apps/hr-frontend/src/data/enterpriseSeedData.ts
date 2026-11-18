// ==============================================================================
// ScoreviewHR — Comprehensive Enterprise Seed Dataset (Tasks 2, 3, 4)
// Referential Integrity Guarantees:
//   - 8 Departments across 3 Divisions
//   - 18 Job Positions with Grades & Managerial flags
//   - 54 Employees (every employee -> valid department, position, managerId,
//     architecturalRole, and Three-Experience contexts: ESS, MSS, HRMS)
//   - 72 Leave Requests across 12 months (2025-12 to 2026-11) with seasonal peaks
//   - 54 Performance Appraisal Records & 162 Goals across 3 Cycles
// ==============================================================================

import type { ArchitecturalRoleCode, EmploymentEdge, ExperienceContext, ScopeType } from "../domain/orgCore";

export interface SeedDepartment {
  id: string;
  code: string;
  name: string;
  division: string;
  headEmployeeId: number;
  headName: string;
  budgetedHeadcount: number;
}

export interface SeedPosition {
  id: string;
  title: string;
  departmentId: string;
  jobFamily: string;
  grade: string;
  isManagerial: boolean;
}

export interface SeedEmployee {
  id: number;
  staffId: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  departmentId: string;
  departmentName: string;
  teamName: string;
  positionId: string;
  jobTitle: string;
  grade: string;
  office: "Accra" | "London" | "Windhoek";
  managerId: number | null;
  managerName: string | null;
  dottedManagerId?: number | null;
  dottedManagerName?: string | null;
  contractType: "Permanent" | "Fixed-Term" | "Independent Contractor";
  joinDate: string;
  age: number;
  isActive: boolean;
  // Task 3: Three-Experience Architecture assignment
  architecturalRole: ArchitecturalRoleCode;
  architecturalRoles?: ArchitecturalRoleCode[];
  assignedHrUnits?: { unitId: string; unitName: string }[];
  experiences: ExperienceContext[];
  defaultExperience: ExperienceContext;
  scopeType: ScopeType;
  // Seeded Leave & Performance summary fields
  annualEntitlement: number;
  annualUsed: number;
  annualReserved: number;
  annualAvailable: number;
  sickUsed: number;
}

export interface SeedLeaveRequest {
  id: number;
  applicationNumber: string;
  employeeId: number;
  firstName: string;
  lastName: string;
  staffId: string;
  department: string;
  leaveType:
    | "Annual Leave"
    | "Sick Leave"
    | "Casual Leave"
    | "Maternity Leave"
    | "Paternity Leave"
    | "Compassionate Leave"
    | "Study Leave";
  startDate: string; // YYYY-MM-DD (spanning 2025-12 .. 2026-11)
  endDate: string;
  monthKey: string; // YYYY-MM
  requestedDays: number;
  status: "APPROVED" | "PENDING" | "REJECTED" | "CANCELLED";
  reason: string;
  approverId: number;
  approverName: string;
  reliefOfficerName: string;
}

export interface SeedPerformanceRecord {
  id: number;
  employeeId: number;
  employeeName: string;
  staffId: string;
  department: string;
  jobTitle: string;
  reviewerId: number;
  reviewerName: string;
  cycleId: string;
  cycleName: string;
  framework: "BSC" | "OKR" | "MBO";
  goalsTotal: number;
  goalsCompleted: number;
  goalCompletionPct: number;
  selfScore: number; // 1.0 - 5.0
  managerScore: number; // 1.0 - 5.0
  normalizedScore: number; // 0 - 100
  ratingBand:
    | "5 - Exceptional"
    | "4 - Exceeds Expectations"
    | "3 - Meets Expectations"
    | "2 - Developing"
    | "1 - Needs Improvement";
  nineBoxCategory: string;
  reviewStatus: "Completed" | "In Calibration" | "Manager Review" | "Self-Review";
}

export const SEEDED_DEPARTMENTS: SeedDepartment[] = [
  { id: "DEP-EXEC", code: "EXEC", name: "Executive Leadership", division: "Executive Command", headEmployeeId: 1, headName: "Paa Kwesi Barnes", budgetedHeadcount: 4 },
  { id: "DEP-CLOUD", code: "CLOUD", name: "Cloud & Edge Engineering", division: "Technology & Cloud Division", headEmployeeId: 2, headName: "Benedicta Agbesi", budgetedHeadcount: 12 },
  { id: "DEP-FINTECH", code: "FINT", name: "FinTech & Payments Product", division: "Technology & Cloud Division", headEmployeeId: 18, headName: "Marcus Chen", budgetedHeadcount: 8 },
  { id: "DEP-DATA", code: "DATA", name: "Data & AI Platforms", division: "Technology & Cloud Division", headEmployeeId: 11, headName: "Priya Nair", budgetedHeadcount: 6 },
  { id: "DEP-ADV", code: "ADV", name: "Enterprise Advisory", division: "Corporate, People & Advisory Division", headEmployeeId: 6, headName: "Ndapewa Shikongo", budgetedHeadcount: 8 },
  { id: "DEP-PPL", code: "PPL", name: "People & Culture", division: "Corporate, People & Advisory Division", headEmployeeId: 3, headName: "Jemima Richards", budgetedHeadcount: 6 },
  { id: "DEP-FIN", code: "FIN", name: "Finance & Corporate", division: "Corporate, People & Advisory Division", headEmployeeId: 8, headName: "Kojo Antwi", budgetedHeadcount: 5 },
  { id: "DEP-OPS", code: "OPS", name: "Client Services & Operations", division: "Corporate, People & Advisory Division", headEmployeeId: 10, headName: "James Whitfield", budgetedHeadcount: 7 },
];

export const SEEDED_POSITIONS: SeedPosition[] = [
  { id: "POS-01", title: "Managing Principal & CEO", departmentId: "DEP-EXEC", jobFamily: "Executive", grade: "G10", isManagerial: true },
  { id: "POS-02", title: "Managing Director, Technology Division", departmentId: "DEP-EXEC", jobFamily: "Executive", grade: "G9", isManagerial: true },
  { id: "POS-03", title: "Director of Administration & Governance", departmentId: "DEP-EXEC", jobFamily: "Executive", grade: "G9", isManagerial: true },
  { id: "POS-04", title: "Head of Human Resources", departmentId: "DEP-PPL", jobFamily: "People & Culture", grade: "G9", isManagerial: true },
  { id: "POS-05", title: "VP, Cloud & Edge Engineering", departmentId: "DEP-CLOUD", jobFamily: "Engineering", grade: "G8", isManagerial: true },
  { id: "POS-06", title: "Engineering Director, FinTech", departmentId: "DEP-FINTECH", jobFamily: "Engineering", grade: "G8", isManagerial: true },
  { id: "POS-07", title: "Head of Data & AI Platforms", departmentId: "DEP-DATA", jobFamily: "Data & AI", grade: "G8", isManagerial: true },
  { id: "POS-08", title: "Director, Enterprise Advisory", departmentId: "DEP-ADV", jobFamily: "Advisory", grade: "G8", isManagerial: true },
  { id: "POS-09", title: "Head of Finance & Controller", departmentId: "DEP-FIN", jobFamily: "Finance", grade: "G8", isManagerial: true },
  { id: "POS-10", title: "Account & Client Operations Director", departmentId: "DEP-OPS", jobFamily: "Operations", grade: "G8", isManagerial: true },
  { id: "POS-11", title: "Principal Squad Lead", departmentId: "DEP-CLOUD", jobFamily: "Engineering", grade: "G7", isManagerial: true },
  { id: "POS-12", title: "Senior Cloud Infrastructure Engineer", departmentId: "DEP-CLOUD", jobFamily: "Engineering", grade: "G6", isManagerial: false },
  { id: "POS-13", title: "Full-Stack Product Engineer", departmentId: "DEP-FINTECH", jobFamily: "Engineering", grade: "G5", isManagerial: false },
  { id: "POS-14", title: "Machine Learning & Analytics Engineer", departmentId: "DEP-DATA", jobFamily: "Data & AI", grade: "G6", isManagerial: false },
  { id: "POS-15", title: "Management Strategy Consultant", departmentId: "DEP-ADV", jobFamily: "Advisory", grade: "G6", isManagerial: false },
  { id: "POS-16", title: "HR Business Partner & Specialist", departmentId: "DEP-PPL", jobFamily: "People & Culture", grade: "G6", isManagerial: false },
  { id: "POS-17", title: "Corporate Financial & Audit Analyst", departmentId: "DEP-FIN", jobFamily: "Finance", grade: "G5", isManagerial: false },
  { id: "POS-18", title: "Client Success & Operations Specialist", departmentId: "DEP-OPS", jobFamily: "Operations", grade: "G5", isManagerial: false },
];

// Raw 54-Employee Roster with full hierarchy:
// Level 0: #1 Paa Kwesi Barnes (CEO / Managing Principal)
// Level 1 (Division/Exec Heads reporting to #1):
//   - #14 Sarah Jenkins (MD, Technology Division)
//   - #3 Jemima Richards (Head of HR / Corporate & People Division)
//   - #15 Kwame Mensah (Director of Administration & Governance)
// Level 2 (Department Heads):
//   - #2 Benedicta Agbesi (Cloud & Edge, reports to #14)
//   - #18 Marcus Chen (FinTech & Payments, reports to #14)
//   - #11 Priya Nair (Data & AI Platforms, reports to #14)
//   - #6 Ndapewa Shikongo (Enterprise Advisory, reports to #1)
//   - #8 Kojo Antwi (Finance & Corporate, reports to #15)
//   - #10 James Whitfield (Client Services & Ops, reports to #15)
// Level 3 (Squad Leads / Supervisors) & Level 4 (Individual Contributors) across all 8 departments.

interface RawEmpSeed {
  id: number;
  first: string;
  last: string;
  deptId: string;
  team: string;
  posId: string;
  title: string;
  grade: string;
  office: "Accra" | "London" | "Windhoek";
  managerId: number | null;
  dottedId?: number | null;
  contract: "Permanent" | "Fixed-Term" | "Independent Contractor";
  joinDate: string;
  age: number;
  archRole: ArchitecturalRoleCode;
  usedLeave: number;
  reservedLeave: number;
  sickUsed: number;
}

const RAW_EMPLOYEES: RawEmpSeed[] = [
  // Executive Leadership (4)
  { id: 1, first: "Paa Kwesi", last: "Barnes", deptId: "DEP-EXEC", team: "Executive Committee", posId: "POS-01", title: "Managing Principal & CEO", grade: "G10", office: "Accra", managerId: null, contract: "Permanent", joinDate: "2020-01-15", age: 44, archRole: "SUPER_ADMIN", usedLeave: 12, reservedLeave: 5, sickUsed: 0 },
  { id: 14, first: "Sarah", last: "Jenkins", deptId: "DEP-EXEC", team: "Executive Committee", posId: "POS-02", title: "Managing Director, Technology Division", grade: "G9", office: "London", managerId: 1, contract: "Permanent", joinDate: "2020-03-15", age: 39, archRole: "DIVISION_HEAD", usedLeave: 15, reservedLeave: 4, sickUsed: 1 },
  { id: 15, first: "Kwame", last: "Mensah", deptId: "DEP-EXEC", team: "Executive Committee", posId: "POS-03", title: "Director of Administration & Governance", grade: "G9", office: "Accra", managerId: 1, contract: "Permanent", joinDate: "2019-11-01", age: 46, archRole: "EXECUTIVE", usedLeave: 16, reservedLeave: 3, sickUsed: 2 },
  { id: 19, first: "Nana Yaw", last: "Danquah", deptId: "DEP-EXEC", team: "Executive Strategy Office", posId: "POS-15", title: "Chief of Staff & Board Secretary", grade: "G8", office: "Accra", managerId: 1, contract: "Permanent", joinDate: "2021-02-01", age: 37, archRole: "EXECUTIVE", usedLeave: 14, reservedLeave: 2, sickUsed: 0 },

  // People & Culture (6) — Head: #3 Jemima Richards (reports to #1)
  { id: 3, first: "Jemima", last: "Richards", deptId: "DEP-PPL", team: "People Operations Team", posId: "POS-04", title: "Head of Human Resources", grade: "G9", office: "Accra", managerId: 1, contract: "Permanent", joinDate: "2021-03-01", age: 42, archRole: "HR_MANAGER", usedLeave: 15, reservedLeave: 5, sickUsed: 1 },
  { id: 4, first: "Adjoa", last: "Bediako", deptId: "DEP-PPL", team: "People Analytics & Talent Squad", posId: "POS-16", title: "HR Analytics Lead", grade: "G7", office: "Accra", managerId: 3, dottedId: 1, contract: "Permanent", joinDate: "2023-01-10", age: 28, archRole: "HR_OFFICER", usedLeave: 18, reservedLeave: 0, sickUsed: 2 },
  { id: 13, first: "Emmanuel K.", last: "Quarshie", deptId: "DEP-PPL", team: "People Operations Team", posId: "POS-16", title: "HR Operations Lead", grade: "G7", office: "Accra", managerId: 3, contract: "Permanent", joinDate: "2021-05-10", age: 36, archRole: "HR_OFFICER", usedLeave: 14, reservedLeave: 4, sickUsed: 1 },
  { id: 20, first: "Ama", last: "Boateng", deptId: "DEP-PPL", team: "People Operations Team", posId: "POS-16", title: "Senior HR Business Partner", grade: "G6", office: "Accra", managerId: 3, contract: "Permanent", joinDate: "2022-04-12", age: 33, archRole: "HR_OFFICER", usedLeave: 16, reservedLeave: 3, sickUsed: 0 },
  { id: 21, first: "Selorm", last: "Tetteh", deptId: "DEP-PPL", team: "People Analytics & Talent Squad", posId: "POS-16", title: "Talent & Learning Specialist", grade: "G5", office: "Accra", managerId: 4, contract: "Permanent", joinDate: "2023-08-01", age: 27, archRole: "EMPLOYEE", usedLeave: 11, reservedLeave: 4, sickUsed: 1 },
  { id: 22, first: "Lavinia", last: "Amupolo", deptId: "DEP-PPL", team: "People Operations Team", posId: "POS-16", title: "Regional People Partner (Namibia)", grade: "G6", office: "Windhoek", managerId: 13, contract: "Permanent", joinDate: "2023-02-14", age: 31, archRole: "HR_OFFICER", usedLeave: 15, reservedLeave: 2, sickUsed: 0 },

  // Cloud & Edge Engineering (12) — Head: #2 Benedicta Agbesi (reports to #14 Sarah Jenkins)
  { id: 2, first: "Benedicta", last: "Agbesi", deptId: "DEP-CLOUD", team: "Hyperdrive Edge Performance Squad", posId: "POS-05", title: "VP, Cloud & Edge Engineering", grade: "G8", office: "London", managerId: 14, dottedId: 1, contract: "Permanent", joinDate: "2022-03-01", age: 31, archRole: "DEPARTMENT_HEAD", usedLeave: 14, reservedLeave: 5, sickUsed: 1 },
  { id: 5, first: "Philip", last: "Aryee", deptId: "DEP-CLOUD", team: "Hyperdrive Edge Performance Squad", posId: "POS-11", title: "Principal Cloud Squad Lead", grade: "G7", office: "Windhoek", managerId: 2, contract: "Permanent", joinDate: "2022-06-15", age: 29, archRole: "SUPERVISOR", usedLeave: 13, reservedLeave: 4, sickUsed: 0 },
  { id: 17, first: "Kwesi", last: "Osei", deptId: "DEP-CLOUD", team: "Platform Reliability & SRE Squad", posId: "POS-11", title: "Principal DevOps & SRE Lead", grade: "G7", office: "Accra", managerId: 2, contract: "Permanent", joinDate: "2023-02-15", age: 34, archRole: "SUPERVISOR", usedLeave: 10, reservedLeave: 5, sickUsed: 2 },
  { id: 23, first: "Kofi", last: "Agyeman", deptId: "DEP-CLOUD", team: "Hyperdrive Edge Performance Squad", posId: "POS-12", title: "Senior Edge Runtime Engineer", grade: "G6", office: "Accra", managerId: 5, contract: "Permanent", joinDate: "2022-09-01", age: 30, archRole: "EMPLOYEE", usedLeave: 16, reservedLeave: 2, sickUsed: 1 },
  { id: 24, first: "Esi", last: "Mansah", deptId: "DEP-CLOUD", team: "Hyperdrive Edge Performance Squad", posId: "POS-12", title: "Distributed Systems Engineer", grade: "G6", office: "Accra", managerId: 5, contract: "Permanent", joinDate: "2023-01-18", age: 28, archRole: "EMPLOYEE", usedLeave: 14, reservedLeave: 3, sickUsed: 0 },
  { id: 25, first: "Oliver", last: "Thornton", deptId: "DEP-CLOUD", team: "Hyperdrive Edge Performance Squad", posId: "POS-12", title: "Staff Network Protocol Engineer", grade: "G6", office: "London", managerId: 5, contract: "Permanent", joinDate: "2022-11-01", age: 35, archRole: "EMPLOYEE", usedLeave: 18, reservedLeave: 0, sickUsed: 3 },
  { id: 26, first: "Festus", last: "Kamati", deptId: "DEP-CLOUD", team: "Hyperdrive Edge Performance Squad", posId: "POS-12", title: "Cloud Infrastructure Engineer", grade: "G5", office: "Windhoek", managerId: 5, contract: "Permanent", joinDate: "2023-05-15", age: 27, archRole: "EMPLOYEE", usedLeave: 12, reservedLeave: 4, sickUsed: 1 },
  { id: 27, first: "Yaw", last: "Bonsu", deptId: "DEP-CLOUD", team: "Platform Reliability & SRE Squad", posId: "POS-12", title: "Site Reliability Engineer", grade: "G6", office: "Accra", managerId: 17, contract: "Permanent", joinDate: "2022-07-01", age: 31, archRole: "EMPLOYEE", usedLeave: 9, reservedLeave: 5, sickUsed: 0 },
  { id: 28, first: "Akosua", last: "Frimpong", deptId: "DEP-CLOUD", team: "Platform Reliability & SRE Squad", posId: "POS-12", title: "Cloud Security & IAM Engineer", grade: "G6", office: "Accra", managerId: 17, contract: "Permanent", joinDate: "2023-03-10", age: 29, archRole: "EMPLOYEE", usedLeave: 15, reservedLeave: 3, sickUsed: 2 },
  { id: 29, first: "Dave", last: "Nii", deptId: "DEP-CLOUD", team: "Platform Reliability & SRE Squad", posId: "POS-12", title: "IT Infrastructure & Fleet Officer", grade: "G5", office: "Accra", managerId: 17, contract: "Permanent", joinDate: "2023-06-01", age: 26, archRole: "EMPLOYEE", usedLeave: 11, reservedLeave: 2, sickUsed: 1 },
  { id: 30, first: "Hannah", last: "Pendleton", deptId: "DEP-CLOUD", team: "Platform Reliability & SRE Squad", posId: "POS-12", title: "Observability & Telemetry Engineer", grade: "G5", office: "London", managerId: 17, contract: "Fixed-Term", joinDate: "2024-01-15", age: 28, archRole: "EMPLOYEE", usedLeave: 8, reservedLeave: 4, sickUsed: 0 },
  { id: 31, first: "Nii Armah", last: "Quaye", deptId: "DEP-CLOUD", team: "Hyperdrive Edge Performance Squad", posId: "POS-12", title: "Database Kernel Engineer", grade: "G6", office: "Accra", managerId: 5, contract: "Permanent", joinDate: "2022-05-20", age: 33, archRole: "EMPLOYEE", usedLeave: 17, reservedLeave: 3, sickUsed: 1 },

  // FinTech & Payments Product (8) — Head: #18 Marcus Chen (reports to #14 Sarah Jenkins)
  { id: 18, first: "Marcus", last: "Chen", deptId: "DEP-FINTECH", team: "Core Payments & Ledger Squad", posId: "POS-06", title: "Engineering Director, FinTech", grade: "G8", office: "London", managerId: 14, contract: "Permanent", joinDate: "2021-06-01", age: 38, archRole: "DEPARTMENT_HEAD", usedLeave: 16, reservedLeave: 4, sickUsed: 1 },
  { id: 32, first: "Abena", last: "Osei", deptId: "DEP-FINTECH", team: "Mobile & Merchant Checkout Squad", posId: "POS-11", title: "Lead Mobile Product Engineer", grade: "G7", office: "Accra", managerId: 18, dottedId: 2, contract: "Permanent", joinDate: "2022-02-01", age: 30, archRole: "SUPERVISOR", usedLeave: 14, reservedLeave: 3, sickUsed: 0 },
  { id: 33, first: "Tunde", last: "Bakare", deptId: "DEP-FINTECH", team: "Core Payments & Ledger Squad", posId: "POS-13", title: "Senior Settlement Systems Engineer", grade: "G6", office: "Accra", managerId: 18, contract: "Permanent", joinDate: "2022-08-15", age: 32, archRole: "EMPLOYEE", usedLeave: 15, reservedLeave: 5, sickUsed: 2 },
  { id: 34, first: "Chidinma", last: "Okafor", deptId: "DEP-FINTECH", team: "Core Payments & Ledger Squad", posId: "POS-13", title: "Payment Gateway Engineer", grade: "G6", office: "London", managerId: 18, contract: "Permanent", joinDate: "2023-01-09", age: 29, archRole: "EMPLOYEE", usedLeave: 12, reservedLeave: 4, sickUsed: 1 },
  { id: 35, first: "Kwabena", last: "Darko", deptId: "DEP-FINTECH", team: "Mobile & Merchant Checkout Squad", posId: "POS-13", title: "Product Frontend Engineer", grade: "G5", office: "Accra", managerId: 32, contract: "Permanent", joinDate: "2023-04-01", age: 26, archRole: "EMPLOYEE", usedLeave: 10, reservedLeave: 3, sickUsed: 0 },
  { id: 36, first: "Nana Ama", last: "Kusi", deptId: "DEP-FINTECH", team: "Mobile & Merchant Checkout Squad", posId: "POS-13", title: "iOS & Android Engineer", grade: "G5", office: "Accra", managerId: 32, contract: "Permanent", joinDate: "2023-09-01", age: 25, archRole: "EMPLOYEE", usedLeave: 9, reservedLeave: 4, sickUsed: 1 },
  { id: 37, first: "Gideon", last: "Ankrah", deptId: "DEP-FINTECH", team: "Mobile & Merchant Checkout Squad", posId: "POS-13", title: "QA Automation & Release Engineer", grade: "G5", office: "Accra", managerId: 32, contract: "Permanent", joinDate: "2023-05-01", age: 28, archRole: "EMPLOYEE", usedLeave: 13, reservedLeave: 2, sickUsed: 2 },
  { id: 38, first: "Simeon", last: "Shilongo", deptId: "DEP-FINTECH", team: "Core Payments & Ledger Squad", posId: "POS-13", title: "Treasury & Reconciliation Engineer", grade: "G6", office: "Windhoek", managerId: 18, contract: "Permanent", joinDate: "2022-11-15", age: 31, archRole: "EMPLOYEE", usedLeave: 14, reservedLeave: 3, sickUsed: 0 },

  // Data & AI Platforms (6) — Head: #11 Priya Nair (reports to #14 Sarah Jenkins)
  { id: 11, first: "Priya", last: "Nair", deptId: "DEP-DATA", team: "Applied AI & Workforce Intelligence Squad", posId: "POS-07", title: "Head of Data & AI Platforms", grade: "G8", office: "London", managerId: 14, contract: "Permanent", joinDate: "2021-07-01", age: 34, archRole: "DEPARTMENT_HEAD", usedLeave: 15, reservedLeave: 4, sickUsed: 0 },
  { id: 39, first: "John", last: "Asamoah", deptId: "DEP-DATA", team: "Applied AI & Workforce Intelligence Squad", posId: "POS-11", title: "R&D Lead, People Intelligence", grade: "G7", office: "Accra", managerId: 11, contract: "Permanent", joinDate: "2022-02-01", age: 33, archRole: "SUPERVISOR", usedLeave: 12, reservedLeave: 5, sickUsed: 1 },
  { id: 40, first: "Mawuli", last: "Agbeko", deptId: "DEP-DATA", team: "Applied AI & Workforce Intelligence Squad", posId: "POS-14", title: "Senior Machine Learning Engineer", grade: "G6", office: "Accra", managerId: 39, contract: "Permanent", joinDate: "2023-01-15", age: 29, archRole: "EMPLOYEE", usedLeave: 11, reservedLeave: 3, sickUsed: 0 },
  { id: 41, first: "Zainab", last: "Al-Hassan", deptId: "DEP-DATA", team: "Applied AI & Workforce Intelligence Squad", posId: "POS-14", title: "Analytics Engineering Specialist", grade: "G6", office: "Accra", managerId: 39, contract: "Permanent", joinDate: "2023-03-20", age: 28, archRole: "EMPLOYEE", usedLeave: 14, reservedLeave: 2, sickUsed: 1 },
  { id: 42, first: "Liam", last: "O'Connor", deptId: "DEP-DATA", team: "Applied AI & Workforce Intelligence Squad", posId: "POS-14", title: "NLP & Knowledge Graph Engineer", grade: "G6", office: "London", managerId: 11, contract: "Permanent", joinDate: "2022-10-01", age: 31, archRole: "EMPLOYEE", usedLeave: 16, reservedLeave: 4, sickUsed: 2 },
  { id: 43, first: "Helena", last: "Iipumbu", deptId: "DEP-DATA", team: "Applied AI & Workforce Intelligence Squad", posId: "POS-14", title: "BI & Executive Reporting Analyst", grade: "G5", office: "Windhoek", managerId: 11, contract: "Permanent", joinDate: "2023-07-10", age: 27, archRole: "EMPLOYEE", usedLeave: 13, reservedLeave: 2, sickUsed: 0 },

  // Enterprise Advisory (8) — Head: #6 Ndapewa Shikongo (reports to #1 Paa Kwesi Barnes)
  { id: 6, first: "Ndapewa", last: "Shikongo", deptId: "DEP-ADV", team: "Solutions Delivery Squad", posId: "POS-08", title: "Director, Enterprise Advisory", grade: "G8", office: "Windhoek", managerId: 1, contract: "Permanent", joinDate: "2021-09-01", age: 35, archRole: "DEPARTMENT_HEAD", usedLeave: 17, reservedLeave: 3, sickUsed: 1 },
  { id: 7, first: "Tangeni", last: "Haufiku", deptId: "DEP-ADV", team: "Solutions Delivery Squad", posId: "POS-11", title: "Client Delivery Manager", grade: "G7", office: "Windhoek", managerId: 6, contract: "Permanent", joinDate: "2022-01-15", age: 38, archRole: "SUPERVISOR", usedLeave: 15, reservedLeave: 4, sickUsed: 0 },
  { id: 9, first: "Efua", last: "Sarpong", deptId: "DEP-ADV", team: "Public Sector Transformation Guild", posId: "POS-11", title: "Principal Transformation Lead", grade: "G7", office: "Accra", managerId: 6, contract: "Permanent", joinDate: "2022-04-10", age: 32, archRole: "SUPERVISOR", usedLeave: 14, reservedLeave: 5, sickUsed: 1 },
  { id: 44, first: "Julian", last: "Vance", deptId: "DEP-ADV", team: "Public Sector Transformation Guild", posId: "POS-15", title: "Senior Digital Governance Advisor", grade: "G6", office: "London", managerId: 9, contract: "Permanent", joinDate: "2022-06-01", age: 36, archRole: "EMPLOYEE", usedLeave: 18, reservedLeave: 2, sickUsed: 2 },
  { id: 45, first: "Binta", last: "Diallo", deptId: "DEP-ADV", team: "Public Sector Transformation Guild", posId: "POS-15", title: "Organisational Design Consultant", grade: "G6", office: "Accra", managerId: 9, contract: "Permanent", joinDate: "2023-02-01", age: 30, archRole: "EMPLOYEE", usedLeave: 12, reservedLeave: 4, sickUsed: 0 },
  { id: 46, first: "Matheus", last: "Nambahu", deptId: "DEP-ADV", team: "Solutions Delivery Squad", posId: "POS-15", title: "Enterprise Solutions Consultant", grade: "G6", office: "Windhoek", managerId: 7, contract: "Permanent", joinDate: "2023-01-20", age: 29, archRole: "EMPLOYEE", usedLeave: 15, reservedLeave: 3, sickUsed: 1 },
  { id: 47, first: "Serwaa", last: "Adu", deptId: "DEP-ADV", team: "Public Sector Transformation Guild", posId: "POS-15", title: "Change Management Specialist", grade: "G5", office: "Accra", managerId: 9, contract: "Permanent", joinDate: "2023-09-15", age: 27, archRole: "EMPLOYEE", usedLeave: 10, reservedLeave: 3, sickUsed: 0 },
  { id: 48, first: "frieda", last: "Kambonde", deptId: "DEP-ADV", team: "Solutions Delivery Squad", posId: "POS-15", title: "Business Systems Analyst", grade: "G5", office: "Windhoek", managerId: 7, contract: "Permanent", joinDate: "2023-10-01", age: 26, archRole: "EMPLOYEE", usedLeave: 11, reservedLeave: 2, sickUsed: 1 },

  // Finance & Corporate (5) — Head: #8 Kojo Antwi (reports to #15 Kwame Mensah)
  { id: 8, first: "Kojo", last: "Antwi", deptId: "DEP-FIN", team: "Corporate Governance & Audit Committee", posId: "POS-09", title: "Head of Finance & Controller", grade: "G8", office: "Accra", managerId: 15, contract: "Permanent", joinDate: "2021-11-01", age: 37, archRole: "DEPARTMENT_HEAD", usedLeave: 16, reservedLeave: 4, sickUsed: 1 },
  { id: 49, first: "Isaac", last: "Boateng", deptId: "DEP-FIN", team: "Corporate Governance & Audit Committee", posId: "POS-17", title: "Senior Treasury & Audit Manager", grade: "G7", office: "Accra", managerId: 8, contract: "Permanent", joinDate: "2022-03-15", age: 35, archRole: "SUPERVISOR", usedLeave: 14, reservedLeave: 3, sickUsed: 0 },
  { id: 50, first: "abena", last: "Konadu", deptId: "DEP-FIN", team: "Corporate Governance & Audit Committee", posId: "POS-17", title: "Financial Reporting & Tax Analyst", grade: "G6", office: "Accra", managerId: 49, contract: "Permanent", joinDate: "2022-09-10", age: 29, archRole: "EMPLOYEE", usedLeave: 13, reservedLeave: 4, sickUsed: 2 },
  { id: 51, first: "charlotte", last: "Mercer", deptId: "DEP-FIN", team: "Corporate Governance & Audit Committee", posId: "POS-17", title: "Commercial FP&A Analyst", grade: "G6", office: "London", managerId: 49, contract: "Permanent", joinDate: "2023-04-01", age: 30, archRole: "EMPLOYEE", usedLeave: 15, reservedLeave: 2, sickUsed: 1 },
  { id: 52, first: "Joel", last: "Mawutor", deptId: "DEP-FIN", team: "Corporate Governance & Audit Committee", posId: "POS-17", title: "Procurement & Payables Officer", grade: "G5", office: "Accra", managerId: 49, contract: "Permanent", joinDate: "2023-10-18", age: 27, archRole: "EMPLOYEE", usedLeave: 9, reservedLeave: 3, sickUsed: 0 },

  // Client Services & Operations (5) — Head: #10 James Whitfield (reports to #15 Kwame Mensah)
  { id: 10, first: "James", last: "Whitfield", deptId: "DEP-OPS", team: "Customer Success & Service Quality Guild", posId: "POS-10", title: "Account & Client Operations Director", grade: "G8", office: "London", managerId: 15, contract: "Permanent", joinDate: "2020-08-01", age: 41, archRole: "DEPARTMENT_HEAD", usedLeave: 17, reservedLeave: 3, sickUsed: 1 },
  { id: 16, first: "Doreen", last: "Wesley", deptId: "DEP-OPS", team: "Customer Success & Service Quality Guild", posId: "POS-11", title: "Customer Operations Lead", grade: "G7", office: "Accra", managerId: 10, contract: "Permanent", joinDate: "2022-09-01", age: 29, archRole: "SUPERVISOR", usedLeave: 14, reservedLeave: 4, sickUsed: 1 },
  { id: 12, first: "Hilma", last: "Nangolo", deptId: "DEP-OPS", team: "Workforce Logistics & Facilities Squad", posId: "POS-18", title: "Workforce Operations Coordinator", grade: "G6", office: "Windhoek", managerId: 16, contract: "Permanent", joinDate: "2022-10-15", age: 30, archRole: "EMPLOYEE", usedLeave: 13, reservedLeave: 3, sickUsed: 0 },
  { id: 53, first: "Philip", last: "Arthur", deptId: "DEP-OPS", team: "Customer Success & Service Quality Guild", posId: "POS-18", title: "Senior Customer Service Executive", grade: "G5", office: "Accra", managerId: 16, contract: "Permanent", joinDate: "2023-03-01", age: 28, archRole: "EMPLOYEE", usedLeave: 12, reservedLeave: 4, sickUsed: 2 },
  { id: 54, first: "Richard", last: "Mamphey", deptId: "DEP-OPS", team: "Workforce Logistics & Facilities Squad", posId: "POS-18", title: "Regional Client Support Specialist", grade: "G5", office: "Accra", managerId: 16, contract: "Permanent", joinDate: "2023-06-15", age: 27, archRole: "EMPLOYEE", usedLeave: 10, reservedLeave: 5, sickUsed: 0 },
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const roleToExp = (role: ArchitecturalRoleCode): { experiences: ExperienceContext[]; defaultExperience: ExperienceContext; scopeType: ScopeType } => {
  switch (role) {
    case "SUPER_ADMIN":
    case "HR_MANAGER":
      return { experiences: ["ESS", "MSS", "HRMS"], defaultExperience: "HRMS", scopeType: "COMPANY" };
    case "EXECUTIVE":
      return { experiences: ["ESS", "HRMS"], defaultExperience: "HRMS", scopeType: "COMPANY" };
    case "HR_OFFICER":
      return { experiences: ["ESS", "HRMS"], defaultExperience: "HRMS", scopeType: "ORG_UNIT" };
    case "DIVISION_HEAD":
    case "DEPARTMENT_HEAD":
      return { experiences: ["ESS", "MSS"], defaultExperience: "MSS", scopeType: "ORG_UNIT" };
    case "SUPERVISOR":
      return { experiences: ["ESS", "MSS"], defaultExperience: "MSS", scopeType: "TEAM" };
    default:
      return { experiences: ["ESS"], defaultExperience: "ESS", scopeType: "SELF" };
  }
};

const deptById = new Map(SEEDED_DEPARTMENTS.map((d) => [d.id, d]));
const rawById = new Map(RAW_EMPLOYEES.map((e) => [e.id, e]));

export const SEEDED_EMPLOYEES: SeedEmployee[] = RAW_EMPLOYEES.map((r) => {
  const firstName = cap(r.first);
  const lastName = cap(r.last);
  const name = `${firstName} ${lastName}`;
  const email = `${firstName.toLowerCase().replace(/[^a-z]/g, "")}.${lastName.toLowerCase().replace(/[^a-z]/g, "")}@bscscoreview.com`;
  const dept = deptById.get(r.deptId)!;
  const mgr = r.managerId ? rawById.get(r.managerId) : null;
  const mgrName = mgr ? `${cap(mgr.first)} ${cap(mgr.last)}` : null;
  const dotted = r.dottedId ? rawById.get(r.dottedId) : null;
  const dottedName = dotted ? `${cap(dotted.first)} ${cap(dotted.last)}` : null;
  const exp = roleToExp(r.archRole);
  const annualEntitlement = r.grade >= "G8" ? 28 : 25;
  const annualAvailable = Math.max(0, annualEntitlement - r.usedLeave - r.reservedLeave);

  // Task 3 & Context Spec §3.3 / §5.3: Multi-hat role assignments for dual-context staff
  const multiHatMap: Record<
    number,
    { roles: ArchitecturalRoleCode[]; hrUnits?: { unitId: string; unitName: string }[] }
  > = {
    1: { roles: ["SUPER_ADMIN", "DIVISION_HEAD", "HR_MANAGER"] },
    2: {
      roles: ["DEPARTMENT_HEAD", "HR_OFFICER"],
      hrUnits: [{ unitId: "DEP-OPS", unitName: "Unit A · Client Services" }],
    },
    3: { roles: ["DEPARTMENT_HEAD", "HR_MANAGER"] },
    18: {
      roles: ["DEPARTMENT_HEAD", "HR_OFFICER"],
      hrUnits: [{ unitId: "DEP-DATA", unitName: "Unit B · Data & AI" }],
    },
  };
  const multi = multiHatMap[r.id];
  const architecturalRoles = multi?.roles ?? [r.archRole];
  const derivedExperiences: ExperienceContext[] = multi
    ? Array.from(
        new Set<ExperienceContext>(
          architecturalRoles.flatMap((role) => roleToExp(role).experiences),
        ),
      )
    : exp.experiences;

  return {
    id: r.id,
    staffId: `SEN-${String(r.id).padStart(4, "0")}`,
    firstName,
    lastName,
    name,
    email,
    departmentId: r.deptId,
    departmentName: dept.name,
    teamName: r.team,
    positionId: r.posId,
    jobTitle: r.title,
    grade: r.grade,
    office: r.office,
    managerId: r.managerId,
    managerName: mgrName,
    dottedManagerId: r.dottedId ?? null,
    dottedManagerName: dottedName,
    contractType: r.contract,
    joinDate: r.joinDate,
    age: r.age,
    isActive: true,
    architecturalRole: r.archRole,
    architecturalRoles,
    assignedHrUnits: multi?.hrUnits,
    experiences: derivedExperiences,
    defaultExperience: exp.defaultExperience,
    scopeType: exp.scopeType,
    annualEntitlement,
    annualUsed: r.usedLeave,
    annualReserved: r.reservedLeave,
    annualAvailable,
    sickUsed: r.sickUsed,
  };
});

// ==============================================================================
// Task 2: 72 Leave Requests across 12 Consecutive Months (2025-12 .. 2026-11)
// Includes seasonal holiday peaks in Dec 2025, Jul-Aug 2026, and Nov 2026.
// ==============================================================================
const MONTHS_12: { month: string; startDay: string; count: number }[] = [
  { month: "2025-12", startDay: "2025-12-15", count: 8 }, // Year-end peak
  { month: "2026-01", startDay: "2026-01-12", count: 4 },
  { month: "2026-02", startDay: "2026-02-09", count: 5 },
  { month: "2026-03", startDay: "2026-03-10", count: 5 },
  { month: "2026-04", startDay: "2026-04-07", count: 6 }, // Easter window
  { month: "2026-05", startDay: "2026-05-11", count: 5 },
  { month: "2026-06", startDay: "2026-06-15", count: 6 },
  { month: "2026-07", startDay: "2026-07-13", count: 8 }, // Mid-year peak
  { month: "2026-08", startDay: "2026-08-10", count: 9 }, // Summer peak
  { month: "2026-09", startDay: "2026-09-07", count: 5 },
  { month: "2026-10", startDay: "2026-10-12", count: 5 },
  { month: "2026-11", startDay: "2026-11-16", count: 6 }, // Current month active/pending
];

const LEAVE_TYPES_ROTATION: SeedLeaveRequest["leaveType"][] = [
  "Annual Leave",
  "Annual Leave",
  "Annual Leave",
  "Sick Leave",
  "Casual Leave",
  "Study Leave",
  "Compassionate Leave",
  "Paternity Leave",
  "Maternity Leave",
];

export const SEEDED_LEAVE_REQUESTS: SeedLeaveRequest[] = (() => {
  const list: SeedLeaveRequest[] = [];
  let seq = 1;
  for (const m of MONTHS_12) {
    for (let i = 0; i < m.count; i++) {
      const emp = SEEDED_EMPLOYEES[(seq * 3 + i) % SEEDED_EMPLOYEES.length];
      const mgr =
        SEEDED_EMPLOYEES.find((e) => e.id === emp.managerId) || SEEDED_EMPLOYEES[0];
      const relief =
        SEEDED_EMPLOYEES.find(
          (e) => e.departmentId === emp.departmentId && e.id !== emp.id
        ) || SEEDED_EMPLOYEES[1];
      const lType = LEAVE_TYPES_ROTATION[(seq + i) % LEAVE_TYPES_ROTATION.length];
      const days =
        lType === "Maternity Leave"
          ? 60
          : lType === "Paternity Leave"
          ? 10
          : lType === "Annual Leave"
          ? ((seq + i) % 8) + 3
          : lType === "Sick Leave"
          ? ((seq + i) % 3) + 1
          : 2;

      const dayNum = 4 + ((i * 3) % 18);
      const startDate = `${m.month}-${String(dayNum).padStart(2, "0")}`;
      const endDayNum = Math.min(28, dayNum + Math.min(days, 10) - 1);
      const endDate = `${m.month}-${String(endDayNum).padStart(2, "0")}`;

      const status: SeedLeaveRequest["status"] =
        m.month === "2026-11" && i < 4
          ? "PENDING"
          : (seq + i) % 11 === 0
          ? "REJECTED"
          : "APPROVED";

      list.push({
        id: 1000 + seq,
        applicationNumber: `LV-${m.month.replace("-", "")}-${String(seq).padStart(3, "0")}`,
        employeeId: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        staffId: emp.staffId,
        department: emp.departmentName,
        leaveType: lType,
        startDate,
        endDate,
        monthKey: m.month,
        requestedDays: days,
        status,
        reason:
          lType === "Annual Leave"
            ? "Scheduled rest & annual vacation window"
            : lType === "Sick Leave"
            ? "Medical consultation and recovery"
            : lType === "Study Leave"
            ? "Professional certification examination"
            : `${lType} request`,
        approverId: mgr.id,
        approverName: mgr.name,
        reliefOfficerName: relief.name,
      });
      seq++;
    }
  }
  return list;
})();

// ==============================================================================
// Task 2: 54 Seeded Performance Appraisal Records (1 per Employee)
// Realistic Bell-Curve Rating Distribution across BSC, OKR, and MBO frameworks
// ==============================================================================
export const SEEDED_PERFORMANCE_RECORDS: SeedPerformanceRecord[] = SEEDED_EMPLOYEES.map(
  (emp, idx) => {
    const reviewer =
      SEEDED_EMPLOYEES.find((e) => e.id === emp.managerId) || SEEDED_EMPLOYEES[0];

    // Bell-curve distribution: ~15% Exceptional (5), ~30% Exceeds (4), ~40% Meets (3), ~11% Developing (2), ~4% Needs Improvement (1)
    const mod = idx % 20;
    let ratingBand: SeedPerformanceRecord["ratingBand"] = "3 - Meets Expectations";
    let normalizedScore = 76 + (idx % 9);
    let managerScore = 3.6;
    let selfScore = 3.8;
    let nineBox = "Core Player (Medium Perf / Medium Potential)";
    let goalsCompleted = 3;
    const goalsTotal = 4;

    if (mod === 0 || mod === 7 || mod === 14) {
      ratingBand = "5 - Exceptional";
      normalizedScore = 92 + (idx % 7);
      managerScore = 4.8;
      selfScore = 4.6;
      nineBox = "Star Talent (High Perf / High Potential)";
      goalsCompleted = 4;
    } else if (mod === 1 || mod === 3 || mod === 8 || mod === 11 || mod === 15 || mod === 18) {
      ratingBand = "4 - Exceeds Expectations";
      normalizedScore = 84 + (idx % 7);
      managerScore = 4.3;
      selfScore = 4.2;
      nineBox = "High Impact Performer (High Perf / Medium Potential)";
      goalsCompleted = 4;
    } else if (mod === 5 || mod === 12) {
      ratingBand = "2 - Developing";
      normalizedScore = 64 + (idx % 6);
      managerScore = 2.7;
      selfScore = 3.2;
      nineBox = "Inconsistent Player (Low Perf / Medium Potential)";
      goalsCompleted = 2;
    } else if (mod === 19) {
      ratingBand = "1 - Needs Improvement";
      normalizedScore = 54;
      managerScore = 2.1;
      selfScore = 2.8;
      nineBox = "Underperformer — PIP Active";
      goalsCompleted = 1;
    }

    const framework: "BSC" | "OKR" | "MBO" =
      emp.departmentId === "DEP-CLOUD" || emp.departmentId === "DEP-DATA" || emp.departmentId === "DEP-FINTECH"
        ? "OKR"
        : emp.departmentId === "DEP-OPS"
        ? "MBO"
        : "BSC";

    const reviewStatus: SeedPerformanceRecord["reviewStatus"] =
      idx % 9 === 0
        ? "Self-Review"
        : idx % 7 === 0
        ? "Manager Review"
        : idx % 5 === 0
        ? "In Calibration"
        : "Completed";

    return {
      id: 5000 + emp.id,
      employeeId: emp.id,
      employeeName: emp.name,
      staffId: emp.staffId,
      department: emp.departmentName,
      jobTitle: emp.jobTitle,
      reviewerId: reviewer.id,
      reviewerName: reviewer.name,
      cycleId: "CYC-2026-H2",
      cycleName: "FY2026 H2 Performance Appraisal Cycle",
      framework,
      goalsTotal,
      goalsCompleted,
      goalCompletionPct: Math.round((goalsCompleted / goalsTotal) * 100),
      selfScore,
      managerScore,
      normalizedScore,
      ratingBand,
      nineBoxCategory: nineBox,
      reviewStatus,
    };
  }
);

export const SEEDED_EMPLOYMENT_EDGES: EmploymentEdge[] = SEEDED_EMPLOYEES.map((emp) => ({
  id: `SEED-EDGE-${emp.id}`,
  companyId: "COMP-SENRAB-GH",
  employeeId: String(emp.id),
  positionId: emp.positionId,
  orgUnitId: emp.departmentId,
  managerEmployeeId: emp.managerId ? String(emp.managerId) : null,
  startDate: emp.joinDate,
  endDate: null,
  changeReason: "Seeded Org Hierarchy",
}));
