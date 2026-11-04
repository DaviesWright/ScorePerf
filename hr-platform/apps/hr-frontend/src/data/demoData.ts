import type { AssetRecord } from "../components/modules/WorkforceDirectoryView";
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
  { id: "EMP-001", name: "Paa Kwesi Barnes", jobTitle: "Managing Principal", department: "Executive Command", site: "ACC", email: "paa.barnes@scoreview.com" },
  { id: "EMP-002", name: "Benedicta Agbesi", jobTitle: "Lead Software Engineer", department: "Engineering & Cloud", site: "LON", email: "benedicta.agbesi@scoreview.com" },
  { id: "EMP-003", name: "Richard Mamphey", jobTitle: "Head, Human Resources", department: "People Operations", site: "ACC", email: "richard.mamphey@scoreview.com" },
  { id: "EMP-004", name: "Adjoa Asare", jobTitle: "HR Analytics Specialist", department: "People Analytics", site: "ACC", email: "adjoa.asare@scoreview.com" },
  { id: "EMP-005", name: "Philip Aryee", jobTitle: "Cloud Engineer", department: "Engineering & Cloud", site: "WDH", email: "philip.aryee@scoreview.com" },
  { id: "EMP-006", name: "Ndapewa Shikongo", jobTitle: "Solutions Architect", department: "Advisory", site: "WDH", email: "ndapewa.shikongo@scoreview.com" },
  { id: "EMP-007", name: "Tangeni Haufiku", jobTitle: "Delivery Manager", department: "Advisory", site: "WDH", email: "tangeni.haufiku@scoreview.com" },
  { id: "EMP-008", name: "Kojo Antwi", jobTitle: "Finance Analyst", department: "Finance", site: "ACC", email: "kojo.antwi@scoreview.com" },
  { id: "EMP-009", name: "Efua Sarpong", jobTitle: "Senior Consultant", department: "Advisory", site: "ACC", email: "efua.sarpong@scoreview.com" },
  { id: "EMP-010", name: "James Whitfield", jobTitle: "Account Director", department: "Client Services", site: "LON", email: "james.whitfield@scoreview.com" },
  { id: "EMP-011", name: "Priya Nair", jobTitle: "Data Engineer", department: "Engineering & Cloud", site: "LON", email: "priya.nair@scoreview.com" },
  { id: "EMP-012", name: "Hilma Nangolo", jobTitle: "Operations Coordinator", department: "Operations", site: "WDH", email: "hilma.nangolo@scoreview.com" },
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
