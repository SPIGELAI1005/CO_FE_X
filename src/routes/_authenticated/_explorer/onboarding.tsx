import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Coffee,
  MapPin,
  Navigation,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
} from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useCompleteOnboarding } from "@/lib/queries/profile";
import { useCoffeeShops } from "@/lib/queries/coffee-shops";

export const Route = createFileRoute("/_authenticated/_explorer/onboarding")({
  head: () => ({ meta: [{ title: "Welcome — CO:FE(X)" }] }),
  component: OnboardingPage,
});

const COFFEE_TAGS = ["Espresso", "Cappuccino", "Matcha", "Specialty Coffee", "Bakery"] as const;
const FALLBACK_CITIES = ["Lisbon", "Porto", "Munich", "Berlin", "London", "Paris", "Amsterdam"];

const STEPS = [
  { title: "Welcome", subtitle: "Discover cafés, earn rewards, collect stamps." },
  { title: "Your city", subtitle: "We'll surface spots near you first." },
  { title: "Your vibe", subtitle: "Pick what you usually order — we tailor explore." },
  { title: "Check-ins", subtitle: "GPS verifies you're at the café (within ~200 m)." },
  { title: "Ready", subtitle: "Your passport and wallet are waiting." },
] as const;

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
      toast.success("You're all set — happy exploring!");
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

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col px-5 py-8 max-w-lg mx-auto">
      <div className="flex gap-1.5 mb-8">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-colors"
            style={{
              background: i <= step ? "var(--cofex-coffee-deep)" : "var(--border)",
            }}
          />
        ))}
      </div>

      <p className="text-xs font-bold tracking-[0.25em] uppercase" style={{ color: "var(--cofex-coffee-deep)" }}>
        Step {step + 1} of {STEPS.length}
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">{STEPS[step].title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{STEPS[step].subtitle}</p>

      <div className="mt-8 flex-1">
        {step === 0 && (
          <div className="rounded-2xl border p-6 space-y-4" style={{ borderColor: "var(--border)" }}>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
              <Coffee className="h-7 w-7 text-amber-800" />
            </div>
            <ul className="space-y-3 text-sm text-zinc-700">
              <li className="flex gap-2">
                <Sparkles className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                Check in at partner cafés to earn points and passport stamps
              </li>
              <li className="flex gap-2">
                <Sparkles className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                Join EEFFOC campaigns for free drinks and bonus rewards
              </li>
              <li className="flex gap-2">
                <Sparkles className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                Redeem points in your wallet for perks at participating shops
              </li>
            </ul>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Input
              placeholder="Search cities…"
              value={cityQuery}
              onChange={(e) => setCityQuery(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {filteredCities.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCity(c)}
                  className={`rounded-xl border px-3 py-2.5 text-sm text-left transition ${
                    city === c
                      ? "border-amber-600 bg-amber-50 font-medium text-amber-900"
                      : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <MapPin className="inline h-3.5 w-3.5 mr-1 opacity-60" />
                  {c}
                </button>
              ))}
            </div>
            {city && (
              <p className="text-xs text-muted-foreground">
                Selected: <strong>{city}</strong>
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-wrap gap-2">
            {COFFEE_TAGS.map((tag) => {
              const active = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    active
                      ? "border-amber-600 bg-amber-50 text-amber-900 font-medium"
                      : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
                  }`}
                >
                  {active && <Check className="inline h-3.5 w-3.5 mr-1" />}
                  {tag}
                </button>
              );
            })}
            <p className="w-full mt-2 text-xs text-muted-foreground">
              Optional — pick any that match your usual order.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="rounded-2xl border p-6 space-y-4" style={{ borderColor: "var(--border)" }}>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100">
              <Navigation className="h-6 w-6 text-sky-700" />
            </div>
            <ol className="space-y-3 text-sm text-zinc-700 list-decimal list-inside">
              <li>Open a café page from Explore or the map</li>
              <li>Tap <strong>Check in</strong> when you&apos;re on-site</li>
              <li>We use your location to confirm you&apos;re within ~200 m</li>
              <li>Points land in your wallet; stamps appear in your passport</li>
            </ol>
            <p className="text-xs text-muted-foreground">
              Location is only used for check-ins — never shared publicly.
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="text-center py-8">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-white">
              <Coffee className="h-10 w-10" />
            </div>
            <p className="mt-6 text-sm text-zinc-600">
              {city ? (
                <>
                  Home base: <strong>{city}</strong>
                  {tags.length > 0 && (
                    <>
                      {" "}
                      · {tags.join(", ")}
                    </>
                  )}
                </>
              ) : (
                "Almost there — we'll save your preferences and drop you on the map."
              )}
            </p>
            <button
              type="button"
              className="mt-4 text-xs text-muted-foreground underline"
              onClick={skip}
              disabled={completeOnboarding.isPending}
            >
              Skip for now
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)} className="gap-1">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
        )}
        <Button
          type="button"
          className="flex-1 gap-1 bg-amber-700 hover:bg-amber-800"
          disabled={completeOnboarding.isPending}
          onClick={next}
        >
          {completeOnboarding.isPending
            ? "Saving…"
            : step === STEPS.length - 1
              ? "Start exploring"
              : "Continue"}
          {step < STEPS.length - 1 && !completeOnboarding.isPending && (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
