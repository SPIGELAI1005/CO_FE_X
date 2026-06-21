import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { AppPage, AppPageBody, AppPageHeader } from "@/components/app/AppPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useCreateCrew, useJoinCrew } from "@/lib/queries/vision";

export const Route = createFileRoute("/_authenticated/_explorer/crew")({
  head: () => ({ meta: [{ title: "Coffee crew · CO:FE(X)" }] }),
  component: CrewPage,
});

function CrewPage() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [invite, setInvite] = useState<string | null>(null);
  const createCrew = useCreateCrew();
  const joinCrew = useJoinCrew();

  async function onCreate() {
    if (!name.trim()) return;
    try {
      const res = await createCrew.mutateAsync(name.trim());
      setInvite(res.invite_code);
      toast.success(t("crew.created"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function onJoin() {
    if (!code.trim()) return;
    try {
      await joinCrew.mutateAsync(code.trim());
      toast.success(t("crew.joined"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <AppPage>
      <AppPageHeader eyebrow={t("crew.eyebrow")} title={t("crew.title")} subtitle={t("crew.subtitle")} />
      <AppPageBody className="mx-auto max-w-md space-y-6 pb-10">
        <div className="cofex-app-card p-5">
          <div className="flex items-center gap-2 font-bold text-[color:var(--cofex-coffee-deep)]">
            <Users className="h-5 w-5" /> {t("crew.create")}
          </div>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("crew.namePlaceholder")} className="mt-3 rounded-full" />
          <Button onClick={onCreate} disabled={createCrew.isPending} className="mt-3 w-full rounded-full">
            {t("crew.createBtn")}
          </Button>
          {invite ? (
            <p className="mt-3 text-center font-mono text-lg tracking-widest">{invite}</p>
          ) : null}
        </div>
        <div className="cofex-app-card p-5">
          <p className="font-bold text-[color:var(--cofex-coffee-deep)]">{t("crew.join")}</p>
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="CODE" className="mt-3 rounded-full font-mono tracking-widest" />
          <Button onClick={onJoin} disabled={joinCrew.isPending} variant="outline" className="mt-3 w-full rounded-full">
            {t("crew.joinBtn")}
          </Button>
        </div>
      </AppPageBody>
    </AppPage>
  );
}
