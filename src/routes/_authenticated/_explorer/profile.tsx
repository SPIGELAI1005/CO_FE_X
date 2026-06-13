import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useUser } from "@/hooks/use-user";
import {
  useProfile,
  useUpdateProfile,
  usePartnerApplication,
  useSubmitPartnerApplication,
  useUploadAvatar,
} from "@/lib/queries/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Camera, Coffee, Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_explorer/profile")({
  head: () => ({ meta: [{ title: "Profile — CO:FE(X)" }] }),
  component: ProfilePage,
});

const LEVELS = [
  { name: "Rookie Explorer", min: 0 },
  { name: "Coffee Seeker", min: 50 },
  { name: "Espresso Hunter", min: 200 },
  { name: "Cappuccino Master", min: 500 },
  { name: "Coffee Nomad", min: 1500 },
  { name: "Coffee Legend", min: 5000 },
];

function levelFor(points: number) {
  let level = LEVELS[0];
  for (const l of LEVELS) if (points >= l.min) level = l;
  const idx = LEVELS.indexOf(level);
  const next = LEVELS[idx + 1];
  const progress = next ? Math.min(100, ((points - level.min) / (next.min - level.min)) * 100) : 100;
  return { level, next, progress };
}

function ProfilePage() {
  const { user, isPartner, isAdmin, loading: authLoading } = useUser();
  const { data: profile, isLoading } = useProfile(user?.id);
  const { data: application } = usePartnerApplication(user?.id);
  const updateProfile = useUpdateProfile();
  const submitApplication = useSubmitPartnerApplication();
  const uploadAvatar = useUploadAvatar();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Record<string, string> | null>(null);
  const [appForm, setAppForm] = useState({
    business_name: "",
    contact_email: user?.email ?? "",
    phone: "",
    city: "",
    message: "",
  });

  const display = form ?? {
    display_name: profile?.display_name ?? "",
    handle: profile?.handle ?? "",
    bio: profile?.bio ?? "",
    city: profile?.city ?? "",
    instagram_handle: profile?.instagram_handle ?? "",
    x_handle: profile?.x_handle ?? "",
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const points = profile?.total_points ?? 0;
  const { level, next, progress } = levelFor(points);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    try {
      await updateProfile.mutateAsync({
        userId: user.id,
        display_name: display.display_name.trim() || null,
        handle: display.handle.trim() || null,
        bio: display.bio.trim() || null,
        city: display.city.trim() || null,
        instagram_handle: display.instagram_handle.trim() || null,
        x_handle: display.x_handle.trim() || null,
      });
      setForm(null);
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save profile");
    }
  }

  async function applyPartner(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    try {
      await submitApplication.mutateAsync({ userId: user.id, ...appForm });
      toast.success("Application submitted — we'll review it soon");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit application");
    }
  }

  async function onAvatarSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      await uploadAvatar.mutateAsync({ userId: user.id, file });
      toast.success("Avatar updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload avatar");
    } finally {
      e.target.value = "";
    }
  }

  const initials =
    (profile?.display_name ?? user?.email ?? "?")
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <div className="px-5 py-8 max-w-2xl mx-auto">
      <div className="flex items-start gap-4">
        <button
          type="button"
          className="relative shrink-0 group"
          onClick={() => avatarInputRef.current?.click()}
          disabled={uploadAvatar.isPending}
          aria-label="Change avatar"
        >
          <Avatar className="h-20 w-20 border-2" style={{ borderColor: "var(--border)" }}>
            <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
            <AvatarFallback className="text-lg font-semibold bg-amber-100 text-amber-900">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            {uploadAvatar.isPending ? (
              <Loader2 className="h-5 w-5 text-white animate-spin" />
            ) : (
              <Camera className="h-5 w-5 text-white" />
            )}
          </span>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={onAvatarSelected}
          />
        </button>
        <div>
          <span
            className="inline-block rounded-full px-3 py-1 text-xs font-semibold tracking-wider uppercase"
            style={{ background: "var(--cofex-cream-warm)", color: "var(--cofex-coffee-deep)" }}
          >
            You
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            {profile?.display_name ?? "Explorer"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <div
        className="mt-6 rounded-2xl border p-5"
        style={{ borderColor: "var(--border)", background: "white" }}
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4" style={{ color: "var(--cofex-accent-gold)" }} />
          {level.name}
        </div>
        <div className="mt-2 flex items-baseline justify-between text-xs text-muted-foreground">
          <span>{points.toLocaleString()} points</span>
          <span>{profile?.total_check_ins ?? 0} check-ins</span>
        </div>
        <Progress value={progress} className="mt-2 h-2" />
        {next && (
          <p className="mt-2 text-xs text-muted-foreground">
            {next.min - points} pts to {next.name}
          </p>
        )}
      </div>

      <form onSubmit={saveProfile} className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold">Edit profile</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="display_name">Display name</Label>
            <Input
              id="display_name"
              value={display.display_name}
              onChange={(e) => setForm({ ...display, display_name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="handle">Handle</Label>
            <Input
              id="handle"
              placeholder="@you"
              value={display.handle}
              onChange={(e) => setForm({ ...display, handle: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={display.city}
            onChange={(e) => setForm({ ...display, city: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            rows={3}
            value={display.bio}
            onChange={(e) => setForm({ ...display, bio: e.target.value })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="instagram">Instagram</Label>
            <Input
              id="instagram"
              value={display.instagram_handle}
              onChange={(e) => setForm({ ...display, instagram_handle: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="x">X / Twitter</Label>
            <Input
              id="x"
              value={display.x_handle}
              onChange={(e) => setForm({ ...display, x_handle: e.target.value })}
            />
          </div>
        </div>
        <Button type="submit" disabled={updateProfile.isPending}>
          {updateProfile.isPending ? "Saving…" : "Save changes"}
        </Button>
      </form>

      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {isPartner && (
          <Link
            to="/partner"
            className="rounded-2xl border p-5 hover:shadow-md transition"
            style={{ borderColor: "var(--border)", background: "var(--cofex-cream-warm)" }}
          >
            <div className="text-xs font-bold tracking-wider uppercase" style={{ color: "var(--cofex-coffee-deep)" }}>
              Partner
            </div>
            <div className="mt-1 font-semibold">Open partner dashboard</div>
          </Link>
        )}
        {isAdmin && (
          <Link
            to="/admin"
            className="rounded-2xl border p-5 hover:shadow-md transition"
            style={{ borderColor: "var(--border)", background: "var(--cofex-pastel-lilac)" }}
          >
            <div className="text-xs font-bold tracking-wider uppercase">Admin</div>
            <div className="mt-1 font-semibold">Open admin console</div>
          </Link>
        )}
      </div>

      {!isPartner && (
        <div className="mt-8 rounded-2xl border p-5" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2 font-semibold">
            <Coffee className="h-4 w-4" /> Run a café?
          </div>
          {application ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Application for <strong>{application.business_name}</strong> — status:{" "}
              <span className="capitalize font-medium">{application.status}</span>
            </p>
          ) : (
            <form onSubmit={applyPartner} className="mt-4 space-y-3">
              <Input
                required
                placeholder="Business name"
                value={appForm.business_name}
                onChange={(e) => setAppForm({ ...appForm, business_name: e.target.value })}
              />
              <Input
                required
                type="email"
                placeholder="Contact email"
                value={appForm.contact_email}
                onChange={(e) => setAppForm({ ...appForm, contact_email: e.target.value })}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="Phone"
                  value={appForm.phone}
                  onChange={(e) => setAppForm({ ...appForm, phone: e.target.value })}
                />
                <Input
                  placeholder="City"
                  value={appForm.city}
                  onChange={(e) => setAppForm({ ...appForm, city: e.target.value })}
                />
              </div>
              <Textarea
                placeholder="Tell us about your café"
                value={appForm.message}
                onChange={(e) => setAppForm({ ...appForm, message: e.target.value })}
              />
              <Button type="submit" disabled={submitApplication.isPending}>
                {submitApplication.isPending ? "Submitting…" : "Apply to become a partner"}
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
