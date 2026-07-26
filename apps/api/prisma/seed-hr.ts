import {
  PrismaClient,
  AttendanceStatus,
  EmploymentStatus,
  LeaveStatus,
  LeaveType,
} from "@prisma/client";

const ORG_ID = "00000000-0000-4000-8000-000000000001";

export const DEPARTMENT_IDS = {
  executive: "00000000-0000-4000-8000-000000000700",
  finance: "00000000-0000-4000-8000-000000000701",
  inventory: "00000000-0000-4000-8000-000000000702",
  procurement: "00000000-0000-4000-8000-000000000703",
  sales: "00000000-0000-4000-8000-000000000704",
  hr: "00000000-0000-4000-8000-000000000705",
  operations: "00000000-0000-4000-8000-000000000706",
  it: "00000000-0000-4000-8000-000000000707",
} as const;

const DEPARTMENTS = [
  { id: DEPARTMENT_IDS.executive, code: "EXEC", name: "Executive", description: "Leadership and strategy" },
  { id: DEPARTMENT_IDS.finance, code: "FIN", name: "Finance", description: "Accounting, treasury, and compliance" },
  { id: DEPARTMENT_IDS.inventory, code: "INV", name: "Inventory", description: "Warehousing and stock control" },
  { id: DEPARTMENT_IDS.procurement, code: "PROC", name: "Procurement", description: "Vendor management and purchasing" },
  { id: DEPARTMENT_IDS.sales, code: "SALES", name: "Sales", description: "Customer accounts and order fulfillment" },
  { id: DEPARTMENT_IDS.hr, code: "HR", name: "HR", description: "People operations and employee services" },
  { id: DEPARTMENT_IDS.operations, code: "OPS", name: "Operations", description: "Branch operations and logistics" },
  { id: DEPARTMENT_IDS.it, code: "IT", name: "IT", description: "Systems, support, and infrastructure" },
];

const POSITIONS: Array<{
  id: string;
  departmentId: string;
  title: string;
  level: string;
}> = [
  { id: "00000000-0000-4000-8000-000000000710", departmentId: DEPARTMENT_IDS.executive, title: "Chief Executive Officer", level: "Executive" },
  { id: "00000000-0000-4000-8000-000000000711", departmentId: DEPARTMENT_IDS.executive, title: "Operations Director", level: "Director" },
  { id: "00000000-0000-4000-8000-000000000712", departmentId: DEPARTMENT_IDS.finance, title: "Finance Manager", level: "Manager" },
  { id: "00000000-0000-4000-8000-000000000713", departmentId: DEPARTMENT_IDS.finance, title: "Accountant", level: "Professional" },
  { id: "00000000-0000-4000-8000-000000000714", departmentId: DEPARTMENT_IDS.finance, title: "Accounts Payable Specialist", level: "Specialist" },
  { id: "00000000-0000-4000-8000-000000000715", departmentId: DEPARTMENT_IDS.inventory, title: "Inventory Manager", level: "Manager" },
  { id: "00000000-0000-4000-8000-000000000716", departmentId: DEPARTMENT_IDS.inventory, title: "Warehouse Supervisor", level: "Supervisor" },
  { id: "00000000-0000-4000-8000-000000000717", departmentId: DEPARTMENT_IDS.inventory, title: "Stock Controller", level: "Specialist" },
  { id: "00000000-0000-4000-8000-000000000718", departmentId: DEPARTMENT_IDS.inventory, title: "Warehouse Associate", level: "Associate" },
  { id: "00000000-0000-4000-8000-000000000719", departmentId: DEPARTMENT_IDS.procurement, title: "Procurement Manager", level: "Manager" },
  { id: "00000000-0000-4000-8000-000000000720", departmentId: DEPARTMENT_IDS.procurement, title: "Buyer", level: "Professional" },
  { id: "00000000-0000-4000-8000-000000000721", departmentId: DEPARTMENT_IDS.sales, title: "Sales Manager", level: "Manager" },
  { id: "00000000-0000-4000-8000-000000000722", departmentId: DEPARTMENT_IDS.sales, title: "Account Executive", level: "Professional" },
  { id: "00000000-0000-4000-8000-000000000723", departmentId: DEPARTMENT_IDS.sales, title: "Sales Coordinator", level: "Coordinator" },
  { id: "00000000-0000-4000-8000-000000000724", departmentId: DEPARTMENT_IDS.hr, title: "HR Manager", level: "Manager" },
  { id: "00000000-0000-4000-8000-000000000725", departmentId: DEPARTMENT_IDS.hr, title: "HR Specialist", level: "Specialist" },
  { id: "00000000-0000-4000-8000-000000000726", departmentId: DEPARTMENT_IDS.operations, title: "Branch Manager", level: "Manager" },
  { id: "00000000-0000-4000-8000-000000000727", departmentId: DEPARTMENT_IDS.operations, title: "Logistics Coordinator", level: "Coordinator" },
  { id: "00000000-0000-4000-8000-000000000728", departmentId: DEPARTMENT_IDS.it, title: "IT Manager", level: "Manager" },
  { id: "00000000-0000-4000-8000-000000000729", departmentId: DEPARTMENT_IDS.it, title: "Systems Administrator", level: "Professional" },
];

