# Phase.md

## RTI Citizen Assistant - Development Phases

This document divides the project into sequential phases. Codex should complete the current phase before starting optional work from a later phase.

## Phase 0 - Repository and Context Setup

### Goal
Understand the existing project without broad refactoring.

### Tasks

- Inspect existing project structure.
- Identify existing framework and dependencies.
- Read `Agents.md`, `Plan.md`, `Architecture.md`, and `Context.md`.
- Confirm environment variable strategy.
- Confirm current build and dev commands.
- Establish a minimal test/demo account if needed.

### Exit criteria

- Project runs locally.
- Current architecture is understood.
- No unnecessary dependencies added.
- `Context.md` updated.

---

## Phase 1 - Citizen UX Skeleton

### Goal
Build the complete visual flow before deep AI integration.

### Tasks

Build the core screens:

1. Landing.
2. Speak/Type.
3. Understanding.
4. Authority suggestion.
5. Draft.
6. Review.
7. Submission.
8. Tracking.

### UX requirements

- Minimal visual hierarchy.
- Large primary actions.
- Clear progress.
- No department/public-authority dropdown maze.
- Preserve state between steps.

### Exit criteria

A mock user can click through the entire journey with local mock data.

Update `Context.md`.

---

## Phase 2 - Structured Authority Data

### Goal
Replace hardcoded UI choices with a structured authority lookup.

### Tasks

- Create minimal Supabase schema/table.
- Insert curated Maharashtra-focused department/public-authority data.
- Add state/district/category/keyword filters.
- Add source metadata.
- Implement a deterministic `findAuthority()` tool/service.

### Exit criteria

Given a structured issue/location, the application can return one or more authority candidates.

Update `Context.md`.

---

## Phase 3 - Reasoning Model Integration

### Goal
Convert natural-language citizen input into structured intent.

### Tasks

Implement model adapter.

Extract:

- Issue.
- Location.
- State.
- District.
- Category.
- Information requested.
- Time period.

Return structured JSON, not free-form prose.

### Model priority

Start with the simplest available selected Gemini model. Keep the adapter replaceable.

### Exit criteria

At least one realistic demo request is consistently converted into correct structured fields.

Update `Context.md`.
do git push.
---

## Phase 4 - RAG Integration

### Goal
Ground department/rule guidance in official documents.

### Tasks

Add a small Pinecone corpus containing:

- RTI rules.
- Official portal instructions.
- Maharashtra-specific instructions.
- Selected department/public-authority documents relevant to the demo.

Store source metadata.

Implement:

`retrieveOfficialContext()`

### Exit criteria

For a demo query, the system retrieves relevant official material and exposes source metadata.

Update `Context.md`.

---

## Phase 5 - LangGraph Workflow

### Goal
Connect the reasoning, authority lookup, RAG, drafting, and validation into one stateful workflow.

### Workflow

```text
START
 -> UnderstandRequest
 -> ExtractEntities
 -> ResolveJurisdiction
 -> FindAuthority
 -> RetrieveRules
 -> GenerateDraft
 -> ValidateDraft
 -> UserConfirmation
 -> MockSubmit
 -> END
```

### Exit criteria

The primary citizen journey executes through the graph without requiring manual backend intervention.

Update `Context.md`.

---

## Phase 6 - Guided RTI Drafting

### Goal
Make the blank RTI textbox unnecessary as the primary experience.

### Tasks

- Ask only necessary clarification questions.
- Generate an information/records-oriented request.
- Explain when a user's wording is vague or complaint-like.
- Allow editing.
- Validate before submission.

### Exit criteria

A user can start from a vague statement and reach a useful draft without needing to know RTI drafting conventions.

Update `Context.md`.

---

## Phase 7 - Voice and Multilingual Layer

### Goal
Add the accessibility layer after the core text journey works.

### Tasks

- Integrate Sarvam STT.
- Add language detection/selection where practical.
- Optionally add Sarvam TTS.
- Make voice an alternative to text, not a separate workflow.

### Exit criteria

Voice input reaches the same structured workflow as typed input.

Update `Context.md`.

---

## Phase 8 - Mock Submission and Tracking

### Goal
Give the judge a complete end state.

### Tasks

- Create application record.
- Generate application ID.
- Show success confirmation.
- Add tracking page/status timeline.

### Exit criteria

A judge can create an application and later retrieve its mocked status.

Update `Context.md`.

---

## Phase 9 - Reliability and Demo Hardening

### Goal
Make the experience safe to demo repeatedly.

### Tasks

- Add loading/error states.
- Preserve user input on failure.
- Add fallback manual authority selection.
- Remove dead ends.
- Test the exact demo path repeatedly.
- Verify deployment.

### Exit criteria

The primary demo can be repeated without developer intervention.

Update `Context.md`.

---

## Phase 10 - Submission Polish

### Goal
Prepare the actual hackathon submission.

### Tasks

- Verify public URL.
- Verify test credentials/path.
- Verify mobile/responsive browser experience.
- Prepare 2-minute video structure.
- Prepare 250-word summary.
- Confirm submission email/partner details.

The supplied transcript states the video has a maximum of two minutes, with roughly one minute using the project as a citizen and one minute explaining how it was built. fileciteturn0file0L7-L7

### Exit criteria

Project is publicly accessible and the exact judge journey works from a clean session.

Update `Context.md` with final submission state.
