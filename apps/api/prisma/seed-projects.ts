import {
  PrismaClient,
  ProjectMilestoneStatus,
  ProjectStatus,
  ProjectTaskPriority,
  ProjectTaskStatus,
} from "@prisma/client";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const CEO_USER_ID = "00000000-0000-4000-8000-000000000020";
const SALES_USER_ID = "00000000-0000-4000-8000-000000000023";
const HR_USER_ID = "00000000-0000-4000-8000-000000000024";

const CUSTOMER_609 = "00000000-0000-4000-8000-000000000609";
const CUSTOMER_606 = "00000000-0000-4000-8000-000000000606";
const CUSTOMER_613 = "00000000-0000-4000-8000-000000000613";

const PROJECTS: Array<{
  id: string;
  code: string;
  name: string;
  customerId?: string;
  managerId: string;
  startDate: string;
  targetDate: string;
  status: ProjectStatus;
  progress: number;
  budget: number;
  notes?: string;
}> = [
  {
    id: "00000000-0000-4000-8000-000000000900",
    code: "PRJ-2026-0001",
    name: "ERP Implementation",
    customerId: CUSTOMER_609,
    managerId: CEO_USER_ID,
    startDate: "2026-01-15",
    targetDate: "2026-12-31",
    status: "ACTIVE",
    progress: 45,
    budget: 150000,
    notes: "Phase 1 — finance and inventory modules",
  },
  {
    id: "00000000-0000-4000-8000-000000000901",
    code: "PRJ-2026-0002",
    name: "Warehouse Automation",
    managerId: CEO_USER_ID,
    startDate: "2026-03-01",
    targetDate: "2026-09-30",
    status: "PLANNING",
    progress: 0,
    budget: 85000,
    notes: "RFID scanners and conveyor integration",
  },
  {
    id: "00000000-0000-4000-8000-000000000902",
    code: "PRJ-2026-0003",
    name: "CRM Rollout",
    customerId: CUSTOMER_606,
    managerId: SALES_USER_ID,
    startDate: "2026-02-01",
    targetDate: "2026-08-15",
    status: "ACTIVE",
    progress: 70,
    budget: 45000,
  },
  {
    id: "00000000-0000-4000-8000-000000000903",
    code: "PRJ-2026-0004",
    name: "Mobile App Development",
    customerId: CUSTOMER_613,
    managerId: SALES_USER_ID,
    startDate: "2026-01-20",
    targetDate: "2026-10-01",
    status: "ACTIVE",
    progress: 35,
    budget: 62000,
    notes: "iOS and Android field sales app",
  },
  {
    id: "00000000-0000-4000-8000-000000000904",
    code: "PRJ-2026-0005",
    name: "POS System Upgrade",
    managerId: SALES_USER_ID,
    startDate: "2026-01-01",
    targetDate: "2026-04-30",
    status: "COMPLETED",
    progress: 100,
    budget: 28000,
  },
  {
    id: "00000000-0000-4000-8000-000000000905",
    code: "PRJ-2026-0006",
    name: "Delivery Fleet Tracking",
    customerId: CUSTOMER_609,
    managerId: CEO_USER_ID,
    startDate: "2026-02-15",
    targetDate: "2026-11-30",
    status: "ON_HOLD",
    progress: 20,
    budget: 35000,
    notes: "Paused pending vendor contract renewal",
  },
  {
    id: "00000000-0000-4000-8000-000000000906",
    code: "PRJ-2026-0007",
    name: "HR Portal Deployment",
    managerId: HR_USER_ID,
    startDate: "2026-03-10",
    targetDate: "2026-07-31",
    status: "ACTIVE",
    progress: 55,
    budget: 22000,
  },
  {
    id: "00000000-0000-4000-8000-000000000907",
    code: "PRJ-2026-0008",
    name: "E-Commerce Platform",
    customerId: CUSTOMER_606,
    managerId: SALES_USER_ID,
    startDate: "2026-04-01",
    targetDate: "2026-12-15",
    status: "PLANNING",
    progress: 5,
    budget: 95000,
    notes: "B2B ordering portal for distributors",
  },
  {
    id: "00000000-0000-4000-8000-000000000908",
    code: "PRJ-2026-0009",
    name: "IoT Cold Chain Monitoring",
    managerId: CEO_USER_ID,
    startDate: "2026-01-10",
    targetDate: "2026-06-30",
    status: "CANCELLED",
    progress: 15,
    budget: 18000,
    notes: "Cancelled — budget reallocated to ERP",
  },
  {
    id: "00000000-0000-4000-8000-000000000909",
    code: "PRJ-2026-0010",
    name: "Accounting Integration",
    customerId: CUSTOMER_613,
    managerId: CEO_USER_ID,
    startDate: "2026-01-05",
    targetDate: "2026-03-20",
    status: "COMPLETED",
    progress: 100,
    budget: 12000,
  },
  {
    id: "00000000-0000-4000-8000-000000000910",
    code: "PRJ-2026-0011",
    name: "Customer Portal Redesign",
    customerId: CUSTOMER_609,
    managerId: SALES_USER_ID,
    startDate: "2026-02-20",
    targetDate: "2026-09-01",
    status: "ACTIVE",
    progress: 40,
    budget: 38000,
  },
  {
    id: "00000000-0000-4000-8000-000000000911",
    code: "PRJ-2026-0012",
    name: "BI Dashboard Suite",
    customerId: CUSTOMER_606,
    managerId: CEO_USER_ID,
    startDate: "2026-05-01",
    targetDate: "2026-12-31",
    status: "ON_HOLD",
    progress: 10,
    budget: 55000,
    notes: "Waiting on data warehouse completion",
  },
];

