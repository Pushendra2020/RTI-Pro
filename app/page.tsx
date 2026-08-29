"use client";

import Link from "next/link";
import { AppFooter, AppHeader, CONTAINER } from "@/app/components/AppShell";
import { useLanguage } from "@/lib/i18n/language";

// Translation strings
const translations = {
  English: {
    siteTitle: "RTI filing portal",
    track: "Track your application",
    trackShort: "Track",
    fileRTI: "File an RTI application",
    fileRTIDesc: "Ask clearly. Get the information you need.",
    useVoice: "Use voice",
    fileManually: "File manually",
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
    siteTitle: "आरटीआई फाइलिंग पोर्टल",
    track: "आवेदन ट्रैक करें",
    trackShort: "ट्रैक",
    fileRTI: "आरटीआई आवेदन दाखिल करें",
    fileRTIDesc: "स्पष्ट रूप से पूछें। जो जानकारी चाहिए वो पाएं।",
    useVoice: "आवाज़ का उपयोग करें",
    fileManually: "मैन्युअल रूप से दाखिल करें",
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
    siteTitle: "आरटीआय फाइलिंग पोर्टल",
    track: "अर्ज ट्रॅक करा",
    trackShort: "ट्रॅक",
    fileRTI: "आरटीआय अर्ज दाखल करा",
    fileRTIDesc: "स्पष्टपणे विचारा. हवी असलेली माहिती मिळवा.",
    useVoice: "आवाज वापरा",
    fileManually: "मॅन्युअल पद्धतीने दाखल करा",
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

export default function Home() {
  const [language] = useLanguage();
  const t = translations[language];

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <AppHeader />

      {/* ── Main content ── */}
      <main className={`${CONTAINER} py-6 flex flex-col flex-1 sm:py-8 lg:py-10`}>
        {/* Desktop Layout */}
        <section className="hidden lg:grid grid-cols-2 gap-12 flex-1">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <h1 className="font-bold text-neutral-950 text-[32px] leading-[38px] tracking-normal">
                {t.fileRTI}
              </h1>
              <p className="text-neutral-500 text-base leading-6">
                {t.fileRTIDesc}
              </p>
            </div>
            <div className="flex flex-col gap-4 w-full">
              <Link
                href="/rti/voice"
                className="font-semibold rounded-lg bg-neutral-900 text-neutral-50 text-[15px] leading-6 flex px-6 justify-center items-center gap-2 w-full h-11 border-0 cursor-pointer"
              >
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                {t.useVoice}
              </Link>
              <Link
                href="/rti/manual"
                className="font-semibold rounded-lg bg-white text-neutral-950 text-[15px] leading-6 border-neutral-900 border-1 border-solid flex px-6 justify-center items-center gap-2 w-full h-11"
              >
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t.fileManually}
              </Link>
            </div>
            <div className="grid grid-cols-3 pt-2 gap-8">
              <div className="flex flex-col gap-2">
                <svg className="size-5 text-neutral-950" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span className="font-semibold text-neutral-950 text-2xl leading-8">01</span>
                <span className="text-neutral-500 text-sm leading-5">{t.step1}</span>
              </div>
              <div className="flex flex-col gap-2">
                <svg className="size-5 text-neutral-950" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span className="font-semibold text-neutral-950 text-2xl leading-8">02</span>
                <span className="text-neutral-500 text-sm leading-5">{t.step2}</span>
              </div>
              <div className="flex flex-col gap-2">
                <svg className="size-5 text-neutral-950" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold text-neutral-950 text-2xl leading-8">03</span>
                <span className="text-neutral-500 text-sm leading-5">{t.step3}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-6 justify-center">
            <div className="flex gap-4">
              <svg className="size-6 text-neutral-950 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex flex-col gap-1.5">
                <span className="font-semibold text-neutral-950 text-base leading-6">{t.goodToKnow}</span>
                <span className="text-neutral-500 text-sm leading-5">
                  {t.goodToKnowText}
                </span>
              </div>
            </div>
            <div className="flex gap-4">
              <svg className="size-6 text-neutral-950 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="flex flex-col gap-1.5">
                <span className="font-semibold text-neutral-950 text-base leading-6">{t.askForRecords}</span>
                <span className="text-neutral-500 text-sm leading-5">
                  {t.askForRecordsDesc}
                </span>
              </div>
            </div>
            <div className="flex gap-4">
              <svg className="size-6 text-neutral-950 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0121 12c0 5.523-4.477 10-10 10S1 17.523 1 12 5.477 2 11 2c1.513 0 2.942.32 4.237.89" />
              </svg>
              <div className="flex flex-col gap-1.5">
                <span className="font-semibold text-neutral-950 text-base leading-6">{t.stayInControl}</span>
                <span className="text-neutral-500 text-sm leading-5">
                  {t.stayInControlDesc}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Mobile Layout */}
        <section className="flex flex-col gap-6 lg:hidden">
          <h1 className="font-bold text-neutral-950 text-[28px] leading-[34px] sm:text-[32px] sm:leading-[38px]">
            {t.fileRTI}
          </h1>
          <div className="flex flex-col gap-3">
            <Link
              href="/rti/voice"
              className="font-semibold rounded-lg bg-neutral-900 text-neutral-50 text-[15px] px-4 w-full h-11 flex items-center justify-center gap-2 border-0 cursor-pointer"
            >
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              {t.useVoice}
            </Link>
            <Link
              href="/rti/manual"
              className="font-semibold rounded-lg text-[15px] border-neutral-900 border-1 border-solid px-4 w-full h-11 flex items-center justify-center gap-2 bg-white text-neutral-950"
            >
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {t.fileManually}
            </Link>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <span className="font-bold text-2xl leading-8 w-8">01</span>
              <div className="flex items-center flex-1 gap-2">
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span className="text-neutral-500 text-sm leading-5">{t.step1}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-bold text-2xl leading-8 w-8">02</span>
              <div className="flex items-center flex-1 gap-2">
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span className="text-neutral-500 text-sm leading-5">{t.step2}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-bold text-2xl leading-8 w-8">03</span>
              <div className="flex items-center flex-1 gap-2">
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-neutral-500 text-sm leading-5">{t.step3}</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
