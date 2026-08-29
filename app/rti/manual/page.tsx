"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import type { AuthorityCandidate } from "@/lib/authority/types";
import { isValidEmailAddress, isValidMobileNumber } from "@/lib/applications/validation";
import { createManualDraft, type ManualStep, type RTIApplicationDraft } from "@/lib/manual/types";
import { MOCK_POC_LOCATIONS } from "@/lib/mock/rti";

type Language = "English" | "हिन्दी" | "मराठी";

const translations = {
  English: {
    home: "Home",
    manualRTIFiling: "Manual RTI Filing",
    stepOf: "Step",
    continueTitle: "Continue your RTI application",
    progressSaved: "Your progress is saved on this device.",
    resumeApplication: "Resume application",
    startNew: "Start new",
    back: "Back",
    continue: "Continue",
    trackApplication: "Track application",
    completeDemoSubmission: "Complete demo submission",
    pleaseFix: "Please fix",
    items: "items",
    item: "item",
    
    // Step labels
    location: "Location",
    department: "Department",
    govOffice: "Government office",
    yourDetails: "Your details",
    request: "Request",
    preferences: "Preferences",
    review: "Review",
    
    // Step 1 - Jurisdiction
    step1Eyebrow: "Step 1",
    step1Title: "Where is this issue?",
    step1Desc: "Select the location related to your issue.",
    state: "State",
    selectState: "Select state",
    district: "District",
    selectDistrict: "Select district",
    cityVillage: "City or village",
    selectCityVillage: "Select city or village",
    pincode: "Pincode",
    selectPincode: "Select pincode",
    
    // Step 2 - Department
    step2Eyebrow: "Step 2",
    step2Title: "What is this about?",
    step2Desc: "Choose the area that best matches your issue.",
    searchDepartments: "Search departments",
    
    // Step 3 - Authority
    step3Eyebrow: "Step 3",
    step3Title: "Choose the government office",
    step3Desc: "Select the office that matches your issue.",
    noOfficeFound: "No matching office found. Try another department or add more location detail.",
    
    // Step 4 - Applicant
    step4Eyebrow: "Step 4",
    step4Title: "Your details",
    step4Desc: "Contact information for your application.",
    fullName: "Full name",
    mobileNumber: "Mobile number",
    mobileNumberPlaceholder: "10-digit number",
    email: "Email",
    address: "Address",
    emailVerification: "Email verification",
    demoOTP: "(Demo: use OTP 123456)",
    sendOTP: "Send OTP",
    otpPlaceholder: "6-digit OTP",
    verify: "Verify",
    verified: "✓ Verified",
    
    // Step 5 - Request
    step5Eyebrow: "Step 5",
    step5Title: "What information do you want?",
    step5Desc: "Describe the records or information you need.",
    subject: "Subject",
    subjectPlaceholder: "Brief description",
    words: "words",
    detailedInformation: "Detailed information",
    detailedPlaceholder: "E.g.: work order copy, sanctioned amount, expenditure, completion status",
    helpMeWrite: "✨ Help me write",
    writing: "Writing...",
    
    // Step 6 - Preferences
    step6Eyebrow: "Step 6",
    step6Title: "Final details",
    step6Desc: "Choose time period and delivery preferences.",
    timePeriod: "Time period",
    choosePeriod: "Choose period",
    deliveryMode: "Delivery mode",
    chooseDelivery: "Choose delivery",
    bplStatus: "BPL status",
    bplQuestion: "Are you below poverty line?",
    
    // Success
    successTitle: "Application submitted!",
    successDesc: "Your RTI application has been submitted successfully.",
    applicationNumber: "Application Number",
    
    // Department names
    roadsPublicWorks: "Roads & Public Works",
    education: "Education",
    health: "Health",
    agriculture: "Agriculture",
    waterResources: "Water Resources",
    ruralDevelopment: "Rural Development",
    municipalServices: "Municipal Services",
    housing: "Housing",
    revenueLand: "Revenue / Land",
    police: "Police",
    other: "Other",
  },
  हिन्दी: {
    home: "होम",
    manualRTIFiling: "मैन्युअल आरटीआई फाइलिंग",
    stepOf: "चरण",
    continueTitle: "अपना आरटीआई आवेदन जारी रखें",
    progressSaved: "आपकी प्रगति इस उपकरण पर सहेजी गई है।",
    resumeApplication: "आवेदन फिर से शुरू करें",
    startNew: "नया शुरू करें",
    back: "वापस",
    continue: "जारी रखें",
    trackApplication: "आवेदन ट्रैक करें",
    completeDemoSubmission: "डेमो सबमिशन पूर्ण करें",
    pleaseFix: "कृपया ठीक करें",
    items: "आइटम",
    item: "आइटम",
    
    location: "स्थान",
    department: "विभाग",
    govOffice: "सरकारी कार्यालय",
    yourDetails: "आपका विवरण",
    request: "अनुरोध",
    preferences: "प्राथमिकताएं",
    review: "समीक्षा",
    
    step1Eyebrow: "चरण 1",
    step1Title: "यह मुद्दा कहाँ है?",
    step1Desc: "अपने मुद्दे से संबंधित स्थान चुनें।",
    state: "राज्य",
    selectState: "राज्य चुनें",
    district: "जिला",
    selectDistrict: "जिला चुनें",
    cityVillage: "शहर या गाँव",
    selectCityVillage: "शहर या गाँव चुनें",
    pincode: "पिनकोड",
    selectPincode: "पिनकोड चुनें",
    
    step2Eyebrow: "चरण 2",
    step2Title: "यह किस बारे में है?",
    step2Desc: "वह क्षेत्र चुनें जो आपके मुद्दे से मेल खाता है।",
    searchDepartments: "विभाग खोजें",
    
    step3Eyebrow: "चरण 3",
    step3Title: "सरकारी कार्यालय चुनें",
    step3Desc: "वह कार्यालय चुनें जो आपके मुद्दे से मेल खाता है।",
    noOfficeFound: "कोई मेल खाने वाला कार्यालय नहीं मिला। कोई अन्य विभाग आज़माएं या अधिक स्थान विवरण जोड़ें।",
    
    step4Eyebrow: "चरण 4",
    step4Title: "आपका विवरण",
    step4Desc: "आपके आवेदन के लिए संपर्क जानकारी।",
    fullName: "पूरा नाम",
    mobileNumber: "मोबाइल नंबर",
    mobileNumberPlaceholder: "10-अंकीय नंबर",
    email: "ईमेल",
    address: "पता",
    emailVerification: "ईमेल सत्यापन",
    demoOTP: "(डेमो: OTP 123456 उपयोग करें)",
    sendOTP: "OTP भेजें",
    otpPlaceholder: "6-अंकीय OTP",
    verify: "सत्यापित करें",
    verified: "✓ सत्यापित",
    
    step5Eyebrow: "चरण 5",
    step5Title: "आपको कौन सी जानकारी चाहिए?",
    step5Desc: "आपको जो रिकॉर्ड या जानकारी चाहिए उसका वर्णन करें।",
    subject: "विषय",
    subjectPlaceholder: "संक्षिप्त विवरण",
    words: "शब्द",
    detailedInformation: "विस्तृत जानकारी",
    detailedPlaceholder: "उदाहरण: कार्य आदेश प्रति, स्वीकृत राशि, व्यय, पूर्णता स्थिति",
    helpMeWrite: "✨ लिखने में मदद करें",
    writing: "लिख रहे हैं...",
    
    step6Eyebrow: "चरण 6",
    step6Title: "अंतिम विवरण",
    step6Desc: "समय अवधि और वितरण प्राथमिकताएं चुनें।",
    timePeriod: "समय अवधि",
    choosePeriod: "अवधि चुनें",
    deliveryMode: "वितरण मोड",
    chooseDelivery: "वितरण चुनें",
    bplStatus: "BPL स्थिति",
    bplQuestion: "क्या आप गरीबी रेखा से नीचे हैं?",
    
    successTitle: "आवेदन जमा किया गया!",
    successDesc: "आपका आरटीआई आवेदन सफलतापूर्वक जमा कर दिया गया है।",
    applicationNumber: "आवेदन संख्या",
    
    roadsPublicWorks: "सड़क और जन निर्माण",
    education: "शिक्षा",
    health: "स्वास्थ्य",
    agriculture: "कृषि",
    waterResources: "जल संसाधन",
    ruralDevelopment: "ग्रामीण विकास",
    municipalServices: "नगरपालिका सेवाएं",
    housing: "आवास",
    revenueLand: "राजस्व / भूमि",
    police: "पुलिस",
    other: "अन्य",
  },
  मराठी: {
    home: "होम",
    manualRTIFiling: "मॅन्युअल आरटीआय फाइलिंग",
    stepOf: "पायरी",
    continueTitle: "तुमचा आरटीआय अर्ज सुरू ठेवा",
    progressSaved: "तुमची प्रगती या डिव्हाइसवर जतन केली आहे.",
    resumeApplication: "अर्ज पुन्हा सुरू करा",
    startNew: "नवीन सुरू करा",
    back: "मागे",
    continue: "सुरू ठेवा",
    trackApplication: "अर्ज ट्रॅक करा",
    completeDemoSubmission: "डेमो सबमिशन पूर्ण करा",
    pleaseFix: "कृपया दुरुस्त करा",
    items: "आयटम",
    item: "आयटम",
    
    location: "स्थान",
    department: "विभाग",
    govOffice: "सरकारी कार्यालय",
    yourDetails: "तुमचा तपशील",
    request: "विनंती",
    preferences: "प्राधान्ये",
    review: "पुनरावलोकन",
    
    step1Eyebrow: "पायरी 1",
    step1Title: "हा मुद्दा कुठे आहे?",
    step1Desc: "तुमच्या समस्येशी संबंधित स्थान निवडा.",
    state: "राज्य",
    selectState: "राज्य निवडा",
    district: "जिल्हा",
    selectDistrict: "जिल्हा निवडा",
    cityVillage: "शहर किंवा गाव",
    selectCityVillage: "शहर किंवा गाव निवडा",
    pincode: "पिनकोड",
    selectPincode: "पिनकोड निवडा",
    
    step2Eyebrow: "पायरी 2",
    step2Title: "हे कशाबद्दल आहे?",
    step2Desc: "तुमच्या समस्येशी जुळणारे क्षेत्र निवडा.",
    searchDepartments: "विभाग शोधा",
    
    step3Eyebrow: "पायरी 3",
    step3Title: "सरकारी कार्यालय निवडा",
    step3Desc: "तुमच्या समस्येशी जुळणारे कार्यालय निवडा.",
    noOfficeFound: "कोणतेही जुळणारे कार्यालय आढळले नाही. दुसरा विभाग वापरून पहा किंवा अधिक स्थान तपशील जोडा.",
    
    step4Eyebrow: "पायरी 4",
    step4Title: "तुमचा तपशील",
    step4Desc: "तुमच्या अर्जासाठी संपर्क माहिती.",
    fullName: "पूर्ण नाव",
    mobileNumber: "मोबाइल नंबर",
    mobileNumberPlaceholder: "10-अंकी नंबर",
    email: "ईमेल",
    address: "पत्ता",
    emailVerification: "ईमेल सत्यापन",
    demoOTP: "(डेमो: OTP 123456 वापरा)",
    sendOTP: "OTP पाठवा",
    otpPlaceholder: "6-अंकी OTP",
    verify: "सत्यापित करा",
    verified: "✓ सत्यापित",
    
    step5Eyebrow: "पायरी 5",
    step5Title: "तुम्हाला कोणती माहिती हवी आहे?",
    step5Desc: "तुम्हाला आवश्यक असलेले रेकॉर्ड किंवा माहितीचे वर्णन करा.",
    subject: "विषय",
    subjectPlaceholder: "संक्षिप्त वर्णन",
    words: "शब्द",
    detailedInformation: "तपशीलवार माहिती",
    detailedPlaceholder: "उदा.: कार्य आदेश प्रत, मंजूर रक्कम, खर्च, पूर्णता स्थिती",
    helpMeWrite: "✨ लिहिण्यास मदत करा",
    writing: "लिहित आहे...",
    
    step6Eyebrow: "पायरी 6",
    step6Title: "अंतिम तपशील",
    step6Desc: "कालावधी आणि वितरण प्राधान्ये निवडा.",
    timePeriod: "कालावधी",
    choosePeriod: "कालावधी निवडा",
    deliveryMode: "वितरण मोड",
    chooseDelivery: "वितरण निवडा",
    bplStatus: "BPL स्थिती",
    bplQuestion: "तुम्ही दारिद्र्यरेषेखालील आहात का?",
    
    successTitle: "अर्ज सबमिट केला!",
    successDesc: "तुमचा आरटीआय अर्ज यशस्वीरित्या सबमिट केला गेला आहे.",
    applicationNumber: "अर्ज क्रमांक",
    
    roadsPublicWorks: "रस्ते आणि सार्वजनिक बांधकाम",
    education: "शिक्षण",
    health: "आरोग्य",
    agriculture: "शेती",
    waterResources: "जल संसाधन",
    ruralDevelopment: "ग्रामीण विकास",
    municipalServices: "नगरपालिका सेवा",
    housing: "गृहनिर्माण",
    revenueLand: "महसूल / जमीन",
    police: "पोलीस",
    other: "इतर",
  },
};

