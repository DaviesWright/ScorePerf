export type CycleStatus =
  | "draft"
  | "configured"
  | "approved"
  | "active"
  | "review"
  | "calibration"
  | "approval"
  | "certified"
  | "published"
  | "closed";

export type FrameworkCode = "OKR" | "MBO" | "BSC";

export interface Company {
  id: number;
  name: string;
  subdomain?: string;
  hq: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface Employee {
  id: number;
  companyId: number;
  departmentId?: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  teamName?: string;
}

export interface PerformanceCycle {
  id: number;
  companyId: number;
  frameworkTypeId: number;
  frameworkCode?: FrameworkCode;
  frameworkName?: string;
  frameworkConfigurationId?: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: CycleStatus;
}

export interface AppraisalEvaluation {
  id: number;
  companyId: number;
  cycleId: number;
  employeeId: number;
  reviewerId?: number;
  frameworkCode: FrameworkCode;
  score?: number;
  feedback?: string;
  status: string;
}

export interface KPI {
  id: number;
  companyId: number;
  name: string;
  target: number;
  current: number;
  unit: string;
}

export interface PerformanceReview {
  id: number;
  companyId: number;
  cycleId: number;
  employeeId: number;
  reviewerId?: number;
  selfScore?: number;
  managerScore?: number;
  calibratedScore?: number;
  status: string;
  feedback?: string;
}

// Queue Job Message Types
export interface ScoreCalculationJob {
  type: "score_calculation";
  companyId: number;
  cycleId: number;
  employeeId: number;
  timestamp: string;
}

export interface KpiCreatedJob {
  type: "kpi_created";
  companyId: number;
  kpiId: number;
  name: string;
  target: number;
  timestamp: string;
}

export interface CycleAdvanceJob {
  type: "cycle_stage_advance";
  companyId: number;
  cycleId: number;
  targetStage: CycleStatus;
  timestamp: string;
}

export type JobMessage =
  | ScoreCalculationJob
  | KpiCreatedJob
  | CycleAdvanceJob;

// Core HRMS Domain Types

export interface Shift {
  id: number;
  companyId: number;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface AttendanceRecord {
  id: number;
  companyId: number;
  employeeId: number;
  attendanceDate: string;
  clockIn?: string;
  clockOut?: string;
  totalHours: number;
  overtimeHours: number;
  status: string;
}

export interface LeaveType {
  id: number;
  companyId: number;
  name: string;
  defaultDays: number;
  isCarryForward: boolean;
}

export interface LeaveRequest {
  id: number;
  companyId: number;
  employeeId: number;
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  requestedDays: number;
  status: "pending" | "approved" | "rejected";
  reason: string;
}

export interface SalaryStructure {
  id: number;
  companyId: number;
  name: string;
  baseSalary: number;
  currency: string;
}

export interface Payslip {
  id: number;
  companyId: number;
  employeeId: number;
  month: number;
  year: number;
  grossPay: number;
  deductions: number;
  netPay: number;
  status: "draft" | "approved" | "paid";
}

export interface JobPosition {
  id: number;
  companyId: number;
  departmentId?: number;
  title: string;
  vacancies: number;
  status: "open" | "closed";
}

export interface Candidate {
  id: number;
  companyId: number;
  jobPositionId: number;
  name: string;
  email: string;
  stage: string;
  rating?: number;
}

export interface CompanyAsset {
  id: number;
  companyId: number;
  name: string;
  assetCode: string;
  serialNumber: string;
  status: "available" | "allocated" | "maintenance";
}

export interface HelpdeskTicket {
  id: number;
  companyId: number;
  employeeId: number;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "resolved" | "closed";
}

export interface Project {
  id: number;
  companyId: number;
  name: string;
  status: "active" | "completed" | "on_hold";
}

export interface EmployeeDocument {
  id: number;
  companyId: number;
  employeeId: number;
  title: string;
  fileUrl: string;
  status: "pending" | "approved" | "rejected";
  expiryDate?: string;
}


