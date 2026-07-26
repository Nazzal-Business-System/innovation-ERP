import type { MasterDataLifecycle } from "./master-data";

export type EmploymentStatus = "ACTIVE" | "ON_LEAVE" | "TERMINATED" | "PROBATION";
export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "REMOTE" | "HALF_DAY";
export type LeaveType = "ANNUAL" | "SICK" | "UNPAID" | "EMERGENCY";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type PayrollStatus = "DRAFT" | "PROCESSED" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
export type PayrollLinePaymentStatus = "UNPAID" | "PAID";
export type ContractType = "FULL_TIME" | "PART_TIME" | "TEMPORARY" | "INTERNSHIP" | "CONSULTANT";
export type ContractStatus = "ACTIVE" | "EXPIRED" | "TERMINATED" | "DRAFT";
export type DocumentStatus = "VALID" | "EXPIRED" | "MISSING" | "PENDING_REVIEW";

export interface HrDepartment {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  employeeCount?: number;
  positionCount?: number;
}

export interface HrEmployee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  department: { id: string; code: string; name: string };
  position: { id: string; title: string; level: string };
  manager: { id: string; fullName: string } | null;
  hireDate: string;
  employmentStatus: EmploymentStatus;
  workLocation: string;
  /** Null when the viewer lacks payroll/salary permission, or when unset. */
  salary: string | null;
  notes: string | null;
  hasAvatar: boolean;
  avatarUpdatedAt: string | null;
  /** Linked login account when present — used for presence; not every employee has one. */
  accountUserId?: string | null;
  lastSeenAt?: string | null;
  lastActiveAt?: string | null;
  isActive: boolean;
  deactivatedAt: string | null;
  reactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HrEmployeeProfilePayrollLine {
  id: string;
  payrollRunId: string;
  runNumber: string;
  periodStart: string;
  periodEnd: string;
  /** Present on self-service / detailed payroll views. */
  baseSalary?: string;
  allowances?: string;
  deductions?: string;
  /** Gross = base + allowances when provided. */
  grossPay?: string;
  netPay: string;
  status: PayrollStatus;
  paymentStatus: PayrollLinePaymentStatus;
  paidAt: string | null;
}

export interface HrEmployeeProfileContract {
  id: string;
  contractNumber: string;
  contractType: ContractType;
  startDate: string;
  endDate: string | null;
  /** Null when the viewer lacks payroll/salary permission. */
  salary: string | null;
  status: ContractStatus;
  isExpiringSoon: boolean;
}

export interface HrEmployeeProfileDocument {
  id: string;
  documentType: string;
  title: string;
  expiryDate: string | null;
  status: DocumentStatus;
  isExpired: boolean;
  isExpiringSoon: boolean;
  isMissing: boolean;
}

export interface HrEmployeeDetail extends HrEmployee, MasterDataLifecycle {
  attendanceSnapshot: Array<{
    date: string;
    status: AttendanceStatus;
    checkIn: string | null;
    checkOut: string | null;
  }>;
  recentLeaveRequests: HrLeaveRequest[];
  directReports: Array<{
    id: string;
    fullName: string;
    employeeNumber: string;
    positionTitle: string;
  }>;
  activeContract: HrEmployeeProfileContract | null;
  recentDocuments: HrEmployeeProfileDocument[];
  /** Present only when the viewer has payroll/salary permission. */
  latestPayrollLine: HrEmployeeProfilePayrollLine | null;
  canViewSalary: boolean;
}

export interface UpdateEmployeeInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  departmentId?: string;
  positionId?: string;
  managerId?: string | null;
  hireDate?: string;
  employmentStatus?: EmploymentStatus;
  workLocation?: string;
  salary?: number | null;
  notes?: string | null;
}

export interface CreateEmployeeInput {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  departmentId: string;
  positionId: string;
  managerId?: string;
  hireDate: string;
  employmentStatus?: EmploymentStatus;
  workLocation: string;
  salary?: number;
}

export interface HrAttendanceRecord {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus;
  notes: string | null;
  employee: {
    id: string;
    employeeNumber: string;
    fullName: string;
    department: string;
    workLocation: string;
    hasAvatar?: boolean;
  };
}

