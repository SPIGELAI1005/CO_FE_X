import { useRotatingVerifyToken } from "@/lib/use-rotating-verify-token";

export function RotatingVerifyDisplay({ code, label }: { code: string; label?: string }) {
  const tokenQuery = useRotatingVerifyToken(code);
  const token = tokenQuery.data ?? "------";

  return (
    <div className="cofex-scan-frame px-4 py-3 text-center">
      {label ? <div className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--cofex-coffee-deep)]">{label}</div> : null}
      <div className="cofex-verify-code mt-1 text-3xl font-bold transition-all duration-300">
        {token}
      </div>
      <p className="mt-1 text-[10px] text-[color:var(--cofex-black)]/55">Refreshes every 30s</p>
    </div>
  );
}