const FIRST_NAMES = [
  "Ahmad", "Layla", "Omar", "Nour", "Khalid", "Rania", "Tariq", "Sara", "Hassan", "Maya",
  "Youssef", "Dina", "Fadi", "Hala", "Samir", "Lina", "Bassam", "Reem", "Walid", "Nadia",
  "Karim", "Salma", "Ziad", "Mariam", "Issa", "Hanan", "Jamil", "Farah", "Nabil", "Aya",
  "Rami", "Suha", "Maher", "Ghada", "Elias", "Rana", "Murad", "Leila", "Anas", "Yasmin",
  "Firas", "Hiba", "Adnan", "Mona", "Sami", "Dalal", "Wael", "Jana", "Bilal", "Tamara",
  "Hussein", "Amal",
];

const LAST_NAMES = [
  "Nazzal", "Haddad", "Khoury", "Odeh", "Masri", "Saleh", "Awad", "Hamdan", "Qudah", "Shammout",
  "Rawashdeh", "Toukan", "Bani", "Darwish", "Nimri", "Zayed", "Jaber", "Majali", "Sabbagh", "Freij",
  "Habash", "Salem", "Barakat", "Issa", "Mansour", "Khalil", "Younis", "Farah", "Sabbah", "Rimawi",
  "Abu-Ghanem", "Hassan", "Sweiss", "Attar", "Nasser", "Qasem", "Barghouti", "Tamimi", "Halawani", "Said",
  "Khatib", "Omari", "Rajabi", "Shreim", "Badran", "Fayyad", "Zoubi", "Hamad", "Jaradat", "Abu-Rumman",
  "Qaisi", "Natour",
];

const LOCATIONS = ["Amman HQ", "Amman Warehouse", "Irbid Branch", "Irbid Warehouse"];

function padNum(n: number, len = 4): string {
  return String(n).padStart(len, "0");
}

function dateOnly(iso: string): Date {
  return new Date(iso);
}

