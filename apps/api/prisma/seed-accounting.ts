import { PrismaClient, AccountType, JournalEntryStatus, NormalBalance } from "@prisma/client";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const CEO_USER_ID = "00000000-0000-4000-8000-000000000020";
const FINANCE_USER_ID = "00000000-0000-4000-8000-000000000021";
const PROTECTED_ACCOUNT_CODES = new Set(["1000", "1010", "1100", "1200", "2000", "2100", "4000"]);

const ACCOUNTS: Array<{
  id: string;
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
}> = [
  { id: "00000000-0000-4000-8000-000000000800", code: "1000", name: "Cash", type: "ASSET", normalBalance: "DEBIT" },
  { id: "00000000-0000-4000-8000-000000000801", code: "1010", name: "Bank", type: "ASSET", normalBalance: "DEBIT" },
  { id: "00000000-0000-4000-8000-000000000802", code: "1100", name: "Accounts Receivable", type: "ASSET", normalBalance: "DEBIT" },
  { id: "00000000-0000-4000-8000-000000000803", code: "1200", name: "Inventory", type: "ASSET", normalBalance: "DEBIT" },
  { id: "00000000-0000-4000-8000-000000000804", code: "1500", name: "Fixed Assets", type: "ASSET", normalBalance: "DEBIT" },
  { id: "00000000-0000-4000-8000-000000000805", code: "2000", name: "Accounts Payable", type: "LIABILITY", normalBalance: "CREDIT" },
  { id: "00000000-0000-4000-8000-000000000806", code: "2100", name: "VAT Payable", type: "LIABILITY", normalBalance: "CREDIT" },
  { id: "00000000-0000-4000-8000-000000000807", code: "3000", name: "Owner Equity", type: "EQUITY", normalBalance: "CREDIT" },
  { id: "00000000-0000-4000-8000-000000000808", code: "4000", name: "Sales Revenue", type: "REVENUE", normalBalance: "CREDIT" },
  { id: "00000000-0000-4000-8000-000000000809", code: "5000", name: "Cost of Goods Sold", type: "EXPENSE", normalBalance: "DEBIT" },
  { id: "00000000-0000-4000-8000-000000000810", code: "6100", name: "Salaries Expense", type: "EXPENSE", normalBalance: "DEBIT" },
  { id: "00000000-0000-4000-8000-000000000811", code: "6200", name: "Rent Expense", type: "EXPENSE", normalBalance: "DEBIT" },
  { id: "00000000-0000-4000-8000-000000000812", code: "6300", name: "Utilities Expense", type: "EXPENSE", normalBalance: "DEBIT" },
  { id: "00000000-0000-4000-8000-000000000813", code: "6400", name: "Marketing Expense", type: "EXPENSE", normalBalance: "DEBIT" },
  { id: "00000000-0000-4000-8000-000000000814", code: "6500", name: "Freight Expense", type: "EXPENSE", normalBalance: "DEBIT" },
];

type LineSeed = { code: string; debit?: number; credit?: number; description?: string };

type EntrySeed = {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  status: JournalEntryStatus;
  sourceModule?: string;
  sourceReference?: string;
  createdById: string;
  lines: LineSeed[];
};

