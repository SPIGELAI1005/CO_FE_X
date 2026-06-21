import { useHealthLog, useUpsertHealthLog } from "@/lib/queries/vision";
import { useState } from "react";
import { toast } from "sonner";

export function HealthLogRing() {
  const { data } = useHealthLog();
  const upsert = useUpsertHealthLog();
  const [steps, setSteps] = useState("");
  const [caffeine, setCaffeine] = useState("");

  const stepsN = data?.steps ?? 0;
  const cafN = data?.caffeine_mg ?? 0;
  const stepGoal = 8000;
  const cafGoal = 400;
  const stepPct = Math.min(100, Math.round((stepsN / stepGoal) * 100));
  const cafPct = Math.min(100, Math.round((cafN / cafGoal) * 100));

  async function save() {
    try {
      await upsert.mutateAsync({
        steps: steps ? Number(steps) : undefined,
        caffeineMg: caffeine ? Number(caffeine) : undefined,
      });
      toast.success("Daily log saved");
      setSteps("");
      setCaffeine("");
    } catch {
      toast.error("Could not save");
    }
  }

  return (
    <div className="cofex-app-card p-4">
      <h3 className="text-sm font-bold text-[color:var(--cofex-coffee-deep)]">Today&apos;s pulse</h3>
      <p className="mt-0.5 text-xs text-[color:var(--cofex-black)]/55">Manual log — native HealthKit coming later</p>
      <div className="mt-4 flex justify-center gap-6">
        <div className="text-center">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="30" fill="none" stroke="var(--cofex-cream)" strokeWidth="6" />
            <circle
              cx="36"
              cy="36"
              r="30"
              fill="none"
              stroke="var(--cofex-cyan)"
              strokeWidth="6"
              strokeDasharray={`${stepPct * 1.88} 188`}
              transform="rotate(-90 36 36)"
            />
          </svg>
          <div className="mt-1 text-xs font-semibold">{stepsN.toLocaleString()} steps</div>
        </div>
        <div className="text-center">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="30" fill="none" stroke="var(--cofex-cream)" strokeWidth="6" />
            <circle
              cx="36"
              cy="36"
              r="30"
              fill="none"
              stroke="var(--cofex-coffee-deep)"
              strokeWidth="6"
              strokeDasharray={`${cafPct * 1.88} 188`}
              transform="rotate(-90 36 36)"
            />
          </svg>
          <div className="mt-1 text-xs font-semibold">{cafN} mg caffeine</div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <input
          type="number"
          placeholder="Steps"
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          className="h-9 flex-1 rounded-full border px-3 text-sm"
        />
        <input
          type="number"
          placeholder="Caffeine mg"
          value={caffeine}
          onChange={(e) => setCaffeine(e.target.value)}
          className="h-9 flex-1 rounded-full border px-3 text-sm"
        />
        <button
          type="button"
          onClick={save}
          disabled={upsert.isPending}
          className="rounded-full bg-[color:var(--cofex-coffee-deep)] px-4 text-xs font-semibold text-white"
        >
          Save
        </button>
      </div>
    </div>
  );
}
