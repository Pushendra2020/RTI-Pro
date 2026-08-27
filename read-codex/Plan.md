# Plan.md

## RTI Citizen Assistant - Hackathon Delivery Plan

## 1. Goal

Deliver a polished, browser-accessible proof of concept that makes RTI filing simpler by allowing citizens to explain what information they need without first knowing the correct government department or public authority.

## 2. Core Product Statement

> **Tell us what you need. We handle the government-side complexity.**

The product should transform:

`Citizen problem -> understood intent -> likely authority -> verified draft -> mock submission`

## 3. What the Hackathon Requires

According to the supplied hackathon transcript, the project should:

- Be a complete proof of concept.
- Use mocked data/backend/accounts where needed.
- Be publicly accessible and work in a browser.
- Provide a usable test path/credentials where needed.
- Focus evaluation on the consumer/citizen side.
- Prioritize ideas, interfaces, and interactions.
- Be useful for busy, frustrated citizens.
- Prefer distinctive but useful ideas over flashy effects.
- Submit a live link, a maximum two-minute demo/build video, a 250-word summary, and the required partner/email information.

Source: supplied Build What Moves India transcript. The transcript explicitly describes mocked backend/data/accounts, browser accessibility, consumer-side evaluation, and emphasis on ideas/interactions. 

## 4. Product Scope for This Submission

### Must deliver

1. Simple landing page.
2. Voice and/or text request input.
3. Natural-language request understanding.
4. Automatic department/public-authority suggestion.
5. Citizen confirmation of the suggested routing.
6. Guided RTI request generation.
7. Draft review and editing.
8. Mock submission.
9. Application ID.
10. Basic application tracking/status.
11. Public browser deployment.
12. A repeatable test/demo path.

### Strong additions if time allows

- Marathi/Hindi/English support.
- Sarvam speech-to-text/text-to-speech.
- Explanation of why the authority was selected.
- "I don't know the department" flow.
- AI correction of vague RTI questions.
- Basic email notification.

### Explicitly out of scope for the first submission

- Real government API submission.
- Nationwide authority coverage.
- Large-scale production infrastructure.
- Full admin dashboard.
- Complex authentication system.
- Large multi-agent swarm.
- Extensive analytics.
- Hundreds of state-specific document collections.
- Feature-phone/IVR production system.

## 5. Hero Citizen Journey

The demo should follow one realistic case.

Example:

> "Mere gaon ke road ke liye kitna paisa sanction hua tha aur contractor kaun tha?"

The system should:

1. Accept voice or text.
2. Extract the issue, location, and desired information.
3. Find a likely department/public authority using structured authority data and official retrieval context.
4. Explain the suggested result.
5. Ask the user to confirm.
6. Turn the request into a records/information-oriented RTI draft.
7. Let the user review it.
8. Submit to the mocked backend.
9. Return an application ID.
10. Show status/tracking.

## 6. RAG Scope

For the first submission, RAG should contain only high-value official material:

### General/procedural

- RTI Act/rules used by the project.
- Official RTI filing instructions.
- Official portal FAQs/instructions.

### Authority-oriented

- Official documents/pages explaining what selected departments/authorities handle.
- Official department/public-authority instructions relevant to the demo categories.

Do not attempt to build a complete India-wide legal corpus in this sprint.

## 7. Structured Authority Data

Use a relational database such as Supabase for the authority directory.

Minimum fields:

- id
- state
- district
- category
- department
- public_authority
- keywords/aliases
- portal
- source_url
- active/verified flag

For the first demo, a small, curated Maharashtra-focused dataset is preferable to an incomplete national dataset.

## 8. Why RAG and Database Are Separate

Use RAG for contextual knowledge:

`Rules + instructions + official explanatory documents`

Use the database for deterministic lookup:

`State + district + category + department + authority + portal`

The model interprets the citizen request. It should not be the sole source of truth for government hierarchy.

## 9. AI Responsibilities

### Reasoning model

- Intent extraction.
- Structured entity extraction.
- Clarification questions.
- Draft generation.
- Rule-aware explanations.
- Candidate reasoning before database/tool lookup.

### LangGraph

- Orchestrates the filing workflow.
- Calls tools in an explicit sequence.
- Maintains state.
- Stops for citizen confirmation before critical actions.

### Sarvam

- Speech-to-text and optionally text-to-speech.
- Do not use the speech provider as the legal/reasoning authority.

## 10. Preferred Stack

- Next.js / React / Tailwind CSS.
- Vercel.
- LangGraph.
- Pinecone.
- Supabase preferred for structured data.
- Sarvam for voice.
- Bravo for email if useful.
- Gemini/Gemma model selected after checking actual API availability and quota.

## 11. Demo Story

The first minute of the hackathon video should show:

1. Current-style problem: citizen does not know department/authority.
2. Citizen states the problem naturally.
3. System finds the likely authority.
4. Citizen confirms.
5. System generates a useful RTI draft.
6. Citizen submits.
7. Application ID/tracking appears.

The second minute should explain the core technical decisions and why the interaction is different.

## 12. Differentiation

Do not market the project as only an "AI voice RTI portal."

The differentiator is:

> **Intent-first RTI filing with automatic government-side authority discovery.**

Voice is an input mechanism.

The distinctive interaction is:

> **"I do not know which department handles this." -> "Tell us what happened."**

## 13. Success Criteria

A judge who has never used the product should be able to understand the product in under one minute and complete the core demo flow without needing to understand government terminology.

The project succeeds if the experience demonstrates a clear reduction in cognitive load compared with the existing portal.
