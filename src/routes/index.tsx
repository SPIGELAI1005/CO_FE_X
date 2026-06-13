import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download as DownloadIcon, ArrowRight, ArrowLeft, Apple, Play, Smartphone } from "lucide-react";
import heroImage from "@/assets/hero-explorer.jpg";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { useParallax } from "@/hooks/use-parallax";
import { usePwaInstall } from "@/hooks/use-pwa-install";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CO:FE(X) — (X)plore Cafés · (€)arn Coffees" },
      {
        name: "description",
        content:
          "Snap a pic, post it, and score a free coffee. CO:FE(X) is the Coffee Explorer Network — discover cozy cafés and earn rewards. Coming September 28, 2025.",
      },
      { property: "og:title", content: "CO:FE(X) — (X)plore Cafés · (€)arn Coffees" },
      {
        property: "og:description",
        content: "Snap. Post. Earn a free coffee. The Coffee Explorer Network.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  useScrollReveal();
  useParallax();
  return (
    <div className="min-h-screen bg-white text-[color:var(--cofex-black)] overflow-x-hidden" style={{ fontFamily: "'Nunito Sans', system-ui, sans-serif" }}>
      <Nav />
      <Hero />
      <ShareLove />
      <Features />
      <Testimonial />
      <Download />
      <Footer />
    </div>
  );
}

/* ───────────── Nav ───────────── */
function Nav() {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-[color:var(--border)]">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link to="/" className="font-medium leading-tight">
          <span className="block sm:inline text-[11px] sm:text-base tracking-[0.2em] sm:tracking-[0.3em]">CO:FE(X)</span>
          <span className="hidden sm:inline text-base tracking-[0.3em]"> // Coffee Explorer Network // Explore. Share. Earn.</span>
          <span className="sm:hidden block text-[10px] tracking-[0.12em] opacity-60 mt-0.5">Coffee Explorer Network</span>
          <span className="sm:hidden block text-[10px] tracking-[0.12em] opacity-60">Explore. Share. Earn.</span>
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <a href="#about" className="hidden sm:inline hover:opacity-70">About</a>
          <a href="#reviews" className="hidden sm:inline hover:opacity-70">Reviews</a>
          <Link to="/auth" className="hidden sm:inline text-sm hover:opacity-70">Sign in</Link>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--cofex-black)] px-4 py-2 text-sm hover:bg-[color:var(--cofex-black)] hover:text-white transition"
          >
            Get started <DownloadIcon className="h-4 w-4" />
          </Link>
        </div>
      </nav>
    </header>
  );
}

