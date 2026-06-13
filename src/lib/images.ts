/**
 * Supabase Storage image transforms (render endpoint).
 * Falls back to the original URL for non-storage images.
 */
export function optimizeImageUrl(
  url: string | null | undefined,
  options: { width?: number; height?: number; quality?: number } = {},
): string | undefined {
  if (!url) return undefined;

  const { width = 800, height, quality = 80 } = options;

  try {
    const parsed = new URL(url);
    if (!parsed.pathname.includes("/storage/v1/object/public/")) {
      return url;
    }

    const parts = parsed.pathname.split("/storage/v1/object/public/");
    if (parts.length < 2) return url;

    const [bucket, ...rest] = parts[1].split("/");
    const objectPath = rest.join("/");
    if (!bucket || !objectPath) return url;

    const params = new URLSearchParams({
      width: String(width),
      quality: String(quality),
      format: "webp",
    });
    if (height) params.set("height", String(height));

    return `${parsed.origin}/storage/v1/render/image/public/${bucket}/${objectPath}?${params}`;
  } catch {
    return url;
  }
}
