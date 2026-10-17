// @ts-check

/**
 * Central config. No magic numbers/strings elsewhere.
 * All values can be overridden via env.
 */
export const config = Object.freeze({
  port: Number(process.env.PORT) || 8080,
  nodeEnv: process.env.NODE_ENV || 'development',

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    timeoutMs: 45_000,
    retryStatuses: [429, 500, 502, 503, 504],
    temperature: 0.3,
  },

  limits: {
    jsonBodyMb: '4mb',
    maxTextChars: 2000,
    maxMediaParts: 20,
    maxMediaBytes: 3_500_000, // ~3.5MB total decoded
    maxProfileFieldChars: 80,
  },

  rateLimit: {
    windowMs: 60_000,
    max: 30,
  },

  cache: {
    maxEntries: 100,
    ttlMs: 10 * 60_000,
  },

  modes: ['earnings', 'safety', 'schemes', 'document', 'grievance', 'scam'],

  languages: [
    'English',
    'Hindi',
    'Hinglish',
    'Punjabi',
    'Tamil',
    'Telugu',
    'Bengali',
    'Marathi',
  ],

  workTypes: ['delivery', 'driver', 'daily-wage', 'domestic', 'other'],

  platforms: [
    'Swiggy',
    'Zomato',
    'Blinkit',
    'Zepto',
    'Uber',
    'Ola',
    'Rapido',
    'Urban Company',
    'Other',
  ],

  mediaMimeAllowed: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],

  // Permissions-Policy header. Allow the APIs we actually use.
  permissionsPolicy: 'microphone=(self), camera=(self), geolocation=(self)',

  // Hard-coded, never AI-generated.
  helplines: [
    { label: 'Emergency (All India)', number: '112', kind: 'emergency' },
    { label: 'Ambulance', number: '108', kind: 'medical' },
    { label: "Women's helpline", number: '1091', kind: 'women' },
    { label: 'Women in distress', number: '181', kind: 'women' },
    { label: 'National Highway helpline', number: '1033', kind: 'road' },
    { label: 'Police', number: '100', kind: 'emergency' },
    { label: 'Cyber crime (fraud)', number: '1930', kind: 'fraud' },
  ],
});

/** @typedef {typeof config} Config */
