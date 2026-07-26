import type { Prisma } from "@prisma/client";
import type {
  AttendanceStatus,
  ContractStatus,
  ContractType,
  DocumentStatus,
  EmploymentStatus,
  HrAttendanceRecord,
  HrContract,
  HrContractDetail,
  HrDepartment,
  HrDocument,
  HrDocumentDetail,
  HrEmployee,
  HrEmployeeDetail,
  HrEmployeeProfileContract,
  HrEmployeeProfileDocument,
  HrEmployeeProfilePayrollLine,
  HrLeaveRequest,
  HrLeaveRequestDetail,
  HrPayrollLine,
  HrPayrollPaymentSummary,
  HrPayrollRun,
  HrPayrollRunDetail,
  HrPosition,
  HrPositionDetail,
  LeaveStatus,
  LeaveType,
  PayrollLinePaymentStatus,
  PayrollStatus,
} from "@ierp/shared";

type DepartmentRecord = Prisma.DepartmentGetPayload<object>;

type EmployeeWithRelations = Prisma.EmployeeGetPayload<{
  include: {
    department: true;
    position: true;
    manager: true;
  };
}> & {
  /** Present when the query includes the linked User relation. */
  user?: {
    id: string;
    lastSeenAt: Date | null;
    lastActiveAt: Date | null;
    avatarPath: string | null;
    updatedAt: Date;
  } | null;
};

type AttendanceWithEmployee = Prisma.AttendanceRecordGetPayload<{
  include: {
    employee: { include: { department: true } };
  };
}>;

type LeaveWithRelations = Prisma.LeaveRequestGetPayload<{
  include: {
    employee: { include: { department: true; position: true } };
    approvedBy: true;
    assignedApprover: true;
    decidedBy: true;
  };
}>;

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function formatTime(value: Date | null): string | null {
  if (!value) return null;
  return value.toISOString().slice(11, 16);
}

export function formatSalary(value: Prisma.Decimal | number | null): string | null {
  if (value === null || value === undefined) return null;
  const num = typeof value === "number" ? value : Number(value);
  return `JOD ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Display money with currency prefix (non-payroll / legacy surfaces). */
export function formatMoney(value: Prisma.Decimal | number): string {
  const num = typeof value === "number" ? value : Number(value);
  return `JOD ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Canonical payroll amount for API clients (`"1507.50"`).
 * Calculations must use this form; format to JOD only in the UI.
 */
export function formatCanonicalMoney(value: Prisma.Decimal | number): string {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) {
    throw new Error("Invalid money amount");
  }
  return (Math.round(num * 100) / 100).toFixed(2);
}

export function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}

export function serializeDepartment(
  dept: DepartmentRecord,
  counts?: { employees: number; positions: number }
): HrDepartment {
  return {
    id: dept.id,
    code: dept.code,
    name: dept.name,
    description: dept.description,
    isActive: dept.isActive,
    employeeCount: counts?.employees,
    positionCount: counts?.positions,
  };
}

export function serializeEmployee(
  emp: EmployeeWithRelations,
  options?: { includeSalary?: boolean }
): HrEmployee {
  const includeSalary = options?.includeSalary !== false;
  return {
    id: emp.id,
    employeeNumber: emp.employeeNumber,
    firstName: emp.firstName,
    lastName: emp.lastName,
    fullName: fullName(emp.firstName, emp.lastName),
    email: emp.email,
    phone: emp.phone,
    department: { id: emp.department.id, code: emp.department.code, name: emp.department.name },
    position: { id: emp.position.id, title: emp.position.title, level: emp.position.level },
    manager: emp.manager
      ? { id: emp.manager.id, fullName: fullName(emp.manager.firstName, emp.manager.lastName) }
      : null,
    hireDate: formatDate(emp.hireDate),
    employmentStatus: emp.employmentStatus as EmploymentStatus,
    workLocation: emp.workLocation,
    salary: includeSalary ? formatSalary(emp.salary) : null,
    notes: emp.notes ?? null,
    hasAvatar: Boolean(emp.avatarPath),
    avatarUpdatedAt: emp.avatarPath ? emp.updatedAt.toISOString() : null,
    accountUserId: emp.user?.id ?? null,
    lastSeenAt: emp.user?.lastSeenAt?.toISOString() ?? null,
    lastActiveAt: emp.user?.lastActiveAt?.toISOString() ?? null,
    isActive: emp.isActive,
    deactivatedAt: emp.deactivatedAt?.toISOString() ?? null,
    reactivatedAt: emp.reactivatedAt?.toISOString() ?? null,
    createdAt: emp.createdAt.toISOString(),
    updatedAt: emp.updatedAt.toISOString(),
  };
}

