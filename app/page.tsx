"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import type { AuthorityCandidate } from "@/lib/authority/types";
import { createRtiDraft, validateRtiDraft } from "@/lib/workflow/draft";
import { createLocalIntent } from "@/lib/reasoning/local";
import type { StructuredIntent } from "@/lib/reasoning/types";
import type { OfficialContextResult } from "@/lib/rag/types";
import { isSpeechToTextResult } from "@/lib/speech/types";
import { MAX_SPEECH_RECORDING_SECONDS, speechAudioMetadata } from "@/lib/speech/audio";
import { isWorkflowResponse } from "@/lib/workflow/types";
import { isApplicationApiResponse } from "@/lib/applications/types";
import type { ApplicationRecord } from "@/lib/applications/types";
import type { LocationResolution } from "@/lib/location/types";
import { isValidEmailAddress, isValidMobileNumber } from "@/lib/applications/validation";

type Stage =
  | "home"
  | "request"
  | "understand"
  | "authority"
  | "draft"
  | "review"
  | "submitted"
  | "track";

type Language = "English" | "हिन्दी" | "मराठी";
type VoiceState = "idle" | "listening" | "captured";

type Intent = StructuredIntent;

const demoRequest =
  "Mere gaon ke road ke liye kitna paisa sanction hua tha aur contractor kaun tha?";

const stageLabels: Array<{ id: Exclude<Stage, "home" | "track">; label: string }> = [
  { id: "request", label: "Your request" },
  { id: "understand", label: "We understood" },
  { id: "authority", label: "Right authority" },
  { id: "draft", label: "Draft" },
  { id: "review", label: "Review" },
];

function subscribeToStoredApplication(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function readStoredApplication(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("rti-demo-application") ?? "";
}

function parseApplication(value: string): ApplicationRecord | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null) return null;
    if (!("id" in parsed) || !("createdAt" in parsed)) return null;
    if (typeof parsed.id !== "string" || typeof parsed.createdAt !== "string") return null;
    const record = parsed as Record<string, unknown>;
    return {
      id: parsed.id,
      createdAt: parsed.createdAt,
      applicantName: typeof record.applicantName === "string" ? record.applicantName : "",
      applicantEmail: typeof record.applicantEmail === "string" ? record.applicantEmail : "",
      applicantMobile: typeof record.applicantMobile === "string" ? record.applicantMobile : "",
      state: typeof record.state === "string" ? record.state : "Not specified",
      district: typeof record.district === "string" ? record.district : "Not specified",
      department: typeof record.department === "string" ? record.department : "Not specified",
      publicAuthority: typeof record.publicAuthority === "string" ? record.publicAuthority : "Not specified",
      draft: typeof record.draft === "string" ? record.draft : "",
      status: record.status === "under_review" || record.status === "response_due" ? record.status : "submitted",
    };
  } catch {
    return null;
  }
}

