import { GoogleGenAI } from "@google/genai";

const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001";
const DEFAULT_EMBEDDING_DIMENSION = 768;

function getEmbeddingDimension(): number {
  const configured = Number.parseInt(process.env.GEMINI_EMBEDDING_DIMENSION ?? "", 10);
  return Number.isInteger(configured) && configured > 0 ? configured : DEFAULT_EMBEDDING_DIMENSION;
}

export async function embedForRetrieval(text: string, taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is required for RAG embeddings");

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.embedContent({
    model: process.env.GEMINI_EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL,
    contents: text,
    config: {
      taskType,
      outputDimensionality: getEmbeddingDimension(),
    },
  });
  const values = response.embeddings?.[0]?.values;
  if (!values || values.length === 0) throw new Error("Embedding provider returned no vector");
  return values;
}
