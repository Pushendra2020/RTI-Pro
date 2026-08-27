# Agents.md

## RTI Citizen Assistant - Global Instructions for Codex

This file is the source of truth for how Codex should work throughout the project.
Read this file before making any code or architecture change.

## 1. Project Mission

Build a browser-accessible proof of concept that makes filing an RTI request dramatically simpler for citizens.

The core product idea is:

> **Citizens know what happened. They should not have to know which government department or public authority handled it.**

The product should let a citizen describe what information they need in natural language, optionally through voice, and then help them identify the appropriate jurisdiction/department/public authority, create a useful RTI request, review it, and complete a mocked submission flow.

The project is an **RTI citizen experience proof of concept**, not a production replacement for government infrastructure.

## 2. Hackathon Constraints

The hackathon instructions supplied by the user establish these priorities:

- Build a comprehensive proof of concept.
- Mock the data, backend, and accounts where appropriate.
- Make the project publicly accessible in a browser.
- Provide working credentials/test access where the product needs them.
- Judges evaluate the consumer/citizen side.
- Prioritize ideas, interfaces, and interactions over backend plumbing.
- Build for busy and frustrated citizens.
- Useful and distinctive ideas are preferred over flashy technology.
- Do not spend time on admin-side functionality unless it directly helps the demo.

Do not interpret the project as requiring real government API integration or production-scale infrastructure.

## 3. Product Principles

### 3.1 Intent first, bureaucracy second

Never make the citizen understand government hierarchy before they can describe their problem.

Prefer:

`Citizen problem -> system understanding -> authority discovery -> citizen confirmation`

Avoid:

`Department dropdown -> authority dropdown -> citizen guesses correctly`

### 3.2 Voice is an input method, not the product

Voice is useful, but the core differentiator is automatic understanding and authority discovery.

The system must work through both:

- Voice/text conversational input.
- A manual guided mode.

Both should feed the same underlying application workflow.

### 3.3 Never silently guess critical government routing

The AI may suggest a department or public authority, but the citizen must see the proposed routing and confirm it before submission.

### 3.4 Explain important decisions

When possible, show why an authority was suggested, using:

- User-provided location.
- User-provided topic/problem.
- Retrieved official information.

### 3.5 Draft for information requests, not vague complaints

If a citizen asks a vague question such as "Why did the government not repair my road?", guide the user toward existing information/records that can be requested through RTI.

Do not pretend the model has legal authority. Explain the transformation in plain language.

### 3.6 Preserve state

Changing language, navigating backward, editing a draft, or switching input modes must not unnecessarily reset the application.

## 4. AI Responsibility Boundaries

### LLM / reasoning model may:

- Understand natural-language citizen requests.
- Extract structured intent.
- Extract location, topic, time period, and information requested.
- Generate clarification questions.
- Generate a citizen-friendly RTI draft.
- Explain retrieved rules/instructions.
- Suggest candidate departments/authorities based on retrieved data.

### Deterministic systems must handle:

- Authority lookup where structured data is available.
- State/district/category filtering.
- Application state.
- Required-field validation.
- Application IDs.
- Mock submission.
- Tracking status.
- Data persistence.

### RAG must provide grounded context for:

- RTI rules.
- Official filing instructions.
- Official authority/department instructions.
- Relevant government documents.

Never invent a government authority, rule, fee, or procedural requirement when the information is unavailable.

## 5. Source Policy

For government facts, prefer official government sources and official portal documents.

RAG documents should retain metadata such as:

- source URL
- source title
- source authority
- state
- department/authority if applicable
- document type
- language
- verification date

Do not scrape arbitrary websites merely to increase the corpus size.

## 6. MVP Scope

The first submission should be narrow and polished.

Required citizen flow:

`Home -> Speak/Type -> Understand -> Department/Public Authority suggestion -> Confirm -> Guided RTI draft -> Review -> Mock submit -> Application ID/Tracking`

A focused Maharashtra-first demonstration is acceptable. Do not attempt nationwide coverage before the core flow works.

