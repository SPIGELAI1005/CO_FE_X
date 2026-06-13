import { optimizeImageUrl } from "@/lib/images";

interface OptimizedImageProps {
  src: string | null | undefined;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: "lazy" | "eager";
  priority?: boolean;
}

export function OptimizedImage({
  src,
  alt,
  width = 800,
  height,
  className,
  loading = "lazy",
  priority,
}: OptimizedImageProps) {
  const optimized = optimizeImageUrl(src, { width, height });

  if (!optimized) {
    return <div className={className} style={{ background: "var(--cofex-pastel-blue)" }} aria-hidden />;
  }

  return (
    <img
      src={optimized}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : loading}
      decoding="async"
      className={className}
    />
  );
}
