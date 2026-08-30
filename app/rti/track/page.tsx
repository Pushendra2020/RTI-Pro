"use client";

import { Suspense, useMemo, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { AppFooter, AppHeader, CONTAINER } from "@/app/components/AppShell";
import { useLanguage } from "@/lib/i18n/language";
import { isSubmittedApplication } from "@/lib/manual/submitted";

const translations = {
  English: {
    home: "Home",
    trackingEyebrow: "Application tracking",
    trackingTitle: "Track your RTI application",
    trackingDesc: "Enter your application number to check the status.",
    placeholder: "MH-RTI-2026-12345",
    checkStatus: "Check status",
    submitted: "Submitted",
    applicationId: "Application ID",
    department: "Department",
    govOffice: "Government office",
    jurisdiction: "Jurisdiction",
    yourRequest: "Your request",
    date: "Date",
    currentStatus: "Current status",
    enterIdMessage: "Enter the application ID saved on this device. Demo applications are stored locally.",
    notFound: "No application found with that ID.",
  },
  हिन्दी: {
    home: "होम",
    trackingEyebrow: "आवेदन ट्रैकिंग",
    trackingTitle: "अपना आरटीआई आवेदन ट्रैक करें",
    trackingDesc: "स्थिति जांचने के लिए अपना आवेदन नंबर दर्ज करें।",
    placeholder: "MH-RTI-2026-12345",
    checkStatus: "स्थिति जांचें",
    submitted: "जमा किया गया",
    applicationId: "आवेदन आईडी",
    department: "विभाग",
    govOffice: "सरकारी कार्यालय",
    jurisdiction: "क्षेत्राधिकार",
    yourRequest: "आपका अनुरोध",
    date: "तारीख",
    currentStatus: "वर्तमान स्थिति",
    enterIdMessage: "इस डिवाइस पर सहेजा गया आवेदन आईडी दर्ज करें। डेमो आवेदन स्थानीय रूप से संग्रहीत हैं।",
    notFound: "उस आईडी के साथ कोई आवेदन नहीं मिला।",
  },
  मराठी: {
    home: "होम",
    trackingEyebrow: "अर्ज ट्रॅकिंग",
    trackingTitle: "तुमचा आरटीआय अर्ज ट्रॅक करा",
    trackingDesc: "स्थिती तपासण्यासाठी तुमचा अर्ज क्रमांक टाका.",
    placeholder: "MH-RTI-2026-12345",
    checkStatus: "स्थिती तपासा",
    submitted: "सबमिट केले",
    applicationId: "अर्ज आयडी",
    department: "विभाग",
    govOffice: "सरकारी कार्यालय",
    jurisdiction: "कार्यक्षेत्र",
    yourRequest: "तुमची विनंती",
    date: "तारीख",
    currentStatus: "सध्याची स्थिती",
    enterIdMessage: "या डिव्हाइसवर जतन केलेला अर्ज आयडी प्रविष्ट करा. डेमो अर्ज स्थानिक पातळीवर संग्रहित केले आहेत.",
    notFound: "त्या आयडीसह कोणताही अर्ज सापडला नाही.",
  },
};

/** One shape for the result card, whichever flow created the application. */
interface TrackedApplication {
  registrationNumber: string;
  submittedAt: string;
  department: string;
  publicAuthority: string;
  jurisdiction: string;
  request: string;
}

const MANUAL_KEY = "rti-manual-draft";
const VOICE_KEY = "rti-demo-application";
// Manual submissions are archived here on submit, so they stay trackable after
// "Start a new application" clears the active draft.
const ARCHIVE_KEY = "rti-submitted-applications";

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parse(raw: string): Record<string, unknown> | null {
  try {
    return asRecord(JSON.parse(raw || "null"));
  } catch {
    return null;
  }
}

/** Both flows save to localStorage, so the stored records are the external store this page reads. */
function subscribeToStoredApplications(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("rti-manual-draft-change", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("rti-manual-draft-change", onStoreChange);
  };
}

function readStoredRecord(key: string): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key) ?? "";
}

const readManualRecord = () => readStoredRecord(MANUAL_KEY);
const readVoiceRecord = () => readStoredRecord(VOICE_KEY);
const readArchiveRecord = () => readStoredRecord(ARCHIVE_KEY);
const readNoRecord = () => "";

/** Manual wizard record: rti-manual-draft */
function fromManualDraft(id: string, raw: string): TrackedApplication | null {
  const draft = parse(raw);
  const submission = asRecord(draft?.submission);
  if (!submission || text(submission.registrationNumber) !== id) return null;
  const jurisdiction = asRecord(draft?.jurisdiction);
  const place = [text(jurisdiction?.city), text(jurisdiction?.district), text(jurisdiction?.state)].filter(Boolean);
  return {
    registrationNumber: text(submission.registrationNumber),
    submittedAt: text(submission.submittedAt),
    department: text(asRecord(draft?.department)?.name),
    publicAuthority: text(asRecord(draft?.publicAuthority)?.publicAuthority),
    jurisdiction: place.join(", "),
    request: text(asRecord(draft?.request)?.informationRequested),
  };
}

/** Archived manual submissions: rti-submitted-applications */
function fromSubmittedArchive(id: string, raw: string): TrackedApplication | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw || "null");
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  const match = parsed.filter(isSubmittedApplication).find((item) => item.registrationNumber === id);
  if (!match) return null;
  return {
    registrationNumber: match.registrationNumber,
    submittedAt: match.submittedAt,
    department: match.department?.name ?? "",
    publicAuthority: match.publicAuthority?.publicAuthority ?? "",
    jurisdiction: match.jurisdiction ?? "",
    request: match.request ?? "",
  };
}

