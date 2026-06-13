import { useState } from "react";
import { Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/use-user";
import { toast } from "sonner";

export function EmailVerificationBanner() {
  const { user } = useUser();
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!user || dismissed) return null;
  if (user.email_confirmed_at) return null;
  if (!user.email) return null;

  async function resend() {
    setBusy(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user!.email!,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Confirmation email sent");
  }

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-2.5 text-sm"
      style={{ borderColor: "var(--border)", background: "var(--cofex-cream-warm)" }}
    >
      <span className="inline-flex items-center gap-2 text-foreground">
        <Mail className="h-4 w-4 shrink-0" />
        Confirm your email to unlock all features.
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={resend}
          disabled={busy}
          className="text-xs font-semibold underline disabled:opacity-50"
        >
          {busy ? "Sending…" : "Resend email"}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
