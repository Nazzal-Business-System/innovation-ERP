import {
  ContractStatus,
  ContractType,
  DocumentStatus,
  PayrollStatus,
  PrismaClient,
} from "@prisma/client";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const HR_USER_ID = "00000000-0000-4000-8000-000000000024";

const CONTRACT_TYPES: ContractType[] = [
  "FULL_TIME",
  "PART_TIME",
  "TEMPORARY",
  "INTERNSHIP",
  "CONSULTANT",
];

const DOCUMENT_TYPES = [
  "National ID",
  "Passport",
  "Work Permit",
  "Medical Certificate",
  "Employment Contract",
  "Degree Certificate",
  "Driving License",
  "Social Security Card",
];

function dateOnly(iso: string): Date {
  return new Date(iso);
}

function calcPayrollLine(base: number) {
  const allowances = Math.round(base * 0.08 * 100) / 100;
  const deductions = Math.round(base * 0.075 * 100) / 100;
  const netPay = base + allowances - deductions;
  return { base, allowances, deductions, netPay, gross: base + allowances };
}

export async function seedHrExpansion(prisma: PrismaClient) {
  await prisma.payrollLine.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.payrollRun.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.employeeDocument.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.employeeContract.deleteMany({ where: { organizationId: ORG_ID } });

  const employees = await prisma.employee.findMany({
    where: { organizationId: ORG_ID, isActive: true },
    orderBy: { employeeNumber: "asc" },
  });

  if (employees.length === 0) {
    return { payrollRuns: 0, payrollLines: 0, contracts: 0, documents: 0 };
  }

  const payrollRuns = [
    {
      id: "00000000-0000-4000-8000-000000000800",
      runNumber: "PR-2026-0001",
      periodStart: "2026-03-01",
      periodEnd: "2026-03-31",
      status: "PAID" as PayrollStatus,
      processedAt: "2026-04-02T10:00:00.000Z",
    },
    {
      id: "00000000-0000-4000-8000-000000000801",
      runNumber: "PR-2026-0002",
      periodStart: "2026-04-01",
      periodEnd: "2026-04-30",
      status: "PAID" as PayrollStatus,
      processedAt: "2026-05-03T10:00:00.000Z",
    },
    {
      id: "00000000-0000-4000-8000-000000000802",
      runNumber: "PR-2026-0003",
      periodStart: "2026-05-01",
      periodEnd: "2026-05-31",
      status: "PROCESSED" as PayrollStatus,
      processedAt: "2026-06-02T10:00:00.000Z",
    },
    {
      id: "00000000-0000-4000-8000-000000000803",
      runNumber: "PR-2026-0004",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      status: "DRAFT" as PayrollStatus,
      processedAt: null as string | null,
    },
  ];

  let payrollLineCount = 0;
  let lineIdCounter = 850;

  for (const run of payrollRuns) {
    let grossTotal = 0;
    let deductionsTotal = 0;
    let netTotal = 0;
    const lineStatus: PayrollStatus =
      run.status === "DRAFT" ? "DRAFT" : run.status === "PAID" ? "PAID" : "PROCESSED";

    const lines = employees.map((emp) => {
      const base = Number(emp.salary ?? 850 + lineIdCounter * 2);
      const calc = calcPayrollLine(base);
      grossTotal += calc.gross;
      deductionsTotal += calc.deductions;
      netTotal += calc.netPay;
      const lineId = `00000000-0000-4000-8000-000000000${String(lineIdCounter++).padStart(3, "0")}`;
      return {
        id: lineId,
        employeeId: emp.id,
        baseSalary: calc.base,
        allowances: calc.allowances,
        deductions: calc.deductions,
        netPay: calc.netPay,
        status: lineStatus,
      };
    });

    payrollLineCount += lines.length;

    await prisma.payrollRun.create({
      data: {
        organizationId: ORG_ID,
        id: run.id,
        runNumber: run.runNumber,
        periodStart: dateOnly(run.periodStart),
        periodEnd: dateOnly(run.periodEnd),
        status: run.status,
        grossTotal,
        deductionsTotal,
        netTotal,
        processedById: run.processedAt ? HR_USER_ID : null,
        processedAt: run.processedAt ? new Date(run.processedAt) : null,
        notes: run.status === "DRAFT" ? "June payroll — pending HR review" : null,
        lines: {
          create: lines.map((line) => ({
            organizationId: ORG_ID,
            id: line.id,
            employeeId: line.employeeId,
            baseSalary: line.baseSalary,
            allowances: line.allowances,
            deductions: line.deductions,
            netPay: line.netPay,
            status: line.status,
          })),
        },
      },
    });
  }

  const contractStatuses: ContractStatus[] = ["ACTIVE", "ACTIVE", "ACTIVE", "EXPIRED", "TERMINATED", "DRAFT"];
  let contractCount = 0;

  for (let i = 0; i < 40; i++) {
    const emp = employees[i % employees.length];
    const type = CONTRACT_TYPES[i % CONTRACT_TYPES.length];
    const status = contractStatuses[i % contractStatuses.length];
    const baseSalary = Number(emp.salary ?? 900 + i * 50);
    const startYear = 2024 + (i % 3);
    const startDate = `${startYear}-${String((i % 12) + 1).padStart(2, "0")}-01`;
    const hasEnd = type !== "FULL_TIME" || i % 5 === 0;
    let endDate: string | null = null;
    if (hasEnd) {
      if (i % 7 === 0) endDate = "2026-07-15";
      else if (i % 11 === 0) endDate = "2026-08-30";
      else if (status === "EXPIRED") endDate = "2026-01-15";
      else endDate = `${startYear + 1}-12-31`;
    }

    await prisma.employeeContract.create({
      data: {
        organizationId: ORG_ID,
        id: `00000000-0000-4000-8000-000000000${950 + i}`,
        employeeId: emp.id,
        contractNumber: `CNT-2026-${String(i + 1).padStart(4, "0")}`,
        contractType: type,
        startDate: dateOnly(startDate),
        endDate: endDate ? dateOnly(endDate) : null,
        salary: baseSalary,
        status,
        notes: status === "TERMINATED" ? "End of probation — mutual agreement" : null,
      },
    });
    contractCount++;
  }

  const docStatuses: DocumentStatus[] = ["VALID", "VALID", "EXPIRED", "MISSING", "PENDING_REVIEW"];
  let documentCount = 0;

  for (let i = 0; i < 80; i++) {
    const emp = employees[i % employees.length];
    const docType = DOCUMENT_TYPES[i % DOCUMENT_TYPES.length];
    const status = docStatuses[i % docStatuses.length];
    let expiryDate: string | null = null;
    if (status === "EXPIRED") expiryDate = "2025-12-01";
    else if (status === "VALID" && i % 4 === 0) expiryDate = "2026-07-20";
    else if (status === "VALID" && i % 6 === 0) expiryDate = "2027-01-15";
    else if (status === "PENDING_REVIEW") expiryDate = "2026-09-01";
    else if (status === "VALID") expiryDate = "2028-06-30";

    await prisma.employeeDocument.create({
      data: {
        organizationId: ORG_ID,
        id: `00000000-0000-4000-8000-000000001${String(i).padStart(3, "0")}`,
        employeeId: emp.id,
        documentType: docType,
        title: `${docType} — ${emp.firstName} ${emp.lastName}`,
        fileUrl: status === "MISSING" ? null : `/demo/documents/${emp.employeeNumber}-${docType.toLowerCase().replace(/\s+/g, "-")}.pdf`,
        expiryDate: expiryDate ? dateOnly(expiryDate) : null,
        status,
        notes: status === "MISSING" ? "Employee notified to upload" : status === "EXPIRED" ? "Renewal required" : null,
      },
    });
    documentCount++;
  }

  // Ensure demo self-service employees always have an ACTIVE contract (seed status cycle
  // previously left some demos with EXPIRED/DRAFT only).
  const demoEmployeeIds = [
    "00000000-0000-4000-8000-000000000739",
    "00000000-0000-4000-8000-000000000741",
    "00000000-0000-4000-8000-000000000743",
    "00000000-0000-4000-8000-000000000749",
    "00000000-0000-4000-8000-000000000754",
    "00000000-0000-4000-8000-000000000760",
  ];

  for (const [index, employeeId] of demoEmployeeIds.entries()) {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) continue;
    const active = await prisma.employeeContract.findFirst({
      where: { organizationId: ORG_ID, employeeId, status: "ACTIVE" },
    });
    if (active) continue;

    const existing = await prisma.employeeContract.findFirst({
      where: { organizationId: ORG_ID, employeeId },
      orderBy: { startDate: "desc" },
    });
    if (existing) {
      await prisma.employeeContract.update({
        where: { id: existing.id },
        data: { status: "ACTIVE", notes: existing.notes ?? "Active employment contract" },
      });
    } else {
      await prisma.employeeContract.create({
        data: {
          organizationId: ORG_ID,
          id: `00000000-0000-4000-8000-00000000099${index}`,
          employeeId,
          contractNumber: `CNT-ESS-${String(index + 1).padStart(4, "0")}`,
          contractType: "FULL_TIME",
          startDate: dateOnly("2024-01-01"),
          endDate: null,
          salary: Number(emp.salary ?? 1000),
          status: "ACTIVE",
          notes: "Active employment contract",
        },
      });
      contractCount++;
    }
  }

  return {
    payrollRuns: payrollRuns.length,
    payrollLines: payrollLineCount,
    contracts: contractCount,
    documents: documentCount,
  };
}
