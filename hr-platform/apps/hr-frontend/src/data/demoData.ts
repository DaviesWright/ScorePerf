import type { AssetRecord, EmployeeRecord } from "../components/modules/WorkforceDirectoryView";
import type { ProjectRecord } from "../components/modules/ProjectPortfolioView";
import type { ModuleViewKey } from "../components/shell/AppSidebar";

// Synthetic demo data shared by the demo modules (assets, attendance, disciplinary, policies).
// Nothing here comes from the API or a real person's records, apart from the named demo staff.

export type SiteCode = "ACC" | "LON" | "WDH";

export interface Site {
  code: SiteCode;
  name: string;
  city: string;
  /** IANA zone. Accra and London share UTC+0 in winter, so Windhoek (UTC+2, no DST) is the contrast. */
  timeZone: string;
}

export const SITES: Site[] = [
  { code: "ACC", name: "Accra Global Hub", city: "Accra", timeZone: "Africa/Accra" },
  { code: "LON", name: "London Hub", city: "London", timeZone: "Europe/London" },
  { code: "WDH", name: "Windhoek Hub", city: "Windhoek", timeZone: "Africa/Windhoek" },
];

export const siteOf = (code: SiteCode): Site => SITES.find((s) => s.code === code) as Site;

export interface DemoStaff {
  id: string;
  name: string;
  jobTitle: string;
  department: string;
  site: SiteCode;
  email: string;
}

export const DEMO_STAFF: DemoStaff[] = [
  { id: "EMP-001", name: "Paa Kwesi Barnes", jobTitle: "Managing Principal", department: "Executive Command", site: "ACC", email: "paa.barnes@bscscoreview.com" },
  { id: "EMP-002", name: "Benedicta Agbesi", jobTitle: "Lead Software Engineer", department: "Engineering & Cloud", site: "LON", email: "benedicta.agbesi@bscscoreview.com" },
  { id: "EMP-003", name: "Richard Mamphey", jobTitle: "Head, Human Resources", department: "People Operations", site: "ACC", email: "richard.mamphey@bscscoreview.com" },
  { id: "EMP-004", name: "Adjoa Asare", jobTitle: "HR Analytics Specialist", department: "People Analytics", site: "ACC", email: "adjoa.asare@bscscoreview.com" },
  { id: "EMP-005", name: "Philip Aryee", jobTitle: "Cloud Engineer", department: "Engineering & Cloud", site: "WDH", email: "philip.aryee@bscscoreview.com" },
  { id: "EMP-006", name: "Ndapewa Shikongo", jobTitle: "Solutions Architect", department: "Advisory", site: "WDH", email: "ndapewa.shikongo@bscscoreview.com" },
  { id: "EMP-007", name: "Tangeni Haufiku", jobTitle: "Delivery Manager", department: "Advisory", site: "WDH", email: "tangeni.haufiku@bscscoreview.com" },
  { id: "EMP-008", name: "Kojo Antwi", jobTitle: "Finance Analyst", department: "Finance", site: "ACC", email: "kojo.antwi@bscscoreview.com" },
  { id: "EMP-009", name: "Efua Sarpong", jobTitle: "Senior Consultant", department: "Advisory", site: "ACC", email: "efua.sarpong@bscscoreview.com" },
  { id: "EMP-010", name: "James Whitfield", jobTitle: "Account Director", department: "Client Services", site: "LON", email: "james.whitfield@bscscoreview.com" },
  { id: "EMP-011", name: "Priya Nair", jobTitle: "Data Engineer", department: "Engineering & Cloud", site: "LON", email: "priya.nair@bscscoreview.com" },
  { id: "EMP-012", name: "Hilma Nangolo", jobTitle: "Operations Coordinator", department: "Operations", site: "WDH", email: "hilma.nangolo@bscscoreview.com" },
];

