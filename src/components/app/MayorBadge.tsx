import { Crown } from "lucide-react";

export function MayorBadge({ name, checkIns }: { name: string; checkIns: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
      <Crown className="h-3 w-3" /> Mayor: {name} ({checkIns})
    </span>
  );
}
