import { Pinecone } from "@pinecone-database/pinecone";
import type { Index } from "@pinecone-database/pinecone";
import { embedForRetrieval } from "@/lib/rag/embedding";
import type { OfficialContextMatch, OfficialContextResult, RagMetadata } from "@/lib/rag/types";

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

function mapMatch(match: { id: string; score?: number; metadata?: RagMetadata }): OfficialContextMatch | null {
  const metadata = match.metadata;
  if (!metadata || typeof metadata.chunkText !== "string" || typeof metadata.sourceUrl !== "string") return null;
  return {
    id: match.id,
    score: match.score ?? 0,
    text: metadata.chunkText,
    sourceId: metadata.sourceId,
    sourceTitle: metadata.sourceTitle,
    sourceUrl: metadata.sourceUrl,
    sourceType: metadata.sourceType,
    state: metadata.state,
    district: metadata.district,
    category: metadata.category,
    verifiedAt: metadata.verifiedAt,
  };
}

export async function retrieveOfficialContext(query: string, topK = 4): Promise<OfficialContextResult> {
  const index = getPineconeIndex();
  if (!index) {
    return { matches: [], source: "unavailable", notice: "Pinecone is not configured yet. Add the index credentials and ingest official sources to enable grounded guidance." };
  }

  try {
    const vector = await embedForRetrieval(query, "RETRIEVAL_QUERY");
    const result = await index.query({
      namespace: process.env.PINECONE_NAMESPACE?.trim() || "rti-official",
      vector,
      topK: Math.max(1, Math.min(topK, 8)),
      includeMetadata: true,
    });
    const matches = result.matches.map(mapMatch).filter((match): match is OfficialContextMatch => match !== null);
    return matches.length > 0
      ? { matches, source: "pinecone", notice: null }
      : { matches: [], source: "empty", notice: "No official documents have been ingested for this query yet." };
  } catch {
    return { matches: [], source: "unavailable", notice: "Official document retrieval is unavailable right now. We have not substituted any mock guidance." };
  }
}