const JOURNAL_ENTRIES: EntrySeed[] = [
  {
    id: "00000000-0000-4000-8000-000000000820",
    entryNumber: "JE-2026-0001",
    entryDate: "2026-01-01",
    description: "Opening balances — Al-Noor Trading",
    status: "POSTED",
    sourceModule: "manual",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "1010", debit: 185000, description: "Bank opening balance" },
      { code: "1100", debit: 52000, description: "AR opening balance" },
      { code: "1200", debit: 95000, description: "Inventory opening balance" },
      { code: "1500", debit: 145000, description: "Fixed assets opening" },
      { code: "2000", credit: 42000, description: "AP opening balance" },
      { code: "2100", credit: 8500, description: "VAT opening balance" },
      { code: "3000", credit: 426500, description: "Owner equity opening" },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000821",
    entryNumber: "JE-2026-0002",
    entryDate: "2026-01-08",
    description: "Sales invoice SO-2026-0001 — Amman Supermarket",
    status: "POSTED",
    sourceModule: "sales",
    sourceReference: "SO-2026-0001",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "1100", debit: 1740 },
      { code: "4000", credit: 1500 },
      { code: "2100", credit: 240 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000822",
    entryNumber: "JE-2026-0003",
    entryDate: "2026-01-08",
    description: "COGS for SO-2026-0001",
    status: "POSTED",
    sourceModule: "sales",
    sourceReference: "SO-2026-0001",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "5000", debit: 980 },
      { code: "1200", credit: 980 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000823",
    entryNumber: "JE-2026-0004",
    entryDate: "2026-01-12",
    description: "Vendor invoice PO-2026-0002 — Levant Grocery",
    status: "POSTED",
    sourceModule: "procurement",
    sourceReference: "PO-2026-0002",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "1200", debit: 8700 },
      { code: "2100", debit: 1392 },
      { code: "2000", credit: 10092 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000824",
    entryNumber: "JE-2026-0005",
    entryDate: "2026-01-15",
    description: "Customer payment received — CUS-001",
    status: "POSTED",
    sourceModule: "sales",
    sourceReference: "SO-2026-0001",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "1010", debit: 1740 },
      { code: "1100", credit: 1740 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000825",
    entryNumber: "JE-2026-0006",
    entryDate: "2026-01-31",
    description: "January salaries — Amman HQ",
    status: "POSTED",
    sourceModule: "manual",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "6100", debit: 18500 },
      { code: "1010", credit: 18500 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000826",
    entryNumber: "JE-2026-0007",
    entryDate: "2026-02-01",
    description: "February rent — Amman warehouse",
    status: "POSTED",
    sourceModule: "manual",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "6200", debit: 4200 },
      { code: "1010", credit: 4200 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000827",
    entryNumber: "JE-2026-0008",
    entryDate: "2026-02-10",
    description: "Sales invoice SO-2026-0004 — Dead Sea Hotels",
    status: "POSTED",
    sourceModule: "sales",
    sourceReference: "SO-2026-0004",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "1100", debit: 8120 },
      { code: "4000", credit: 7000 },
      { code: "2100", credit: 1120 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000828",
    entryNumber: "JE-2026-0009",
    entryDate: "2026-02-10",
    description: "COGS for SO-2026-0004",
    status: "POSTED",
    sourceModule: "sales",
    sourceReference: "SO-2026-0004",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "5000", debit: 4620 },
      { code: "1200", credit: 4620 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000829",
    entryNumber: "JE-2026-0010",
    entryDate: "2026-02-15",
    description: "Utilities — February",
    status: "POSTED",
    sourceModule: "manual",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "6300", debit: 890 },
      { code: "1010", credit: 890 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000830",
    entryNumber: "JE-2026-0011",
    entryDate: "2026-02-20",
    description: "Vendor payment — Jordan Beverages PO-2026-0001",
    status: "POSTED",
    sourceModule: "procurement",
    sourceReference: "PO-2026-0001",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "2000", debit: 5220 },
      { code: "1010", credit: 5220 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000831",
    entryNumber: "JE-2026-0012",
    entryDate: "2026-03-01",
    description: "Sales invoice SO-2026-0006 — Zarqa Corner Store",
    status: "POSTED",
    sourceModule: "sales",
    sourceReference: "SO-2026-0006",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "1100", debit: 4640 },
      { code: "4000", credit: 4000 },
      { code: "2100", credit: 640 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000832",
    entryNumber: "JE-2026-0013",
    entryDate: "2026-03-01",
    description: "COGS for SO-2026-0006",
    status: "POSTED",
    sourceModule: "sales",
    sourceReference: "SO-2026-0006",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "5000", debit: 2680 },
      { code: "1200", credit: 2680 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000833",
    entryNumber: "JE-2026-0014",
    entryDate: "2026-03-05",
    description: "Marketing campaign — Ramadan promo",
    status: "POSTED",
    sourceModule: "manual",
    createdById: CEO_USER_ID,
    lines: [
      { code: "6400", debit: 3500 },
      { code: "1010", credit: 3500 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000834",
    entryNumber: "JE-2026-0015",
    entryDate: "2026-03-08",
    description: "Freight inbound — PO-2026-0004 receipt",
    status: "POSTED",
    sourceModule: "procurement",
    sourceReference: "PO-2026-0004",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "6500", debit: 650 },
      { code: "1010", credit: 650 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000835",
    entryNumber: "JE-2026-0016",
    entryDate: "2026-03-15",
    description: "Vendor invoice PO-2026-0005 — TechSource Electronics",
    status: "POSTED",
    sourceModule: "procurement",
    sourceReference: "PO-2026-0005",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "1200", debit: 3480 },
      { code: "2100", debit: 557 },
      { code: "2000", credit: 4037 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000836",
    entryNumber: "JE-2026-0017",
    entryDate: "2026-03-31",
    description: "March salaries",
    status: "POSTED",
    sourceModule: "manual",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "6100", debit: 18500 },
      { code: "1010", credit: 18500 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000837",
    entryNumber: "JE-2026-0018",
    entryDate: "2026-04-01",
    description: "April rent — Amman & Irbid",
    status: "POSTED",
    sourceModule: "manual",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "6200", debit: 4200 },
      { code: "1010", credit: 4200 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000838",
    entryNumber: "JE-2026-0019",
    entryDate: "2026-04-05",
    description: "Sales invoice SO-2026-0010 — East Amman Bulk",
    status: "POSTED",
    sourceModule: "sales",
    sourceReference: "SO-2026-0010",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "1100", debit: 18560 },
      { code: "4000", credit: 16000 },
      { code: "2100", credit: 2560 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000839",
    entryNumber: "JE-2026-0020",
    entryDate: "2026-04-05",
    description: "COGS for SO-2026-0010",
    status: "POSTED",
    sourceModule: "sales",
    sourceReference: "SO-2026-0010",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "5000", debit: 11200 },
      { code: "1200", credit: 11200 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000840",
    entryNumber: "JE-2026-0021",
    entryDate: "2026-04-10",
    description: "Utilities — April",
    status: "POSTED",
    sourceModule: "manual",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "6300", debit: 920 },
      { code: "1010", credit: 920 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000841",
    entryNumber: "JE-2026-0022",
    entryDate: "2026-04-15",
    description: "Customer payment — CUS-009 Dead Sea Hotels",
    status: "POSTED",
    sourceModule: "sales",
    sourceReference: "SO-2026-0004",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "1010", debit: 8120 },
      { code: "1100", credit: 8120 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000842",
    entryNumber: "JE-2026-0023",
    entryDate: "2026-05-01",
    description: "Sales invoice SO-2026-0013 — Zarqa Industrial Canteen",
    status: "POSTED",
    sourceModule: "sales",
    sourceReference: "SO-2026-0013",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "1100", debit: 2784 },
      { code: "4000", credit: 2400 },
      { code: "2100", credit: 384 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000843",
    entryNumber: "JE-2026-0024",
    entryDate: "2026-05-01",
    description: "COGS for SO-2026-0013",
    status: "POSTED",
    sourceModule: "sales",
    sourceReference: "SO-2026-0013",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "5000", debit: 1540 },
      { code: "1200", credit: 1540 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000844",
    entryNumber: "JE-2026-0025",
    entryDate: "2026-05-05",
    description: "Vendor invoice PO-2026-0008 — Northern Dairy",
    status: "POSTED",
    sourceModule: "procurement",
    sourceReference: "PO-2026-0008",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "1200", debit: 6240 },
      { code: "2100", debit: 998 },
      { code: "2000", credit: 7238 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000845",
    entryNumber: "JE-2026-0026",
    entryDate: "2026-05-15",
    description: "Freight outbound — Irbid delivery batch",
    status: "POSTED",
    sourceModule: "manual",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "6500", debit: 480 },
      { code: "1010", credit: 480 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000846",
    entryNumber: "JE-2026-0027",
    entryDate: "2026-05-20",
    description: "Sales invoice SO-2026-0016 — KHF Stores",
    status: "POSTED",
    sourceModule: "sales",
    sourceReference: "SO-2026-0016",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "1100", debit: 4060 },
      { code: "4000", credit: 3500 },
      { code: "2100", credit: 560 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000847",
    entryNumber: "JE-2026-0028",
    entryDate: "2026-05-31",
    description: "May salaries",
    status: "POSTED",
    sourceModule: "manual",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "6100", debit: 18500 },
      { code: "1010", credit: 18500 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000848",
    entryNumber: "JE-2026-0029",
    entryDate: "2026-06-01",
    description: "June rent",
    status: "POSTED",
    sourceModule: "manual",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "6200", debit: 4200 },
      { code: "1010", credit: 4200 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000849",
    entryNumber: "JE-2026-0030",
    entryDate: "2026-06-05",
    description: "VAT remittance — Q1 2026",
    status: "POSTED",
    sourceModule: "manual",
    createdById: CEO_USER_ID,
    lines: [
      { code: "2100", debit: 4200 },
      { code: "1010", credit: 4200 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000850",
    entryNumber: "JE-2026-0031",
    entryDate: "2026-06-08",
    description: "Petty cash replenishment",
    status: "POSTED",
    sourceModule: "manual",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "1000", debit: 500 },
      { code: "1010", credit: 500 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000851",
    entryNumber: "JE-2026-0032",
    entryDate: "2026-06-10",
    description: "Draft accrual — June utilities (pending bill)",
    status: "DRAFT",
    sourceModule: "manual",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "6300", debit: 950 },
      { code: "2000", credit: 950 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000852",
    entryNumber: "JE-2026-0033",
    entryDate: "2026-06-12",
    description: "Draft marketing — summer campaign",
    status: "DRAFT",
    sourceModule: "manual",
    createdById: CEO_USER_ID,
    lines: [
      { code: "6400", debit: 2800 },
      { code: "1010", credit: 2800 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000853",
    entryNumber: "JE-2026-0034",
    entryDate: "2026-06-15",
    description: "Draft sales accrual — pending invoice",
    status: "DRAFT",
    sourceModule: "sales",
    sourceReference: "SO-2026-0020",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "1100", debit: 5800 },
      { code: "4000", credit: 5000 },
      { code: "2100", credit: 800 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000854",
    entryNumber: "JE-2026-0035",
    entryDate: "2026-03-20",
    description: "VOID — duplicate vendor invoice entry",
    status: "VOID",
    sourceModule: "procurement",
    sourceReference: "PO-2026-0017",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "1200", debit: 2320 },
      { code: "2000", credit: 2320 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000855",
    entryNumber: "JE-2026-0036",
    entryDate: "2026-06-18",
    description: "Draft freight accrual — inbound shipment",
    status: "DRAFT",
    sourceModule: "procurement",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "6500", debit: 720 },
      { code: "2000", credit: 720 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000856",
    entryNumber: "JE-2026-0037",
    entryDate: "2026-02-25",
    description: "VOID — incorrect sales entry reversed",
    status: "VOID",
    sourceModule: "sales",
    createdById: FINANCE_USER_ID,
    lines: [
      { code: "4000", debit: 1200 },
      { code: "1100", credit: 1200 },
    ],
  },
];

function assertBalanced(entry: EntrySeed) {
  let debit = 0;
  let credit = 0;
  for (const line of entry.lines) {
    debit += line.debit ?? 0;
    credit += line.credit ?? 0;
  }
  if (Math.abs(debit - credit) >= 0.01) {
    throw new Error(`Unbalanced entry ${entry.entryNumber}: debit=${debit} credit=${credit}`);
  }
}

export async function seedAccounting(prisma: PrismaClient) {
  await prisma.journalEntryLine.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.journalEntry.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.account.deleteMany({ where: { organizationId: ORG_ID } });

  for (const account of ACCOUNTS) {
    await prisma.account.create({
      data: {
        id: account.id,
        organizationId: ORG_ID,
        code: account.code,
        name: account.name,
        type: account.type,
        normalBalance: account.normalBalance,
        isActive: true,
        isProtected: PROTECTED_ACCOUNT_CODES.has(account.code),
      },
    });
  }

  const accountByCode = new Map(ACCOUNTS.map((a) => [a.code, a.id]));
  let lineSeq = 0;

  for (const entry of JOURNAL_ENTRIES) {
    assertBalanced(entry);

    const lines = entry.lines.map((line) => {
      const accountId = accountByCode.get(line.code);
      if (!accountId) throw new Error(`Account ${line.code} not found`);
      lineSeq += 1;
      return {
        id: `00000000-0000-4000-8000-0000000009${String(lineSeq).padStart(2, "0")}`,
        organizationId: ORG_ID,
        accountId,
        description: line.description ?? null,
        debit: line.debit ?? 0,
        credit: line.credit ?? 0,
      };
    });

    await prisma.journalEntry.create({
      data: {
        id: entry.id,
        organizationId: ORG_ID,
        entryNumber: entry.entryNumber,
        entryDate: new Date(entry.entryDate),
        description: entry.description,
        status: entry.status,
        sourceModule: entry.sourceModule ?? null,
        sourceReference: entry.sourceReference ?? null,
        createdById: entry.createdById,
        lines: { create: lines },
      },
    });
  }

  console.log(`  Accounting: ${ACCOUNTS.length} accounts, ${JOURNAL_ENTRIES.length} journal entries`);
}
