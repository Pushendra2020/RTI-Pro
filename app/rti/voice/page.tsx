"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { AuthorityCandidate } from "@/lib/authority/types";
import { isValidEmailAddress, isValidMobileNumber } from "@/lib/applications/validation";
import { createManualDraft, type ManualStep, type RTIApplicationDraft } from "@/lib/manual/types";
import { saveSubmittedApplication, toSubmittedApplication } from "@/lib/manual/submitted";
import { speechAudioMetadata } from "@/lib/speech/audio";
import { isSpeechToTextResult } from "@/lib/speech/types";

const STORAGE_KEY = "rti-voice-draft";
const LANGUAGE_KEY = "rti-language";

// Voice-specific step types
type VoiceStep = "speak" | "location" | "request" | "authority" | "review" | "payment" | "success";

type Language = "English" | "हिन्दी" | "मराठी";
type RecordingState = "idle" | "recording" | "processing" | "done" | "error";

interface VoiceRecordingChunk {
  blob: Blob;
  timestamp: number;
}

interface VoiceDraft extends RTIApplicationDraft {
  voiceStep: VoiceStep;
  transcript: string;
  extractedData: {
    issue: string;
    category: string;
    timePeriod: string;
    requestedInfo: string[];
  } | null;
}

function createVoiceDraft(): VoiceDraft {
  return {
    ...createManualDraft(),
    voiceStep: "speak",
    transcript: "",
    extractedData: null,
  };
}

function loadDraft(value?: string): VoiceDraft {
  try {
    const parsed: unknown = JSON.parse(value ?? "null");
    if (typeof parsed !== "object" || parsed === null) return createVoiceDraft();
    return { ...createVoiceDraft(), ...(parsed as Partial<VoiceDraft>) };
  } catch {
    return createVoiceDraft();
  }
}

function subscribeToDraft(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("rti-voice-draft-change", onChange);
  return () => window.removeEventListener("rti-voice-draft-change", onChange);
}

function readDraftSnapshot(): string {
  return typeof window === "undefined" ? "" : window.localStorage.getItem(STORAGE_KEY) ?? "";
}

