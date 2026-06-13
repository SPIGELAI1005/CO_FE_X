import { Link } from "@tanstack/react-router";
import { Award, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { trackExplorerEvent } from "@/lib/explorer-analytics";

interface UnlockedBadge {
  slug: string;
  name: string;
}

interface BadgeUnlockSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  badges: UnlockedBadge[];
  onContinue?: () => void;
}

export function BadgeUnlockSheet({ open, onOpenChange, badges, onContinue }: BadgeUnlockSheetProps) {
  if (badges.length === 0) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="z-[1300] max-h-[85dvh] overflow-y-auto rounded-t-3xl border-[color:var(--border)] bg-white px-5 pb-8 pt-2"
      >
        <SheetHeader className="text-left">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--cofex-accent-gold)] shadow-lg ring-4 ring-[color:var(--cofex-accent-gold)]/30">
            <Award className="h-8 w-8 text-white" />
          </div>
          <SheetTitle className="text-center text-xl font-extrabold text-[color:var(--cofex-coffee-deep)]">
            {badges.length === 1 ? "Badge unlocked!" : `${badges.length} badges unlocked!`}
          </SheetTitle>
          <SheetDescription className="text-center text-[color:var(--cofex-black)]/65">
            New achievement added to your Coffee Passport
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {badges.map((b) => (
            <div
              key={b.slug}
              className="cofex-app-card flex items-center gap-3 p-4 ring-2 ring-[color:var(--cofex-accent-gold)]/40"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="font-bold text-[color:var(--cofex-coffee-deep)]">{b.name}</div>
                <div className="text-xs text-[color:var(--cofex-black)]/55">Explorer achievement</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Link
            to="/passport"
            className="w-full rounded-full bg-[color:var(--cofex-coffee-deep)] py-3 text-center text-sm font-semibold text-white"
            onClick={() => {
              trackExplorerEvent("badge_unlocked", { source: "check_in", count: badges.length });
              onOpenChange(false);
            }}
          >
            View in passport
          </Link>
          <button
            type="button"
            className="w-full rounded-full border border-[color:var(--border)] py-3 text-sm font-semibold text-[color:var(--cofex-coffee-deep)]"
            onClick={() => {
              onOpenChange(false);
              onContinue?.();
            }}
          >
            Continue
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
