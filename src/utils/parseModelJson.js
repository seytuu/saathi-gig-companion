// @ts-check

/**
 * Robustly parse JSON returned by a language model. Strips Markdown code
 * fences, trailing commentary and leading prose. Returns null on failure.
 *
 * @param {string} raw
 * @returns {unknown|null}
 */
export function parseModelJson(raw) {
  if (typeof raw !== 'string') return null;
  let s = raw.trim();
  if (!s) return null;

  // Strip triple-backtick fence (``` or ```json)
  const fence = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```\s*$/i);
  if (fence) s = fence[1].trim();

  // Try direct parse first
  try {
    return JSON.parse(s);
  } catch {
    // Fall through to brace-slicing
  }

  // Slice from first { or [ to the last matching } or ]
  const firstObj = s.indexOf('{');
  const firstArr = s.indexOf('[');
  const start = [firstObj, firstArr].filter((i) => i >= 0).sort((a, b) => a - b)[0];
  if (start === undefined) return null;
  const open = s[start];
  const close = open === '{' ? '}' : ']';
  const end = s.lastIndexOf(close);
  if (end <= start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    return null;
  }
}