const TASKS: Array<{
  id: string;
  projectId: string;
  title: string;
  assigneeId: string;
  priority: ProjectTaskPriority;
  status: ProjectTaskStatus;
  dueDate: string;
  description?: string;
}> = [
  { id: "00000000-0000-4000-8000-000000000950", projectId: "00000000-0000-4000-8000-000000000900", title: "Map chart of accounts", assigneeId: CEO_USER_ID, priority: "HIGH", status: "DONE", dueDate: "2026-02-28" },
  { id: "00000000-0000-4000-8000-000000000951", projectId: "00000000-0000-4000-8000-000000000900", title: "Configure inventory module", assigneeId: CEO_USER_ID, priority: "CRITICAL", status: "IN_PROGRESS", dueDate: "2026-05-15" },
  { id: "00000000-0000-4000-8000-000000000952", projectId: "00000000-0000-4000-8000-000000000900", title: "User acceptance testing", assigneeId: HR_USER_ID, priority: "MEDIUM", status: "TODO", dueDate: "2026-11-01" },
  { id: "00000000-0000-4000-8000-000000000953", projectId: "00000000-0000-4000-8000-000000000900", title: "Data migration dry run", assigneeId: CEO_USER_ID, priority: "HIGH", status: "REVIEW", dueDate: "2026-08-20" },
  { id: "00000000-0000-4000-8000-000000000954", projectId: "00000000-0000-4000-8000-000000000901", title: "RFID vendor evaluation", assigneeId: CEO_USER_ID, priority: "MEDIUM", status: "TODO", dueDate: "2026-04-15" },
  { id: "00000000-0000-4000-8000-000000000955", projectId: "00000000-0000-4000-8000-000000000901", title: "Warehouse layout survey", assigneeId: SALES_USER_ID, priority: "LOW", status: "TODO", dueDate: "2026-03-20" },
  { id: "00000000-0000-4000-8000-000000000956", projectId: "00000000-0000-4000-8000-000000000901", title: "Budget approval request", assigneeId: CEO_USER_ID, priority: "HIGH", status: "IN_PROGRESS", dueDate: "2026-03-10" },
  { id: "00000000-0000-4000-8000-000000000957", projectId: "00000000-0000-4000-8000-000000000902", title: "Import existing leads", assigneeId: SALES_USER_ID, priority: "HIGH", status: "DONE", dueDate: "2026-03-01" },
  { id: "00000000-0000-4000-8000-000000000958", projectId: "00000000-0000-4000-8000-000000000902", title: "Sales pipeline training", assigneeId: SALES_USER_ID, priority: "MEDIUM", status: "IN_PROGRESS", dueDate: "2026-06-10" },
  { id: "00000000-0000-4000-8000-000000000959", projectId: "00000000-0000-4000-8000-000000000902", title: "Email integration setup", assigneeId: SALES_USER_ID, priority: "MEDIUM", status: "REVIEW", dueDate: "2026-05-20" },
  { id: "00000000-0000-4000-8000-000000000960", projectId: "00000000-0000-4000-8000-000000000902", title: "Custom report templates", assigneeId: CEO_USER_ID, priority: "LOW", status: "TODO", dueDate: "2026-07-15" },
  { id: "00000000-0000-4000-8000-000000000961", projectId: "00000000-0000-4000-8000-000000000903", title: "UI/UX wireframes", assigneeId: SALES_USER_ID, priority: "HIGH", status: "DONE", dueDate: "2026-02-28" },
  { id: "00000000-0000-4000-8000-000000000962", projectId: "00000000-0000-4000-8000-000000000903", title: "API endpoint development", assigneeId: CEO_USER_ID, priority: "CRITICAL", status: "IN_PROGRESS", dueDate: "2026-06-30" },
  { id: "00000000-0000-4000-8000-000000000963", projectId: "00000000-0000-4000-8000-000000000903", title: "App store submission", assigneeId: SALES_USER_ID, priority: "MEDIUM", status: "TODO", dueDate: "2026-09-15" },
  { id: "00000000-0000-4000-8000-000000000964", projectId: "00000000-0000-4000-8000-000000000904", title: "Terminal hardware install", assigneeId: SALES_USER_ID, priority: "HIGH", status: "DONE", dueDate: "2026-02-15" },
  { id: "00000000-0000-4000-8000-000000000965", projectId: "00000000-0000-4000-8000-000000000904", title: "Staff POS training", assigneeId: SALES_USER_ID, priority: "MEDIUM", status: "DONE", dueDate: "2026-03-30" },
  { id: "00000000-0000-4000-8000-000000000966", projectId: "00000000-0000-4000-8000-000000000905", title: "GPS device procurement", assigneeId: CEO_USER_ID, priority: "MEDIUM", status: "TODO", dueDate: "2026-04-01" },
  { id: "00000000-0000-4000-8000-000000000967", projectId: "00000000-0000-4000-8000-000000000905", title: "Driver app prototype", assigneeId: SALES_USER_ID, priority: "LOW", status: "IN_PROGRESS", dueDate: "2026-03-25" },
  { id: "00000000-0000-4000-8000-000000000968", projectId: "00000000-0000-4000-8000-000000000906", title: "Employee self-service forms", assigneeId: HR_USER_ID, priority: "HIGH", status: "IN_PROGRESS", dueDate: "2026-05-01" },
  { id: "00000000-0000-4000-8000-000000000969", projectId: "00000000-0000-4000-8000-000000000906", title: "Leave policy configuration", assigneeId: HR_USER_ID, priority: "MEDIUM", status: "DONE", dueDate: "2026-04-10" },
  { id: "00000000-0000-4000-8000-000000000970", projectId: "00000000-0000-4000-8000-000000000906", title: "Payroll integration test", assigneeId: HR_USER_ID, priority: "CRITICAL", status: "REVIEW", dueDate: "2026-06-15" },
  { id: "00000000-0000-4000-8000-000000000971", projectId: "00000000-0000-4000-8000-000000000907", title: "Platform vendor shortlist", assigneeId: SALES_USER_ID, priority: "HIGH", status: "TODO", dueDate: "2026-05-01" },
  { id: "00000000-0000-4000-8000-000000000972", projectId: "00000000-0000-4000-8000-000000000907", title: "Product catalog upload", assigneeId: SALES_USER_ID, priority: "MEDIUM", status: "TODO", dueDate: "2026-06-20" },
  { id: "00000000-0000-4000-8000-000000000973", projectId: "00000000-0000-4000-8000-000000000908", title: "Sensor pilot installation", assigneeId: CEO_USER_ID, priority: "LOW", status: "DONE", dueDate: "2026-02-01" },
  { id: "00000000-0000-4000-8000-000000000974", projectId: "00000000-0000-4000-8000-000000000908", title: "Vendor contract review", assigneeId: CEO_USER_ID, priority: "MEDIUM", status: "DONE", dueDate: "2026-01-25" },
  { id: "00000000-0000-4000-8000-000000000975", projectId: "00000000-0000-4000-8000-000000000909", title: "GL sync configuration", assigneeId: CEO_USER_ID, priority: "HIGH", status: "DONE", dueDate: "2026-02-20" },
  { id: "00000000-0000-4000-8000-000000000976", projectId: "00000000-0000-4000-8000-000000000909", title: "Reconciliation validation", assigneeId: CEO_USER_ID, priority: "CRITICAL", status: "DONE", dueDate: "2026-03-15" },
  { id: "00000000-0000-4000-8000-000000000977", projectId: "00000000-0000-4000-8000-000000000910", title: "Customer feedback survey", assigneeId: SALES_USER_ID, priority: "MEDIUM", status: "DONE", dueDate: "2026-03-10" },
  { id: "00000000-0000-4000-8000-000000000978", projectId: "00000000-0000-4000-8000-000000000910", title: "Portal mockup review", assigneeId: SALES_USER_ID, priority: "HIGH", status: "IN_PROGRESS", dueDate: "2026-05-05" },
  { id: "00000000-0000-4000-8000-000000000979", projectId: "00000000-0000-4000-8000-000000000910", title: "Order history migration", assigneeId: CEO_USER_ID, priority: "HIGH", status: "REVIEW", dueDate: "2026-06-01" },
  { id: "00000000-0000-4000-8000-000000000980", projectId: "00000000-0000-4000-8000-000000000911", title: "KPI definition workshop", assigneeId: CEO_USER_ID, priority: "MEDIUM", status: "TODO", dueDate: "2026-06-10" },
  { id: "00000000-0000-4000-8000-000000000981", projectId: "00000000-0000-4000-8000-000000000911", title: "Data source inventory", assigneeId: HR_USER_ID, priority: "LOW", status: "IN_PROGRESS", dueDate: "2026-05-20" },
  { id: "00000000-0000-4000-8000-000000000982", projectId: "00000000-0000-4000-8000-000000000900", title: "Go-live communication plan", assigneeId: HR_USER_ID, priority: "MEDIUM", status: "TODO", dueDate: "2026-11-15" },
  { id: "00000000-0000-4000-8000-000000000983", projectId: "00000000-0000-4000-8000-000000000903", title: "Offline sync testing", assigneeId: CEO_USER_ID, priority: "HIGH", status: "REVIEW", dueDate: "2026-07-30" },
  { id: "00000000-0000-4000-8000-000000000984", projectId: "00000000-0000-4000-8000-000000000902", title: "Opportunity stage automation", assigneeId: SALES_USER_ID, priority: "HIGH", status: "IN_PROGRESS", dueDate: "2026-06-25" },
  { id: "00000000-0000-4000-8000-000000000985", projectId: "00000000-0000-4000-8000-000000000906", title: "Org chart import", assigneeId: HR_USER_ID, priority: "LOW", status: "DONE", dueDate: "2026-03-25" },
  { id: "00000000-0000-4000-8000-000000000986", projectId: "00000000-0000-4000-8000-000000000907", title: "Payment gateway selection", assigneeId: CEO_USER_ID, priority: "CRITICAL", status: "TODO", dueDate: "2026-05-15" },
  { id: "00000000-0000-4000-8000-000000000987", projectId: "00000000-0000-4000-8000-000000000910", title: "Accessibility audit", assigneeId: HR_USER_ID, priority: "MEDIUM", status: "TODO", dueDate: "2026-07-01" },
  { id: "00000000-0000-4000-8000-000000000988", projectId: "00000000-0000-4000-8000-000000000901", title: "Safety compliance review", assigneeId: HR_USER_ID, priority: "HIGH", status: "REVIEW", dueDate: "2026-04-30" },
  { id: "00000000-0000-4000-8000-000000000989", projectId: "00000000-0000-4000-8000-000000000905", title: "Fleet insurance assessment", assigneeId: CEO_USER_ID, priority: "LOW", status: "TODO", dueDate: "2026-05-10" },
];