export const DEFAULT_EMPLOYEES: EmployeeRecord[] = [
  {
    id: 1,
    first_name: "Paa Kwesi",
    last_name: "Barnes",
    email: "paa.barnes@bscscoreview.com",
    role: "managing_principal",
    is_active: true,
    department_name: "Executive Leadership",
    team_name: "Executive Committee",
    staff_id: "SEN-0001",
    job_title: "Managing Principal",
    contract_type: "Permanent",
    join_date: "2020-01-15",
    age: 44,
  },
  {
    id: 2,
    first_name: "Benedicta",
    last_name: "Agbesi",
    email: "benedicta.agbesi@bscscoreview.com",
    role: "lead_software_engineer",
    is_active: true,
    department_name: "Cloud & Edge Engineering",
    team_name: "Hyperdrive Edge Performance Squad",
    staff_id: "SEN-0002",
    job_title: "Lead Software Engineer",
    contract_type: "Fixed-Term",
    join_date: "2022-03-01",
    age: 31,
  },
  {
    id: 3,
    first_name: "Richard",
    last_name: "Mamphey",
    email: "richard.mamphey@bscscoreview.com",
    role: "hr_director",
    is_active: true,
    department_name: "People & Culture",
    team_name: "People Operations Team",
    staff_id: "SEN-0003",
    job_title: "Head of Human Resources",
    contract_type: "Permanent",
    join_date: "2021-03-01",
    age: 42,
  },
  {
    id: 4,
    first_name: "Adjoa",
    last_name: "Asare",
    email: "adjoa.asare@bscscoreview.com",
    role: "hr_specialist",
    is_active: true,
    department_name: "People & Culture",
    team_name: "West Africa Talent Onboarding Taskforce",
    staff_id: "SEN-0004",
    job_title: "HR Analytics Specialist",
    contract_type: "Permanent",
    join_date: "2023-01-10",
    age: 28,
  },
  {
    id: 5,
    first_name: "Philip",
    last_name: "Aryee",
    email: "philip.aryee@bscscoreview.com",
    role: "cloud_engineer",
    is_active: true,
    department_name: "Cloud & Edge Engineering",
    team_name: "Hyperdrive Edge Performance Squad",
    staff_id: "SEN-0005",
    job_title: "Cloud Infrastructure Engineer",
    contract_type: "Permanent",
    join_date: "2022-06-15",
    age: 29,
  },
  {
    id: 6,
    first_name: "Ndapewa",
    last_name: "Shikongo",
    email: "ndapewa.shikongo@bscscoreview.com",
    role: "solutions_architect",
    is_active: true,
    department_name: "Enterprise Advisory",
    team_name: "Solutions Delivery Squad",
    staff_id: "SEN-0006",
    job_title: "Senior Solutions Architect",
    contract_type: "Permanent",
    join_date: "2021-09-01",
    age: 35,
  },
  {
    id: 7,
    first_name: "Tangeni",
    last_name: "Haufiku",
    email: "tangeni.haufiku@bscscoreview.com",
    role: "delivery_manager",
    is_active: true,
    department_name: "Enterprise Advisory",
    team_name: "Solutions Delivery Squad",
    staff_id: "SEN-0007",
    job_title: "Client Delivery Manager",
    contract_type: "Permanent",
    join_date: "2022-01-15",
    age: 38,
  },
  {
    id: 8,
    first_name: "Kojo",
    last_name: "Antwi",
    email: "kojo.antwi@bscscoreview.com",
    role: "finance_analyst",
    is_active: true,
    department_name: "Finance & Corporate",
    team_name: "Corporate Governance & Audit Committee",
    staff_id: "SEN-0008",
    job_title: "Senior Financial Analyst",
    contract_type: "Permanent",
    join_date: "2021-11-01",
    age: 33,
  },
  {
    id: 9,
    first_name: "Efua",
    last_name: "Sarpong",
    email: "efua.sarpong@bscscoreview.com",
    role: "senior_consultant",
    is_active: true,
    department_name: "Enterprise Advisory",
    team_name: "Customer Success & Service Quality Guild",
    staff_id: "SEN-0009",
    job_title: "Senior Strategic Consultant",
    contract_type: "Permanent",
    join_date: "2023-04-10",
    age: 32,
  },
  {
    id: 10,
    first_name: "James",
    last_name: "Whitfield",
    email: "james.whitfield@bscscoreview.com",
    role: "account_director",
    is_active: true,
    department_name: "Client Services",
    team_name: "Customer Success & Service Quality Guild",
    staff_id: "SEN-0010",
    job_title: "Client Services Account Director",
    contract_type: "Permanent",
    join_date: "2020-08-01",
    age: 41,
  },
  {
    id: 11,
    first_name: "Priya",
    last_name: "Nair",
    email: "priya.nair@bscscoreview.com",
    role: "data_engineer",
    is_active: true,
    department_name: "Cloud & Edge Engineering",
    team_name: "Hyperdrive Edge Performance Squad",
    staff_id: "SEN-0011",
    job_title: "Data Platform Engineer",
    contract_type: "Permanent",
    join_date: "2023-07-01",
    age: 27,
  },
  {
    id: 12,
    first_name: "Hilma",
    last_name: "Nangolo",
    email: "hilma.nangolo@bscscoreview.com",
    role: "operations_coordinator",
    is_active: true,
    department_name: "Operations & Facilities",
    team_name: "Workforce Logistics & Facilities Squad",
    staff_id: "SEN-0012",
    job_title: "Workforce Operations Coordinator",
    contract_type: "Permanent",
    join_date: "2022-10-15",
    age: 30,
  },
  {
    id: 13,
    first_name: "Emmanuel K.",
    last_name: "Quarshie",
    email: "e.quarshie@bscscoreview.com",
    role: "hr_operations_lead",
    is_active: true,
    department_name: "Operations & Facilities",
    team_name: "West Africa Talent Onboarding Taskforce",
    staff_id: "SEN-0013",
    job_title: "HR Operations Lead",
    contract_type: "Permanent",
    join_date: "2021-05-10",
    age: 36,
  },
  {
    id: 14,
    first_name: "Sarah",
    last_name: "Jenkins",
    email: "sarah.jenkins@bscscoreview.com",
    role: "head_of_operations",
    is_active: true,
    department_name: "Healthcare Operations",
    team_name: "Corporate Information Security Committee",
    staff_id: "SEN-0014",
    job_title: "Head of Healthcare Operations",
    contract_type: "Permanent",
    join_date: "2020-03-15",
    age: 39,
  },
  {
    id: 15,
    first_name: "Kwame",
    last_name: "Mensah",
    email: "kwame.mensah@bscscoreview.com",
    role: "director_administration",
    is_active: true,
    department_name: "Operations & Administration",
    team_name: "Corporate Information Security Committee",
    staff_id: "SEN-0015",
    job_title: "Director of Administration",
    contract_type: "Permanent",
    join_date: "2019-11-01",
    age: 46,
  },
  {
    id: 16,
    first_name: "Clara",
    last_name: "Sampson",
    email: "clara.sampson@bscscoreview.com",
    role: "customer_success_lead",
    is_active: true,
    department_name: "Customer Service",
    team_name: "Customer Success & Service Quality Guild",
    staff_id: "SEN-0016",
    job_title: "Customer Success Lead",
    contract_type: "Permanent",
    join_date: "2022-09-01",
    age: 29,
  },
  {
    id: 17,
    first_name: "Kwesi",
    last_name: "Osei",
    email: "kwesi.osei@bscscoreview.com",
    role: "devops_engineer",
    is_active: true,
    department_name: "Cloud & Edge Engineering",
    team_name: "Hyperdrive Edge Performance Squad",
    staff_id: "SEN-0017",
    job_title: "Senior DevOps Architect",
    contract_type: "Independent Contractor",
    join_date: "2023-02-15",
    age: 34,
  },
];

