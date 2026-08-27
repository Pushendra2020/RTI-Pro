import { loadEnvConfig } from "@next/env";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { embedForRetrieval } from "../lib/rag/embedding";
import { splitTextIntoChunks, stripHtmlToText } from "../lib/rag/chunk";
import { getPineconeIndex } from "../lib/rag/pinecone";
import { isRagSourceDefinition } from "../lib/rag/types";
import type { RagMetadata, RagSourceDefinition } from "../lib/rag/types";

loadEnvConfig(process.cwd());

interface SourceManifest {
  sources: RagSourceDefinition[];
}

function readArgument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  return value && !value.startsWith("--") ? value : undefined;
}

function parseManifest(value: unknown): SourceManifest {
  const sources = Array.isArray(value)
    ? value
    : typeof value === "object" && value !== null && "sources" in value
      ? (value as Record<string, unknown>).sources
      : null;
  if (!Array.isArray(sources) || !sources.every(isRagSourceDefinition)) {
    throw new Error("Manifest must contain a sources array with valid official URL or local-file entries.");
  }
  const ids = new Set<string>();
  for (const source of sources) {
    if (ids.has(source.id)) throw new Error(`Duplicate source id: ${source.id}`);
    ids.add(source.id);
  }
  return { sources };
}

async function readSource(source: RagSourceDefinition): Promise<string> {
  if (source.url) {
    const response = await fetch(source.url, {
      headers: { "User-Agent": "Saathi-RTI-Official-Source-Ingest/1.0" },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`Could not fetch ${source.url}: HTTP ${response.status}`);
    const body = await response.text();
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    return contentType.includes("html") ? stripHtmlToText(body) : body.trim();
  }

  if (!source.path) throw new Error(`Source ${source.id} has no URL or path.`);
  const filePath = resolve(process.cwd(), source.path);
  const body = await readFile(filePath, "utf8");
  return [".html", ".htm"].includes(extname(filePath).toLowerCase()) ? stripHtmlToText(body) : body.trim();
}

function getExpectedDimension(): number | null {
  const value = Number.parseInt(process.env.PINECONE_DIMENSION ?? "", 10);
  return Number.isInteger(value) && value > 0 ? value : null;
}

async function main(): Promise<void> {
  const manifestPath = readArgument("--manifest") ?? process.argv.find((argument, index) => index > 1 && !argument.startsWith("--")) ?? "scripts/rag-sources.json";
  const manifest = parseManifest(JSON.parse(await readFile(resolve(process.cwd(), manifestPath), "utf8")) as unknown);
  if (manifest.sources.length === 0) throw new Error("No real sources configured. Add official URLs or local official documents to the manifest first.");

  const index = getPineconeIndex();
  if (!index) throw new Error("PINECONE_API_KEY and PINECONE_INDEX or PINECONE_HOST are required.");
  const namespace = process.env.PINECONE_NAMESPACE?.trim() || "default";
  const expectedDimension = getExpectedDimension();
  let totalChunks = 0;

  for (const source of manifest.sources) {
    const text = await readSource(source);
    const chunks = splitTextIntoChunks(text);
    if (chunks.length === 0) throw new Error(`Source ${source.id} produced no text after extraction.`);
    const records: Array<{ id: string; values: number[]; metadata: RagMetadata }> = [];
    for (const [chunkIndex, chunkText] of chunks.entries()) {
      const values = await embedForRetrieval(chunkText);
      if (expectedDimension !== null && values.length !== expectedDimension) {
        throw new Error(`Embedding dimension ${values.length} does not match PINECONE_DIMENSION=${expectedDimension}.`);
      }
      records.push({
        id: `${source.id}-${chunkIndex + 1}`.replace(/[^a-zA-Z0-9_-]/g, "-"),
        values,
        metadata: {
          chunkText,
          sourceId: source.id,
          sourceTitle: source.title,
          sourceUrl: source.sourceUrl ?? source.url ?? source.path ?? "",
          sourceType: source.sourceType,
          state: source.state,
          district: source.district,
          category: source.category,
          verifiedAt: source.verifiedAt,
          chunkIndex,
        },
      });
    }
    await index.upsert({ records, namespace });
    totalChunks += records.length;
    console.log(`Ingested ${records.length} chunks from ${source.title}`);
  }
  console.log(`Finished: ${totalChunks} real document chunks in namespace ${namespace}.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown ingestion error";
  console.error(`RAG ingestion failed: ${message}`);
  process.exitCode = 1;
});
