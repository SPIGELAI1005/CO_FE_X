const CODE_PATTERN = /^[A-Z0-9]{4,16}$/;
const ROTATING_PATTERN = /^[0-9]{4,6}$/;

export interface ParsedVerifyInput {
  code: string;
  rotatingToken?: string;
}

/** Extract redemption code (and optional live token) from scanned QR text or manual entry. */
export function parseVerifyInput(raw: string): ParsedVerifyInput | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const asUrl = trimmed.startsWith("http") ? new URL(trimmed) : new URL(trimmed, "https://cofex.local");
    const fromQuery = asUrl.searchParams.get("code");
    const tokenFromQuery = asUrl.searchParams.get("token") ?? asUrl.searchParams.get("tok");
    if (fromQuery) {
      const normalized = fromQuery.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!CODE_PATTERN.test(normalized)) return null;
      const token = tokenFromQuery?.replace(/\D/g, "");
      return token && ROTATING_PATTERN.test(token)
        ? { code: normalized, rotatingToken: token }
        : { code: normalized };
    }
  } catch {
    // not a URL
  }

  const parts = trimmed.toUpperCase().split(/[\s\-:]+/).filter(Boolean);
  if (parts.length >= 2) {
    const code = parts[0].replace(/[^A-Z0-9]/g, "");
    const token = parts[1].replace(/\D/g, "");
    if (CODE_PATTERN.test(code)) {
      return token && ROTATING_PATTERN.test(token) ? { code, rotatingToken: token } : { code };
    }
  }

  const normalized = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return CODE_PATTERN.test(normalized) ? { code: normalized } : null;
}

/** Extract redemption code from scanned QR text (URL or raw code). */
export function parseVerifyCode(raw: string): string | null {
  return parseVerifyInput(raw)?.code ?? null;
}
