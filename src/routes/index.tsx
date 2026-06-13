import { useState, useEffect, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { MarketingFooter } from "@/components/marketing/LegalPageShell";
import { LanguageToggle } from "@/components/app/LanguageToggle";
import { Download as DownloadIcon, ArrowRight, ArrowLeft, Smartphone } from "lucide-react";
import heroImage from "@/assets/hero-explorer.jpg";
import cofexLogo from "@/assets/cofex-logo.png";
import { usePwaInstall } from "@/hooks/use-pwa-install";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CO:FE(X) · (X)plore Cafés · (€)arn Coffees" },
      {
        name: "description",
        content:
          "Snap a pic, post it, and score a free coffee. CO:FE(X) is the Coffee Explorer Network. Discover cozy cafés and earn rewards. Coming September 28, 2026.",
      },
      { property: "og:title", content: "CO:FE(X) · (X)plore Cafés · (€)arn Coffees" },
      {
        property: "og:description",
        content: "Snap. Post. Earn a free coffee. The Coffee Explorer Network.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-white text-[color:var(--cofex-black)] overflow-x-hidden" style={{ fontFamily: "'Nunito Sans', system-ui, sans-serif" }}>
      <Nav />
      <Hero />
      <ShareLove />
      <Features />
      <Testimonial />
      <Download />
      <MarketingFooter />
    </div>
  );
}

/* ───────────── Nav ───────────── */
function Nav() {
  const { t } = useTranslation();

  return (
    <header className="cofex-safe-top sticky top-0 z-40 border-b border-[color:var(--border)] bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-5 sm:py-4">
        <Link to="/" className="flex min-w-0 items-center gap-2 font-medium leading-tight sm:gap-3">
          <img
            src={cofexLogo}
            alt="CO:FE(X) logo"
            width={40}
            height={40}
            className="h-8 w-8 shrink-0 sm:h-10 sm:w-10"
          />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[10px] tracking-[0.12em] sm:text-sm md:tracking-[0.2em]">
              {t("header.brandLine")}
            </span>
            <span className="hidden truncate text-[10px] tracking-[0.12em] opacity-70 sm:block sm:text-xs sm:tracking-[0.2em]">
              {t("header.tagline")}
            </span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-2 text-sm sm:gap-6">
          <a href="#about" className="hidden sm:inline hover:opacity-70">{t("landing.about")}</a>
          <a href="#reviews" className="hidden sm:inline hover:opacity-70">{t("landing.reviews")}</a>
          <LanguageToggle />
          <Link to="/auth" className="hidden sm:inline text-sm hover:opacity-70">{t("header.signIn")}</Link>
          <Link
            to="/auth"
            className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--cofex-black)] px-3 py-1.5 text-xs hover:bg-[color:var(--cofex-black)] hover:text-white transition sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
          >
            <span className="hidden min-[400px]:inline">{t("landing.getStarted")}</span>
            <span className="min-[400px]:hidden">Go</span>
            <DownloadIcon className="h-4 w-4 shrink-0" />
          </Link>
        </div>
      </nav>
    </header>
  );
}

