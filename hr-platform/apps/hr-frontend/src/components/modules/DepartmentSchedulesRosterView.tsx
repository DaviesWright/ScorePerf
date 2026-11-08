"use client";

import React, { useState, useMemo } from "react";
import { colors, typography, radii, shadows } from "../../design-system/tokens";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { Icons } from "../../design-system/Icons";
import { SlideOver } from "../../design-system/SlideOver";
import { formatDate } from "../../utils/date";

export type HubLocation = "ALL" | "ACC" | "LON";
export type DepartmentKey = "ALL" | "Healthcare Operations" | "Engineering & Cloud" | "Customer Success" | "Security & Facilities" | "Advisory & Finance";
export type ShiftType = "EARLY_MORNING" | "STANDARD_DAY" | "EVENING_HANDOVER" | "NIGHT_WATCH";
export type OnCallTier = "TIER_1_PRIMARY" | "TIER_2_SECONDARY" | "EXECUTIVE_COMMAND";
export type DeskStatus = "OCCUPIED" | "RESERVED" | "SANITIZED_READY" | "VACANT";

export interface ShiftRosterEntry {
  id: string;
  staffName: string;
  staffId: string;
  role: string;
  department: string;
  team: string;
  hub: "ACC" | "LON";
  hubName: string;
  shiftType: ShiftType;
  shiftLabel: string;
  shiftHours: string;
  dayOfWeek: string;
  date: string;
  status: "ON_DUTY" | "SCHEDULED" | "HANDOVER_PENDING" | "COMPLETED";
  gateZone: string;
  biometricSync: "SYNCED" | "PENDING" | "OVERRIDE";
  handoverNotes?: string;
  avatarColor: string;
}

export interface OnCallSchedule {
  id: string;
  serviceName: string;
  department: string;
  primaryLead: { name: string; staffId: string; phone: string; email: string; avatarColor: string };
  secondaryLead: { name: string; staffId: string; phone: string; email: string; avatarColor: string };
  executiveCommander: string;
  hub: "ACC" | "LON" | "GLOBAL";
  escalationSlaMinutes: number;
  activeWindow: string;
  pagerStatus: "ONLINE_ACTIVE" | "PAGED" | "STANDBY";
  biometricGateAccess: string;
  lastIncidentPushed?: string;
}

export interface HybridDeskAllocation {
  id: string;
  deskCode: string;
  hub: "ACC" | "LON";
  floor: string;
  zone: string;
  deskType: "DUAL_4K_POD" | "STANDING_POD" | "QUIET_BOOTH" | "EXECUTIVE_SUITE" | "COLLAB_BENCH";
  allocatedStaff?: { name: string; staffId: string; role: string; department: string; avatarColor: string };
  hybridPattern: string; // e.g. "Mon, Wed, Fri"
  status: DeskStatus;
  biometricGateSync: "ACTIVE_TODAY" | "SCHEDULED_TOMORROW" | "NOT_CONFIGURED";
  sanitizedAt: string;
}

export interface BiometricGateEvent {
  id: string;
  timestamp: string;
  staffName: string;
  staffId: string;
  hub: "ACC" | "LON";
  gateName: string;
  authMethod: "FACIAL_VECTOR" | "MOBILE_NFC" | "RFID_BADGE" | "PALM_VEIN";
  decision: "ACCESS_GRANTED" | "ACCESS_DENIED";
  syncReason: string;
}

