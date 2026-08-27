# Real RAG source ingestion

This project intentionally does not ship seeded or mock RAG records. Add only documents you are allowed to use, preferably from official government domains or official portal instructions.

1. Create `scripts/rag-sources.json` by copying `scripts/rag-sources.example.json`.
2. Add one entry for each real source. Use exactly one of `url` or `path`:

```json
{
  "sources": [
    {
      "id": "unique-source-id",
      "title": "Official source title",
      "url": "https://official-government-domain.example/document",
      "sourceType": "official_portal_instructions",
      "state": "Maharashtra",
      "district": "",
      "category": "RTI procedure",
      "verifiedAt": "2026-08-27"
    }
  ]
}
```

For a downloaded text or HTML document, use `path` instead. Add `sourceUrl` with the canonical official page URL when the local file came from an official page. The ingestion command accepts UTF-8 `.txt`, `.md`, `.html`, and `.htm` files. PDFs should be converted to UTF-8 text after you verify the source, or supplied as an official HTML page.

3. Use the existing Pinecone integrated-inference index configured with Microsoft `multilingual-e5-large`, dense vectors, 1024 dimensions, cosine similarity, and the field map `text: text`. Pinecone embeds both records and search queries; no OpenAI key is required for the active path. The OpenAI external-vector helper remains in the repository for a future standard vector index, but is not called now.
4. Fill these server-only variables in `.env.local`:

```text
# Reserved for the inactive external-vector fallback
OPENAI_API_KEY=
OPENAI_EMBEDDING_MODEL=text-embedding-3-large
OPENAI_EMBEDDING_DIMENSION=1024
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX=rti-pro
PINECONE_HOST=https://rti-pro-jpaw375.svc.aped-4627-b74a.pinecone.io
PINECONE_NAMESPACE=default
PINECONE_DIMENSION=1024
PINECONE_EMBEDDING_MODEL=multilingual-e5-large
PINECONE_EMBEDDING_FIELD_MAP=text
RAG_CHUNK_SIZE=1000
RAG_CHUNK_OVERLAP=150
```

`PINECONE_HOST` is preferred when available. `PINECONE_INDEX` is used when the host is omitted. Keep these values server-side and never prefix them with `NEXT_PUBLIC_`.

5. Run ingestion from the repository root:

```bash
npm run rag:ingest -- scripts/rag-sources.json
```

The command fetches each real source, extracts text, chunks it into conservative text windows for the model's 507-token limit, and sends `{ id, text, ...metadata }` records to Pinecone. Pinecone creates the `multilingual-e5-large` embeddings using the configured `text` field map. Re-running a source overwrites the same deterministic chunk IDs.

The application queries the same namespace through `/api/rag`. If the index is empty or unavailable, the app returns an explicit empty/unavailable state and never substitutes mock guidance.
