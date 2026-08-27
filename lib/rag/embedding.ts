/**
 * Reserved external-vector path for a future OpenAI-backed Pinecone index.
 * The active Phase 4 pipeline uses Pinecone integrated inference instead.
 */
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-large";
const DEFAULT_EMBEDDING_DIMENSION = 1024;

interface EmbeddingResponse {
  data?: Array<{
    embedding?: number[];
  }>;
}

function isEmbeddingResponse(value: unknown): value is EmbeddingResponse {
  if (typeof value !== "object" || value === null || !Array.isArray((value as { data?: unknown }).data)) return false;
  return (value as { data: unknown[] }).data.every((item) => {
    if (typeof item !== "object" || item === null) return false;
    const embedding = (item as { embedding?: unknown }).embedding;
    return Array.isArray(embedding) && embedding.every((entry) => typeof entry === "number" && Number.isFinite(entry));
  });
}

function getEmbeddingDimension(): number {
  const configured = Number.parseInt(process.env.OPENAI_EMBEDDING_DIMENSION ?? "", 10);
  return Number.isInteger(configured) && configured > 0 ? configured : DEFAULT_EMBEDDING_DIMENSION;
}

export async function embedForRetrieval(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is required for RAG embeddings");

  const dimension = getEmbeddingDimension();
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL,
      input: text,
      dimensions: dimension,
      encoding_format: "float",
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) throw new Error(`OpenAI embeddings request failed with HTTP ${response.status}`);
  const payload: unknown = await response.json();
  if (!isEmbeddingResponse(payload)) throw new Error("OpenAI embeddings response was malformed");
  const values = payload.data?.[0]?.embedding;
  if (!values || values.length === 0) throw new Error("OpenAI embeddings provider returned no vector");
  if (values.length !== dimension) throw new Error(`OpenAI embedding dimension ${values.length} does not match ${dimension}`);
  return values;
}
