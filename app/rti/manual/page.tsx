"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { AppFooter, AppHeader, CONTAINER } from "@/app/components/AppShell";
import { useLanguage } from "@/lib/i18n/language";
import type { AuthorityCandidate } from "@/lib/authority/types";
import { isValidEmailAddress, isValidMobileNumber } from "@/lib/applications/validation";
import { createManualDraft, type ManualStep, type RTIApplicationDraft } from "@/lib/manual/types";
import { MOCK_POC_LOCATIONS } from "@/lib/mock/rti";

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
    govOffice: "Office",
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
    verified: "Verified",
    
    // Step 5 - Request
    step5Eyebrow: "Step 5",
    step5Title: "What information do you want?",
    step5Desc: "Describe the records or information you need.",
    subject: "Subject",
    subjectPlaceholder: "Brief description",
    words: "words",
    detailedInformation: "Detailed information",
    detailedPlaceholder: "E.g.: work order copy, sanctioned amount, expenditure, completion status",
    helpMeWrite: "Help me write",
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
    bplProof: "BPL proof",
    demoOnly: "Demo only",
    supportingDocument: "Supporting document (optional)",
    from: "From",
    to: "To",
    fromPlaceholder: "E.g., 2024",
    optional: "Optional",
    specificYear: "Specific year",
    dateRange: "Date range",
    financialYear: "Financial year",
    fromADate: "From a date",
    untilADate: "Until a date",
    noSpecificPeriod: "No specific period",
    modeEmail: "Email",
    modeRegisteredPost: "Registered post",
    modeInPerson: "In person",
    modeOnlinePortal: "Online portal",
    modePenDrive: "Personal pen drive",

    // Step 7 - Review
    step7Eyebrow: "Step 7",
    step7Title: "Review your application",
    step7Desc: "Check these details before payment.",
    notSelected: "Not selected",
    information: "Information",
    period: "Period",
    deliveryLabel: "Delivery",
    attachments: "Attachments",
    none: "None",
    yes: "Yes",
    no: "No",

    // Payment
    paymentEyebrow: "Demo payment",
    paymentTitle: "Complete your demo payment",
    paymentDesc: "Demo only — no real payment is taken.",
    applicationFee: "RTI application fee",
    noFee: "No fee",
    bplNoFee: "No fee for BPL applicants in this demo.",
    feeNote: "Demo fee based on Maharashtra rules.",
    upi: "UPI",
    card: "Card",
    netBanking: "Net banking",
    
    // Success
    successTitle: "Application submitted!",
    successDesc: "Your RTI application has been submitted successfully.",
    applicationNumber: "Application Number",
    success: "Success",
    applicationSubmitted: "Application submitted",
    demoNotFiled: "Demo application created — not filed with a government portal.",
    applicationId: "Application ID",
    payment: "Payment",
    demoPaymentComplete: "Demo payment complete",
    notRequired: "Not required",
    
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
    // Request-choice chips (values stay English; only labels are translated)
    choiceSanctionedAmount: "Sanctioned amount",
    choiceAmountReleased: "Amount released",
    choiceExpenditure: "Expenditure",
    choiceContractorDetails: "Contractor details",
    choiceWorkOrder: "Work order",
    choiceCompletionStatus: "Completion status",
    choiceInspectionReport: "Inspection report",
    // Validation messages
    errJurisdiction: "Select a state, district, city or village, and pincode for this issue.",
    errDepartment: "Choose the government area that best matches your issue.",
    errAuthority: "Select a government office before continuing.",
    errFullName: "Enter your full name.",
    errAddress: "Enter your complete address.",
    errMobile: "Enter a valid 10-digit mobile number.",
    errEmail: "Enter a valid email address.",
    errEmailVerify: "Verify your email with the demo OTP.",
    errSubject: "Add a subject for your request.",
    errSubjectLength: "Keep the subject within 150 words.",
    errInformation: "Describe the information or records you want.",
    errPeriod: "Choose the time period for the information.",
    errDelivery: "Choose how you want to receive the information.",
    errBplProof: "Attach your BPL proof or select No for BPL status.",
    errDirectory: "The authority directory could not be reached. Please try again.",
    errEmailBeforeOtp: "Enter a valid email address before sending the demo OTP.",
    errOtpDemo: "For this demo, enter OTP 123456.",
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
    govOffice: "कार्यालय",
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
    verified: "सत्यापित",
    
    step5Eyebrow: "चरण 5",
    step5Title: "आपको कौन सी जानकारी चाहिए?",
    step5Desc: "आपको जो रिकॉर्ड या जानकारी चाहिए उसका वर्णन करें।",
    subject: "विषय",
    subjectPlaceholder: "संक्षिप्त विवरण",
    words: "शब्द",
    detailedInformation: "विस्तृत जानकारी",
    detailedPlaceholder: "उदाहरण: कार्य आदेश प्रति, स्वीकृत राशि, व्यय, पूर्णता स्थिति",
    helpMeWrite: "लिखने में मदद करें",
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
    bplProof: "BPL प्रमाण",
    demoOnly: "केवल डेमो",
    supportingDocument: "सहायक दस्तावेज़ (वैकल्पिक)",
    from: "से",
    to: "तक",
    fromPlaceholder: "उदाहरण: 2024",
    optional: "वैकल्पिक",
    specificYear: "विशिष्ट वर्ष",
    dateRange: "तिथि सीमा",
    financialYear: "वित्तीय वर्ष",
    fromADate: "एक तिथि से",
    untilADate: "एक तिथि तक",
    noSpecificPeriod: "कोई विशिष्ट अवधि नहीं",
    modeEmail: "ईमेल",
    modeRegisteredPost: "रजिस्टर्ड डाक",
    modeInPerson: "व्यक्तिगत रूप से",
    modeOnlinePortal: "ऑनलाइन पोर्टल",
    modePenDrive: "व्यक्तिगत पेन ड्राइव",

    step7Eyebrow: "चरण 7",
    step7Title: "अपने आवेदन की समीक्षा करें",
    step7Desc: "भुगतान से पहले इन विवरणों की जांच करें।",
    notSelected: "चयनित नहीं",
    information: "जानकारी",
    period: "अवधि",
    deliveryLabel: "वितरण",
    attachments: "संलग्नक",
    none: "कोई नहीं",
    yes: "हाँ",
    no: "नहीं",

    paymentEyebrow: "डेमो भुगतान",
    paymentTitle: "अपना डेमो भुगतान पूरा करें",
    paymentDesc: "केवल डेमो — कोई वास्तविक भुगतान नहीं लिया जाता।",
    applicationFee: "आरटीआई आवेदन शुल्क",
    noFee: "कोई शुल्क नहीं",
    bplNoFee: "इस डेमो में BPL आवेदकों के लिए कोई शुल्क नहीं।",
    feeNote: "महाराष्ट्र नियमों पर आधारित डेमो शुल्क।",
    upi: "UPI",
    card: "कार्ड",
    netBanking: "नेट बैंकिंग",
    
    successTitle: "आवेदन जमा किया गया!",
    successDesc: "आपका आरटीआई आवेदन सफलतापूर्वक जमा कर दिया गया है।",
    applicationNumber: "आवेदन संख्या",
    success: "सफल",
    applicationSubmitted: "आवेदन जमा किया गया",
    demoNotFiled: "डेमो आवेदन बनाया गया — किसी सरकारी पोर्टल पर दाखिल नहीं किया गया।",
    applicationId: "आवेदन आईडी",
    payment: "भुगतान",
    demoPaymentComplete: "डेमो भुगतान पूर्ण",
    notRequired: "आवश्यक नहीं",
    
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
    // विकल्प चिप्स (मान अंग्रेज़ी में रहते हैं; केवल लेबल अनुवादित हैं)
    choiceSanctionedAmount: "स्वीकृत राशि",
    choiceAmountReleased: "जारी की गई राशि",
    choiceExpenditure: "खर्च",
    choiceContractorDetails: "ठेकेदार का विवरण",
    choiceWorkOrder: "कार्य आदेश",
    choiceCompletionStatus: "पूर्णता की स्थिति",
    choiceInspectionReport: "निरीक्षण रिपोर्ट",
    // सत्यापन संदेश
    errJurisdiction: "इस मुद्दे के लिए राज्य, जिला, शहर या गांव और पिनकोड चुनें।",
    errDepartment: "अपने मुद्दे से सबसे मेल खाने वाला सरकारी क्षेत्र चुनें।",
    errAuthority: "आगे बढ़ने से पहले एक सरकारी कार्यालय चुनें।",
    errFullName: "अपना पूरा नाम दर्ज करें।",
    errAddress: "अपना पूरा पता दर्ज करें।",
    errMobile: "10 अंकों का वैध मोबाइल नंबर दर्ज करें।",
    errEmail: "एक वैध ईमेल पता दर्ज करें।",
    errEmailVerify: "डेमो ओटीपी से अपना ईमेल सत्यापित करें।",
    errSubject: "अपने अनुरोध के लिए एक विषय जोड़ें।",
    errSubjectLength: "विषय 150 शब्दों के भीतर रखें।",
    errInformation: "आप जो जानकारी या रिकॉर्ड चाहते हैं, उसका वर्णन करें।",
    errPeriod: "जानकारी के लिए समय अवधि चुनें।",
    errDelivery: "आप जानकारी कैसे प्राप्त करना चाहते हैं, यह चुनें।",
    errBplProof: "अपना बीपीएल प्रमाण संलग्न करें या बीपीएल स्थिति के लिए नहीं चुनें।",
    errDirectory: "प्राधिकरण निर्देशिका तक नहीं पहुंचा जा सका। कृपया दोबारा प्रयास करें।",
    errEmailBeforeOtp: "डेमो ओटीपी भेजने से पहले एक वैध ईमेल पता दर्ज करें।",
    errOtpDemo: "इस डेमो के लिए ओटीपी 123456 दर्ज करें।",
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
    govOffice: "कार्यालय",
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
    verified: "सत्यापित",
    
    step5Eyebrow: "पायरी 5",
    step5Title: "तुम्हाला कोणती माहिती हवी आहे?",
    step5Desc: "तुम्हाला आवश्यक असलेले रेकॉर्ड किंवा माहितीचे वर्णन करा.",
    subject: "विषय",
    subjectPlaceholder: "संक्षिप्त वर्णन",
    words: "शब्द",
    detailedInformation: "तपशीलवार माहिती",
    detailedPlaceholder: "उदा.: कार्य आदेश प्रत, मंजूर रक्कम, खर्च, पूर्णता स्थिती",
    helpMeWrite: "लिहिण्यास मदत करा",
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
    bplProof: "BPL पुरावा",
    demoOnly: "केवळ डेमो",
    supportingDocument: "सहाय्यक कागदपत्र (ऐच्छिक)",
    from: "पासून",
    to: "पर्यंत",
    fromPlaceholder: "उदा.: 2024",
    optional: "ऐच्छिक",
    specificYear: "विशिष्ट वर्ष",
    dateRange: "तारीख श्रेणी",
    financialYear: "आर्थिक वर्ष",
    fromADate: "एका तारखेपासून",
    untilADate: "एका तारखेपर्यंत",
    noSpecificPeriod: "कोणतीही विशिष्ट कालावधी नाही",
    modeEmail: "ईमेल",
    modeRegisteredPost: "रजिस्टर्ड पोस्ट",
    modeInPerson: "प्रत्यक्ष",
    modeOnlinePortal: "ऑनलाइन पोर्टल",
    modePenDrive: "वैयक्तिक पेन ड्राइव्ह",

    step7Eyebrow: "पायरी 7",
    step7Title: "तुमच्या अर्जाचे पुनरावलोकन करा",
    step7Desc: "पैसे भरण्यापूर्वी हे तपशील तपासा.",
    notSelected: "निवडलेले नाही",
    information: "माहिती",
    period: "कालावधी",
    deliveryLabel: "वितरण",
    attachments: "जोडपत्रे",
    none: "काहीही नाही",
    yes: "होय",
    no: "नाही",

    paymentEyebrow: "डेमो पेमेंट",
    paymentTitle: "तुमचे डेमो पेमेंट पूर्ण करा",
    paymentDesc: "केवळ डेमो — प्रत्यक्ष पैसे घेतले जात नाहीत.",
    applicationFee: "आरटीआय अर्ज शुल्क",
    noFee: "शुल्क नाही",
    bplNoFee: "या डेमोमध्ये BPL अर्जदारांसाठी शुल्क नाही.",
    feeNote: "महाराष्ट्र नियमांवर आधारित डेमो शुल्क.",
    upi: "UPI",
    card: "कार्ड",
    netBanking: "नेट बँकिंग",
    
    successTitle: "अर्ज सबमिट केला!",
    successDesc: "तुमचा आरटीआय अर्ज यशस्वीरित्या सबमिट केला गेला आहे.",
    applicationNumber: "अर्ज क्रमांक",
    success: "यशस्वी",
    applicationSubmitted: "अर्ज सबमिट केला",
    demoNotFiled: "डेमो अर्ज तयार केला — कोणत्याही सरकारी पोर्टलवर दाखल केलेला नाही.",
    applicationId: "अर्ज आयडी",
    payment: "पेमेंट",
    demoPaymentComplete: "डेमो पेमेंट पूर्ण",
    notRequired: "आवश्यक नाही",
    
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
    // पर्याय चिप्स (मूल्ये इंग्रजीत राहतात; केवळ लेबल भाषांतरित आहेत)
    choiceSanctionedAmount: "मंजूर रक्कम",
    choiceAmountReleased: "वितरित रक्कम",
    choiceExpenditure: "खर्च",
    choiceContractorDetails: "कंत्राटदाराचे तपशील",
    choiceWorkOrder: "कार्य आदेश",
    choiceCompletionStatus: "पूर्णत्वाची स्थिती",
    choiceInspectionReport: "तपासणी अहवाल",
    // पडताळणी संदेश
    errJurisdiction: "या समस्येसाठी राज्य, जिल्हा, शहर किंवा गाव आणि पिनकोड निवडा.",
    errDepartment: "तुमच्या समस्येशी सर्वात जुळणारे सरकारी क्षेत्र निवडा.",
    errAuthority: "पुढे जाण्यापूर्वी एक सरकारी कार्यालय निवडा.",
    errFullName: "तुमचे पूर्ण नाव टाका.",
    errAddress: "तुमचा संपूर्ण पत्ता टाका.",
    errMobile: "10 अंकी वैध मोबाइल क्रमांक टाका.",
    errEmail: "वैध ईमेल पत्ता टाका.",
    errEmailVerify: "डेमो ओटीपीने तुमचा ईमेल सत्यापित करा.",
    errSubject: "तुमच्या विनंतीसाठी विषय जोडा.",
    errSubjectLength: "विषय 150 शब्दांत ठेवा.",
    errInformation: "तुम्हाला हवी असलेली माहिती किंवा नोंदी वर्णन करा.",
    errPeriod: "माहितीसाठी कालावधी निवडा.",
    errDelivery: "तुम्हाला माहिती कशी मिळवायची आहे ते निवडा.",
    errBplProof: "तुमचा बीपीएल पुरावा जोडा किंवा बीपीएल स्थितीसाठी नाही निवडा.",
    errDirectory: "प्राधिकरण निर्देशिकेपर्यंत पोहोचता आले नाही. कृपया पुन्हा प्रयत्न करा.",
    errEmailBeforeOtp: "डेमो ओटीपी पाठवण्यापूर्वी वैध ईमेल पत्ता टाका.",
    errOtpDemo: "या डेमोसाठी ओटीपी 123456 टाका.",
  },
};

