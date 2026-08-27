# Context.md

## RTI Citizen Assistant - Current Project Context

This file is intentionally concise. A new agent should read this file first to understand the current state without reading the entire codebase.

## Project Purpose

Build a browser-based RTI citizen assistant that removes the need for citizens to know the correct department or public authority before filing an RTI.

Core interaction:

> **Tell us what you need. We handle the government-side complexity.**

## Current Product Direction

The product has two input modes:

1. **Tell us**: voice or text input in natural language.
2. **Guide me**: manual step-by-step navigation.

Both modes should converge into the same RTI workflow.

## Core MVP Journey

```text
Landing
 -> Speak/Type
 -> Understand request
 -> Suggest department/public authority
 -> Citizen confirms
 -> Generate RTI draft
 -> Review/edit
 -> Mock submit
 -> Application ID
 -> Track status
```

## Primary Differentiator

The project should not be positioned as merely a voice-enabled RTI portal.

The key idea is:

> **Citizens know what happened. They should not have to know which department handled it.**

Voice is an input mechanism. Automatic intent understanding + authority discovery + guided drafting are the distinctive workflow.

## Current AI Architecture Decision

- LangGraph: workflow orchestration.
- Reasoning model: selected Gemini/Gemma model through an adapter.
- Pinecone: RAG for official RTI rules, portal instructions, and selected official department/public-authority documents.
- Supabase: structured authority/jurisdiction data and mock application records.
- Sarvam: speech-to-text/text-to-speech layer where used.
- Vercel: web deployment.
- Bravo: optional email layer.

## RAG Scope

Do not build a giant national corpus for the first submission.

Use high-value official material:

- RTI rules.
- Official portal instructions.
- State-specific instructions.
- Selected official department/public-authority documents that explain responsibilities and routing.

Separate RAG from deterministic authority lookup.

## Structured Data Scope

Use a curated Maharashtra-focused authority dataset for the MVP.

Important fields:

- State.
- District.
- Category.
- Department.
- Public authority.
- Keywords/aliases.
- Portal.
- Official source URL.
- Verification date.

## Model Options Under Consideration

User-provided options:

- Gemma 4 31B.
- Gemma 4 26B.
- Gemini 3.5 Flash-Lite.
- Gemini 3.1 Flash-Lite.

Do not assume availability, pricing, quota, or exact API identifiers without checking the selected provider documentation.

Prefer one primary model and one fallback.

## Hackathon Constraints

The supplied transcript says:

- Build a complete POC.
- Mock backend/data/accounts where necessary.
- Make it available in a browser.
- Provide usable login/test access where needed.
- Consumer-side experience is what gets evaluated.
- Focus on ideas, interfaces, and interactions rather than backend plumbing.
- Build for busy, frustrated citizens.
- Prefer bold useful ideas over flashy effects.

The transcript also says the submission video is capped at two minutes, with roughly one minute for the citizen demo and one minute for explaining the build. fileciteturn0file0L4-L7

## Current Phase

**Phase:** 4 - RAG Integration

## Completed

- Product problem identified from direct use of RTI portals.
- Core interaction chosen: intent-first RTI filing.
- Two input modes chosen: voice/text and manual guided mode.
- RAG scope narrowed to rules/instructions/official authority-related documents.
- Authority discovery separated conceptually from generic RAG and assigned to structured data + tools.
- LangGraph selected for workflow orchestration.
- Pinecone selected for RAG.
- Supabase preferred for structured authority/application data.
- Vercel selected for web deployment.
- Sarvam considered for speech.
- Bravo considered for email.
- Built a stateful Next.js citizen journey from landing through request understanding, authority confirmation, draft review, mock submission, and tracking.
- Added a Maharashtra road-work demo path with deterministic mock authority matching and browser-local mock application persistence.
- Added responsive, accessible UI states for text input, simulated voice capture, loading, validation, confirmation, submitted, and tracking views.
- Added a typed Maharashtra authority directory with five curated Nashik records, keyword aliases, official source metadata, and jurisdiction/category scoring.
- Added a Supabase migration with RLS, least-privilege public read access, indexes, and seed data for the authority directory.
- Added a server-only authority API route that queries Supabase when configured and falls back to the curated local directory when it is not.
- Added a server-only Gemini reasoning adapter using structured JSON output and semantic validation for issue, location, category, requested information, and time period.
- Added a typed `/api/intent` route that uses the configured Gemini primary/fallback model and a deterministic local parser when credentials or model access are unavailable.
- Connected the citizen request step to the reasoning route with loading, validation, and visible fallback notices before authority lookup.
- Completed Phase 3 acceptance: the realistic road-work request now returns validated issue, location, state, district, category, requested information, and time period fields, and the extracted jurisdiction drives authority lookup.
- Added a real-source RAG ingestion command that fetches official URLs or reads user-provided official text/HTML files, chunks them, embeds them with OpenAI `text-embedding-3-large` at 1024 dimensions, and upserts source metadata into Pinecone.
- Added `retrieveOfficialContext()` and a typed `/api/rag` route that returns Pinecone matches and source metadata without substituting mock records when the corpus is empty or unavailable.

