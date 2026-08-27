import type { RecordMetadata } from "@pinecone-database/pinecone";

export interface RagSourceDefinition {
  id: string;
  title: string;
  url?: string;
  path?: string;
  sourceUrl?: string;
  sourceType: string;
  state: string;
  district: string;
  category: string;
  verifiedAt: string;
}

export type RagMetadata = RecordMetadata & {
  chunkText: string;
  sourceId: string;
  sourceTitle: string;
  sourceUrl: string;
  sourceType: string;
  state: string;
  district: string;
  category: string;
  verifiedAt: string;
  chunkIndex: number;
};

export interface OfficialContextMatch {
  id: string;
  score: number;
  text: string;
  sourceId: string;
  sourceTitle: string;
  sourceUrl: string;
  sourceType: string;
  state: string;
  district: string;
  category: string;
  verifiedAt: string;
}

export interface OfficialContextResult {
  matches: OfficialContextMatch[];
  source: "pinecone" | "empty" | "unavailable";
  notice: string | null;
}

export function isOfficialContextResult(value: unknown): value is OfficialContextResult {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.matches)) return false;
  if (record.source !== "pinecone" && record.source !== "empty" && record.source !== "unavailable") return false;
  if (record.notice !== null && typeof record.notice !== "string") return false;
  return record.matches.every((match) => {
    if (typeof match !== "object" || match === null) return false;
    const item = match as Record<string, unknown>;
    return typeof item.id === "string"
      && typeof item.score === "number"
      && typeof item.text === "string"
      && typeof item.sourceId === "string"
      && typeof item.sourceTitle === "string"
      && typeof item.sourceUrl === "string"
      && typeof item.sourceType === "string"
      && typeof item.state === "string"
      && typeof item.district === "string"
      && typeof item.category === "string"
      && typeof item.verifiedAt === "string";
  });
}

export function isRagSourceDefinition(value: unknown): value is RagSourceDefinition {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  const hasOneLocation = (typeof record.url === "string" && record.url.trim().length > 0) !== (typeof record.path === "string" && record.path.trim().length > 0);
  return hasOneLocation
    && typeof record.id === "string" && record.id.trim().length > 0
    && typeof record.title === "string" && record.title.trim().length > 0
    && typeof record.sourceType === "string" && record.sourceType.trim().length > 0
    && typeof record.state === "string"
    && typeof record.district === "string"
    && typeof record.category === "string" && record.category.trim().length > 0
    && typeof record.verifiedAt === "string" && record.verifiedAt.trim().length > 0;
}
