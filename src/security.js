// @ts-check

/**
 * Single source of truth for Content-Security-Policy.
 *
 * Vercel's static layer serves /public/* and never runs Express — so helmet's
 * CSP header never reaches index.html in production. We mirror the same CSP
 * into vercel.json's /(.*) rule, and a test asserts the two stay in sync.
 *
 * Keys are camelCase so helmet accepts them directly. serializeCsp() emits
 * the browser-canonical "kebab-case value ...;" form that vercel.json uses.
 */
export const cspDirectives = Object.freeze({
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  // Google Fonts stylesheet lives at fonts.googleapis.com; files at fonts.gstatic.com.
  styleSrc: ["'self'", 'https://fonts.googleapis.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com'],
  // data: for canvas thumbnails; blob: for MediaRecorder playback (M4b).
  imgSrc: ["'self'", 'data:', 'blob:'],
  mediaSrc: ["'self'", 'blob:'],
  // Browser never calls third-party APIs. Weather/AQI/geocoding etc. are
  // proxied through our own /api/conditions so keys and traffic stay server-side.
  connectSrc: ["'self'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'none'"],
});

/** @param {string} s */
function kebab(s) {
  return s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
}

/**
 * Serialize CSP directives into the exact format we put in vercel.json.
 * @param {Record<string, string[]>} [dirs]
 */
export function serializeCsp(dirs = cspDirectives) {
  return Object.entries(dirs)
    .map(([k, v]) => `${kebab(k)} ${v.join(' ')}`)
    .join(';');
}
