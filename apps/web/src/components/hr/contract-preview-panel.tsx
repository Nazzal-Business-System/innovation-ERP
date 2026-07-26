"use client";

import type { HrContractDetail } from "@ierp/shared";
import { Building2, Calendar, FileText, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContractStatusBadge, ContractTypeLabel } from "@/components/hr/hr-status-badge";
import { useI18n } from "@/lib/i18n";

interface ContractPreviewPanelProps {
  contract: HrContractDetail;
}

export function ContractPreviewPanel({ contract }: ContractPreviewPanelProps) {
  const { t } = useI18n();

  return (
    <Card className="overflow-hidden border-[var(--border-subtle)]">
      <CardHeader className="border-b border-[var(--border-subtle)] bg-[var(--muted-bg)]/30">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-[var(--accent)]" aria-hidden />
          {t("hr.contractPreview")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="bg-white p-8 text-slate-900 dark:bg-[#fafafa] dark:text-slate-900">
          <div className="mx-auto max-w-2xl space-y-6">
            <div className="border-b border-slate-200 pb-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {t("hr.employmentContract")}
              </p>
              <h2 className="mt-2 text-2xl font-bold">{contract.contractNumber}</h2>
              <p className="mt-1 text-sm text-slate-600">Al-Noor Trading Company</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                  <User className="h-3.5 w-3.5" aria-hidden />
                  {t("hr.employee")}
                </div>
                <p className="font-semibold">{contract.employee.fullName}</p>
                <p className="text-sm text-slate-600">{contract.employee.employeeNumber}</p>
                <p className="text-sm text-slate-600">
                  {contract.employee.department} · {contract.employee.position}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                  <Building2 className="h-3.5 w-3.5" aria-hidden />
                  {t("hr.contractType")}
                </div>
                <ContractTypeLabel type={contract.contractType} />
                <div className="mt-3">
                  <ContractStatusBadge status={contract.status} />
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-slate-200 p-4 text-sm">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-600">{t("hr.salary")}</span>
                <span className="font-semibold">{contract.salary}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="flex items-center gap-2 text-slate-600">
                  <Calendar className="h-3.5 w-3.5" aria-hidden />
                  {t("hr.startDate")}
                </span>
                <span>{contract.startDate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600">
                  <Calendar className="h-3.5 w-3.5" aria-hidden />
                  {t("hr.endDate")}
                </span>
                <span>{contract.endDate ?? t("hr.openEnded")}</span>
              </div>
            </div>

            {contract.notes && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="mb-1 text-xs font-semibold uppercase text-slate-500">{t("hr.notes")}</p>
                <p>{contract.notes}</p>
              </div>
            )}

            <p className="text-center text-xs text-slate-400">{t("hr.contractPreviewFooter")}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