const STORAGE_KEY = "rti-manual-draft";
const departments = [
  ["roads", "Roads & Public Works"], ["education", "Education"], ["health", "Health"], ["agriculture", "Agriculture"],
  ["water", "Water Resources"], ["rural", "Rural Development"], ["municipal", "Municipal Services"], ["housing", "Housing"],
  ["revenue", "Revenue / Land"], ["police", "Police"], ["other", "Other"],
] as const;
const requestChoices = ["Sanctioned amount", "Amount released", "Expenditure", "Contractor details", "Work order", "Completion status", "Inspection report"];
const authorityCategories: Record<string, string> = { roads: "Rural development", education: "School education", health: "Public health", water: "Water supply and sanitation", rural: "Rural development", revenue: "Revenue and land records" };

/**
 * Department ids and request-choice values are persisted, so they stay in English.
 * Only the visible label is translated, which keeps saved drafts readable in any language.
 */
const departmentLabelKeys: Record<string, keyof typeof translations.English> = {
  roads: "roadsPublicWorks", education: "education", health: "health", agriculture: "agriculture",
  water: "waterResources", rural: "ruralDevelopment", municipal: "municipalServices", housing: "housing",
  revenue: "revenueLand", police: "police", other: "other",
};

function departmentLabel(t: typeof translations.English, id: string, fallback: string): string {
  const key = departmentLabelKeys[id];
  return key ? t[key] : fallback;
}