/** Voice flow record: rti-demo-application */
function fromVoiceApplication(id: string, raw: string): TrackedApplication | null {
  const application = parse(raw);
  if (!application || text(application.id) !== id) return null;
  const place = [text(application.district), text(application.state)].filter(Boolean);
  return {
    registrationNumber: text(application.id),
    submittedAt: text(application.createdAt),
    department: text(application.department),
    publicAuthority: text(application.publicAuthority),
    jurisdiction: place.join(", "),
    request: text(application.draft),
  };
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-neutral-200 border-b-1 border-solid pb-2.5 sm:flex-row sm:gap-4 sm:pb-3">
      <span className="font-medium text-neutral-500 text-xs leading-5 sm:min-w-[160px] sm:text-sm">{label}</span>
      <span className="text-neutral-950 text-sm leading-5 whitespace-pre-wrap sm:flex-1">{value || "—"}</span>
    </div>
  );
}

function TrackContent() {
  const [language] = useLanguage();
  const t = translations[language];
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id") ?? "";

  // `id` is what the field shows; `lookupId` is what was actually submitted.
  // Seeding both from the query string means an ID handed over by the voice or
  // manual flow resolves without a second click.
  const [id, setId] = useState(initialId);
  const [lookupId, setLookupId] = useState(initialId.trim());

  const manualRecord = useSyncExternalStore(subscribeToStoredApplications, readManualRecord, readNoRecord);
  const voiceRecord = useSyncExternalStore(subscribeToStoredApplications, readVoiceRecord, readNoRecord);
  const archiveRecord = useSyncExternalStore(subscribeToStoredApplications, readArchiveRecord, readNoRecord);
  const found = useMemo(
    () =>
      lookupId
        ? (fromManualDraft(lookupId, manualRecord) ??
          fromSubmittedArchive(lookupId, archiveRecord) ??
          fromVoiceApplication(lookupId, voiceRecord))
        : null,
    [lookupId, manualRecord, archiveRecord, voiceRecord],
  );
  const notFound = Boolean(lookupId) && !found;

  return (
    <>
      <div className="mb-5 sm:mb-6">
        <span className="font-semibold uppercase text-neutral-500 text-[10px] leading-3 tracking-[1.1px] sm:text-xs sm:leading-4 sm:tracking-[1.28px]">
          {t.trackingEyebrow}
        </span>
        <h1 className="mt-2 font-bold text-neutral-950 text-[24px] leading-[30px] sm:text-[30px] sm:leading-[36px]">
          {t.trackingTitle}
        </h1>
        <p className="mt-1.5 text-neutral-500 text-sm leading-5">{t.trackingDesc}</p>
      </div>

      <div className="max-w-[720px]">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="flex-1 rounded-lg border-neutral-200 border-1 border-solid bg-white px-4 h-11 text-base font-mono focus:outline-2 focus:outline-offset-0 focus:outline-neutral-900"
            value={id}
            aria-label={t.applicationId}
            onChange={(event) => {
              setId(event.target.value);
              setLookupId("");
            }}
            placeholder={t.placeholder}
            onKeyDown={(event) => {
              if (event.key === "Enter") setLookupId(id.trim());
            }}
          />
          <button
            type="button"
            className="font-semibold rounded-lg bg-neutral-900 text-neutral-50 text-[15px] px-6 h-11 flex items-center justify-center gap-2 border-0 cursor-pointer hover:bg-neutral-800 transition-colors"
            onClick={() => setLookupId(id.trim())}
          >
            {t.checkStatus}
          </button>
        </div>

        <div className="mt-5 sm:mt-6">
          {found ? (
            <div className="shadow-[0_1px_2px_rgba(0,0,0,0.06)] rounded-xl bg-white border-neutral-200 border-1 border-solid p-4 sm:p-5">
              <div className="border-neutral-200 border-b-1 border-solid pb-3 mb-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold uppercase text-neutral-500 text-[10px] leading-3 tracking-[1.1px] sm:text-xs sm:leading-4 sm:tracking-[1.28px]">
                    {t.applicationId}
                  </p>
                  <span className="font-semibold text-green-700 text-[10px] uppercase tracking-[1.1px] bg-green-50 border-green-200 border-1 border-solid rounded-lg px-2 py-1 sm:text-xs">
                    {t.submitted}
                  </span>
                </div>
                <p className="mt-1.5 font-mono text-xl font-bold tracking-wider text-neutral-950 break-all sm:text-2xl">
                  {found.registrationNumber}
                </p>
              </div>

              <div className="flex flex-col gap-2.5 sm:gap-3">
                <DetailRow label={t.department} value={found.department} />
                <DetailRow label={t.govOffice} value={found.publicAuthority} />
                <DetailRow label={t.jurisdiction} value={found.jurisdiction} />
                <DetailRow
                  label={t.date}
                  value={found.submittedAt ? new Date(found.submittedAt).toLocaleDateString("en-IN") : ""}
                />
                <DetailRow label={t.currentStatus} value={t.submitted} />
                {found.request ? <DetailRow label={t.yourRequest} value={found.request} /> : null}
              </div>
            </div>
          ) : notFound ? (
            <div className="rounded-xl border-red-200 border-1 border-solid bg-red-50 px-4 py-3">
              <p className="text-sm text-red-900">{t.notFound}</p>
            </div>
          ) : (
            <p className="text-sm text-neutral-500 leading-5">{t.enterIdMessage}</p>
          )}
        </div>
      </div>
    </>
  );
}

export default function TrackPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <AppHeader showTrack={false} />
      <main className={`${CONTAINER} py-6 flex-1 sm:py-8 lg:py-10`}>
        <Suspense fallback={null}>
          <TrackContent />
        </Suspense>
      </main>
      <AppFooter />
    </div>
  );
}
