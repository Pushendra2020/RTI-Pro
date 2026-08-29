"use client";

import Link from "next/link";
import { LANGUAGES, type Language, useLanguage } from "@/lib/i18n/language";

const headerText = {
  English: { siteTitle: "RTI filing portal", track: "Track your application", trackShort: "Track" },
  हिन्दी: { siteTitle: "आरटीआई फाइलिंग पोर्टल", track: "आवेदन ट्रैक करें", trackShort: "ट्रैक" },
  मराठी: { siteTitle: "आरटीआय फाइलिंग पोर्टल", track: "अर्ज ट्रॅक करा", trackShort: "ट्रॅक" },
};

/** Shared page container width, so every page lines up at the same gutters. */
export const CONTAINER = "mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-12";

export function LanguageSwitcher() {
  const [language, change] = useLanguage();
  return (
    <div className="flex rounded-lg border-neutral-200 border-1 border-solid items-center h-9 overflow-hidden lg:h-11">
      {LANGUAGES.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={language === option}
          className="font-medium text-xs leading-5 px-2.5 h-full border-0 bg-transparent cursor-pointer sm:text-sm sm:px-3 lg:px-4"
          style={{
            fontWeight: language === option ? 600 : 400,
            color: language === option ? "#1a1a1a" : "#666",
            background: language === option ? "#f5f5f5" : "transparent",
          }}
          onClick={() => change(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

/**
 * Site header used by Home, Voice, Manual and Tracking so the four pages
 * share one identity and one language control.
 */
export function AppHeader({ eyebrow, showTrack = true }: { eyebrow?: string; showTrack?: boolean }) {
  const [language] = useLanguage();
  const t = headerText[language];
  return (
    <header className="border-neutral-200 border-t-0 border-r-0 border-b-1 border-l-0 border-solid">
      <div className={`${CONTAINER} flex py-3 justify-between items-center gap-3 sm:py-4 lg:py-5`}>
        <Link href="/" className="flex items-center gap-3 lg:gap-4 border-0 bg-transparent cursor-pointer p-0 min-w-0">
          <div className="size-10 rounded-lg bg-neutral-900 flex justify-center items-center flex-shrink-0 lg:size-12">
            <span className="font-semibold text-neutral-50 text-xs leading-5 lg:text-sm">साथी</span>
          </div>
          <div className="flex flex-col gap-0.5 min-w-0 lg:gap-1">
            <span className="font-bold text-neutral-950 text-sm leading-5 tracking-[2px] lg:text-lg lg:leading-7 lg:tracking-[3.2px]">
              SAATHI
            </span>
            <span className="text-neutral-500 text-xs leading-4 truncate lg:text-sm lg:leading-5">
              {eyebrow ?? t.siteTitle}
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-3 flex-shrink-0 lg:gap-8">
          <LanguageSwitcher />
          {showTrack ? (
            <Link
              href="/rti/track"
              className="underline-offset-4 underline font-medium text-neutral-950 text-xs leading-4 border-0 bg-transparent cursor-pointer lg:text-sm lg:leading-5"
            >
              <span className="hidden sm:inline">{t.track}</span>
              <span className="sm:hidden">{t.trackShort}</span>
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}

const footerText = {
  English: {
    tagline: "Built for citizens who know the problem, not the department.",
    demo: "All submissions in this demo are simulated.",
  },
  हिन्दी: {
    tagline: "उन नागरिकों के लिए, जो समस्या जानते हैं — विभाग नहीं।",
    demo: "इस डेमो में सभी आवेदन नकली हैं।",
  },
  मराठी: {
    tagline: "समस्या माहीत असलेल्या नागरिकांसाठी — विभाग नाही.",
    demo: "या डेमोमधील सर्व अर्ज नक्कल आहेत.",
  },
};

export function AppFooter() {
  const [language] = useLanguage();
  const t = footerText[language];
  return (
    <footer className="border-neutral-200 border-t-1 border-r-0 border-b-0 border-l-0 border-solid mt-auto">
      <div className={`${CONTAINER} flex flex-col gap-1.5 py-4 sm:flex-row sm:items-center sm:justify-between sm:py-5`}>
        <p className="text-neutral-500 text-xs leading-4">{t.tagline}</p>
        <p className="text-neutral-400 text-xs leading-4">{t.demo}</p>
      </div>
    </footer>
  );
}

export type { Language };