/* ───────────── Hero ───────────── */
function Hero() {
  const { t } = useTranslation();

  return (
    <section
      data-parallax
      className="relative mx-auto max-w-6xl px-5 pt-16 pb-12 text-center isolate"
    >
      <h1
        className="font-bold tracking-tight leading-[0.95] text-[clamp(2rem,14vw,6.875rem)] cofex-shine"
        style={{
          backgroundImage:
            "linear-gradient(90deg, var(--cofex-cyan), #5cd3ff, var(--cofex-cyan))",
        }}
      >
        {t("landingExtended.exploreCafes")}
      </h1>
      <div className="my-6 flex justify-center cofex-float-sm">
        <span className="rounded-full bg-[color:var(--cofex-black)] text-white px-5 py-2 text-sm font-medium shadow-lg">
          {t("landing.comingSoon")}
        </span>
      </div>
      <h2
        className="font-bold tracking-tight leading-[0.95] text-[clamp(2rem,14vw,6.875rem)] cofex-shine"
        style={{
          backgroundImage:
            "linear-gradient(90deg, var(--cofex-coffee), #b88259, var(--cofex-coffee))",
          animationDelay: "-2s",
        }}
      >
        {t("landingExtended.earnCoffees")}
      </h2>


      {/* Mockup */}
      <div className="relative mt-16 flex justify-center">
        <div className="relative w-full max-w-[420px]">
          {/* floating left pill — parallax outer, float inner */}
          <div
            className="absolute -left-2 sm:-left-16 top-24 z-10 cofex-px"
            style={{ ["--depth-x" as any]: "18px", ["--depth-y" as any]: "12px", ["--depth-s" as any]: "20px" }}
          >
            <div className="rounded-full bg-white px-3 py-2 text-sm font-semibold shadow-xl cofex-float-pill max-sm:max-w-[11rem] sm:px-5 sm:py-3 sm:text-base">
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
                    className="h-[380px] w-full object-cover sm:h-[520px]"
                  />
                  <div className="p-6 text-left">
                    <h3 className="text-2xl font-extrabold leading-tight">
                      Hi Olga,<br />Your Next<br />Coffee Is On Us!
                    </h3>
                    <Link
                      to="/auth"
                      className="mt-5 inline-block rounded-full border border-[color:var(--cofex-black)] px-5 py-2 text-sm font-semibold hover:bg-[color:var(--cofex-black)] hover:text-white transition hover:scale-105"
                    >
                      Get Started
                    </Link>
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
const shareLoveLines = [
  { accent: "var(--cofex-red)", word: "Love", text: " coffee?" },
  { accent: "var(--cofex-red)", word: "Love", text: " sharing?" },
  { accent: "var(--cofex-magenta)", word: "Perfect", text: " match!" },
  { accent: "var(--cofex-cyan)", word: "Explore", text: " cozy cafés." },
  { accent: "var(--cofex-yellow)", word: "Share", text: " your experiences." },
  { accent: "var(--cofex-red)", word: "Spread", text: " the love." },
  { text: "and..." },
  { accent: "var(--cofex-coffee)", word: "Keep", text: " your cup full, one post at a time." },
] as const;

function ShareLove() {
  return (
    <section id="about" className="mx-auto max-w-6xl px-5 py-24">
      <span
        className="cofex-reveal inline-block rounded-full px-5 py-2 text-sm font-semibold cofex-float-pill"
        style={{ background: "var(--cofex-pastel-blue)", ["--i" as string]: 0 }}
      >
        Share your <span style={{ color: "var(--cofex-red)" }}>Love</span> for{" "}
        <span style={{ color: "var(--cofex-coffee)" }}>Coffee</span>. Get rewarded!
      </span>

      <div className="mt-10 space-y-3 font-black leading-[1.1] tracking-tight text-4xl sm:text-6xl">
        {shareLoveLines.map((line, i) => (
          <p
            key={"word" in line ? line.word + line.text : line.text}
            className="cofex-reveal"
            style={{ ["--i" as string]: i + 1 }}
          >
            {"word" in line ? (
              <>
                <span style={{ color: line.accent }}>{line.word}</span>
                {line.text}
              </>
            ) : (
              line.text
            )}
          </p>
        ))}
      </div>
    </section>
  );
}

/* ───────────── Features ───────────── */
const features: {
  title: string;
  bg: string;
  explorer: ReactNode;
  cafe: ReactNode;
}[] = [
  {
    title: "Snap & Earn",
    bg: "var(--cofex-pastel-gray)",
    explorer: (
      <>
        Snap your cup, post it, and unlock a <span className="font-bold">free coffee instantly</span>. No likes, no
        waiting, no catch.
      </>
    ),
    cafe: (
      <>
        Turn every visit into authentic social content. Real posts from real customers,{" "}
        <span className="font-bold">zero ad spend</span>.
      </>
    ),
  },
  {
    title: "Café Discovery Map",
    bg: "var(--cofex-pastel-blue)",
    explorer: (
      <>
        Discover cozy cafés nearby and trending spots worth the trip. Your{" "}
        <span className="font-bold">next favorite</span> is one tap away.
      </>
    ),
    cafe: (
      <>
        Get on the map. Reach explorers who are actively searching for their{" "}
        <span className="font-bold">next coffee stop</span>.
      </>
    ),
  },
  {
    title: "Perks & Loyalty",
    bg: "var(--cofex-pastel-pink)",
    explorer: (
      <>
        Earn free coffees, bonus rewards, and exclusive perks. The{" "}
        <span className="font-bold">more you explore and share, the more you get</span>.
      </>
    ),
    cafe: (
      <>
        Reward loyal guests and <span className="font-bold">turn first-time visitors into fans</span> who keep coming
        back.
      </>
    ),
  },
  {
    title: "Real-Time Analytics",
    bg: "var(--cofex-pastel-lilac)",
    explorer: (
      <>
        Track coffees unlocked, cafés visited, and posts shared.{" "}
        <span className="font-bold">Watch your impact grow</span> at a glance.
      </>
    ),
    cafe: (
      <>
        Measure reach, engagement, and foot traffic live.{" "}
        <span className="font-bold">Know exactly what&apos;s working</span>, instantly.
      </>
    ),
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
            <h3 className="text-xl font-extrabold leading-snug mb-5">{f.title}</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold leading-none" style={{ color: "var(--cofex-cyan)" }}>
                  For Explorer
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--cofex-black)]/85">
                  {f.explorer}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold leading-none" style={{ color: "var(--cofex-coffee-deep)" }}>
                  For Cafés
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--cofex-black)]/85">
                  {f.cafe}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}