const requestChoiceKeys: Record<string, keyof typeof translations.English> = {
  "Sanctioned amount": "choiceSanctionedAmount", "Amount released": "choiceAmountReleased",
  Expenditure: "choiceExpenditure", "Contractor details": "choiceContractorDetails",
  "Work order": "choiceWorkOrder", "Completion status": "choiceCompletionStatus",
  "Inspection report": "choiceInspectionReport",
};

function requestChoiceLabel(t: typeof translations.English, choice: string): string {
  const key = requestChoiceKeys[choice];
  return key ? t[key] : choice;
}
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
  const [language] = useLanguage();

  const t = translations[language];
  const steps = useMemo(() => getSteps(t), [t]);

  const hasSavedDraft = Boolean(storedDraft) && !resumeDismissed;

  const currentIndex = Math.max(0, steps.findIndex((step) => step.id === draft.currentStep));
  const mockStates = useMemo(() => Array.from(new Set(MOCK_POC_LOCATIONS.map((location) => location.state))), []);
  const mockDistricts = useMemo(() => Array.from(new Set(MOCK_POC_LOCATIONS.filter((location) => location.state === draft.jurisdiction.state).map((location) => location.district))), [draft.jurisdiction.state]);
  const mockCities = useMemo(() => Array.from(new Set(MOCK_POC_LOCATIONS.filter((location) => location.state === draft.jurisdiction.state && location.district === draft.jurisdiction.district).map((location) => location.city))), [draft.jurisdiction.state, draft.jurisdiction.district]);
  const patchDraft = (next: RTIApplicationDraft) => { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); window.dispatchEvent(new Event("rti-manual-draft-change")); setErrors([]); };
  const startNew = () => { window.localStorage.removeItem(STORAGE_KEY); window.dispatchEvent(new Event("rti-manual-draft-change")); setResumeDismissed(true); };
  const continueDraft = () => setResumeDismissed(true);
  const stepError = (step: ManualStep): string[] => {
    if (step === "jurisdiction") return draft.jurisdiction.state && draft.jurisdiction.district && draft.jurisdiction.city && draft.jurisdiction.pincode ? [] : [t.errJurisdiction];
    if (step === "department") return draft.department ? [] : [t.errDepartment];
    if (step === "authority") return draft.publicAuthority ? [] : [t.errAuthority];
    if (step === "applicant") {
      const result: string[] = [];
      if (draft.applicant.fullName.trim().length < 2) result.push(t.errFullName);
      if (draft.applicant.address.trim().length < 10) result.push(t.errAddress);
      if (!isValidMobileNumber(draft.applicant.mobile)) result.push(t.errMobile);
      if (!isValidEmailAddress(draft.applicant.email)) result.push(t.errEmail);
      if (!draft.applicant.emailVerified) result.push(t.errEmailVerify);
      return result;
    }
    if (step === "request") {
      const result: string[] = [];
      if (!draft.request.subject.trim()) result.push(t.errSubject);
      if (draft.request.subject.trim().split(/\s+/).filter(Boolean).length > 150) result.push(t.errSubjectLength);
      if (draft.request.informationRequested.trim().length < 10) result.push(t.errInformation);
      return result;
    }
    if (step === "preferences") {
      const result = draft.informationPeriod.type ? [] : [t.errPeriod];
      if (!draft.delivery.mode) result.push(t.errDelivery);
      if (draft.bpl.isBpl && !draft.bpl.proofFileName) result.push(t.errBplProof);
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
    } catch { setAuthorityNotice(t.errDirectory); }
  };
  const fetchDepartments = async () => {
    try {
      const response = await fetch("/api/authority/directory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft.jurisdiction) });
      const result: unknown = await response.json();
      if (typeof result === "object" && result !== null && "departments" in result && Array.isArray(result.departments)) setDirectoryDepartments(result.departments.filter((item): item is { id: string; name: string; category: string; authorityCount: number } => typeof item === "object" && item !== null && "id" in item && "name" in item && "category" in item && "authorityCount" in item && typeof item.id === "string" && typeof item.name === "string" && typeof item.category === "string" && typeof item.authorityCount === "number"));
    } catch { setDirectoryDepartments([]); }
  };
  const sendOtp = () => { if (isValidEmailAddress(draft.applicant.email)) setOtpSent(true); else setErrors([t.errEmailBeforeOtp]); };
  const verifyOtp = () => { if (otp === "123456") patchDraft(update(draft, "applicant", { ...draft.applicant, emailVerified: true })); else setErrors([t.errOtpDemo]); };
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
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <AppHeader eyebrow={t.manualRTIFiling} showTrack={false} />
      <main className={`${CONTAINER} py-10 flex-1 sm:py-16`}>
        <div className="max-w-[600px]">
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
        </div>
      </main>
      <AppFooter />
    </div>
  );
  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <AppHeader eyebrow={t.manualRTIFiling} showTrack={false} />
      <main className={`${CONTAINER} py-5 flex-1 sm:py-6 lg:py-8`}>
      {/* Step counter */}
      {draft.currentStep !== "success" && draft.currentStep !== "payment" ? (
        <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
          <span className="font-semibold uppercase text-neutral-500 text-[10px] leading-3 tracking-[1.1px] sm:text-xs sm:leading-4 sm:tracking-[1.28px]">{t.manualRTIFiling}</span>
          <span className="text-[10px] text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-lg border-neutral-200 border-1 border-solid sm:text-xs sm:px-3 sm:py-1.5">{t.stepOf} {currentIndex + 1} of 7</span>
        </div>
      ) : null}

      {/* Compact Progress - Hide on success/payment */}
      {draft.currentStep !== "success" && draft.currentStep !== "payment" ? (
        <div className="mb-4 flex items-center gap-1.5 overflow-x-auto pb-1 sm:mb-5 sm:gap-2">
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
        <div role="alert" className="mb-4 px-3 py-2.5 bg-red-50 border-l-4 border-red-500 rounded-r-lg sm:px-4">
          <p className="font-semibold text-sm text-red-900 mb-1">{t.pleaseFix} {errors.length} {errors.length > 1 ? t.items : t.item}:</p>
          <ul className="text-sm text-red-700 space-y-0.5 pl-5 list-disc">
            {errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </div>
      ) : null}

      <WizardContent
        draft={draft} patchDraft={patchDraft} visibleDepartments={visibleDepartmentOptions}
        mockStates={mockStates} mockDistricts={mockDistricts} mockCities={mockCities}
        departmentSearch={departmentSearch} setDepartmentSearch={setDepartmentSearch}
        authorities={authorities} authorityNotice={authorityNotice} otp={otp} setOtp={setOtp}
        otpSent={otpSent} sendOtp={sendOtp} verifyOtp={verifyOtp}
        requestChoices={requestChoices} subjectWords={subjectWords} helpWrite={helpWrite}
        assistBusy={assistBusy} completePayment={completePayment}
        t={t}
      />

      {/* Navigation */}
      <div className="mt-5 pt-4 border-neutral-200 border-t-1 border-solid flex flex-col-reverse gap-3 sm:mt-6 sm:pt-5 sm:flex-row sm:items-center sm:justify-between">
        {draft.currentStep === "success"
          ? <Link
              className="font-semibold rounded-lg bg-neutral-900 text-neutral-50 text-[15px] px-6 h-11 flex items-center justify-center gap-2 border-0"
              href={`/rti/track?id=${encodeURIComponent(draft.submission.registrationNumber)}`}
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
      <AppFooter />
    </div>
  );
}