## Not Yet Confirmed

- Exact final model/provider and API access.
- Exact Supabase schema.
- Exact curated authority dataset.
- Exact Pinecone index/embedding configuration is now supplied: `rti-pro`, dense cosine, 1024 dimensions, namespace `default`.
- Exact Sarvam integration details.
- Exact project repository structure.

## Current Working Integrations

- Next.js 16 + React + Tailwind CSS v4.
- Supabase project `rti-pro` is connected for the authority directory.
- The frontend calls `/api/authority`; provider credentials stay server-side and the public directory uses publishable/anon access with RLS.
- The frontend calls `/api/intent`; `@google/genai` stays server-side, with `gemini-3.5-flash-lite` as the default and `gemini-3.1-flash-lite` as the fallback.
- The frontend calls `/api/rag`; Pinecone records use OpenAI `text-embedding-3-large` vectors at 1024 dimensions in the `default` namespace and preserve source title, canonical URL, category, jurisdiction, verification date, and chunk text.
- `.env.example` documents the planned model, speech, retrieval, Supabase, email, and workflow adapter keys.

## Known Limitations

- Voice capture is simulated for the browser demo; Sarvam STT is not connected.
- Gemini reasoning uses the local parser when `GEMINI_API_KEY` is missing, the provider is not `gemini`, or both configured models fail.
- No RAG records are seeded. Phase 4 remains in progress until real official sources are added to `scripts/rag-sources.json` and successfully ingested into Pinecone.
- Draft generation, submission, and tracking still use deterministic mock data and `localStorage`.
- The authority dataset is Maharashtra-focused, with Nashik as the first curated district.

## Exact Next Phase

Phase 4 - RAG Integration: add and verify a small real official-document corpus, then expose grounded source metadata for the road-work demo query.

## Current Priority

Build the complete citizen journey before adding secondary technology features.

Priority order:

1. Citizen flow.
2. Authority discovery.
3. Drafting.
4. Review.
5. Mock submission/tracking.
6. Voice/multilingual.
7. RAG expansion.
8. Optional email.
9. Visual polish.

## Current Demo Scenario

Use a simple public-infrastructure/road scenario for the initial demo.

Example citizen input:

> "Mere gaon ke road ke liye kitna paisa sanction hua tha aur contractor kaun tha?"

The system should identify the location/category from the input where possible, suggest the likely authority, request confirmation, and generate an information-oriented RTI draft.

## Important Product Rules

- Never silently submit an AI-selected authority.
- Never fabricate government rules or authorities.
- Prefer official sources.
- Preserve state when language or navigation changes.
- Keep the user in control of the final draft and submission.
- Clearly label the submission as a mock/demo submission.
- Do not spend time building admin features for this round.

## Known Scope Limits

- Not a production government replacement.
- Not nationwide coverage in the first sprint.
- Not a feature-phone/IVR production system.
- Not real government submission.
- Not a large multi-agent architecture.

## Context Update Protocol

After every completed phase, update this file with:

- Current phase.
- Completed work.
- Current working integrations.
- Important decisions.
- Known limitations.
- Required environment variables.
- Exact next phase.

Keep this file short enough that another agent can understand the project quickly.
