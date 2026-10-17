// @ts-check

/**
 * Minimal i18n for shell UI (tabs, forms, buttons). AI output is already
 * returned in the worker's language, so we only translate chrome here.
 *
 * English and Hindi are complete. Other Indian languages fall back to
 * English keys for now (future work: fill in).
 */
const dict = {
  English: {
    'tagline': 'AI working for the worker',

    'tabs.home': 'Home',
    'tabs.earnings': 'Earnings',
    'tabs.safety': 'Safety',
    'tabs.schemes': 'Schemes',
    'tabs.document': 'Docs',
    'tabs.grievance': 'Grievance',

    'onboarding.intro': 'Set up your profile. Takes 30 seconds.',
    'onboarding.save': 'Save and start',
    'profile.name': 'Name',
    'profile.workType': 'Work type',
    'profile.platform': 'Platform or employer',
    'profile.city': 'City',
    'profile.state': 'State',
    'profile.language': 'Language',
    'profile.simpleMode': 'Simple mode',
    'profile.simpleMode.help': 'Big text, simple words, voice first',
    'profile.edit': 'Edit profile',

    'home.greeting': 'Namaste',
    'home.recent': 'Recent activity',
    'home.empty': 'No activity yet. Pick a tab to start.',
    'home.openGrievances': 'Open grievances',

    'grievance.title': 'Write a complaint',
    'grievance.describe': 'Tell Saathi what went wrong. In your own words.',
    'grievance.run': 'Draft my complaint',
    'grievance.subject': 'Subject',
    'grievance.english': 'English letter',
    'grievance.local': 'Letter in your language',
    'grievance.where': 'Where to submit',
    'grievance.evidence': 'Attach these as evidence',
    'grievance.copy': 'Copy',
    'grievance.download': 'Download .txt',
    'grievance.share': 'Share',
    'grievance.save': 'Save to my record',

    'schemes.title': 'Welfare schemes for you',
    'schemes.describe': 'Describe what help you need (optional). Or just press the button for matches.',
    'schemes.run': 'Find schemes',
    'schemes.empty': 'No matching schemes right now. Try different words.',
    'schemes.benefits': 'What you get',
    'schemes.howTo': 'How to apply',
    'schemes.docs': 'Documents you will need',
    'schemes.save': 'Save',
    'schemes.saved': 'Saved',
    'schemes.apply': 'Help me apply',
    'schemes.official': 'Official portal',

    'document.title': 'Explain this paper',
    'document.describe': 'Upload a photo of the paper or a PDF. Add a question if you want.',
    'document.pickFile': 'Photo or PDF',
    'document.question': 'What do you want to know?',
    'document.run': 'Explain',
    'document.explain': 'What this means',
    'document.keyPoints': 'Key points',
    'document.actions': 'What to do',
    'document.warnings': 'Warnings',
    'document.unknown': 'Document',
    'document.save': 'Save to my record',
    'document.saved': 'Saved',
    'document.checklistFor': 'Documents checklist for',
    'document.checklistHelp': 'Tick off as you collect each one.',
    'document.pdfTooLarge': 'PDF is too large. Please pick one under 3 MB.',

    'earnings.title': 'Earnings ledger',
    'earnings.describe': 'Type, speak or paste. Or add a screenshot / SMS / PDF. Saathi will read everything and fill the ledger.',
    'earnings.textLabel': 'In your words',
    'earnings.placeholder': 'aaj 14 order kiye, 920 aaye, petrol 180 ka dalwaya',
    'earnings.pickFile': 'Screenshot or PDF (optional)',
    'earnings.run': 'Add to ledger',
    'earnings.needInput': 'Please type something or attach a screenshot.',
    'earnings.sampleText': 'Try: text',
    'earnings.sampleSms': 'Try: SMS',
    'earnings.sampleMissing': 'Try: missing incentive',
    'earnings.tip': 'Tip',
    'earnings.empty': 'Nothing found. Try different words or a clearer photo.',
    'earnings.saved': 'Added to your ledger',
    'earnings.dispute': 'Dispute this',
    'earnings.ledgerTitle': 'My ledger',
    'earnings.ledgerEmpty': 'Empty. Your entries will show here.',
    'earnings.weekSoFar': 'Last 7 days',
    'earnings.col.date': 'Date',
    'earnings.col.platform': 'Platform',
    'earnings.col.orders': 'Orders',
    'earnings.col.gross': 'Gross',
    'earnings.col.incentives': 'Incentive',
    'earnings.col.deductions': 'Deductions',
    'earnings.col.expenses': 'Expenses',
    'earnings.col.net': 'Net',

    'generic.error': 'Something went wrong. Please try again.',
    'generic.loading': 'Working…',
    'generic.try': 'Try example',
    'generic.listen': 'Listen',
    'generic.mic': 'Speak',
    'generic.comingSoon': 'Coming next',
    'generic.back': 'Back',
  },
  Hindi: {
    'tagline': 'मजदूर के साथ काम करने वाला AI',

    'tabs.home': 'घर',
    'tabs.earnings': 'कमाई',
    'tabs.safety': 'सुरक्षा',
    'tabs.schemes': 'योजनाएं',
    'tabs.document': 'कागज़',
    'tabs.grievance': 'शिकायत',

    'onboarding.intro': 'अपनी जानकारी भरें। 30 सेकंड लगेंगे।',
    'onboarding.save': 'शुरू करें',
    'profile.name': 'नाम',
    'profile.workType': 'काम का प्रकार',
    'profile.platform': 'ऐप / नियोक्ता',
    'profile.city': 'शहर',
    'profile.state': 'राज्य',
    'profile.language': 'भाषा',
    'profile.simpleMode': 'आसान मोड',
    'profile.simpleMode.help': 'बड़े अक्षर, आसान शब्द, आवाज़ पहले',
    'profile.edit': 'प्रोफ़ाइल बदलें',

    'home.greeting': 'नमस्ते',
    'home.recent': 'हाल की गतिविधि',
    'home.empty': 'अभी कुछ नहीं। कोई टैब चुनें।',
    'home.openGrievances': 'खुली शिकायतें',

    'grievance.title': 'शिकायत लिखें',
    'grievance.describe': 'अपनी बात बताएं। जैसे बोलते हैं वैसे ही लिखें।',
    'grievance.run': 'मेरी शिकायत तैयार करें',
    'grievance.subject': 'विषय',
    'grievance.english': 'अंग्रेज़ी में पत्र',
    'grievance.local': 'आपकी भाषा में पत्र',
    'grievance.where': 'कहाँ जमा करें',
    'grievance.evidence': 'ये सबूत साथ लगाएँ',
    'grievance.copy': 'कॉपी',
    'grievance.download': 'डाउनलोड',
    'grievance.share': 'भेजें',
    'grievance.save': 'रिकॉर्ड में सहेजें',

    'schemes.title': 'आपके लिए सरकारी योजनाएं',
    'schemes.describe': 'आपको क्या मदद चाहिए? (वैकल्पिक) या सीधे बटन दबाएँ।',
    'schemes.run': 'योजनाएं ढूँढें',
    'schemes.empty': 'अभी कोई मेल खाती योजना नहीं। अलग शब्दों से कोशिश करें।',
    'schemes.benefits': 'क्या मिलेगा',
    'schemes.howTo': 'आवेदन कैसे करें',
    'schemes.docs': 'कौन से कागज़ चाहिए',
    'schemes.save': 'सहेजें',
    'schemes.saved': 'सहेज लिया',
    'schemes.apply': 'आवेदन में मदद चाहिए',
    'schemes.official': 'आधिकारिक पोर्टल',

    'document.title': 'यह कागज़ समझाओ',
    'document.describe': 'कागज़ की फोटो या PDF भेजें। चाहें तो सवाल भी लिखें।',
    'document.pickFile': 'फोटो या PDF',
    'document.question': 'क्या जानना चाहते हैं?',
    'document.run': 'समझाओ',
    'document.explain': 'इसका मतलब',
    'document.keyPoints': 'ज़रूरी बातें',
    'document.actions': 'क्या करना है',
    'document.warnings': 'चेतावनी',
    'document.unknown': 'कागज़',
    'document.save': 'सहेजें',
    'document.saved': 'सहेज लिया',
    'document.checklistFor': 'कागज़ों की सूची —',
    'document.checklistHelp': 'जैसे-जैसे मिलते जाएँ, निशान लगाते जाएँ।',
    'document.pdfTooLarge': 'PDF बहुत बड़ी है। 3 MB से छोटी चुनें।',

    'earnings.title': 'कमाई का हिसाब',
    'earnings.describe': 'लिखें, बोलें या पेस्ट करें। स्क्रीनशॉट/SMS/PDF भी चलेगा। साथी सब पढ़कर खाता भरेगा।',
    'earnings.textLabel': 'अपने शब्दों में',
    'earnings.placeholder': 'aaj 14 order kiye, 920 aaye, petrol 180 ka dalwaya',
    'earnings.pickFile': 'स्क्रीनशॉट या PDF (वैकल्पिक)',
    'earnings.run': 'खाते में जोड़ो',
    'earnings.needInput': 'कुछ लिखें या स्क्रीनशॉट लगाएँ।',
    'earnings.sampleText': 'उदाहरण: बात',
    'earnings.sampleSms': 'उदाहरण: SMS',
    'earnings.sampleMissing': 'उदाहरण: incentive नहीं आया',
    'earnings.tip': 'सलाह',
    'earnings.empty': 'कुछ नहीं मिला। दूसरे शब्दों से कोशिश करें।',
    'earnings.saved': 'खाते में जोड़ दिया',
    'earnings.dispute': 'इस पर शिकायत',
    'earnings.ledgerTitle': 'मेरा खाता',
    'earnings.ledgerEmpty': 'खाली है। यहाँ दिखेगा।',
    'earnings.weekSoFar': 'पिछले 7 दिन',
    'earnings.col.date': 'तारीख़',
    'earnings.col.platform': 'ऐप',
    'earnings.col.orders': 'ऑर्डर',
    'earnings.col.gross': 'कुल आया',
    'earnings.col.incentives': 'इंसेंटिव',
    'earnings.col.deductions': 'कटौती',
    'earnings.col.expenses': 'खर्चा',
    'earnings.col.net': 'शुद्ध',

    'generic.error': 'कुछ गड़बड़ हुई। फिर से कोशिश करें।',
    'generic.loading': 'कर रहा हूँ…',
    'generic.try': 'उदाहरण आज़माएँ',
    'generic.listen': 'सुनें',
    'generic.mic': 'बोलें',
    'generic.comingSoon': 'जल्द आ रहा है',
    'generic.back': 'वापस',
  },
};

const htmlLangMap = {
  English: 'en',
  Hindi: 'hi',
  Hinglish: 'hi-Latn',
  Punjabi: 'pa',
  Tamil: 'ta',
  Telugu: 'te',
  Bengali: 'bn',
  Marathi: 'mr',
};

/** @param {string} lang */
export function htmlLang(lang) {
  return htmlLangMap[lang] || 'en';
}

/** @param {string} lang */
function pack(lang) {
  return dict[lang] || dict.English;
}

/** @param {string} lang @param {string} key */
export function t(lang, key) {
  const p = pack(lang);
  if (p[key]) return p[key];
  return dict.English[key] || key;
}

/** Replace `data-i18n` placeholders inside the given root. */
export function applyI18n(root, lang) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(lang, key);
  });
  root.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria-label');
    if (key) el.setAttribute('aria-label', t(lang, key));
  });
  document.documentElement.lang = htmlLang(lang);
}
