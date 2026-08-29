"use client";

import { saveSubmittedApplication, toSubmittedApplication } from "@/lib/manual/submitted";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AuthorityCandidate } from "@/lib/authority/types";
import { createRtiDraft, validateRtiDraft } from "@/lib/workflow/draft";
import { createLocalIntent } from "@/lib/reasoning/local";
import type { StructuredIntent } from "@/lib/reasoning/types";
import type { OfficialContextResult } from "@/lib/rag/types";
import { isSpeechToTextResult } from "@/lib/speech/types";
import { MAX_SPEECH_RECORDING_SECONDS, speechAudioMetadata } from "@/lib/speech/audio";

// Extended recording time for long RTI applications
const EXTENDED_RECORDING_SECONDS = 120; // 2 minutes for complete RTI dictation
import { isWorkflowResponse } from "@/lib/workflow/types";
import { isApplicationApiResponse } from "@/lib/applications/types";
import type { ApplicationRecord } from "@/lib/applications/types";
import type { LocationResolution } from "@/lib/location/types";
import { isValidEmailAddress, isValidMobileNumber } from "@/lib/applications/validation";

type Stage =
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

const LANGUAGE_KEY = "rti-language";

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
    yourApplication: "YOUR APPLICATION",
    buildRequest: "Build your RTI request",
    applicationNumber: "Your application number will appear after submission.",
    step1Title: "What information do you need?",
    step1Desc: "Talk naturally in English, Hindi, Marathi, or a mix. We will turn your words into a clear RTI request.",
    yourRequest: "Your request",
    placeholder: "For example: I want to know how much was spent on the road near my village, and who was the contractor...",
    speakInstead: "Speak instead",
    stopTranscribe: "Stop & transcribe",
    voiceTranscribed: "Voice transcribed",
    useSample: "Use the road-work example",
    privacyNote: "Your words stay editable. We only send them to this app's reasoning route when you continue.",
    helpFind: "Help me find the authority",
    understanding: "Understanding…",
    goodToKnow: "Good to know",
    goodToKnowText: "You do not need to name a department. Tell us about the road, service, payment or decision you want records about.",
    askForRecords: "Ask for records",
    askForRecordsDesc: "Budgets, approvals, tenders, bills and status updates.",
    stayInControl: "Stay in control",
    stayInControlDesc: "We show you the route before creating a draft.",
    goBack: "Go back",
    // Step headers
    step1Of5: "Step 1 of 5",
    step2Of5: "Step 2 of 5",
    step3Of5: "Step 3",
    step4Of5: "Step 4",
    step5Of5: "Step 5",
    // Understand stage
    understoodTitle: "Here is what we understood",
    understoodDesc: "Check the summary. If we got something wrong, edit your original words and try again.",
    issue: "Issue",
    location: "Location",
    state: "State",
    district: "District",
    likelyCategory: "Likely category",
    timePeriod: "Time period",
    youWant: "You want",
    updateMyRequest: "Update my request",
    showMeAuthority: "Show me the authority",
    editMyRequest: "Edit my request",
    // Authority stage
    needOneDetail: "We need one more detail",
    needOneDetailDesc: "We will not invent a department or route your request to an unverified authority.",
    mostLikelyAuthority: "This is the most likely authority",
    chooseClosestAuthority: "Choose the closest authority",
    reviewSuggestedRoute: "Review the suggested route, or select another curated public authority if the first match is not right.",
    suggestedAuthority: "Suggested public authority",
    whyThisMatches: "Why this matches",
    officialSource: "Official source",
    officialGuidance: "Official guidance found",
    directoryMatch: "Directory match",
    curatedFallback: "Curated fallback",
    pocMockRoute: "POC mock route",
    pocMockData: "POC data",
    pocDataDesc: "This is a mock routing suggestion for the demo, not an officially verified government record.",
    continueWithAuthority: "Continue with this authority",
    // Draft stage
    reviewDraftTitle: "Review your draft",
    reviewDraftDesc: "This is a formatted RTI request. You can edit it before submitting.",
    yourDraft: "Your draft",
    draftPlaceholder: "Your RTI request will appear here",
    reviewBeforeSubmitting: "Review before submitting",
    // Review stage
    reviewEverything: "Review everything once",
    reviewEverythingDesc: "Add your contact details, check the draft, then create your demo application ID.",
    yourName: "Your name",
    emailAddress: "Email address",
    mobileNumber: "Mobile number",
    authority: "Authority",
    department: "Department",
    jurisdiction: "Jurisdiction",
    draftPreview: "Draft preview",
    finalConfirmation: "Final confirmation",
    demoOnly: "You are creating a demo application only. Nothing will be sent to a government portal.",
    reviewedConfirmation: "I have reviewed the authority and the request.",
    createDemoId: "Create demo application ID",
    confirming: "Confirming…",
    addDetailsAndConfirm: "Add your details and confirm that you reviewed the authority and request.",
    // Submitted stage
    demoCreated: "Demo application created",
    readyToTrack: "You are ready to track it.",
    simulatedDesc: "This simulated application has been saved in your browser so you can show the complete journey.",
    applicationId: "Application ID",
    trackThisApplication: "Track this application",
    startAnotherRequest: "Start another request",
    // Track stage (Voice internal)
    trackingTitle: "A clear status, at a glance.",
    startNewRequest: "Start a new request",
    checkStatus: "Check status",
    checking: "Checking…",
    // Errors and notices
    mockStorageError: "The mock application could not be stored.",
    noApplicationFound: "No application was found with that ID.",
    trackingUnavailable: "Application tracking is temporarily unavailable.",
    statusRetrieved: "Status retrieved from the shared demo application store.",
    statusFromLocal: "Shared storage is not configured, so this status came from this browser's saved demo record.",
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
    yourApplication: "आपका आवेदन",
    buildRequest: "अपना आरटीआई अनुरोध बनाएं",
    applicationNumber: "आपका आवेदन संख्या जमा करने के बाद दिखाई देगी।",
    step1Title: "आपको कौन सी जानकारी चाहिए?",
    step1Desc: "अंग्रेजी, हिंदी, मराठी या मिश्रण में स्वाभाविक रूप से बोलें। हम आपके शब्दों को स्पष्ट आरटीआई अनुरोध में बदल देंगे।",
    yourRequest: "आपका अनुरोध",
    placeholder: "उदाहरण: मैं जानना चाहता हूं कि मेरे गांव के पास सड़क पर कितना खर्च हुआ और ठेकेदार कौन था...",
    speakInstead: "इसके बजाय बोलें",
    stopTranscribe: "रुकें और लिखें",
    voiceTranscribed: "आवाज़ लिखी गई",
    useSample: "सड़क-कार्य उदाहरण का उपयोग करें",
    privacyNote: "आपके शब्द संपादन योग्य रहते हैं। हम उन्हें केवल तभी भेजते हैं जब आप जारी रखते हैं।",
    helpFind: "प्राधिकरण खोजने में मदद करें",
    understanding: "समझ रहे हैं…",
    goodToKnow: "जानने योग्य",
    goodToKnowText: "आपको विभाग का नाम बताने की आवश्यकता नहीं है। हमें सड़क, सेवा, भुगतान या निर्णय के बारे में बताएं।",
    askForRecords: "रिकॉर्ड मांगें",
    askForRecordsDesc: "बजट, स्वीकृति, निविदा, बिल और स्थिति अपडेट।",
    stayInControl: "नियंत्रण में रहें",
    stayInControlDesc: "हम ड्राफ्ट बनाने से पहले आपको मार्ग दिखाते हैं।",
    goBack: "वापस जाएं",
    // Step headers
    step1Of5: "चरण 1 का 5",
    step2Of5: "चरण 2 का 5",
    step3Of5: "चरण 3",
    step4Of5: "चरण 4",
    step5Of5: "चरण 5",
    // Understand stage
    understoodTitle: "यह है जो हम समझे",
    understoodDesc: "सारांश की जाँच करें। यदि हमने कुछ गलत समझा है, तो अपने मूल शब्दों को संपादित करें और पुनः प्रयास करें।",
    issue: "मुद्दा",
    location: "स्थान",
    state: "राज्य",
    district: "जिला",
    likelyCategory: "संभावित श्रेणी",
    timePeriod: "समय अवधि",
    youWant: "आप चाहते हैं",
    updateMyRequest: "मेरा अनुरोध अपडेट करें",
    showMeAuthority: "मुझे प्राधिकरण दिखाएं",
    editMyRequest: "मेरा अनुरोध संपादित करें",
    // Authority stage
    needOneDetail: "हमें एक और विवरण चाहिए",
    needOneDetailDesc: "हम विभाग का आविष्कार नहीं करेंगे या आपके अनुरोध को किसी असत्यापित प्राधिकरण को नहीं भेजेंगे।",
    mostLikelyAuthority: "यह सबसे संभावित प्राधिकरण है",
    chooseClosestAuthority: "निकटतम प्राधिकरण चुनें",
    reviewSuggestedRoute: "सुझाए गए मार्ग की समीक्षा करें, या यदि पहला मेल सही नहीं है तो दूसरा क्यूरेटेड सार्वजनिक प्राधिकरण चुनें।",
    suggestedAuthority: "सुझाया गया सार्वजनिक प्राधिकरण",
    whyThisMatches: "यह क्यों मेल खाता है",
    officialSource: "आधिकारिक स्रोत",
    officialGuidance: "आधिकारिक मार्गदर्शन मिला",
    directoryMatch: "निर्देशिका मैच",
    curatedFallback: "क्यूरेटेड फॉलबैक",
    pocMockRoute: "POC मॉक रूट",
    pocMockData: "POC डेटा",
    pocDataDesc: "यह डेमो के लिए एक मॉक राउटिंग सुझाव है, आधिकारिक रूप से सत्यापित सरकारी रिकॉर्ड नहीं।",
    continueWithAuthority: "इस प्राधिकरण के साथ जारी रखें",
    // Draft stage
    reviewDraftTitle: "अपने मसौदे की समीक्षा करें",
    reviewDraftDesc: "यह एक स्वरूपित आरटीआई अनुरोध है। आप इसे जमा करने से पहले संपादित कर सकते हैं।",
    yourDraft: "आपका मसौदा",
    draftPlaceholder: "आपका आरटीआई अनुरोध यहां दिखाई देगा",
    reviewBeforeSubmitting: "जमा करने से पहले समीक्षा करें",
    // Review stage
    reviewEverything: "एक बार सब कुछ की समीक्षा करें",
    reviewEverythingDesc: "अपने संपर्क विवरण जोड़ें, मसौदा जांचें, फिर अपना डेमो आवेदन आईडी बनाएं।",
    yourName: "आपका नाम",
    emailAddress: "ईमेल पता",
    mobileNumber: "मोबाइल नंबर",
    authority: "प्राधिकरण",
    department: "विभाग",
    jurisdiction: "क्षेत्राधिकार",
    draftPreview: "मसौदा पूर्वावलोकन",
    finalConfirmation: "अंतिम पुष्टि",
    demoOnly: "आप केवल एक डेमो आवेदन बना रहे हैं। कुछ भी सरकारी पोर्टल पर नहीं भेजा जाएगा।",
    reviewedConfirmation: "मैंने प्राधिकरण और अनुरोध की समीक्षा की है।",
    createDemoId: "डेमो आवेदन आईडी बनाएं",
    confirming: "पुष्टि कर रहे हैं…",
    addDetailsAndConfirm: "अपने विवरण जोड़ें और पुष्टि करें कि आपने प्राधिकरण और अनुरोध की समीक्षा की है।",
    // Submitted stage
    demoCreated: "डेमो आवेदन बनाया गया",
    readyToTrack: "आप इसे ट्रैक करने के लिए तैयार हैं।",
    simulatedDesc: "यह सिम्युलेटेड आवेदन आपके ब्राउज़र में सहेजा गया है ताकि आप पूरी यात्रा दिखा सकें।",
    applicationId: "आवेदन आईडी",
    trackThisApplication: "इस आवेदन को ट्रैक करें",
    startAnotherRequest: "एक और अनुरोध शुरू करें",
    // Track stage (Voice internal)
    trackingTitle: "एक नज़र में स्पष्ट स्थिति।",
    startNewRequest: "नया अनुरोध शुरू करें",
    checkStatus: "स्थिति जांचें",
    checking: "जांच रहे हैं…",
    // Errors and notices
    mockStorageError: "मॉक आवेदन संग्रहीत नहीं किया जा सका।",
    noApplicationFound: "उस आईडी के साथ कोई आवेदन नहीं मिला।",
    trackingUnavailable: "आवेदन ट्रैकिंग अस्थायी रूप से अनुपलब्ध है।",
    statusRetrieved: "साझा डेमो आवेदन स्टोर से स्थिति प्राप्त की गई।",
    statusFromLocal: "साझा स्टोरेज कॉन्फ़िगर नहीं है, इसलिए यह स्थिति इस ब्राउज़र के सहेजे गए डेमो रिकॉर्ड से आई।",
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
    yourApplication: "तुमचा अर्ज",
    buildRequest: "तुमचा आरटीआय अर्ज तयार करा",
    applicationNumber: "तुमचा अर्ज क्रमांक सबमिट केल्यानंतर दिसेल.",
    step1Title: "तुम्हाला कोणती माहिती हवी आहे?",
    step1Desc: "इंग्रजी, हिंदी, मराठी किंवा मिश्रणात नैसर्गिकपणे बोला. आम्ही तुमचे शब्द स्पष्ट आरटीआय विनंतीमध्ये बदलू.",
    yourRequest: "तुमची विनंती",
    placeholder: "उदाहरण: माझ्या गावाजवळच्या रस्त्यावर किती खर्च झाला आणि कंत्राटदार कोण होता हे मला जाणून घ्यायचे आहे...",
    speakInstead: "त्याऐवजी बोला",
    stopTranscribe: "थांबा आणि लिहा",
    voiceTranscribed: "आवाज लिहिला",
    useSample: "रस्ता-काम उदाहरण वापरा",
    privacyNote: "तुमचे शब्द संपादनयोग्य राहतात. तुम्ही पुढे गेल्यावरच आम्ही ते पाठवतो.",
    helpFind: "प्राधिकरण शोधण्यात मदत करा",
    understanding: "समजत आहोत…",
    goodToKnow: "जाणून घ्या",
    goodToKnowText: "तुम्हाला विभागाचे नाव सांगण्याची गरज नाही. आम्हाला रस्ता, सेवा, पैसे किंवा निर्णयाबद्दल सांगा.",
    askForRecords: "नोंदी मागा",
    askForRecordsDesc: "अर्थसंकल्प, मंजुरी, निविदा, बिल आणि स्थिती अद्यतने.",
    stayInControl: "नियंत्रणात रहा",
    stayInControlDesc: "आम्ही मसुदा तयार करण्यापूर्वी तुम्हाला मार्ग दाखवतो.",
    goBack: "मागे जा",
    // Step headers
    step1Of5: "पायरी 1 पैकी 5",
    step2Of5: "पायरी 2 पैकी 5",
    step3Of5: "पायरी 3",
    step4Of5: "पायरी 4",
    step5Of5: "पायरी 5",
    // Understand stage
    understoodTitle: "आम्ही हे समजलो",
    understoodDesc: "सारांशाची तपासणी करा. जर आम्ही काही चुकीचे समजलो असेल तर तुमचे मूळ शब्द संपादित करा आणि पुन्हा प्रयत्न करा.",
    issue: "मुद्दा",
    location: "स्थान",
    state: "राज्य",
    district: "जिल्हा",
    likelyCategory: "संभाव्य श्रेणी",
    timePeriod: "कालावधी",
    youWant: "तुम्हाला हवे आहे",
    updateMyRequest: "माझी विनंती अपडेट करा",
    showMeAuthority: "मला प्राधिकरण दाखवा",
    editMyRequest: "माझी विनंती संपादित करा",
    // Authority stage
    needOneDetail: "आम्हाला आणखी एक तपशील हवा आहे",
    needOneDetailDesc: "आम्ही विभागाचा शोध लावणार नाही किंवा तुमची विनंती असत्यापित प्राधिकरणाला पाठवणार नाही.",
    mostLikelyAuthority: "हे सर्वात संभाव्य प्राधिकरण आहे",
    chooseClosestAuthority: "सर्वात जवळचे प्राधिकरण निवडा",
    reviewSuggestedRoute: "सुचवलेल्या मार्गाचे पुनरावलोकन करा, किंवा पहिला जुळणी योग्य नसल्यास दुसरे क्युरेटेड सार्वजनिक प्राधिकरण निवडा.",
    suggestedAuthority: "सुचवलेले सार्वजनिक प्राधिकरण",
    whyThisMatches: "हे का जुळते",
    officialSource: "अधिकृत स्रोत",
    officialGuidance: "अधिकृत मार्गदर्शन सापडले",
    directoryMatch: "निर्देशिका जुळणी",
    curatedFallback: "क्युरेटेड फॉलबॅक",
    pocMockRoute: "POC मॉक रूट",
    pocMockData: "POC डेटा",
    pocDataDesc: "हा डेमोसाठी मॉक राउटिंग सूचना आहे, अधिकृतपणे सत्यापित सरकारी रेकॉर्ड नाही.",
    continueWithAuthority: "या प्राधिकरणासह सुरू ठेवा",
    // Draft stage
    reviewDraftTitle: "तुमच्या मसुद्याचे पुनरावलोकन करा",
    reviewDraftDesc: "ही स्वरूपित आरटीआय विनंती आहे. तुम्ही ते सबमिट करण्यापूर्वी संपादित करू शकता.",
    yourDraft: "तुमचा मसुदा",
    draftPlaceholder: "तुमची आरटीआय विनंती येथे दिसेल",
    reviewBeforeSubmitting: "सबमिट करण्यापूर्वी पुनरावलोकन करा",
    // Review stage
    reviewEverything: "एकदा सर्वकाहीचे पुनरावलोकन करा",
    reviewEverythingDesc: "तुमचे संपर्क तपशील जोडा, मसुदा तपासा, नंतर तुमचा डेमो अर्ज आयडी तयार करा.",
    yourName: "तुमचे नाव",
    emailAddress: "ईमेल पत्ता",
    mobileNumber: "मोबाइल नंबर",
    authority: "प्राधिकरण",
    department: "विभाग",
    jurisdiction: "अधिकार क्षेत्र",
    draftPreview: "मसुदा पूर्वावलोकन",
    finalConfirmation: "अंतिम पुष्टीकरण",
    demoOnly: "तुम्ही फक्त डेमो अर्ज तयार करत आहात. सरकारी पोर्टलवर काहीही पाठवले जाणार नाही.",
    reviewedConfirmation: "मी प्राधिकरण आणि विनंतीचे पुनरावलोकन केले आहे.",
    createDemoId: "डेमो अर्ज आयडी तयार करा",
    confirming: "पुष्टी करत आहे…",
    addDetailsAndConfirm: "तुमचे तपशील जोडा आणि पुष्टी करा की तुम्ही प्राधिकरण आणि विनंतीचे पुनरावलोकन केले आहे.",
    // Submitted stage
    demoCreated: "डेमो अर्ज तयार केला",
    readyToTrack: "तुम्ही ते ट्रॅक करण्यासाठी तयार आहात.",
    simulatedDesc: "हा सिम्युलेटेड अर्ज तुमच्या ब्राउझरमध्ये जतन केला गेला आहे जेणेकरून तुम्ही संपूर्ण प्रवास दाखवू शकता.",
    applicationId: "अर्ज आयडी",
    trackThisApplication: "हा अर्ज ट्रॅक करा",
    startAnotherRequest: "दुसरी विनंती सुरू करा",
    // Track stage (Voice internal)
    trackingTitle: "एका नजरेत स्पष्ट स्थिती.",
    startNewRequest: "नवीन विनंती सुरू करा",
    checkStatus: "स्थिती तपासा",
    checking: "तपासत आहे…",
    // Errors and notices
    mockStorageError: "मॉक अर्ज संग्रहित केला जाऊ शकला नाही.",
    noApplicationFound: "त्या आयडीसह कोणताही अर्ज सापडला नाही.",
    trackingUnavailable: "अर्ज ट्रॅकिंग तात्पुरते अनुपलब्ध आहे.",
    statusRetrieved: "सामायिक डेमो अर्ज स्टोअरमधून स्थिती पुनर्प्राप्त केली.",
    statusFromLocal: "सामायिक स्टोरेज कॉन्फिगर केलेले नाही, त्यामुळे ही स्थिती या ब्राउझरच्या जतन केलेल्या डेमो रेकॉर्डमधून आली.",
  },
};

