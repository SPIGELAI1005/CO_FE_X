import { useEffect } from "react";

/**
 * Subtle pointer + scroll parallax. Adds CSS vars --px, --py (mouse, -1..1)
 * and --sy (scroll progress relative to element, -1..1) to elements with
 * `data-parallax` attribute. Children opt in via `data-depth="0.4"` etc.
 *
 * Mobile-safe: pointer tracking is disabled on coarse-pointer devices,
 * everything is rAF-throttled, and we hand transforms straight to CSS
 * so the compositor does the work.
 */
export function useParallax() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const isCoarse = window.matchMedia("(pointer: coarse)").matches;
    const root = document.documentElement;
    let mx = 0, my = 0, tx = 0, ty = 0;
    let raf = 0;
    let scrollRaf = 0;

    const tick = () => {
      raf = 0;
      // ease toward target
      mx += (tx - mx) * 0.08;
      my += (ty - my) * 0.08;
      root.style.setProperty("--px", mx.toFixed(3));
      root.style.setProperty("--py", my.toFixed(3));
      if (Math.abs(tx - mx) > 0.001 || Math.abs(ty - my) > 0.001) {
        raf = requestAnimationFrame(tick);
      }
    };

    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;   // -1..1
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const updateScroll = () => {
      scrollRaf = 0;
      const els = document.querySelectorAll<HTMLElement>("[data-parallax]");
      const vh = window.innerHeight;
      els.forEach((el) => {
        const rect = el.getBoundingClientRect();
        // -1 above viewport, 0 centered, 1 below
        const progress = (rect.top + rect.height / 2 - vh / 2) / vh;
        el.style.setProperty("--sy", Math.max(-1.2, Math.min(1.2, progress)).toFixed(3));
      });
    };
    const onScroll = () => {
      if (!scrollRaf) scrollRaf = requestAnimationFrame(updateScroll);
    };

    if (!isCoarse) window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    updateScroll();

    return () => {
      if (!isCoarse) window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
    };
  }, []);
}
