import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  MapPin,
  Navigation,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  Camera,
  Wallet,
  BookOpen,
} from "lucide-react";
import cofexLogo from "@/assets/cofex-logo.png";
import { useUser } from "@/hooks/use-user";
import { useCompleteOnboarding } from "@/lib/queries/profile";
import { useCoffeeShops } from "@/lib/queries/coffee-shops";

export const Route = createFileRoute("/_authenticated/_explorer/onboarding")({
  head: () => ({ meta: [{ title: "Welcome · CO:FE(X)" }] }),
  component: OnboardingPage,
});

const COFFEE_TAGS = ["Espresso", "Cappuccino", "Matcha", "Specialty Coffee", "Bakery"] as const;
const FALLBACK_CITIES = ["Lisbon", "Porto", "Munich", "Berlin", "London", "Paris", "Amsterdam"];

const STEPS = [
  { title: "Welcome", subtitle: "Discover cafés, earn rewards, collect stamps.", accent: "var(--cofex-cyan)" },
  { title: "Your city", subtitle: "We'll surface spots near you first.", accent: "var(--cofex-coffee)" },
  { title: "Your vibe", subtitle: "Pick what you usually order. We tailor Explore.", accent: "var(--cofex-magenta)" },
  { title: "Check-ins", subtitle: "GPS verifies you're at the café (within ~200 m).", accent: "var(--cofex-cyan)" },
  { title: "Ready", subtitle: "Your passport and wallet are waiting.", accent: "var(--cofex-coffee)" },
] as const;

const WELCOME_ITEMS = [
  {
    icon: Camera,
    bg: "var(--cofex-pastel-blue)",
    color: "var(--cofex-cyan)",
    text: "Check in at partner cafés to earn points and passport stamps",
  },
  {
    icon: Sparkles,
    bg: "var(--cofex-pastel-pink)",
    color: "var(--cofex-magenta)",
    text: "Join EEFFOC campaigns for free drinks and bonus rewards",
  },
  {
    icon: Wallet,
    bg: "var(--cofex-pastel-lilac)",
    color: "var(--cofex-coffee-deep)",
    text: "Redeem points in your wallet for perks at participating shops",
  },
] as const;

const cardClass = "h-full rounded-3xl border bg-white shadow-xl cofex-onboarding-card";

interface StepPanelProps {
  active: boolean;
  children: ReactNode;
}

function StepPanel({ active, children }: StepPanelProps) {
  return (
    <div
      className={`col-start-1 row-start-1 h-full transition-opacity duration-300 ${
        active ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"
      }`}
      aria-hidden={!active}
    >
      {children}
    </div>
  );
}