function buildEmployees() {
  const employees: Array<{
    id: string;
    employeeNumber: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    departmentId: string;
    positionId: string;
    managerId: string | null;
    hireDate: string;
    employmentStatus: EmploymentStatus;
    workLocation: string;
    salary: number;
    isActive: boolean;
  }> = [];

  const deptPositionMap: Record<string, string[]> = {};
  for (const pos of POSITIONS) {
    if (!deptPositionMap[pos.departmentId]) deptPositionMap[pos.departmentId] = [];
    deptPositionMap[pos.departmentId].push(pos.id);
  }

  const deptKeys = Object.values(DEPARTMENT_IDS);
  let idx = 0;

  // Leadership first (managers)
  const ceoId = "00000000-0000-4000-8000-000000000730";
  employees.push({
    id: ceoId,
    employeeNumber: "EMP-0001",
    firstName: "Ahmad",
    lastName: "Nazzal",
    email: "ahmad.nazzal@alnoor.jo",
    phone: "+962 6 550 0101",
    departmentId: DEPARTMENT_IDS.executive,
    positionId: POSITIONS[0].id,
    managerId: null,
    hireDate: "2018-03-01",
    employmentStatus: "ACTIVE",
    workLocation: "Amman HQ",
    salary: 4500,
    isActive: true,
  });
  idx++;

  const managerIds: string[] = [ceoId];

  for (let i = 1; i <= 51; i++) {
    const id = `00000000-0000-4000-8000-0000000007${padNum(30 + i, 2)}`;
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[i % LAST_NAMES.length];
    const deptId = deptKeys[i % deptKeys.length];
    const positions = deptPositionMap[deptId] ?? [POSITIONS[0].id];
    const positionId = positions[i % positions.length];
    const location = LOCATIONS[i % LOCATIONS.length];
    const isManager = i <= 8;
    const managerId = isManager ? ceoId : managerIds[i % managerIds.length];

    let status: EmploymentStatus = "ACTIVE";
    if (i === 15) status = "ON_LEAVE";
    if (i === 48) status = "PROBATION";
    if (i === 50) status = "TERMINATED";

    const hireYear = 2019 + (i % 6);
    const hireMonth = (i % 12) + 1;

    employees.push({
      id,
      employeeNumber: `EMP-${padNum(i + 1)}`,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@alnoor.jo`,
      phone: `+962 7 9${padNum(1000000 + i * 137).slice(0, 7)}`,
      departmentId: deptId,
      positionId,
      managerId,
      hireDate: `${hireYear}-${padNum(hireMonth, 2)}-${padNum((i % 28) + 1, 2)}`,
      employmentStatus: status,
      workLocation: location,
      salary: 650 + (i % 20) * 85,
      isActive: i !== 50,
    });

    if (isManager) managerIds.push(id);
    idx++;
  }

  return employees;
}

const ATTENDANCE_STATUSES: AttendanceStatus[] = ["PRESENT", "LATE", "ABSENT", "REMOTE", "HALF_DAY"];

function buildAttendance(employeeIds: string[]) {
  const records: Array<{
    id: string;
    employeeId: string;
    date: string;
    status: AttendanceStatus;
    checkInHour: number;
    checkInMin: number;
    checkOutHour: number;
    notes: string | null;
  }> = [];

  let seq = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const d = new Date(today);
    d.setDate(d.getDate() - dayOffset);
    if (d.getDay() === 5) continue; // skip Fridays

    const dateStr = d.toISOString().slice(0, 10);
    const sampleSize = dayOffset === 0 ? employeeIds.length : Math.min(40, employeeIds.length);

    for (let i = 0; i < sampleSize; i++) {
      const empId = employeeIds[i % employeeIds.length];
      const statusIdx = (seq + i + dayOffset) % ATTENDANCE_STATUSES.length;
      let status = ATTENDANCE_STATUSES[statusIdx];
      if (dayOffset === 0 && i < 35) status = i % 7 === 0 ? "LATE" : i % 11 === 0 ? "REMOTE" : "PRESENT";
      if (dayOffset === 0 && i >= 45) status = "ABSENT";

      const checkInHour = status === "ABSENT" ? 0 : status === "LATE" ? 9 : 8;
      const checkInMin = status === "LATE" ? 15 + (i % 30) : 30 + (i % 20);

      records.push({
        id: `00000000-0000-4000-8000-00000000${padNum(seq, 4)}`,
        employeeId: empId,
        date: dateStr,
        status,
        checkInHour,
        checkInMin,
        checkOutHour: status === "ABSENT" ? 0 : status === "HALF_DAY" ? 13 : 17,
        notes: status === "REMOTE" ? "Working from home" : status === "LATE" ? "Traffic delay" : null,
      });
      seq++;
    }
  }

  return records;
}

const LEAVE_REQUESTS: Array<{
  id: string;
  employeeIdx: number;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  status: LeaveStatus;
  reason: string;
  approverIdx: number | null;
}> = [
  { id: "00000000-0000-4000-8000-000000000900", employeeIdx: 5, type: "ANNUAL", startDate: "2026-06-01", endDate: "2026-06-05", days: 5, status: "APPROVED", reason: "Family vacation", approverIdx: 24 },
  { id: "00000000-0000-4000-8000-000000000901", employeeIdx: 12, type: "SICK", startDate: "2026-06-10", endDate: "2026-06-11", days: 2, status: "APPROVED", reason: "Flu recovery", approverIdx: 24 },
  { id: "00000000-0000-4000-8000-000000000902", employeeIdx: 8, type: "ANNUAL", startDate: "2026-06-15", endDate: "2026-06-20", days: 4, status: "PENDING", reason: "Summer break", approverIdx: null },
  { id: "00000000-0000-4000-8000-000000000903", employeeIdx: 20, type: "EMERGENCY", startDate: "2026-06-08", endDate: "2026-06-08", days: 1, status: "APPROVED", reason: "Family emergency", approverIdx: 24 },
  { id: "00000000-0000-4000-8000-000000000904", employeeIdx: 3, type: "ANNUAL", startDate: "2026-07-01", endDate: "2026-07-10", days: 7, status: "PENDING", reason: "Annual leave — Europe trip", approverIdx: null },
  { id: "00000000-0000-4000-8000-000000000905", employeeIdx: 15, type: "SICK", startDate: "2026-05-20", endDate: "2026-05-22", days: 3, status: "APPROVED", reason: "Medical procedure", approverIdx: 24 },
  { id: "00000000-0000-4000-8000-000000000906", employeeIdx: 25, type: "UNPAID", startDate: "2026-06-25", endDate: "2026-06-27", days: 3, status: "PENDING", reason: "Personal matters", approverIdx: null },
  { id: "00000000-0000-4000-8000-000000000907", employeeIdx: 30, type: "ANNUAL", startDate: "2026-05-01", endDate: "2026-05-05", days: 3, status: "REJECTED", reason: "Peak season conflict", approverIdx: 24 },
  { id: "00000000-0000-4000-8000-000000000908", employeeIdx: 18, type: "SICK", startDate: "2026-06-18", endDate: "2026-06-19", days: 2, status: "PENDING", reason: "Doctor appointment", approverIdx: null },
  { id: "00000000-0000-4000-8000-000000000909", employeeIdx: 7, type: "ANNUAL", startDate: "2026-08-01", endDate: "2026-08-07", days: 5, status: "PENDING", reason: "Eid holiday extension", approverIdx: null },
  { id: "00000000-0000-4000-8000-000000000910", employeeIdx: 22, type: "EMERGENCY", startDate: "2026-04-15", endDate: "2026-04-16", days: 2, status: "APPROVED", reason: "Bereavement", approverIdx: 24 },
  { id: "00000000-0000-4000-8000-000000000911", employeeIdx: 35, type: "ANNUAL", startDate: "2026-06-22", endDate: "2026-06-24", days: 3, status: "PENDING", reason: "Wedding attendance", approverIdx: null },
  { id: "00000000-0000-4000-8000-000000000912", employeeIdx: 10, type: "SICK", startDate: "2026-03-10", endDate: "2026-03-12", days: 3, status: "APPROVED", reason: "Back injury", approverIdx: 24 },
  { id: "00000000-0000-4000-8000-000000000913", employeeIdx: 40, type: "ANNUAL", startDate: "2026-09-01", endDate: "2026-09-05", days: 5, status: "PENDING", reason: "School holiday with children", approverIdx: null },
  { id: "00000000-0000-4000-8000-000000000914", employeeIdx: 14, type: "UNPAID", startDate: "2026-02-01", endDate: "2026-02-05", days: 5, status: "REJECTED", reason: "Insufficient notice", approverIdx: 24 },
  { id: "00000000-0000-4000-8000-000000000915", employeeIdx: 28, type: "ANNUAL", startDate: "2026-06-12", endDate: "2026-06-14", days: 3, status: "APPROVED", reason: "Short break", approverIdx: 24 },
  { id: "00000000-0000-4000-8000-000000000916", employeeIdx: 33, type: "SICK", startDate: "2026-06-20", endDate: "2026-06-20", days: 1, status: "PENDING", reason: "Migraine", approverIdx: null },
  { id: "00000000-0000-4000-8000-000000000917", employeeIdx: 6, type: "EMERGENCY", startDate: "2026-01-20", endDate: "2026-01-21", days: 2, status: "APPROVED", reason: "Hospital visit", approverIdx: 24 },
  { id: "00000000-0000-4000-8000-000000000918", employeeIdx: 42, type: "ANNUAL", startDate: "2026-07-15", endDate: "2026-07-19", days: 5, status: "PENDING", reason: "Coastal vacation", approverIdx: null },
  { id: "00000000-0000-4000-8000-000000000919", employeeIdx: 38, type: "SICK", startDate: "2026-05-05", endDate: "2026-05-06", days: 2, status: "REJECTED", reason: "No medical certificate", approverIdx: 24 },
];

export async function seedHr(prisma: PrismaClient) {
  await prisma.leaveRequest.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.attendanceRecord.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.employee.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.position.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.department.deleteMany({ where: { organizationId: ORG_ID } });

  for (const dept of DEPARTMENTS) {
    await prisma.department.create({
      data: { organizationId: ORG_ID, ...dept, isActive: true },
    });
  }

  for (const pos of POSITIONS) {
    await prisma.position.create({
      data: { organizationId: ORG_ID, ...pos, isActive: true },
    });
  }

  const employees = buildEmployees();
  for (const emp of employees) {
    await prisma.employee.create({
      data: {
        organizationId: ORG_ID,
        id: emp.id,
        employeeNumber: emp.employeeNumber,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        phone: emp.phone,
        departmentId: emp.departmentId,
        positionId: emp.positionId,
        managerId: emp.managerId,
        hireDate: dateOnly(emp.hireDate),
        employmentStatus: emp.employmentStatus,
        workLocation: emp.workLocation,
        salary: emp.salary,
        isActive: emp.isActive,
      },
    });
  }

  const employeeIds = employees.map((e) => e.id);
  const attendance = buildAttendance(employeeIds);

  for (const rec of attendance) {
    const date = dateOnly(rec.date);
    const checkIn =
      rec.status === "ABSENT"
        ? null
        : new Date(`${rec.date}T${padNum(rec.checkInHour, 2)}:${padNum(rec.checkInMin, 2)}:00.000Z`);
    const checkOut =
      rec.status === "ABSENT"
        ? null
        : new Date(`${rec.date}T${padNum(rec.checkOutHour, 2)}:00:00.000Z`);

    await prisma.attendanceRecord.create({
      data: {
        organizationId: ORG_ID,
        id: rec.id,
        employeeId: rec.employeeId,
        date,
        checkIn,
        checkOut,
        status: rec.status,
        notes: rec.notes,
      },
    });
  }

  for (const leave of LEAVE_REQUESTS) {
    const emp = employees[leave.employeeIdx];
    const approver = leave.approverIdx !== null ? employees[leave.approverIdx] : null;
    if (!emp) continue;

    const isPending = leave.status === "PENDING";
    await prisma.leaveRequest.create({
      data: {
        organizationId: ORG_ID,
        id: leave.id,
        employeeId: emp.id,
        type: leave.type,
        startDate: dateOnly(leave.startDate),
        endDate: dateOnly(leave.endDate),
        days: leave.days,
        status: leave.status,
        reason: leave.reason,
        // Pending: assigned reviewer (manager fallback). Decided: legacy employee actor only.
        assignedApproverId: isPending ? (approver?.id ?? emp.managerId ?? null) : null,
        approvedById: isPending ? null : (approver?.id ?? null),
      },
    });
  }

  return {
    departments: DEPARTMENTS.length,
    positions: POSITIONS.length,
    employees: employees.length,
    attendance: attendance.length,
    leaveRequests: LEAVE_REQUESTS.length,
  };
}
