// @ts-check

/**
 * Inline mirror of the server's /api/config shape. Lets the client paint
 * Home immediately on cold start instead of waiting on a network round
 * trip. On boot, main.js kicks off a background refresh and merges any
 * drift (helplines, limits etc. are intentionally stable).
 */
export const inlineConfig = Object.freeze({
  modes: ['earnings', 'safety', 'schemes', 'document', 'grievance', 'scam'],
  languages: ['English', 'Hindi', 'Hinglish', 'Punjabi', 'Tamil', 'Telugu', 'Bengali', 'Marathi'],
  workTypes: ['delivery', 'driver', 'daily-wage', 'domestic', 'other'],
  platforms: ['Swiggy', 'Zomato', 'Blinkit', 'Zepto', 'Uber', 'Ola', 'Rapido', 'Urban Company', 'Other'],
  helplines: [
    { label: 'Emergency (All India)', number: '112', kind: 'emergency' },
    { label: 'Ambulance', number: '108', kind: 'medical' },
    { label: "Women's helpline", number: '1091', kind: 'women' },
    { label: 'Women in distress', number: '181', kind: 'women' },
    { label: 'National Highway helpline', number: '1033', kind: 'road' },
    { label: 'Police', number: '100', kind: 'emergency' },
    { label: 'Cyber crime (fraud)', number: '1930', kind: 'fraud' },
  ],
  limits: { maxTextChars: 2000, maxMediaParts: 20, maxMediaBytes: 3_500_000 },
});