export function serializeEmployeeProfileContract(
  contract: {
    id: string;
    contractNumber: string;
    contractType: string;
    startDate: Date;
    endDate: Date | null;
    salary: Prisma.Decimal | number;
    status: string;
  },
  options?: { includeSalary?: boolean }
): HrEmployeeProfileContract {
  const includeSalary = options?.includeSalary !== false;
  return {
    id: contract.id,
    contractNumber: contract.contractNumber,
    contractType: contract.contractType as ContractType,
    startDate: formatDate(contract.startDate),
    endDate: contract.endDate ? formatDate(contract.endDate) : null,
    salary: includeSalary ? formatMoney(contract.salary) : null,
    status: contract.status as ContractStatus,
    isExpiringSoon: isExpiringSoon(contract.endDate) && contract.status === "ACTIVE",
  };
}

export function serializeEmployeeProfileDocument(doc: {
  id: string;
  documentType: string;
  title: string;
  expiryDate: Date | null;
  status: string;
}): HrEmployeeProfileDocument {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const datePast =
    doc.expiryDate !== null && doc.expiryDate < today && doc.status !== "MISSING";
  const expired = doc.status === "EXPIRED" || datePast;
  const expiringSoon =
    doc.status !== "EXPIRED" &&
    doc.status !== "MISSING" &&
    isExpiringSoon(doc.expiryDate, 60);
  return {
    id: doc.id,
    documentType: doc.documentType,
    title: doc.title,
    expiryDate: doc.expiryDate ? formatDate(doc.expiryDate) : null,
    status: doc.status as DocumentStatus,
    isExpired: expired,
    isExpiringSoon: expiringSoon,
    isMissing: doc.status === "MISSING",
  };
}

export function serializeEmployeeProfilePayrollLine(line: {
  id: string;
  netPay: Prisma.Decimal | number;
  status: string;
  paidAt: Date | null;
  baseSalary?: Prisma.Decimal | number;
  allowances?: Prisma.Decimal | number;
  deductions?: Prisma.Decimal | number;
  payrollRun: {
    id: string;
    runNumber: string;
    periodStart: Date;
    periodEnd: Date;
  };
}, options?: { includeBreakdown?: boolean }): HrEmployeeProfilePayrollLine {
  const paymentStatus: PayrollLinePaymentStatus = line.status === "PAID" ? "PAID" : "UNPAID";
  const includeBreakdown = options?.includeBreakdown === true;
  const base =
    line.baseSalary !== undefined ? Number(line.baseSalary) : null;
  const allowances =
    line.allowances !== undefined ? Number(line.allowances) : null;
  const deductions =
    line.deductions !== undefined ? Number(line.deductions) : null;

  return {
    id: line.id,
    payrollRunId: line.payrollRun.id,
    runNumber: line.payrollRun.runNumber,
    periodStart: formatDate(line.payrollRun.periodStart),
    periodEnd: formatDate(line.payrollRun.periodEnd),
    ...(includeBreakdown && base !== null
      ? {
          baseSalary: formatCanonicalMoney(base),
          allowances: formatCanonicalMoney(allowances ?? 0),
          deductions: formatCanonicalMoney(deductions ?? 0),
          grossPay: formatCanonicalMoney((base ?? 0) + (allowances ?? 0)),
        }
      : {}),
    netPay: formatCanonicalMoney(line.netPay),
    status: line.status as PayrollStatus,
    paymentStatus,
    paidAt: line.paidAt?.toISOString() ?? null,
  };
}

