"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { DatePicker } from "@/components/forms/date-picker";
import { FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { inputClassName, textareaClassName } from "@/lib/form-utils";
import {
  DocumentUploadZone,
  type SelectedUploadFile,
} from "@/components/documents/document-upload-zone";
import { useCreateDocumentFile, useDocumentCategories } from "@/lib/hooks/use-documents";
import { titleFromFileName } from "@/lib/document-file-utils";
import { fileToDataUrl, saveDocumentPreview } from "@/lib/document-preview-store";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentsNavLinks } from "@/components/documents/documents-gate";
import { DOCUMENT_MODULE_LABELS } from "@/components/documents/documents-columns";
import type { DocumentModule } from "@ierp/shared";

export default function NewDocumentPage() {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { t } = useI18n();
  const { data: categoriesData } = useDocumentCategories({ activeOnly: true });
  const createDocumentMutation = useCreateDocumentFile();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<SelectedUploadFile | null>(null);
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [linkModule, setLinkModule] = useState<DocumentModule | "">("");
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");

  useEffect(() => {
    if (selectedFile && !titleTouched) {
      setTitle(titleFromFileName(selectedFile.meta.fileName));
    }
  }, [selectedFile, titleTouched]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) {
      setError(t("documents.fileRequired"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { meta } = selectedFile;
      const file = await createDocumentMutation.mutateAsync({
        title,
        description: description || null,
        categoryId: categoryId || null,
        fileName: meta.fileName,
        mimeType: meta.mimeType,
        fileSize: meta.fileSize,
        status: "ACTIVE",
        expiryDate: expiryDate || null,
        link:
          linkModule && entityType && entityId
            ? { module: linkModule, entityType, entityId }
            : null,
      });

      try {
        const dataUrl = await fileToDataUrl(selectedFile.file);
        saveDocumentPreview(file.id, {
          dataUrl,
          mimeType: meta.mimeType,
          fileName: meta.fileName,
          storedAt: new Date().toISOString(),
        });
      } catch {
        // Local preview optional
      }

      const href = `/dashboard/documents/files/${file.id}`;
      startNavigation(href);
      router.push(href);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("form.submitFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  const categoryOptions = [
    { value: "", label: t("documents.noCategory") },
    ...(categoriesData?.data ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];
  const moduleOptions = [
    { value: "", label: t("documents.noLink") },
    ...Object.entries(DOCUMENT_MODULE_LABELS).map(([value, label]) => ({ value, label })),
  ];

  return (
    <ModuleLayout maxWidth="lg">
      <FadeIn>
        <PageHeader title={t("documents.newDocument")} description={t("documents.newDocumentDesc")} />
      </FadeIn>
      <FadeIn delay={0.04}>
        <DocumentsNavLinks />
      </FadeIn>
      <FadeIn delay={0.06}>
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="space-y-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] p-6"
        >
          <ActionFeedback error={error} />

          <DocumentUploadZone
            value={selectedFile}
            onChange={setSelectedFile}
            disabled={submitting}
          />

          <FormField label={t("documents.docTitle")} required>
            <input
              className={inputClassName}
              value={title}
              onChange={(e) => {
                setTitleTouched(true);
                setTitle(e.target.value);
              }}
              required
            />
          </FormField>
          <FormField label={t("documents.docDescription")}>
            <textarea
              className={textareaClassName}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="doc-category"
              label={t("documents.category")}
              value={categoryId}
              onChange={setCategoryId}
              options={categoryOptions}
            />
            <DatePicker
              id="doc-expiry"
              label={t("documents.expiryDate")}
              value={expiryDate}
              onChange={setExpiryDate}
              optional
            />
          </div>
          <div className="rounded-lg border border-dashed border-[var(--border-subtle)] p-4">
            <p className="mb-3 text-sm font-medium">{t("documents.linkRecord")}</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <SelectField
                id="doc-link-module"
                label={t("documents.module")}
                value={linkModule}
                onChange={(v) => setLinkModule(v as DocumentModule | "")}
                options={moduleOptions}
              />
              <FormField label={t("documents.entityType")}>
                <input
                  className={inputClassName}
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  placeholder="employee"
                />
              </FormField>
              <FormField label={t("documents.entityId")}>
                <input
                  className={inputClassName}
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                  placeholder="uuid"
                />
              </FormField>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="cursor-pointer"
              onClick={() => router.back()}
            >
              {t("form.cancel")}
            </Button>
            <Button type="submit" disabled={submitting || !selectedFile} className="cursor-pointer">
              {submitting ? t("form.saving") : t("documents.saveDocument")}
            </Button>
          </div>
        </form>
      </FadeIn>
    </ModuleLayout>
  );
}
