"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import type { AuthorityCandidate } from "@/lib/authority/types";
import { isValidEmailAddress, isValidMobileNumber } from "@/lib/applications/validation";
import { createManualDraft, type ManualStep, type RTIApplicationDraft } from "@/lib/manual/types";

const STORAGE_KEY = "rti-manual-draft";
const departments = [
  ["roads", "Roads & Public Works"], ["education", "Education"], ["health", "Health"], ["agriculture", "Agriculture"],
  ["water", "Water Resources"], ["rural", "Rural Development"], ["municipal", "Municipal Services"], ["housing", "Housing"],
  ["revenue", "Revenue / Land"], ["police", "Police"], ["other", "Other"],
] as const;
const requestChoices = ["Sanctioned amount", "Amount released", "Expenditure", "Contractor details", "Work order", "Completion status", "Inspection report"];
const authorityCategories: Record<string, string> = { roads: "Rural development", education: "School education", health: "Public health", water: "Water supply and sanitation", rural: "Rural development", revenue: "Revenue and land records" };
const steps: Array<{ id: ManualStep; label: string }> = [
  { id: "jurisdiction", label: "Location" }, { id: "department", label: "Department" }, { id: "authority", label: "Government office" },
  { id: "applicant", label: "Your details" }, { id: "request", label: "Request" }, { id: "preferences", label: "Preferences" }, { id: "review", label: "Review" },
];

function loadDraft(value?: string): RTIApplicationDraft {
  try {
    const parsed: unknown = JSON.parse(value ?? "null");
    if (typeof parsed !== "object" || parsed === null || !("jurisdiction" in parsed)) return createManualDraft();
    return { ...createManualDraft(), ...(parsed as Partial<RTIApplicationDraft>) };
  } catch { return createManualDraft(); }
}

function subscribeToDraft(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("rti-manual-draft-change", onChange);
  return () => window.removeEventListener("rti-manual-draft-change", onChange);
}

function readDraftSnapshot(): string { return typeof window === "undefined" ? "" : window.localStorage.getItem(STORAGE_KEY) ?? ""; }

function update<T extends keyof RTIApplicationDraft>(draft: RTIApplicationDraft, key: T, value: RTIApplicationDraft[T]): RTIApplicationDraft { return { ...draft, [key]: value }; }

