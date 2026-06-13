import { useEffect } from "react";
import { usePartnerShops, getStoredPartnerShopId, setStoredPartnerShopId } from "@/lib/queries/partner";
import { useUser } from "@/hooks/use-user";
import { Store } from "lucide-react";

interface PartnerShopSelectProps {
  value: string;
  onChange: (shopId: string) => void;
  className?: string;
}

export function PartnerShopSelect({ value, onChange, className = "" }: PartnerShopSelectProps) {
  const { user } = useUser();
  const { data: shops = [], isLoading } = usePartnerShops(user?.id);

  useEffect(() => {
    if (!shops.length) return;
    const stored = getStoredPartnerShopId();
    const valid = shops.some((s) => s.id === stored);
    if (stored && valid && stored !== value) {
      onChange(stored);
    } else if (!value && shops[0]) {
      onChange(shops[0].id);
    }
  }, [shops, value, onChange]);

  if (isLoading || shops.length <= 1) {
    if (shops.length === 1) {
      return (
        <span className={`inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--cofex-coffee-deep)] ${className}`}>
          <Store className="h-4 w-4 text-[color:var(--cofex-cyan)]" />
          {shops[0]?.name}
        </span>
      );
    }
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Store className="h-4 w-4 shrink-0 text-[color:var(--cofex-cyan)]" />
      <select
        value={value}
        onChange={(e) => {
          setStoredPartnerShopId(e.target.value);
          onChange(e.target.value);
        }}
        className="h-10 max-w-[220px] truncate rounded-full border bg-white px-3 text-sm font-medium"
      >
        {shops.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function useActivePartnerShopId() {
  const { user } = useUser();
  const { data: shops = [] } = usePartnerShops(user?.id);
  const stored = getStoredPartnerShopId();
  const match = shops.find((s) => s.id === stored);
  return match?.id ?? shops[0]?.id ?? "";
}
