/**
 * Parent phrase masking (R13.6).
 *
 * The simulator doesn't know the phrase in advance. Whenever the host passes a
 * `parentPhrase` argument, that value becomes a secret, and every place that
 * shows text (conversation, protocol panel, the host's own speech) replaces it
 * with dots. Matching ignores case, punctuation, and spacing, like the server.
 */

export const MASK = "••••••";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function phraseRegex(phrase: string): RegExp | null {
  const words = phrase
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return null;
  return new RegExp(words.map(escape).join("[\\s\\p{P}]+") + "[\\p{P}]*", "giu");
}

export function maskText(text: string, secrets: Iterable<string>): string {
  let out = text;
  for (const s of secrets) {
    const re = phraseRegex(s);
    if (re) out = out.replace(re, MASK);
  }
  return out;
}

/** Deep-copy a JSON value with every `parentPhrase` field replaced by dots. */
export function maskArgs<T>(value: T): T {
  if (Array.isArray(value)) return value.map(maskArgs) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, k === "parentPhrase" && typeof v === "string" ? MASK : maskArgs(v)]),
    ) as T;
  }
  return value;
}

/** Collect every parentPhrase value found anywhere in a JSON value. */
export function findPhrases(value: unknown, into: Set<string>): void {
  if (Array.isArray(value)) value.forEach((v) => findPhrases(v, into));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (k === "parentPhrase" && typeof v === "string" && v.trim()) into.add(v);
      else findPhrases(v, into);
    }
  }
}