const MILESTONES: Array<{
  id: string;
  projectId: string;
  title: string;
  dueDate: string;
  status: ProjectMilestoneStatus;
}> = [
  { id: "00000000-0000-4000-8000-000000000990", projectId: "00000000-0000-4000-8000-000000000900", title: "Requirements sign-off", dueDate: "2026-02-15", status: "COMPLETED" },
  { id: "00000000-0000-4000-8000-000000000991", projectId: "00000000-0000-4000-8000-000000000900", title: "Finance module go-live", dueDate: "2026-08-01", status: "PENDING" },
  { id: "00000000-0000-4000-8000-000000000992", projectId: "00000000-0000-4000-8000-000000000901", title: "Vendor selection complete", dueDate: "2026-04-30", status: "PENDING" },
  { id: "00000000-0000-4000-8000-000000000993", projectId: "00000000-0000-4000-8000-000000000902", title: "CRM data migration", dueDate: "2026-03-15", status: "COMPLETED" },
  { id: "00000000-0000-4000-8000-000000000994", projectId: "00000000-0000-4000-8000-000000000902", title: "Full sales team onboarded", dueDate: "2026-07-01", status: "PENDING" },
  { id: "00000000-0000-4000-8000-000000000995", projectId: "00000000-0000-4000-8000-000000000903", title: "Beta release", dueDate: "2026-06-15", status: "PENDING" },
  { id: "00000000-0000-4000-8000-000000000996", projectId: "00000000-0000-4000-8000-000000000903", title: "Design approval", dueDate: "2026-02-01", status: "COMPLETED" },
  { id: "00000000-0000-4000-8000-000000000997", projectId: "00000000-0000-4000-8000-000000000904", title: "All branches live", dueDate: "2026-04-15", status: "COMPLETED" },
  { id: "00000000-0000-4000-8000-000000000998", projectId: "00000000-0000-4000-8000-000000000905", title: "Pilot fleet equipped", dueDate: "2026-04-01", status: "MISSED" },
  { id: "00000000-0000-4000-8000-000000000999", projectId: "00000000-0000-4000-8000-000000000906", title: "HR portal launch", dueDate: "2026-07-15", status: "PENDING" },
  { id: "00000000-0000-4000-8000-000000001000", projectId: "00000000-0000-4000-8000-000000000906", title: "Policy engine configured", dueDate: "2026-04-20", status: "COMPLETED" },
  { id: "00000000-0000-4000-8000-000000001001", projectId: "00000000-0000-4000-8000-000000000907", title: "Platform contract signed", dueDate: "2026-05-30", status: "PENDING" },
  { id: "00000000-0000-4000-8000-000000001002", projectId: "00000000-0000-4000-8000-000000000908", title: "Pilot sensors deployed", dueDate: "2026-02-15", status: "MISSED" },
  { id: "00000000-0000-4000-8000-000000001003", projectId: "00000000-0000-4000-8000-000000000909", title: "GL sync live", dueDate: "2026-03-01", status: "COMPLETED" },
  { id: "00000000-0000-4000-8000-000000001004", projectId: "00000000-0000-4000-8000-000000000910", title: "UX redesign approved", dueDate: "2026-05-01", status: "PENDING" },
  { id: "00000000-0000-4000-8000-000000001005", projectId: "00000000-0000-4000-8000-000000000910", title: "Beta customer access", dueDate: "2026-07-20", status: "PENDING" },
  { id: "00000000-0000-4000-8000-000000001006", projectId: "00000000-0000-4000-8000-000000000911", title: "Executive dashboard MVP", dueDate: "2026-08-15", status: "PENDING" },
  { id: "00000000-0000-4000-8000-000000001007", projectId: "00000000-0000-4000-8000-000000000911", title: "Data model finalized", dueDate: "2026-06-01", status: "MISSED" },
  { id: "00000000-0000-4000-8000-000000001008", projectId: "00000000-0000-4000-8000-000000000901", title: "Site assessment complete", dueDate: "2026-03-15", status: "COMPLETED" },
  { id: "00000000-0000-4000-8000-000000001009", projectId: "00000000-0000-4000-8000-000000000907", title: "Catalog structure defined", dueDate: "2026-04-25", status: "PENDING" },
];

