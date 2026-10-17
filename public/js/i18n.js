// @ts-check

/**
 * Minimal i18n for shell UI (tabs, forms, buttons). AI output is already
 * returned in the worker's language, so we only translate chrome here.
 *
 * At least English and Hindi are complete; others fall back to English.
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
    'home.greeting': 'Namaste',
    'home.recent': 'Recent activity',
    'home.empty': 'No activity yet. Pick a tab to start.',
    'home.openGrievances': 'Open grievances',
    'generic.error': 'Something went wrong. Please try again.',
    'generic.loading': 'Working…',
    'generic.try': 'Try example',
    'generic.listen': 'Listen',
    'generic.mic': 'Speak',
    'generic.comingSoon': 'Coming next',
    'profile.edit': 'Edit profile',
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
    'home.greeting': 'नमस्ते',
    'home.recent': 'हाल की गतिविधि',
    'home.empty': 'अभी कुछ नहीं। कोई टैब चुनें।',
    'home.openGrievances': 'खुली शिकायतें',
    'generic.error': 'कुछ गड़बड़ हुई। फिर से कोशिश करें।',
    'generic.loading': 'कर रहा हूँ…',
    'generic.try': 'उदाहरण आज़माएँ',
    'generic.listen': 'सुनें',
    'generic.mic': 'बोलें',
    'generic.comingSoon': 'जल्द आ रहा है',
    'profile.edit': 'प्रोफ़ाइल बदलें',
  },
};

/** HTML lang attribute for a Saathi language. */
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

/** @param {string} lang @returns {Record<string,string>} */
function pack(lang) {
  return dict[lang] || dict.English;
}

/** @param {string} lang @param {string} key */
export function t(lang, key) {
  const p = pack(lang);
  if (p[key]) return p[key];
  return dict.English[key] || key;
}

/** Replace `data-i18n` placeholders in the given root. */
export function applyI18n(root, lang) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(lang, key);
  });
  document.documentElement.lang = htmlLang(lang);
}