function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const completeOnboarding = useCompleteOnboarding();
  const { data: shops = [] } = useCoffeeShops();

  const cities = useMemo(() => {
    const fromShops = [...new Set(shops.map((s) => s.city).filter(Boolean) as string[])].sort();
    return fromShops.length ? fromShops : FALLBACK_CITIES;
  }, [shops]);

  const [step, setStep] = useState(0);
  const [city, setCity] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const filteredCities = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter((c) => c.toLowerCase().includes(q));
  }, [cities, cityQuery]);

  const toggleTag = (tag: string) =>
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  async function skip() {
    if (!user) return;
    try {
      await completeOnboarding.mutateAsync({
        userId: user.id,
        city: city.trim() || "Lisbon",
        coffeeTags: tags,
      });
      navigate({ to: "/explore", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not continue");
    }
  }

  async function finish() {
    if (!user) return;
    if (!city.trim()) {
      toast.error("Pick a home city to continue");
      setStep(1);
      return;
    }
    try {
      await completeOnboarding.mutateAsync({
        userId: user.id,
        city: city.trim(),
        coffeeTags: tags,
      });
      toast.success("You're all set. Happy exploring!");
      navigate({ to: "/explore", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save preferences");
    }
  }

  function next() {
    if (step === 1 && !city.trim()) {
      toast.error("Pick a city to continue");
      return;
    }
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else finish();
  }

  const current = STEPS[step];

  return (
    <div
      className="flex min-h-full flex-1 flex-col"
      style={{
        background: "linear-gradient(180deg, var(--cofex-pastel-blue) 0%, var(--cofex-cream) 45%, #fff 100%)",
      }}
    >
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 py-8 sm:py-12">
        <div className="shrink-0 flex gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="h-1.5 flex-1 rounded-full transition-all duration-300"
              style={{
                background:
                  i <= step
                    ? i === step
                      ? s.accent
                      : "var(--cofex-coffee-deep)"
                    : "color-mix(in oklab, var(--border) 80%, transparent)",
              }}
            />
          ))}
        </div>

        <div className="shrink-0">
          <p
            className="mt-8 text-xs font-bold uppercase tracking-[0.25em]"
            style={{ color: current.accent }}
          >
            Step {step + 1} of {STEPS.length}
          </p>
          <h1 className="mt-3 min-h-[2.25rem] text-3xl font-extrabold tracking-tight text-[color:var(--cofex-black)]">
            {current.title}
          </h1>
          <p className="mt-2 min-h-[2.5rem] text-sm text-[color:var(--cofex-black)]/70">{current.subtitle}</p>
        </div>

        {/* Grid stack: height locked to the tallest step */}
        <div className="mt-8 grid min-h-0 flex-1">
          <StepPanel active={step === 0}>
            <div className={`${cardClass} flex h-full flex-col p-6 sm:p-8`}>
              <div className="flex flex-col items-center text-center">
                <img src={cofexLogo} alt="CO:FE(X) logo" width={80} height={80} className="h-20 w-20" />
                <p className="mt-4 text-xs font-bold tracking-[0.3em]" style={{ color: "var(--cofex-coffee-deep)" }}>
                  CO:FE(X)
                </p>
                <p className="mt-1 text-[10px] tracking-[0.2em] opacity-70">Coffee Explorer Network</p>
              </div>
              <ul className="mt-8 flex flex-1 flex-col justify-center space-y-3">
                {WELCOME_ITEMS.map(({ icon: Icon, bg, color, text }) => (
                  <li
                    key={text}
                    className="flex items-start gap-3 rounded-2xl p-4 text-sm leading-relaxed text-[color:var(--cofex-black)]/85"
                    style={{ background: bg }}
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80"
                      style={{ color }}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </StepPanel>

          <StepPanel active={step === 1}>
            <div className={`${cardClass} flex h-full flex-col space-y-4 p-5 sm:p-6`}>
              <Input
                placeholder="Search cities…"
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                className="shrink-0 rounded-xl border-[color:var(--border)] bg-[color:var(--cofex-cream)]"
              />
              <div className="grid min-h-[16rem] flex-1 grid-cols-2 content-start gap-2 overflow-y-auto pr-1 sm:min-h-[18rem]">
                {filteredCities.map((c) => {
                  const active = city === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCity(c)}
                      className="rounded-xl border px-3 py-2.5 text-sm text-left transition"
                      style={{
                        borderColor: active ? "var(--cofex-cyan)" : "var(--border)",
                        background: active ? "var(--cofex-pastel-blue)" : "white",
                        color: active ? "var(--cofex-coffee-deep)" : "inherit",
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      <MapPin className="inline h-3.5 w-3.5 mr-1 opacity-60" />
                      {c}
                    </button>
                  );
                })}
              </div>
              <p className="shrink-0 min-h-[1.25rem] text-xs text-[color:var(--cofex-black)]/60">
                {city ? (
                  <>
                    Selected: <strong style={{ color: "var(--cofex-coffee-deep)" }}>{city}</strong>
                  </>
                ) : (
                  <span className="invisible">Selected placeholder</span>
                )}
              </p>
            </div>
          </StepPanel>

          <StepPanel active={step === 2}>
            <div className={`${cardClass} flex h-full flex-col justify-between p-5 sm:p-6`}>
              <div className="flex flex-wrap content-start gap-2">
                {COFFEE_TAGS.map((tag) => {
                  const active = tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className="rounded-full border px-4 py-2 text-sm transition"
                      style={{
                        borderColor: active ? "var(--cofex-coffee-deep)" : "var(--border)",
                        background: active ? "var(--cofex-pastel-pink)" : "white",
                        color: active ? "var(--cofex-coffee-deep)" : "var(--cofex-black)",
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      {active && <Check className="inline h-3.5 w-3.5 mr-1" />}
                      {tag}
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 text-xs text-[color:var(--cofex-black)]/60">
                Optional. Pick any that match your usual order.
              </p>
            </div>
          </StepPanel>

          <StepPanel active={step === 3}>
            <div className={`${cardClass} flex h-full flex-col justify-center space-y-5 p-6`}>
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                style={{ background: "var(--cofex-pastel-blue)", color: "var(--cofex-cyan)" }}
              >
                <Navigation className="h-7 w-7" />
              </div>
              <ol className="space-y-3 text-sm text-[color:var(--cofex-black)]/85 list-decimal list-inside">
                <li>Open a café page from Explore or the map</li>
                <li>
                  Tap <strong>Check in</strong> when you&apos;re on-site
                </li>
                <li>We use your location to confirm you&apos;re within ~200 m</li>
                <li>Points land in your wallet; stamps appear in your passport</li>
              </ol>
              <p className="text-xs text-[color:var(--cofex-black)]/60">
                Location is only used for check-ins. Never shared publicly.
              </p>
            </div>
          </StepPanel>

          <StepPanel active={step === 4}>
            <div className={`${cardClass} flex h-full flex-col items-center justify-center px-6 py-10 text-center`}>
              <div
                className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full text-white"
                style={{ background: "var(--gradient-coffee)", boxShadow: "var(--shadow-premium)" }}
              >
                <BookOpen className="h-11 w-11" />
              </div>
              <p className="mt-6 min-h-[3rem] text-sm text-[color:var(--cofex-black)]/75">
                {city ? (
                  <>
                    Home base: <strong style={{ color: "var(--cofex-coffee-deep)" }}>{city}</strong>
                    {tags.length > 0 && <> · {tags.join(", ")}</>}
                  </>
                ) : (
                  "Almost there. We'll save your preferences and drop you on the map."
                )}
              </p>
              <button
                type="button"
                className="mt-5 shrink-0 text-xs text-[color:var(--cofex-black)]/50 underline hover:opacity-80"
                onClick={skip}
                disabled={completeOnboarding.isPending}
              >
                Skip for now
              </button>
            </div>
          </StepPanel>
        </div>

        <div className="mt-8 shrink-0 pb-4">
          {step === 0 ? (
            <button
              type="button"
              disabled={completeOnboarding.isPending}
              onClick={next}
              className="cofex-onboarding-cta mx-auto flex w-full items-center justify-center gap-1 rounded-full px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {completeOnboarding.isPending ? "Saving…" : "Continue"}
              {!completeOnboarding.isPending && <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <div className="grid grid-cols-[5.75rem_1fr] gap-3">
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="cofex-onboarding-back inline-flex w-full items-center justify-center gap-1 rounded-full border bg-white px-3 py-3 text-sm font-medium"
                style={{ borderColor: "var(--cofex-black)", color: "var(--cofex-black)" }}
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <button
                type="button"
                disabled={completeOnboarding.isPending}
                onClick={next}
                className="cofex-onboarding-cta inline-flex w-full items-center justify-center gap-1 rounded-full px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {completeOnboarding.isPending
                  ? "Saving…"
                  : step === STEPS.length - 1
                    ? "Start exploring"
                    : "Continue"}
                {step < STEPS.length - 1 && !completeOnboarding.isPending && (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
