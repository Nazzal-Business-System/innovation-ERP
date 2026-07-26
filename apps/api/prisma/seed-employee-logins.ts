import type { PrismaClient } from "@prisma/client";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const EMPLOYEE_ROLE_ID = "00000000-0000-4000-8000-000000000016";

/**
 * Regular (non-manager) seeded employees that get login accounts.
 * IDs match seed-hr buildEmployees: i=9,11,13,19,24,30 → EMP-0010+.
 * Excludes leadership managers (i<=8), inactive (i=50), and CEO.
 */
const DEMO_EMPLOYEE_LOGINS: Array<{
  userId: string;
  employeeId: string;
  email: string;
  name: string;
}> = [
  {
    userId: "00000000-0000-4000-8000-000000000040",
    employeeId: "00000000-0000-4000-8000-000000000739",
    email: "employee1@nazzal.demo",
    name: "Employee One",
  },
  {
    userId: "00000000-0000-4000-8000-000000000041",
    employeeId: "00000000-0000-4000-8000-000000000741",
    email: "employee2@nazzal.demo",
    name: "Employee Two",
  },
  {
    userId: "00000000-0000-4000-8000-000000000042",
    employeeId: "00000000-0000-4000-8000-000000000743",
    email: "employee3@nazzal.demo",
    name: "Employee Three",
  },
  {
    userId: "00000000-0000-4000-8000-000000000043",
    employeeId: "00000000-0000-4000-8000-000000000749",
    email: "employee4@nazzal.demo",
    name: "Employee Four",
  },
  {
    userId: "00000000-0000-4000-8000-000000000044",
    employeeId: "00000000-0000-4000-8000-000000000754",
    email: "employee5@nazzal.demo",
    name: "Employee Five",
  },
  {
    userId: "00000000-0000-4000-8000-000000000045",
    employeeId: "00000000-0000-4000-8000-000000000760",
    email: "employee6@nazzal.demo",
    name: "Employee Six",
  },
];

/**
 * Creates User accounts linked 1:1 to existing Employee rows for self-service demos.
 * Non-destructive: upserts users and links; does not wipe employees.
 */
export async function seedEmployeeLogins(prisma: PrismaClient, passwordHash: string) {
  let linked = 0;

  for (const demo of DEMO_EMPLOYEE_LOGINS) {
    const employee = await prisma.employee.findFirst({
      where: {
        id: demo.employeeId,
        organizationId: ORG_ID,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        employeeNumber: true,
      },
    });
    if (!employee) continue;

    const displayName = `${employee.firstName} ${employee.lastName}`.trim() || demo.name;

    // Clear any prior exclusive link on this employee from another user.
    await prisma.user.updateMany({
      where: {
        organizationId: ORG_ID,
        employeeId: employee.id,
        NOT: { id: demo.userId },
      },
      data: { employeeId: null },
    });

    await prisma.user.upsert({
      where: {
        organizationId_email: { organizationId: ORG_ID, email: demo.email },
      },
      update: {
        name: displayName,
        passwordHash,
        isActive: true,
        employeeId: employee.id,
        jobTitle: "Employee",
      },
      create: {
        id: demo.userId,
        organizationId: ORG_ID,
        email: demo.email,
        name: displayName,
        passwordHash,
        isActive: true,
        employeeId: employee.id,
        jobTitle: "Employee",
      },
    });

    const dbUser = await prisma.user.findUniqueOrThrow({
      where: { organizationId_email: { organizationId: ORG_ID, email: demo.email } },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: dbUser.id, roleId: EMPLOYEE_ROLE_ID } },
      update: {},
      create: { userId: dbUser.id, roleId: EMPLOYEE_ROLE_ID },
    });

    linked += 1;
  }

  return { linked, total: DEMO_EMPLOYEE_LOGINS.length };
}
