import { prisma } from "./prisma.js";

export class EmployeeSelfServiceError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * Resolve the HR Employee linked to an authenticated User.
 * Never trusts a client-supplied employeeId.
 */
export async function resolveLinkedEmployee(input: {
  userId: string;
  organizationId: string;
}) {
  const user = await prisma.user.findFirst({
    where: {
      id: input.userId,
      organizationId: input.organizationId,
      isActive: true,
    },
    select: {
      id: true,
      employeeId: true,
      employee: {
        include: {
          department: true,
          position: true,
          manager: true,
        },
      },
    },
  });

  if (!user) {
    throw new EmployeeSelfServiceError(401, "Authentication required", "UNAUTHORIZED");
  }
  if (!user.employeeId || !user.employee) {
    throw new EmployeeSelfServiceError(
      403,
      "No employee profile is linked to this account",
      "EMPLOYEE_NOT_LINKED"
    );
  }
  if (!user.employee.isActive) {
    throw new EmployeeSelfServiceError(
      403,
      "This employee account is inactive",
      "EMPLOYEE_INACTIVE"
    );
  }

  return user.employee;
}

export function isDemoLoginEnabled(): boolean {
  if (process.env.ENABLE_DEMO_LOGIN === "false") return false;
  if (process.env.ENABLE_DEMO_LOGIN === "true") return true;
  return process.env.NODE_ENV !== "production";
}
