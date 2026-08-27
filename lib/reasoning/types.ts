export type IntentSource = "gemini" | "local-fallback";

export interface StructuredIntent {
  issue: string;
  location: string;
  state: string;
  district: string;
  category: string;
  requestedInformation: string[];
  timePeriod: string;
}

export interface IntentRequest {
  text: string;
  language?: string;
}

export interface IntentResponse {
  intent: StructuredIntent;
  source: IntentSource;
  notice: string | null;
}

export function isStructuredIntent(value: unknown): value is StructuredIntent {
  if (typeof value !== "object" || value === null) return false;
  if (!("issue" in value) || !("location" in value) || !("state" in value) || !("district" in value) || !("category" in value)) return false;
  if (!("requestedInformation" in value) || !("timePeriod" in value)) return false;

  const record = value as Record<string, unknown>;
  return (
    typeof record.issue === "string" &&
    record.issue.trim().length > 0 &&
    typeof record.location === "string" &&
    record.location.trim().length > 0 &&
    typeof record.state === "string" &&
    record.state.trim().length > 0 &&
    typeof record.district === "string" &&
    record.district.trim().length > 0 &&
    typeof record.category === "string" &&
    record.category.trim().length > 0 &&
    Array.isArray(record.requestedInformation) &&
    record.requestedInformation.length > 0 &&
    record.requestedInformation.length <= 8 &&
    record.requestedInformation.every((item) => typeof item === "string" && item.trim().length > 0) &&
    typeof record.timePeriod === "string" &&
    record.timePeriod.trim().length > 0
  );
}

export function isIntentResponse(value: unknown): value is IntentResponse {
  if (typeof value !== "object" || value === null) return false;
  if (!("intent" in value) || !("source" in value) || !("notice" in value)) return false;

  const record = value as Record<string, unknown>;
  return (
    isStructuredIntent(record.intent) &&
    (record.source === "gemini" || record.source === "local-fallback") &&
    (record.notice === null || typeof record.notice === "string")
  );
}