export default function VoiceRtiPage() {
  const storedDraft = useSyncExternalStore(subscribeToDraft, readDraftSnapshot, () => "");
  const parsedDraft = useMemo(() => loadDraft(storedDraft), [storedDraft]);
  
  // Check for stale completed submissions
  const isStoredCompletedSubmission = Boolean(storedDraft) && 
    parsedDraft.currentStep === "success" && 
    parsedDraft.submission.status === "submitted";
  
  const draft = useMemo(() => 
    (isStoredCompletedSubmission ? createVoiceDraft() : parsedDraft), 
    [isStoredCompletedSubmission, parsedDraft]
  );
  
  const [completedApplication, setCompletedApplication] = useState<VoiceDraft | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  
  // Recording state
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingNotice, setRecordingNotice] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const mediaStream = useRef<MediaStream | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recordingChunks = useRef<VoiceRecordingChunk[]>([]);
  const recordingStartTime = useRef<number>(0);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  
  // Other state
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === "undefined") return "English";
    return (localStorage.getItem(LANGUAGE_KEY) as Language) || "English";
  });
  const [authorities, setAuthorities] = useState<AuthorityCandidate[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isExtractingLocation, setIsExtractingLocation] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  
  const displayDraft = completedApplication ?? draft;
  const hasSavedDraft = Boolean(storedDraft) && !isStoredCompletedSubmission && !sessionActive;
  
  // Step indicator helper
  const getStepNumber = (step: VoiceStep): number => {
    const steps: VoiceStep[] = ["speak", "location", "request", "authority", "review", "payment", "success"];
    return steps.indexOf(step) + 1;
  };
  
  const currentStepNumber = getStepNumber(displayDraft.voiceStep);
  
  // Clear stale completed submissions
  useEffect(() => {
    if (!isStoredCompletedSubmission) return;
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("rti-voice-draft-change"));
  }, [isStoredCompletedSubmission]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationInterval.current) clearInterval(durationInterval.current);
      if (mediaRecorder.current?.state === "recording") {
        mediaRecorder.current.stop();
      }
      if (mediaStream.current) {
        mediaStream.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  const patchDraft = (next: Partial<VoiceDraft>) => {
    const updated = { ...draft, ...next };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("rti-voice-draft-change"));
    setErrors([]);
    if (!sessionActive) setSessionActive(true);
  };
  
  const startNewDraft = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("rti-voice-draft-change"));
    setSessionActive(true);
  };
  
  const continueDraft = () => setSessionActive(true);
  
  // Recording management with chunking for long recordings
  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecordingNotice("This browser does not support microphone recording. Please use a modern browser.");
      setRecordingState("error");
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]
        .find(candidate => MediaRecorder.isTypeSupported(candidate)) || "audio/webm";
      
      const recorder = new MediaRecorder(stream, { 
        mimeType,
        audioBitsPerSecond: 128000 // Balance quality and file size
      });
      
      mediaStream.current = stream;
      mediaRecorder.current = recorder;
      recordingChunks.current = [];
      recordingStartTime.current = Date.now();
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunks.current.push({
            blob: event.data,
            timestamp: Date.now()
          });
        }
      };
      
      recorder.onerror = () => {
        stopRecording();
        setRecordingNotice("Recording failed. Please check your microphone and try again.");
        setRecordingState("error");
      };
      
      recorder.onstop = async () => {
        if (durationInterval.current) {
          clearInterval(durationInterval.current);
          durationInterval.current = null;
        }
        
        stream.getTracks().forEach(track => track.stop());
        
        if (recordingChunks.current.length === 0) {
          setRecordingNotice("No audio was recorded. Please try again.");
          setRecordingState("error");
          return;
        }
        
        setRecordingState("processing");
        setRecordingNotice("Transcribing your recording...");
        
        await transcribeRecording();
      };
      
      // Start recording with timeslice for automatic chunking
      // Chunk every 25 seconds to stay within Sarvam's 30-second limit per chunk
      recorder.start(25000);
      
      setRecordingState("recording");
      setRecordingNotice("Recording... Speak your complete RTI request. Press Stop when finished.");
      setRecordingDuration(0);
      
      // Update duration display
      durationInterval.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTime.current) / 1000);
        setRecordingDuration(elapsed);
      }, 1000);
      
    } catch (error) {
      setRecordingNotice("Microphone access denied. Please allow microphone access and try again.");
      setRecordingState("error");
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
      mediaRecorder.current.stop();
    }
  };
  
  const transcribeRecording = async () => {
    const chunks = recordingChunks.current;
    if (chunks.length === 0) {
      setRecordingState("error");
      setRecordingNotice("No audio chunks to transcribe.");
      return;
    }
    
    let fullTranscript = "";
    let successfulChunks = 0;
    let failedChunks = 0;
    
    // Process each chunk separately to handle Sarvam's 30s limit
    for (let i = 0; i < chunks.length; i++) {
      try {
        setRecordingNotice(`Transcribing part ${i + 1} of ${chunks.length}...`);
        
        const formData = new FormData();
        const metadata = speechAudioMetadata(chunks[i].blob.type);
        const file = new File([chunks[i].blob], `voice-part-${i}.${metadata.extension}`, {
          type: metadata.mimeType
        });
        
        formData.append("file", file);
        formData.append("language", language);
        
        const response = await fetch("/api/speech-to-text", {
          method: "POST",
          body: formData
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Transcription failed");
        }
        
        const result: unknown = await response.json();
        if (!isSpeechToTextResult(result)) {
          throw new Error("Invalid transcription response");
        }
        
        // Append this chunk's transcript with a space separator
        if (result.transcript) {
          fullTranscript += (fullTranscript ? " " : "") + result.transcript;
          successfulChunks++;
        }
        
      } catch (error) {
        failedChunks++;
        console.error(`Failed to transcribe chunk ${i + 1}:`, error);
        
        // Don't fail completely if some chunks succeeded
        if (i < chunks.length - 1) {
          continue; // Try next chunk
        }
      }
    }
    
    if (successfulChunks === 0) {
      setRecordingState("error");
      setRecordingNotice("Could not transcribe the recording. Please try again or type your request.");
      return;
    }
    
    // Update draft with transcription
    patchDraft({ 
      transcript: (draft.transcript + " " + fullTranscript).trim(),
      voiceStep: "speak"
    });
    
    setRecordingState("done");
    const notice = failedChunks > 0
      ? `Transcription complete. ${successfulChunks} of ${chunks.length} parts transcribed successfully.`
      : "Transcription complete. You can edit the text before continuing.";
    setRecordingNotice(notice);
    
    recordingChunks.current = [];
  };
  
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  
  // Step handlers
  const handleContinueFromSpeak = async () => {
    if (!draft.transcript.trim()) {
      setErrors(["Please record or type your RTI request before continuing."]);
      return;
    }
    
    // Extract pincode from transcript to preserve it
    const explicitPincode = draft.transcript.match(/\b\d{6}\b/)?.[0] || null;
    
    setIsExtractingLocation(true);
    setLocationNotice("Extracting location from your request...");
    setErrors([]);
    
    try {
      const response = await fetch("/api/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query: draft.transcript,
          context: explicitPincode ? { pincode: explicitPincode } : {}
        })
      });
      
      if (!response.ok) {
        throw new Error("Location extraction failed");
      }
      
      const result: any = await response.json();
      
      // Extract location from result
      if (result.resolved) {
        const location = result.resolved;
        patchDraft({
          jurisdiction: {
            state: location.state.value?.name || "",
            district: location.district.value?.name || "",
            city: location.city.value?.name || location.locality.value?.name || "",
            pincode: explicitPincode || location.pincode.value || ""
          },
          voiceStep: "location"
        });
        setLocationNotice(result.notice || "Location extracted successfully.");
      } else if (result.status === "ambiguous" && result.candidates?.length > 0) {
        // Use first candidate but mark as needing confirmation
        const location = result.candidates[0].location;
        patchDraft({
          jurisdiction: {
            state: location.state.value?.name || "",
            district: location.district.value?.name || "",
            city: location.city.value?.name || location.locality.value?.name || "",
            pincode: explicitPincode || location.pincode.value || ""
          },
          voiceStep: "location"
        });
        setLocationNotice("Multiple locations matched. Please verify the location below.");
      } else {
        // Could not resolve location - let user enter manually
        patchDraft({ voiceStep: "location" });
        setLocationNotice("Could not automatically detect location. Please enter it below.");
      }
    } catch (error) {
      console.error("Location extraction error:", error);
      patchDraft({ voiceStep: "location" });
      setLocationNotice("Location extraction unavailable. Please enter your location manually.");
    } finally {
      setIsExtractingLocation(false);
    }
  };
  
  const handleBackToSpeak = () => {
    patchDraft({ voiceStep: "speak" });
    setLocationNotice(null);
    setErrors([]);
  };
  
  const handleContinueFromLocation = () => {
    const { state, district, city, pincode } = draft.jurisdiction;
    const errors: string[] = [];
    
    if (!state.trim()) errors.push("State is required");
    if (!district.trim()) errors.push("District is required");
    if (!city.trim()) errors.push("City/locality is required");
    if (!pincode.trim()) errors.push("Pincode is required");
    else if (!/^\d{6}$/.test(pincode.trim())) errors.push("Pincode must be exactly 6 digits");
    
    if (errors.length > 0) {
      setErrors(errors);
      return;
    }
    
    // TODO: Proceed to Step 3 (Request)
    patchDraft({ voiceStep: "request" });
  };
  
  if (hasSavedDraft && displayDraft.voiceStep !== "success") {
    return (
      <main className="max-w-[600px] mx-auto px-4 py-12 sm:px-6 sm:py-20">
        <span className="font-semibold uppercase text-neutral-500 text-xs tracking-wider">Voice RTI Filing</span>
        <h1 className="mt-4 font-bold text-neutral-950 text-3xl">Continue your RTI application</h1>
        <p className="mt-3 text-neutral-500">Your progress is saved on this device.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            className="font-semibold rounded-lg bg-neutral-900 text-neutral-50 text-[15px] px-6 h-11 flex items-center justify-center gap-2"
            onClick={continueDraft}
          >
            Resume application
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            className="font-semibold rounded-lg bg-white text-neutral-950 text-[15px] border-neutral-900 border px-6 h-11"
            onClick={startNewDraft}
          >
            Start new
          </button>
        </div>
      </main>
    );
  }
  
  return (
    <main className="max-w-[1000px] mx-auto p-4 sm:p-6 lg:p-12">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-neutral-200 pb-6 mb-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-950 flex items-center gap-2">
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Home
          </Link>
          <span className="font-semibold uppercase text-neutral-500 text-xs tracking-wider">Voice RTI Filing</span>
        </div>
        {displayDraft.voiceStep !== "success" && displayDraft.voiceStep !== "payment" && (
          <span className="text-xs text-neutral-500 bg-neutral-100 px-3 py-1.5 rounded-lg border border-neutral-200">
            Step {currentStepNumber} of 7
          </span>
        )}
      </header>
      
      {/* Step 1: Speak */}
      {displayDraft.voiceStep === "speak" && (
        <section className="max-w-[800px] mx-auto">
          <div className="mb-8">
            <h1 className="font-bold text-neutral-950 text-3xl mb-3">Speak your RTI request</h1>
            <p className="text-neutral-500">
              Describe your information request naturally. You can speak in English, Hindi, Marathi, or mix languages.
            </p>
          </div>
          
          {/* Recording Controls */}
          <div className="bg-white border border-neutral-200 rounded-xl p-8 mb-6">
            <div className="flex flex-col items-center gap-6">
              {/* Recording Status */}
              {recordingState === "recording" && (
                <div className="flex items-center gap-3 text-red-600">
                  <div className="size-3 bg-red-600 rounded-full animate-pulse" />
                  <span className="font-semibold">Recording: {formatDuration(recordingDuration)}</span>
                </div>
              )}
              
              {recordingState === "processing" && (
                <div className="flex items-center gap-3 text-blue-600">
                  <div className="size-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="font-semibold">Transcribing...</span>
                </div>
              )}
              
              {recordingState === "done" && (
                <div className="flex items-center gap-3 text-green-600">
                  <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-semibold">Transcription complete</span>
                </div>
              )}
              
              {/* Recording Button */}
              {recordingState === "idle" || recordingState === "error" ? (
                <button
                  onClick={startRecording}
                  className="flex items-center gap-3 px-8 py-4 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <span className="font-semibold text-lg">Start Recording</span>
                </button>
              ) : recordingState === "recording" ? (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-3 px-8 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <svg className="size-6" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="1" />
                  </svg>
                  <span className="font-semibold text-lg">Stop Recording</span>
                </button>
              ) : null}
              
              {/* Notice */}
              {recordingNotice && (
                <p className="text-sm text-neutral-600 text-center max-w-md">{recordingNotice}</p>
              )}
            </div>
          </div>
          
          {/* Transcript Editor */}
          <div className="mb-8">
            <label htmlFor="transcript" className="block font-semibold text-neutral-950 mb-3">
              Your request {draft.transcript && "(you can edit this)"}
            </label>
            <textarea
              id="transcript"
              value={draft.transcript}
              onChange={(e) => patchDraft({ transcript: e.target.value })}
              placeholder="Your transcribed request will appear here, or you can type directly..."
              className="w-full min-h-[240px] rounded-lg border border-neutral-200 p-4 text-base resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>
          
          {/* Errors */}
          {errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
              <p className="font-semibold text-sm text-red-900 mb-2">Please fix:</p>
              <ul className="text-sm text-red-700 space-y-1 pl-5 list-disc">
                {errors.map((error, i) => <li key={i}>{error}</li>)}
              </ul>
            </div>
          )}
          
          {/* Navigation */}
          <div className="flex justify-between items-center pt-6 border-t border-neutral-200">
            <Link href="/" className="text-neutral-500 hover:text-neutral-950">
              Cancel
            </Link>
            <button
              onClick={handleContinueFromSpeak}
              disabled={isExtractingLocation}
              className="font-semibold rounded-lg bg-neutral-900 text-neutral-50 px-6 h-11 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExtractingLocation ? (
                <>
                  <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Extracting location...
                </>
              ) : (
                <>
                  Continue
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </section>
      )}
      
      {/* Step 2: Location */}
      {displayDraft.voiceStep === "location" && (
        <section className="max-w-[800px] mx-auto">
          <div className="mb-8">
            <h1 className="font-bold text-neutral-950 text-3xl mb-3">Confirm RTI jurisdiction</h1>
            <p className="text-neutral-500">
              This is the location where your RTI request will be routed. Verify the details below.
            </p>
          </div>
          
          {/* Location Notice */}
          {locationNotice && (
            <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
              <p className="text-sm text-blue-900">{locationNotice}</p>
            </div>
          )}
          
          {/* Location Form */}
          <div className="bg-white border border-neutral-200 rounded-xl p-8 mb-6 space-y-6">
            <div>
              <label htmlFor="state" className="block font-semibold text-neutral-950 mb-2">
                State <span className="text-red-500">*</span>
              </label>
              <input
                id="state"
                type="text"
                value={draft.jurisdiction.state}
                onChange={(e) => patchDraft({ jurisdiction: { ...draft.jurisdiction, state: e.target.value } })}
                placeholder="e.g., Maharashtra"
                className="w-full rounded-lg border border-neutral-200 px-4 h-11 text-base focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
            
            <div>
              <label htmlFor="district" className="block font-semibold text-neutral-950 mb-2">
                District <span className="text-red-500">*</span>
              </label>
              <input
                id="district"
                type="text"
                value={draft.jurisdiction.district}
                onChange={(e) => patchDraft({ jurisdiction: { ...draft.jurisdiction, district: e.target.value } })}
                placeholder="e.g., Mumbai City"
                className="w-full rounded-lg border border-neutral-200 px-4 h-11 text-base focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
            
            <div>
              <label htmlFor="city" className="block font-semibold text-neutral-950 mb-2">
                City / Locality <span className="text-red-500">*</span>
              </label>
              <input
                id="city"
                type="text"
                value={draft.jurisdiction.city}
                onChange={(e) => patchDraft({ jurisdiction: { ...draft.jurisdiction, city: e.target.value } })}
                placeholder="e.g., Andheri West"
                className="w-full rounded-lg border border-neutral-200 px-4 h-11 text-base focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
            
            <div>
              <label htmlFor="pincode" className="block font-semibold text-neutral-950 mb-2">
                Pincode <span className="text-red-500">*</span>
              </label>
              <input
                id="pincode"
                type="text"
                value={draft.jurisdiction.pincode}
                onChange={(e) => patchDraft({ jurisdiction: { ...draft.jurisdiction, pincode: e.target.value } })}
                placeholder="e.g., 400013"
                maxLength={6}
                pattern="\d{6}"
                className="w-full rounded-lg border border-neutral-200 px-4 h-11 text-base focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
              <p className="mt-2 text-sm text-neutral-500">Enter the 6-digit pincode of the RTI jurisdiction.</p>
            </div>
          </div>
          
          {/* Errors */}
          {errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
              <p className="font-semibold text-sm text-red-900 mb-2">Please fix:</p>
              <ul className="text-sm text-red-700 space-y-1 pl-5 list-disc">
                {errors.map((error, i) => <li key={i}>{error}</li>)}
              </ul>
            </div>
          )}
          
          {/* Navigation */}
          <div className="flex justify-between items-center pt-6 border-t border-neutral-200">
            <button
              onClick={handleBackToSpeak}
              className="text-neutral-500 hover:text-neutral-950 flex items-center gap-2"
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <button
              onClick={handleContinueFromLocation}
              className="font-semibold rounded-lg bg-neutral-900 text-neutral-50 px-6 h-11 flex items-center gap-2"
            >
              Continue
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </section>
      )}
      
      {/* Other steps placeholder */}
      {displayDraft.voiceStep !== "speak" && displayDraft.voiceStep !== "location" && (
        <div className="text-center py-12">
          <p className="text-neutral-500">Step {displayDraft.voiceStep} - Implementation in progress</p>
        </div>
      )}
    </main>
  );
}
