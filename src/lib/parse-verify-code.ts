const CODE_PATTERN = /^[A-Z0-9]{4,16}$/;

/** Extract redemption code from scanned QR text (URL or raw code). */
export function parseVerifyCode(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const asUrl = trimmed.startsWith("http") ? new URL(trimmed) : new URL(trimmed, "https://cofex.local");
    const fromQuery = asUrl.searchParams.get("code");
    if (fromQuery) {
      const normalized = fromQuery.toUpperCase().replace(/[^A-Z0-9]/g, "");
      return CODE_PATTERN.test(normalized) ? normalized : null;
    }
  } catch {
    // not a URL
  }

  const normalized = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return CODE_PATTERN.test(normalized) ? normalized : null;
}
