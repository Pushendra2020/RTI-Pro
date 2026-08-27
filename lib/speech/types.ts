export interface SpeechToTextResult {
  transcript: string;
  languageCode: string | null;
  source: "sarvam";
  notice: string | null;
}

export function isSpeechToTextResult(value: unknown): value is SpeechToTextResult {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.transcript === "string"
    && record.transcript.trim().length > 0
    && (typeof record.languageCode === "string" || record.languageCode === null)
    && record.source === "sarvam"
    && (typeof record.notice === "string" || record.notice === null);
}