export function serializeEmployeeDetail(
  emp: EmployeeWithRelations,
  attendance: AttendanceWithEmployee[],
  leaves: LeaveWithRelations[],
  extras: {
    includeSalary: boolean;
    directReports: Array<{
      id: string;
      firstName: string;
      lastName: string;
      employeeNumber: string;
      position: { title: string };
    }>;
    activeContract: Parameters<typeof serializeEmployeeProfileContract>[0] | null;
    recentDocuments: Array<Parameters<typeof serializeEmployeeProfileDocument>[0]>;
    latestPayrollLine: Parameters<typeof serializeEmployeeProfilePayrollLine>[0] | null;
  }
): Omit<HrEmployeeDetail, "audit" | "timeline"> {
  return {
    ...serializeEmployee(emp, { includeSalary: extras.includeSalary }),
    attendanceSnapshot: attendance.map((a) => ({
      date: formatDate(a.date),
      status: a.status as AttendanceStatus,
      checkIn: formatTime(a.checkIn),
      checkOut: formatTime(a.checkOut),
    })),
    recentLeaveRequests: leaves.map(serializeLeaveRequest),
    directReports: extras.directReports.map((r) => ({
      id: r.id,
      fullName: fullName(r.firstName, r.lastName),
      employeeNumber: r.employeeNumber,
      positionTitle: r.position.title,
    })),
    activeContract: extras.activeContract
      ? serializeEmployeeProfileContract(extras.activeContract, {
          includeSalary: extras.includeSalary,
        })
      : null,
    recentDocuments: extras.recentDocuments.map(serializeEmployeeProfileDocument),
    latestPayrollLine:
      extras.includeSalary && extras.latestPayrollLine
        ? serializeEmployeeProfilePayrollLine(extras.latestPayrollLine)
        : null,
    canViewSalary: extras.includeSalary,
  };
}

export function serializeAttendance(record: AttendanceWithEmployee): HrAttendanceRecord {
  return {
    id: record.id,
    date: formatDate(record.date),
    checkIn: formatTime(record.checkIn),
    checkOut: formatTime(record.checkOut),
    status: record.status as AttendanceStatus,
    notes: record.notes,
    employee: {
      id: record.employee.id,
      employeeNumber: record.employee.employeeNumber,
      fullName: fullName(record.employee.firstName, record.employee.lastName),
      department: record.employee.department.name,
      workLocation: record.employee.workLocation,
      hasAvatar: Boolean(record.employee.avatarPath),
    },
  };
}

export function serializeLeaveRequest(leave: LeaveWithRelations): HrLeaveRequest {
  const decidedByUser = leave.decidedBy
    ? { id: leave.decidedBy.id, name: leave.decidedBy.name }
    : null;
  const legacyEmployeeActor = leave.approvedBy
    ? {
        id: leave.approvedBy.id,
        fullName: fullName(leave.approvedBy.firstName, leave.approvedBy.lastName),
      }
    : null;
  const decidedBy =
    decidedByUser ??
    (legacyEmployeeActor
      ? { id: legacyEmployeeActor.id, name: legacyEmployeeActor.fullName }
      : null);

  return {
    id: leave.id,
    type: leave.type as LeaveType,
    startDate: formatDate(leave.startDate),
    endDate: formatDate(leave.endDate),
    days: Number(leave.days).toFixed(1),
    status: leave.status as LeaveStatus,
    reason: leave.reason,
    employee: {
      id: leave.employee.id,
      employeeNumber: leave.employee.employeeNumber,
      fullName: fullName(leave.employee.firstName, leave.employee.lastName),
      department: leave.employee.department.name,
      hasAvatar: Boolean(leave.employee.avatarPath),
    },
    assignedApprover: leave.assignedApprover
      ? {
          id: leave.assignedApprover.id,
          fullName: fullName(leave.assignedApprover.firstName, leave.assignedApprover.lastName),
          hasAvatar: Boolean(leave.assignedApprover.avatarPath),
        }
      : null,
    decidedBy,
    decidedAt: leave.decidedAt ? leave.decidedAt.toISOString() : null,
    approvedBy: decidedBy
      ? { id: decidedBy.id, fullName: decidedBy.name }
      : legacyEmployeeActor,
    createdAt: leave.createdAt.toISOString(),
  };
}

export function serializeLeaveRequestDetail(leave: LeaveWithRelations): HrLeaveRequestDetail {
  return {
    ...serializeLeaveRequest(leave),
    employee: {
      ...serializeLeaveRequest(leave).employee,
      email: leave.employee.email,
      phone: leave.employee.phone,
      position: leave.employee.position.title,
      workLocation: leave.employee.workLocation,
    },
  };
}

type PayrollRunWithRelations = Prisma.PayrollRunGetPayload<{
  include: { processedBy: true; _count: { select: { lines: true } } };
}>;

type PayrollRunDetailWithRelations = Prisma.PayrollRunGetPayload<{
  include: {
    processedBy: true;
    lines: {
      include: {
        employee: { include: { department: true } };
        paidBy: true;
      };
    };
  };
}>;

