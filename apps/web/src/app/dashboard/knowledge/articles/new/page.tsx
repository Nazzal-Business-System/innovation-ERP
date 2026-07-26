"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useState } from "react";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { inputClassName, textareaClassName } from "@/lib/form-utils";
import { useCreateKnowledgeArticle, useKnowledgeCategories } from "@/lib/hooks/use-knowledge";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { KnowledgeNavLinks } from "@/components/knowledge/knowledge-gate";
import { KNOWLEDGE_VISIBILITY_LABELS } from "@/components/knowledge/knowledge-columns";
import { ArticleFileImport } from "@/components/knowledge/article-file-import";

const MarkdownEditor = dynamic(
  () =>
    import("@/components/markdown/markdown-editor").then((m) => ({
      default: m.MarkdownEditor,
    })),
  {
    loading: () => (
      <div className="min-h-[220px] animate-pulse rounded-xl bg-[var(--muted-bg)]" aria-hidden />
    ),
  }
);

export default function NewKnowledgeArticlePage() {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { t } = useI18n();
  const { data: categoriesData } = useKnowledgeCategories({ activeOnly: true });
  const createArticleMutation = useCreateKnowledgeArticle();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [visibility, setVisibility] = useState("INTERNAL");
  const [tags, setTags] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || createArticleMutation.isPending) return;
    if (!title.trim() || !content.trim()) {
      setError(t("knowledge.contentRequired", "Title and content are required."));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const article = await createArticleMutation.mutateAsync({
        title: title.trim(),
        summary: summary.trim() || null,
        content,
        categoryId: categoryId || null,
        visibility: visibility as "INTERNAL" | "PUBLIC" | "SUPPORT_ONLY",
        status: "DRAFT",
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
      const href = `/dashboard/knowledge/articles/${article.id}`;
      startNavigation(href);
      router.push(href);
    } catch (err) {
      setError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setSubmitting(false);
    }
  }

  const categoryOptions = [
    { value: "", label: t("knowledge.noCategory") },
    ...(categoriesData?.data ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];
  const visibilityOptions = Object.entries(KNOWLEDGE_VISIBILITY_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <ModuleLayout maxWidth="lg">
      <FadeIn>
        <PageHeader title={t("knowledge.newArticle")} description={t("knowledge.newArticleDesc")} />
      </FadeIn>
      <FadeIn delay={0.04}>
        <KnowledgeNavLinks />
      </FadeIn>
      <FadeIn delay={0.06}>
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] p-6"
          noValidate
        >
          <ActionFeedback error={error} success={importNotice} />

          <ArticleFileImport
            disabled={submitting}
            onImported={(result) => {
              setContent(result.content);
              if (!title.trim() && result.suggestedTitle) {
                setTitle(result.suggestedTitle);
              }
              setImportNotice(
                t(
                  "knowledge.importSuccess",
                  "File imported into the draft editor. Review and edit before saving."
                )
              );
            }}
          />

          <FormField label={t("knowledge.articleTitle")} required>
            <input
              className={inputClassName}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={submitting}
            />
          </FormField>
          <FormField label={t("knowledge.summary")}>
            <textarea
              className={textareaClassName}
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              disabled={submitting}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="kb-category"
              label={t("knowledge.category")}
              value={categoryId}
              onChange={setCategoryId}
              options={categoryOptions}
              disabled={submitting}
            />
            <SelectField
              id="kb-visibility"
              label={t("knowledge.visibility")}
              value={visibility}
              onChange={setVisibility}
              options={visibilityOptions}
              disabled={submitting}
            />
          </div>
          <FormField label={t("knowledge.content")} required>
            <MarkdownEditor
              id="kb-content"
              value={content}
              onChange={setContent}
              required
              disabled={submitting}
            />
          </FormField>
          <FormField label={t("knowledge.tagsComma")}>
            <input
              className={inputClassName}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="sop, inventory, policy"
              disabled={submitting}
            />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" className="cursor-pointer" onClick={() => router.back()}>
              {t("form.cancel")}
            </Button>
            <Button type="submit" loading={submitting} className="cursor-pointer">
              {t("knowledge.saveDraft")}
            </Button>
          </div>
        </form>
      </FadeIn>
    </ModuleLayout>
  );
}
