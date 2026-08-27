"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ChangeEvent } from "react";
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
    <div className="min-h-[100dvh] bg-[#f5f7f3] text-[#13201c]">
      <header className="border-b border-[#dbe3dc] bg-[#f5f7f3]/95">
        <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <button className="group flex items-center gap-3 text-left" onClick={() => setStage("home")} aria-label="Go to Saathi home">
            <span className="flex h-10 w-10 items-center justify-center bg-[#13201c] text-xs font-bold tracking-[0.16em] text-[#f7f5ef]">साथी</span>
            <span>
              <span className="block text-sm font-semibold tracking-[0.22em] text-[#13201c]">SAATHI</span>
              <span className="hidden text-[11px] text-[#6c7770] sm:block">RTI citizen assistant</span>
            </span>
          </button>

          <div className="flex items-center gap-2 sm:gap-5">
            <div className="hidden items-center gap-1 rounded-full border border-[#dbe3dc] bg-white/70 p-1 sm:flex" aria-label="Choose language">
              {(["English", "हिन्दी", "मराठी"] as Language[]).map((option) => (
                <button key={option} className={`rounded-full px-3 py-1.5 text-xs transition ${language === option ? "bg-[#13201c] text-white" : "text-[#6c7770] hover:text-[#13201c]"}`} onClick={() => setLanguage(option)}>
                  {option}
                </button>
              ))}
            </div>
            <button className="text-sm font-medium text-[#4b5b53] underline decoration-[#bfcac1] underline-offset-4 hover:text-[#13201c]" onClick={openTracking}>Track an application</button>
          </div>
        </div>
      </header>

      {stage !== "home" && stage !== "submitted" && stage !== "track" ? (
        <div className="border-b border-[#dbe3dc] bg-white/45">
          <div className="mx-auto flex w-full max-w-[1320px] items-center gap-2 overflow-x-auto px-5 py-3 sm:px-8 lg:px-10">
            {stageLabels.map((item, index) => {
              const currentIndex = stageLabels.findIndex((current) => current.id === stage);
              const isComplete = index < currentIndex;
              const isCurrent = item.id === stage;
              return <div key={item.id} className="flex min-w-max items-center gap-2 text-xs"><span className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-semibold ${isCurrent ? "border-[#ec6a2c] bg-[#ec6a2c] text-white" : isComplete ? "border-[#13201c] bg-[#13201c] text-white" : "border-[#c9d4cc] text-[#7c8981]"}`}>{isComplete ? "✓" : index + 1}</span><span className={isCurrent ? "font-semibold text-[#13201c]" : "text-[#7c8981]"}>{item.label}</span>{index < stageLabels.length - 1 ? <span className="mx-1 text-[#b8c4bb]">/</span> : null}</div>;
            })}
          </div>
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-[1320px] px-5 pb-16 pt-8 sm:px-8 sm:pt-12 lg:px-10 lg:pt-16">
        {stage === "home" ? <HomeStage onStart={startRequest} onSample={useSampleRequest} /> : null}
        {stage === "request" ? <RequestStage requestText={requestText} language={language} voiceState={voiceState} voiceNotice={voiceNotice} requestError={requestError} isUnderstanding={isUnderstanding} onChange={(event) => setRequestText(event.target.value)} onVoice={captureVoice} onSample={useSampleRequest} onContinue={runWorkflow} onBack={goBack} /> : null}
        {stage === "understand" && intent ? <><LocationResolutionCard resolution={locationResolution} confirmed={locationConfirmed} onConfirm={() => setLocationConfirmed(true)} /><UnderstandStage intent={intent} notice={reasoningNotice} clarificationQuestions={clarificationQuestions} onBack={goBack} onContinue={() => clarificationQuestions.length ? setStage("request") : locationResolution?.status === "resolved" && !locationConfirmed ? setLookupNotice("Please confirm the identified location before continuing.") : locationResolution?.status === "resolved" ? setStage("authority") : setStage("request")} onEdit={() => setStage("request")} /></> : null}
        {stage === "authority" && intent ? <AuthorityStage intent={intent} authority={authority} candidates={authorityCandidates} lookupNotice={lookupNotice} officialContext={officialContext} ragNotice={ragNotice} onSelect={setAuthority} onBack={goBack} onContinue={generateDraft} /> : null}
        {stage === "draft" ? <DraftStage draft={draft} validationIssues={validationIssues} onChange={(event) => setDraft(event.target.value)} onBack={goBack} onContinue={reviewDraft} /> : null}
        {stage === "review" && intent ? <ReviewStage intent={intent} authority={authority} draft={draft} applicantName={applicantName} applicantEmail={applicantEmail} applicantMobile={applicantMobile} confirmed={confirmed} isSubmitting={isSubmitting} submissionError={submissionError} onNameChange={(event) => setApplicantName(event.target.value)} onEmailChange={(event) => setApplicantEmail(event.target.value)} onMobileChange={(event) => setApplicantMobile(event.target.value)} onConfirmedChange={setConfirmed} onBack={goBack} onSubmit={() => void submitApplication()} /> : null}
        {stage === "submitted" ? <SubmittedStage application={visibleApplication} notice={trackingNotice} onTrack={openTracking} onStartOver={resetJourney} /> : null}
        {stage === "track" ? <TrackStage application={visibleApplication} trackingId={trackingId} trackingError={trackingError} trackingNotice={trackingNotice} isTracking={isTracking} onIdChange={setTrackingId} onLookup={() => void trackApplication()} onStart={startRequest} /> : null}
      </main>

      <footer className="mx-auto flex w-full max-w-[1320px] flex-col gap-3 border-t border-[#dbe3dc] px-5 py-6 text-xs text-[#6c7770] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
        <p>Built for citizens who know the problem, not the department.</p>
        <p>All submissions in this demo are simulated.</p>
      </footer>
    </div>
  );
}

function HomeStage({ onStart, onSample }: { onStart: () => void; onSample: () => void }) {
  return <section className="grid gap-10 lg:grid-cols-[minmax(0,1.06fr)_minmax(420px,0.94fr)] lg:items-center lg:gap-16"><div className="max-w-[690px]"><p className="mb-7 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#ec6a2c]"><span className="h-2 w-2 bg-[#ec6a2c]" /> Maharashtra pilot</p><h1 className="max-w-[700px] text-[clamp(3.5rem,8vw,7.6rem)] font-semibold leading-[0.91] tracking-[-0.08em] text-[#13201c]">Tell us what happened.<span className="block text-[#ec6a2c]">We will find the answer.</span></h1><p className="mt-8 max-w-[570px] text-lg leading-8 text-[#526158] sm:text-xl">You should not have to know which government department handles your issue. Describe what you need, in your own words.</p><div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"><button className="primary-button" onClick={onStart}>Start your request <span aria-hidden="true">→</span></button><button className="secondary-button" onClick={onSample}>Try the road-work example</button></div><div className="mt-12 grid max-w-[590px] grid-cols-3 gap-4 border-t border-[#dbe3dc] pt-5 text-xs text-[#6c7770]"><p><strong className="block text-2xl font-semibold text-[#13201c]">01</strong>Say what you need</p><p><strong className="block text-2xl font-semibold text-[#13201c]">02</strong>Confirm the route</p><p><strong className="block text-2xl font-semibold text-[#13201c]">03</strong>Review before filing</p></div></div><div className="relative lg:pl-7"><div className="absolute -left-1 top-7 hidden h-[78%] w-px bg-[#ec6a2c] lg:block" /><div className="request-card"><div className="flex items-start justify-between gap-6 border-b border-[#dbe3dc] pb-5"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6c7770]">The simpler route</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#13201c]">Start with your story</h2></div><span className="border border-[#c9d4cc] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6c7770]">01 / 05</span></div><div className="py-7"><p className="text-sm leading-6 text-[#526158]">“Mere gaon ke road ke liye kitna paisa sanction hua tha aur contractor kaun tha?”</p><div className="mt-7 flex items-center gap-3 border-t border-[#dbe3dc] pt-5"><span className="flex h-9 w-9 items-center justify-center bg-[#ec6a2c] text-sm font-semibold text-white">→</span><p className="text-xs leading-5 text-[#6c7770]">We identify the topic, location and likely public authority for you.</p></div></div><div className="border-t border-[#dbe3dc] pt-4 text-xs text-[#6c7770]">No department dropdowns. No government jargon.</div></div><div className="ml-auto mt-4 max-w-[290px] border-l-2 border-[#ec6a2c] pl-4 text-xs leading-5 text-[#6c7770]">A safer way to ask for records, approvals, payments and decisions.</div></div></section>;
}

function RequestStage({ requestText, language, voiceState, voiceNotice, requestError, isUnderstanding, onChange, onVoice, onSample, onContinue, onBack }: { requestText: string; language: Language; voiceState: VoiceState; voiceNotice: string | null; requestError: string | null; isUnderstanding: boolean; onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void; onVoice: () => void | Promise<void>; onSample: () => void; onContinue: () => void | Promise<void>; onBack: () => void }) {
  return <FlowShell eyebrow="Step 1" title="What information do you need?" description="Talk naturally in English, Hindi, Marathi, or a mix. We will turn your words into a clear RTI request." onBack={onBack}><div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]"><div><div className="flex items-center justify-between gap-4"><label htmlFor="request" className="text-sm font-semibold text-[#13201c]">Your request</label><span className="text-xs text-[#6c7770]">{language} selected</span></div><textarea id="request" value={requestText} onChange={onChange} placeholder="For example: I want to know how much was spent on the road near my village..." className="field mt-3 min-h-[250px] resize-none" />{requestError ? <p className="mt-3 border-l-2 border-[#a35233] pl-3 text-xs leading-5 text-[#a35233]" role="alert">{requestError}</p> : null}<div className="mt-4 flex flex-col gap-3 sm:flex-row"><button className={`voice-button ${voiceState === "listening" ? "voice-button-active" : ""}`} onClick={() => void onVoice()} aria-live="polite"><span className="voice-bars" aria-hidden="true"><i /><i /><i /><i /></span>{voiceState === "listening" ? "Stop & transcribe" : voiceState === "captured" ? "Voice transcribed" : "Speak instead"}</button><button className="text-button" onClick={onSample}>Use the road-work example</button></div>{voiceNotice ? <p className="mt-3 text-xs leading-5 text-[#6c7770]" role="status">{voiceNotice}</p> : null}<div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#dbe3dc] pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-[330px] text-xs leading-5 text-[#6c7770]">Your words stay editable. We only send them to this app&apos;s reasoning route when you continue.</p><button className="primary-button" onClick={() => void onContinue()} disabled={!requestText.trim() || isUnderstanding}>{isUnderstanding ? "Understanding your request..." : "Help me find the right authority"} <span aria-hidden="true">→</span></button></div></div><aside className="border-l-2 border-[#ec6a2c] pl-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ec6a2c]">Good to know</p><p className="mt-4 text-sm leading-6 text-[#526158]">You do not need to name a department. Tell us about the road, service, payment or decision you want records about.</p><div className="mt-8 space-y-4 text-xs text-[#6c7770]"><p><strong className="text-[#13201c]">Ask for records</strong><br />Budgets, approvals, tenders, bills and status updates.</p><p><strong className="text-[#13201c]">Stay in control</strong><br />We show you the route before creating a draft.</p></div></aside></div></FlowShell>;
}

function LocationResolutionCard({ resolution, confirmed, onConfirm }: { resolution: LocationResolution | null; confirmed: boolean; onConfirm: () => void }) {
  if (!resolution || resolution.status === "not_found") return null;
  const location = resolution.resolved;
  if (!location) return <section className="mx-auto mb-8 max-w-[940px] border border-[#e7c9bc] bg-[#fff4ee] p-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a35233]">Location needs your help</p><p className="mt-3 text-sm leading-6 text-[#526158]">We found more than one possible place. Choose a more specific city, district, or pincode in your request before we route it.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{resolution.candidates.slice(0, 4).map((candidate) => <div key={candidate.location.id} className="border border-[#e7c9bc] bg-white/70 p-3 text-sm text-[#13201c]"><strong>{candidate.location.name}</strong><span className="mt-1 block text-xs text-[#6c7770]">{candidate.location.formattedAddress ?? "Administrative details unavailable"}</span></div>)}</div></section>;
  return <section className="mx-auto mb-8 max-w-[940px] border border-[#b8c8bc] bg-[#eef4ee] p-5" aria-live="polite"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2e5b43]">Location identified</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#13201c]">{location.name}</h2><p className="mt-1 text-sm text-[#526158]">{location.formattedAddress ?? "India"}</p><div className="mt-4 grid gap-x-6 gap-y-2 text-xs text-[#526158] sm:grid-cols-2"><span>District: <strong>{location.district.value?.name ?? "Not available"}</strong></span><span>State: <strong>{location.state.value?.name ?? "Not available"}</strong></span><span>Sub-district: <strong>{location.subDistrict.value?.name ?? "Not available"}</strong></span><span>Pincode: <strong>{location.pincode.value ?? "Not available"}</strong></span></div></div><button type="button" className={confirmed ? "secondary-button" : "primary-button"} onClick={onConfirm}>{confirmed ? "Location confirmed ✓" : "Confirm this location"}</button></div></section>;
}

function UnderstandStage({ intent, notice, clarificationQuestions, onBack, onContinue, onEdit }: { intent: Intent; notice: string | null; clarificationQuestions: string[]; onBack: () => void; onContinue: () => void; onEdit: () => void }) {
  return <FlowShell eyebrow="Step 2" title="Here is what we understood" description="Check the summary. If we got something wrong, edit your original words and try again." onBack={onBack}><div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]"><div className="border-y border-[#dbe3dc]"><SummaryRow label="Issue" value={intent.issue} /><SummaryRow label="Location" value={intent.location} /><SummaryRow label="State" value={intent.state} /><SummaryRow label="District" value={intent.district} /><SummaryRow label="Likely category" value={intent.category} /><SummaryRow label="Time period" value={intent.timePeriod} /><div className="grid gap-3 border-b border-[#dbe3dc] py-5 sm:grid-cols-[150px_1fr]"><span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6c7770]">You want</span><ul className="space-y-2 text-sm leading-6 text-[#13201c]">{intent.requestedInformation.map((item) => <li key={item} className="flex gap-2"><span className="text-[#ec6a2c]">+</span>{item}</li>)}</ul></div>{notice ? <p className="border-b border-[#dbe3dc] border-l-2 border-l-[#ec6a2c] px-4 py-4 text-xs leading-5 text-[#6c7770]">{notice}</p> : null}{clarificationQuestions.length ? <div className="border-b border-[#dbe3dc] bg-[#fff4ee] px-4 py-5"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#a35233]">A little more detail will help</p><ul className="mt-3 space-y-2 text-sm leading-6 text-[#526158]">{clarificationQuestions.map((question) => <li key={question}>• {question}</li>)}</ul></div> : null}</div><div className="soft-panel"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ec6a2c]">{clarificationQuestions.length ? "Next step" : "Next"}</p><p className="mt-4 text-sm leading-6 text-[#526158]">{clarificationQuestions.length ? "Add these details to your original words. We will ask only what is needed to route the request and define the records period." : "We will use this summary to find a likely public authority. You will confirm it before we draft anything."}</p><button className="secondary-button mt-7 w-full" onClick={onEdit}>{clarificationQuestions.length ? "Add the missing details" : "Edit my words"}</button><button className="primary-button mt-3 w-full" onClick={onContinue}>{clarificationQuestions.length ? "Update my request" : "Show me the authority"} <span aria-hidden="true">→</span></button></div></div></FlowShell>;
}

function AuthorityStage({ intent, authority, candidates, lookupNotice, officialContext, ragNotice, onSelect, onBack, onContinue }: { intent: Intent; authority: AuthorityCandidate | null; candidates: AuthorityCandidate[]; lookupNotice: string | null; officialContext: OfficialContextResult | null; ragNotice: string | null; onSelect: (candidate: AuthorityCandidate) => void; onBack: () => void; onContinue: () => void }) {
  const selectedAuthority = authority;

  return <FlowShell eyebrow="Step 3" title={selectedAuthority ? "This is the most likely authority" : "Choose the closest authority"} description="Review the suggested route, or select another curated public authority if the first match is not right." onBack={onBack}><div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-start"><div className="authority-panel">{selectedAuthority ? <><div className="flex flex-wrap items-start justify-between gap-6"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ec6a2c]">Suggested public authority</p><h2 className="mt-3 max-w-[660px] text-3xl font-semibold tracking-[-0.05em] text-[#13201c] sm:text-4xl">{selectedAuthority.department}</h2><p className="mt-3 text-sm text-[#6c7770]">{selectedAuthority.publicAuthority} · {selectedAuthority.district} jurisdiction</p></div><span className="border border-[#b8c8bc] bg-[#eef4ee] px-3 py-2 text-xs font-semibold text-[#2e5b43]">{lookupNotice ? "Curated fallback" : "Directory match"}</span></div><div className="mt-9 grid gap-5 border-t border-[#cbd8ce] pt-6 sm:grid-cols-2"><div><p className="meta-label">Why this matches</p><p className="mt-2 text-sm leading-6 text-[#13201c]">Your request is about <strong>{intent.issue.toLowerCase()}</strong> in {intent.location}. {selectedAuthority.matchReason}</p></div><div><p className="meta-label">Official source</p><a className="mt-2 inline-block text-sm font-medium text-[#13201c] underline decoration-[#ec6a2c] underline-offset-4" href={selectedAuthority.sourceUrl} target="_blank" rel="noreferrer">{selectedAuthority.sourceTitle} ↗</a><p className="mt-2 text-xs leading-5 text-[#6c7770]">Portal: {selectedAuthority.portalName}. Verified {selectedAuthority.verifiedAt}.</p></div></div>{lookupNotice ? <p className="mt-6 border-l-2 border-[#ec6a2c] pl-4 text-xs leading-5 text-[#6c7770]">{lookupNotice}</p> : null}{officialContext?.matches.length ? <div className="mt-7 border-t border-[#cbd8ce] pt-5"><p className="meta-label">Official guidance found</p><div className="mt-3 space-y-3">{officialContext.matches.map((match) => <article key={match.id} className="border border-[#cbd8ce] bg-white/60 p-4"><p className="text-sm leading-6 text-[#13201c]">{match.text.slice(0, 360)}{match.text.length > 360 ? "..." : ""}</p><div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6c7770]"><span>{match.sourceTitle}</span><span>Verified {match.verifiedAt}</span>{match.sourceUrl.startsWith("http") ? <a className="font-medium text-[#13201c] underline decoration-[#ec6a2c] underline-offset-4" href={match.sourceUrl} target="_blank" rel="noreferrer">Open source ↗</a> : null}</div></article>)}</div></div> : ragNotice ? <p className="mt-7 border-l-2 border-[#ec6a2c] pl-4 text-xs leading-5 text-[#6c7770]">{ragNotice}</p> : null}</> : <p className="border-l-2 border-[#ec6a2c] pl-4 text-sm leading-6 text-[#526158]">We could not confidently rank an authority. Select the closest available match below or edit your request.</p>}{candidates.length ? <div className="mt-7 border-t border-[#cbd8ce] pt-5"><p className="meta-label">Choose a route</p><div className="mt-3 grid gap-3" role="radiogroup" aria-label="Choose a public authority">{candidates.slice(0, 3).map((candidate) => <button key={candidate.id} type="button" role="radio" aria-checked={candidate.id === selectedAuthority?.id} onClick={() => onSelect(candidate)} className={`border p-4 text-left transition ${candidate.id === selectedAuthority?.id ? "border-[#ec6a2c] bg-[#fff4ee]" : "border-[#cbd8ce] bg-white/50 hover:border-[#13201c]"}`}><span className="block text-sm font-semibold text-[#13201c]">{candidate.publicAuthority}</span><span className="mt-1 block text-xs leading-5 text-[#6c7770]">{candidate.department} · {candidate.district}</span></button>)}</div></div> : <p className="mt-7 border-t border-[#cbd8ce] pt-5 text-sm leading-6 text-[#526158]">No curated matches are available. Edit your request to add the state, district, and service or project.</p>}</div><div className="soft-panel flex flex-col justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ec6a2c]">Your choice matters</p><p className="mt-4 text-sm leading-6 text-[#526158]">This is a suggestion, not a silent decision. Confirm it to move on, or go back and correct your request.</p></div><button className="primary-button mt-8 w-full" onClick={onContinue} disabled={!selectedAuthority}>Confirm and create draft →</button></div></div></FlowShell>;
}

function DraftStage({ draft, validationIssues, onChange, onBack, onContinue }: { draft: string; validationIssues: string[]; onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void; onBack: () => void; onContinue: () => void }) {
  return <FlowShell eyebrow="Step 4" title="A clearer way to ask" description="We turned your story into an information request. Read it, edit anything you like, then review the final details." onBack={onBack}><div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]"><div><div className="mb-3 flex items-center justify-between gap-4"><label htmlFor="draft" className="text-sm font-semibold text-[#13201c]">Your RTI draft</label><span className="text-xs text-[#2e5b43]">Information-focused</span></div><textarea id="draft" value={draft} onChange={onChange} className="field min-h-[510px] resize-y whitespace-pre-wrap font-mono text-[13px] leading-6" />{validationIssues.length ? <div className="mt-5 border-l-2 border-[#a35233] pl-4 text-xs leading-5 text-[#6c7770]"><p className="font-semibold text-[#a35233]">Before review</p><ul className="mt-2 list-disc space-y-1 pl-4">{validationIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div> : null}<div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-[350px] text-xs leading-5 text-[#6c7770]">The final submission will be a simulated demo record, not a real government filing.</p><button className="primary-button" onClick={onContinue}>Review before submitting <span aria-hidden="true">→</span></button></div></div><aside className="soft-panel h-fit"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ec6a2c]">We changed one thing</p><h3 className="mt-4 text-xl font-semibold tracking-[-0.03em]">From complaint to records</h3><p className="mt-3 text-sm leading-6 text-[#526158]">Instead of asking why a road was not repaired, this draft asks for the approvals, money trail, contractor details and completion record.</p><div className="mt-6 border-t border-[#dbe3dc] pt-5 text-xs leading-5 text-[#6c7770]">That makes the request easier for an information officer to answer.</div></aside></div></FlowShell>;
}

function ReviewStage({ intent, authority, draft, applicantName, applicantEmail, applicantMobile, confirmed, isSubmitting, submissionError, onNameChange, onEmailChange, onMobileChange, onConfirmedChange, onBack, onSubmit }: { intent: Intent; authority: AuthorityCandidate | null; draft: string; applicantName: string; applicantEmail: string; applicantMobile: string; confirmed: boolean; isSubmitting: boolean; submissionError: string | null; onNameChange: (event: ChangeEvent<HTMLInputElement>) => void; onEmailChange: (event: ChangeEvent<HTMLInputElement>) => void; onMobileChange: (event: ChangeEvent<HTMLInputElement>) => void; onConfirmedChange: (value: boolean) => void; onBack: () => void; onSubmit: () => void }) {
  const isValid = Boolean(applicantName.trim() && isValidEmailAddress(applicantEmail) && isValidMobileNumber(applicantMobile) && confirmed);
  return <FlowShell eyebrow="Step 5" title="Review everything once" description="Add your contact details, check the route and draft, then create your demo application ID." onBack={onBack}><div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]"><div><div className="grid gap-4 sm:grid-cols-3"><label className="field-label">Your name<input className="field mt-2" value={applicantName} onChange={onNameChange} placeholder="Full name" /></label><label className="field-label">Email address<input className="field mt-2" type="email" value={applicantEmail} onChange={onEmailChange} placeholder="you@example.com" /></label><label className="field-label">Mobile number<input className="field mt-2" value={applicantMobile} onChange={onMobileChange} placeholder="10-digit number" /></label></div><div className="mt-8 border-y border-[#dbe3dc]"><SummaryRow label="Authority" value={authority?.publicAuthority ?? "Authority pending"} /><SummaryRow label="Department" value={authority?.department ?? "Department pending"} /><SummaryRow label="Jurisdiction" value={intent.location} /><div className="py-5"><p className="meta-label">Draft preview</p><pre className="mt-3 max-h-[260px] overflow-auto whitespace-pre-wrap font-mono text-xs leading-5 text-[#526158]">{draft}</pre></div></div></div><div className="soft-panel h-fit"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ec6a2c]">Final confirmation</p><p className="mt-4 text-sm leading-6 text-[#526158]">You are creating a demo application only. Nothing will be sent to a government portal.</p><label className="mt-6 flex gap-3 text-xs leading-5 text-[#526158]"><input type="checkbox" checked={confirmed} onChange={(event) => onConfirmedChange(event.target.checked)} className="mt-1 accent-[#ec6a2c]" /> I have reviewed the authority and the request.</label><button className="primary-button mt-7 w-full" onClick={onSubmit} disabled={!isValid || isSubmitting}>{isSubmitting ? "Confirming workflow..." : "Create demo application ID"} <span aria-hidden="true">→</span></button>{submissionError ? <p className="mt-3 text-xs text-[#a35233]">{submissionError}</p> : !isValid ? <p className="mt-3 text-xs text-[#a35233]">Add your details and confirm that you reviewed the authority and request.</p> : null}</div></div></FlowShell>;
}

function SubmittedStage({ application, notice, onTrack, onStartOver }: { application: ApplicationRecord | null; notice: string | null; onTrack: () => void; onStartOver: () => void }) {
  return <section className="mx-auto max-w-[780px] py-8 text-center sm:py-16"><span className="mx-auto flex h-14 w-14 items-center justify-center bg-[#2e5b43] text-xl font-semibold text-white">✓</span><p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-[#ec6a2c]">Demo application created</p><h1 className="mt-4 text-5xl font-semibold tracking-[-0.07em] text-[#13201c] sm:text-7xl">You are ready to track it.</h1><p className="mx-auto mt-6 max-w-[510px] text-base leading-7 text-[#526158]">This simulated application has been saved in your browser so you can show the complete journey.</p>{notice ? <p className="mx-auto mt-5 max-w-[540px] border-l-2 border-[#ec6a2c] px-4 py-3 text-left text-xs leading-5 text-[#6c7770]" role="status">{notice}</p> : null}<div className="mx-auto mt-10 max-w-[430px] border-y border-[#dbe3dc] py-6"><p className="text-xs uppercase tracking-[0.18em] text-[#6c7770]">Application ID</p><p className="mt-3 font-mono text-2xl font-semibold tracking-[0.08em] text-[#13201c]">{application?.id ?? "RTI-2026-0000"}</p></div><div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row"><button className="primary-button" onClick={onTrack}>Track this application <span aria-hidden="true">→</span></button><button className="secondary-button" onClick={onStartOver}>Start another request</button></div></section>;
}

function TrackStage({ application, trackingId, trackingError, trackingNotice, isTracking, onIdChange, onLookup, onStart }: { application: ApplicationRecord | null; trackingId: string; trackingError: string | null; trackingNotice: string | null; isTracking: boolean; onIdChange: (value: string) => void; onLookup: () => void; onStart: () => void }) {
  const hasLoadedApplication = application?.id === trackingId.trim();
  return <section className="mx-auto max-w-[940px]"><div className="flex flex-col justify-between gap-6 border-b border-[#dbe3dc] pb-8 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ec6a2c]">Application tracking</p><h1 className="mt-3 text-5xl font-semibold tracking-[-0.07em] text-[#13201c] sm:text-6xl">A clear status, at a glance.</h1></div><button className="secondary-button" onClick={onStart}>Start a new request</button></div><div className="mt-8 max-w-[620px]"><label htmlFor="tracking-id" className="text-sm font-semibold text-[#13201c]">Application ID</label><div className="mt-3 flex flex-col gap-3 sm:flex-row"><input id="tracking-id" className="field flex-1 font-mono" value={trackingId} onChange={(event) => onIdChange(event.target.value)} placeholder="RTI-2026-1234" onKeyDown={(event) => { if (event.key === "Enter") onLookup(); }} /><button className="primary-button" onClick={onLookup} disabled={!trackingId.trim() || isTracking}>{isTracking ? "Checking status..." : "Check status"}</button></div>{trackingError ? <p className="mt-3 border-l-2 border-[#a35233] pl-3 text-xs leading-5 text-[#a35233]" role="alert">{trackingError}</p> : null}{trackingNotice ? <p className="mt-3 border-l-2 border-[#ec6a2c] pl-3 text-xs leading-5 text-[#6c7770]" role="status">{trackingNotice}</p> : null}</div>{hasLoadedApplication ? <div className="grid gap-8 pt-9 lg:grid-cols-[260px_1fr]"><div><p className="text-xs uppercase tracking-[0.18em] text-[#6c7770]">Application ID</p><p className="mt-2 break-all font-mono text-lg font-semibold tracking-[0.05em]">{application.id}</p><p className="mt-6 text-xs leading-5 text-[#6c7770]">Created {new Date(application.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p><p className="mt-6 text-xs leading-5 text-[#6c7770]">Route: {application.publicAuthority}</p></div><div className="border-y border-[#dbe3dc] py-6"><div className="grid gap-0 sm:grid-cols-3">{["Submitted", "Under review", "Response due"].map((label, index) => <div key={label} className="relative border-l border-[#dbe3dc] px-5 py-2 first:border-l-0 first:pl-0"><span className={`mb-4 block h-3 w-3 ${index === 0 ? "bg-[#2e5b43]" : "bg-[#c9d4cc]"}`} /><p className="text-sm font-semibold text-[#13201c]">{label}</p><p className="mt-2 text-xs leading-5 text-[#6c7770]">{index === 0 ? "Demo record created" : index === 1 ? "Waiting for authority review" : "Shown after review"}</p></div>)}</div></div></div> : <div className="mt-9 border-y border-[#dbe3dc] py-16 text-center"><p className="text-xl font-semibold text-[#13201c]">Enter an application ID to check status.</p><p className="mt-3 text-sm text-[#6c7770]">Use the ID from your confirmation screen. The demo store can retrieve it from another browser when Supabase storage is configured.</p></div>}</section>;
}

function FlowShell({ eyebrow, title, description, onBack, children }: { eyebrow: string; title: string; description: string; onBack: () => void; children: React.ReactNode }) {
  return <section><div className="mb-10 flex flex-col gap-6 border-b border-[#dbe3dc] pb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ec6a2c]">{eyebrow}</p><h1 className="mt-3 max-w-[790px] text-5xl font-semibold leading-[0.95] tracking-[-0.07em] text-[#13201c] sm:text-7xl">{title}</h1><p className="mt-5 max-w-[630px] text-base leading-7 text-[#526158]">{description}</p></div><button className="text-button self-start sm:self-auto" onClick={onBack}>← Go back</button></div>{children}</section>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-2 border-b border-[#dbe3dc] py-5 sm:grid-cols-[150px_1fr]"><span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6c7770]">{label}</span><span className="text-sm leading-6 text-[#13201c]">{value}</span></div>;
}
