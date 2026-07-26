const PREFIX = "ierp_doc_preview_";
const MAX_STORE_BYTES = 2_500_000;

export interface StoredDocumentPreview {
  dataUrl: string;
  mimeType: string;
  fileName: string;
  storedAt: string;
}

export function saveDocumentPreview(documentId: string, preview: StoredDocumentPreview): void {
  if (typeof window === "undefined") return;
  try {
    if (preview.dataUrl.length > MAX_STORE_BYTES) {
      sessionStorage.setItem(
        `${PREFIX}${documentId}`,
        JSON.stringify({ ...preview, dataUrl: "", truncated: true })
      );
      return;
    }
    sessionStorage.setItem(`${PREFIX}${documentId}`, JSON.stringify(preview));
  } catch {
    // Quota exceeded — skip local preview persistence
  }
}

export function getDocumentPreview(documentId: string): StoredDocumentPreview | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${PREFIX}${documentId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDocumentPreview & { truncated?: boolean };
    if (parsed.truncated || !parsed.dataUrl) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
