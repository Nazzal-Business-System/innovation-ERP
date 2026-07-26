import type { Prisma } from "@prisma/client";
import type {
  HrContractSort,
  HrDepartmentSort,
  HrDocumentSort,
  HrEmployeeSort,
  HrLeaveSort,
  HrPayrollSort,
  HrPositionSort,
} from "@ierp/shared";

export function employeeListOrderBy(
  sort: HrEmployeeSort
): Prisma.EmployeeOrderByWithRelationInput[] {
  switch (sort) {
    case "NEWEST":
      return [{ createdAt: "desc" }];
    case "OLDEST":
      return [{ createdAt: "asc" }];
    case "NAME_DESC":
      return [{ lastName: "desc" }, { firstName: "desc" }];
    case "HIRE_DESC":
      return [{ hireDate: "desc" }, { lastName: "asc" }];
    case "HIRE_ASC":
      return [{ hireDate: "asc" }, { lastName: "asc" }];
    case "NAME_ASC":
    default:
      return [{ lastName: "asc" }, { firstName: "asc" }];
  }
}

export function leaveListOrderBy(sort: HrLeaveSort): Prisma.LeaveRequestOrderByWithRelationInput[] {
  switch (sort) {
    case "OLDEST":
      return [{ createdAt: "asc" }];
    case "START_DESC":
      return [{ startDate: "desc" }, { createdAt: "desc" }];
    case "START_ASC":
      return [{ startDate: "asc" }, { createdAt: "desc" }];
    case "NEWEST":
    default:
      return [{ createdAt: "desc" }];
  }
}

export function payrollListOrderBy(
  sort: HrPayrollSort
): Prisma.PayrollRunOrderByWithRelationInput[] {
  switch (sort) {
    case "OLDEST":
      return [{ createdAt: "asc" }];
    case "PERIOD_DESC":
      return [{ periodStart: "desc" }, { runNumber: "desc" }];
    case "PERIOD_ASC":
      return [{ periodStart: "asc" }, { runNumber: "asc" }];
    case "NEWEST":
    default:
      return [{ createdAt: "desc" }];
  }
}

export function contractListOrderBy(
  sort: HrContractSort
): Prisma.EmployeeContractOrderByWithRelationInput[] {
  switch (sort) {
    case "OLDEST":
      return [{ createdAt: "asc" }];
    case "START_DESC":
      return [{ startDate: "desc" }, { createdAt: "desc" }];
    case "START_ASC":
      return [{ startDate: "asc" }, { createdAt: "desc" }];
    case "END_ASC":
      return [{ endDate: "asc" }, { createdAt: "desc" }];
    case "END_DESC":
      return [{ endDate: "desc" }, { createdAt: "desc" }];
    case "NEWEST":
    default:
      return [{ createdAt: "desc" }];
  }
}

export function documentListOrderBy(
  sort: HrDocumentSort
): Prisma.EmployeeDocumentOrderByWithRelationInput[] {
  switch (sort) {
    case "OLDEST":
      return [{ createdAt: "asc" }];
    case "EXPIRY_ASC":
      return [{ expiryDate: "asc" }, { createdAt: "desc" }];
    case "EXPIRY_DESC":
      return [{ expiryDate: "desc" }, { createdAt: "desc" }];
    case "TITLE_ASC":
      return [{ title: "asc" }];
    case "TITLE_DESC":
      return [{ title: "desc" }];
    case "NEWEST":
    default:
      return [{ createdAt: "desc" }];
  }
}

export function positionListOrderBy(
  sort: HrPositionSort
): Prisma.PositionOrderByWithRelationInput[] {
  switch (sort) {
    case "OLDEST":
      return [{ createdAt: "asc" }];
    case "TITLE_ASC":
      return [{ title: "asc" }];
    case "TITLE_DESC":
      return [{ title: "desc" }];
    case "DEPT_TITLE":
      return [{ department: { name: "asc" } }, { title: "asc" }];
    case "NEWEST":
    default:
      return [{ createdAt: "desc" }];
  }
}

export function departmentListOrderBy(
  sort: HrDepartmentSort
): Prisma.DepartmentOrderByWithRelationInput[] {
  switch (sort) {
    case "OLDEST":
      return [{ createdAt: "asc" }];
    case "NAME_ASC":
      return [{ name: "asc" }];
    case "NAME_DESC":
      return [{ name: "desc" }];
    case "CODE_ASC":
      return [{ code: "asc" }];
    case "CODE_DESC":
      return [{ code: "desc" }];
    case "NEWEST":
    default:
      return [{ createdAt: "desc" }];
  }
}