const demoRequest =
  "Mere gaon ke road ke liye kitna paisa sanction hua tha aur contractor kaun tha?";

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
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("request");
  const [requestText, setRequestText] = useState("");
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

  const startRequest = () => router.push("/");

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
      setVoiceNotice("Speak naturally, then press stop. Recording limit: 2 minutes.");
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
          setVoiceNotice("2-minute limit reached. Transcribing with Sarvam...");
          recorder.stop();
        }
      }, EXTENDED_RECORDING_SECONDS * 1000);
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
      
      // Create local application record directly (no Supabase dependency)
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
    // If on request stage, go back to home page
    if (stage === "request") {
      router.push("/");
      return;
    }
    
    const previousStage: Partial<Record<Stage, Stage>> = {
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
      <header className="border-neutral-200 border-t-0 border-r-0 border-b-1 border-l-0 border-solid">
        <div className="flex px-4 py-4 justify-between items-center sm:px-8 lg:px-12 lg:py-6">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-3 lg:gap-4 border-0 bg-transparent cursor-pointer p-0"
          >
            <div className="size-10 rounded-lg bg-neutral-900 flex justify-center items-center lg:size-12">
              <span className="font-semibold text-neutral-50 text-xs leading-5 lg:text-sm">
                साथी
              </span>
            </div>
            <div className="flex flex-col gap-0.5 lg:gap-1">
              <span className="font-bold text-neutral-950 text-sm leading-5 tracking-[2px] lg:text-lg lg:leading-7 lg:tracking-[3.2px]">
                SAATHI
              </span>
              <span className="text-neutral-500 text-xs leading-4 lg:text-sm lg:leading-5">
                {translations[language].siteTitle}
              </span>
            </div>
          </button>
          <div className="flex items-center gap-3 lg:gap-8">
            <div className="hidden rounded-lg border-neutral-200 border-1 border-solid items-center h-11 overflow-hidden md:flex">
              {(["English", "हिन्दी", "मराठी"] as Language[]).map((option) => (
                <button
                  key={option}
                  className="font-medium text-sm leading-5 px-3 h-full border-0 bg-transparent cursor-pointer lg:px-4"
                  style={{
                    fontWeight: language === option ? 600 : 400,
                    color: language === option ? "#1a1a1a" : "#666",
                  }}
                  onClick={() => {
                    setLanguage(option);
                    localStorage.setItem(LANGUAGE_KEY, option);
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
            <button
              className="underline-offset-4 underline font-medium text-neutral-950 text-xs leading-4 border-0 bg-transparent cursor-pointer lg:text-sm lg:leading-5"
              onClick={openTracking}
            >
              <span className="hidden sm:inline">{translations[language].track}</span>
              <span className="sm:hidden">{translations[language].trackShort}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="p-4 flex flex-col sm:p-6 lg:p-12">
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
              language={language}
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

function HomeStage({ onStart, language }: { onStart: () => void; onSample: () => void; language: Language }) {
  const t = translations[language];
  return (
    <>
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
            <button
              onClick={onStart}
              className="font-semibold rounded-lg bg-neutral-900 text-neutral-50 text-[15px] leading-6 flex px-6 justify-center items-center gap-2 w-full h-11 border-0 cursor-pointer"
            >
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              {t.useVoice}
            </button>
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
        <div className="flex items-center">
          <div className="shadow-[0_1px_2px_rgba(0,0,0,0.06)] rounded-xl bg-white border-neutral-200 border-1 border-solid flex p-8 flex-col gap-6 w-full">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <span className="font-semibold uppercase text-neutral-500 text-xs leading-4 tracking-[1.28px]">
                  {t.yourApplication}
                </span>
                <span className="font-semibold uppercase rounded-lg text-neutral-500 text-xs leading-4 tracking-[1.28px] border-neutral-200 border-1 border-solid px-3 py-2">
                  01 / 03
                </span>
              </div>
              <h2 className="font-semibold text-neutral-950 text-2xl leading-[31px]">
                {t.buildRequest}
              </h2>
            </div>
            <div className="bg-neutral-200 w-full h-px" />
            <div className="flex items-center gap-4">
              <div className="size-10 shrink-0 rounded-lg bg-neutral-900 flex justify-center items-center">
                <svg className="size-5 text-neutral-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="font-semibold text-neutral-950 text-lg leading-7">
                {t.step1}
              </span>
            </div>
            <div className="bg-neutral-200 w-full h-px" />
            <div className="flex items-center gap-4">
              <div className="size-10 shrink-0 rounded-lg bg-neutral-100 flex justify-center items-center">
                <svg className="size-5 text-neutral-950" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
              <span className="font-semibold text-neutral-950 text-lg leading-7">
                {t.step2}
              </span>
            </div>
            <div className="bg-neutral-200 w-full h-px" />
            <div className="flex items-center gap-4">
              <div className="size-10 shrink-0 rounded-lg bg-neutral-100 flex justify-center items-center">
                <svg className="size-5 text-neutral-950" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="font-semibold text-neutral-950 text-lg leading-7">
                {t.step3}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Layout */}
      <section className="lg:hidden flex flex-col flex-1 gap-8">
        <div className="flex flex-col gap-6">
          <h1 className="tracking-0 font-bold text-[32px] leading-[38px]">
            {t.fileRTI}
          </h1>
          <div className="flex flex-col gap-3">
            <button
              onClick={onStart}
              className="font-semibold rounded-lg bg-neutral-900 text-neutral-50 text-[15px] px-4 w-full h-11 flex items-center justify-center gap-2 border-0 cursor-pointer"
            >
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              {t.useVoice}
            </button>
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
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <span className="font-bold text-2xl leading-8 w-8">01</span>
            <div className="flex items-center flex-1 gap-2">
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span className="font-semibold text-base leading-6">{t.step1}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-bold text-2xl leading-8 w-8">02</span>
            <div className="flex items-center flex-1 gap-2">
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="font-semibold text-base leading-6">{t.step2}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-bold text-2xl leading-8 w-8">03</span>
            <div className="flex items-center flex-1 gap-2">
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span className="font-semibold text-lg leading-[25px]">{t.step3}</span>
            </div>
          </div>
        </div>
        <div className="shadow-[0_1px_2px_rgba(0,0,0,0.06)] rounded-xl bg-white border-neutral-200 border-1 border-solid p-6 gap-4 flex flex-col">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-neutral-500 text-xs leading-4 tracking-[1.28px] uppercase">
                {t.yourApplication}
              </span>
              <span className="font-semibold text-neutral-500 text-xs leading-4 tracking-[1.28px]">
                01 / 03
              </span>
            </div>
            <h2 className="font-semibold text-2xl leading-[31px]">
              {t.fileRTI}
            </h2>
          </div>
          <div className="flex flex-col gap-0">
            <div className="border-neutral-200 border-t-1 border-r-0 border-b-0 border-l-0 border-solid flex py-4 items-center gap-4">
              <div className="size-10 shrink-0 rounded-lg bg-neutral-900 text-neutral-50 flex justify-center items-center">
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <span className="font-semibold text-lg leading-[25px]">{t.step1}</span>
            </div>
            <div className="border-neutral-200 border-t-1 border-r-0 border-b-0 border-l-0 border-solid flex py-4 items-center gap-4">
              <div className="size-10 shrink-0 rounded-lg bg-neutral-100 flex justify-center items-center">
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="font-semibold text-lg leading-[25px]">{t.step2}</span>
            </div>
            <div className="border-neutral-200 border-t-1 border-r-0 border-b-0 border-l-0 border-solid flex py-4 items-center gap-4">
              <div className="size-10 shrink-0 rounded-lg bg-neutral-100 flex justify-center items-center">
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
              <span className="font-semibold text-lg leading-[25px]">{t.step3}</span>
            </div>
            <p className="text-neutral-500 text-sm leading-5 border-neutral-200 border-t-1 border-r-0 border-b-0 border-l-0 border-solid pt-4">
              {t.applicationNumber}
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="hidden lg:flex border-neutral-200 border-t-1 border-r-0 border-b-0 border-l-0 border-solid py-6 justify-end items-center">
        <span className="text-neutral-500 text-sm leading-5">
          Clear requests. Better answers.
        </span>
      </footer>
    </>
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
  const t = translations[language];
  return (
    <FlowShell eyebrow={t.step1Of5} title={t.step1Title} description={t.step1Desc} onBack={onBack} language={language}>
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="flex items-center justify-between gap-4 mb-3">
            <label htmlFor="request" className="font-semibold text-neutral-950 text-sm leading-5">{t.yourRequest}</label>
            <span className="text-xs text-neutral-500 bg-neutral-100 px-3 py-1 rounded-lg border-neutral-200 border-1 border-solid">{language}</span>
          </div>
          <textarea
            id="request"
            value={requestText}
            onChange={onChange}
            placeholder={t.placeholder}
            className="w-full rounded-lg border-neutral-200 border-1 border-solid p-4 text-base leading-6 resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900"
            style={{ minHeight: "240px" }}
          />
          {requestError ? (
            <div role="alert" className="mt-3 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
              <p className="text-sm text-red-700">{requestError}</p>
            </div>
          ) : null}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              className={`font-semibold rounded-lg text-[15px] px-4 h-11 flex items-center justify-center gap-2 border-0 cursor-pointer ${
                voiceState === "listening" 
                  ? "bg-red-600 text-white" 
                  : voiceState === "captured"
                  ? "bg-green-600 text-white"
                  : "bg-neutral-100 text-neutral-950 border-neutral-200 border-1 border-solid"
              }`}
              onClick={() => void onVoice()}
              aria-live="polite"
            >
              {voiceState === "listening" ? (
                <>
                  <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse" />
                  {t.stopTranscribe}
                </>
              ) : voiceState === "captured" ? (
                <>
                  <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t.voiceTranscribed}
                </>
              ) : (
                <>
                  <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  {t.speakInstead}
                </>
              )}
            </button>
            <button
              className="font-medium text-neutral-500 text-sm underline-offset-4 underline border-0 bg-transparent cursor-pointer hover:text-neutral-950"
              onClick={onSample}
            >
              {t.useSample}
            </button>
          </div>

          {voiceNotice ? (
            <p role="status" className="mt-3 text-sm text-neutral-500">{voiceNotice}</p>
          ) : null}

          <div className="mt-8 pt-6 border-neutral-200 border-t-1 border-r-0 border-b-0 border-l-0 border-solid flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-neutral-500 max-w-[320px]">
              {t.privacyNote}
            </p>
            <button
              className="font-semibold rounded-lg bg-neutral-900 text-neutral-50 text-[15px] px-6 h-11 flex items-center justify-center gap-2 border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-w-[220px]"
              onClick={() => void onContinue()}
              disabled={!requestText.trim() || isUnderstanding}
            >
              {isUnderstanding ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-neutral-300 border-t-white rounded-full animate-spin" />
                  {t.understanding}
                </>
              ) : (
                <>
                  {t.helpFind}
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sidebar tip */}
        <aside className="shadow-[0_1px_2px_rgba(0,0,0,0.06)] rounded-xl bg-neutral-50 border-neutral-200 border-1 border-solid p-6">
          <span className="font-semibold uppercase text-neutral-500 text-xs leading-4 tracking-[1.28px]">{t.goodToKnow}</span>
          <p className="mt-4 text-sm leading-6 text-neutral-600">
            {t.goodToKnowText}
          </p>
          <div className="mt-6 flex flex-col gap-4">
            <div className="bg-white rounded-lg p-4 border-neutral-200 border-1 border-solid">
              <p className="font-semibold text-sm text-neutral-950 mb-1">{t.askForRecords}</p>
              <p className="text-xs text-neutral-500">{t.askForRecordsDesc}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border-neutral-200 border-1 border-solid">
              <p className="font-semibold text-sm text-neutral-950 mb-1">{t.stayInControl}</p>
              <p className="text-xs text-neutral-500">{t.stayInControlDesc}</p>
            </div>
          </div>
        </aside>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
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
          {confirmed ? "Location confirmed" : "Confirm this location"}
        </button>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════
   UNDERSTAND
══════════════════════════════════════════════════════════ */

function UnderstandStage({ intent, notice, clarificationQuestions, onBack, onContinue, onEdit, language }: {
  intent: Intent; notice: string | null; clarificationQuestions: string[];
  onBack: () => void; onContinue: () => void; onEdit: () => void; language: Language;
}) {
  const t = translations[language];
  return (
    <FlowShell eyebrow={t.step2Of5} title={t.understoodTitle} description={t.understoodDesc} onBack={onBack}>
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          {/* Summary card */}
          <div className="shadow-[0_1px_2px_rgba(0,0,0,0.06)] rounded-xl bg-white border-neutral-200 border-1 border-solid overflow-hidden">
            {[
              { label: t.issue, value: intent.issue },
              { label: t.location, value: intent.location },
              { label: t.state, value: intent.state },
              { label: t.district, value: intent.district },
              { label: t.likelyCategory, value: intent.category },
              { label: t.timePeriod, value: intent.timePeriod },
            ].map(({ label, value }, idx) => (
              <div key={label} className={`flex gap-4 p-4 border-neutral-200 ${idx < 5 ? 'border-b-1' : ''} border-solid`}>
                <span className="font-semibold uppercase text-neutral-500 text-xs leading-4 tracking-[1.28px] w-32 flex-shrink-0 pt-0.5">{label}</span>
                <span className="text-sm text-neutral-950 leading-6">{value}</span>
              </div>
            ))}

            {/* Requested information */}
            <div className="flex gap-4 p-4 border-neutral-200 border-t-1 border-solid bg-neutral-50">
              <span className="font-semibold uppercase text-neutral-500 text-xs leading-4 tracking-[1.28px] w-32 flex-shrink-0 pt-1">{t.youWant}</span>
              <div className="flex flex-wrap gap-2">
                {intent.requestedInformation.map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-900 text-neutral-50 rounded-full text-xs font-medium">
                    <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {notice ? (
              <div className="p-4 border-neutral-200 border-t-1 border-solid bg-amber-50 border-l-4 border-l-amber-400">
                <p className="text-sm text-amber-900">{notice}</p>
              </div>
            ) : null}

            {clarificationQuestions.length ? (
              <div className="p-4 border-neutral-200 border-t-1 border-solid bg-blue-50">
                <p className="font-semibold uppercase text-blue-700 text-xs leading-4 tracking-[1.28px] mb-3">A little more detail will help</p>
                <ul className="flex flex-col gap-2">
                  {clarificationQuestions.map((question) => (
                    <li key={question} className="text-sm text-blue-900 flex gap-2">
                      <span className="text-blue-600 flex-shrink-0">•</span>
                      {question}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="shadow-[0_1px_2px_rgba(0,0,0,0.06)] rounded-xl bg-neutral-50 border-neutral-200 border-1 border-solid p-6 h-fit">
          <span className="font-semibold uppercase text-neutral-500 text-xs leading-4 tracking-[1.28px]">
            {clarificationQuestions.length ? "Next step" : "Next"}
          </span>
          <p className="mt-4 text-sm leading-6 text-neutral-600">
            {clarificationQuestions.length
              ? "Add these details to your original words. We will ask only what is needed to route the request and define the records period."
              : "We will use this summary to find a likely public authority. You will confirm it before we draft anything."}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              className="font-semibold rounded-lg bg-white text-neutral-950 text-[15px] border-neutral-900 border-1 border-solid px-6 h-11 flex items-center justify-center gap-2 w-full cursor-pointer"
              onClick={onEdit}
            >
              {clarificationQuestions.length ? "Add the missing details" : "Edit my words"}
            </button>
            <button
              className="font-semibold rounded-lg bg-neutral-900 text-neutral-50 text-[15px] px-6 h-11 flex items-center justify-center gap-2 w-full border-0 cursor-pointer"
              onClick={onContinue}
            >
              {clarificationQuestions.length ? t.updateMyRequest : t.showMeAuthority}
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </aside>
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
                  {selectedAuthority.dataOrigin === "mock-poc" ? "POC mock route" : lookupNotice ? "Curated fallback" : "Directory match"}
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
                  {selectedAuthority.dataOrigin === "mock-poc" ? (
                    <>
                      <p className="meta-label">POC data</p>
                      <p style={{ marginTop: "8px", fontSize: "13.5px", lineHeight: "1.7", color: "var(--foreground)" }}>
                        This is a mock routing suggestion for the demo, not an officially verified government record.
                      </p>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
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
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </span>

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

function FlowShell({ eyebrow, title, description, onBack, children, language }: {
  eyebrow: string; title: string; description: string; onBack: () => void; children: React.ReactNode; language?: Language;
}) {
  const t = language ? translations[language] : translations.English;
  return (
    <section className="max-w-[1000px] mx-auto">
      <div className="mb-8 pb-6 border-neutral-200 border-t-0 border-r-0 border-b-1 border-l-0 border-solid">
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold uppercase text-neutral-500 text-xs leading-4 tracking-[1.28px]">{eyebrow}</span>
          <button
            className="font-medium text-neutral-500 text-sm leading-5 flex items-center gap-2 border-0 bg-transparent cursor-pointer hover:text-neutral-950"
            onClick={onBack}
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t.goBack}
          </button>
        </div>
        <h1 className="font-bold text-neutral-950 text-[32px] leading-[38px] mb-3">{title}</h1>
        <p className="text-neutral-500 text-base leading-6 max-w-[600px]">{description}</p>
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
