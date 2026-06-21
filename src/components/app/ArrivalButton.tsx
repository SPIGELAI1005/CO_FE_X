import { useState } from "react";
import { Navigation } from "lucide-react";
import { toast } from "sonner";
import { useAnnounceArrival } from "@/lib/queries/vision";

export function ArrivalButton({ shopId }: { shopId: string }) {
  const announce = useAnnounceArrival();
  const [sent, setSent] = useState(false);

  async function onArrive() {
    try {
      await announce.mutateAsync({ shopId, etaMinutes: 5, message: "On my way for coffee!" });
      setSent(true);
      toast.success("The café knows you're coming!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not notify café");
    }
  }

  return (
    <button
      type="button"
      onClick={onArrive}
      disabled={sent || announce.isPending}
      className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--cofex-cyan)] px-3 py-1.5 text-xs font-semibold text-[color:var(--cofex-cyan)] hover:bg-[color:var(--cofex-pastel-blue)]/30 disabled:opacity-50"
    >
      <Navigation className="h-3.5 w-3.5" />
      {sent ? "They're expecting you" : "I'm ~5 min away"}
    </button>
  );
}