export async function seedProjects(prisma: PrismaClient) {
  await prisma.projectMilestone.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.projectTask.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.project.deleteMany({ where: { organizationId: ORG_ID } });

  for (const project of PROJECTS) {
    const data = {
      organizationId: ORG_ID,
      code: project.code,
      name: project.name,
      customerId: project.customerId ?? null,
      managerId: project.managerId,
      startDate: new Date(project.startDate),
      targetDate: new Date(project.targetDate),
      status: project.status,
      progress: project.progress,
      budget: project.budget,
      notes: project.notes ?? null,
    };
    await prisma.project.upsert({
      where: { id: project.id },
      create: { id: project.id, ...data },
      update: data,
    });
  }

  for (const task of TASKS) {
    const data = {
      organizationId: ORG_ID,
      projectId: task.projectId,
      title: task.title,
      assigneeId: task.assigneeId,
      priority: task.priority,
      dueDate: new Date(task.dueDate),
      status: task.status,
      description: task.description ?? null,
    };
    await prisma.projectTask.upsert({
      where: { id: task.id },
      create: { id: task.id, ...data },
      update: data,
    });
  }

  for (const milestone of MILESTONES) {
    const data = {
      organizationId: ORG_ID,
      projectId: milestone.projectId,
      title: milestone.title,
      dueDate: new Date(milestone.dueDate),
      status: milestone.status,
    };
    await prisma.projectMilestone.upsert({
      where: { id: milestone.id },
      create: { id: milestone.id, ...data },
      update: data,
    });
  }

  return {
    projects: PROJECTS.length,
    tasks: TASKS.length,
    milestones: MILESTONES.length,
  };
}
