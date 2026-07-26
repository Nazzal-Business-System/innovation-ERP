export type DocumentPreviewKind =
  | "pdf"
  | "image"
  | "text"
  | "word"
  | "excel"
  | "unknown";

export interface ParsedFileMeta {
  fileName: string;
  mimeType: string;
  fileSize: number;
  extension: string;
  previewKind: DocumentPreviewKind;
}

const EXT_MIME: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  txt: "text/plain",
  csv: "text/csv",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export function getExtension(fileName: string): string {
  const parts = fileName.split(".");
  if (parts.length < 2) return "";
  return parts.pop()!.toLowerCase();
}

export function detectMimeType(file: File): string {
  if (file.type) return file.type;
  const ext = getExtension(file.name);
  return EXT_MIME[ext] ?? "application/octet-stream";
}

export function getPreviewKind(mimeType: string, fileName?: string): DocumentPreviewKind {
  const mime = mimeType.toLowerCase();
  const ext = fileName ? getExtension(fileName) : "";

  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("text/") || ext === "txt" || ext === "csv") return "text";
  if (
    mime.includes("word") ||
    mime === "application/msword" ||
    ext === "doc" ||
    ext === "docx"
  ) {
    return "word";
  }
  if (
    mime.includes("excel") ||
    mime.includes("spreadsheet") ||
    ext === "xls" ||
    ext === "xlsx"
  ) {
    return "excel";
  }
  return "unknown";
}

export function parseFileMeta(file: File): ParsedFileMeta {
  const fileName = file.name;
  const mimeType = detectMimeType(file);
  return {
    fileName,
    mimeType,
    fileSize: file.size,
    extension: getExtension(fileName),
    previewKind: getPreviewKind(mimeType, fileName),
  };
}

export function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "");
  return base
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