// Shown only when the API returns no engagements.
export const DEMO_PROJECTS: ProjectRecord[] = [
  { id: 1, name: "Cloud Landing Zone Architecture Sprint", description: "", status: "ACTIVE" },
  { id: 2, name: "HR Data Migration & Governance", description: "", status: "ACTIVE" },
  { id: 3, name: "Windhoek Regional Hub Rollout", description: "", status: "ACTIVE" },
  { id: 4, name: "Payments Platform Security Review", description: "", status: "COMPLETED" },
];

export const ASSET_CATEGORIES = ["Vehicles", "Laptops", "Mobile Phones"] as const;
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

// Asset codes follow SEN-<VEH|LAP|MOB>-<nnn>. Shown only when the API returns no assets.
export const DEMO_ASSETS: AssetRecord[] = [
  { id: 1, name: "Toyota Hilux 2.8 GD-6 (GR 4821-24)", asset_code: "SEN-VEH-001", category_name: "Vehicles", status: "allocated", first_name: "Richard", last_name: "Mamphey" },
  { id: 2, name: "Toyota Land Cruiser Prado (N 21874 W)", asset_code: "SEN-VEH-002", category_name: "Vehicles", status: "allocated", first_name: "Tangeni", last_name: "Haufiku" },
  { id: 3, name: "Ford Ranger XLT (GT 1190-25)", asset_code: "SEN-VEH-003", category_name: "Vehicles", status: "available" },
  { id: 4, name: "Toyota Corolla Cross (LK25 TRW)", asset_code: "SEN-VEH-004", category_name: "Vehicles", status: "allocated", first_name: "James", last_name: "Whitfield" },
  { id: 5, name: 'MacBook Pro 16" M4 Pro', asset_code: "SEN-LAP-001", category_name: "Laptops", status: "allocated", first_name: "Benedicta", last_name: "Agbesi" },
  { id: 6, name: 'MacBook Pro 14" M4', asset_code: "SEN-LAP-002", category_name: "Laptops", status: "allocated", first_name: "Philip", last_name: "Aryee" },
  { id: 7, name: "Dell Latitude 7450", asset_code: "SEN-LAP-003", category_name: "Laptops", status: "allocated", first_name: "Paa Kwesi", last_name: "Barnes" },
  { id: 8, name: "Lenovo ThinkPad X1 Carbon Gen 12", asset_code: "SEN-LAP-004", category_name: "Laptops", status: "allocated", first_name: "Ndapewa", last_name: "Shikongo" },
  { id: 9, name: "HP EliteBook 840 G11", asset_code: "SEN-LAP-005", category_name: "Laptops", status: "allocated", first_name: "Kojo", last_name: "Antwi" },
  { id: 10, name: "Dell Latitude 7450", asset_code: "SEN-LAP-006", category_name: "Laptops", status: "available" },
  { id: 11, name: "iPhone 16 Pro 256GB", asset_code: "SEN-MOB-001", category_name: "Mobile Phones", status: "allocated", first_name: "Paa Kwesi", last_name: "Barnes" },
  { id: 12, name: "iPhone 15 128GB", asset_code: "SEN-MOB-002", category_name: "Mobile Phones", status: "allocated", first_name: "Benedicta", last_name: "Agbesi" },
  { id: 13, name: "Samsung Galaxy S24", asset_code: "SEN-MOB-003", category_name: "Mobile Phones", status: "allocated", first_name: "Philip", last_name: "Aryee" },
  { id: 14, name: "Samsung Galaxy A55", asset_code: "SEN-MOB-004", category_name: "Mobile Phones", status: "allocated", first_name: "Hilma", last_name: "Nangolo" },
  { id: 15, name: "Google Pixel 9", asset_code: "SEN-MOB-005", category_name: "Mobile Phones", status: "available" },
];