export default function Home() {
  const [stage, setStage] = useState<Stage>("home");
  const [requestText, setRequestText] = useState("");
  const [language, setLanguage] = useState<Language>("English");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [draft, setDraft] = useState("");
  const [applicantName, setApplicantName] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [applicantMobile, setApplicantMobile] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [application, setApplication] = useState<ApplicationRecord | null>(null);
  const [trackingId, setTrackingId] = useState("");
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [trackingNotice, setTrackingNotice] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [authority, setAuthority] = useState<AuthorityCandidate | null>(null);
  const [authorityCandidates, setAuthorityCandidates] = useState<AuthorityCandidate[]>([]);
  const [isUnderstanding, setIsUnderstanding] = useState(false);
  const [reasoningNotice, setReasoningNotice] = useState<string | null>(null);
  const [lookupNotice, setLookupNotice] = useState<string | null>(null);
  const [officialContext, setOfficialContext] = useState<OfficialContextResult | null>(null);
  const [ragNotice, setRagNotice] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [clarificationQuestions, setClarificationQuestions] = useState<string[]>([]);
  const [locationResolution, setLocationResolution] = useState<LocationResolution | null>(null);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const storedApplication = parseApplication(useSyncExternalStore(subscribeToStoredApplication, readStoredApplication, () => ""));
  const visibleApplication = application ?? storedApplication;
  const voiceRecorder = useRef<MediaRecorder | null>(null);
  const voiceStream = useRef<MediaStream | null>(null);
  const voiceChunks = useRef<Blob[]>([]);
  const voiceStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (voiceRecorder.current?.state !== "inactive") voiceRecorder.current?.stop();
      voiceStream.current?.getTracks().forEach((track) => track.stop());
      if (voiceStopTimer.current) clearTimeout(voiceStopTimer.current);
    };
  }, []);

  const startRequest = () => setStage("request");

  const openTracking = () => {
    const stored = application ?? storedApplication;
    setTrackingId(stored?.id ?? "");
    setTrackingError(null);
    setStage("track");
  };

  const useSampleRequest = () => {
    setRequestText(demoRequest);
    setVoiceState("captured");
    setVoiceNotice(null);
    setStage("request");
  };

  const captureVoice = async () => {
    if (voiceState === "listening") {
      voiceRecorder.current?.stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setVoiceNotice("This browser does not support microphone recording. You can type your request instead.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg", "audio/mp4"]
        .find((candidate) => MediaRecorder.isTypeSupported(candidate));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      voiceChunks.current = [];
      voiceStream.current = stream;
      voiceRecorder.current = recorder;
      setVoiceNotice("Speak naturally, then press stop. Recording is limited to 25 seconds.");
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) voiceChunks.current.push(event.data);
      };
      recorder.onerror = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (voiceStopTimer.current) clearTimeout(voiceStopTimer.current);
        voiceStopTimer.current = null;
        setVoiceState("idle");
        setVoiceNotice("The microphone recording failed. You can type your request instead.");
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        voiceRecorder.current = null;
        voiceStream.current = null;
        if (voiceStopTimer.current) clearTimeout(voiceStopTimer.current);
        voiceStopTimer.current = null;
        const audio = new Blob(voiceChunks.current, { type: recorder.mimeType || "audio/webm" });
        voiceChunks.current = [];
        if (audio.size === 0) {
          setVoiceState("idle");
          setVoiceNotice("No speech was recorded. Please try again.");
          return;
        }
        setVoiceState("captured");
        setVoiceNotice("Transcribing with Sarvam...");
        const formData = new FormData();
        const audioMetadata = speechAudioMetadata(audio.type);
        formData.append("file", audio, "saathi-voice." + audioMetadata.extension);
        formData.append("language", language);
        void fetch("/api/speech-to-text", { method: "POST", body: formData })
          .then(async (response) => {
            const payload: unknown = await response.json();
            if (!response.ok) {
              const message = typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
                ? payload.error
                : "Speech transcription failed.";
              throw new Error(message);
            }
            if (!isSpeechToTextResult(payload)) {
              throw new Error("Sarvam returned an invalid transcription response.");
            }
            setRequestText((current) => current.trim() ? current.trim() + " " + payload.transcript : payload.transcript);
            setVoiceNotice(payload.languageCode ? "Voice transcribed (" + payload.languageCode + "). You can edit it before continuing." : "Voice transcribed. You can edit it before continuing.");
          })
          .catch((error: unknown) => {
            setVoiceState("idle");
            setVoiceNotice(error instanceof Error ? error.message + " Nothing was added to your request." : "Sarvam could not transcribe this recording. Nothing was added to your request.");
          });
      };
      recorder.start();
      voiceStopTimer.current = setTimeout(() => {
        if (recorder.state === "recording") {
          setVoiceNotice("25-second limit reached. Transcribing with Sarvam...");
          recorder.stop();
        }
      }, MAX_SPEECH_RECORDING_SECONDS * 1000);
      setVoiceState("listening");
    } catch {
      setVoiceState("idle");
      setVoiceNotice("Microphone access was not available. Please allow access or type your request.");
    }
  };

  const runWorkflow = async () => {
    const text = requestText.trim();
    if (!text || isUnderstanding) return;

    setIsUnderstanding(true);
    setRequestError(null);
    setReasoningNotice(null);
    setAuthority(null);
    setAuthorityCandidates([]);
    setLookupNotice(null);
    setOfficialContext(null);
    setRagNotice(null);
    setDraft("");
    setValidationIssues([]);
    setClarificationQuestions([]);
    setLocationResolution(null);
    setLocationConfirmed(false);

    let nextStage: Stage = "understand";
    try {
      const response = await fetch("/api/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
      });
      if (!response.ok) throw new Error("RTI workflow failed");
      const payload: unknown = await response.json();
      if (!isWorkflowResponse(payload)) throw new Error("RTI workflow response was invalid");
      setIntent(payload.intent);
      setAuthority(payload.selectedAuthority);
      setAuthorityCandidates(payload.authorityCandidates);
      setOfficialContext(payload.officialContext);
      setDraft(payload.draft);
      setValidationIssues(payload.validationIssues);
      setClarificationQuestions(payload.clarificationQuestions);
      setLocationResolution(payload.locationResolution);
      setLocationConfirmed(payload.locationResolution?.status !== "resolved");
      setReasoningNotice(payload.reasoningNotice);
      setLookupNotice(payload.authorityNotice);
      setRagNotice(payload.ragNotice);
    } catch {
      setIntent(createLocalIntent(text));
      setRequestError("The workflow service was unavailable. Your request is still here; try again or continue by typing.");
      setValidationIssues([]);
      setClarificationQuestions([]);
      nextStage = "request";
    } finally {
      setIsUnderstanding(false);
      setStage(nextStage);
    }
  };

  const generateDraft = () => {
    if (!intent || !authority) {
      setLookupNotice("Choose a public authority before creating the draft.");
      return;
    }
    setDraft(createRtiDraft(intent, authority));
    setStage("draft");
  };

  const reviewDraft = () => {
    if (!intent) return;
    const issues = validateRtiDraft(intent, authority, draft);
    setValidationIssues(issues);
    if (issues.length > 0) return;
    setConfirmed(false);
    setStage("review");
  };

  const submitApplication = async () => {
    if (!intent || !confirmed || isSubmitting) return;
    setIsSubmitting(true);
    setSubmissionError(null);
    setTrackingNotice(null);
    try {
      const response = await fetch("/api/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: requestText, language, confirmed: true }),
      });
      if (!response.ok) throw new Error("Mock submission failed");
      const payload: unknown = await response.json();
      if (!isWorkflowResponse(payload) || payload.status !== "submitted" || !payload.applicationId) {
        throw new Error("Mock submission response was invalid");
      }
      const applicationResponse = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: payload.applicationId,
          sessionId: payload.sessionId,
          applicantName,
          applicantEmail,
          applicantMobile,
          state: intent.state,
          district: intent.district,
          department: authority?.department ?? "Not specified",
          publicAuthority: authority?.publicAuthority ?? "Not specified",
          draft,
        }),
      });
      const applicationPayload: unknown = await applicationResponse.json();
      if (applicationResponse.ok && isApplicationApiResponse(applicationPayload)) {
        setApplication(applicationPayload.application);
        setTrackingNotice(null);
        window.localStorage.setItem("rti-demo-application", JSON.stringify(applicationPayload.application));
      } else if (applicationResponse.status === 503) {
        const localRecord: ApplicationRecord = {
          id: payload.applicationId,
          createdAt: new Date().toISOString(),
          applicantName,
          applicantEmail,
          applicantMobile,
          state: intent.state,
          district: intent.district,
          department: authority?.department ?? "Not specified",
          publicAuthority: authority?.publicAuthority ?? "Not specified",
          draft,
          status: "submitted",
        };
        setApplication(localRecord);
        window.localStorage.setItem("rti-demo-application", JSON.stringify(localRecord));
        setTrackingNotice("Supabase storage is not configured, so this demo record is saved in this browser only.");
      } else {
        const message = typeof applicationPayload === "object" && applicationPayload !== null && "error" in applicationPayload && typeof applicationPayload.error === "string"
          ? applicationPayload.error
          : "The application record could not be stored.";
        throw new Error(message);
      }
      setStage("submitted");
    } catch (error: unknown) {
      setSubmissionError(error instanceof Error ? error.message : "The confirmation could not reach the workflow. Nothing was submitted; please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const trackApplication = async () => {
    const id = trackingId.trim();
    if (!id || isTracking) return;
    setIsTracking(true);
    setTrackingError(null);
    setTrackingNotice(null);
    try {
      const response = await fetch(`/api/applications/${encodeURIComponent(id)}`);
      const payload: unknown = await response.json();
      if (response.ok && isApplicationApiResponse(payload)) {
        setApplication(payload.application);
        window.localStorage.setItem("rti-demo-application", JSON.stringify(payload.application));
        setTrackingNotice("Status retrieved from the shared demo application store.");
        return;
      }
      const localRecord = parseApplication(readStoredApplication());
      if (response.status === 503 && localRecord?.id === id) {
        setApplication(localRecord);
        setTrackingNotice("Shared storage is not configured, so this status came from this browser's saved demo record.");
        return;
      }
      throw new Error(response.status === 404 ? "No application was found with that ID." : "Application tracking is temporarily unavailable.");
    } catch (error: unknown) {
      setTrackingError(error instanceof Error ? error.message : "Application tracking is temporarily unavailable.");
    } finally {
      setIsTracking(false);
    }
  };

  const resetJourney = () => {
    setStage("request");
    setRequestText("");
    setVoiceState("idle");
    setVoiceNotice(null);
    setIntent(null);
    setDraft("");
    setValidationIssues([]);
    setClarificationQuestions([]);
    setAuthority(null);
    setAuthorityCandidates([]);
    setApplicantName("");
    setApplicantEmail("");
    setApplicantMobile("");
    setConfirmed(false);
    setSubmissionError(null);
    setRequestError(null);
    setTrackingNotice(null);
    setReasoningNotice(null);
    setLookupNotice(null);
    setOfficialContext(null);
    setRagNotice(null);
    setLocationResolution(null);
    setLocationConfirmed(false);
  };

  const goBack = () => {
    const previousStage: Partial<Record<Stage, Stage>> = {
      request: "home",
      understand: "request",
      authority: "understand",
      draft: "authority",
      review: "draft",
      submitted: "review",
    };
    const previous = previousStage[stage];
    if (previous) setStage(previous);
  };

  return (
    <div className="min-h-[100dvh]" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      {/* ── Header ── */}
      <header style={{
        borderBottom: "1px solid var(--border)",
        background: "rgba(244, 246, 242, 0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}>
        <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between px-5 py-3.5 sm:px-8 lg:px-10">
          <button
            className="group flex items-center gap-3 text-left"
            onClick={() => setStage("home")}
            aria-label="Go to Saathi home"
          >
            <span style={{
              display: "flex",
              height: "36px",
              width: "36px",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--green-dark)",
              color: "#f7f5ef",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.14em",
              borderRadius: "7px",
            }}>साथी</span>
            <span>
              <span style={{ display: "block", fontSize: "13px", fontWeight: 700, letterSpacing: "0.20em", color: "var(--green-dark)" }}>SAATHI</span>
              <span className="hidden sm:block" style={{ fontSize: "10.5px", color: "var(--text-muted)" }}>RTI citizen assistant</span>
            </span>
          </button>

          <div className="flex items-center gap-3 sm:gap-5">
            {/* Language switcher */}
            <div
              className="hidden sm:flex items-center gap-1 p-1"
              style={{ border: "1.5px solid var(--border)", borderRadius: "100px", background: "rgba(255,255,255,0.6)" }}
              aria-label="Choose language"
            >
              {(["English", "हिन्दी", "मराठी"] as Language[]).map((option) => (
                <button
                  key={option}
                  style={{
                    borderRadius: "100px",
                    padding: "4px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    transition: "all 150ms ease",
                    background: language === option ? "var(--green-dark)" : "transparent",
                    color: language === option ? "white" : "var(--text-muted)",
                    border: "none",
                  }}
                  onClick={() => setLanguage(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <button
              className="text-button"
              onClick={openTracking}
              style={{ fontSize: "13px" }}
            >
              Track an application
            </button>
          </div>
        </div>
      </header>

      {/* ── Progress bar ── */}
      {stage !== "home" && stage !== "submitted" && stage !== "track" ? (
        <div style={{ borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.55)" }}>
          <div className="mx-auto flex w-full max-w-[1320px] items-center gap-1.5 overflow-x-auto px-5 py-3 sm:px-8 lg:px-10">
            {stageLabels.map((item, index) => {
              const currentIndex = stageLabels.findIndex((current) => current.id === stage);
              const isComplete = index < currentIndex;
              const isCurrent = item.id === stage;
              return (
                <div key={item.id} className="flex min-w-max items-center gap-1.5 text-xs">
                  <span style={{
                    display: "flex",
                    height: "22px",
                    width: "22px",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                    fontSize: "10px",
                    fontWeight: 700,
                    border: isCurrent ? "none" : isComplete ? "none" : "1.5px solid var(--border)",
                    background: isCurrent ? "var(--accent)" : isComplete ? "var(--green-dark)" : "transparent",
                    color: isCurrent || isComplete ? "white" : "var(--text-faint)",
                    transition: "all 200ms ease",
                  }}>
                    {isComplete ? "✓" : index + 1}
                  </span>
                  <span style={{
                    fontWeight: isCurrent ? 600 : 400,
                    color: isCurrent ? "var(--foreground)" : "var(--text-faint)",
                  }}>
                    {item.label}
                  </span>
                  {index < stageLabels.length - 1 ? (
                    <span style={{ marginLeft: "4px", marginRight: "4px", color: "var(--border)", fontWeight: 300 }}>—</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ── Main content ── */}
      <main className="mx-auto w-full max-w-[1320px] px-5 pb-20 pt-10 sm:px-8 sm:pt-14 lg:px-10 lg:pt-16">
        {stage === "home" ? <HomeStage onStart={startRequest} onSample={useSampleRequest} /> : null}
        {stage === "request" ? (
          <RequestStage
            requestText={requestText}
            language={language}
            voiceState={voiceState}
            voiceNotice={voiceNotice}
            requestError={requestError}
            isUnderstanding={isUnderstanding}
            onChange={(event) => setRequestText(event.target.value)}
            onVoice={captureVoice}
            onSample={useSampleRequest}
            onContinue={runWorkflow}
            onBack={goBack}
          />
        ) : null}
        {stage === "understand" && intent ? (
          <>
            <LocationResolutionCard
              resolution={locationResolution}
              confirmed={locationConfirmed}
              onConfirm={() => setLocationConfirmed(true)}
            />
            <UnderstandStage
              intent={intent}
              notice={reasoningNotice}
              clarificationQuestions={clarificationQuestions}
              onBack={goBack}
              onContinue={() =>
                clarificationQuestions.length
                  ? setStage("request")
                  : locationResolution?.status === "resolved" && !locationConfirmed
                    ? setLookupNotice("Please confirm the identified location before continuing.")
                    : locationResolution?.status === "resolved"
                      ? setStage("authority")
                      : setStage("request")
              }
              onEdit={() => setStage("request")}
            />
          </>
        ) : null}
        {stage === "authority" && intent
          ? authority
            ? <AuthorityStage intent={intent} authority={authority} candidates={authorityCandidates} lookupNotice={lookupNotice} officialContext={officialContext} ragNotice={ragNotice} onSelect={setAuthority} onBack={goBack} onContinue={generateDraft} />
            : <AuthorityEmptyStage candidates={authorityCandidates} lookupNotice={lookupNotice} onSelect={setAuthority} onBack={goBack} />
          : null}
        {stage === "draft" ? (
          <DraftStage
            draft={draft}
            validationIssues={validationIssues}
            onChange={(event) => setDraft(event.target.value)}
            onBack={goBack}
            onContinue={reviewDraft}
          />
        ) : null}
        {stage === "review" && intent ? (
          <ReviewStage
            intent={intent}
            authority={authority}
            draft={draft}
            applicantName={applicantName}
            applicantEmail={applicantEmail}
            applicantMobile={applicantMobile}
            confirmed={confirmed}
            isSubmitting={isSubmitting}
            submissionError={submissionError}
            onNameChange={(event) => setApplicantName(event.target.value)}
            onEmailChange={(event) => setApplicantEmail(event.target.value)}
            onMobileChange={(event) => setApplicantMobile(event.target.value)}
            onConfirmedChange={setConfirmed}
            onBack={goBack}
            onSubmit={() => void submitApplication()}
          />
        ) : null}
        {stage === "submitted" ? (
          <SubmittedStage application={visibleApplication} notice={trackingNotice} onTrack={openTracking} onStartOver={resetJourney} />
        ) : null}
        {stage === "track" ? (
          <TrackStage
            application={visibleApplication}
            trackingId={trackingId}
            trackingError={trackingError}
            trackingNotice={trackingNotice}
            isTracking={isTracking}
            onIdChange={setTrackingId}
            onLookup={() => void trackApplication()}
            onStart={startRequest}
          />
        ) : null}
      </main>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid var(--border)" }}>
        <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-2 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>Built for citizens who know the problem, not the department.</p>
          <p style={{ fontSize: "12px", color: "var(--text-faint)" }}>All submissions in this demo are simulated.</p>
        </div>
      </footer>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   HOME
══════════════════════════════════════════════════════════ */

function HomeStage({ onStart, onSample }: { onStart: () => void; onSample: () => void }) {
  return (
    <section className="animate-fade-up grid gap-12 lg:grid-cols-[minmax(0,1.06fr)_minmax(420px,0.94fr)] lg:items-center lg:gap-20">
      {/* Left: hero copy */}
      <div className="max-w-[680px]">
        <p style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--accent)",
          marginBottom: "24px",
        }}>
          <span style={{ height: "7px", width: "7px", background: "var(--accent)", borderRadius: "50%", display: "inline-block" }} />
          Maharashtra pilot
        </p>

        <h1 style={{
          fontSize: "clamp(3.2rem, 7.5vw, 7rem)",
          fontWeight: 700,
          lineHeight: 0.92,
          letterSpacing: "-0.05em",
          color: "var(--green-dark)",
          marginBottom: "32px",
        }}>
          Tell us what happened.
          <span style={{ display: "block", color: "var(--accent)" }}>We will find the answer.</span>
        </h1>

        <p style={{ fontSize: "18px", lineHeight: "1.75", color: "#4a5c52", maxWidth: "560px" }}>
          You should not have to know which government department handles your issue.
          Describe what you need, in your own words.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button className="primary-button" onClick={onStart} style={{ minWidth: "200px" }}>
            Start your request <span aria-hidden="true">→</span>
          </button>
          <Link className="secondary-button" href="/rti/manual">
            File manually <span aria-hidden="true">→</span>
          </Link>
          <button className="text-button" onClick={onSample}>
            Try the road-work example
          </button>
        </div>

        {/* Steps */}
        <div style={{
          marginTop: "48px",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
          borderTop: "1px solid var(--border)",
          paddingTop: "24px",
          maxWidth: "560px",
        }}>
          {[
            { num: "01", label: "Say what you need" },
            { num: "02", label: "Confirm the route" },
            { num: "03", label: "Review before filing" },
          ].map(({ num, label }) => (
            <div key={num}>
              <strong style={{ display: "block", fontSize: "22px", fontWeight: 700, color: "var(--green-dark)", lineHeight: 1 }}>{num}</strong>
              <span style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5, display: "block", marginTop: "6px" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: preview card */}
      <div style={{ position: "relative", paddingLeft: "0" }}>
        <div style={{
          position: "absolute",
          left: "-1px",
          top: "24px",
          width: "3px",
          height: "72%",
          background: "linear-gradient(to bottom, var(--accent), transparent)",
          borderRadius: "2px",
          display: "none",
        }} className="lg:block" />

        <div className="request-card">
          <div style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "24px",
            borderBottom: "1px solid var(--border)",
            paddingBottom: "20px",
            marginBottom: "24px",
          }}>
            <div>
              <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)" }}>The simpler route</p>
              <h2 style={{ marginTop: "8px", fontSize: "20px", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--green-dark)" }}>Start with your story</h2>
            </div>
            <span style={{
              border: "1.5px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "3px 9px",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              whiteSpace: "nowrap",
            }}>01 / 05</span>
          </div>

          <p style={{ fontSize: "14px", lineHeight: "1.75", color: "#4a5c52", fontStyle: "italic" }}>
            &ldquo;Mere gaon ke road ke liye kitna paisa sanction hua tha aur contractor kaun tha?&rdquo;
          </p>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            borderTop: "1px solid var(--border)",
            marginTop: "20px",
            paddingTop: "18px",
          }}>
            <span style={{
              display: "flex",
              height: "36px",
              width: "36px",
              flexShrink: 0,
              alignItems: "center",
              justifyContent: "center",
              background: "var(--accent)",
              color: "white",
              fontSize: "16px",
              borderRadius: "var(--radius-sm)",
            }}>→</span>
            <p style={{ fontSize: "12px", lineHeight: "1.6", color: "var(--text-muted)" }}>
              We identify the topic, location and likely public authority for you.
            </p>
          </div>

          <div style={{
            borderTop: "1px solid var(--border)",
            marginTop: "18px",
            paddingTop: "14px",
            fontSize: "11.5px",
            color: "var(--text-faint)",
          }}>
            No department dropdowns. No government jargon.
          </div>
        </div>

        <div style={{
          marginTop: "16px",
          borderLeft: "3px solid var(--accent)",
          paddingLeft: "14px",
          fontSize: "12px",
          lineHeight: "1.65",
          color: "var(--text-muted)",
          maxWidth: "300px",
          marginLeft: "auto",
        }}>
          A safer way to ask for records, approvals, payments and decisions.
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════
   REQUEST
══════════════════════════════════════════════════════════ */

function RequestStage({
  requestText, language, voiceState, voiceNotice, requestError, isUnderstanding,
  onChange, onVoice, onSample, onContinue, onBack,
}: {
  requestText: string; language: Language; voiceState: VoiceState; voiceNotice: string | null;
  requestError: string | null; isUnderstanding: boolean;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onVoice: () => void | Promise<void>;
  onSample: () => void;
  onContinue: () => void | Promise<void>;
  onBack: () => void;
}) {
  return (
    <FlowShell eyebrow="Step 1" title="What information do you need?" description="Talk naturally in English, Hindi, Marathi, or a mix. We will turn your words into a clear RTI request." onBack={onBack}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="request" style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>Your request</label>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", background: "rgba(255,255,255,0.7)", padding: "3px 10px", borderRadius: "100px", border: "1px solid var(--border)" }}>{language}</span>
          </div>
          <textarea
            id="request"
            value={requestText}
            onChange={onChange}
            placeholder="For example: I want to know how much was spent on the road near my village, and who was the contractor..."
            className="field mt-3"
            style={{ minHeight: "260px", resize: "none", lineHeight: "1.7" }}
          />
          {requestError ? (
            <div role="alert" style={{
              marginTop: "12px",
              borderLeft: "3px solid #c0442a",
              paddingLeft: "12px",
              paddingTop: "8px",
              paddingBottom: "8px",
              background: "#fff4f2",
              borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
            }}>
              <p style={{ fontSize: "12.5px", lineHeight: "1.6", color: "#a33020" }}>{requestError}</p>
            </div>
          ) : null}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              className={`voice-button ${voiceState === "listening" ? "voice-button-active" : ""}`}
              onClick={() => void onVoice()}
              aria-live="polite"
            >
              <span className="voice-bars" aria-hidden="true"><i /><i /><i /><i /></span>
              {voiceState === "listening" ? "Stop & transcribe" : voiceState === "captured" ? "Voice transcribed ✓" : "Speak instead"}
            </button>
            <button className="text-button" onClick={onSample}>Use the road-work example</button>
          </div>

          {voiceNotice ? (
            <p role="status" style={{ marginTop: "10px", fontSize: "12px", lineHeight: "1.6", color: "var(--text-muted)" }}>{voiceNotice}</p>
          ) : null}

          <div style={{
            marginTop: "28px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            borderTop: "1px solid var(--border)",
            paddingTop: "20px",
          }} className="sm:flex-row sm:items-center sm:justify-between">
            <p style={{ maxWidth: "320px", fontSize: "12px", lineHeight: "1.65", color: "var(--text-faint)" }}>
              Your words stay editable. We only send them to this app&apos;s reasoning route when you continue.
            </p>
            <button
              className="primary-button"
              onClick={() => void onContinue()}
              disabled={!requestText.trim() || isUnderstanding}
              style={{ minWidth: "240px" }}
            >
              {isUnderstanding ? (
                <>
                  <span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%", animation: "spin 700ms linear infinite" }} />
                  Understanding…
                </>
              ) : (
                <>Help me find the right authority <span aria-hidden="true">→</span></>
              )}
            </button>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>

        {/* Sidebar tip */}
        <aside style={{
          borderLeft: "3px solid var(--accent)",
          paddingLeft: "20px",
        }}>
          <p style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--accent)" }}>Good to know</p>
          <p style={{ marginTop: "14px", fontSize: "13.5px", lineHeight: "1.75", color: "#4a5c52" }}>
            You do not need to name a department. Tell us about the road, service, payment or decision you want records about.
          </p>
          <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--foreground)", marginBottom: "4px" }}>Ask for records</p>
              <p style={{ fontSize: "12px", lineHeight: "1.65", color: "var(--text-muted)" }}>Budgets, approvals, tenders, bills and status updates.</p>
            </div>
            <div>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--foreground)", marginBottom: "4px" }}>Stay in control</p>
              <p style={{ fontSize: "12px", lineHeight: "1.65", color: "var(--text-muted)" }}>We show you the route before creating a draft.</p>
            </div>
          </div>
        </aside>
      </div>
    </FlowShell>
  );
}

/* ══════════════════════════════════════════════════════════
   LOCATION CARD
══════════════════════════════════════════════════════════ */

function LocationResolutionCard({ resolution, confirmed, onConfirm }: { resolution: LocationResolution | null; confirmed: boolean; onConfirm: () => void }) {
  if (!resolution || resolution.status === "not_found") return null;
  const location = resolution.resolved;

  if (!location) return (
    <section style={{
      marginBottom: "28px",
      border: "1.5px solid var(--accent-light-border)",
      background: "var(--accent-light)",
      padding: "20px 24px",
      borderRadius: "var(--radius)",
    }}>
      <p style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#b54020" }}>Location needs your help</p>
      <p style={{ marginTop: "10px", fontSize: "13.5px", lineHeight: "1.7", color: "#4a5c52" }}>
        We found more than one possible place. Choose a more specific city, district, or pincode in your request before we route it.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {resolution.candidates.slice(0, 4).map((candidate) => (
          <div key={candidate.location.id} style={{
            border: "1px solid var(--accent-light-border)",
            background: "rgba(255,255,255,0.7)",
            padding: "12px",
            borderRadius: "var(--radius-sm)",
          }}>
            <strong style={{ fontSize: "13px", color: "var(--foreground)" }}>{candidate.location.name}</strong>
            <span style={{ display: "block", marginTop: "4px", fontSize: "11.5px", color: "var(--text-muted)" }}>
              {candidate.location.formattedAddress ?? "Administrative details unavailable"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <section style={{
      marginBottom: "28px",
      border: "1.5px solid var(--green-light-border)",
      background: "var(--green-light)",
      padding: "20px 24px",
      borderRadius: "var(--radius)",
    }} aria-live="polite">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div>
          <p style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--green-mid)" }}>Location identified</p>
          <h2 style={{ marginTop: "8px", fontSize: "22px", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--green-dark)" }}>{location.name}</h2>
          <p style={{ marginTop: "4px", fontSize: "13px", color: "#4a5c52" }}>{location.formattedAddress ?? "India"}</p>
          <div className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2" style={{ fontSize: "12px", color: "#4a5c52" }}>
            <span>District: <strong>{location.district.value?.name ?? "Not available"}</strong></span>
            <span>State: <strong>{location.state.value?.name ?? "Not available"}</strong></span>
            <span>Sub-district: <strong>{location.subDistrict.value?.name ?? "Not available"}</strong></span>
            <span>Pincode: <strong>{location.pincode.value ?? "Not available"}</strong></span>
          </div>
        </div>
        <button
          type="button"
          className={confirmed ? "secondary-button" : "primary-button"}
          onClick={onConfirm}
          style={{ whiteSpace: "nowrap" }}
        >
          {confirmed ? "Location confirmed ✓" : "Confirm this location"}
        </button>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════
   UNDERSTAND
══════════════════════════════════════════════════════════ */

function UnderstandStage({ intent, notice, clarificationQuestions, onBack, onContinue, onEdit }: {
  intent: Intent; notice: string | null; clarificationQuestions: string[];
  onBack: () => void; onContinue: () => void; onEdit: () => void;
}) {
  return (
    <FlowShell eyebrow="Step 2" title="Here is what we understood" description="Check the summary. If we got something wrong, edit your original words and try again." onBack={onBack}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          {/* Summary rows */}
          <div style={{ border: "1.5px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
            {[
              { label: "Issue", value: intent.issue },
              { label: "Location", value: intent.location },
              { label: "State", value: intent.state },
              { label: "District", value: intent.district },
              { label: "Likely category", value: intent.category },
              { label: "Time period", value: intent.timePeriod },
            ].map(({ label, value }, idx) => (
              <div key={label} style={{
                display: "grid",
                gridTemplateColumns: "140px 1fr",
                gap: "12px",
                padding: "14px 18px",
                background: idx % 2 === 0 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.3)",
                borderBottom: "1px solid var(--border-muted)",
              }}>
                <span style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-faint)", paddingTop: "2px" }}>{label}</span>
                <span style={{ fontSize: "13.5px", lineHeight: "1.6", color: "var(--foreground)" }}>{value}</span>
              </div>
            ))}

            {/* Requested information */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr",
              gap: "12px",
              padding: "14px 18px",
              background: "rgba(255,255,255,0.6)",
              borderBottom: notice || clarificationQuestions.length ? "1px solid var(--border-muted)" : "none",
            }}>
              <span style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-faint)", paddingTop: "4px" }}>You want</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {intent.requestedInformation.map((item) => (
                  <span key={item} style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "3px 10px",
                    background: "var(--accent-light)",
                    border: "1px solid var(--accent-light-border)",
                    borderRadius: "100px",
                    fontSize: "12px",
                    color: "#a33020",
                    fontWeight: 500,
                  }}>
                    <span style={{ color: "var(--accent)", fontWeight: 700 }}>+</span>{item}
                  </span>
                ))}
              </div>
            </div>

            {notice ? (
              <div style={{
                padding: "12px 18px",
                borderLeft: "3px solid var(--accent)",
                background: "rgba(232, 98, 42, 0.04)",
                fontSize: "12px",
                lineHeight: "1.6",
                color: "var(--text-muted)",
                borderBottom: clarificationQuestions.length ? "1px solid var(--border-muted)" : "none",
              }}>{notice}</div>
            ) : null}

            {clarificationQuestions.length ? (
              <div style={{ padding: "16px 18px", background: "var(--accent-light)" }}>
                <p style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#b54020" }}>A little more detail will help</p>
                <ul style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {clarificationQuestions.map((question) => (
                    <li key={question} style={{ fontSize: "13.5px", lineHeight: "1.65", color: "#4a5c52", display: "flex", gap: "8px" }}>
                      <span style={{ color: "var(--accent)", flexShrink: 0 }}>•</span>{question}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        {/* Sidebar */}
        <div className="soft-panel" style={{ height: "fit-content" }}>
          <p style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--accent)" }}>
            {clarificationQuestions.length ? "Next step" : "Next"}
          </p>
          <p style={{ marginTop: "14px", fontSize: "13.5px", lineHeight: "1.75", color: "#4a5c52" }}>
            {clarificationQuestions.length
              ? "Add these details to your original words. We will ask only what is needed to route the request and define the records period."
              : "We will use this summary to find a likely public authority. You will confirm it before we draft anything."}
          </p>
          <button className="secondary-button mt-6 w-full" onClick={onEdit}>
            {clarificationQuestions.length ? "Add the missing details" : "Edit my words"}
          </button>
          <button className="primary-button mt-3 w-full" onClick={onContinue}>
            {clarificationQuestions.length ? "Update my request" : "Show me the authority"} <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </FlowShell>
  );
}

/* ══════════════════════════════════════════════════════════
   AUTHORITY EMPTY
══════════════════════════════════════════════════════════ */

function AuthorityEmptyStage({ candidates, lookupNotice, onSelect, onBack }: {
  candidates: AuthorityCandidate[]; lookupNotice: string | null;
  onSelect: (candidate: AuthorityCandidate) => void; onBack: () => void;
}) {
  return (
    <FlowShell eyebrow="Step 3" title="We need one more detail" description="We will not invent a department or route your request to an unverified authority." onBack={onBack}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-start">
        <div className="authority-panel">
          <p style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#b54020" }}>No verified authority selected</p>
          <h2 style={{ marginTop: "12px", fontSize: "26px", fontWeight: 700, letterSpacing: "-0.04em", color: "var(--green-dark)" }}>
            Tell us which project or service you mean.
          </h2>
          <p style={{
            marginTop: "18px",
            borderLeft: "3px solid var(--accent)",
            paddingLeft: "14px",
            fontSize: "13.5px",
            lineHeight: "1.7",
            color: "#4a5c52",
          }}>
            {lookupNotice ?? "No official authority record matches the confirmed location and request topic yet."}
          </p>
          {candidates.length ? (
            <div style={{ marginTop: "24px", borderTop: "1px solid var(--green-light-border)", paddingTop: "20px" }}>
              <p className="meta-label">Verified routes available</p>
              <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                {candidates.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => onSelect(candidate)}
                    style={{
                      border: "1.5px solid var(--green-light-border)",
                      background: "rgba(255,255,255,0.6)",
                      padding: "14px 16px",
                      textAlign: "left",
                      borderRadius: "var(--radius-sm)",
                      transition: "all 150ms ease",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--green-dark)"; e.currentTarget.style.background = "white"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--green-light-border)"; e.currentTarget.style.background = "rgba(255,255,255,0.6)"; }}
                  >
                    <span style={{ display: "block", fontSize: "13.5px", fontWeight: 600, color: "var(--green-dark)" }}>{candidate.publicAuthority}</span>
                    <span style={{ display: "block", marginTop: "4px", fontSize: "11.5px", color: "var(--text-muted)" }}>{candidate.department} · {candidate.district}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ marginTop: "24px", borderTop: "1px solid var(--green-light-border)", paddingTop: "20px", fontSize: "13.5px", lineHeight: "1.7", color: "#4a5c52" }}>
              Edit your request to add the metro line, station, project name, or another identifying detail. The authority directory will be checked again.
            </p>
          )}
        </div>

        <div className="soft-panel">
          <p style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--accent)" }}>What to add</p>
          <ul style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {["Metro line number or name", "Nearby station or road", "Project package or contractor, if known"].map((tip) => (
              <li key={tip} style={{ display: "flex", gap: "8px", fontSize: "13.5px", lineHeight: "1.65", color: "#4a5c52" }}>
                <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0 }}>•</span>{tip}
              </li>
            ))}
          </ul>
          <button className="secondary-button mt-8 w-full" onClick={onBack}>Edit my request</button>
        </div>
      </div>
    </FlowShell>
  );
}

/* ══════════════════════════════════════════════════════════
   AUTHORITY
══════════════════════════════════════════════════════════ */

function AuthorityStage({ intent, authority, candidates, lookupNotice, officialContext, ragNotice, onSelect, onBack, onContinue }: {
  intent: Intent; authority: AuthorityCandidate | null; candidates: AuthorityCandidate[];
  lookupNotice: string | null; officialContext: OfficialContextResult | null; ragNotice: string | null;
  onSelect: (candidate: AuthorityCandidate) => void; onBack: () => void; onContinue: () => void;
}) {
  const selectedAuthority = authority;
  return (
    <FlowShell
      eyebrow="Step 3"
      title={selectedAuthority ? "This is the most likely authority" : "Choose the closest authority"}
      description="Review the suggested route, or select another curated public authority if the first match is not right."
      onBack={onBack}
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-start">
        <div className="authority-panel">
          {selectedAuthority ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <p style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--accent)" }}>Suggested public authority</p>
                  <h2 style={{ marginTop: "12px", fontSize: "28px", fontWeight: 700, letterSpacing: "-0.04em", color: "var(--green-dark)", maxWidth: "640px" }}>
                    {selectedAuthority.department}
                  </h2>
                  <p style={{ marginTop: "8px", fontSize: "13px", color: "var(--text-muted)" }}>
                    {selectedAuthority.publicAuthority} · {selectedAuthority.district} jurisdiction
                  </p>
                </div>
                <span style={{
                  padding: "5px 12px",
                  border: "1.5px solid var(--green-light-border)",
                  background: "rgba(255,255,255,0.7)",
                  borderRadius: "100px",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--green-mid)",
                }}>
                  {lookupNotice ? "Curated fallback" : "Directory match ✓"}
                </span>
              </div>

              <div className="mt-8 grid gap-6 sm:grid-cols-2" style={{ borderTop: "1px solid var(--green-light-border)", paddingTop: "20px" }}>
                <div>
                  <p className="meta-label">Why this matches</p>
                  <p style={{ marginTop: "8px", fontSize: "13.5px", lineHeight: "1.7", color: "var(--foreground)" }}>
                    Your request is about <strong>{intent.issue.toLowerCase()}</strong> in {intent.location}. {selectedAuthority.matchReason}
                  </p>
                </div>
                <div>
                  <p className="meta-label">Official source</p>
                  <a
                    style={{ display: "inline-block", marginTop: "8px", fontSize: "13.5px", fontWeight: 600, color: "var(--foreground)", textDecoration: "underline", textDecorationColor: "var(--accent)", textUnderlineOffset: "4px" }}
                    href={selectedAuthority.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {selectedAuthority.sourceTitle} ↗
                  </a>
                  <p style={{ marginTop: "6px", fontSize: "11.5px", lineHeight: "1.6", color: "var(--text-muted)" }}>
                    Portal: {selectedAuthority.portalName}. Verified {selectedAuthority.verifiedAt}.
                  </p>
                </div>
              </div>

              {lookupNotice ? (
                <p style={{ marginTop: "20px", borderLeft: "3px solid var(--accent)", paddingLeft: "14px", fontSize: "12px", lineHeight: "1.6", color: "var(--text-muted)" }}>
                  {lookupNotice}
                </p>
              ) : null}

              {officialContext?.matches.length ? (
                <div style={{ marginTop: "24px", borderTop: "1px solid var(--green-light-border)", paddingTop: "20px" }}>
                  <p className="meta-label">Official guidance found</p>
                  <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    {officialContext.matches.map((match) => (
                      <article key={match.id} style={{
                        border: "1.5px solid var(--green-light-border)",
                        background: "rgba(255,255,255,0.7)",
                        padding: "16px",
                        borderRadius: "var(--radius-sm)",
                      }}>
                        <p style={{ fontSize: "13px", lineHeight: "1.7", color: "var(--foreground)" }}>
                          {match.text.slice(0, 360)}{match.text.length > 360 ? "..." : ""}
                        </p>
                        <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "8px 12px", fontSize: "11.5px", color: "var(--text-muted)" }}>
                          <span>{match.sourceTitle}</span>
                          <span>Verified {match.verifiedAt}</span>
                          {match.sourceUrl.startsWith("http") ? (
                            <a style={{ fontWeight: 600, color: "var(--foreground)", textDecoration: "underline", textDecorationColor: "var(--accent)", textUnderlineOffset: "3px" }} href={match.sourceUrl} target="_blank" rel="noreferrer">
                              Open source ↗
                            </a>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : ragNotice ? (
                <p style={{ marginTop: "20px", borderLeft: "3px solid var(--accent)", paddingLeft: "14px", fontSize: "12px", lineHeight: "1.6", color: "var(--text-muted)" }}>
                  {ragNotice}
                </p>
              ) : null}
            </>
          ) : (
            <p style={{ borderLeft: "3px solid var(--accent)", paddingLeft: "14px", fontSize: "13.5px", lineHeight: "1.7", color: "#4a5c52" }}>
              We could not confidently rank an authority. Select the closest available match below or edit your request.
            </p>
          )}

          {candidates.length ? (
            <div style={{ marginTop: "24px", borderTop: "1px solid var(--green-light-border)", paddingTop: "20px" }}>
              <p className="meta-label">Choose a route</p>
              <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }} role="radiogroup" aria-label="Choose a public authority">
                {candidates.slice(0, 3).map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    role="radio"
                    aria-checked={candidate.id === selectedAuthority?.id}
                    onClick={() => onSelect(candidate)}
                    style={{
                      border: candidate.id === selectedAuthority?.id ? "1.5px solid var(--accent)" : "1.5px solid var(--green-light-border)",
                      background: candidate.id === selectedAuthority?.id ? "rgba(232,98,42,0.06)" : "rgba(255,255,255,0.6)",
                      padding: "14px 16px",
                      textAlign: "left",
                      borderRadius: "var(--radius-sm)",
                      transition: "all 150ms ease",
                    }}
                  >
                    <span style={{ display: "block", fontSize: "13.5px", fontWeight: 600, color: "var(--green-dark)" }}>{candidate.publicAuthority}</span>
                    <span style={{ display: "block", marginTop: "4px", fontSize: "11.5px", color: "var(--text-muted)" }}>
                      {candidate.department} · {candidate.district}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ marginTop: "24px", borderTop: "1px solid var(--green-light-border)", paddingTop: "20px", fontSize: "13.5px", lineHeight: "1.7", color: "#4a5c52" }}>
              No curated matches are available. Edit your request to add the state, district, and service or project.
            </p>
          )}
        </div>

        {/* Sidebar */}
        <div className="soft-panel" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--accent)" }}>Your choice matters</p>
            <p style={{ marginTop: "14px", fontSize: "13.5px", lineHeight: "1.75", color: "#4a5c52" }}>
              This is a suggestion, not a silent decision. Confirm it to move on, or go back and correct your request.
            </p>
          </div>
          <button
            className="primary-button mt-8 w-full"
            onClick={onContinue}
            disabled={!selectedAuthority}
          >
            Confirm and create draft →
          </button>
        </div>
      </div>
    </FlowShell>
  );
}

/* ══════════════════════════════════════════════════════════
   DRAFT
══════════════════════════════════════════════════════════ */

function DraftStage({ draft, validationIssues, onChange, onBack, onContinue }: {
  draft: string; validationIssues: string[];
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onBack: () => void; onContinue: () => void;
}) {
  return (
    <FlowShell eyebrow="Step 4" title="A clearer way to ask" description="We turned your story into an information request. Read it, edit anything you like, then review the final details." onBack={onBack}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
            <label htmlFor="draft" style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>Your RTI draft</label>
            <span style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--green-mid)",
              background: "var(--green-light)",
              padding: "3px 10px",
              borderRadius: "100px",
              border: "1px solid var(--green-light-border)",
            }}>Information-focused</span>
          </div>
          <textarea
            id="draft"
            value={draft}
            onChange={onChange}
            className="field"
            style={{
              minHeight: "520px",
              resize: "vertical",
              whiteSpace: "pre-wrap",
              fontFamily: "var(--font-mono), 'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
              fontSize: "13px",
              lineHeight: "1.7",
              borderLeft: "3px solid var(--border)",
            }}
          />
          {validationIssues.length ? (
            <div style={{
              marginTop: "18px",
              borderLeft: "3px solid #c0442a",
              paddingLeft: "14px",
              paddingTop: "10px",
              paddingBottom: "10px",
              background: "rgba(192,68,42,0.05)",
              borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
            }}>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#c0442a" }}>Before review</p>
              <ul style={{ marginTop: "8px", paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
                {validationIssues.map((issue) => (
                  <li key={issue} style={{ fontSize: "12px", lineHeight: "1.6", color: "var(--text-muted)", listStyle: "disc" }}>{issue}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div style={{
            marginTop: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            borderTop: "1px solid var(--border)",
            paddingTop: "20px",
          }} className="sm:flex-row sm:items-center sm:justify-between">
            <p style={{ maxWidth: "340px", fontSize: "12px", lineHeight: "1.65", color: "var(--text-faint)" }}>
              The final submission will be a simulated demo record, not a real government filing.
            </p>
            <button className="primary-button" onClick={onContinue}>
              Review before submitting <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        <aside className="soft-panel" style={{ height: "fit-content" }}>
          <p style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--accent)" }}>We changed one thing</p>
          <h3 style={{ marginTop: "14px", fontSize: "19px", fontWeight: 700, letterSpacing: "-0.03em" }}>From complaint to records</h3>
          <p style={{ marginTop: "10px", fontSize: "13.5px", lineHeight: "1.75", color: "#4a5c52" }}>
            Instead of asking why a road was not repaired, this draft asks for the approvals, money trail, contractor details and completion record.
          </p>
          <div style={{ marginTop: "20px", borderTop: "1px solid var(--border)", paddingTop: "16px", fontSize: "12px", lineHeight: "1.65", color: "var(--text-faint)" }}>
            That makes the request easier for an information officer to answer.
          </div>
        </aside>
      </div>
    </FlowShell>
  );
}

/* ══════════════════════════════════════════════════════════
   REVIEW
══════════════════════════════════════════════════════════ */

function ReviewStage({ intent, authority, draft, applicantName, applicantEmail, applicantMobile, confirmed, isSubmitting, submissionError, onNameChange, onEmailChange, onMobileChange, onConfirmedChange, onBack, onSubmit }: {
  intent: Intent; authority: AuthorityCandidate | null; draft: string;
  applicantName: string; applicantEmail: string; applicantMobile: string;
  confirmed: boolean; isSubmitting: boolean; submissionError: string | null;
  onNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onEmailChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onMobileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onConfirmedChange: (value: boolean) => void;
  onBack: () => void; onSubmit: () => void;
}) {
  const isValid = Boolean(applicantName.trim() && isValidEmailAddress(applicantEmail) && isValidMobileNumber(applicantMobile) && confirmed);

  return (
    <FlowShell eyebrow="Step 5" title="Review everything once" description="Add your contact details, check the draft, then create your demo application ID." onBack={onBack}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          {/* Contact fields */}
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="field-label">
              Your name
              <input className="field mt-2" value={applicantName} onChange={onNameChange} placeholder="Full name" />
            </label>
            <label className="field-label">
              Email address
              <input className="field mt-2" type="email" value={applicantEmail} onChange={onEmailChange} placeholder="you@example.com" />
            </label>
            <label className="field-label">
              Mobile number
              <input className="field mt-2" value={applicantMobile} onChange={onMobileChange} placeholder="10-digit number" />
            </label>
          </div>

          {/* Summary */}
          <div style={{ marginTop: "28px", borderTop: "1.5px solid var(--border)", borderBottom: "1.5px solid var(--border)" }}>
            <SummaryRow label="Authority" value={authority?.publicAuthority ?? "Authority pending"} />
            <SummaryRow label="Department" value={authority?.department ?? "Department pending"} />
            <SummaryRow label="Jurisdiction" value={intent.location} />
            <div style={{ paddingTop: "16px", paddingBottom: "16px" }}>
              <p className="meta-label">Draft preview</p>
              <pre style={{
                marginTop: "10px",
                maxHeight: "260px",
                overflow: "auto",
                whiteSpace: "pre-wrap",
                fontFamily: "var(--font-mono), 'Courier New', monospace",
                fontSize: "11.5px",
                lineHeight: "1.7",
                color: "#4a5c52",
                background: "rgba(255,255,255,0.6)",
                padding: "14px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-muted)",
              }}>
                {draft}
              </pre>
            </div>
          </div>
        </div>

        {/* Sidebar confirmation */}
        <div className="soft-panel" style={{ height: "fit-content" }}>
          <p style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--accent)" }}>Final confirmation</p>
          <p style={{ marginTop: "14px", fontSize: "13.5px", lineHeight: "1.75", color: "#4a5c52" }}>
            You are creating a demo application only. Nothing will be sent to a government portal.
          </p>
          <label style={{
            marginTop: "20px",
            display: "flex",
            gap: "10px",
            fontSize: "12.5px",
            lineHeight: "1.65",
            color: "var(--text-muted)",
            cursor: "pointer",
          }}>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => onConfirmedChange(event.target.checked)}
              style={{ marginTop: "2px", accentColor: "var(--accent)", width: "16px", height: "16px", flexShrink: 0 }}
            />
            I have reviewed the authority and the request.
          </label>
          <button
            className="primary-button mt-7 w-full"
            onClick={onSubmit}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%", animation: "spin 700ms linear infinite" }} />
                Confirming…
              </>
            ) : (
              <>Create demo application ID <span aria-hidden="true">→</span></>
            )}
          </button>
          {submissionError ? (
            <p style={{ marginTop: "10px", fontSize: "12px", color: "#c0442a" }}>{submissionError}</p>
          ) : !isValid ? (
            <p style={{ marginTop: "10px", fontSize: "12px", color: "var(--text-faint)" }}>Add your details and confirm that you reviewed the authority and request.</p>
          ) : null}
        </div>
      </div>
    </FlowShell>
  );
}

/* ══════════════════════════════════════════════════════════
   SUBMITTED
══════════════════════════════════════════════════════════ */

function SubmittedStage({ application, notice, onTrack, onStartOver }: {
  application: ApplicationRecord | null; notice: string | null;
  onTrack: () => void; onStartOver: () => void;
}) {
  return (
    <section className="animate-fade-up mx-auto max-w-[760px] py-10 text-center sm:py-20">
      {/* Success icon */}
      <span style={{
        display: "flex",
        height: "64px",
        width: "64px",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--green-mid)",
        color: "white",
        fontSize: "26px",
        borderRadius: "50%",
        margin: "0 auto",
        boxShadow: "0 4px 20px rgba(45, 89, 65, 0.30)",
      }}>✓</span>

      <p style={{ marginTop: "28px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--accent)" }}>
        Demo application created
      </p>
      <h1 style={{ marginTop: "14px", fontSize: "clamp(2.4rem, 6vw, 4.5rem)", fontWeight: 700, letterSpacing: "-0.05em", color: "var(--green-dark)", lineHeight: 1.05 }}>
        You are ready to track it.
      </h1>
      <p style={{ margin: "18px auto 0", maxWidth: "480px", fontSize: "15px", lineHeight: "1.75", color: "#4a5c52" }}>
        This simulated application has been saved in your browser so you can show the complete journey.
      </p>

      {notice ? (
        <div role="status" style={{
          margin: "20px auto 0",
          maxWidth: "520px",
          borderLeft: "3px solid var(--accent)",
          paddingLeft: "14px",
          paddingTop: "10px",
          paddingBottom: "10px",
          textAlign: "left",
          fontSize: "12px",
          lineHeight: "1.65",
          color: "var(--text-muted)",
        }}>
          {notice}
        </div>
      ) : null}

      {/* Application ID box */}
      <div style={{
        margin: "32px auto 0",
        maxWidth: "420px",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "24px",
        background: "white",
        boxShadow: "var(--shadow-md)",
      }}>
        <p style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-faint)" }}>Application ID</p>
        <p style={{ marginTop: "10px", fontFamily: "var(--font-mono), 'Courier New', monospace", fontSize: "22px", fontWeight: 700, letterSpacing: "0.08em", color: "var(--green-dark)" }}>
          {application?.id ?? "RTI-2026-0000"}
        </p>
      </div>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <button className="primary-button" onClick={onTrack}>Track this application <span aria-hidden="true">→</span></button>
        <button className="secondary-button" onClick={onStartOver}>Start another request</button>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════
   TRACK
══════════════════════════════════════════════════════════ */

function TrackStage({ application, trackingId, trackingError, trackingNotice, isTracking, onIdChange, onLookup, onStart }: {
  application: ApplicationRecord | null; trackingId: string; trackingError: string | null;
  trackingNotice: string | null; isTracking: boolean;
  onIdChange: (value: string) => void; onLookup: () => void; onStart: () => void;
}) {
  const hasLoadedApplication = application?.id === trackingId.trim();
  const statusSteps = ["Submitted", "Under review", "Response due"];

  return (
    <section className="animate-fade-up mx-auto max-w-[940px]">
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "28px", marginBottom: "28px" }} className="sm:flex-row sm:items-end">
        <div>
          <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--accent)" }}>Application tracking</p>
          <h1 style={{ marginTop: "12px", fontSize: "clamp(2.2rem, 5vw, 3.5rem)", fontWeight: 700, letterSpacing: "-0.05em", color: "var(--green-dark)" }}>
            A clear status, at a glance.
          </h1>
        </div>
        <button className="secondary-button" onClick={onStart} style={{ whiteSpace: "nowrap" }}>Start a new request</button>
      </div>

      <div style={{ maxWidth: "620px" }}>
        <label htmlFor="tracking-id" style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>Application ID</label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            id="tracking-id"
            className="field flex-1"
            style={{ fontFamily: "var(--font-mono), 'Courier New', monospace" }}
            value={trackingId}
            onChange={(event) => onIdChange(event.target.value)}
            placeholder="RTI-2026-1234"
            onKeyDown={(event) => { if (event.key === "Enter") onLookup(); }}
          />
          <button className="primary-button" onClick={onLookup} disabled={!trackingId.trim() || isTracking}>
            {isTracking ? "Checking…" : "Check status"}
          </button>
        </div>

        {trackingError ? (
          <p role="alert" style={{ marginTop: "10px", borderLeft: "3px solid #c0442a", paddingLeft: "10px", fontSize: "12.5px", lineHeight: "1.6", color: "#a33020" }}>
            {trackingError}
          </p>
        ) : null}
        {trackingNotice ? (
          <p role="status" style={{ marginTop: "10px", borderLeft: "3px solid var(--accent)", paddingLeft: "10px", fontSize: "12.5px", lineHeight: "1.6", color: "var(--text-muted)" }}>
            {trackingNotice}
          </p>
        ) : null}
      </div>

      {hasLoadedApplication ? (
        <div style={{ marginTop: "32px", display: "grid", gap: "28px" }} className="lg:grid-cols-[240px_1fr]">
          {/* Left: meta */}
          <div>
            <p className="meta-label">Application ID</p>
            <p style={{ marginTop: "8px", wordBreak: "break-all", fontFamily: "var(--font-mono), 'Courier New', monospace", fontSize: "15px", fontWeight: 700, letterSpacing: "0.04em" }}>
              {application.id}
            </p>
            <p style={{ marginTop: "20px", fontSize: "12px", lineHeight: "1.65", color: "var(--text-muted)" }}>
              Created {new Date(application.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </p>
            <p style={{ marginTop: "16px", fontSize: "12px", lineHeight: "1.65", color: "var(--text-muted)" }}>
              Route: {application.publicAuthority}
            </p>
          </div>

          {/* Right: status timeline */}
          <div style={{
            border: "1.5px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "24px",
            background: "rgba(255,255,255,0.6)",
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", position: "relative" }}>
              {/* connecting line */}
              <div style={{
                position: "absolute",
                top: "9px",
                left: "calc(100% / 6)",
                right: "calc(100% / 6)",
                height: "2px",
                background: "var(--border)",
                zIndex: 0,
              }} />
              {statusSteps.map((label, index) => (
                <div key={label} style={{ position: "relative", zIndex: 1, textAlign: index === 0 ? "left" : index === 2 ? "right" : "center", padding: "0 8px" }}>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: index === 0 ? "var(--green-mid)" : "var(--border)",
                    marginBottom: "12px",
                  }} />
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--green-dark)" }}>{label}</p>
                  <p style={{ marginTop: "6px", fontSize: "11.5px", lineHeight: "1.6", color: "var(--text-muted)" }}>
                    {index === 0 ? "Demo record created" : index === 1 ? "Waiting for authority review" : "Shown after review"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          marginTop: "32px",
          border: "1.5px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "56px 24px",
          textAlign: "center",
          background: "rgba(255,255,255,0.4)",
        }}>
          <p style={{ fontSize: "18px", fontWeight: 600, color: "var(--green-dark)" }}>Enter an application ID to check status.</p>
          <p style={{ marginTop: "10px", fontSize: "13.5px", lineHeight: "1.7", color: "var(--text-muted)", maxWidth: "440px", margin: "10px auto 0" }}>
            Use the ID from your confirmation screen. The demo store can retrieve it from another browser when Supabase storage is configured.
          </p>
        </div>
      )}
    </section>
  );
}

/* ══════════════════════════════════════════════════════════
   SHARED COMPONENTS
══════════════════════════════════════════════════════════ */

function FlowShell({ eyebrow, title, description, onBack, children }: {
  eyebrow: string; title: string; description: string; onBack: () => void; children: React.ReactNode;
}) {
  return (
    <section className="animate-fade-up">
      <div style={{
        marginBottom: "36px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        borderBottom: "1px solid var(--border)",
        paddingBottom: "28px",
      }} className="sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--accent)" }}>{eyebrow}</p>
          <h1 style={{
            marginTop: "12px",
            maxWidth: "780px",
            fontSize: "clamp(2.4rem, 6vw, 4.5rem)",
            fontWeight: 700,
            lineHeight: 0.96,
            letterSpacing: "-0.05em",
            color: "var(--green-dark)",
          }}>
            {title}
          </h1>
          <p style={{ marginTop: "18px", maxWidth: "600px", fontSize: "15px", lineHeight: "1.75", color: "#4a5c52" }}>{description}</p>
        </div>
        <button className="text-button" style={{ alignSelf: "flex-start" }} onClick={onBack}>← Go back</button>
      </div>
      {children}
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: "grid",
      gap: "12px",
      borderBottom: "1px solid var(--border-muted)",
      padding: "14px 0",
    }} className="sm:grid-cols-[160px_1fr]">
      <span style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-faint)", paddingTop: "2px" }}>{label}</span>
      <span style={{ fontSize: "13.5px", lineHeight: "1.6", color: "var(--foreground)" }}>{value}</span>
    </div>
  );
}
