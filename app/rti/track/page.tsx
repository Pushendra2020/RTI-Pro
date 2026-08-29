"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

type Language = "English" | "हिन्दी" | "मराठी";

const LANGUAGE_KEY = "rti-language";

const translations = {
  English: {
    home: "Home",
    trackingEyebrow: "Application tracking",
    trackingTitle: "Track your RTI application",
    trackingDesc: "Enter your application number to check the status.",
    placeholder: "MH-RTI-2026-12345",
    checkStatus: "Check status",
    submitted: "Submitted",
    department: "Department",
    govOffice: "Government office",
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
    department: "विभाग",
    govOffice: "सरकारी कार्यालय",
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
    department: "विभाग",
    govOffice: "सरकारी कार्यालय",
    date: "तारीख",
    currentStatus: "सध्याची स्थिती",
    enterIdMessage: "या डिव्हाइसवर जतन केलेला अर्ज आयडी प्रविष्ट करा. डेमो अर्ज स्थानिक पातळीवर संग्रहित केले आहेत.",
    notFound: "त्या आयडीसह कोणताही अर्ज सापडला नाही.",
  },
};

interface StoredApplication { 
  registrationNumber?: string; 
  submittedAt?: string; 
  department?: { name?: string } | null; 
  publicAuthority?: { publicAuthority?: string } | null; 
  submission?: { status?: string; registrationNumber?: string }
}

export default function TrackPage() {
  const [language, setLanguage] = useState<Language>("English");
  const [mounted, setMounted] = useState(false);
  
  // Handle language after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LANGUAGE_KEY) as Language;
      if (stored === "हिन्दी" || stored === "मराठी") {
        setLanguage(stored);
      }
    }
  }, []);
  
  const [id, setId] = useState("");
  const [found, setFound] = useState<StoredApplication | null>(null);
  const [notFound, setNotFound] = useState(false);
  
  const t = translations[language];
  
  const lookup = () => {
    setNotFound(false);
    setFound(null);
    
    try {
      // Check manual draft
      const manualValue: unknown = JSON.parse(window.localStorage.getItem("rti-manual-draft") ?? "null");
      if (
        typeof manualValue === "object" && 
        manualValue !== null && 
        "submission" in manualValue && 
        typeof manualValue.submission === "object" && 
        manualValue.submission !== null && 
        "registrationNumber" in manualValue.submission && 
        manualValue.submission.registrationNumber === id.trim()
      ) {
        setFound(manualValue as StoredApplication);
        return;
      }
      
      // Check voice demo application
      const voiceValue: unknown = JSON.parse(window.localStorage.getItem("rti-demo-application") ?? "null");
      if (
        typeof voiceValue === "object" && 
        voiceValue !== null && 
        "id" in voiceValue && 
        voiceValue.id === id.trim()
      ) {
        setFound(voiceValue as StoredApplication);
        return;
      }
      
      setNotFound(true);
    } catch {
      setNotFound(true);
    }
  };
  
  return (
    <main className="max-w-[1000px] mx-auto p-4 sm:p-6 lg:p-12">
      {/* Header */}
      <header className="flex flex-col gap-3 border-neutral-200 border-b-1 border-solid pb-4 mb-6 sm:gap-4 sm:pb-6 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link 
            href="/" 
            className="font-medium text-neutral-500 text-xs leading-4 flex items-center gap-1.5 hover:text-neutral-950 sm:text-sm sm:leading-5 sm:gap-2"
          >
            <svg className="size-3.5 sm:size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t.home}
          </Link>
          <span className="font-semibold uppercase text-neutral-500 text-[10px] leading-3 tracking-[1.1px] sm:text-xs sm:leading-4 sm:tracking-[1.28px]">
            {t.trackingEyebrow}
          </span>
        </div>
        
        {/* Language Selector */}
        <div className="flex gap-2">
          {(["English", "हिन्दी", "मराठी"] as Language[]).map((lang) => (
            <button
              key={lang}
              className={`text-xs px-2.5 py-1 rounded border-1 border-solid transition-colors ${
                language === lang
                  ? "bg-neutral-900 text-white border-neutral-900"
                  : "bg-white text-neutral-500 border-neutral-200 hover:border-neutral-900"
              }`}
              onClick={() => {
                setLanguage(lang);
                localStorage.setItem(LANGUAGE_KEY, lang);
              }}
            >
              {lang}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="max-w-[800px] mx-auto">
        <h1 className="font-bold text-neutral-950 text-[28px] leading-[34px] mb-3 sm:text-[36px] sm:leading-[42px]">
          {t.trackingTitle}
        </h1>
        <p className="text-neutral-500 text-sm leading-5 mb-8 sm:text-base sm:leading-6">
          {t.trackingDesc}
        </p>

        {/* Search Form */}
        <div className="flex flex-col gap-3 sm:flex-row mb-8">
          <input
            className="flex-1 rounded-lg border border-neutral-200 px-4 h-11 text-base font-mono focus:outline-none focus:ring-2 focus:ring-neutral-900"
            value={id}
            onChange={(event) => {
              setId(event.target.value);
              setNotFound(false);
            }}
            placeholder={t.placeholder}
            onKeyDown={(e) => e.key === "Enter" && lookup()}
          />
          <button
            className="font-semibold rounded-lg bg-neutral-900 text-neutral-50 text-[15px] px-6 h-11 flex items-center justify-center gap-2 border-0 cursor-pointer hover:bg-neutral-800 transition-colors"
            onClick={lookup}
          >
            {t.checkStatus}
          </button>
        </div>

        {/* Results */}
        {found ? (
          <div className="border border-neutral-200 bg-neutral-50 rounded-xl p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-700 mb-3">
              {t.submitted}
            </p>
            <p className="text-2xl font-bold text-neutral-950 mb-6 font-mono">
              {found.submission?.registrationNumber || found.registrationNumber}
            </p>
            
            <div className="space-y-3 text-sm">
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <span className="font-medium text-neutral-950 min-w-[140px]">{t.department}:</span>
                <span className="text-neutral-600">{found.department?.name || "—"}</span>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <span className="font-medium text-neutral-950 min-w-[140px]">{t.govOffice}:</span>
                <span className="text-neutral-600">{found.publicAuthority?.publicAuthority || "—"}</span>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <span className="font-medium text-neutral-950 min-w-[140px]">{t.date}:</span>
                <span className="text-neutral-600">
                  {found.submittedAt ? new Date(found.submittedAt).toLocaleDateString("en-IN") : "—"}
                </span>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <span className="font-medium text-neutral-950 min-w-[140px]">{t.currentStatus}:</span>
                <span className="text-neutral-600">{t.submitted}</span>
              </div>
            </div>
          </div>
        ) : notFound ? (
          <div className="border border-red-200 bg-red-50 rounded-xl p-6 text-center">
            <p className="text-sm text-red-900">{t.notFound}</p>
          </div>
        ) : (
          <p className="text-sm text-neutral-500 leading-6">
            {t.enterIdMessage}
          </p>
        )}
      </div>
    </main>
  );
}