type ContractWithEmployee = Prisma.EmployeeContractGetPayload<{
  include: { employee: { include: { department: true; position: true } } };
}>;

type DocumentWithEmployee = Prisma.EmployeeDocumentGetPayload<{
  include: { employee: { include: { department: true; position: true } } };
}>;

type PositionWithDepartment = Prisma.PositionGetPayload<{
  include: { department: true; _count: { select: { employees: true } } };
}>;

type PositionDetailWithEmployees = Prisma.PositionGetPayload<{
  include: {
    department: true;
    employees: true;
    _count: { select: { employees: true } };
  };
}>;

function isExpiringSoon(endDate: Date | null, days = 60): boolean {
  if (!endDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + days);
  return endDate >= today && endDate <= limit;
}

function buildPayrollPaymentSummary(
  lines: PayrollRunDetailWithRelations["lines"]
): HrPayrollPaymentSummary {
  const totalEmployees = lines.length;
  let paidEmployees = 0;
  let unpaidEmployees = 0;
  let paidAmount = 0;
  let unpaidAmount = 0;
  let totalPayroll = 0;

  const deptStats = new Map<string, { total: number; paid: number }>();

  for (const line of lines) {
    const net = Number(line.netPay);
    totalPayroll += net;
    const deptId = line.employee.departmentId;
    const bucket = deptStats.get(deptId) ?? { total: 0, paid: 0 };
    bucket.total += 1;

    if (line.status === "PAID") {
      paidEmployees += 1;
      paidAmount += net;
      bucket.paid += 1;
    } else if (line.status === "PROCESSED" || line.status === "DRAFT") {
      unpaidEmployees += 1;
      unpaidAmount += net;
    }

    deptStats.set(deptId, bucket);
  }

  let departmentsCompleted = 0;
  for (const stats of deptStats.values()) {
    if (stats.total > 0 && stats.paid === stats.total) {
      departmentsCompleted += 1;
    }
  }

  return {
    totalEmployees,
    paidEmployees,
    unpaidEmployees,
    totalPayroll: formatCanonicalMoney(totalPayroll),
    paidAmount: formatCanonicalMoney(paidAmount),
    unpaidAmount: formatCanonicalMoney(unpaidAmount),
    departmentsTotal: deptStats.size,
    departmentsCompleted,
  };
}

function serializePayrollLine(line: PayrollRunDetailWithRelations["lines"][number]): HrPayrollLine {
  const paymentStatus: PayrollLinePaymentStatus = line.status === "PAID" ? "PAID" : "UNPAID";
  return {
    id: line.id,
    employee: {
      id: line.employee.id,
      employeeNumber: line.employee.employeeNumber,
      fullName: fullName(line.employee.firstName, line.employee.lastName),
      department: line.employee.department.name,
      departmentId: line.employee.departmentId,
      hasAvatar: Boolean(line.employee.avatarPath),
    },
    baseSalary: formatCanonicalMoney(line.baseSalary),
    allowances: formatCanonicalMoney(line.allowances),
    deductions: formatCanonicalMoney(line.deductions),
    netPay: formatCanonicalMoney(line.netPay),
    status: line.status as PayrollStatus,
    paymentStatus,
    paidAt: line.paidAt?.toISOString() ?? null,
    paidBy: line.paidBy ? { id: line.paidBy.id, name: line.paidBy.name } : null,
    paymentReference: line.paymentReference ?? null,
  };
}

export function serializePayrollRun(run: PayrollRunWithRelations): HrPayrollRun {
  return {
    id: run.id,
    runNumber: run.runNumber,
    periodStart: formatDate(run.periodStart),
    periodEnd: formatDate(run.periodEnd),
    status: run.status as PayrollStatus,
    grossTotal: formatCanonicalMoney(run.grossTotal),
    deductionsTotal: formatCanonicalMoney(run.deductionsTotal),
    netTotal: formatCanonicalMoney(run.netTotal),
    processedAt: run.processedAt?.toISOString() ?? null,
    processedBy: run.processedBy ? { id: run.processedBy.id, name: run.processedBy.name } : null,
    lineCount: run._count.lines,
  };
}

