/**
 * Client-side article import helpers.
 * Supported: .txt, .md, .docx (mammoth text extraction only).
 */

export const ARTICLE_IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const ARTICLE_CONTENT_MAX_CHARS = 50_000;

export type ArticleImportFormat = "txt" | "md" | "docx";

export type ArticleImportResult = {
  content: string;
  suggestedTitle: string | null;
  format: ArticleImportFormat;
};

const EXT_MAP: Record<string, ArticleImportFormat> = {
  ".txt": "txt",
  ".md": "md",
  ".markdown": "md",
  ".docx": "docx",
};

export function detectArticleImportFormat(file: File): ArticleImportFormat | null {
  const name = file.name.toLowerCase();
  const dot = name.lastIndexOf(".");
  if (dot < 0) return null;
  return EXT_MAP[name.slice(dot)] ?? null;
}

export function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  if (!base) return "";
  return base.replace(/\s+/g, " ");
}

/** Strip unsafe HTML/scripts and normalize imported text to safe Markdown-ish plain content. */
export function sanitizeImportedArticleText(raw: string): string {
  let text = raw.replace(/\u0000/g, "");
  // Drop HTML comments and script/style blocks before tag stripping.
  text = text.replace(/<!--[\s\S]*?-->/g, "");
  text = text.replace(/<script[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
  // Convert common block tags to markdown-friendly newlines.
  text = text.replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<h1[^>]*>/gi, "# ");
  text = text.replace(/<h2[^>]*>/gi, "## ");
  text = text.replace(/<h3[^>]*>/gi, "### ");
  text = text.replace(/<(ul|ol)[^>]*>/gi, "\n");
  text = text.replace(/<li[^>]*>/gi, "- ");
  // Strip remaining tags.
  text = text.replace(/<\/?[^>]+>/g, "");
  // Decode a few common entities.
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
  // Normalize newlines and trim excess blank lines.
  text = text.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (text.length > ARTICLE_CONTENT_MAX_CHARS) {
    text = text.slice(0, ARTICLE_CONTENT_MAX_CHARS);
  }
  return text;
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

export async function importArticleFromFile(file: File): Promise<ArticleImportResult> {
  if (file.size <= 0) {
    throw new Error("EMPTY_FILE");
  }
  if (file.size > ARTICLE_IMPORT_MAX_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }

  const format = detectArticleImportFormat(file);
  if (!format) {
    throw new Error("UNSUPPORTED_FORMAT");
  }

  let raw = "";
  if (format === "docx") {
    const mammoth = await import("mammoth");
    const buffer = await readFileAsArrayBuffer(file);
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    raw = result.value ?? "";
  } else {
    raw = await readFileAsText(file);
  }

  const content = sanitizeImportedArticleText(raw);
  if (!content) {
    throw new Error("EMPTY_CONTENT");
  }

  return {
    content,
    suggestedTitle: titleFromFilename(file.name) || null,
    format,
  };
}

export function mapArticleImportError(
  err: unknown,
  t: (key: string, fallback?: string) => string
): string {
  const code = err instanceof Error ? err.message : "";
  switch (code) {
    case "UNSUPPORTED_FORMAT":
      return t(
        "knowledge.importUnsupported",
        "Unsupported file type. Use .txt, .md, or .docx."
      );
    case "FILE_TOO_LARGE":
      return t("knowledge.importTooLarge", "File must be 2 MB or smaller.");
    case "EMPTY_FILE":
    case "EMPTY_CONTENT":
      return t("knowledge.importEmpty", "The file did not contain usable text.");
    default:
      return t("knowledge.importFailed", "Could not import this file. Try another document.");
  }
}