export const DepartmentSchedulesRosterView: React.FC = () => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"rotas" | "on_call" | "desks" | "biometric_gate">("rotas");
  const [selectedHub, setSelectedHub] = useState<HubLocation>("ALL");
  const [selectedDept, setSelectedDept] = useState<DepartmentKey>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // Selected item drawers
  const [selectedShift, setSelectedShift] = useState<ShiftRosterEntry | null>(null);
  const [selectedOnCall, setSelectedOnCall] = useState<OnCallSchedule | null>(null);
  const [selectedDesk, setSelectedDesk] = useState<HybridDeskAllocation | null>(null);

  // Modal forms
  const [showAssignShiftModal, setShowAssignShiftModal] = useState(false);
  const [showDeskBookingModal, setShowDeskBookingModal] = useState(false);

  // Form states
  const [newShiftStaff, setNewShiftStaff] = useState("");
  const [newShiftDept, setNewShiftDept] = useState<DepartmentKey>("Healthcare Operations");
  const [newShiftType, setNewShiftType] = useState<ShiftType>("STANDARD_DAY");
  const [newShiftHub, setNewShiftHub] = useState<"ACC" | "LON">("ACC");
  const [newShiftDay, setNewShiftDay] = useState("Monday");

  // Sample Shift Rotas
  const [rosterEntries, setRosterEntries] = useState<ShiftRosterEntry[]>([
    {
      id: "ROTA-001",
      staffName: "Dr. Emmanuel K. Quarshie",
      staffId: "ACC/CLIN/01",
      role: "Clinical Operations Officer",
      department: "Healthcare Operations",
      team: "Clinical Governance Unit",
      hub: "ACC",
      hubName: "Accra Global Hub (Ridge)",
      shiftType: "EARLY_MORNING",
      shiftLabel: "Early Morning Triage (06:00 - 14:00)",
      shiftHours: "06:00 - 14:00",
      dayOfWeek: "Monday",
      date: "2026-11-02",
      status: "ON_DUTY",
      gateZone: "Gate D (Clinical NOC & Wards)",
      biometricSync: "SYNCED",
      handoverNotes: "Morning triage surge protocol initiated. 12 critical beds prepped.",
      avatarColor: "#0284c7",
    },
    {
      id: "ROTA-002",
      staffName: "Sister Efua Danquah",
      staffId: "ACC/CLIN/04",
      role: "Ward Charge Lead",
      department: "Healthcare Operations",
      team: "Clinical Governance Unit",
      hub: "ACC",
      hubName: "Accra Global Hub (Ridge)",
      shiftType: "EVENING_HANDOVER",
      shiftLabel: "Evening Handover Shift (14:00 - 22:00)",
      shiftHours: "14:00 - 22:00",
      dayOfWeek: "Monday",
      date: "2026-11-02",
      status: "SCHEDULED",
      gateZone: "Gate D (Clinical NOC & Wards)",
      biometricSync: "SYNCED",
      handoverNotes: "Scheduled for seamless handover with Dr. Quarshie at 13:45.",
      avatarColor: "#10b981",
    },
    {
      id: "ROTA-003",
      staffName: "Sister Akua Osei",
      staffId: "ACC/CLIN/09",
      role: "Emergency Triage Specialist",
      department: "Healthcare Operations",
      team: "Clinical Governance Unit",
      hub: "ACC",
      hubName: "Accra Global Hub (Ridge)",
      shiftType: "NIGHT_WATCH",
      shiftLabel: "Night Watch / ICU (22:00 - 06:00)",
      shiftHours: "22:00 - 06:00",
      dayOfWeek: "Monday",
      date: "2026-11-02",
      status: "SCHEDULED",
      gateZone: "Gate D (Clinical NOC & Wards)",
      biometricSync: "SYNCED",
      avatarColor: "#8b5cf6",
    },
    {
      id: "ROTA-004",
      staffName: "Benedicta Agbesi",
      staffId: "SEN/004",
      role: "Lead Software Engineer",
      department: "Engineering & Cloud",
      team: "Hyperdrive Edge Performance Squad",
      hub: "LON",
      hubName: "London Hub (Canary Wharf)",
      shiftType: "STANDARD_DAY",
      shiftLabel: "Core Edge Engineering (08:30 - 17:00)",
      shiftHours: "08:30 - 17:00",
      dayOfWeek: "Monday",
      date: "2026-11-02",
      status: "ON_DUTY",
      gateZone: "Turnstiles 1 & 2 (North Concourse & Level 18)",
      biometricSync: "SYNCED",
      handoverNotes: "Monitoring multi-region Cloudflare Worker traffic across West Africa corridor.",
      avatarColor: "#6366f1",
    },
    {
      id: "ROTA-005",
      staffName: "Philip Aryee",
      staffId: "SEN/008",
      role: "Cloud Infrastructure Engineer",
      department: "Engineering & Cloud",
      team: "Hyperdrive Edge Performance Squad",
      hub: "ACC",
      hubName: "Accra Global Hub (Ridge)",
      shiftType: "STANDARD_DAY",
      shiftLabel: "Cloud Ops & Hardware Testing (08:00 - 16:30)",
      shiftHours: "08:00 - 16:30",
      dayOfWeek: "Monday",
      date: "2026-11-02",
      status: "ON_DUTY",
      gateZone: "Gate B (Engineering Hardware Lab)",
      biometricSync: "SYNCED",
      avatarColor: "#0284c7",
    },
    {
      id: "ROTA-006",
      staffName: "Priya Nair",
      staffId: "EMP-011",
      role: "Data & Telemetry Engineer",
      department: "Engineering & Cloud",
      team: "Hyperdrive Edge Performance Squad",
      hub: "LON",
      hubName: "London Hub (Canary Wharf)",
      shiftType: "EVENING_HANDOVER",
      shiftLabel: "Telemetry & Deployments (13:00 - 21:30)",
      shiftHours: "13:00 - 21:30",
      dayOfWeek: "Monday",
      date: "2026-11-02",
      status: "SCHEDULED",
      gateZone: "Turnstiles 1 & 3 (Level 18 NOC Room)",
      biometricSync: "SYNCED",
      avatarColor: "#ec4899",
    },
    {
      id: "ROTA-007",
      staffName: "Clara Nukunu",
      staffId: "SCG153",
      role: "Enterprise Client Care Lead",
      department: "Customer Success",
      team: "Regional Enterprise Client Care Hub",
      hub: "ACC",
      hubName: "Accra Global Hub (Ridge)",
      shiftType: "STANDARD_DAY",
      shiftLabel: "Enterprise Account Care (07:30 - 16:00)",
      shiftHours: "07:30 - 16:00",
      dayOfWeek: "Monday",
      date: "2026-11-02",
      status: "ON_DUTY",
      gateZone: "Gate A (Main Reception & Client Suites)",
      biometricSync: "SYNCED",
      avatarColor: "#10b981",
    },
    {
      id: "ROTA-008",
      staffName: "James Whitfield",
      staffId: "EMP-010",
      role: "Account Director — UK & Europe",
      department: "Customer Success",
      team: "Regional Enterprise Client Care Hub",
      hub: "LON",
      hubName: "London Hub (Canary Wharf)",
      shiftType: "STANDARD_DAY",
      shiftLabel: "UK & EMEA Client Corridor (09:00 - 17:30)",
      shiftHours: "09:00 - 17:30",
      dayOfWeek: "Monday",
      date: "2026-11-02",
      status: "ON_DUTY",
      gateZone: "Turnstile 1 (Main Tower Reception)",
      biometricSync: "SYNCED",
      avatarColor: "#f59e0b",
    },
    {
      id: "ROTA-009",
      staffName: "Kofi Mensah",
      staffId: "ACC/FAC/02",
      role: "Facilities & Biometric Marshal",
      department: "Security & Facilities",
      team: "Building Security & Biometrics",
      hub: "ACC",
      hubName: "Accra Global Hub (Ridge)",
      shiftType: "STANDARD_DAY",
      shiftLabel: "Gate Telemetry & Safety (06:00 - 18:00)",
      shiftHours: "06:00 - 18:00",
      dayOfWeek: "Monday",
      date: "2026-11-02",
      status: "ON_DUTY",
      gateZone: "Gates A, B, C, D (Full Command Access)",
      biometricSync: "SYNCED",
      avatarColor: "#dc2626",
    },
    {
      id: "ROTA-010",
      staffName: "George Hamilton",
      staffId: "LON/SEC/01",
      role: "London Facilities Marshal",
      department: "Security & Facilities",
      team: "Building Security & Biometrics",
      hub: "LON",
      hubName: "London Hub (Canary Wharf)",
      shiftType: "STANDARD_DAY",
      shiftLabel: "Level 18 Security & Access (07:00 - 19:00)",
      shiftHours: "07:00 - 19:00",
      dayOfWeek: "Monday",
      date: "2026-11-02",
      status: "ON_DUTY",
      gateZone: "Turnstiles 1, 2, 3 (Full Security Clearance)",
      biometricSync: "SYNCED",
      avatarColor: "#475569",
    },
    {
      id: "ROTA-011",
      staffName: "Kojo Antwi",
      staffId: "SEN/019",
      role: "Financial Planning Analyst",
      department: "Advisory & Finance",
      team: "Statutory Tax & Audit Reconciliation Team",
      hub: "ACC",
      hubName: "Accra Global Hub (Ridge)",
      shiftType: "STANDARD_DAY",
      shiftLabel: "Treasury & FX Reconciliations (08:30 - 17:00)",
      shiftHours: "08:30 - 17:00",
      dayOfWeek: "Monday",
      date: "2026-11-02",
      status: "ON_DUTY",
      gateZone: "Gate C (Executive & Finance Suite)",
      biometricSync: "SYNCED",
      avatarColor: "#d97706",
    },
    {
      id: "ROTA-012",
      staffName: "Efua Sarpong",
      staffId: "EMP-009",
      role: "Senior Enterprise Consultant",
      department: "Advisory & Finance",
      team: "Advisory Practice",
      hub: "LON",
      hubName: "London Hub (Canary Wharf)",
      shiftType: "STANDARD_DAY",
      shiftLabel: "Client Strategy & Audit Sprint (09:00 - 18:00)",
      shiftHours: "09:00 - 18:00",
      dayOfWeek: "Monday",
      date: "2026-11-02",
      status: "ON_DUTY",
      gateZone: "Turnstile 2 (Client Advisory Rooms)",
      biometricSync: "SYNCED",
      avatarColor: "#9333ea",
    },
  ]);

  // Sample 24/7 On-Call Schedules
  const [onCallSchedules, setOnCallSchedules] = useState<OnCallSchedule[]>([
    {
      id: "ONCALL-01",
      serviceName: "Clinical Emergency Response & Inpatient Triage",
      department: "Healthcare Operations",
      hub: "ACC",
      primaryLead: { name: "Dr. Emmanuel K. Quarshie", staffId: "ACC/CLIN/01", phone: "+233 24 412 8891", email: "e.quarshie@bscscoreview.com", avatarColor: "#0284c7" },
      secondaryLead: { name: "Sister Efua Danquah", staffId: "ACC/CLIN/04", phone: "+233 20 891 2240", email: "e.danquah@bscscoreview.com", avatarColor: "#10b981" },
      executiveCommander: "Paa Kwesi Barnes (Managing Principal)",
      escalationSlaMinutes: 15,
      activeWindow: "Nov 02 – Nov 09 (Week 45)",
      pagerStatus: "ONLINE_ACTIVE",
      biometricGateAccess: "24/7 Unrestricted Bypass for Gate D (Accra Clinic & Emergency NOC)",
      lastIncidentPushed: "Today 05:22 GMT — Triage Bed Capacity Alert (Resolved in 8 mins)",
    },
    {
      id: "ONCALL-02",
      serviceName: "Edge Infrastructure & Cloud Hyperdrive P1/P0",
      department: "Engineering & Cloud",
      hub: "GLOBAL",
      primaryLead: { name: "Benedicta Agbesi", staffId: "SEN/004", phone: "+44 7700 900142", email: "benedicta.agbesi@bscscoreview.com", avatarColor: "#6366f1" },
      secondaryLead: { name: "Philip Aryee", staffId: "SEN/008", phone: "+233 26 554 1109", email: "philip.aryee@bscscoreview.com", avatarColor: "#0284c7" },
      executiveCommander: "Paa Kwesi Barnes (Managing Principal)",
      escalationSlaMinutes: 10,
      activeWindow: "Nov 02 – Nov 09 (Week 45)",
      pagerStatus: "ONLINE_ACTIVE",
      biometricGateAccess: "24/7 Physical Data Centre & Comms Rooms (London Level 18 & Accra Gate B)",
      lastIncidentPushed: "Yesterday 23:14 GMT — Neon Read-Replica Latency Spike (Auto-swapped in 42s)",
    },
    {
      id: "ONCALL-03",
      serviceName: "Cybersecurity Incident Response & Biometric SpeedGate SecOps",
      department: "Security & Facilities",
      hub: "GLOBAL",
      primaryLead: { name: "Paa Kwesi Barnes", staffId: "SEN/001", phone: "+44 7911 123456", email: "paa.barnes@bscscoreview.com", avatarColor: "#0284c7" },
      secondaryLead: { name: "Kofi Mensah", staffId: "ACC/FAC/02", phone: "+233 24 990 0118", email: "kofi.mensah@bscscoreview.com", avatarColor: "#dc2626" },
      executiveCommander: "Paa Kwesi Barnes (Chief Information Security Officer)",
      escalationSlaMinutes: 5,
      activeWindow: "Nov 01 – Nov 30 (Continuous Standby)",
      pagerStatus: "ONLINE_ACTIVE",
      biometricGateAccess: "Cryptographic Master Override for All Gates across Accra and London",
      lastIncidentPushed: "Today 06:14 GMT — Unknown Visitor NFC Probe at London Turnstile 3 (Denied & Logged)",
    },
    {
      id: "ONCALL-04",
      serviceName: "Enterprise Client Escalations & SLAs",
      department: "Customer Success",
      hub: "GLOBAL",
      primaryLead: { name: "Clara Nukunu", staffId: "SCG153", phone: "+233 27 789 4432", email: "clara.nukunu@bscscoreview.com", avatarColor: "#10b981" },
      secondaryLead: { name: "James Whitfield", staffId: "EMP-010", phone: "+44 7822 556677", email: "james.whitfield@bscscoreview.com", avatarColor: "#f59e0b" },
      executiveCommander: "Richard Mamphey (Head Human Resources)",
      escalationSlaMinutes: 30,
      activeWindow: "Nov 02 – Nov 09 (Week 45)",
      pagerStatus: "ONLINE_ACTIVE",
      biometricGateAccess: "Standard Business Gate Hours + Priority VIP Escort Credential",
      lastIncidentPushed: "Nov 01 16:30 GMT — SSNIT Integration Ticket Escalation (Resolved)",
    },
  ]);

  // Sample Hybrid Desk Allocations
  const [desks, setDesks] = useState<HybridDeskAllocation[]>([
    {
      id: "DSK-01",
      deskCode: "ACC-F3-D01",
      hub: "ACC",
      floor: "Floor 3",
      zone: "Cloud Engineering Pod",
      deskType: "DUAL_4K_POD",
      allocatedStaff: { name: "Philip Aryee", staffId: "SEN/008", role: "Cloud Engineer", department: "Engineering & Cloud", avatarColor: "#0284c7" },
      hybridPattern: "Mon, Wed, Fri (In-Office)",
      status: "OCCUPIED",
      biometricGateSync: "ACTIVE_TODAY",
      sanitizedAt: "Today 07:15 GMT by Facilities",
    },
    {
      id: "DSK-02",
      deskCode: "ACC-F3-D04",
      hub: "ACC",
      floor: "Floor 3",
      zone: "Executive People Ops Pod",
      deskType: "EXECUTIVE_SUITE",
      allocatedStaff: { name: "Richard Mamphey", staffId: "SHR/GH/038", role: "Head, Human Resources", department: "People & Culture", avatarColor: "#6366f1" },
      hybridPattern: "Tue, Wed, Thu (In-Office)",
      status: "OCCUPIED",
      biometricGateSync: "ACTIVE_TODAY",
      sanitizedAt: "Today 07:20 GMT by Facilities",
    },
    {
      id: "DSK-03",
      deskCode: "ACC-F3-D08",
      hub: "ACC",
      floor: "Floor 3",
      zone: "Client Engagement Hub",
      deskType: "COLLAB_BENCH",
      allocatedStaff: { name: "Clara Nukunu", staffId: "SCG153", role: "Customer Service Lead", department: "Customer Success", avatarColor: "#10b981" },
      hybridPattern: "Mon, Tue, Thu (In-Office)",
      status: "OCCUPIED",
      biometricGateSync: "ACTIVE_TODAY",
      sanitizedAt: "Today 07:10 GMT by Facilities",
    },
    {
      id: "DSK-04",
      deskCode: "ACC-F4-D03",
      hub: "ACC",
      floor: "Floor 4",
      zone: "Clinical Consultation Suite",
      deskType: "EXECUTIVE_SUITE",
      allocatedStaff: { name: "Dr. Emmanuel K. Quarshie", staffId: "ACC/CLIN/01", role: "Clinical Operations Officer", department: "Healthcare Operations", avatarColor: "#0284c7" },
      hybridPattern: "Mon - Sat (Dedicated Hospital Office)",
      status: "OCCUPIED",
      biometricGateSync: "ACTIVE_TODAY",
      sanitizedAt: "Today 05:45 GMT (Medical Standard Clean)",
    },
    {
      id: "DSK-05",
      deskCode: "ACC-F4-D11",
      hub: "ACC",
      floor: "Floor 4",
      zone: "Analytics & Systems Pod",
      deskType: "STANDING_POD",
      allocatedStaff: { name: "Adjoa Asare", staffId: "GH/2017/6/13/094", role: "HR Analytics Specialist", department: "People Analytics", avatarColor: "#ec4899" },
      hybridPattern: "Mon, Wed (In-Office)",
      status: "OCCUPIED",
      biometricGateSync: "ACTIVE_TODAY",
      sanitizedAt: "Today 07:30 GMT by Facilities",
    },
    {
      id: "DSK-06",
      deskCode: "ACC-F4-D14",
      hub: "ACC",
      floor: "Floor 4",
      zone: "Flexi Hot-Desk Zone",
      deskType: "QUIET_BOOTH",
      hybridPattern: "On-Demand Daily Booking",
      status: "VACANT",
      biometricGateSync: "NOT_CONFIGURED",
      sanitizedAt: "Today 06:00 GMT (Ready for Reservation)",
    },
    {
      id: "DSK-07",
      deskCode: "LON-L18-D01",
      hub: "LON",
      floor: "Level 18",
      zone: "Cloud Architecture Pod",
      deskType: "DUAL_4K_POD",
      allocatedStaff: { name: "Benedicta Agbesi", staffId: "SEN/004", role: "Lead Software Engineer", department: "Engineering & Cloud", avatarColor: "#6366f1" },
      hybridPattern: "Tue, Wed, Thu (In-Office)",
      status: "OCCUPIED",
      biometricGateSync: "ACTIVE_TODAY",
      sanitizedAt: "Today 08:00 BST (Canary Wharf Facilities)",
    },
    {
      id: "DSK-08",
      deskCode: "LON-L18-D05",
      hub: "LON",
      floor: "Level 18",
      zone: "Data Engineering Pod",
      deskType: "STANDING_POD",
      allocatedStaff: { name: "Priya Nair", staffId: "EMP-011", role: "Data Engineer", department: "Engineering & Cloud", avatarColor: "#ec4899" },
      hybridPattern: "Mon, Tue, Thu (In-Office)",
      status: "OCCUPIED",
      biometricGateSync: "ACTIVE_TODAY",
      sanitizedAt: "Today 08:15 BST by Facilities",
    },
    {
      id: "DSK-09",
      deskCode: "LON-L18-D09",
      hub: "LON",
      floor: "Level 18",
      zone: "Enterprise Advisory Pod",
      deskType: "COLLAB_BENCH",
      allocatedStaff: { name: "James Whitfield", staffId: "EMP-010", role: "Account Director", department: "Customer Success", avatarColor: "#f59e0b" },
      hybridPattern: "Mon, Wed, Fri (In-Office)",
      status: "OCCUPIED",
      biometricGateSync: "ACTIVE_TODAY",
      sanitizedAt: "Today 08:30 BST by Facilities",
    },
    {
      id: "DSK-10",
      deskCode: "LON-L18-D12",
      hub: "LON",
      floor: "Level 18",
      zone: "Executive Principal Suite",
      deskType: "EXECUTIVE_SUITE",
      allocatedStaff: { name: "Paa Kwesi Barnes", staffId: "SEN/001", role: "Managing Principal", department: "Executive Command", avatarColor: "#0284c7" },
      hybridPattern: "Continuous Global Office Reservation",
      status: "RESERVED",
      biometricGateSync: "ACTIVE_TODAY",
      sanitizedAt: "Today 07:45 BST by Facilities",
    },
    {
      id: "DSK-11",
      deskCode: "LON-L18-D16",
      hub: "LON",
      floor: "Level 18",
      zone: "Flexi Hot-Desk Zone",
      deskType: "QUIET_BOOTH",
      hybridPattern: "On-Demand Daily Booking",
      status: "VACANT",
      biometricGateSync: "NOT_CONFIGURED",
      sanitizedAt: "Today 08:00 BST (Ready for Reservation)",
    },
  ]);

  // Sample Real-Time Biometric Gate Feed
  const [gateEvents, setGateEvents] = useState<BiometricGateEvent[]>([
    {
      id: "GATE-901",
      timestamp: "08:57:12 BST",
      staffName: "Benedicta Agbesi",
      staffId: "SEN/004",
      hub: "LON",
      gateName: "Turnstile 1 (North Concourse)",
      authMethod: "FACIAL_VECTOR",
      decision: "ACCESS_GRANTED",
      syncReason: "Shift Match: Core Edge Engineering + Desk LON-L18-D01 Active",
    },
    {
      id: "GATE-902",
      timestamp: "08:21:04 GMT",
      staffName: "Adjoa Asare",
      staffId: "GH/2017/6/13/094",
      hub: "ACC",
      gateName: "Turnstile A (Main Reception)",
      authMethod: "MOBILE_NFC",
      decision: "ACCESS_GRANTED",
      syncReason: "Desk Allocation Match: ACC-F4-D11 (Hybrid Mon In-Office)",
    },
    {
      id: "GATE-903",
      timestamp: "08:05:30 GMT",
      staffName: "Richard Mamphey",
      staffId: "SHR/GH/038",
      hub: "ACC",
      gateName: "Turnstile A (Main Reception)",
      authMethod: "PALM_VEIN",
      decision: "ACCESS_GRANTED",
      syncReason: "Executive Standing Clearance + Desk ACC-F3-D04 Active",
    },
    {
      id: "GATE-904",
      timestamp: "07:58:44 GMT",
      staffName: "Efua Sarpong",
      staffId: "EMP-009",
      hub: "ACC",
      gateName: "Turnstile B (Advisory Labs)",
      authMethod: "RFID_BADGE",
      decision: "ACCESS_GRANTED",
      syncReason: "Shift Match: Standard Client Sprints Rota",
    },
    {
      id: "GATE-905",
      timestamp: "07:52:19 GMT",
      staffName: "Dr. Emmanuel K. Quarshie",
      staffId: "ACC/CLIN/01",
      hub: "ACC",
      gateName: "Gate D (Clinical NOC & Wards)",
      authMethod: "FACIAL_VECTOR",
      decision: "ACCESS_GRANTED",
      syncReason: "On-Call Emergency Lead Match + Early Morning Shift",
    },
    {
      id: "GATE-906",
      timestamp: "07:50:02 GMT",
      staffName: "Philip Aryee",
      staffId: "SEN/008",
      hub: "ACC",
      gateName: "Gate B (Hardware Lab)",
      authMethod: "MOBILE_NFC",
      decision: "ACCESS_GRANTED",
      syncReason: "Shift Match: Cloud Ops Shift + Desk ACC-F3-D01 Active",
    },
    {
      id: "GATE-907",
      timestamp: "06:14:02 BST",
      staffName: "Unknown External Token",
      staffId: "EXT-TAG-9921",
      hub: "LON",
      gateName: "Turnstile 3 (Secure Comms Room)",
      authMethod: "RFID_BADGE",
      decision: "ACCESS_DENIED",
      syncReason: "Unauthorized Token — No Active Rota or NOC Clearance. Alert Dispatched to SecOps.",
    },
  ]);

  // Filtering Logic
  const filteredRoster = useMemo(() => {
    return rosterEntries.filter((r) => {
      const matchHub = selectedHub === "ALL" || r.hub === selectedHub;
      const matchDept = selectedDept === "ALL" || r.department === selectedDept;
      const matchSearch =
        !searchQuery.trim() ||
        r.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.staffId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.shiftLabel.toLowerCase().includes(searchQuery.toLowerCase());
      return matchHub && matchDept && matchSearch;
    });
  }, [rosterEntries, selectedHub, selectedDept, searchQuery]);

  const filteredDesks = useMemo(() => {
    return desks.filter((d) => {
      const matchHub = selectedHub === "ALL" || d.hub === selectedHub;
      const matchSearch =
        !searchQuery.trim() ||
        d.deskCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.zone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.allocatedStaff && d.allocatedStaff.name.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchHub && matchSearch;
    });
  }, [desks, selectedHub, searchQuery]);

  const filteredOnCall = useMemo(() => {
    return onCallSchedules.filter((o) => {
      const matchHub = selectedHub === "ALL" || o.hub === "GLOBAL" || o.hub === selectedHub;
      const matchDept = selectedDept === "ALL" || o.department === selectedDept;
      const matchSearch =
        !searchQuery.trim() ||
        o.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.primaryLead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.secondaryLead.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchHub && matchDept && matchSearch;
    });
  }, [onCallSchedules, selectedHub, selectedDept, searchQuery]);

  // Handle Manual Biometric Gate Re-Sync
  const handleTriggerBiometricSync = () => {
    const newEvent: BiometricGateEvent = {
      id: `GATE-${Date.now().toString().slice(-3)}`,
      timestamp: "Just Now",
      staffName: "Biometric Gateway Sync Engine",
      staffId: "SYS-SYNC",
      hub: selectedHub === "ALL" ? "ACC" : selectedHub,
      gateName: "All Controllers (Accra & London)",
      authMethod: "FACIAL_VECTOR",
      decision: "ACCESS_GRANTED",
      syncReason: `Pushed fresh rota & desk biometric tokens for ${rosterEntries.length} scheduled staff across ZKTeco & HID controllers.`,
    };
    setGateEvents([newEvent, ...gateEvents]);
    setStatusMessage({
      text: "Biometric gate access tokens successfully synchronized across Accra (ZKTeco SpeedGates) and London (HID Aero Turnstiles).",
    });
  };

  // Handle Add Shift
  const handleAddShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShiftStaff.trim()) return;

    const newEntry: ShiftRosterEntry = {
      id: `ROTA-${Date.now().toString().slice(-3)}`,
      staffName: newShiftStaff,
      staffId: `SHR/${newShiftHub}/${Math.floor(100 + Math.random() * 900)}`,
      role: "Operations Specialist",
      department: newShiftDept === "ALL" ? "Healthcare Operations" : newShiftDept,
      team: "Regional Delivery Squad",
      hub: newShiftHub,
      hubName: newShiftHub === "ACC" ? "Accra Global Hub (Ridge)" : "London Hub (Canary Wharf)",
      shiftType: newShiftType,
      shiftLabel:
        newShiftType === "EARLY_MORNING"
          ? "Early Morning Shift (06:00 - 14:00)"
          : newShiftType === "EVENING_HANDOVER"
          ? "Evening Handover Shift (14:00 - 22:00)"
          : newShiftType === "NIGHT_WATCH"
          ? "Night Watch / ICU Shift (22:00 - 06:00)"
          : "Standard Business Shift (08:30 - 17:30)",
      shiftHours:
        newShiftType === "EARLY_MORNING"
          ? "06:00 - 14:00"
          : newShiftType === "EVENING_HANDOVER"
          ? "14:00 - 22:00"
          : newShiftType === "NIGHT_WATCH"
          ? "22:00 - 06:00"
          : "08:30 - 17:30",
      dayOfWeek: newShiftDay,
      date: new Date().toISOString().slice(0, 10),
      status: "SCHEDULED",
      gateZone: newShiftHub === "ACC" ? "Gate A & B (Turnstiles 1-4)" : "Turnstiles 1 & 2 (North Concourse)",
      biometricSync: "SYNCED",
      avatarColor: "#6366f1",
      handoverNotes: "Assigned via Department Schedules & Shift Rosters Studio.",
    };

    setRosterEntries([newEntry, ...rosterEntries]);
    setShowAssignShiftModal(false);
    setNewShiftStaff("");
    setStatusMessage({
      text: `Shift successfully scheduled for ${newEntry.staffName} (${newEntry.shiftLabel}) and synchronized with ${newEntry.hubName} biometric speed-gates.`,
    });
  };

  return (
    <div style={{ padding: "1.75rem 2rem", maxWidth: "1440px", margin: "0 auto" }}>
      {/* Header & Subtitle */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "0.75rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <span style={{ fontSize: typography.sizes.xs, fontWeight: 700, color: colors.indigoAction, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Workforce Operations &amp; Facility Access
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
              Department Schedules &amp; Shift Rosters
            </h1>
            <p style={{ margin: "0.35rem 0 0 0", fontSize: typography.sizes.xs, color: colors.textSecondary, maxWidth: "780px" }}>
              Department rotas, on-call schedules, and hybrid desk allocations are synchronized with biometric gate access in Accra and London.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
            <Button variant="outline" size="sm" onClick={handleTriggerBiometricSync}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Icons.Activity size={14} color={colors.indigoAction} />
                <span>Re-Sync Biometric Gates</span>
              </span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowDeskBookingModal(true)}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Icons.Laptop size={14} />
                <span>Book Hybrid Desk</span>
              </span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowAssignShiftModal(true)}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Icons.Plus size={14} />
                <span>Assign Shift Rota</span>
              </span>
            </Button>
          </div>
        </div>

        {/* Global Hub & Hardware Telemetry Strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
            marginTop: "1.25rem",
          }}
        >
          {/* Card 1: Active Rota Shifts */}
          <div
            style={{
              padding: "0.9rem 1.1rem",
              borderRadius: radii.md,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderLeft: "3.5px solid #2563eb",
              boxShadow: shadows.xs,
            }}
          >
            <div style={{ fontSize: "11px", color: colors.textSecondary, fontWeight: 700, textTransform: "uppercase" }}>
              Scheduled Rota Shifts
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, color: colors.textPrimary, margin: "0.2rem 0" }}>
              {rosterEntries.length} Shifts
            </div>
            <div style={{ fontSize: "11px", color: colors.textMuted }}>
              Across Accra (Ridge) &amp; London (Canary Wharf)
            </div>
          </div>

          {/* Card 2: 24/7 On-Call Coverage */}
          <div
            style={{
              padding: "0.9rem 1.1rem",
              borderRadius: radii.md,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderLeft: "3.5px solid #10b981",
              boxShadow: shadows.xs,
            }}
          >
            <div style={{ fontSize: "11px", color: colors.textSecondary, fontWeight: 700, textTransform: "uppercase" }}>
              24/7 On-Call Coverage
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, color: colors.textPrimary, margin: "0.2rem 0" }}>
              {onCallSchedules.length} Escalation Tiers
            </div>
            <div style={{ fontSize: "11px", color: colors.textMuted }}>
              Clinical Triage, Cloud Edge P1 &amp; SecOps Active
            </div>
          </div>

          {/* Card 3: Hybrid Desk Allocation */}
          <div
            style={{
              padding: "0.9rem 1.1rem",
              borderRadius: radii.md,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderLeft: "3.5px solid #8b5cf6",
              boxShadow: shadows.xs,
            }}
          >
            <div style={{ fontSize: "11px", color: colors.textSecondary, fontWeight: 700, textTransform: "uppercase" }}>
              Hybrid Desk Occupancy
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, color: colors.textPrimary, margin: "0.2rem 0" }}>
              {desks.filter((d) => d.status === "OCCUPIED" || d.status === "RESERVED").length} / {desks.length} Pods
            </div>
            <div style={{ fontSize: "11px", color: colors.textMuted }}>
              82% Average In-Office Occupancy Today
            </div>
          </div>

          {/* Card 4: Biometric Gate Sync Status */}
          <div
            style={{
              padding: "0.9rem 1.1rem",
              borderRadius: radii.md,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderLeft: "3.5px solid #059669",
              boxShadow: shadows.xs,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: colors.textSecondary, fontWeight: 700, textTransform: "uppercase" }}>
                Biometric Gate Sync
              </span>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10b981", boxShadow: "0 0 6px #10b981" }} />
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, color: colors.emeraldDark, margin: "0.2rem 0" }}>
              100% Online
            </div>
            <div style={{ fontSize: "11px", color: colors.textMuted }}>
              ZKTeco ProFace X (Accra) &amp; HID Aero (London)
            </div>
          </div>
        </div>
      </div>

      {/* Status Message Notification */}
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
            style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontWeight: 700 }}
          >
            ×
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          borderBottom: `1px solid ${colors.border}`,
          marginBottom: "1.25rem",
          overflowX: "auto",
        }}
      >
        {[
          { key: "rotas" as const, label: "Department Rotas & Shift Calendar", icon: Icons.Calendar },
          { key: "on_call" as const, label: "24/7 On-Call & Escalation Matrix", icon: Icons.ShieldCheck },
          { key: "desks" as const, label: "Hybrid Desk Allocations", icon: Icons.Laptop },
          { key: "biometric_gate" as const, label: "Biometric Gate Access Sync (Accra & London)", icon: Icons.Activity },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
                padding: "0.65rem 1rem",
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
              <tab.icon size={15} color={isActive ? colors.indigoAction : colors.textMuted} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filters Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "1.25rem",
          backgroundColor: colors.surface,
          padding: "0.75rem 1rem",
          borderRadius: radii.md,
          border: `1px solid ${colors.border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          {/* Hub Location Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted }}>HUB:</span>
            <select
              value={selectedHub}
              onChange={(e) => setSelectedHub(e.target.value as HubLocation)}
              style={{
                padding: "0.35rem 0.65rem",
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                fontSize: typography.sizes.xs,
                backgroundColor: colors.surfaceSubtle,
                color: colors.textPrimary,
                fontWeight: 600,
              }}
            >
              <option value="ALL">All Hubs (Accra &amp; London)</option>
              <option value="ACC">Accra Global Hub (Ridge)</option>
              <option value="LON">London Hub (Canary Wharf)</option>
            </select>
          </div>

          {/* Department Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted }}>DEPARTMENT:</span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value as DepartmentKey)}
              style={{
                padding: "0.35rem 0.65rem",
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                fontSize: typography.sizes.xs,
                backgroundColor: colors.surfaceSubtle,
                color: colors.textPrimary,
                fontWeight: 600,
              }}
            >
              <option value="ALL">All Departments</option>
              <option value="Healthcare Operations">Healthcare Operations</option>
              <option value="Engineering &amp; Cloud">Engineering &amp; Cloud</option>
              <option value="Customer Success">Customer Success</option>
              <option value="Security &amp; Facilities">Security &amp; Facilities</option>
              <option value="Advisory &amp; Finance">Advisory &amp; Finance</option>
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="Search staff, shift, desk, or gate zone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: "0.4rem 0.75rem 0.4rem 2rem",
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              fontSize: typography.sizes.xs,
              width: "280px",
              backgroundColor: colors.surfaceSubtle,
            }}
          />
          <div style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: colors.textMuted }}>
            <Icons.Search size={13} />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DEPARTMENT ROTAS & SHIFT CALENDAR                                  */}
      {/* ========================================================================= */}
      {activeTab === "rotas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Shift Schedule Table */}
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              overflow: "hidden",
              boxShadow: shadows.xs,
            }}
          >
            <div
              style={{
                padding: "0.85rem 1.25rem",
                borderBottom: `1px solid ${colors.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: colors.surfaceSubtle,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                  Active Shift Rotas &amp; Turnstile Provisions
                </h3>
                <span style={{ fontSize: "11px", color: colors.textMuted }}>
                  Showing {filteredRoster.length} active shift assignments synchronized with physical turnstile gate credentials.
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const csv = "ID,STAFF_NAME,STAFF_ID,ROLE,DEPARTMENT,HUB,SHIFT_LABEL,SHIFT_HOURS,GATE_ZONE,BIOMETRIC_SYNC,STATUS\n" +
                    filteredRoster.map((r) => `"${r.id}","${r.staffName}","${r.staffId}","${r.role}","${r.department}","${r.hub}","${r.shiftLabel}","${r.shiftHours}","${r.gateZone}","${r.biometricSync}","${r.status}"`).join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `department_schedules_roster_${new Date().toISOString().slice(0, 10)}.csv`;
                  a.click();
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <Icons.Download size={13} />
                  <span>Export Roster CSV</span>
                </span>
              </Button>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
              <thead>
                <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                  <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>STAFF MEMBER</th>
                  <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>ROLE &amp; DEPARTMENT</th>
                  <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>HUB</th>
                  <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>SHIFT TYPE &amp; HOURS</th>
                  <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>SYNCHRONIZED BIOMETRIC GATE</th>
                  <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>GATE CREDENTIAL</th>
                  <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>STATUS</th>
                  <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700, textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoster.map((entry) => (
                  <tr
                    key={entry.id}
                    style={{
                      borderBottom: `1px solid ${colors.borderSubtle}`,
                      transition: "background-color 0.1s ease",
                    }}
                  >
                    {/* Staff Name & Avatar */}
                    <td style={{ padding: "0.75rem 0.85rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                        <div
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "50%",
                            backgroundColor: entry.avatarColor,
                            color: colors.surface,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "11px",
                            flexShrink: 0,
                          }}
                        >
                          {entry.staffName.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: colors.textPrimary }}>
                            {entry.staffName}
                          </div>
                          <div style={{ fontSize: "11px", color: colors.textMuted, fontFamily: typography.fontMono }}>
                            {entry.staffId}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role & Department */}
                    <td style={{ padding: "0.75rem 0.85rem" }}>
                      <div style={{ fontWeight: 600, color: colors.textPrimary }}>
                        {entry.role}
                      </div>
                      <div style={{ fontSize: "11px", color: colors.textSecondary }}>
                        {entry.department} • <span style={{ color: colors.textMuted }}>{entry.team}</span>
                      </div>
                    </td>

                    {/* Hub */}
                    <td style={{ padding: "0.75rem 0.85rem" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "0.2rem 0.5rem",
                          borderRadius: radii.sm,
                          backgroundColor: entry.hub === "ACC" ? "rgba(37, 99, 235, 0.1)" : "rgba(16, 185, 129, 0.1)",
                          color: entry.hub === "ACC" ? "#1e40af" : "#065f46",
                          border: `1px solid ${entry.hub === "ACC" ? "#bfdbfe" : "#a7f3d0"}`,
                        }}
                      >
                        {entry.hub === "ACC" ? "🇬🇭 Accra Ridge" : "🇬🇧 London Wharf"}
                      </span>
                    </td>

                    {/* Shift & Hours */}
                    <td style={{ padding: "0.75rem 0.85rem" }}>
                      <div style={{ fontWeight: 700, color: colors.textPrimary }}>
                        {entry.shiftLabel}
                      </div>
                      <div style={{ fontSize: "11px", color: colors.indigoAction, fontWeight: 600 }}>
                        {entry.dayOfWeek} • {entry.shiftHours}
                      </div>
                    </td>

                    {/* Synchronized Biometric Gate */}
                    <td style={{ padding: "0.75rem 0.85rem" }}>
                      <div style={{ fontSize: "11px", color: colors.textPrimary, fontWeight: 600 }}>
                        {entry.gateZone}
                      </div>
                      <div style={{ fontSize: "10px", color: colors.textMuted }}>
                        Auto-provisioned for shift duration
                      </div>
                    </td>

                    {/* Gate Credential Status */}
                    <td style={{ padding: "0.75rem 0.85rem" }}>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "0.2rem 0.55rem",
                          borderRadius: radii.full,
                          backgroundColor: "rgba(16, 185, 129, 0.12)",
                          color: "#059669",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.3rem",
                        }}
                      >
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#059669" }} />
                        <span>PROVISIONED</span>
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: "0.75rem 0.85rem" }}>
                      {entry.status === "ON_DUTY" && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "0.2rem 0.55rem",
                            borderRadius: radii.full,
                            backgroundColor: "rgba(37, 99, 235, 0.12)",
                            color: "#1d4ed8",
                          }}
                        >
                          ON DUTY NOW
                        </span>
                      )}
                      {entry.status === "SCHEDULED" && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "0.2rem 0.55rem",
                            borderRadius: radii.full,
                            backgroundColor: colors.surfaceSubtle,
                            color: colors.textSecondary,
                            border: `1px solid ${colors.border}`,
                          }}
                        >
                          SCHEDULED
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "0.75rem 0.85rem", textAlign: "right" }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedShift(entry)}
                        style={{ padding: "0.25rem 0.55rem", fontSize: "11px" }}
                      >
                        Inspect
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
      {/* TAB 2: 24/7 ON-CALL & ESCALATION MATRIX                                   */}
      {/* ========================================================================= */}
      {activeTab === "on_call" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "1.25rem" }}>
            {filteredOnCall.map((schedule) => (
              <div
                key={schedule.id}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radii.lg,
                  border: `1px solid ${colors.border}`,
                  padding: "1.25rem 1.5rem",
                  boxShadow: shadows.xs,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.6rem" }}>
                    <div>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: colors.indigoAction, textTransform: "uppercase" }}>
                        {schedule.department} • Tier {schedule.escalationSlaMinutes}m SLA
                      </span>
                      <h3 style={{ fontSize: typography.sizes.sm, fontWeight: 800, color: colors.textPrimary, margin: "0.2rem 0" }}>
                        {schedule.serviceName}
                      </h3>
                    </div>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "0.2rem 0.55rem",
                        borderRadius: radii.full,
                        backgroundColor: "rgba(16, 185, 129, 0.12)",
                        color: "#059669",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                      }}
                    >
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#059669" }} />
                      <span>LIVE ON-CALL</span>
                    </span>
                  </div>

                  {/* Primary & Secondary Responders Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", margin: "1rem 0" }}>
                    {/* Primary Lead */}
                    <div
                      style={{
                        padding: "0.75rem",
                        borderRadius: radii.md,
                        backgroundColor: "#eff6ff",
                        border: "1px solid #bfdbfe",
                      }}
                    >
                      <div style={{ fontSize: "10px", fontWeight: 700, color: "#1e40af", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                        Primary Responder
                      </div>
                      <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary }}>
                        {schedule.primaryLead.name}
                      </div>
                      <div style={{ fontSize: "11px", color: colors.textMuted, fontFamily: typography.fontMono }}>
                        {schedule.primaryLead.staffId}
                      </div>
                      <div style={{ fontSize: "11px", color: "#1d4ed8", fontWeight: 600, marginTop: "0.3rem" }}>
                        📞 {schedule.primaryLead.phone}
                      </div>
                    </div>

                    {/* Secondary Lead */}
                    <div
                      style={{
                        padding: "0.75rem",
                        borderRadius: radii.md,
                        backgroundColor: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                      }}
                    >
                      <div style={{ fontSize: "10px", fontWeight: 700, color: "#166534", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                        Secondary Escalation
                      </div>
                      <div style={{ fontWeight: 700, fontSize: typography.sizes.xs, color: colors.textPrimary }}>
                        {schedule.secondaryLead.name}
                      </div>
                      <div style={{ fontSize: "11px", color: colors.textMuted, fontFamily: typography.fontMono }}>
                        {schedule.secondaryLead.staffId}
                      </div>
                      <div style={{ fontSize: "11px", color: "#15803d", fontWeight: 600, marginTop: "0.3rem" }}>
                        📞 {schedule.secondaryLead.phone}
                      </div>
                    </div>
                  </div>

                  {/* Biometric Gate Access info */}
                  <div
                    style={{
                      padding: "0.6rem 0.75rem",
                      borderRadius: radii.sm,
                      backgroundColor: colors.surfaceSubtle,
                      border: `1px solid ${colors.borderSubtle}`,
                      fontSize: "11px",
                      color: colors.textSecondary,
                      marginBottom: "0.75rem",
                    }}
                  >
                    <strong>Biometric Gate Override:</strong> {schedule.biometricGateAccess}
                  </div>

                  {schedule.lastIncidentPushed && (
                    <div style={{ fontSize: "11px", color: colors.textMuted, fontStyle: "italic" }}>
                      Recent Incident: {schedule.lastIncidentPushed}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", borderTop: `1px solid ${colors.borderSubtle}`, paddingTop: "0.75rem" }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStatusMessage({ text: `Simulated high-priority test page dispatched to ${schedule.primaryLead.name} and backup ${schedule.secondaryLead.name}.` });
                    }}
                    style={{ flex: 1, fontSize: "11px" }}
                  >
                    Test Pager Alert
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedOnCall(schedule)}
                    style={{ fontSize: "11px" }}
                  >
                    Inspect Matrix
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: HYBRID DESK ALLOCATIONS                                            */}
      {/* ========================================================================= */}
      {activeTab === "desks" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              overflow: "hidden",
              boxShadow: shadows.xs,
            }}
          >
            <div
              style={{
                padding: "0.85rem 1.25rem",
                borderBottom: `1px solid ${colors.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: colors.surfaceSubtle,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                  Hybrid Desk Reservations &amp; SpeedGate Linkage
                </h3>
                <span style={{ fontSize: "11px", color: colors.textMuted }}>
                  Biometric gates in Accra and London only grant floor turnstile access on scheduled in-office days.
                </span>
              </div>
              <Button variant="primary" size="sm" onClick={() => setShowDeskBookingModal(true)}>
                Reserve Desk Pod
              </Button>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
              <thead>
                <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                  <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>DESK CODE</th>
                  <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>HUB &amp; FLOOR</th>
                  <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>ZONE &amp; SPECIFICATION</th>
                  <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>ALLOCATED EMPLOYEE</th>
                  <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>HYBRID PATTERN</th>
                  <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>TURNSTILE STATUS</th>
                  <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>SANITATION</th>
                  <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700, textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredDesks.map((desk) => (
                  <tr
                    key={desk.id}
                    style={{
                      borderBottom: `1px solid ${colors.borderSubtle}`,
                      transition: "background-color 0.1s ease",
                    }}
                  >
                    <td style={{ padding: "0.75rem 0.85rem" }}>
                      <span style={{ fontWeight: 800, color: colors.indigoPrimary, fontFamily: typography.fontMono }}>
                        {desk.deskCode}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 0.85rem" }}>
                      <span style={{ fontWeight: 700, color: colors.textPrimary }}>
                        {desk.hub === "ACC" ? "🇬🇭 Accra Ridge" : "🇬🇧 London Wharf"}
                      </span>
                      <div style={{ fontSize: "11px", color: colors.textMuted }}>
                        {desk.floor}
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem 0.85rem" }}>
                      <div style={{ fontWeight: 600, color: colors.textPrimary }}>
                        {desk.zone}
                      </div>
                      <div style={{ fontSize: "11px", color: colors.textSecondary }}>
                        {desk.deskType.replace(/_/g, " ")}
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem 0.85rem" }}>
                      {desk.allocatedStaff ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <div
                            style={{
                              width: "26px",
                              height: "26px",
                              borderRadius: "50%",
                              backgroundColor: desk.allocatedStaff.avatarColor,
                              color: colors.surface,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: "10px",
                              flexShrink: 0,
                            }}
                          >
                            {desk.allocatedStaff.name.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: colors.textPrimary }}>
                              {desk.allocatedStaff.name}
                            </div>
                            <div style={{ fontSize: "10px", color: colors.textMuted }}>
                              {desk.allocatedStaff.role}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: colors.textMuted, fontStyle: "italic" }}>Unallocated / Available</span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem 0.85rem", color: colors.textSecondary, fontWeight: 500 }}>
                      {desk.hybridPattern}
                    </td>
                    <td style={{ padding: "0.75rem 0.85rem" }}>
                      {desk.biometricGateSync === "ACTIVE_TODAY" ? (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "0.2rem 0.55rem",
                            borderRadius: radii.full,
                            backgroundColor: "rgba(16, 185, 129, 0.12)",
                            color: "#059669",
                          }}
                        >
                          ACTIVE TODAY
                        </span>
                      ) : desk.biometricGateSync === "SCHEDULED_TOMORROW" ? (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "0.2rem 0.55rem",
                            borderRadius: radii.full,
                            backgroundColor: "rgba(37, 99, 235, 0.12)",
                            color: "#2563eb",
                          }}
                        >
                          QUEUED TOMORROW
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "0.2rem 0.55rem",
                            borderRadius: radii.full,
                            backgroundColor: colors.surfaceSubtle,
                            color: colors.textMuted,
                          }}
                        >
                          UNASSIGNED
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem 0.85rem", fontSize: "11px", color: colors.textMuted }}>
                      {desk.sanitizedAt}
                    </td>
                    <td style={{ padding: "0.75rem 0.85rem", textAlign: "right" }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDesk(desk)}
                        style={{ padding: "0.25rem 0.55rem", fontSize: "11px" }}
                      >
                        Details
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
      {/* TAB 4: BIOMETRIC GATE ACCESS SYNC ENGINE (Accra & London)                */}
      {/* ========================================================================= */}
      {activeTab === "biometric_gate" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Hardware Gate Controllers Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            {/* Accra Controller Card */}
            <div
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                border: `1px solid ${colors.border}`,
                padding: "1.25rem 1.5rem",
                boxShadow: shadows.xs,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                <div>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#1e40af", textTransform: "uppercase" }}>
                    Accra Global Hub Gateway
                  </span>
                  <h3 style={{ fontSize: typography.sizes.base, fontWeight: 800, color: colors.textPrimary, margin: "0.2rem 0" }}>
                    🇬🇭 ZKTeco ProFace X &amp; Suprema SpeedGates
                  </h3>
                  <div style={{ fontSize: "11px", color: colors.textMuted, fontFamily: typography.fontMono }}>
                    Controller IP: 10.20.0.15 • Ping: 12ms • Firmware: v4.8.2-Enterprise
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "0.2rem 0.55rem",
                    borderRadius: radii.full,
                    backgroundColor: "rgba(16, 185, 129, 0.12)",
                    color: "#059669",
                  }}
                >
                  ONLINE &amp; SYNCED
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.5rem", marginTop: "1rem" }}>
                <div style={{ padding: "0.6rem", borderRadius: radii.sm, backgroundColor: colors.surfaceSubtle, border: `1px solid ${colors.borderSubtle}` }}>
                  <div style={{ fontSize: "10px", color: colors.textMuted, fontWeight: 700 }}>TURNSTILE A (MAIN LOBBY)</div>
                  <div style={{ fontWeight: 700, color: colors.emeraldDark, fontSize: "12px" }}>Active • 28 Taps / hr</div>
                </div>
                <div style={{ padding: "0.6rem", borderRadius: radii.sm, backgroundColor: colors.surfaceSubtle, border: `1px solid ${colors.borderSubtle}` }}>
                  <div style={{ fontSize: "10px", color: colors.textMuted, fontWeight: 700 }}>TURNSTILE B (ENGINEERING)</div>
                  <div style={{ fontWeight: 700, color: colors.emeraldDark, fontSize: "12px" }}>Active • Roster Gated</div>
                </div>
                <div style={{ padding: "0.6rem", borderRadius: radii.sm, backgroundColor: colors.surfaceSubtle, border: `1px solid ${colors.borderSubtle}` }}>
                  <div style={{ fontSize: "10px", color: colors.textMuted, fontWeight: 700 }}>TURNSTILE C (EXECUTIVE NOC)</div>
                  <div style={{ fontWeight: 700, color: colors.emeraldDark, fontSize: "12px" }}>Dual-Auth Palm + Face</div>
                </div>
                <div style={{ padding: "0.6rem", borderRadius: radii.sm, backgroundColor: colors.surfaceSubtle, border: `1px solid ${colors.borderSubtle}` }}>
                  <div style={{ fontSize: "10px", color: colors.textMuted, fontWeight: 700 }}>GATE D (CLINICAL NOC)</div>
                  <div style={{ fontWeight: 700, color: colors.emeraldDark, fontSize: "12px" }}>24/7 Medical Bypass</div>
                </div>
              </div>
            </div>

            {/* London Controller Card */}
            <div
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                border: `1px solid ${colors.border}`,
                padding: "1.25rem 1.5rem",
                boxShadow: shadows.xs,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                <div>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>
                    London Hub Gateway
                  </span>
                  <h3 style={{ fontSize: typography.sizes.base, fontWeight: 800, color: colors.textPrimary, margin: "0.2rem 0" }}>
                    🇬🇧 HID Aero / Mercury EP1502 Turnstiles
                  </h3>
                  <div style={{ fontSize: "11px", color: colors.textMuted, fontFamily: typography.fontMono }}>
                    Controller IP: 10.40.1.22 • Ping: 18ms • Firmware: v3.2.0-Secure
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "0.2rem 0.55rem",
                    borderRadius: radii.full,
                    backgroundColor: "rgba(16, 185, 129, 0.12)",
                    color: "#059669",
                  }}
                >
                  ONLINE &amp; SYNCED
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.5rem", marginTop: "1rem" }}>
                <div style={{ padding: "0.6rem", borderRadius: radii.sm, backgroundColor: colors.surfaceSubtle, border: `1px solid ${colors.borderSubtle}` }}>
                  <div style={{ fontSize: "10px", color: colors.textMuted, fontWeight: 700 }}>TURNSTILE 1 (NORTH LOBBY)</div>
                  <div style={{ fontWeight: 700, color: colors.emeraldDark, fontSize: "12px" }}>Active • Level 18 Access</div>
                </div>
                <div style={{ padding: "0.6rem", borderRadius: radii.sm, backgroundColor: colors.surfaceSubtle, border: `1px solid ${colors.borderSubtle}` }}>
                  <div style={{ fontSize: "10px", color: colors.textMuted, fontWeight: 700 }}>TURNSTILE 2 (CLIENT SUITES)</div>
                  <div style={{ fontWeight: 700, color: colors.emeraldDark, fontSize: "12px" }}>Facial Vector + NFC</div>
                </div>
                <div style={{ padding: "0.6rem", borderRadius: radii.sm, backgroundColor: colors.surfaceSubtle, border: `1px solid ${colors.borderSubtle}` }}>
                  <div style={{ fontSize: "10px", color: colors.textMuted, fontWeight: 700 }}>TURNSTILE 3 (COMMS &amp; NOC)</div>
                  <div style={{ fontWeight: 700, color: colors.emeraldDark, fontSize: "12px" }}>Strict On-Call Key Only</div>
                </div>
                <div style={{ padding: "0.6rem", borderRadius: radii.sm, backgroundColor: colors.surfaceSubtle, border: `1px solid ${colors.borderSubtle}` }}>
                  <div style={{ fontSize: "10px", color: colors.textMuted, fontWeight: 700 }}>SYNC CADENCE</div>
                  <div style={{ fontWeight: 700, color: colors.indigoAction, fontSize: "12px" }}>Continuous 60s Polling</div>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Biometric Tap Event Logs */}
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              overflow: "hidden",
              boxShadow: shadows.xs,
            }}
          >
            <div
              style={{
                padding: "0.85rem 1.25rem",
                borderBottom: `1px solid ${colors.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: colors.surfaceSubtle,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                  Live Biometric Gate Tap Telemetry
                </h3>
                <span style={{ fontSize: "11px", color: colors.textMuted }}>
                  Real-time turnstile verification events synchronized with scheduled department shifts and desk reservations.
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={handleTriggerBiometricSync}>
                Push Instant Re-Sync
              </Button>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.sizes.xs }}>
              <thead>
                <tr style={{ backgroundColor: colors.surfaceSubtle, borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                  <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>TIMESTAMP</th>
                  <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>STAFF MEMBER</th>
                  <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>HUB &amp; TURNSTILE</th>
                  <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>METHOD</th>
                  <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>DECISION</th>
                  <th style={{ padding: "0.65rem 0.85rem", color: colors.textMuted, fontWeight: 700 }}>ROTA / DESK SYNCHRONIZATION REASON</th>
                </tr>
              </thead>
              <tbody>
                {gateEvents.map((evt) => (
                  <tr
                    key={evt.id}
                    style={{
                      borderBottom: `1px solid ${colors.borderSubtle}`,
                      transition: "background-color 0.1s ease",
                    }}
                  >
                    <td style={{ padding: "0.75rem 0.85rem", fontFamily: typography.fontMono, color: colors.textMuted }}>
                      {evt.timestamp}
                    </td>
                    <td style={{ padding: "0.75rem 0.85rem" }}>
                      <div style={{ fontWeight: 700, color: colors.textPrimary }}>
                        {evt.staffName}
                      </div>
                      <div style={{ fontSize: "11px", color: colors.textMuted, fontFamily: typography.fontMono }}>
                        {evt.staffId}
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem 0.85rem" }}>
                      <div style={{ fontWeight: 600, color: colors.textPrimary }}>
                        {evt.hub === "ACC" ? "🇬🇭 Accra Ridge" : "🇬🇧 London Canary Wharf"}
                      </div>
                      <div style={{ fontSize: "11px", color: colors.textSecondary }}>
                        {evt.gateName}
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem 0.85rem" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "0.2rem 0.5rem",
                          borderRadius: radii.sm,
                          backgroundColor: colors.surfaceSubtle,
                          border: `1px solid ${colors.borderSubtle}`,
                          color: colors.textSecondary,
                        }}
                      >
                        {evt.authMethod.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 0.85rem" }}>
                      {evt.decision === "ACCESS_GRANTED" ? (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "0.2rem 0.55rem",
                            borderRadius: radii.full,
                            backgroundColor: "rgba(16, 185, 129, 0.12)",
                            color: "#059669",
                          }}
                        >
                          ✓ GRANTED
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "0.2rem 0.55rem",
                            borderRadius: radii.full,
                            backgroundColor: "rgba(239, 68, 68, 0.12)",
                            color: "#b91c1c",
                          }}
                        >
                          ✕ DENIED
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem 0.85rem", color: colors.textSecondary }}>
                      {evt.syncReason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SlideOver: Shift Inspection */}
      {selectedShift && (
        <SlideOver
          isOpen={true}
          title={`Shift Rota Inspection: ${selectedShift.staffName}`}
          onClose={() => setSelectedShift(null)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "1.25rem" }}>
            <div style={{ padding: "1rem", borderRadius: radii.md, backgroundColor: colors.surfaceSubtle, border: `1px solid ${colors.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                <div style={{ width: "38px", height: "38px", borderRadius: "50%", backgroundColor: selectedShift.avatarColor, color: colors.surface, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "14px" }}>
                  {selectedShift.staffName.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>
                    {selectedShift.staffName}
                  </h4>
                  <div style={{ fontSize: "11px", color: colors.textMuted, fontFamily: typography.fontMono }}>
                    {selectedShift.staffId} • {selectedShift.role}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: typography.sizes.xs, color: colors.textSecondary }}>
                {selectedShift.department} • {selectedShift.team}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted }}>SCHEDULED SHIFT</label>
                <div style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary }}>{selectedShift.shiftLabel}</div>
                <div style={{ fontSize: typography.sizes.xs, color: colors.indigoAction, fontWeight: 600 }}>{selectedShift.dayOfWeek} ({selectedShift.shiftHours})</div>
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted }}>OPERATING HUB</label>
                <div style={{ fontSize: typography.sizes.sm, fontWeight: 600, color: colors.textPrimary }}>{selectedShift.hubName}</div>
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted }}>BIOMETRIC GATE PROVISIONING</label>
                <div style={{ fontSize: typography.sizes.xs, color: colors.emeraldDark, fontWeight: 700 }}>✓ ACTIVE &amp; PROVISIONED</div>
                <div style={{ fontSize: "11px", color: colors.textSecondary }}>Authorized Zone: {selectedShift.gateZone}</div>
              </div>

              {selectedShift.handoverNotes && (
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted }}>HANDOVER PROTOCOL / SHIFT NOTES</label>
                  <p style={{ margin: "0.25rem 0 0 0", fontSize: typography.sizes.xs, color: colors.textSecondary, lineHeight: 1.5 }}>
                    {selectedShift.handoverNotes}
                  </p>
                </div>
              )}
            </div>

            <div style={{ marginTop: "1rem" }}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setStatusMessage({ text: `Biometric speed-gate token refreshed for ${selectedShift.staffName} at ${selectedShift.hubName}.` });
                  setSelectedShift(null);
                }}
                style={{ width: "100%" }}
              >
                Re-Provision Gate Credential
              </Button>
            </div>
          </div>
        </SlideOver>
      )}

      {/* SlideOver: On-Call Matrix Inspection */}
      {selectedOnCall && (
        <SlideOver
          isOpen={true}
          title={`24/7 Escalation Protocol: ${selectedOnCall.serviceName}`}
          onClose={() => setSelectedOnCall(null)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "1.25rem" }}>
            <div style={{ padding: "0.85rem", borderRadius: radii.md, backgroundColor: colors.surfaceSubtle, border: `1px solid ${colors.border}` }}>
              <div style={{ fontSize: "11px", color: colors.indigoAction, fontWeight: 700, textTransform: "uppercase" }}>{selectedOnCall.department}</div>
              <h4 style={{ margin: "0.25rem 0 0 0", fontSize: typography.sizes.sm, fontWeight: 800, color: colors.textPrimary }}>
                {selectedOnCall.serviceName}
              </h4>
            </div>

            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted }}>ACTIVE ESCALATION PATHWAY</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.35rem" }}>
                <div style={{ padding: "0.6rem", borderRadius: radii.sm, backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", fontSize: typography.sizes.xs }}>
                  <strong>Tier 1 (0 – {selectedOnCall.escalationSlaMinutes} mins):</strong> {selectedOnCall.primaryLead.name} ({selectedOnCall.primaryLead.phone})
                </div>
                <div style={{ padding: "0.6rem", borderRadius: radii.sm, backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: typography.sizes.xs }}>
                  <strong>Tier 2 ({selectedOnCall.escalationSlaMinutes} – {selectedOnCall.escalationSlaMinutes * 2} mins):</strong> {selectedOnCall.secondaryLead.name} ({selectedOnCall.secondaryLead.phone})
                </div>
                <div style={{ padding: "0.6rem", borderRadius: radii.sm, backgroundColor: "#fffbeb", border: "1px solid #fde68a", fontSize: typography.sizes.xs }}>
                  <strong>Executive Escalation (&gt; {selectedOnCall.escalationSlaMinutes * 2} mins):</strong> {selectedOnCall.executiveCommander}
                </div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted }}>BIOMETRIC ACCESS PRIVILEGE</label>
              <div style={{ fontSize: typography.sizes.xs, color: colors.textPrimary, marginTop: "0.25rem" }}>
                {selectedOnCall.biometricGateAccess}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStatusMessage({ text: `Test incident alert dispatched for ${selectedOnCall.serviceName}.` });
                setSelectedOnCall(null);
              }}
            >
              Trigger Test Incident Escalation
            </Button>
          </div>
        </SlideOver>
      )}

      {/* SlideOver: Desk Allocation Details */}
      {selectedDesk && (
        <SlideOver
          isOpen={true}
          title={`Hybrid Desk: ${selectedDesk.deskCode}`}
          onClose={() => setSelectedDesk(null)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "1.25rem" }}>
            <div style={{ padding: "1rem", borderRadius: radii.md, backgroundColor: colors.surfaceSubtle, border: `1px solid ${colors.border}` }}>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: colors.indigoPrimary, fontFamily: typography.fontMono }}>
                {selectedDesk.deskCode}
              </div>
              <div style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: "0.2rem" }}>
                {selectedDesk.hub === "ACC" ? "Accra Global Hub (Ridge)" : "London Hub (Canary Wharf)"} • {selectedDesk.floor} ({selectedDesk.zone})
              </div>
            </div>

            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted }}>HARDWARE POD SPECIFICATION</label>
              <div style={{ fontSize: typography.sizes.sm, fontWeight: 700, color: colors.textPrimary, marginTop: "0.2rem" }}>
                {selectedDesk.deskType.replace(/_/g, " ")}
              </div>
            </div>

            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted }}>CURRENT ASSIGNMENT</label>
              {selectedDesk.allocatedStaff ? (
                <div style={{ marginTop: "0.35rem" }}>
                  <div style={{ fontWeight: 700, color: colors.textPrimary }}>{selectedDesk.allocatedStaff.name} ({selectedDesk.allocatedStaff.staffId})</div>
                  <div style={{ fontSize: typography.sizes.xs, color: colors.textSecondary }}>{selectedDesk.allocatedStaff.role} • {selectedDesk.allocatedStaff.department}</div>
                  <div style={{ fontSize: typography.sizes.xs, color: colors.indigoAction, fontWeight: 600, marginTop: "0.2rem" }}>Hybrid Days: {selectedDesk.hybridPattern}</div>
                </div>
              ) : (
                <div style={{ color: colors.textMuted, fontStyle: "italic", marginTop: "0.25rem" }}>No current occupant. Ready for staff booking.</div>
              )}
            </div>

            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted }}>BIOMETRIC SPEEDGATE ACCESS</label>
              <div style={{ fontSize: typography.sizes.xs, color: selectedDesk.biometricGateSync === "ACTIVE_TODAY" ? colors.emeraldDark : colors.textSecondary, fontWeight: 700, marginTop: "0.2rem" }}>
                {selectedDesk.biometricGateSync === "ACTIVE_TODAY" ? "✓ Synchronized & Gate Pass Active for Today" : "Queued according to hybrid in-office roster"}
              </div>
            </div>

            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted }}>HYGIENE &amp; SANITATION AUDIT</label>
              <div style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: "0.2rem" }}>{selectedDesk.sanitizedAt}</div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStatusMessage({ text: `Desk ${selectedDesk.deskCode} sanitation logged and biometric gate tokens updated.` });
                setSelectedDesk(null);
              }}
            >
              Log Cleaning &amp; Verify Gate Sync
            </Button>
          </div>
        </SlideOver>
      )}

      {/* Modal: Assign Shift */}
      {showAssignShiftModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.xl,
              border: `1px solid ${colors.border}`,
              width: "100%",
              maxWidth: "520px",
              boxShadow: shadows.lg,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: `1px solid ${colors.borderSubtle}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: typography.sizes.base, fontWeight: 700, color: colors.textPrimary }}>
                Assign Department Shift Rota
              </h3>
              <button onClick={() => setShowAssignShiftModal(false)} style={{ background: "none", border: "none", fontSize: "18px", color: colors.textMuted, cursor: "pointer" }}>×</button>
            </div>
            <form onSubmit={handleAddShiftSubmit} style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                  Staff Member Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Samuel Appiah"
                  value={newShiftStaff}
                  onChange={(e) => setNewShiftStaff(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                    Operating Hub
                  </label>
                  <select
                    value={newShiftHub}
                    onChange={(e) => setNewShiftHub(e.target.value as "ACC" | "LON")}
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs }}
                  >
                    <option value="ACC">Accra Global Hub (Ridge)</option>
                    <option value="LON">London Hub (Canary Wharf)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                    Day of Week
                  </label>
                  <select
                    value={newShiftDay}
                    onChange={(e) => setNewShiftDay(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs }}
                  >
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                  Department
                </label>
                <select
                  value={newShiftDept}
                  onChange={(e) => setNewShiftDept(e.target.value as DepartmentKey)}
                  style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs }}
                >
                  <option value="Healthcare Operations">Healthcare Operations</option>
                  <option value="Engineering &amp; Cloud">Engineering &amp; Cloud</option>
                  <option value="Customer Success">Customer Success</option>
                  <option value="Security &amp; Facilities">Security &amp; Facilities</option>
                  <option value="Advisory &amp; Finance">Advisory &amp; Finance</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                  Shift Window
                </label>
                <select
                  value={newShiftType}
                  onChange={(e) => setNewShiftType(e.target.value as ShiftType)}
                  style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs }}
                >
                  <option value="EARLY_MORNING">🌅 Early Morning Shift (06:00 - 14:00)</option>
                  <option value="STANDARD_DAY">🏢 Standard Business Shift (08:30 - 17:30)</option>
                  <option value="EVENING_HANDOVER">🌇 Evening Handover Shift (14:00 - 22:00)</option>
                  <option value="NIGHT_WATCH">🌙 Night Watch / ICU Shift (22:00 - 06:00)</option>
                </select>
              </div>

              <div style={{ padding: "0.6rem 0.75rem", borderRadius: radii.md, backgroundColor: "rgba(37, 99, 235, 0.08)", fontSize: "11px", color: "#1e40af" }}>
                🔒 <strong>Biometric Gate Automation:</strong> Saving this shift will automatically push facial vector &amp; mobile NFC tokens to the chosen hub speed-gate controller.
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <Button variant="outline" size="sm" onClick={() => setShowAssignShiftModal(false)}>Cancel</Button>
                <Button variant="primary" size="sm" type="submit">Confirm &amp; Provision Gates</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Book Desk */}
      {showDeskBookingModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.xl,
              border: `1px solid ${colors.border}`,
              width: "100%",
              maxWidth: "480px",
              boxShadow: shadows.lg,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: `1px solid ${colors.borderSubtle}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: typography.sizes.base, fontWeight: 700, color: colors.textPrimary }}>
                Reserve Hybrid Desk Pod
              </h3>
              <button onClick={() => setShowDeskBookingModal(false)} style={{ background: "none", border: "none", fontSize: "18px", color: colors.textMuted, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                  Select Available Hot-Desk Pod
                </label>
                <select
                  style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs }}
                >
                  <option value="ACC-F4-D14">🇬🇭 ACC-F4-D14 (Accra Floor 4 — Quiet Booth)</option>
                  <option value="LON-L18-D16">🇬🇧 LON-L18-D16 (London Level 18 — Flexi Hot-Desk)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: typography.sizes.xs, fontWeight: 700, color: colors.textSecondary, marginBottom: "0.3rem" }}>
                  Staff Reservation
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paa Kwesi Barnes"
                  defaultValue="Paa Kwesi Barnes"
                  style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.xs }}
                />
              </div>

              <div style={{ padding: "0.6rem 0.75rem", borderRadius: radii.md, backgroundColor: "rgba(16, 185, 129, 0.08)", fontSize: "11px", color: "#065f46" }}>
                ✓ <strong>SpeedGate Provisioning:</strong> Turnstile credentials will be authorized for the booking window automatically.
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <Button variant="outline" size="sm" onClick={() => setShowDeskBookingModal(false)}>Cancel</Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setShowDeskBookingModal(false);
                    setStatusMessage({ text: "Hybrid desk pod reserved successfully. Biometric speed-gate access authorized." });
                  }}
                >
                  Confirm Reservation
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