export function serializePayrollRunDetail(run: PayrollRunDetailWithRelations): HrPayrollRunDetail {
  const lines = run.lines.map(serializePayrollLine);
  const paymentSummary = buildPayrollPaymentSummary(run.lines);
  return {
    id: run.id,
    runNumber: run.runNumber,
    periodStart: formatDate(run.periodStart),
    periodEnd: formatDate(run.periodEnd),
    status: run.status as PayrollStatus,
    grossTotal: formatCanonicalMoney(run.grossTotal),
    deductionsTotal: formatCanonicalMoney(run.deductionsTotal),
    netTotal: formatCanonicalMoney(run.netTotal),
    processedAt: run.processedAt?.toISOString() ?? null,
    processedBy: run.processedBy ? { id: run.processedBy.id, name: run.processedBy.name } : null,
    notes: run.notes,
    lines,
    paymentSummary,
    paidEmployeeCount: paymentSummary.paidEmployees,
    unpaidEmployeeCount: paymentSummary.unpaidEmployees,
    paidAmount: paymentSummary.paidAmount,
    unpaidAmount: paymentSummary.unpaidAmount,
  };
}

export function serializeContract(contract: ContractWithEmployee): HrContract {
  return {
    id: contract.id,
    contractNumber: contract.contractNumber,
    contractType: contract.contractType as ContractType,
    startDate: formatDate(contract.startDate),
    endDate: contract.endDate ? formatDate(contract.endDate) : null,
    salary: formatMoney(contract.salary),
    status: contract.status as ContractStatus,
    isExpiringSoon: isExpiringSoon(contract.endDate) && contract.status === "ACTIVE",
    employee: {
      id: contract.employee.id,
      employeeNumber: contract.employee.employeeNumber,
      fullName: fullName(contract.employee.firstName, contract.employee.lastName),
      department: contract.employee.department.name,
      hasAvatar: Boolean(contract.employee.avatarPath),
    },
  };
}

export function serializeContractDetail(contract: ContractWithEmployee): HrContractDetail {
  return {
    ...serializeContract(contract),
    notes: contract.notes,
    employee: {
      ...serializeContract(contract).employee,
      email: contract.employee.email,
      position: contract.employee.position.title,
      workLocation: contract.employee.workLocation,
    },
  };
}

export function serializeDocument(doc: DocumentWithEmployee): HrDocument {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const datePast =
    doc.expiryDate !== null && doc.expiryDate < today && doc.status !== "MISSING";
  const expired = doc.status === "EXPIRED" || datePast;
  const expiringSoon =
    doc.status !== "EXPIRED" &&
    doc.status !== "MISSING" &&
    isExpiringSoon(doc.expiryDate, 60);
  return {
    id: doc.id,
    documentType: doc.documentType,
    title: doc.title,
    fileUrl: doc.fileUrl,
    expiryDate: doc.expiryDate ? formatDate(doc.expiryDate) : null,
    status: doc.status as DocumentStatus,
    isExpired: expired,
    isExpiringSoon: expiringSoon,
    isMissing: doc.status === "MISSING",
    employee: {
      id: doc.employee.id,
      employeeNumber: doc.employee.employeeNumber,
      fullName: fullName(doc.employee.firstName, doc.employee.lastName),
      department: doc.employee.department.name,
      hasAvatar: Boolean(doc.employee.avatarPath),
    },
  };
}

export function serializeDocumentDetail(doc: DocumentWithEmployee): HrDocumentDetail {
  return {
    ...serializeDocument(doc),
    notes: doc.notes,
    employee: {
      ...serializeDocument(doc).employee,
      email: doc.employee.email,
      position: doc.employee.position.title,
      workLocation: doc.employee.workLocation,
    },
  };
}

export function serializePosition(pos: PositionWithDepartment): HrPosition {
  return {
    id: pos.id,
    title: pos.title,
    level: pos.level,
    isActive: pos.isActive,
    department: { id: pos.department.id, code: pos.department.code, name: pos.department.name },
    employeeCount: pos._count.employees,
  };
}

export function serializePositionDetail(pos: PositionDetailWithEmployees): HrPositionDetail {
  return {
    ...serializePosition(pos),
    employees: pos.employees.map((emp) => ({
      id: emp.id,
      employeeNumber: emp.employeeNumber,
      fullName: fullName(emp.firstName, emp.lastName),
      employmentStatus: emp.employmentStatus as EmploymentStatus,
      hireDate: formatDate(emp.hireDate),
      hasAvatar: Boolean(emp.avatarPath),
    })),
  };
}
