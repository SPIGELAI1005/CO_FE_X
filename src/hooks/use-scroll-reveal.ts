import { useEffect } from "react";

const REVEAL_SELECTOR = ".cofex-reveal:not(.is-visible)";

function revealInView() {
  const vh = window.innerHeight;
  const bottomMargin = vh * 0.08;

  document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < vh - bottomMargin && rect.bottom > 0) {
      el.classList.add("is-visible");
    }
  });
}

/** Adds `.is-visible` to `.cofex-reveal` elements as they enter the viewport. */
export function useScrollReveal() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.querySelectorAll<HTMLElement>(".cofex-reveal").forEach((el) => {
        el.classList.add("is-visible");
      });
      return;
    }

    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        revealInView();
      });
    };

    // Run after hydration paint (SSR replaces initial DOM nodes).
    const boot = requestAnimationFrame(() => {
      requestAnimationFrame(schedule);
    });

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });

    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(boot);
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      mo.disconnect();
    };
  }, []);
}