export default function ManualRtiPage() {
  const storedDraft = useSyncExternalStore(subscribeToDraft, readDraftSnapshot, () => "");
  const draft = useMemo(() => loadDraft(storedDraft), [storedDraft]);
  const [resumeDismissed, setResumeDismissed] = useState(false);
  const [authorities, setAuthorities] = useState<AuthorityCandidate[]>([]);
  const [directoryDepartments, setDirectoryDepartments] = useState<Array<{ id: string; name: string; category: string; authorityCount: number }>>([]);
  const [authorityNotice, setAuthorityNotice] = useState("");
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [assistBusy, setAssistBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const hasSavedDraft = Boolean(storedDraft) && !resumeDismissed;

  const currentIndex = Math.max(0, steps.findIndex((step) => step.id === draft.currentStep));
  const visibleDepartments = useMemo(() => departments.filter((item) => item[1].toLowerCase().includes(departmentSearch.toLowerCase())), [departmentSearch]);
  const patchDraft = (next: RTIApplicationDraft) => { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); window.dispatchEvent(new Event("rti-manual-draft-change")); setErrors([]); };
  const startNew = () => { window.localStorage.removeItem(STORAGE_KEY); window.dispatchEvent(new Event("rti-manual-draft-change")); setResumeDismissed(true); };
  const continueDraft = () => setResumeDismissed(true);
  const stepError = (step: ManualStep): string[] => {
    if (step === "jurisdiction") return draft.jurisdiction.state && draft.jurisdiction.district ? [] : ["Add the state and district for this issue."];
    if (step === "department") return draft.department ? [] : ["Choose the government area that best matches your issue."];
    if (step === "authority") return draft.publicAuthority ? [] : ["Select a verified government office before continuing."];
    if (step === "applicant") {
      const result: string[] = [];
      if (draft.applicant.fullName.trim().length < 2) result.push("Enter your full name.");
      if (draft.applicant.address.trim().length < 10) result.push("Enter your complete address.");
      if (!isValidMobileNumber(draft.applicant.mobile)) result.push("Enter a valid 10-digit mobile number.");
      if (!isValidEmailAddress(draft.applicant.email)) result.push("Enter a valid email address.");
      if (!draft.applicant.emailVerified) result.push("Verify your email with the demo OTP.");
      return result;
    }
    if (step === "request") {
      const result: string[] = [];
      if (!draft.request.subject.trim()) result.push("Add a subject for your request.");
      if (draft.request.subject.trim().split(/\s+/).filter(Boolean).length > 150) result.push("Keep the subject within 150 words.");
      if (draft.request.informationRequested.trim().length < 10) result.push("Describe the information or records you want.");
      return result;
    }
    if (step === "preferences") {
      const result = draft.informationPeriod.type ? [] : ["Choose the time period for the information."];
      if (!draft.delivery.mode) result.push("Choose how you want to receive the information.");
      if (draft.bpl.isBpl && !draft.bpl.proofFileName) result.push("Attach your BPL proof or select No for BPL status.");
      return result;
    }
    return [];
  };
  const goNext = async () => {
    const currentErrors = stepError(draft.currentStep);
    if (currentErrors.length) { setErrors(currentErrors); return; }
    if (draft.currentStep === "jurisdiction") await fetchDepartments();
    if (draft.currentStep === "department") await fetchAuthorities();
    const next = draft.currentStep === "jurisdiction" ? "department" : draft.currentStep === "department" ? "authority" : draft.currentStep === "authority" ? "applicant" : draft.currentStep === "applicant" ? "request" : draft.currentStep === "request" ? "preferences" : draft.currentStep === "preferences" ? "review" : draft.currentStep === "review" ? "payment" : "success";
    patchDraft({ ...draft, currentStep: next as ManualStep });
  };
  const goBack = () => {
    const previous = draft.currentStep === "department" ? "jurisdiction" : draft.currentStep === "authority" ? "department" : draft.currentStep === "applicant" ? "authority" : draft.currentStep === "request" ? "applicant" : draft.currentStep === "preferences" ? "request" : draft.currentStep === "review" ? "preferences" : "payment";
    if (draft.currentStep !== "jurisdiction") patchDraft({ ...draft, currentStep: previous as ManualStep });
  };
  const fetchAuthorities = async () => {
    if (!draft.department || !draft.jurisdiction.state || !draft.jurisdiction.district) return;
    try {
      const response = await fetch("/api/authority", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: draft.jurisdiction.state, district: draft.jurisdiction.district, category: draft.department.category, issue: draft.request.informationRequested || draft.department.name }) });
      const result: unknown = await response.json();
      if (typeof result === "object" && result !== null && "candidates" in result && Array.isArray(result.candidates)) setAuthorities(result.candidates as AuthorityCandidate[]);
      if (typeof result === "object" && result !== null && "notice" in result && typeof result.notice === "string") setAuthorityNotice(result.notice);
    } catch { setAuthorityNotice("The authority directory could not be reached. Please try again."); }
  };
  const fetchDepartments = async () => {
    try {
      const response = await fetch("/api/authority/directory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft.jurisdiction) });
      const result: unknown = await response.json();
      if (typeof result === "object" && result !== null && "departments" in result && Array.isArray(result.departments)) setDirectoryDepartments(result.departments.filter((item): item is { id: string; name: string; category: string; authorityCount: number } => typeof item === "object" && item !== null && "id" in item && "name" in item && "category" in item && "authorityCount" in item && typeof item.id === "string" && typeof item.name === "string" && typeof item.category === "string" && typeof item.authorityCount === "number"));
    } catch { setDirectoryDepartments([]); }
  };
  const sendOtp = () => { if (isValidEmailAddress(draft.applicant.email)) setOtpSent(true); else setErrors(["Enter a valid email address before sending the demo OTP."]); };
  const verifyOtp = () => { if (otp === "123456") patchDraft(update(draft, "applicant", { ...draft.applicant, emailVerified: true })); else setErrors(["For this demo, enter OTP 123456."]); };
  const helpWrite = async () => {
    if (!draft.request.informationRequested.trim()) return;
    setAssistBusy(true);
    try {
      const response = await fetch("/api/intent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: draft.request.informationRequested, language: "English" }) });
      const result: unknown = await response.json();
      if (typeof result === "object" && result !== null && "intent" in result && typeof result.intent === "object" && result.intent !== null && "requestedInformation" in result.intent && Array.isArray(result.intent.requestedInformation)) {
        const items = result.intent.requestedInformation.filter((item): item is string => typeof item === "string");
        patchDraft(update(draft, "request", { ...draft.request, informationRequested: items.join("\n") }));
      }
    } finally { setAssistBusy(false); }
  };
  const completePayment = () => patchDraft({ ...draft, payment: { ...draft.payment, status: draft.payment.required ? "paid" : "not_required", transactionId: draft.payment.required ? `DEMO-UPI-${Date.now()}` : "" }, currentStep: "success", submission: { status: "submitted", registrationNumber: `MH-RTI-2026-${Math.floor(10000 + Math.random() * 90000)}`, submittedAt: new Date().toISOString() } });
  const subjectWords = draft.request.subject.trim() ? draft.request.subject.trim().split(/\s+/).filter(Boolean).length : 0;
  const departmentOptions = directoryDepartments.length ? directoryDepartments : departments.map(([id, name]) => ({ id, name, category: authorityCategories[id] ?? name, authorityCount: 0 }));
  const visibleDepartmentOptions = departmentOptions.filter((item) => item.name.toLowerCase().includes(departmentSearch.toLowerCase()));

  if (hasSavedDraft && draft.currentStep !== "success") return (
    <main style={{ maxWidth: "680px", margin: "0 auto", padding: "64px 20px" }}>
      <p style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--accent)" }}>Manual RTI filing</p>
      <h1 style={{ marginTop: "16px", fontSize: "clamp(2.4rem, 5vw, 3.5rem)", fontWeight: 700, letterSpacing: "-0.05em", color: "var(--green-dark)" }}>Continue your RTI application</h1>
      <p style={{ marginTop: "18px", fontSize: "15px", lineHeight: "1.75", color: "#4a5c52" }}>Your progress is saved on this device.</p>
      <div className="mt-9 flex flex-col gap-3 sm:flex-row">
        <button className="primary-button" onClick={continueDraft}>Resume application →</button>
        <button className="secondary-button" onClick={startNew}>Start new</button>
      </div>
    </main>
  );
  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 20px 64px" }}>
      {/* Header */}
      <header style={{ display: "flex", flexDirection: "column", gap: "20px", borderBottom: "1px solid var(--border)", paddingBottom: "28px", marginBottom: "0" }} className="sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/" style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", textDecoration: "underline", textDecorationColor: "var(--border)", textUnderlineOffset: "4px" }}>
            ← Saathi home
          </Link>
          <p style={{ marginTop: "24px", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--accent)" }}>Manual RTI filing</p>
          <h1 style={{ marginTop: "12px", fontSize: "clamp(2.4rem, 5vw, 3.8rem)", fontWeight: 700, letterSpacing: "-0.05em", color: "var(--green-dark)" }}>Tell us one thing at a time.</h1>
        </div>
        <p style={{ fontSize: "11.5px", color: "var(--text-faint)", background: "var(--green-light)", padding: "4px 12px", borderRadius: "100px", border: "1px solid var(--green-light-border)", height: "fit-content" }} role="status">Saved automatically</p>
      </header>

      {/* Step progress */}
      <div style={{ margin: "24px 0 8px", display: "flex", alignItems: "center", gap: "6px", overflowX: "auto", paddingBottom: "8px" }}>
        {steps.map((step, index) => (
          <div key={step.id} style={{ display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
            <span style={{
              display: "flex", height: "24px", width: "24px", alignItems: "center", justifyContent: "center",
              borderRadius: "50%", fontSize: "10px", fontWeight: 700,
              background: index === currentIndex ? "var(--accent)" : index < currentIndex ? "var(--green-dark)" : "transparent",
              border: index === currentIndex || index < currentIndex ? "none" : "1.5px solid var(--border)",
              color: index === currentIndex || index < currentIndex ? "white" : "var(--text-faint)",
            }}>{index < currentIndex ? "✓" : index + 1}</span>
            <span style={{ fontSize: "12px", fontWeight: index === currentIndex ? 600 : 400, color: index === currentIndex ? "var(--foreground)" : "var(--text-faint)" }}>{step.label}</span>
            {index < steps.length - 1 ? <span style={{ margin: "0 4px", color: "var(--border)", fontWeight: 300 }}>—</span> : null}
          </div>
        ))}
      </div>

      {/* Errors */}
      {errors.length ? (
        <div role="alert" style={{
          marginBottom: "24px", borderLeft: "3px solid #c0442a", background: "var(--accent-light)",
          padding: "14px 18px", fontSize: "13.5px", lineHeight: "1.65", color: "#a33020",
          borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
        }}>
          <strong>{errors.length} thing{errors.length > 1 ? "s" : ""} need your attention</strong>
          <ul style={{ marginTop: "8px", paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "4px" }}>
            {errors.map((error) => <li key={error} style={{ listStyle: "disc" }}>{error}</li>)}
          </ul>
        </div>
      ) : null}

      <WizardContent
        draft={draft} patchDraft={patchDraft} visibleDepartments={visibleDepartmentOptions}
        departmentSearch={departmentSearch} setDepartmentSearch={setDepartmentSearch}
        authorities={authorities} authorityNotice={authorityNotice} otp={otp} setOtp={setOtp}
        otpSent={otpSent} sendOtp={sendOtp} verifyOtp={verifyOtp}
        requestChoices={requestChoices} subjectWords={subjectWords} helpWrite={helpWrite}
        assistBusy={assistBusy} completePayment={completePayment}
      />

      {/* Navigation */}
      <div style={{
        marginTop: "32px", display: "flex", flexDirection: "column-reverse", gap: "12px",
        borderTop: "1px solid var(--border)", paddingTop: "20px",
      }} className="sm:flex-row sm:items-center sm:justify-between">
        {draft.currentStep === "success"
          ? <Link className="secondary-button" href="/rti/track">Track application</Link>
          : <button className="secondary-button" onClick={goBack} disabled={draft.currentStep === "jurisdiction"}>← Back</button>}
        {draft.currentStep !== "success" && draft.currentStep !== "payment"
          ? <button className="primary-button" onClick={() => void goNext()}>{draft.currentStep === "review" ? "Continue to mock payment" : "Continue"} →</button>
          : draft.currentStep === "payment"
            ? <button className="primary-button" onClick={completePayment}>Complete mock submission →</button>
            : null}
      </div>
    </main>
  );
}

interface ContentProps { draft: RTIApplicationDraft; patchDraft: (draft: RTIApplicationDraft) => void; visibleDepartments: ReadonlyArray<{ id: string; name: string; category: string; authorityCount: number }>; departmentSearch: string; setDepartmentSearch: (value: string) => void; authorities: AuthorityCandidate[]; authorityNotice: string; otp: string; setOtp: (value: string) => void; otpSent: boolean; sendOtp: () => void; verifyOtp: () => void; requestChoices: string[]; subjectWords: number; helpWrite: () => Promise<void>; assistBusy: boolean; completePayment: () => void; }
function WizardContent({ draft, patchDraft, visibleDepartments, departmentSearch, setDepartmentSearch, authorities, authorityNotice, otp, setOtp, otpSent, sendOtp, verifyOtp, requestChoices, subjectWords, helpWrite, assistBusy }: ContentProps) {
  const setJurisdiction = (value: Partial<RTIApplicationDraft["jurisdiction"]>) => patchDraft({ ...draft, jurisdiction: { ...draft.jurisdiction, ...value } });
  if (draft.currentStep === "jurisdiction") return <Section eyebrow="Step 1" title="Where is this issue related to?" description="Use the place where the project, service, or decision happened."><div className="grid gap-4 sm:grid-cols-2"><label className="field-label">State<input className="field mt-2" value={draft.jurisdiction.state} onChange={(event) => setJurisdiction({ state: event.target.value })} placeholder="For example, Maharashtra" /></label><label className="field-label">District<input className="field mt-2" value={draft.jurisdiction.district} onChange={(event) => setJurisdiction({ district: event.target.value })} placeholder="For example, Nashik" /></label><label className="field-label">City or village<input className="field mt-2" value={draft.jurisdiction.city} onChange={(event) => setJurisdiction({ city: event.target.value })} placeholder="Optional" /></label><label className="field-label">Pincode<input className="field mt-2" value={draft.jurisdiction.pincode} onChange={(event) => setJurisdiction({ pincode: event.target.value })} placeholder="Optional" /></label></div><p className="mt-5 text-sm leading-6 text-[#526158]">If you came from the AI flow, you can copy its confirmed location here without entering it again.</p></Section>;
  if (draft.currentStep === "department") return <Section eyebrow="Step 2" title="Which government area is this about?" description="Choose the closest service area. We will use your location to narrow the authority list."><input className="field" value={departmentSearch} onChange={(event) => setDepartmentSearch(event.target.value)} placeholder="Search government areas" /><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visibleDepartments.map((item) => <button key={item.id} className={`border p-4 text-left ${draft.department?.id === item.id ? "border-[#ec6a2c] bg-[#fff4ee]" : "border-[#cbd8ce] bg-white/60 hover:border-[#13201c]"}`} onClick={() => patchDraft({ ...draft, department: { id: item.id, name: item.name, category: item.category }, publicAuthority: null })}><span className="block text-sm font-semibold text-[#13201c]">{item.name}</span><span className="mt-2 block text-xs leading-5 text-[#6c7770]">{item.authorityCount ? `${item.authorityCount} authority record${item.authorityCount === 1 ? "" : "s"} available.` : "Select this if it best describes your issue."}</span></button>)}</div></Section>;
  if (draft.currentStep === "authority") return <Section eyebrow="Step 3" title="Which government office should receive this?" description="These are official directory matches for your location and chosen area. We will not create an authority from guesswork.">{authorities.length ? <div className="grid gap-3">{authorities.map((authority) => <button key={authority.id} className={`border p-4 text-left ${draft.publicAuthority?.id === authority.id ? "border-[#ec6a2c] bg-[#fff4ee]" : "border-[#cbd8ce] bg-white/60 hover:border-[#13201c]"}`} onClick={() => patchDraft({ ...draft, publicAuthority: authority })}><span className="block text-sm font-semibold text-[#13201c]">{authority.publicAuthority}</span><span className="mt-2 block text-xs leading-5 text-[#6c7770]">{authority.department} · {authority.district}</span></button>)}</div> : <div className="border-l-2 border-[#ec6a2c] bg-[#fff4ee] px-4 py-4 text-sm leading-6 text-[#526158]">{authorityNotice || "No verified authority matches this location yet. Try another department or add more location detail."}</div>}</Section>;
  if (draft.currentStep === "applicant") return <Section eyebrow="Step 4" title="Tell us about you" description="We need these contact details to identify the applicant and demonstrate the contact-verification step."><div className="grid gap-4 sm:grid-cols-2"><label className="field-label">Your full name<input className="field mt-2" value={draft.applicant.fullName} onChange={(event) => patchDraft({ ...draft, applicant: { ...draft.applicant, fullName: event.target.value } })} /></label><label className="field-label">Mobile number<input className="field mt-2" value={draft.applicant.mobile} onChange={(event) => patchDraft({ ...draft, applicant: { ...draft.applicant, mobile: event.target.value } })} placeholder="10-digit Indian mobile number" /></label><label className="field-label">Email address<input className="field mt-2" type="email" value={draft.applicant.email} onChange={(event) => patchDraft({ ...draft, applicant: { ...draft.applicant, email: event.target.value, emailVerified: false } })} /></label><label className="field-label sm:col-span-2">Your complete address<textarea className="field mt-2 min-h-28 resize-y" value={draft.applicant.address} onChange={(event) => patchDraft({ ...draft, applicant: { ...draft.applicant, address: event.target.value } })} /></label></div><div className="mt-7 border-t border-[#dbe3dc] pt-5"><p className="text-sm font-semibold text-[#13201c]">Email verification (demo)</p><p className="mt-2 text-xs leading-5 text-[#6c7770]">No email is sent. Use OTP 123456 after selecting Send OTP.</p><div className="mt-3 flex flex-col gap-3 sm:flex-row"><button className="secondary-button" onClick={sendOtp} disabled={draft.applicant.emailVerified}>Send OTP</button>{otpSent ? <><input className="field sm:max-w-48" value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="6-digit OTP" inputMode="numeric" /><button className="primary-button" onClick={verifyOtp}>Verify email</button></> : null}</div>{draft.applicant.emailVerified ? <p className="mt-3 text-xs font-semibold text-[#2e5b43]">Email verified for this demo ✓</p> : null}</div></Section>;
  if (draft.currentStep === "request") return <Section eyebrow="Step 5" title="What information do you want?" description="Ask for records, documents, amounts, dates, decisions, or other information held by the office."><label className="field-label">Subject of your request<textarea className="field mt-2 min-h-24 resize-y" value={draft.request.subject} onChange={(event) => patchDraft({ ...draft, request: { ...draft.request, subject: event.target.value } })} placeholder="Information regarding…" /><span className={`mt-2 block text-right text-xs ${subjectWords > 150 ? "text-[#a35233]" : "text-[#6c7770]"}`}>{subjectWords}/150 words</span></label><label className="mt-5 block field-label">Detailed information requested<textarea className="field mt-2 min-h-48 resize-y" value={draft.request.informationRequested} onChange={(event) => patchDraft({ ...draft, request: { ...draft.request, informationRequested: event.target.value } })} placeholder="For example: copy of the work order, sanctioned amount, expenditure and current completion status…" /></label><div className="mt-5 flex flex-wrap gap-2">{requestChoices.map((choice) => <button key={choice} className={`border px-3 py-2 text-xs ${draft.request.structuredItems.includes(choice) ? "border-[#ec6a2c] bg-[#fff4ee]" : "border-[#cbd8ce] bg-white/60"}`} onClick={() => { const items = draft.request.structuredItems.includes(choice) ? draft.request.structuredItems.filter((item) => item !== choice) : [...draft.request.structuredItems, choice]; patchDraft({ ...draft, request: { ...draft.request, structuredItems: items } }); }}>{choice}</button>)}</div><button className="secondary-button mt-6" onClick={() => void helpWrite()} disabled={assistBusy || !draft.request.informationRequested.trim()}>{assistBusy ? "Writing suggestion…" : "✨ Help me write this"}</button><p className="mt-2 text-xs text-[#6c7770]">The suggestion will replace nothing silently; review and edit it yourself.</p></Section>;
  if (draft.currentStep === "preferences") return <Section eyebrow="Step 6" title="Choose your preferences" description="A clear period and delivery method help the office answer your request properly."><label className="field-label">What time period does this information relate to?<select className="field mt-2" value={draft.informationPeriod.type} onChange={(event) => patchDraft({ ...draft, informationPeriod: { ...draft.informationPeriod, type: event.target.value } })}><option value="">Choose a period</option><option>Specific year</option><option>Date range</option><option>Financial year</option><option>From a date</option><option>Until a date</option><option>No specific period</option></select></label>{draft.informationPeriod.type && draft.informationPeriod.type !== "No specific period" ? <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="field-label">From<input className="field mt-2" value={draft.informationPeriod.from} onChange={(event) => patchDraft({ ...draft, informationPeriod: { ...draft.informationPeriod, from: event.target.value } })} placeholder="2024-2025 or date" /></label><label className="field-label">To<input className="field mt-2" value={draft.informationPeriod.to} onChange={(event) => patchDraft({ ...draft, informationPeriod: { ...draft.informationPeriod, to: event.target.value } })} placeholder="Optional" /></label></div> : null}<label className="mt-7 block field-label">How would you like to receive the information?<select className="field mt-2" value={draft.delivery.mode} onChange={(event) => patchDraft({ ...draft, delivery: { mode: event.target.value } })}><option value="">Choose delivery method</option><option>Email</option><option>Registered post</option><option>In person</option><option>Online portal</option><option>Personal pen drive</option></select></label><fieldset className="mt-7"><legend className="field-label">Are you a Below Poverty Line (BPL) applicant?</legend><div className="mt-3 flex gap-5 text-sm"><label><input type="radio" checked={!draft.bpl.isBpl} onChange={() => patchDraft({ ...draft, bpl: { ...draft.bpl, isBpl: false, proofFileName: "" }, payment: { ...draft.payment, required: true, amount: 10 } })} /> No</label><label><input type="radio" checked={draft.bpl.isBpl} onChange={() => patchDraft({ ...draft, bpl: { ...draft.bpl, isBpl: true }, payment: { ...draft.payment, required: false, amount: 0, status: "not_required" } })} /> Yes</label></div></fieldset>{draft.bpl.isBpl ? <label className="mt-4 block field-label">BPL proof<input className="field mt-2" type="file" accept="application/pdf,image/*" onChange={(event) => patchDraft({ ...draft, bpl: { ...draft.bpl, proofFileName: event.target.files?.[0]?.name ?? "" } })} /><span className="mt-2 block text-xs text-[#6c7770]">For this prototype, only the file name is saved locally. Do not upload Aadhaar, PAN, or unnecessary identity documents.</span></label> : null}<label className="mt-7 block field-label">Supporting document (optional)<input className="field mt-2" type="file" accept="application/pdf,image/*,.doc,.docx" onChange={(event) => { const file = event.target.files?.[0]; if (file) patchDraft({ ...draft, attachments: [{ id: `attachment-${Date.now()}`, name: file.name, size: file.size, type: file.type }] }); }} /><span className="mt-2 block text-xs text-[#6c7770]">Attach only documents that support your request. Avoid personal identification documents.</span></label></Section>;
  if (draft.currentStep === "review") return <Section eyebrow="Step 7" title="Review your RTI application" description="Edit any section before the mock payment. Nothing is submitted until you confirm it."><div className="space-y-5">{[["Location", `${draft.jurisdiction.district}, ${draft.jurisdiction.state}`], ["Department", draft.department?.name ?? "Not selected"], ["Government office", draft.publicAuthority?.publicAuthority ?? "Not selected"], ["Applicant", `${draft.applicant.fullName} · ${draft.applicant.email}`], ["Subject", draft.request.subject], ["Information requested", draft.request.informationRequested], ["Information period", `${draft.informationPeriod.type}${draft.informationPeriod.from ? `: ${draft.informationPeriod.from} → ${draft.informationPeriod.to}` : ""}`], ["Delivery", draft.delivery.mode], ["BPL", draft.bpl.isBpl ? `Yes · ${draft.bpl.proofFileName}` : "No"], ["Attachments", draft.attachments.length ? draft.attachments.map((item) => item.name).join(", ") : "None"]].map(([label, value]) => <div key={label} className="border-b border-[#dbe3dc] pb-4"><p className="meta-label">{label}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#13201c]">{value}</p></div>)}</div></Section>;
  if (draft.currentStep === "payment") return <Section eyebrow="Mock payment" title="Confirm your demo payment" description="This is not a government payment and no real filing will occur."><div className="border-y border-[#dbe3dc] py-6"><div className="flex justify-between text-sm"><span>RTI application fee</span><strong>₹{draft.payment.amount}</strong></div><p className="mt-3 text-xs leading-5 text-[#6c7770]">{draft.bpl.isBpl ? "BPL applicants: no fee in this prototype when valid proof is attached." : "Demo fee based on the selected Maharashtra rules configuration."}</p></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><button className="secondary-button">UPI</button><button className="secondary-button">Card</button><button className="secondary-button">Net banking</button></div></Section>;
  return <Section eyebrow="Complete" title="Your RTI application is ready" description="This prototype has created a simulated application record. It has not been filed with a government portal."><div className="border-y border-[#dbe3dc] py-6"><p className="meta-label">Application ID</p><p className="mt-3 font-mono text-2xl font-semibold tracking-[0.08em] text-[#13201c]">{draft.submission.registrationNumber}</p><p className="mt-5 text-sm leading-6 text-[#526158]">Department: {draft.department?.name}<br />Government office: {draft.publicAuthority?.publicAuthority}<br />Payment: {draft.payment.status === "paid" ? "Mock payment successful" : "Not required"}</p></div></Section>;
}


function Section({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: "32px", maxWidth: "860px" }}>
      <p style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--accent)" }}>{eyebrow}</p>
      <h2 style={{ marginTop: "12px", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 700, letterSpacing: "-0.05em", color: "var(--green-dark)" }}>{title}</h2>
      <p style={{ marginTop: "12px", maxWidth: "640px", fontSize: "14.5px", lineHeight: "1.75", color: "#4a5c52" }}>{description}</p>
      <div style={{
        marginTop: "24px",
        border: "1.5px solid var(--border)",
        background: "rgba(255,255,255,0.65)",
        padding: "24px",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow-sm)",
      }}>
        {children}
      </div>
    </section>
  );
}

