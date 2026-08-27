const DEFAULT_CHUNK_SIZE = 1600;
const DEFAULT_OVERLAP = 240;

export function splitTextIntoChunks(text: string, chunkSize = DEFAULT_CHUNK_SIZE, overlap = DEFAULT_OVERLAP): string[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    const targetEnd = Math.min(start + chunkSize, normalized.length);
    let end = targetEnd;
    if (targetEnd < normalized.length) {
      const paragraphBreak = normalized.lastIndexOf("\n\n", targetEnd);
      const sentenceBreak = normalized.lastIndexOf(". ", targetEnd);
      const wordBreak = normalized.lastIndexOf(" ", targetEnd);
      end = paragraphBreak > start + chunkSize / 2
        ? paragraphBreak
        : sentenceBreak > start + chunkSize / 2
          ? sentenceBreak + 1
          : wordBreak > start + chunkSize / 2
            ? wordBreak
            : targetEnd;
    }

    const chunk = normalized.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= normalized.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

export function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