/* ───────────── Testimonial ───────────── */
const testimonials = [
  {
    audience: "explorer" as const,
    quote:
      "The coffee run has never been easier.\nI discover new cafés, share a quick post, and get my free coffee right away.\nFinally, using social media comes with a real tangible reward!",
    author: "Floria N. (Entrepreneur)",
  },
  {
    audience: "explorer" as const,
    quote:
      "I used to just scroll. Now every post turns into a real-life coffee moment in a new spot.\nIt completely changed how I explore my city.",
    author: "Marco T. (Designer)",
  },
  {
    audience: "explorer" as const,
    quote:
      "CO:FE(X) introduced me to three cafés I'd walked past for years.\nOne snap, one post, and suddenly the barista knows my name.",
    author: "Lena K. (Photographer)",
  },
  {
    audience: "explorer" as const,
    quote:
      "I open the map every weekend. Found a roastery behind a bookstore, posted once, and had a free flat white before I finished my caption.",
    author: "Amir H. (Student)",
  },
  {
    audience: "explorer" as const,
    quote:
      "My passport keeps growing. Free coffees, bonus perks, and spots I actually want to visit again.\nIt feels like exploring with a reward at every stop.",
    author: "Jana W. (Marketing)",
  },
  {
    audience: "cafe" as const,
    quote:
      "We get real stories from guests who are already in a good mood.\nNo paid ads. Just happy customers posting from our tables.",
    author: "Klaus M. (Owner, Klein & Fein)",
  },
  {
    audience: "cafe" as const,
    quote:
      "New faces walk in every week because we show up on the map.\nCO:FE(X) sends us explorers we never would have reached on our own.",
    author: "Elena V. (Manager, Casa del Grano)",
  },
  {
    audience: "cafe" as const,
    quote:
      "The dashboard shows which posts bring people through the door.\nWe doubled repeat visits in two months without changing our menu.",
    author: "David R. (Owner, Filter House)",
  },
  {
    audience: "cafe" as const,
    quote:
      "A stamp card never got anyone talking about us online.\nCO:FE(X) turns a cappuccino into content and a reason to come back.",
    author: "Priya S. (Co-founder, Morning Ritual)",
  },
];

function Testimonial() {
  return (
    <section id="reviews" className="py-24" style={{ background: "var(--cofex-lime)" }} data-parallax>
      <div className="mx-auto max-w-4xl px-5">
        <div id="cofex-testimonial-stage" className="grid w-full">
          {testimonials.map((t, i) => (
            <div
              key={t.author}
              data-cofex-testimonial-slide
              aria-hidden={i !== 0}
              className={`col-start-1 row-start-1 w-full relative rounded-3xl bg-white p-6 shadow-sm cofex-reveal is-visible cofex-px sm:p-10 md:p-16${i !== 0 ? " invisible pointer-events-none" : ""}`}
              style={{ ["--depth-x" as any]: "8px", ["--depth-y" as any]: "6px", ["--depth-s" as any]: "20px" }}
            >
              <span
                className="absolute -top-4 left-6 right-6 max-w-[calc(100%-3rem)] truncate rounded-full px-4 py-2 text-xs font-bold cofex-float-pill sm:left-10 sm:right-auto sm:max-w-none sm:px-5 sm:text-sm"
                style={{
                  background: t.audience === "cafe" ? "var(--cofex-pastel-pink)" : "var(--cofex-pastel-lilac)",
                  color: t.audience === "cafe" ? "var(--cofex-coffee-deep)" : undefined,
                }}
              >
                {t.audience === "cafe" ? "What Cafés are saying…" : "What Explorers are saying…"}
              </span>
              <p className="text-xl font-extrabold leading-snug text-center whitespace-pre-line sm:text-2xl md:text-3xl">
                &ldquo;{t.quote}&rdquo;
              </p>
              <p className="mt-8 text-center text-sm font-medium">{t.author}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex justify-center gap-3">
          <button
            type="button"
            data-cofex-testimonial-prev
            aria-label="Previous testimonial"
            className="h-12 w-12 rounded-xl bg-[color:var(--cofex-black)] text-white grid place-items-center hover:opacity-80"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            data-cofex-testimonial-next
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
      <h2 className="text-3xl font-medium tracking-tight sm:text-5xl md:text-7xl">Download CO:FE(X)</h2>
      <p className="mt-4 text-base">Available starting September 28, 2026, on…</p>

      {canInstall && engaged && (
        <button
          type="button"
          onClick={() => install()}
          className="mt-6 inline-flex items-center gap-2 rounded-full border-2 border-[color:var(--cofex-coffee)] px-6 py-3 text-sm font-semibold hover:bg-[color:var(--cofex-cream-warm,#f5efe6)] transition"
        >
          <Smartphone className="h-5 w-5" /> Install web app
        </button>
      )}

      <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
        <a
          href="#"
          aria-label="Download on the App Store"
          className="inline-block rounded-md hover:opacity-90 active:scale-[0.98] transition"
        >
          <img
            src="/badges/app-store.svg"
            alt="Download on the App Store"
            width={135}
            height={40}
            className="h-10 w-auto"
            loading="lazy"
          />
        </a>
        <a
          href="#"
          aria-label="Get it on Google Play"
          className="inline-block rounded-md hover:opacity-90 active:scale-[0.98] transition"
        >
          <img
            src="/badges/google-play.svg"
            alt="Get it on Google Play"
            width={135}
            height={40}
            className="h-10 w-auto"
            loading="lazy"
          />
        </a>
      </div>

      <form
        className="mt-16 text-left max-w-xl mx-auto"
        onSubmit={(e) => {
          e.preventDefault();
          alert("Thanks! We'll keep you posted!");
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

