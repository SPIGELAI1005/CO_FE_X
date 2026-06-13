import { Link } from "@tanstack/react-router";
import { MapPin, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ShopCheckInFlow } from "@/components/app/ShopCheckInFlow";
import type { MapShop } from "@/components/app/CoffeeMap";

interface MapShopSheetProps {
  shop: MapShop | null;
  onClose: () => void;
}

export function MapShopSheet({ shop, onClose }: MapShopSheetProps) {
  return (
    <Sheet open={!!shop} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="z-[1200] rounded-t-3xl border-[color:var(--border)] bg-white px-5 pb-8 pt-2"
      >
        {shop && (
          <>
            <SheetHeader className="text-left">
              <SheetTitle className="flex items-center gap-2 text-lg font-extrabold text-[color:var(--cofex-coffee-deep)]">
                <MapPin className="h-5 w-5 text-[color:var(--cofex-cyan)]" />
                {shop.name}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-3">
              {shop.free_coffee_available && (
                <span className="inline-flex rounded-full bg-[color:var(--cofex-accent-gold)] px-3 py-1 text-xs font-semibold text-white">
                  Free coffee today
                </span>
              )}
              <ShopCheckInFlow shopId={shop.id} shopSlug={shop.slug} shopName={shop.name} compact />
              <Link
                to="/coffee/$slug"
                params={{ slug: shop.slug }}
                className="block w-full rounded-full border border-[color:var(--border)] py-2.5 text-center text-sm font-semibold text-[color:var(--cofex-coffee-deep)]"
                onClick={onClose}
              >
                View full profile
              </Link>
            </div>
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full p-1 text-[color:var(--cofex-black)]/40 hover:bg-[color:var(--cofex-cream)]"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
