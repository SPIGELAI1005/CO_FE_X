import { useEffect, useState } from "react";
import { rotatingVerifyToken } from "@/lib/shop-door";

export function RotatingVerifyDisplay({ code, label }: { code: string; label?: string }) {
  const [token, setToken] = useState(() => rotatingVerifyToken(code));

  useEffect(() => {
    const tick = () => setToken(rotatingVerifyToken(code));
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [code]);

  return (
    <div className="rounded-xl border-2 border-dashed border-amber-400 bg-white px-4 py-3 text-center">
      {label ? <div className="text-[10px] font-bold uppercase tracking-widest text-amber-700">{label}</div> : null}
      <div className="mt-1 font-mono text-3xl font-bold tracking-[0.4em] text-amber-900 transition-all duration-300">
        {token}
      </div>
      <p className="mt-1 text-[10px] text-amber-800/70">Refreshes every 30s</p>
    </div>
  );
}