export const PROFILE_FIELDS = [
  "Photo",
  "Emergency contact",
  "Next of kin",
  "Bank details",
  "Tax ID",
  "Identity document",
  "Qualifications",
  "Handbook acknowledged",
];

// Missing profile checklist items per staff member. Anything not listed is complete.
export const PROFILE_MISSING: Record<string, string[]> = {
  "EMP-001": [],
  "EMP-002": ["Qualifications"],
  "EMP-003": ["Photo"],
  "EMP-004": ["Next of kin", "Handbook acknowledged"],
  "EMP-005": ["Tax ID", "Identity document", "Handbook acknowledged"],
  "EMP-006": ["Bank details", "Emergency contact"],
  "EMP-007": ["Photo", "Qualifications"],
  "EMP-008": [],
  "EMP-009": ["Emergency contact"],
  "EMP-010": ["Tax ID", "Bank details", "Next of kin", "Identity document"],
  "EMP-011": ["Handbook acknowledged"],
  "EMP-012": ["Photo", "Emergency contact", "Next of kin", "Qualifications", "Tax ID"],
};

// Leave and events are dated relative to today so the welcome brief always has something current.
export interface DemoLeave {
  staffId: string;
  type: string;
  startOffset: number; // days from today
  endOffset: number;
}

export const DEMO_LEAVES: DemoLeave[] = [
  { staffId: "EMP-004", type: "Annual leave", startOffset: -1, endOffset: 3 },
  { staffId: "EMP-006", type: "Annual leave", startOffset: -2, endOffset: 2 },
  { staffId: "EMP-011", type: "Sick leave", startOffset: 0, endOffset: 1 },
  { staffId: "EMP-002", type: "Annual leave", startOffset: 2, endOffset: 8 },
  { staffId: "EMP-010", type: "Study leave", startOffset: 1, endOffset: 4 },
  { staffId: "EMP-005", type: "Annual leave", startOffset: 3, endOffset: 6 },
  { staffId: "EMP-009", type: "Annual leave", startOffset: 5, endOffset: 12 },
  { staffId: "EMP-008", type: "Parental leave", startOffset: -14, endOffset: 30 },
];