export interface HrLeaveRequest {
  id: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: string;
  status: LeaveStatus;
  reason: string | null;
  employee: {
    id: string;
    employeeNumber: string;
    fullName: string;
    department: string;
    hasAvatar?: boolean;
  };
  /** Employee assigned to review the request (pending or historical). */
  assignedApprover: { id: string; fullName: string; hasAvatar?: boolean } | null;
  /**
   * Actor who approved/rejected.
   * Prefer authenticated User (decidedBy); fall back to legacy employee approvedBy.
   * Null when not recorded.
   */
  decidedBy: { id: string; name: string } | null;
  decidedAt: string | null;
  /**
   * @deprecated Prefer decidedBy. Kept for older clients as a name-compatible alias
   * of the decision actor when status is APPROVED/REJECTED.
   */
  approvedBy: { id: string; fullName: string } | null;
  createdAt: string;
}

export interface HrLeaveRequestDetail extends HrLeaveRequest {
  employee: HrLeaveRequest["employee"] & {
    email: string;
    phone: string | null;
    position: string;
    workLocation: string;
  };
}

export interface HrOverview {
  totalEmployees: number;
  activeEmployees: number;
  onLeaveToday: number;
  attendanceToday: number;
  pendingLeaveRequests: number;
  departmentsCount: number;
  payrollThisMonth: string;
  pendingPayrollRuns: number;
  activeContracts: number;
  expiringContracts: number;
  missingDocuments: number;
  expiredDocuments: number;
  employeesByDepartment: Array<{ department: string; code: string; count: number }>;
  attendanceSummary: Array<{ status: AttendanceStatus; count: number }>;
  recentLeaveRequests: HrLeaveRequest[];
  newHires: Array<{ id: string; employeeNumber: string; fullName: string; department: string; hireDate: string }>;
}

export interface HrPayrollRun {
  id: string;
  runNumber: string;
  periodStart: string;
  periodEnd: string;
  status: PayrollStatus;
  /** Canonical decimal string, e.g. `"12345.67"` — format for display in UI. */
  grossTotal: string;
  deductionsTotal: string;
  netTotal: string;
  processedAt: string | null;
  processedBy: { id: string; name: string } | null;
  lineCount: number;
  paidEmployeeCount?: number;
  unpaidEmployeeCount?: number;
  paidAmount?: string;
  unpaidAmount?: string;
}

export interface HrPayrollPaymentSummary {
  totalEmployees: number;
  paidEmployees: number;
  unpaidEmployees: number;
  /** Canonical decimal strings for aggregation/display. */
  totalPayroll: string;
  paidAmount: string;
  unpaidAmount: string;
  departmentsTotal: number;
  departmentsCompleted: number;
}

export interface HrPayrollRunDetail extends Omit<HrPayrollRun, "lineCount"> {
  notes: string | null;
  lines: HrPayrollLine[];
  paymentSummary: HrPayrollPaymentSummary;
}

export interface HrPayrollLine {
  id: string;
  employee: {
    id: string;
    employeeNumber: string;
    fullName: string;
    department: string;
    departmentId: string;
    hasAvatar?: boolean;
  };
  /** Canonical decimal strings (`"1507.50"`). Do not sum display-formatted currency. */
  baseSalary: string;
  allowances: string;
  deductions: string;
  netPay: string;
  status: PayrollStatus;
  /** Derived: PAID lines are PAID; PROCESSED (and DRAFT) are UNPAID for payment UI. */
  paymentStatus: PayrollLinePaymentStatus;
  paidAt: string | null;
  paidBy: { id: string; name: string } | null;
  paymentReference: string | null;
}

export interface PayPayrollRunInput {
  mode: "allRemaining" | "department" | "employees" | "lines";
  departmentId?: string;
  employeeIds?: string[];
  /** Preferred for selection-based payments — stable payroll line IDs. */
  lineIds?: string[];
}

export interface HrContract {
  id: string;
  contractNumber: string;
  contractType: ContractType;
  startDate: string;
  endDate: string | null;
  salary: string;
  status: ContractStatus;
  isExpiringSoon: boolean;
  employee: {
    id: string;
    employeeNumber: string;
    fullName: string;
    department: string;
    hasAvatar?: boolean;
  };
}

export interface HrContractDetail extends HrContract {
  notes: string | null;
  employee: HrContract["employee"] & {
    email: string;
    position: string;
    workLocation: string;
  };
}

