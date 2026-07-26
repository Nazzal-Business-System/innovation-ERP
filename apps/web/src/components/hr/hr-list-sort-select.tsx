"use client";

import { selectClassName } from "@/lib/form-utils";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type HrSortOption<T extends string> = {
  value: T;
  labelKey: string;
  fallback: string;
};

type HrListSortSelectProps<T extends string> = {
  id: string;
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<HrSortOption<T>>;
  className?: string;
};

export function HrListSortSelect<T extends string>({
  id,
  value,
  onChange,
  options,
  className,
}: HrListSortSelectProps<T>) {
  const { t } = useI18n();
  return (
    <select
      id={id}
      aria-label={t("list.sortBy", "Sort by")}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={cn(selectClassName, "min-w-[10.5rem]", className)}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {t(opt.labelKey, opt.fallback)}
        </option>
      ))}
    </select>
  );
}

export const HR_EMPLOYEE_SORT_OPTIONS = [
  { value: "NAME_ASC", labelKey: "list.sort.nameAsc", fallback: "Name A–Z" },
  { value: "NAME_DESC", labelKey: "list.sort.nameDesc", fallback: "Name Z–A" },
  { value: "NEWEST", labelKey: "list.sort.newest", fallback: "Newest first" },
  { value: "OLDEST", labelKey: "list.sort.oldest", fallback: "Oldest first" },
  { value: "HIRE_DESC", labelKey: "hr.sort.hireDesc", fallback: "Hire date newest" },
  { value: "HIRE_ASC", labelKey: "hr.sort.hireAsc", fallback: "Hire date oldest" },
] as const;

export const HR_LEAVE_SORT_OPTIONS = [
  { value: "NEWEST", labelKey: "list.sort.newest", fallback: "Newest first" },
  { value: "OLDEST", labelKey: "list.sort.oldest", fallback: "Oldest first" },
  { value: "START_DESC", labelKey: "hr.sort.startDesc", fallback: "Start date newest" },
  { value: "START_ASC", labelKey: "hr.sort.startAsc", fallback: "Start date oldest" },
] as const;

export const HR_PAYROLL_SORT_OPTIONS = [
  { value: "NEWEST", labelKey: "list.sort.newest", fallback: "Newest first" },
  { value: "OLDEST", labelKey: "list.sort.oldest", fallback: "Oldest first" },
  { value: "PERIOD_DESC", labelKey: "hr.sort.periodDesc", fallback: "Period newest" },
  { value: "PERIOD_ASC", labelKey: "hr.sort.periodAsc", fallback: "Period oldest" },
] as const;

export const HR_CONTRACT_SORT_OPTIONS = [
  { value: "NEWEST", labelKey: "list.sort.newest", fallback: "Newest first" },
  { value: "OLDEST", labelKey: "list.sort.oldest", fallback: "Oldest first" },
  { value: "START_DESC", labelKey: "hr.sort.startDesc", fallback: "Start date newest" },
  { value: "START_ASC", labelKey: "hr.sort.startAsc", fallback: "Start date oldest" },
  { value: "END_ASC", labelKey: "hr.sort.endAsc", fallback: "Expiry soonest" },
  { value: "END_DESC", labelKey: "hr.sort.endDesc", fallback: "Expiry latest" },
] as const;

export const HR_DOCUMENT_SORT_OPTIONS = [
  { value: "NEWEST", labelKey: "list.sort.newest", fallback: "Newest first" },
  { value: "OLDEST", labelKey: "list.sort.oldest", fallback: "Oldest first" },
  { value: "EXPIRY_ASC", labelKey: "hr.sort.expiryAsc", fallback: "Expiry soonest" },
  { value: "EXPIRY_DESC", labelKey: "hr.sort.expiryDesc", fallback: "Expiry latest" },
  { value: "TITLE_ASC", labelKey: "list.sort.titleAsc", fallback: "Title A–Z" },
  { value: "TITLE_DESC", labelKey: "list.sort.titleDesc", fallback: "Title Z–A" },
] as const;

export const HR_POSITION_SORT_OPTIONS = [
  { value: "NEWEST", labelKey: "list.sort.newest", fallback: "Newest first" },
  { value: "OLDEST", labelKey: "list.sort.oldest", fallback: "Oldest first" },
  { value: "TITLE_ASC", labelKey: "list.sort.titleAsc", fallback: "Title A–Z" },
  { value: "TITLE_DESC", labelKey: "list.sort.titleDesc", fallback: "Title Z–A" },
  { value: "DEPT_TITLE", labelKey: "hr.sort.deptTitle", fallback: "Department, then title" },
] as const;

export const HR_DEPARTMENT_SORT_OPTIONS = [
  { value: "NEWEST", labelKey: "list.sort.newest", fallback: "Newest first" },
  { value: "OLDEST", labelKey: "list.sort.oldest", fallback: "Oldest first" },
  { value: "NAME_ASC", labelKey: "list.sort.nameAsc", fallback: "Name A–Z" },
  { value: "NAME_DESC", labelKey: "list.sort.nameDesc", fallback: "Name Z–A" },
  { value: "CODE_ASC", labelKey: "list.sort.codeAsc", fallback: "Code A–Z" },
  { value: "CODE_DESC", labelKey: "list.sort.codeDesc", fallback: "Code Z–A" },
] as const;
