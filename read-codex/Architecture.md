# Architecture.md

## RTI Citizen Assistant - Frontend and Backend Architecture

## 1. Architecture Goal

Build a simple, reliable citizen-facing experience with clear separation between:

- UI.
- AI reasoning.
- Workflow orchestration.
- Structured authority data.
- Official-document retrieval.
- Mock submission/tracking.
- External providers.

## 2. High-Level Architecture

```text
                           CITIZEN
                              |
                    +---------+---------+
                    |                   |
                 VOICE                 TEXT
                    |                   |
                    +---------+---------+
                              |
                        Speech/Language
                              |
                              v
                    +--------------------+
                    |   Next.js Frontend |
                    +--------------------+
                              |
                              v
                    +--------------------+
                    |  Application API   |
                    +--------------------+
                              |
                              v
                    +--------------------+
                    |    LangGraph       |
                    | Workflow/State     |
                    +--------------------+
                              |
            +-----------------+------------------+
            |                 |                  |
            v                 v                  v
      Reasoning Model   Authority Tool      RAG Retrieval
            |                 |                  |
            |                 v                  v
            |             Supabase           Pinecone
            |                                    |
            +----------------+-------------------+
                             |
                             v
                     Draft + Validation
                             |
                             v
                      Citizen Review
                             |
                             v
                       Mock Submission
                             |
                       +-----+------+
                       |            |
                       v            v
                   Supabase      Tracking
```

## 3. Frontend Architecture

### 3.1 Recommended pages/routes

```text
/
/start
/request
/understand
/authority
/draft
/review
/submitted
/track
```

The exact route structure may be simplified if a single stateful flow is cleaner.

### 3.2 Landing page

Purpose: immediately communicate the product without government-style information overload.

Primary message:

> **What information do you need from the government?**

Primary actions:

- Speak.
- Type.

Secondary action:

- Guide me step-by-step.

### 3.3 Request screen

Allow:

- Voice input.
- Text input.
- Language selection.

Show recording state clearly.

After input, display the interpreted request before moving forward.

### 3.4 Understanding screen

Display extracted information in human-readable form:

- Issue.
- Location.
- Department/category.
- Information requested.
- Time period if known.

The user should be able to correct extracted information.

### 3.5 Authority screen

Display:

- Suggested department.
- Suggested public authority.
- Location/jurisdiction.
- Short explanation.
- Supporting official source(s) when available.

Actions:

- Confirm and continue.
- Change/correct.

### 3.6 Draft screen

Avoid a blank legal-style textbox as the primary experience.

Show a guided structure such as:

- What information is requested?
- What period?
- Which location/project/service?

Then generate the draft.

### 3.7 Review screen

Show a final pre-submission summary:

- Applicant details.
- State/jurisdiction.
- Department.
- Public authority.
- RTI draft.

Require explicit confirmation.

### 3.8 Submitted screen

Show:

- Success state.
- Mock application ID.
- Submission timestamp.
- Track application action.

### 3.9 Track screen

Use a simple timeline:

```text
Submitted -> Under Review -> Response
```

The mocked backend can return deterministic demo statuses.

## 4. Backend Architecture

### 4.1 Request processing API

A server-side API route or server action should receive the user request and invoke the LangGraph workflow.

Responsibilities:

- Input validation.
- Session/workflow state handling.
- Model invocation.
- Tool calls.
- Final structured result.

### 4.2 LangGraph state

Recommended state object:

```ts
interface RtiWorkflowState {
  sessionId: string;
  inputText?: string;
  inputLanguage?: string;
  issue?: string;
  state?: string;
  district?: string;
  category?: string;
  requestedInformation?: string[];
  timePeriod?: string;
  candidateDepartments?: string[];
  candidateAuthorities?: AuthorityCandidate[];
  selectedDepartment?: string;
  selectedAuthority?: string;
  retrievalContext?: RetrievedSource[];
  draft?: string;
  validationIssues?: string[];
  userConfirmedAuthority?: boolean;
  userConfirmedDraft?: boolean;
  applicationId?: string;
  status?: string;
}
```

Use the smallest state needed by the real workflow.

## 5. LangGraph Workflow