## 7. Technology Direction

Preferred stack, subject to what is already available in the repository:

- Frontend: Next.js + React + Tailwind CSS.
- Deployment: Vercel.
- Workflow orchestration: LangGraph.
- Vector retrieval: Pinecone.
- Structured database: Supabase preferred; MongoDB is acceptable if existing project constraints make it easier.
- Speech: Sarvam for speech-to-text/text-to-speech where available.
- Email: Bravo, only where useful to the demo.
- Reasoning model: use the selected Gemini/Gemma model that is actually available through the chosen API/provider.

Do not add a new infrastructure service unless it solves a concrete MVP requirement.

## 8. Model Policy

The user is considering:

- Gemma 4 31B
- Gemma 4 26B
- Gemini 3.5 Flash-Lite
- Gemini 3.1 Flash-Lite

Codex must verify actual API/model availability before wiring a model into production code. Do not hardcode assumptions about model availability, free-tier limits, quotas, or names without verification.

For the MVP, prefer one primary reasoning model and one optional fallback. Do not create a complex model-routing system unless necessary.

## 9. UX Rules

The UI should be:

- Minimal.
- Obvious.
- Mobile-friendly even though the required judged experience is browser-based.
- Large touch targets.
- Plain language.
- Low cognitive load.
- Clear progress indicators.
- Clear confirmation states.
- Accessible error messages.

Avoid:

- Large walls of text.
- Government-style navigation complexity.
- Unnecessary dropdown chains.
- Technical language.
- Decorative 3D effects.
- Animations that slow down filing.

## 10. Security and Trust Rules for the POC

Even though the backend is mocked:

- Never expose real API secrets in client-side code.
- Keep secrets server-side.
- Validate user input.
- Clearly distinguish mock/demo submission from real government submission.
- Do not claim that a mock application was actually sent to a government authority.

## 11. Coding Rules

- Prefer simple, readable components.
- Avoid premature abstraction.
- Keep functions small and explicit.
- Use typed data structures for the RTI workflow.
- Keep provider integrations behind small adapters/interfaces.
- Use environment variables for credentials.
- Do not hardcode secrets.
- Add useful error handling.
- Avoid unnecessary dependencies.
- Do not rewrite working code merely for stylistic reasons.
- Preserve existing project conventions unless they conflict with this document.

## 12. Agent/Workflow Rules

LangGraph should orchestrate a small, deterministic workflow rather than an uncontrolled swarm.

Preferred graph:

`START -> Understand Request -> Extract Location/Intent -> Resolve Authority -> Retrieve Rules -> Generate Draft -> Validate -> User Confirmation -> Mock Submit -> END`

Agent nodes may call tools. Tools should perform deterministic operations.

Every AI output that affects filing must be validated or reviewed before final submission.

## 13. Change Management

Before making a major architectural change:

1. Check `Plan.md`.
2. Check `Architecture.md`.
3. Check `Phase.md` for the current phase.
4. Check `Context.md` for completed work and decisions.
5. Change only what is necessary for the current phase.

After completing a phase, update `Context.md` with:

- What was completed.
- What is currently working.
- What data/models/providers are connected.
- Important implementation decisions.
- Known limitations.
- Environment variables/configuration needed.
- Remaining work.
- Exact next phase.

Do not force another agent to read the entire codebase to understand project state.

## 14. Definition of Done

A feature is not done because code exists.

It is done when:

- The user can reach it through the UI.
- The happy path works end-to-end.
- Errors do not crash the application.
- The feature is compatible with the project's current architecture.
- The feature is reflected in `Context.md`.

## 15. Priority Rule

When time is limited, prioritize in this order:

1. End-to-end citizen journey.
2. Automatic department/public-authority discovery.
3. Guided RTI drafting.
4. Clear review/confirmation.
5. Mock submission and tracking.
6. Multilingual/voice polish.
7. RAG expansion.
8. Secondary integrations.
9. Visual polish beyond what improves usability.

Never sacrifice the complete citizen journey to add another advanced technology feature.
