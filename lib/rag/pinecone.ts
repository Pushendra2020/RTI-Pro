import { Pinecone } from "@pinecone-database/pinecone";
import type { Index } from "@pinecone-database/pinecone";
import type { OfficialContextMatch, OfficialContextResult, RagMetadata } from "@/lib/rag/types";

const DEFAULT_NAMESPACE = "default";
const INTEGRATED_TEXT_FIELD = "text";

export function getPineconeIndex(): Index<RagMetadata> | null {
  const apiKey = process.env.PINECONE_API_KEY?.trim();
  const indexName = process.env.PINECONE_INDEX?.trim();
  const host = process.env.PINECONE_HOST?.trim();
  if (!apiKey || (!indexName && !host)) return null;

  const pinecone = new Pinecone({ apiKey });
  if (host) return pinecone.index<RagMetadata>({ host });
  if (!indexName) return null;
  return pinecone.index<RagMetadata>({ name: indexName });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringField(fields: Record<string, unknown>, key: string): string | null {
  const value = fields[key];
  return typeof value === "string" ? value : null;
}

function mapIntegratedMatch(match: { _id: string; _score: number; fields: object }): OfficialContextMatch | null {
  if (!isRecord(match.fields)) return null;
  const fields = match.fields;
  const text = readStringField(fields, INTEGRATED_TEXT_FIELD) ?? readStringField(fields, "chunkText");
  if (text === null) return null;

  const sourceId = readStringField(fields, "sourceId");
  const sourceTitle = readStringField(fields, "sourceTitle");
  const sourceUrl = readStringField(fields, "sourceUrl");
  const sourceType = readStringField(fields, "sourceType");
  const state = readStringField(fields, "state");
  const district = readStringField(fields, "district");
  const category = readStringField(fields, "category");
  const verifiedAt = readStringField(fields, "verifiedAt");
  if (sourceId === null || sourceTitle === null || sourceUrl === null || sourceType === null || state === null || district === null || category === null || verifiedAt === null) return null;

  return {
    id: match._id,
    score: match._score,
    text,
    sourceId,
    sourceTitle,
    sourceUrl,
    sourceType,
    state,
    district,
    category,
    verifiedAt,
  };
}

export async function retrieveOfficialContext(query: string, topK = 4): Promise<OfficialContextResult> {
  const index = getPineconeIndex();
  if (!index) {
    return { matches: [], source: "unavailable", notice: "Pinecone is not configured yet. Add the index credentials and ingest official sources to enable grounded guidance." };
  }

  try {
    const namespace = index.namespace(process.env.PINECONE_NAMESPACE?.trim() || DEFAULT_NAMESPACE);
    const result = await namespace.searchRecords({
      query: {
        inputs: { [INTEGRATED_TEXT_FIELD]: query },
        topK: Math.max(1, Math.min(topK, 8)),
      },
      fields: [
        INTEGRATED_TEXT_FIELD,
        "chunkText",
        "sourceId",
        "sourceTitle",
        "sourceUrl",
        "sourceType",
        "state",
        "district",
        "category",
        "verifiedAt",
      ],
    });
    const matches = result.result.hits.map(mapIntegratedMatch).filter((match): match is OfficialContextMatch => match !== null);
    return matches.length > 0
      ? { matches, source: "pinecone", notice: null }
      : { matches: [], source: "empty", notice: "No official documents have been ingested for this query yet." };
  } catch {
    return { matches: [], source: "unavailable", notice: "Official document retrieval is unavailable right now. We have not substituted any mock guidance." };
  }
}