const STORAGE_KEY = "rti-manual-draft";
const LANGUAGE_KEY = "rti-language";
const departments = [
  ["roads", "Roads & Public Works"], ["education", "Education"], ["health", "Health"], ["agriculture", "Agriculture"],
  ["water", "Water Resources"], ["rural", "Rural Development"], ["municipal", "Municipal Services"], ["housing", "Housing"],
  ["revenue", "Revenue / Land"], ["police", "Police"], ["other", "Other"],
] as const;
const requestChoices = ["Sanctioned amount", "Amount released", "Expenditure", "Contractor details", "Work order", "Completion status", "Inspection report"];
const authorityCategories: Record<string, string> = { roads: "Rural development", education: "School education", health: "Public health", water: "Water supply and sanitation", rural: "Rural development", revenue: "Revenue and land records" };

const getSteps = (t: typeof translations.English): Array<{ id: ManualStep; label: string }> => [
  { id: "jurisdiction", label: t.location }, { id: "department", label: t.department }, { id: "authority", label: t.govOffice },
  { id: "applicant", label: t.yourDetails }, { id: "request", label: t.request }, { id: "preferences", label: t.preferences }, { id: "review", label: t.review },
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
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === "undefined") return "English";
    return (localStorage.getItem(LANGUAGE_KEY) as Language) || "English";
  });

  const t = translations[language];
  const steps = useMemo(() => getSteps(t), [t]);

  const hasSavedDraft = Boolean(storedDraft) && !resumeDismissed;

  const currentIndex = Math.max(0, steps.findIndex((step) => step.id === draft.currentStep));
  const mockStates = useMemo(() => Array.from(new Set(MOCK_POC_LOCATIONS.map((location) => location.state))), []);
  const mockDistricts = useMemo(() => Array.from(new Set(MOCK_POC_LOCATIONS.filter((location) => location.state === draft.jurisdiction.state).map((location) => location.district))), [draft.jurisdiction.state]);
  const mockCities = useMemo(() => Array.from(new Set(MOCK_POC_LOCATIONS.filter((location) => location.state === draft.jurisdiction.state && location.district === draft.jurisdiction.district).map((location) => location.city))), [draft.jurisdiction.state, draft.jurisdiction.district]);
  const mockPincodes = useMemo(() => Array.from(new Set(MOCK_POC_LOCATIONS.filter((location) => location.state === draft.jurisdiction.state && location.district === draft.jurisdiction.district && location.city === draft.jurisdiction.city).map((location) => location.pincode))), [draft.jurisdiction.state, draft.jurisdiction.district, draft.jurisdiction.city]);
  const visibleDepartments = useMemo(() => departments.filter((item) => item[1].toLowerCase().includes(departmentSearch.toLowerCase())), [departmentSearch]);
  const patchDraft = (next: RTIApplicationDraft) => { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); window.dispatchEvent(new Event("rti-manual-draft-change")); setErrors([]); };
  const startNew = () => { window.localStorage.removeItem(STORAGE_KEY); window.dispatchEvent(new Event("rti-manual-draft-change")); setResumeDismissed(true); };
  const continueDraft = () => setResumeDismissed(true);
  const stepError = (step: ManualStep): string[] => {
    if (step === "jurisdiction") return draft.jurisdiction.state && draft.jurisdiction.district && draft.jurisdiction.city && draft.jurisdiction.pincode ? [] : ["Select a state, district, city or village, and pincode for this issue."];
    if (step === "department") return draft.department ? [] : ["Choose the government area that best matches your issue."];
    if (step === "authority") return draft.publicAuthority ? [] : ["Select a government office before continuing."];
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
      if (typeof result === "object" && result !== null && "candidates" in result && Array.isArray(result.candidates)) {
        const candidates = result.candidates as AuthorityCandidate[];
        setAuthorities(candidates.filter((authority) => authority.dataOrigin !== "mock-poc" || (authority.city === draft.jurisdiction.city && authority.pincode === draft.jurisdiction.pincode)));
      }
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
    <main className="max-w-[600px] mx-auto px-4 py-12 sm:px-6 sm:py-20">
      <span className="font-semibold uppercase text-neutral-500 text-[10px] leading-3 tracking-[1.1px] sm:text-xs sm:leading-4 sm:tracking-[1.28px]">{t.manualRTIFiling}</span>
      <h1 className="mt-3 font-bold text-neutral-950 text-[24px] leading-[30px] sm:mt-4 sm:text-[32px] sm:leading-[38px]">{t.continueTitle}</h1>
      <p className="mt-2 text-neutral-500 text-sm leading-5 sm:mt-3 sm:text-base sm:leading-6">{t.progressSaved}</p>
      <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row">
        <button
          className="font-semibold rounded-lg bg-neutral-900 text-neutral-50 text-[15px] px-6 h-11 flex items-center justify-center gap-2 border-0 cursor-pointer w-full sm:w-auto"
          onClick={continueDraft}
        >
          {t.resumeApplication}
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <button
          className="font-semibold rounded-lg bg-white text-neutral-950 text-[15px] border-neutral-900 border-1 border-solid px-6 h-11 flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
          onClick={startNew}
        >
          {t.startNew}
        </button>
      </div>
    </main>
  );
  return (
    <main className="max-w-[1000px] mx-auto p-4 sm:p-6 lg:p-12">
      {/* Compact Header */}
      <header className="flex flex-col gap-3 border-neutral-200 border-b-1 border-solid pb-4 mb-6 sm:gap-4 sm:pb-6 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/" className="font-medium text-neutral-500 text-xs leading-4 flex items-center gap-1.5 hover:text-neutral-950 sm:text-sm sm:leading-5 sm:gap-2">
            <svg className="size-3.5 sm:size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t.home}
          </Link>
          <span className="font-semibold uppercase text-neutral-500 text-[10px] leading-3 tracking-[1.1px] sm:text-xs sm:leading-4 sm:tracking-[1.28px]">{t.manualRTIFiling}</span>
        </div>
        <div className="flex items-center gap-3">
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
          {draft.currentStep !== "success" && draft.currentStep !== "payment" ? (
            <span className="text-[10px] text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-lg border-neutral-200 border-1 border-solid sm:text-xs sm:px-3 sm:py-1.5">{t.stepOf} {currentIndex + 1} of 7</span>
          ) : null}
        </div>
      </header>

      {/* Compact Progress - Hide on success/payment */}
      {draft.currentStep !== "success" && draft.currentStep !== "payment" ? (
        <div className="mb-6 flex items-center gap-1.5 overflow-x-auto pb-2 sm:mb-8 sm:gap-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-1.5 flex-1 min-w-0 sm:gap-2">
              <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-semibold sm:h-8 sm:w-8 sm:text-xs ${
                index === currentIndex 
                  ? "bg-neutral-900 text-white" 
                  : index < currentIndex 
                  ? "bg-green-600 text-white" 
                  : "bg-neutral-100 text-neutral-400 border-neutral-200 border-1 border-solid"
              }`}>
                {index < currentIndex ? (
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : index + 1}
              </span>
              <span className={`hidden sm:inline text-xs font-medium overflow-hidden text-ellipsis whitespace-nowrap ${
                index === currentIndex ? "text-neutral-950" : "text-neutral-400"
              }`}>{step.label}</span>
              {index < steps.length - 1 ? (
                <div className="flex-1 h-0.5 bg-neutral-200 mx-2" />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {/* Errors */}
      {errors.length ? (
        <div role="alert" className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
          <p className="font-semibold text-sm text-red-900 mb-2">{t.pleaseFix} {errors.length} {errors.length > 1 ? t.items : t.item}:</p>
          <ul className="text-sm text-red-700 space-y-1 pl-5 list-disc">
            {errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </div>
      ) : null}

      <WizardContent
        draft={draft} patchDraft={patchDraft} visibleDepartments={visibleDepartmentOptions}
        mockStates={mockStates} mockDistricts={mockDistricts} mockCities={mockCities} mockPincodes={mockPincodes}
        departmentSearch={departmentSearch} setDepartmentSearch={setDepartmentSearch}
        authorities={authorities} authorityNotice={authorityNotice} otp={otp} setOtp={setOtp}
        otpSent={otpSent} sendOtp={sendOtp} verifyOtp={verifyOtp}
        requestChoices={requestChoices} subjectWords={subjectWords} helpWrite={helpWrite}
        assistBusy={assistBusy} completePayment={completePayment}
        t={t}
      />

      {/* Navigation */}
      <div className="mt-8 pt-6 border-neutral-200 border-t-1 border-solid flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        {draft.currentStep === "success"
          ? <Link
              className="font-semibold rounded-lg bg-neutral-900 text-neutral-50 text-[15px] px-6 h-11 flex items-center justify-center gap-2 border-0"
              href="/rti/track"
            >
              {t.trackApplication}
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          : <button
              className="font-medium text-neutral-500 text-sm flex items-center gap-2 border-0 bg-transparent cursor-pointer hover:text-neutral-950 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={goBack}
              disabled={draft.currentStep === "jurisdiction"}
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {t.back}
            </button>}
        {draft.currentStep !== "success" && draft.currentStep !== "payment"
          ? <button
              className="font-semibold rounded-lg bg-neutral-900 text-neutral-50 text-[15px] px-6 h-11 flex items-center justify-center gap-2 border-0 cursor-pointer w-full sm:w-auto"
              onClick={() => void goNext()}
            >
              {t.continue}
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          : draft.currentStep === "payment"
            ? <button
                className="font-semibold rounded-lg bg-neutral-900 text-neutral-50 text-[15px] px-6 h-11 flex items-center justify-center gap-2 border-0 cursor-pointer w-full sm:w-auto"
                onClick={completePayment}
              >
                {t.completeDemoSubmission}
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
            : null}
      </div>
    </main>
  );
}

interface ContentProps { draft: RTIApplicationDraft; patchDraft: (draft: RTIApplicationDraft) => void; visibleDepartments: ReadonlyArray<{ id: string; name: string; category: string; authorityCount: number }>; mockStates: string[]; mockDistricts: string[]; mockCities: string[]; mockPincodes: string[]; departmentSearch: string; setDepartmentSearch: (value: string) => void; authorities: AuthorityCandidate[]; authorityNotice: string; otp: string; setOtp: (value: string) => void; otpSent: boolean; sendOtp: () => void; verifyOtp: () => void; requestChoices: string[]; subjectWords: number; helpWrite: () => Promise<void>; assistBusy: boolean; completePayment: () => void; t: typeof translations.English; }
function WizardContent({ draft, patchDraft, visibleDepartments, mockStates, mockDistricts, mockCities, mockPincodes, departmentSearch, setDepartmentSearch, authorities, authorityNotice, otp, setOtp, otpSent, sendOtp, verifyOtp, requestChoices, subjectWords, helpWrite, assistBusy, t }: ContentProps) {
  const setJurisdiction = (value: Partial<RTIApplicationDraft["jurisdiction"]>) => patchDraft({ ...draft, jurisdiction: { ...draft.jurisdiction, ...value } });
  if (draft.currentStep === "jurisdiction") return <Section eyebrow={t.step1Eyebrow} title={t.step1Title} description={t.step1Desc}><div className="grid gap-4 sm:grid-cols-2"><label className="field-label">{t.state}<select className="field mt-2" value={draft.jurisdiction.state} onChange={(event) => setJurisdiction({ state: event.target.value, district: "", city: "", pincode: "" })}><option value="">{t.selectState}</option>{mockStates.map((state) => <option key={state}>{state}</option>)}</select></label><label className="field-label">{t.district}<select className="field mt-2" value={draft.jurisdiction.district} onChange={(event) => setJurisdiction({ district: event.target.value, city: "", pincode: "" })} disabled={!draft.jurisdiction.state}><option value="">{t.selectDistrict}</option>{mockDistricts.map((district) => <option key={district}>{district}</option>)}</select></label><label className="field-label">{t.cityVillage}<select className="field mt-2" value={draft.jurisdiction.city} onChange={(event) => { const city = event.target.value; const location = MOCK_POC_LOCATIONS.find((item) => item.state === draft.jurisdiction.state && item.district === draft.jurisdiction.district && item.city === city); setJurisdiction({ city, pincode: location?.pincode ?? "" }); }} disabled={!draft.jurisdiction.district}><option value="">{t.selectCityVillage}</option>{mockCities.map((city) => <option key={city}>{city}</option>)}</select></label><label className="field-label">{t.pincode}<select className="field mt-2" value={draft.jurisdiction.pincode} onChange={(event) => setJurisdiction({ pincode: event.target.value })} disabled={!draft.jurisdiction.city}><option value="">{t.selectPincode}</option>{mockPincodes.map((pincode) => <option key={pincode}>{pincode}</option>)}</select></label></div></Section>;
  if (draft.currentStep === "department") return <Section eyebrow={t.step2Eyebrow} title={t.step2Title} description={t.step2Desc}><input className="field" value={departmentSearch} onChange={(event) => setDepartmentSearch(event.target.value)} placeholder={t.searchDepartments} /><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{visibleDepartments.map((item) => <button key={item.id} className={`border p-3 text-left rounded ${draft.department?.id === item.id ? "border-[#ec6a2c] bg-[#fff4ee]" : "border-[#cbd8ce] bg-white/60 hover:border-[#13201c]"}`} onClick={() => patchDraft({ ...draft, department: { id: item.id, name: item.name, category: item.category }, publicAuthority: null })}><span className="block text-sm font-semibold text-[#13201c]">{item.name}</span></button>)}</div></Section>;
  if (draft.currentStep === "authority") return <Section eyebrow={t.step3Eyebrow} title={t.step3Title} description={t.step3Desc}>{authorities.length ? <div className="grid gap-2">{authorities.map((authority) => <button key={authority.id} className={`border p-3 text-left rounded ${draft.publicAuthority?.id === authority.id ? "border-[#ec6a2c] bg-[#fff4ee]" : "border-[#cbd8ce] bg-white/60 hover:border-[#13201c]"}`} onClick={() => patchDraft({ ...draft, publicAuthority: authority })}><span className="block text-sm font-semibold text-[#13201c]">{authority.publicAuthority}</span><span className="mt-1 block text-xs text-[#6c7770]">{authority.department} · {authority.district}</span></button>)}</div> : <div className="border-l-2 border-[#ec6a2c] bg-[#fff4ee] px-3 py-3 text-sm text-[#526158]">{authorityNotice || t.noOfficeFound}</div>}</Section>;
  if (draft.currentStep === "applicant") return <Section eyebrow={t.step4Eyebrow} title={t.step4Title} description={t.step4Desc}><div className="grid gap-4 sm:grid-cols-2"><label className="field-label">{t.fullName}<input className="field mt-2" value={draft.applicant.fullName} onChange={(event) => patchDraft({ ...draft, applicant: { ...draft.applicant, fullName: event.target.value } })} /></label><label className="field-label">{t.mobileNumber}<input className="field mt-2" value={draft.applicant.mobile} onChange={(event) => patchDraft({ ...draft, applicant: { ...draft.applicant, mobile: event.target.value } })} placeholder={t.mobileNumberPlaceholder} /></label><label className="field-label">{t.email}<input className="field mt-2" type="email" value={draft.applicant.email} onChange={(event) => patchDraft({ ...draft, applicant: { ...draft.applicant, email: event.target.value, emailVerified: false } })} /></label><label className="field-label sm:col-span-2">{t.address}<textarea className="field mt-2 min-h-24 resize-y" value={draft.applicant.address} onChange={(event) => patchDraft({ ...draft, applicant: { ...draft.applicant, address: event.target.value } })} /></label></div><div className="mt-5 border-t border-[#dbe3dc] pt-4"><p className="text-sm font-semibold text-[#13201c]">{t.emailVerification} <span className="text-xs font-normal text-[#6c7770]">{t.demoOTP}</span></p><div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center"><button className="secondary-button" onClick={sendOtp} disabled={draft.applicant.emailVerified}>{t.sendOTP}</button>{otpSent ? <><input className="field sm:max-w-40" value={otp} onChange={(event) => setOtp(event.target.value)} placeholder={t.otpPlaceholder} inputMode="numeric" /><button className="primary-button" onClick={verifyOtp}>{t.verify}</button></> : null}{draft.applicant.emailVerified ? <span className="text-xs font-semibold text-[#2e5b43]">{t.verified}</span> : null}</div></div></Section>;
  if (draft.currentStep === "request") return <Section eyebrow={t.step5Eyebrow} title={t.step5Title} description={t.step5Desc}><label className="field-label">{t.subject}<textarea className="field mt-2 min-h-20 resize-y" value={draft.request.subject} onChange={(event) => patchDraft({ ...draft, request: { ...draft.request, subject: event.target.value } })} placeholder={t.subjectPlaceholder} /><span className={`mt-1 block text-right text-xs ${subjectWords > 150 ? "text-[#a35233]" : "text-[#6c7770]"}`}>{subjectWords}/150 {t.words}</span></label><label className="mt-4 block field-label">{t.detailedInformation}<textarea className="field mt-2 min-h-36 resize-y" value={draft.request.informationRequested} onChange={(event) => patchDraft({ ...draft, request: { ...draft.request, informationRequested: event.target.value } })} placeholder={t.detailedPlaceholder} /></label><div className="mt-4 flex flex-wrap gap-2">{requestChoices.map((choice) => <button key={choice} className={`border px-2.5 py-1.5 text-xs rounded ${draft.request.structuredItems.includes(choice) ? "border-[#ec6a2c] bg-[#fff4ee] font-medium" : "border-[#cbd8ce] bg-white/60"}`} onClick={() => { const items = draft.request.structuredItems.includes(choice) ? draft.request.structuredItems.filter((item) => item !== choice) : [...draft.request.structuredItems, choice]; patchDraft({ ...draft, request: { ...draft.request, structuredItems: items } }); }}>{choice}</button>)}</div><button className="secondary-button mt-4" onClick={() => void helpWrite()} disabled={assistBusy || !draft.request.informationRequested.trim()}>{assistBusy ? t.writing : t.helpMeWrite}</button></Section>;
  if (draft.currentStep === "preferences") return <Section eyebrow="Step 6" title="Final details" description="Choose time period and delivery preferences."><label className="field-label">Time period<select className="field mt-2" value={draft.informationPeriod.type} onChange={(event) => patchDraft({ ...draft, informationPeriod: { ...draft.informationPeriod, type: event.target.value } })}><option value="">Choose period</option><option>Specific year</option><option>Date range</option><option>Financial year</option><option>From a date</option><option>Until a date</option><option>No specific period</option></select></label>{draft.informationPeriod.type && draft.informationPeriod.type !== "No specific period" ? <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="field-label">From<input className="field mt-2" value={draft.informationPeriod.from} onChange={(event) => patchDraft({ ...draft, informationPeriod: { ...draft.informationPeriod, from: event.target.value } })} placeholder="E.g., 2024" /></label><label className="field-label">To<input className="field mt-2" value={draft.informationPeriod.to} onChange={(event) => patchDraft({ ...draft, informationPeriod: { ...draft.informationPeriod, to: event.target.value } })} placeholder="Optional" /></label></div> : null}<label className="mt-4 block field-label">Delivery method<select className="field mt-2" value={draft.delivery.mode} onChange={(event) => patchDraft({ ...draft, delivery: { mode: event.target.value } })}><option value="">Choose method</option><option>Email</option><option>Registered post</option><option>In person</option><option>Online portal</option><option>Personal pen drive</option></select></label><fieldset className="mt-4"><legend className="field-label">Below Poverty Line (BPL) applicant?</legend><div className="mt-2 flex gap-4 text-sm"><label><input type="radio" checked={!draft.bpl.isBpl} onChange={() => patchDraft({ ...draft, bpl: { ...draft.bpl, isBpl: false, proofFileName: "" }, payment: { ...draft.payment, required: true, amount: 10 } })} /> No</label><label><input type="radio" checked={draft.bpl.isBpl} onChange={() => patchDraft({ ...draft, bpl: { ...draft.bpl, isBpl: true }, payment: { ...draft.payment, required: false, amount: 0, status: "not_required" } })} /> Yes</label></div></fieldset>{draft.bpl.isBpl ? <label className="mt-3 block field-label">BPL proof<input className="field mt-2" type="file" accept="application/pdf,image/*" onChange={(event) => patchDraft({ ...draft, bpl: { ...draft.bpl, proofFileName: event.target.files?.[0]?.name ?? "" } })} /><span className="mt-1 block text-xs text-[#6c7770]">Demo only</span></label> : null}<label className="mt-4 block field-label">Supporting document (optional)<input className="field mt-2" type="file" accept="application/pdf,image/*,.doc,.docx" onChange={(event) => { const file = event.target.files?.[0]; if (file) patchDraft({ ...draft, attachments: [{ id: `attachment-${Date.now()}`, name: file.name, size: file.size, type: file.type }] }); }} /></label></Section>;
  if (draft.currentStep === "review") return <Section eyebrow="Step 7" title="Review your application" description="Verify all details before payment."><div className="space-y-3">{[["Location", `${draft.jurisdiction.district}, ${draft.jurisdiction.state}`], ["Department", draft.department?.name ?? "Not selected"], ["Office", draft.publicAuthority?.publicAuthority ?? "Not selected"], ["Applicant", `${draft.applicant.fullName} · ${draft.applicant.email}`], ["Subject", draft.request.subject], ["Information", draft.request.informationRequested], ["Period", `${draft.informationPeriod.type}${draft.informationPeriod.from ? `: ${draft.informationPeriod.from}${draft.informationPeriod.to ? ` → ${draft.informationPeriod.to}` : ""}` : ""}`], ["Delivery", draft.delivery.mode], ["BPL", draft.bpl.isBpl ? `Yes · ${draft.bpl.proofFileName}` : "No"], ["Attachments", draft.attachments.length ? draft.attachments.map((item) => item.name).join(", ") : "None"]].map(([label, value]) => <div key={label} className="border-b border-[#dbe3dc] pb-2.5"><p className="text-xs font-medium text-[#6c7770]">{label}</p><p className="mt-1 whitespace-pre-wrap text-sm text-[#13201c]">{value}</p></div>)}</div></Section>;
  if (draft.currentStep === "payment") return <Section eyebrow="Demo payment" title="Complete payment" description="Demo only — no real payment required."><div className="border-y border-[#dbe3dc] py-4"><div className="flex justify-between"><span className="text-sm">RTI application fee</span><strong className="text-lg">₹{draft.payment.amount}</strong></div><p className="mt-2 text-xs text-[#6c7770]">{draft.bpl.isBpl ? "No fee for BPL applicants in this demo." : "Demo fee based on Maharashtra rules."}</p></div><div className="mt-4 grid gap-2 sm:grid-cols-3"><button className="secondary-button">UPI</button><button className="secondary-button">Card</button><button className="secondary-button">Net banking</button></div></Section>;
  return (
    <div className="max-w-[600px] mx-auto">
      <div className="mb-6 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 mb-3 sm:w-16 sm:h-16 sm:mb-4">
          <svg className="size-7 text-green-600 sm:size-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span className="font-semibold uppercase text-neutral-500 text-[10px] leading-3 tracking-[1.1px] block mb-2 sm:text-xs sm:leading-4 sm:tracking-[1.28px] sm:mb-3">Success</span>
        <h2 className="font-bold text-neutral-950 text-[24px] leading-[30px] sm:text-[32px] sm:leading-[38px]">Application submitted</h2>
        <p className="mt-2 text-neutral-500 text-sm leading-5 px-4 sm:mt-3 sm:text-base sm:leading-6 sm:px-0">Demo application created — not filed with a government portal.</p>
      </div>
      
      <div className="shadow-[0_1px_2px_rgba(0,0,0,0.06)] rounded-xl bg-white border-neutral-200 border-1 border-solid p-4 sm:p-6">
        <div className="border-neutral-200 border-b-1 border-solid pb-3 mb-3 sm:pb-4 sm:mb-4">
          <p className="font-semibold uppercase text-neutral-500 text-[10px] leading-3 tracking-[1.1px] sm:text-xs sm:leading-4 sm:tracking-[1.28px]">Application ID</p>
          <p className="mt-2 font-mono text-xl font-bold tracking-wider text-neutral-950 break-all sm:text-2xl">{draft.submission.registrationNumber}</p>
        </div>
        
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <svg className="size-4 text-neutral-400 flex-shrink-0 mt-0.5 sm:size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <div className="flex-1">
              <p className="text-xs font-medium text-neutral-950 sm:text-sm">Department</p>
              <p className="text-xs text-neutral-500 sm:text-sm">{draft.department?.name}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-2.5 sm:gap-3">
            <svg className="size-4 text-neutral-400 flex-shrink-0 mt-0.5 sm:size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-xs font-medium text-neutral-950 sm:text-sm">Office</p>
              <p className="text-xs text-neutral-500 sm:text-sm">{draft.publicAuthority?.publicAuthority}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-2.5 sm:gap-3">
            <svg className="size-4 text-neutral-400 flex-shrink-0 mt-0.5 sm:size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-xs font-medium text-neutral-950 sm:text-sm">Payment</p>
              <p className="text-xs text-neutral-500 sm:text-sm">{draft.payment.status === "paid" ? "Demo payment complete" : "Not required"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function Section({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 sm:mb-8">
      <div className="mb-4 sm:mb-6">
        <span className="font-semibold uppercase text-neutral-500 text-[10px] leading-3 tracking-[1.1px] sm:text-xs sm:leading-4 sm:tracking-[1.28px]">{eyebrow}</span>
        <h2 className="mt-2 font-bold text-neutral-950 text-[22px] leading-[28px] sm:text-[28px] sm:leading-[34px]">{title}</h2>
        <p className="mt-2 text-neutral-500 text-xs leading-5 sm:text-sm sm:leading-6">{description}</p>
      </div>
      <div className="shadow-[0_1px_2px_rgba(0,0,0,0.06)] rounded-xl bg-white border-neutral-200 border-1 border-solid p-4 sm:p-6">
        {children}
      </div>
    </section>
  );
}

