"use client";

import Link from "next/link";
import { AppFooter, AppHeader, CONTAINER } from "@/app/components/AppShell";
import { useLanguage } from "@/lib/i18n/language";

// Translation strings
const translations = {
  English: {
    startHere: "Start here",
    fileRTI: "File an RTI application",
    fileRTIDesc: "Ask clearly. Get the information you need.",
    useVoice: "Use voice",
    fileManually: "File manually",
    howItWorks: "How it works",
    step1: "Describe your request",
    step2: "Choose the public authority",
    step3: "Review and submit",
    goodToKnow: "Good to know",
    goodToKnowText: "You do not need to name a department. Tell us about the road, service, payment or decision you want records about.",
    askForRecords: "Ask for records",
    askForRecordsDesc: "Budgets, approvals, tenders, bills and status updates.",
    stayInControl: "Stay in control",
    stayInControlDesc: "We show you the route before creating a draft.",
  },
  हिन्दी: {
    startHere: "यहाँ से शुरू करें",
    fileRTI: "आरटीआई आवेदन दाखिल करें",
    fileRTIDesc: "स्पष्ट रूप से पूछें। जो जानकारी चाहिए वो पाएं।",
    useVoice: "आवाज़ का उपयोग करें",
    fileManually: "मैन्युअल रूप से दाखिल करें",
    howItWorks: "यह कैसे काम करता है",
    step1: "अपना अनुरोध बताएं",
    step2: "सार्वजनिक प्राधिकरण चुनें",
    step3: "समीक्षा करें और जमा करें",
    goodToKnow: "जानने योग्य",
    goodToKnowText: "आपको विभाग का नाम बताने की आवश्यकता नहीं है। हमें सड़क, सेवा, भुगतान या निर्णय के बारे में बताएं।",
    askForRecords: "रिकॉर्ड मांगें",
    askForRecordsDesc: "बजट, स्वीकृति, निविदा, बिल और स्थिति अपडेट।",
    stayInControl: "नियंत्रण में रहें",
    stayInControlDesc: "हम ड्राफ्ट बनाने से पहले आपको मार्ग दिखाते हैं।",
  },
  मराठी: {
    startHere: "येथून सुरुवात करा",
    fileRTI: "आरटीआय अर्ज दाखल करा",
    fileRTIDesc: "स्पष्टपणे विचारा. हवी असलेली माहिती मिळवा.",
    useVoice: "आवाज वापरा",
    fileManually: "मॅन्युअल पद्धतीने दाखल करा",
    howItWorks: "हे कसे कार्य करते",
    step1: "तुमची विनंती सांगा",
    step2: "सार्वजनिक प्राधिकरण निवडा",
    step3: "पुनरावलोकन करा आणि सबमिट करा",
    goodToKnow: "जाणून घ्या",
    goodToKnowText: "तुम्हाला विभागाचे नाव सांगण्याची गरज नाही. आम्हाला रस्ता, सेवा, पैसे किंवा निर्णयाबद्दल सांगा.",
    askForRecords: "नोंदी मागा",
    askForRecordsDesc: "अर्थसंकल्प, मंजुरी, निविदा, बिल आणि स्थिती अद्यतने.",
    stayInControl: "नियंत्रणात रहा",
    stayInControlDesc: "आम्ही मसुदा तयार करण्यापूर्वी तुम्हाला मार्ग दाखवतो.",
  },
};

const EYEBROW =
  "font-semibold uppercase text-neutral-500 text-[10px] leading-3 tracking-[1.1px] sm:text-xs sm:leading-4 sm:tracking-[1.28px]";
const CARD =
  "rounded-xl border-neutral-200 border-1 border-solid bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors sm:p-5";

/** The three-step explainer, one card per step. */
function StepCard({ index, label, children }: { index: string; label: string; children: React.ReactNode }) {
  return (
    <div className={`${CARD} hover:border-neutral-400`}>
      <span className="block font-bold text-neutral-200 text-3xl leading-none tabular-nums">{index}</span>
      <div className="mt-3 flex items-start gap-2.5">
        <span className="mt-px flex-shrink-0 text-neutral-950">{children}</span>
        <p className="font-medium text-neutral-950 text-sm leading-5">{label}</p>
      </div>
    </div>
  );
}

/** A single reassurance point in the right-hand column. */
function InfoCard({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className={`${CARD} flex gap-3.5`}>
      <span className="mt-0.5 flex-shrink-0 text-neutral-950">{children}</span>
      <div className="flex flex-col gap-1">
        <span className="font-semibold text-neutral-950 text-sm leading-5">{title}</span>
        <span className="text-neutral-500 text-sm leading-5">{body}</span>
      </div>
    </div>
  );
}

export default function Home() {
  const [language] = useLanguage();
  const t = translations[language];

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <AppHeader />

      {/* ── Main content ── */}
      <main className={`${CONTAINER} py-8 flex flex-col flex-1 gap-8 sm:py-10 sm:gap-10 lg:py-14 lg:gap-14`}>
        {/* Hero: the ask on the left, the reassurance on the right at wide widths. */}
        <section className="grid gap-8 animate-fade-up lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12 lg:items-center">
          <div className="flex flex-col gap-5 sm:gap-6">
            <div className="flex flex-col gap-2.5">
              <span className={EYEBROW}>{t.startHere}</span>
              <h1 className="font-bold text-neutral-950 text-[30px] leading-[36px] tracking-[-0.4px] sm:text-[38px] sm:leading-[44px] sm:tracking-[-0.8px] lg:text-[44px] lg:leading-[50px]">
                {t.fileRTI}
              </h1>
              <p className="max-w-[46ch] text-neutral-500 text-base leading-6 sm:text-lg sm:leading-7">
                {t.fileRTIDesc}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/rti/voice"
                className="font-semibold rounded-lg bg-neutral-900 text-neutral-50 text-[15px] leading-6 flex px-6 justify-center items-center gap-2 w-full h-12 border-0 cursor-pointer transition-colors hover:bg-neutral-800 sm:w-auto"
              >
                <svg className="size-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                {t.useVoice}
              </Link>
              <Link
                href="/rti/manual"
                className="font-semibold rounded-lg bg-white text-neutral-950 text-[15px] leading-6 border-neutral-900 border-1 border-solid flex px-6 justify-center items-center gap-2 w-full h-12 transition-colors hover:bg-neutral-50 sm:w-auto"
              >
                <svg className="size-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t.fileManually}
              </Link>
            </div>
          </div>

          <aside className="flex flex-col gap-3 lg:gap-4">
            <InfoCard title={t.goodToKnow} body={t.goodToKnowText}>
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </InfoCard>
            <InfoCard title={t.askForRecords} body={t.askForRecordsDesc}>
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </InfoCard>
            <InfoCard title={t.stayInControl} body={t.stayInControlDesc}>
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0121 12c0 5.523-4.477 10-10 10S1 17.523 1 12 5.477 2 11 2c1.513 0 2.942.32 4.237.89" />
              </svg>
            </InfoCard>
          </aside>
        </section>

        {/* The three steps, as their own band so the journey reads at a glance. */}
        <section className="flex flex-col gap-4 border-neutral-200 border-t-1 border-r-0 border-b-0 border-l-0 border-solid pt-8 sm:gap-5 lg:pt-10">
          <span className={EYEBROW}>{t.howItWorks}</span>
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            <StepCard index="01" label={t.step1}>
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </StepCard>
            <StepCard index="02" label={t.step2}>
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </StepCard>
            <StepCard index="03" label={t.step3}>
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </StepCard>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