export interface DemoEvent {
  title: string;
  offsetDays: number;
  time: string; // local to the audience
  /** Absent means the whole company. */
  departments?: string[];
  sites?: SiteCode[];
}

export const DEMO_EVENTS: DemoEvent[] = [
  { title: "Windhoek hub stand-up", offsetDays: 0, time: "08:30", sites: ["WDH"] },
  { title: "Engineering sprint review", offsetDays: 1, time: "10:00", departments: ["Engineering & Cloud"] },
  { title: "Company all-hands", offsetDays: 2, time: "14:00" },
  { title: "Disciplinary hearing DC-2026-003", offsetDays: 2, time: "11:00", departments: ["People Operations"] },
  { title: "Q4 appraisal calibration", offsetDays: 3, time: "11:00", departments: ["People Operations", "People Analytics", "Executive Command"] },
  { title: "Board pack review", offsetDays: 4, time: "09:30", departments: ["Executive Command"] },
  { title: "Payroll cut-off", offsetDays: 5, time: "17:00" },
  { title: "Namibia handbook addendum briefing", offsetDays: 6, time: "10:00", sites: ["WDH"] },
];

export type DemoPersona = "hr_director" | "hr_admin" | "line_manager" | "employee";

export interface AttentionItem {
  text: string;
  personas: DemoPersona[];
  view?: ModuleViewKey;
}

// Items that need a decision from the viewer, by persona. The employee-only "complete your profile" item
// is built from PROFILE_MISSING in the brief itself.
export const DEMO_ATTENTION: AttentionItem[] = [
  { text: "Disciplinary case DC-2026-003 (safety breach) is at the hearing stage.", personas: ["hr_director", "hr_admin"], view: "disciplinary" },
  { text: "The Travel & Expenses policy is still a draft and needs publishing before 1 Dec.", personas: ["hr_director", "hr_admin"], view: "policies_handbook" },
  { text: "Q4 appraisal calibration is open; three managers have not submitted ratings.", personas: ["hr_director", "hr_admin", "line_manager"], view: "performance_pms" },
  { text: "Two leave requests from your team are waiting for approval.", personas: ["line_manager", "hr_admin"], view: "time_and_leave" },
  { text: "Two company vehicles are due an inspection this month.", personas: ["hr_director", "hr_admin"], view: "asset_management" },
];