```text
START
  |
  v
UnderstandRequest
  |
  v
ExtractEntities
  |
  v
ResolveJurisdiction
  |
  v
FindAuthority
  |
  v
RetrieveRules
  |
  v
GenerateDraft
  |
  v
ValidateDraft
  |
  v
WAIT_FOR_USER_CONFIRMATION
  |
  v
MockSubmit
  |
  v
END
```

### Node details

#### UnderstandRequest

Turn free-form input into structured intent.

#### ExtractEntities

Extract location, topic, requested information, and time period.

#### ResolveJurisdiction

Normalize state/district/location where possible.

#### FindAuthority

Query Supabase using structured filters and aliases.

Do not rely on semantic generation alone.

#### RetrieveRules

Query Pinecone for the applicable RTI rules and official instructions.

Filter by metadata such as state/department when possible.

#### GenerateDraft

Create a concise, records/information-oriented request using the retrieved context.

#### ValidateDraft

Check:

- Required information is present.
- No obviously unsupported government claims are introduced.
- Draft fits the mocked form constraints.
- The draft is phrased as an information request where applicable.

#### User confirmation

Critical stop point. Do not automatically submit without user confirmation.

#### MockSubmit

Create a demo application record and return an application ID.

## 6. Authority Database

### Supabase tables

Suggested minimal schema:

```text
states
- id
- name

categories
- id
- name

public_authorities
- id
- state_id
- district
- category_id
- department_name
- authority_name
- aliases
- portal_name
- portal_url
- source_url
- verified_at
- active
```

For speed, the schema may be flattened into one table initially.

## 7. RAG Architecture

### Pinecone namespace/index

Store official documents and chunks with metadata.

Example metadata:

```json
{
  "state": "Maharashtra",
  "department": "Rural Development",
  "document_type": "official_instruction",
  "source_url": "https://example.gov.in/...",
  "language": "en",
  "verified_at": "YYYY-MM-DD"
}
```

### Retrieval pipeline

```text
User intent
   |
   v
Structured filters
   |
   v
Pinecone semantic retrieval
   |
   v
Top relevant official chunks
   |
   v
LLM prompt with citations/source metadata
```

The UI should be able to show the source title/URL for trust.

## 8. Voice Architecture

```text
Microphone
    |
    v
Sarvam STT
    |
    v
Normalized text
    |
    v
LangGraph workflow
    |
    v
Text response
    |
    v
Sarvam TTS (optional)
```

Voice services should be abstracted behind a provider interface so they can be swapped without changing workflow logic.

## 9. Model Architecture

Create a small model adapter:

```ts
interface ReasoningModel {
  generateStructuredIntent(input: string): Promise<StructuredIntent>;
  generateDraft(input: DraftContext): Promise<string>;
}
```

Potential providers/models for the project:

- Gemini 3.5 Flash-Lite.
- Gemini 3.1 Flash-Lite.
- Gemma 4 31B.
- Gemma 4 26B.

The implementation must verify actual provider support and credentials at runtime/configuration time.

Do not create multiple providers unless needed.

## 10. Mock Backend

Because this is a proof of concept, submission may be simulated.

Suggested application record:

```text
applications
- id
- session_id
- applicant_name
- applicant_email
- applicant_mobile
- state
- district
- department
- public_authority
- draft
- status
- created_at
```

The mock backend should behave consistently enough for a judge to submit and track an application.

## 11. Email Integration

Bravo may be used for optional email notifications.

The MVP does not depend on email delivery for the core filing journey.

## 12. Environment Variables

Expected configuration should be documented in `.env.example`.

Potential variables:

```text
GEMINI_API_KEY=
SARVAM_API_KEY=
PINECONE_API_KEY=
PINECONE_INDEX=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
BRAVO_API_KEY=
```

Only include variables for integrations actually used.

Never commit actual secrets.

## 13. Failure Handling

If AI fails:

- Preserve user input.
- Offer manual mode.
- Show a plain-language retry message.

If authority lookup fails:

- Show that a confident match could not be found.
- Allow manual selection from the available curated dataset.

If RAG returns no reliable result:

- Do not fabricate a rule.
- Continue only where safe and label the limitation.

## 14. Architecture Decision Rule

Optimize for a working, demonstrable citizen journey over architectural sophistication.

The judge should see the benefit of the system before hearing about LangGraph, Pinecone, Gemini, Sarvam, or Supabase.