/* ───────────── Hero ───────────── */
function Hero() {
  return (
    <section
      data-parallax
      className="relative mx-auto max-w-6xl px-5 pt-16 pb-12 text-center isolate"
    >
      <h1
        className="font-medium tracking-tight leading-[0.95] text-[14vw] sm:text-[110px] cofex-shine"
        style={{
          backgroundImage:
            "linear-gradient(90deg, var(--cofex-cyan), #5cd3ff, var(--cofex-cyan))",
        }}
      >
        (X)plore Cafés
      </h1>
      <div className="my-6 flex justify-center cofex-float-sm">
        <span className="rounded-full bg-[color:var(--cofex-black)] text-white px-5 py-2 text-sm font-medium shadow-lg">
          Coming September 28, 2026
        </span>
      </div>
      <h2
        className="font-medium tracking-tight leading-[0.95] text-[14vw] sm:text-[110px] cofex-shine"
        style={{
          backgroundImage:
            "linear-gradient(90deg, var(--cofex-coffee), #b88259, var(--cofex-coffee))",
          animationDelay: "-2s",
        }}
      >
        (€)arn Experiences
      </h2>


      {/* Mockup */}
      <div className="relative mt-16 flex justify-center">
        <div className="relative w-full max-w-[420px]">
          {/* floating left pill — parallax outer, float inner */}
          <div
            className="absolute -left-2 sm:-left-16 top-24 z-10 cofex-px"
            style={{ ["--depth-x" as any]: "18px", ["--depth-y" as any]: "12px", ["--depth-s" as any]: "20px" }}
          >
            <div className="rounded-full bg-white shadow-xl px-5 py-3 text-base font-semibold whitespace-nowrap cofex-float-pill">
              1 <span style={{ color: "var(--cofex-cyan)" }}>Post</span> = 1{" "}
              <span style={{ color: "var(--cofex-coffee)" }}>Coffee</span>
            </div>
          </div>
          {/* floating right chip */}
          <div
            className="absolute -right-2 sm:-right-14 top-72 z-10 cofex-px"
            style={{ ["--depth-x" as any]: "-22px", ["--depth-y" as any]: "-14px", ["--depth-s" as any]: "24px" }}
          >
            <div
              className="rounded-full bg-white shadow-xl px-4 py-2 text-sm font-bold cofex-float-sm"
              style={{ animationDelay: "-1.5s", color: "var(--cofex-coffee)" }}
            >
              ☕ +1 Free
            </div>
          </div>
          {/* phone — gentle parallax + float */}
          <div
            className="cofex-px"
            style={{ ["--depth-x" as any]: "-8px", ["--depth-y" as any]: "-6px", ["--depth-s" as any]: "12px" }}
          >
            <div className="cofex-float">
              <div className="rounded-[40px] bg-[color:var(--cofex-black)] p-3 shadow-2xl">
                <div className="rounded-[30px] overflow-hidden bg-white">
                  <img
                    src={heroImage}
                    alt="CO:FE(X) Explorer holding phone with free coffee reward"
                    className="w-full h-[520px] object-cover"
                  />
                  <div className="p-6 text-left">
                    <h3 className="text-2xl font-extrabold leading-tight">
                      Hi Olga,<br />Your Next<br />Coffee Is On Us!
                    </h3>
                    <button className="mt-5 rounded-full border border-[color:var(--cofex-black)] px-5 py-2 text-sm font-semibold hover:bg-[color:var(--cofex-black)] hover:text-white transition hover:scale-105">
                      Get Started
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Share Love ───────────── */
function ShareLove() {
  return (
    <section id="about" className="mx-auto max-w-6xl px-5 py-24">
      <span
        className="inline-block rounded-full px-5 py-2 text-sm font-semibold cofex-float-pill"
        style={{ background: "var(--cofex-pastel-blue)" }}
      >
        Share your <span style={{ color: "var(--cofex-red)" }}>Love</span> for{" "}
        <span style={{ color: "var(--cofex-coffee)" }}>Coffee</span>. Get rewarded!
      </span>

      <div className="mt-10 space-y-3 font-black leading-[1.1] tracking-tight text-4xl sm:text-6xl">
        {[
          { c: "var(--cofex-red)", word: "Love", rest: " coffee?" },
          { c: "var(--cofex-red)", word: "Love", rest: " sharing?" },
          { c: "var(--cofex-magenta)", word: "Perfect", rest: " match!" },
          { c: "var(--cofex-yellow)", word: "Experience", rest: " the moments, share them." },
          { c: "var(--cofex-cyan)", word: "Explore", rest: " cozy cafés, spread the love and…" },
          { c: "var(--cofex-coffee)", word: "Keep", rest: " your cup full, one post at a time." },
        ].map((l, i) => (
          <p key={i} className="cofex-reveal" style={{ ["--i" as any]: i }}>
            <span style={{ color: l.c }}>{l.word}</span>{l.rest}
          </p>
        ))}
      </div>
    </section>
  );
}

/* ───────────── Features ───────────── */
const features = [
  {
    title: "Snap & Earn in Seconds",
    bg: "var(--cofex-pastel-gray)",
    user: "Snap and share to get instant rewards, no waiting around for likes or views to pile up.",
    cafe: "A steady stream of authentic and organic social media promotion.",
  },
  {
    title: "Café Discovery Map",
    bg: "var(--cofex-pastel-blue)",
    user: "Explore new cafés nearby or trending spots.",
    cafe: "Get discovered by new customers who wouldn't have come otherwise.",
  },
  {
    title: "Exclusive Perks & Loyalty Boosts",
    bg: "var(--cofex-pastel-pink)",
    user: "Special freebies and bonus rewards for regular sharing.",
    cafe: "Tools to build repeat visits and turn customers into promoters.",
  },
  {
    title: "Real-Time Analytics",
    bg: "var(--cofex-pastel-lilac)",
    user: "See your impact and how many coffees you've unlocked.",
    cafe: "Analytics dashboard to measure reach, engagement, and visits.",
  },
];

function Features() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" data-parallax>
      {features.map((f, i) => (
        <div
          key={f.title}
          className="cofex-reveal cofex-px"
          style={{
            ["--i" as any]: i + 1,
            ["--depth-x" as any]: `${(i % 2 === 0 ? -1 : 1) * 10}px`,
            ["--depth-y" as any]: "6px",
            ["--depth-s" as any]: `${14 + i * 4}px`,
          }}
        >
          <div
            className="rounded-3xl p-7 flex flex-col justify-end min-h-[340px] cofex-lift h-full"
            style={{
              background: f.bg,
              animation: `cofex-float-sm ${5.5 + i * 0.4}s ease-in-out ${i * 0.4}s infinite`,
            }}
          >
            <h3 className="text-xl font-extrabold mb-4">{f.title}</h3>
            <p className="text-sm font-semibold mb-3" style={{ color: "var(--cofex-cyan)" }}>
              For users: <span className="text-[color:var(--cofex-black)] font-normal">{f.user}</span>
            </p>
            <p className="text-sm font-semibold" style={{ color: "var(--cofex-cyan)" }}>
              For cafés: <span className="text-[color:var(--cofex-black)] font-normal">{f.cafe}</span>
            </p>
          </div>
        </div>
      ))}
    </section>
  );
}



