import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BEVERAGE_TAGS } from "@/lib/beverage-tags";
import { CofexIconTile } from "@/components/app/CofexIconTile";
import { usePublishUserMoment } from "@/lib/queries/moments";
import { toast } from "sonner";

interface UserMomentUploadProps {
  userId: string;
  canPublish: boolean;
}

export function UserMomentUpload({ userId, canPublish }: UserMomentUploadProps) {
  const { t } = useTranslation();
  const publish = usePublishUserMoment(userId);
  const [file, setFile] = useState<File | null>(null);
  const [drinkType, setDrinkType] = useState("coffee");
  const [caption, setCaption] = useState("");

  if (!canPublish) {
    return (
      <div className="rounded-xl border border-dashed border-[color:var(--border)] bg-[color:var(--cofex-cream)]/40 px-4 py-3 text-xs text-[color:var(--cofex-black)]/65">
        {t("moments.uploadDisabled")}
      </div>
    );
  }

  async function handlePublish() {
    if (!file) {
      toast.error(t("moments.photoRequired"));
      return;
    }
    try {
      await publish.mutateAsync({ file, drinkType, caption: caption.trim() || undefined });
      toast.success(t("moments.uploadSuccess"));
      setFile(null);
      setCaption("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("moments.uploadFailed"));
    }
  }

  return (
    <div className="cofex-app-card space-y-3 p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-[color:var(--cofex-coffee-deep)]">
        <Camera className="h-4 w-4 text-[color:var(--cofex-cyan)]" />
        {t("moments.uploadTitle")}
      </h3>
      <Input type="file" accept="image/*" className="rounded-xl" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <div className="flex flex-wrap gap-2">
        {BEVERAGE_TAGS.map((tag) => (
          <button
            key={tag.id}
            type="button"
            onClick={() => setDrinkType(tag.id)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold ${
              drinkType === tag.id
                ? "border-[color:var(--cofex-coffee-deep)] bg-[color:var(--cofex-coffee-deep)] text-white"
                : "border-[color:var(--border)]"
            }`}
          >
            <CofexIconTile rewardType={tag.id} size="xs" />
            {t(tag.labelKey)}
          </button>
        ))}
      </div>
      <Textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder={t("moments.captionPlaceholder")}
        rows={2}
        className="rounded-xl text-sm"
      />
      <Button
        type="button"
        disabled={publish.isPending || !file}
        onClick={handlePublish}
        className="w-full rounded-full bg-[color:var(--cofex-coffee-deep)] hover:bg-[color:var(--cofex-black)]"
      >
        {publish.isPending ? (
          <>
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            {t("moments.uploading")}
          </>
        ) : (
          t("moments.uploadButton")
        )}
      </Button>
    </div>
  );
}
