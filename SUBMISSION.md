# Saathi RTI Citizen Assistant — Submission Guide

## Public judge path

Open [https://rti-sathi.pushendra.xyz](https://rti-sathi.pushendra.xyz) and choose **Start your request**.

Use this request:

> Mere gaon ke road ke liye kitna paisa sanction hua tha aur contractor kaun tha?

Then:

1. Continue through the understood request and authority suggestion.
2. Confirm the suggested route, review the records-oriented draft, and edit if needed.
3. Enter any name, email, and 10-digit mobile number; accept the demo confirmation.
4. Create the demo application ID.
5. Choose **Track this application**, or use **Track an application** in the header and enter the ID.

No account or test credentials are required. This is a mock submission; nothing is sent to a government portal.

## Durable demo storage

Apply `supabase/migrations/20260828000000_create_applications.sql` and set `SUPABASE_SERVICE_ROLE_KEY` in Vercel. The service-role key must remain server-only. Without it, the journey deliberately falls back to browser-local demo storage and labels that limitation.

## Two-minute video outline

- 0:00–0:15 — Citizen does not know the department.
- 0:15–0:45 — Speak or type the road-work request.
- 0:45–1:10 — Saathi explains the intent and finds the likely authority.
- 1:10–1:30 — Citizen confirms, edits the RTI draft, and reviews it.
- 1:30–1:45 — Mock application ID and tracking timeline.
- 1:45–2:00 — Explain intent-first routing, LangGraph, Supabase, Pinecone, Gemini, and Sarvam.

## 250-word summary

Saathi is an intent-first RTI citizen assistant for people who know what happened but do not know which government department handled it. Instead of beginning with department and authority dropdowns, it lets a citizen describe the issue naturally by typing or speaking in English, Hindi, Marathi, or a mix.

Saathi converts that story into structured intent: topic, location, jurisdiction, requested records, and time period. It uses deterministic authority data to suggest a likely public authority, shows why the route matches, and surfaces official guidance from a Pinecone corpus. The citizen remains in control: they can clarify the request, choose another curated authority, edit the records-oriented RTI draft, and explicitly confirm before a mock submission.

The workflow is orchestrated with LangGraph inside a Vercel-compatible Next.js application. Gemini is used through a replaceable reasoning adapter, Microsoft multilingual-e5-large powers Pinecone integrated retrieval, Supabase stores structured authority data and optional durable demo applications, and Sarvam provides voice transcription. Local fallbacks keep the core experience understandable when optional providers are unavailable, while every limitation is shown rather than hidden.

The result is a focused Maharashtra-first proof of concept that reduces cognitive load without pretending to be a government filing system. The distinctive interaction is simple: “Tell us what happened; we will help find who holds the records.”
