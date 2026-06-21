import { useState } from "react";
import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { getCurrentPosition } from "@/lib/geo";
import { rpcPerformCheckIn, parseCheckInResult, parseRpcErrorMessage, type CheckInRpcResult } from "@/lib/rpc/client";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/use-user";
import { PostCheckInSheet } from "@/components/app/PostCheckInSheet";
import { BadgeUnlockSheet } from "@/components/app/BadgeUnlockSheet";
import { BeveragePicker } from "@/components/app/BeveragePicker";
import { afterCheckIn } from "@/lib/queries/invalidation";
import { trackExplorerEvent } from "@/lib/explorer-analytics";
import { cityToSlug } from "@/lib/cities";

interface ShopCheckInFlowProps {
  shopId: string;
  shopSlug: string;
  shopName: string;
  shopCity?: string | null;
  campaigns?: { id: string; title: string; reward_description?: string | null }[];
  onWriteReview?: () => void;
  compact?: boolean;
  autoFocus?: boolean;
}

export function ShopCheckInFlow({
  shopId,
  shopSlug,
  shopName,
  shopCity,
  campaigns = [],
  onWriteReview,
  compact,
  autoFocus,
}: ShopCheckInFlowProps) {
  const { t } = useTranslation();
  const { user } = useUser();
  const qc = useQueryClient();
  const [beverageTag, setBeverageTag] = useState("coffee");
  const [busy, setBusy] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [badgeSheetOpen, setBadgeSheetOpen] = useState(false);
  const [result, setResult] = useState<CheckInRpcResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);

  const checkIn = async () => {
    setBusy(true);
    setError(null);
    try {
      const { latitude, longitude } = await getCurrentPosition();
      const { data, error: rpcError } = await rpcPerformCheckIn(supabase, {
        shopId,
        latitude,
        longitude,
        beverageTag,
      });
      if (rpcError) {
        setError(parseRpcErrorMessage(rpcError));
        return;
      }
      const parsed = parseCheckInResult(data);
      if (!parsed) {
        setError("Check-in failed");
        return;
      }
      setResult(parsed);
      setCheckedIn(true);
      if (parsed.new_badges?.length > 0) {
        setBadgeSheetOpen(true);
        parsed.new_badges.forEach((b) =>
          trackExplorerEvent("badge_unlocked", { slug: b.slug, source: "check_in" }),
        );
      } else {
        setSheetOpen(true);
      }
      if (user) afterCheckIn(qc, user.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check-in failed");
    } finally {
      setBusy(false);
    }
  };

  const citySlug = shopCity ? cityToSlug(shopCity) : undefined;

  return (
    <div id="check-in" className={`space-y-2 ${autoFocus ? "scroll-mt-24 ring-2 ring-[color:var(--cofex-cyan)]/40 rounded-2xl p-3" : ""}`}>
      {!checkedIn ? (
        <>
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--cofex-black)]/55">
              {t("beverage.pickLabel")}
            </p>
            <BeveragePicker value={beverageTag} onChange={setBeverageTag} />
          </div>
        <button
          type="button"
          onClick={checkIn}
          disabled={busy}
          className={`w-full rounded-full text-sm font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5 disabled:opacity-60 ${
            compact ? "py-2.5" : "py-3"
          }`}
          style={{ background: "var(--cofex-coffee-deep, #3d2417)" }}
        >
          <Users className="mr-2 inline h-4 w-4" />
          {busy ? t("checkIn.busy") : t("checkIn.cta")}
        </button>
        </>
      ) : (
        <div className="cofex-app-card px-4 py-3 text-center text-sm text-[color:var(--cofex-coffee-deep)]">
          {t("checkIn.alreadyToday")}
          <button
            type="button"
            className="ml-2 font-semibold text-[color:var(--cofex-cyan)] underline"
            onClick={() => setSheetOpen(true)}
          >
            {t("checkIn.viewSummary")}
          </button>
        </div>
      )}
      {error && <p className="text-center text-xs text-red-600">{error}</p>}
      {result && (
        <>
          <BadgeUnlockSheet
            open={badgeSheetOpen}
            onOpenChange={setBadgeSheetOpen}
            badges={result.new_badges}
            onContinue={() => setSheetOpen(true)}
          />
          <PostCheckInSheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            result={result}
            shop={{ slug: shopSlug, name: shopName, citySlug }}
            campaigns={campaigns}
            onWriteReview={onWriteReview ?? (() => {})}
          />
        </>
      )}
    </div>
  );
}