export interface HrDocument {
  id: string;
  documentType: string;
  title: string;
  fileUrl: string | null;
  expiryDate: string | null;
  status: DocumentStatus;
  /** True when status is EXPIRED or expiryDate is in the past (and not MISSING). */
  isExpired: boolean;
  /** True when expiryDate is within the warning window and document is still VALID/PENDING_REVIEW. */
  isExpiringSoon: boolean;
  isMissing: boolean;
  employee: {
    id: string;
    employeeNumber: string;
    fullName: string;
    department: string;
    hasAvatar?: boolean;
  };
}

export interface HrDocumentDetail extends HrDocument {
  notes: string | null;
  employee: HrDocument["employee"] & {
    email: string;
    position: string;
    workLocation: string;
  };
}

export interface HrPosition {
  id: string;
  title: string;
  level: string;
  isActive: boolean;
  department: { id: string; code: string; name: string };
  employeeCount: number;
}

export interface HrPositionDetail extends HrPosition {
  employees: Array<{
    id: string;
    employeeNumber: string;
    fullName: string;
    employmentStatus: EmploymentStatus;
    hireDate: string;
    hasAvatar?: boolean;
  }>;
}

export const HR_PERMISSIONS = {
  READ: "hr.read",
  WRITE: "hr.write",
} as const;

/** Employee self-service (own records only). Distinct from full HR management. */
export const HR_SELF_PERMISSIONS = {
  READ: "hr_self.read",
  WRITE: "hr_self.write",
} as const;

/** Server-side list sort for HR employees. Default remains name order. */
export type HrEmployeeSort =
  | "NEWEST"
  | "OLDEST"
  | "NAME_ASC"
  | "NAME_DESC"
  | "HIRE_DESC"
  | "HIRE_ASC";

export type HrLeaveSort = "NEWEST" | "OLDEST" | "START_DESC" | "START_ASC";

export type HrPayrollSort = "NEWEST" | "OLDEST" | "PERIOD_DESC" | "PERIOD_ASC";

export type HrContractSort =
  | "NEWEST"
  | "OLDEST"
  | "START_DESC"
  | "START_ASC"
  | "END_ASC"
  | "END_DESC";

export type HrDocumentSort =
  | "NEWEST"
  | "OLDEST"
  | "EXPIRY_ASC"
  | "EXPIRY_DESC"
  | "TITLE_ASC"
  | "TITLE_DESC";

export type HrDocumentExpiryState = "expired" | "expiring_soon" | "ok";

export type HrPositionSort =
  | "NEWEST"
  | "OLDEST"
  | "TITLE_ASC"
  | "TITLE_DESC"
  | "DEPT_TITLE";

export type HrDepartmentSort =
  | "NEWEST"
  | "OLDEST"
  | "NAME_ASC"
  | "NAME_DESC"
  | "CODE_ASC"
  | "CODE_DESC";

export interface UpdateLeaveRequestInput {
  type?: LeaveType;
  startDate?: string;
  endDate?: string;
  days?: number;
  reason?: string | null;
  /** Assign/change reviewer while pending. Pass null to clear. */
  assignedApproverId?: string | null;
}

export interface UpdatePayrollRunInput {
  notes?: string | null;
}

export interface UpdateContractInput {
  contractType?: ContractType;
  startDate?: string;
  endDate?: string | null;
  salary?: number;
  status?: ContractStatus;
  notes?: string | null;
}

export interface UpdateHrDocumentInput {
  title?: string;
  documentType?: string;
  fileUrl?: string | null;
  expiryDate?: string | null;
  status?: DocumentStatus;
  notes?: string | null;
}

export interface CreatePositionInput {
  departmentId: string;
  title: string;
  level: string;
  isActive?: boolean;
}

export interface UpdatePositionInput {
  title?: string;
  level?: string;
  departmentId?: string;
  isActive?: boolean;
}

export interface CreateDepartmentInput {
  code: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface CreateContractInput {
  employeeId: string;
  contractNumber: string;
  contractType: ContractType;
  startDate: string;
  endDate?: string;
  salary: number;
  status?: ContractStatus;
  notes?: string;
}

export interface CreateHrDocumentInput {
  employeeId: string;
  documentType: string;
  title: string;
  /** Optional linked storage path/reference — prefer Document module linking over raw URLs. */
  fileUrl?: string;
  expiryDate?: string;
  status?: DocumentStatus;
  notes?: string;
}

export interface CreateLeaveRequestInput {
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  assignedApproverId?: string;
}