interface ContentProps { draft: RTIApplicationDraft; patchDraft: (draft: RTIApplicationDraft) => void; visibleDepartments: ReadonlyArray<{ id: string; name: string; category: string; authorityCount: number }>; mockStates: string[]; mockDistricts: string[]; mockCities: string[]; departmentSearch: string; setDepartmentSearch: (value: string) => void; authorities: AuthorityCandidate[]; authorityNotice: string; otp: string; setOtp: (value: string) => void; otpSent: boolean; sendOtp: () => void; verifyOtp: () => void; requestChoices: string[]; subjectWords: number; helpWrite: () => Promise<void>; assistBusy: boolean; completePayment: () => void; t: typeof translations.English; }
function WizardContent({ draft, patchDraft, visibleDepartments, mockStates, mockDistricts, mockCities, departmentSearch, setDepartmentSearch, authorities, authorityNotice, otp, setOtp, otpSent, sendOtp, verifyOtp, requestChoices, subjectWords, helpWrite, assistBusy, t }: ContentProps) {
  const setJurisdiction = (value: Partial<RTIApplicationDraft["jurisdiction"]>) => patchDraft({ ...draft, jurisdiction: { ...draft.jurisdiction, ...value } });
  if (draft.currentStep === "jurisdiction") return <Section eyebrow={t.step1Eyebrow} title={t.step1Title} description={t.step1Desc}><div className="grid gap-3 sm:grid-cols-3"><label className="field-label">{t.state}<select className="field mt-1.5" value={draft.jurisdiction.state} onChange={(event) => setJurisdiction({ state: event.target.value, district: "", city: "", pincode: "" })}><option value="">{t.selectState}</option>{mockStates.map((state) => <option key={state}>{state}</option>)}</select></label><label className="field-label">{t.district}<select className="field mt-1.5" value={draft.jurisdiction.district} onChange={(event) => setJurisdiction({ district: event.target.value, city: "", pincode: "" })} disabled={!draft.jurisdiction.state}><option value="">{t.selectDistrict}</option>{mockDistricts.map((district) => <option key={district}>{district}</option>)}</select></label><label className="field-label">{t.cityVillage}<select className="field mt-1.5" value={draft.jurisdiction.city} onChange={(event) => { const city = event.target.value; const location = MOCK_POC_LOCATIONS.find((item) => item.state === draft.jurisdiction.state && item.district === draft.jurisdiction.district && item.city === city); setJurisdiction({ city, pincode: location?.pincode ?? "" }); }} disabled={!draft.jurisdiction.district}><option value="">{t.selectCityVillage}</option>{mockCities.map((city) => <option key={city}>{city}</option>)}</select></label></div>{draft.jurisdiction.pincode ? <p className="mt-3 text-xs text-neutral-500">{t.pincode}: <span className="font-medium text-neutral-950">{draft.jurisdiction.pincode}</span></p> : null}</Section>;
  if (draft.currentStep === "department") return <Section eyebrow={t.step2Eyebrow} title={t.step2Title} description={t.step2Desc}><input className="field" value={departmentSearch} onChange={(event) => setDepartmentSearch(event.target.value)} placeholder={t.searchDepartments} /><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{visibleDepartments.map((item) => { const selected = draft.department?.id === item.id; return <button key={item.id} type="button" aria-pressed={selected} className={`flex items-center justify-between gap-2 border px-3 py-2.5 text-left rounded-lg cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 ${selected ? "border-[#ec6a2c] bg-[#fff4ee]" : "border-neutral-200 bg-white hover:border-neutral-900"}`} onClick={() => patchDraft({ ...draft, department: { id: item.id, name: item.name, category: item.category }, publicAuthority: null })}><span className={`text-sm text-neutral-950 ${selected ? "font-semibold" : "font-medium"}`}>{departmentLabel(t, item.id, item.name)}</span>{selected ? <svg className="size-4 flex-shrink-0 text-[#ec6a2c]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : null}</button>; })}</div></Section>;
  if (draft.currentStep === "authority") return <Section eyebrow={t.step3Eyebrow} title={t.step3Title} description={t.step3Desc}>{authorities.length ? <div className="grid gap-2">{authorities.map((authority) => { const selected = draft.publicAuthority?.id === authority.id; return <button key={authority.id} type="button" aria-pressed={selected} className={`flex items-start justify-between gap-3 border px-3 py-2.5 text-left rounded-lg cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 ${selected ? "border-[#ec6a2c] bg-[#fff4ee]" : "border-neutral-200 bg-white hover:border-neutral-900"}`} onClick={() => patchDraft({ ...draft, publicAuthority: authority })}><span className="min-w-0"><span className={`block text-sm text-neutral-950 ${selected ? "font-semibold" : "font-medium"}`}>{authority.publicAuthority}</span><span className="mt-0.5 block text-xs text-neutral-500">{authority.department} · {authority.district}</span></span>{selected ? <svg className="size-4 flex-shrink-0 mt-0.5 text-[#ec6a2c]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : null}</button>; })}</div> : <div className="border-l-4 border-[#ec6a2c] bg-[#fff4ee] rounded-r-lg px-3 py-2.5 text-sm text-neutral-700">{authorityNotice || t.noOfficeFound}</div>}</Section>;
  if (draft.currentStep === "applicant") return <Section eyebrow={t.step4Eyebrow} title={t.step4Title} description={t.step4Desc}><div className="grid gap-3 sm:grid-cols-2"><label className="field-label">{t.fullName}<input className="field mt-1.5" value={draft.applicant.fullName} onChange={(event) => patchDraft({ ...draft, applicant: { ...draft.applicant, fullName: event.target.value } })} /></label><label className="field-label">{t.mobileNumber}<input className="field mt-1.5" value={draft.applicant.mobile} onChange={(event) => patchDraft({ ...draft, applicant: { ...draft.applicant, mobile: event.target.value } })} placeholder={t.mobileNumberPlaceholder} /></label><label className="field-label">{t.email}<input className="field mt-1.5" type="email" value={draft.applicant.email} onChange={(event) => patchDraft({ ...draft, applicant: { ...draft.applicant, email: event.target.value, emailVerified: false } })} /></label><label className="field-label sm:col-span-2">{t.address}<textarea className="field mt-1.5 min-h-20 resize-y" value={draft.applicant.address} onChange={(event) => patchDraft({ ...draft, applicant: { ...draft.applicant, address: event.target.value } })} /></label></div><div className="mt-4 border-t border-neutral-200 pt-3"><p className="text-sm font-semibold text-neutral-950">{t.emailVerification} <span className="text-xs font-normal text-neutral-500">{t.demoOTP}</span></p><div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center"><button type="button" className="secondary-button" onClick={sendOtp} disabled={draft.applicant.emailVerified}>{t.sendOTP}</button>{otpSent ? <><input className="field sm:max-w-40" value={otp} onChange={(event) => setOtp(event.target.value)} placeholder={t.otpPlaceholder} inputMode="numeric" /><button type="button" className="primary-button" onClick={verifyOtp}>{t.verify}</button></> : null}{draft.applicant.emailVerified ? <span className="text-xs font-semibold text-green-700">✓ {t.verified}</span> : null}</div></div></Section>;
  if (draft.currentStep === "request") return <Section eyebrow={t.step5Eyebrow} title={t.step5Title} description={t.step5Desc}><label className="field-label">{t.subject}<textarea className="field mt-1.5 min-h-16 resize-y" value={draft.request.subject} onChange={(event) => patchDraft({ ...draft, request: { ...draft.request, subject: event.target.value } })} placeholder={t.subjectPlaceholder} /><span className={`mt-1 block text-right text-xs ${subjectWords > 150 ? "text-red-600" : "text-neutral-500"}`}>{subjectWords}/150 {t.words}</span></label><label className="mt-3 block field-label">{t.detailedInformation}<textarea className="field mt-1.5 min-h-28 resize-y" value={draft.request.informationRequested} onChange={(event) => patchDraft({ ...draft, request: { ...draft.request, informationRequested: event.target.value } })} placeholder={t.detailedPlaceholder} /></label><div className="mt-3 flex flex-wrap gap-2">{requestChoices.map((choice) => { const selected = draft.request.structuredItems.includes(choice); return <button key={choice} type="button" aria-pressed={selected} className={`border px-2.5 py-1.5 text-xs rounded-lg cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 ${selected ? "border-[#ec6a2c] bg-[#fff4ee] font-semibold text-neutral-950" : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-900"}`} onClick={() => { const items = draft.request.structuredItems.includes(choice) ? draft.request.structuredItems.filter((item) => item !== choice) : [...draft.request.structuredItems, choice]; patchDraft({ ...draft, request: { ...draft.request, structuredItems: items } }); }}>{selected ? "✓ " : ""}{requestChoiceLabel(t, choice)}</button>; })}</div><button type="button" className="secondary-button mt-3" onClick={() => void helpWrite()} disabled={assistBusy || !draft.request.informationRequested.trim()}>{assistBusy ? t.writing : t.helpMeWrite}</button></Section>;
  if (draft.currentStep === "preferences") return <Section eyebrow={t.step6Eyebrow} title={t.step6Title} description={t.step6Desc}><div className="grid gap-3 sm:grid-cols-2"><label className="field-label">{t.timePeriod}<select className="field mt-1.5" value={draft.informationPeriod.type} onChange={(event) => patchDraft({ ...draft, informationPeriod: { ...draft.informationPeriod, type: event.target.value } })}><option value="">{t.choosePeriod}</option><option value="Specific year">{t.specificYear}</option><option value="Date range">{t.dateRange}</option><option value="Financial year">{t.financialYear}</option><option value="From a date">{t.fromADate}</option><option value="Until a date">{t.untilADate}</option><option value="No specific period">{t.noSpecificPeriod}</option></select></label><label className="field-label">{t.deliveryMode}<select className="field mt-1.5" value={draft.delivery.mode} onChange={(event) => patchDraft({ ...draft, delivery: { mode: event.target.value } })}><option value="">{t.chooseDelivery}</option><option value="Email">{t.modeEmail}</option><option value="Registered post">{t.modeRegisteredPost}</option><option value="In person">{t.modeInPerson}</option><option value="Online portal">{t.modeOnlinePortal}</option><option value="Personal pen drive">{t.modePenDrive}</option></select></label></div>{draft.informationPeriod.type && draft.informationPeriod.type !== "No specific period" ? <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="field-label">{t.from}<input className="field mt-1.5" value={draft.informationPeriod.from} onChange={(event) => patchDraft({ ...draft, informationPeriod: { ...draft.informationPeriod, from: event.target.value } })} placeholder={t.fromPlaceholder} /></label><label className="field-label">{t.to}<input className="field mt-1.5" value={draft.informationPeriod.to} onChange={(event) => patchDraft({ ...draft, informationPeriod: { ...draft.informationPeriod, to: event.target.value } })} placeholder={t.optional} /></label></div> : null}<fieldset className="mt-4 border-t border-neutral-200 pt-3"><legend className="field-label">{t.bplQuestion}</legend><div className="mt-2 flex gap-5 text-sm text-neutral-950"><label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="bpl" className="cursor-pointer" checked={!draft.bpl.isBpl} onChange={() => patchDraft({ ...draft, bpl: { ...draft.bpl, isBpl: false, proofFileName: "" }, payment: { ...draft.payment, required: true, amount: 10 } })} /> {t.no}</label><label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="bpl" className="cursor-pointer" checked={draft.bpl.isBpl} onChange={() => patchDraft({ ...draft, bpl: { ...draft.bpl, isBpl: true }, payment: { ...draft.payment, required: false, amount: 0, status: "not_required" } })} /> {t.yes}</label></div></fieldset>{draft.bpl.isBpl ? <label className="mt-3 block field-label">{t.bplProof}<input className="field mt-1.5" type="file" accept="application/pdf,image/*" onChange={(event) => patchDraft({ ...draft, bpl: { ...draft.bpl, proofFileName: event.target.files?.[0]?.name ?? "" } })} /><span className="mt-1 block text-xs text-neutral-500">{t.demoOnly}</span></label> : null}<label className="mt-3 block field-label">{t.supportingDocument}<input className="field mt-1.5" type="file" accept="application/pdf,image/*,.doc,.docx" onChange={(event) => { const file = event.target.files?.[0]; if (file) patchDraft({ ...draft, attachments: [{ id: `attachment-${Date.now()}`, name: file.name, size: file.size, type: file.type }] }); }} /></label></Section>;
  if (draft.currentStep === "review") return <Section eyebrow={t.step7Eyebrow} title={t.step7Title} description={t.step7Desc}><div className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">{[[t.location, `${draft.jurisdiction.city}, ${draft.jurisdiction.district}, ${draft.jurisdiction.state}`], [t.department, draft.department?.name ?? t.notSelected], [t.govOffice, draft.publicAuthority?.publicAuthority ?? t.notSelected], [t.yourDetails, `${draft.applicant.fullName} · ${draft.applicant.email}`], [t.subject, draft.request.subject], [t.information, draft.request.informationRequested], [t.period, `${draft.informationPeriod.type}${draft.informationPeriod.from ? `: ${draft.informationPeriod.from}${draft.informationPeriod.to ? ` → ${draft.informationPeriod.to}` : ""}` : ""}`], [t.deliveryLabel, draft.delivery.mode], [t.bplStatus, draft.bpl.isBpl ? `${t.yes} · ${draft.bpl.proofFileName}` : t.no], [t.attachments, draft.attachments.length ? draft.attachments.map((item) => item.name).join(", ") : t.none]].map(([label, value]) => <div key={label} className="border-b border-neutral-200 pb-2"><p className="text-xs font-medium text-neutral-500">{label}</p><p className="mt-0.5 whitespace-pre-wrap text-sm text-neutral-950">{value}</p></div>)}</div></Section>;
  if (draft.currentStep === "payment") return <Section eyebrow={t.paymentEyebrow} title={t.paymentTitle} description={t.paymentDesc}><div className="flex items-center justify-between border-b border-neutral-200 pb-3"><span className="text-sm text-neutral-950">{draft.payment.required ? t.applicationFee : t.noFee}</span><strong className="text-lg text-neutral-950">₹{draft.payment.amount}</strong></div><p className="mt-2 text-xs text-neutral-500">{draft.bpl.isBpl ? t.bplNoFee : t.feeNote}</p><div className="mt-3 grid gap-2 sm:grid-cols-3"><button type="button" className="secondary-button">{t.upi}</button><button type="button" className="secondary-button">{t.card}</button><button type="button" className="secondary-button">{t.netBanking}</button></div></Section>;
  return (
    <div className="max-w-[600px] mx-auto">
      <div className="mb-4 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-2.5 sm:w-14 sm:h-14 sm:mb-3">
          <svg className="size-6 text-green-600 sm:size-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span className="font-semibold uppercase text-neutral-500 text-[10px] leading-3 tracking-[1.1px] block mb-1.5 sm:text-xs sm:leading-4 sm:tracking-[1.28px] sm:mb-2">{t.success}</span>
        <h2 className="font-bold text-neutral-950 text-[22px] leading-[28px] sm:text-[28px] sm:leading-[34px]">{t.applicationSubmitted}</h2>
        <p className="mt-1.5 text-neutral-500 text-sm leading-5 px-4 sm:mt-2 sm:px-0">{t.demoNotFiled}</p>
      </div>

      <div className="shadow-[0_1px_2px_rgba(0,0,0,0.06)] rounded-xl bg-white border-neutral-200 border-1 border-solid p-4 sm:p-5">
        <div className="border-neutral-200 border-b-1 border-solid pb-3 mb-3 sm:mb-3.5">
          <p className="font-semibold uppercase text-neutral-500 text-[10px] leading-3 tracking-[1.1px] sm:text-xs sm:leading-4 sm:tracking-[1.28px]">{t.applicationId}</p>
          <p className="mt-1.5 font-mono text-xl font-bold tracking-wider text-neutral-950 break-all sm:text-2xl">{draft.submission.registrationNumber}</p>
        </div>

        <div className="space-y-2.5 sm:space-y-3">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <svg className="size-4 text-neutral-400 flex-shrink-0 mt-0.5 sm:size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <div className="flex-1">
              <p className="text-xs font-medium text-neutral-950 sm:text-sm">{t.department}</p>
              <p className="text-xs text-neutral-500 sm:text-sm">{draft.department?.name}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-2.5 sm:gap-3">
            <svg className="size-4 text-neutral-400 flex-shrink-0 mt-0.5 sm:size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-xs font-medium text-neutral-950 sm:text-sm">{t.govOffice}</p>
              <p className="text-xs text-neutral-500 sm:text-sm">{draft.publicAuthority?.publicAuthority}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-2.5 sm:gap-3">
            <svg className="size-4 text-neutral-400 flex-shrink-0 mt-0.5 sm:size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-xs font-medium text-neutral-950 sm:text-sm">{t.payment}</p>
              <p className="text-xs text-neutral-500 sm:text-sm">{draft.payment.status === "paid" ? t.demoPaymentComplete : t.notRequired}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function Section({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 sm:mb-5">
      <div className="mb-3 sm:mb-4">
        <span className="font-semibold uppercase text-neutral-500 text-[10px] leading-3 tracking-[1.1px] sm:text-xs sm:leading-4 sm:tracking-[1.28px]">{eyebrow}</span>
        <h2 className="mt-1.5 font-bold text-neutral-950 text-[20px] leading-[26px] sm:text-[24px] sm:leading-[30px]">{title}</h2>
        <p className="mt-1 text-neutral-500 text-xs leading-5 sm:text-sm sm:leading-5">{description}</p>
      </div>
      <div className="shadow-[0_1px_2px_rgba(0,0,0,0.06)] rounded-xl bg-white border-neutral-200 border-1 border-solid p-4 sm:p-5">
        {children}
      </div>
    </section>
  );
}