/* ───────────── Testimonial ───────────── */
const testimonials = [
  {
    quote:
      "The coffee run has never been easier.\nI discover new cafés, share a quick post, and get my free coffee right away.\nFinally, using social media comes with a real tangible reward!",
    author: "Floria N. (Entrepreneur)",
  },
  {
    quote:
      "I used to just scroll. Now every post turns into a real-life coffee moment in a new spot.\nIt completely changed how I explore my city.",
    author: "Marco T. (Designer)",
  },
  {
    quote:
      "CO:FE(X) introduced me to three cafés I'd walked past for years.\nOne snap, one post — and suddenly the barista knows my name.",
    author: "Lena K. (Photographer)",
  },
  {
    quote:
      "It feels less like a loyalty app and more like a tiny adventure between meetings.\nThe rewards are the cherry on top.",
    author: "Sofía R. (Product Manager)",
  },
];

function Testimonial() {
  const [idx, setIdx] = useState(0);
  const t = testimonials[idx];
  const go = (d: number) =>
    setIdx((i: number) => (i + d + testimonials.length) % testimonials.length);
  return (
    <section id="reviews" className="py-24" style={{ background: "var(--cofex-lime)" }} data-parallax>
      <div className="mx-auto max-w-4xl px-5">
        <div
          key={idx}
          className="relative rounded-3xl bg-white p-10 sm:p-16 shadow-sm cofex-reveal is-visible cofex-px"
          style={{ ["--depth-x" as any]: "8px", ["--depth-y" as any]: "6px", ["--depth-s" as any]: "20px" }}
        >
          <span
            className="absolute -top-4 left-10 rounded-full px-5 py-2 text-sm font-bold cofex-float-pill"
            style={{ background: "var(--cofex-pastel-lilac)" }}
          >
            What Coffee Lovers are saying…
          </span>
          <p className="text-2xl sm:text-3xl font-extrabold leading-snug text-center whitespace-pre-line">
            "{t.quote}"
          </p>
          <p className="mt-8 text-center text-sm font-medium">{t.author}</p>
        </div>
        <div className="mt-8 flex justify-center gap-3">
          <button
            onClick={() => go(-1)}
            aria-label="Previous testimonial"
            className="h-12 w-12 rounded-xl bg-[color:var(--cofex-black)] text-white grid place-items-center hover:opacity-80"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Next testimonial"
            className="h-12 w-12 rounded-xl bg-[color:var(--cofex-black)] text-white grid place-items-center hover:opacity-80"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Download ───────────── */
function Download() {
  const { canInstall, install } = usePwaInstall();
  const [engaged, setEngaged] = useState(false);

  useEffect(() => {
    const mark = () => setEngaged(true);
    window.addEventListener("scroll", mark, { once: true, passive: true });
    window.addEventListener("pointerdown", mark, { once: true });
    return () => {
      window.removeEventListener("scroll", mark);
      window.removeEventListener("pointerdown", mark);
    };
  }, []);

  return (
    <section id="download" className="mx-auto max-w-4xl px-5 py-24 text-center">
      <h2 className="text-5xl sm:text-7xl font-medium tracking-tight">Download CO:FE(X)</h2>
      <p className="mt-4 text-base">Available starting September 28, 2025, on…</p>

      {canInstall && engaged && (
        <button
          type="button"
          onClick={() => install()}
          className="mt-6 inline-flex items-center gap-2 rounded-full border-2 border-[color:var(--cofex-coffee)] px-6 py-3 text-sm font-semibold hover:bg-[color:var(--cofex-cream-warm,#f5efe6)] transition"
        >
          <Smartphone className="h-5 w-5" /> Install web app
        </button>
      )}

      <div className="mt-8 flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-3 sm:gap-4">
        <a href="#" className="inline-flex items-center justify-center gap-3 rounded-xl bg-[color:var(--cofex-black)] text-white px-6 py-4 sm:px-5 sm:py-3 hover:opacity-90 active:scale-[0.98] transition">
          <Apple className="h-7 w-7" />
          <div className="text-left leading-tight">
            <div className="text-[10px] opacity-80">Download on the</div>
            <div className="text-base font-medium">App Store</div>
          </div>
        </a>
        <a href="#" className="inline-flex items-center justify-center gap-3 rounded-xl bg-[color:var(--cofex-black)] text-white px-6 py-4 sm:px-5 sm:py-3 hover:opacity-90 active:scale-[0.98] transition">
          <Play className="h-7 w-7" />
          <div className="text-left leading-tight">
            <div className="text-[10px] opacity-80">GET IT ON</div>
            <div className="text-base font-medium">Google Play</div>
          </div>
        </a>
      </div>

      <form
        className="mt-16 text-left max-w-xl mx-auto"
        onSubmit={(e) => {
          e.preventDefault();
          alert("Thanks — we'll keep you posted!");
        }}
      >
        <h3 className="text-2xl font-bold mb-6">Sign Up for Early Access</h3>
        <label className="text-sm font-medium">Email *</label>
        <input
          required
          type="email"
          className="mt-2 w-full border border-[color:var(--cofex-black)] rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[color:var(--cofex-cyan)]"
        />
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" required className="h-4 w-4" />
          Yes, I want to be notified. *
        </label>
        <button
          type="submit"
          className="mt-5 w-full bg-[color:var(--cofex-black)] text-white py-3 font-semibold rounded-sm hover:opacity-90"
        >
          Submit
        </button>
      </form>
    </section>
  );
}

/* ───────────── Footer ───────────── */
function Footer() {
  return (
    <footer className="bg-[color:var(--cofex-black)] text-white">
      <div className="mx-auto max-w-6xl px-5 py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div>
          <div className="font-bold tracking-[0.3em] text-lg">CO:FE(X)</div>
        </div>
        <div>
          <p>Contact@COFE-X.com</p>
          <p className="font-bold mt-4">Contact Us</p>
          <p className="mt-2 opacity-80">Maria-Sybilla-Merian-Str. 12<br />80999 München, Germany</p>
        </div>
        <div>
          <p className="font-bold">Follow Us</p>
          <p className="mt-2 underline">Instagram</p>
          <p className="underline">X.com</p>
        </div>
        <div>
          <p className="font-bold">Legal</p>
          <p className="mt-2">Terms &amp; Conditions</p>
          <p>Privacy Policy</p>
          <p>Accessibility Statement</p>
        </div>
      </div>
      <div className="px-5 pb-6 text-xs opacity-70">© {new Date().getFullYear()} by CO:FE(X)</div>
    </footer>
  );
}
