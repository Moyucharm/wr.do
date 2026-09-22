import { stripHtml } from "./html-to-text";

const IGNORED_CANDIDATES: Record<string, true> = {
  CODE: true,
  OTP: true,
  PIN: true,
  IS: true,
  YOUR: true,
  VERIFY: true,
  VERIFICATION: true,
  SECURITY: true,
  LOGIN: true,
  ACCOUNT: true,
  EMAIL: true,
  BELOW: true,
  ABOVE: true,
  USE: true,
  ENTER: true,
  PLEASE: true,
  CONFIRMATION: true,
  AUTHENTICATION: true,
  AUTH: true,
  PASSCODE: true,
  PASSWORD: true,
  ONE: true,
  TIME: true,
  VALID: true,
  EXPIRES: true,
  MINUTE: true,
  MINUTES: true,
  NEVER: true,
  SHARE: true,
  THIS: true,
  WITH: true,
  FROM: true,
  HAS: true,
  BEEN: true,
  SENT: true,
  CLICK: true,
  BUTTON: true,
  CONTINUE: true,
};

const CONTEXT_PATTERN =
  /\b(?:verification code|confirmation code|authentication code|one-time password|one-time code|security code|login code|auth code|passcode|OTP|PIN)\b|验证码|校验码|动态码|认证码/gi;
const CANDIDATE_PATTERN = /[A-Za-z0-9]+(?:-[A-Za-z0-9]+){0,2}/g;
const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<]+/gi;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

interface Candidate {
  value: string;
  position: number;
  distance: number;
}

function normalizeSource(value: string): string {
  return value
    .normalize("NFKC")
    .replace(URL_PATTERN, (match) => " ".repeat(match.length))
    .replace(EMAIL_PATTERN, (match) => " ".repeat(match.length))
    .replace(/\s+/g, " ")
    .trim();
}

function isCandidateAllowed(
  source: string,
  value: string,
  position: number,
): boolean {
  const end = position + value.length;
  const previous = source[position - 1];
  const next = source[end];

  if (
    (previous !== undefined && /[A-Za-z0-9]/.test(previous)) ||
    previous === "-" ||
    previous === "#" ||
    (next !== undefined && /[A-Za-z0-9]/.test(next)) ||
    next === "-"
  ) {
    return false;
  }

  const compact = value.replace(/-/g, "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  if (compact.length < 4 || compact.length > 10) return false;
  if (IGNORED_CANDIDATES[value.toUpperCase()]) return false;

  return true;
}

function collectCandidates(
  source: string,
  start: number,
  end: number,
  contextStart: number,
  contextEnd: number,
): Candidate[] {
  const candidates: Candidate[] = [];
  const window = source.slice(start, end);

  CANDIDATE_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = CANDIDATE_PATTERN.exec(window)) !== null) {
    const value = match[0];
    const position = start + (match.index ?? 0);
    const candidateEnd = position + value.length;

    if (candidateEnd > contextStart && position < contextEnd) continue;
    if (!isCandidateAllowed(source, value, position)) continue;

    const distance =
      candidateEnd <= contextStart
        ? contextStart - candidateEnd
        : position - contextEnd;
    candidates.push({ value, position, distance });
  }

  return candidates;
}

function extractFromSource(value: string): string | null {
  const source = normalizeSource(value);
  if (!source) return null;

  const candidates: Candidate[] = [];
  CONTEXT_PATTERN.lastIndex = 0;
  let contextMatch: RegExpExecArray | null;

  while ((contextMatch = CONTEXT_PATTERN.exec(source)) !== null) {
    const contextStart = contextMatch.index ?? 0;
    const contextEnd = contextStart + contextMatch[0].length;
    candidates.push(
      ...collectCandidates(
        source,
        Math.max(0, contextStart - 32),
        Math.min(source.length, contextEnd + 64),
        contextStart,
        contextEnd,
      ),
    );
  }

  candidates.sort(
    (left, right) =>
      left.distance - right.distance || left.position - right.position,
  );
  return candidates[0]?.value ?? null;
}

export function extractVerificationCode(input: {
  subject?: string | null;
  text?: string | null;
  html?: string | null;
}): string | null {
  try {
    const sources = [
      input.subject,
      input.text,
      input.html ? stripHtml(input.html) : null,
    ];

    for (const source of sources) {
      if (!source) continue;
      const code = extractFromSource(source);
      if (code) return code;
    }

    return null;
  } catch {
    return null;
  }
}
