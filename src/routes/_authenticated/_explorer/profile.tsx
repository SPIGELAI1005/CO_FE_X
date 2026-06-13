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
import { useMyLeaderboardRank } from "@/lib/queries/leaderboard";
import { AppPage, AppPageBody, AppPageHeader, AppPageSection } from "@/components/app/AppPageShell";
import { AppLegalLinks } from "@/components/app/AppLegalLinks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { usePassport } from "@/lib/queries/passport";
import { Camera, Coffee, Sparkles, Loader2, Trophy, ChevronRight, Award } from "lucide-react";
import { levelFor } from "@/lib/explorer-levels";

export const Route = createFileRoute("/_authenticated/_explorer/profile")({
  head: () => ({ meta: [{ title: "Profile · CO:FE(X)" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, isPartner, isAdmin, loading: authLoading } = useUser();
  const { data: profile, isLoading } = useProfile(user?.id);
  const { data: application } = usePartnerApplication(user?.id);
  const updateProfile = useUpdateProfile();
  const submitApplication = useSubmitPartnerApplication();
  const uploadAvatar = useUploadAvatar();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { data: myRank } = useMyLeaderboardRank("points", user?.id);
  const { data: passport } = usePassport(user?.id);

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
      <AppPage>
        <AppPageBody className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[color:var(--cofex-cyan)]" />
        </AppPageBody>
      </AppPage>
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
      toast.success("Application submitted. We'll review it soon");
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

  const initials = (profile?.display_name ?? user?.email ?? "?")
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <AppPage>
      <AppPageHeader
        eyebrow="You"
        title={profile?.display_name ?? "Explorer"}
        subtitle={user?.email ?? undefined}
        action={
          <button
            type="button"
            className="relative shrink-0 group"
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadAvatar.isPending}
            aria-label="Change avatar"
          >
            <Avatar className="h-16 w-16 border-2 border-[color:var(--border)] sm:h-20 sm:w-20">
              <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
              <AvatarFallback className="bg-[color:var(--cofex-cream)] text-lg font-semibold text-[color:var(--cofex-coffee-deep)]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              {uploadAvatar.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <Camera className="h-5 w-5 text-white" />
              )}
            </span>
            <input ref={avatarInputRef} type="file" accept="image/*" className="sr-only" onChange={onAvatarSelected} />
          </button>
        }
      />
      <AppPageBody className="mx-auto max-w-2xl space-y-2 pb-8">
        <div className="cofex-app-card p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--cofex-coffee-deep)]">
            <Sparkles className="h-4 w-4 text-[color:var(--cofex-accent-gold)]" />
            {level.name}
          </div>
          <div className="mt-2 flex items-baseline justify-between text-xs text-[color:var(--cofex-black)]/55">
            <span>{points.toLocaleString()} points</span>
            <span>{profile?.total_check_ins ?? 0} check-ins</span>
          </div>
          <Progress value={progress} className="mt-2 h-2" />
          {next && (
            <p className="mt-2 text-xs text-[color:var(--cofex-black)]/55">
              {next.min - points} pts to {next.name}
            </p>
          )}
        </div>

        {myRank?.rank ? (
          <Link
            to="/leaderboard"
            className="cofex-app-card flex items-center gap-3 p-4 transition hover:-translate-y-0.5"
            style={{ background: "var(--cofex-pastel-lilac)" }}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/70">
              <Trophy className="h-5 w-5 text-[color:var(--cofex-accent-gold)]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold tracking-wider text-[color:var(--cofex-coffee-deep)] uppercase">
                Your rank
              </div>
              <div className="font-semibold text-[color:var(--cofex-coffee-deep)]">
                #{myRank.rank.toLocaleString()} of {myRank.total_explorers.toLocaleString()} explorers
              </div>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-[color:var(--cofex-black)]/35" />
          </Link>
        ) : null}

        {passport && passport.earnedBadges.length > 0 && (
          <Link to="/passport" className="cofex-app-card block p-4 transition hover:-translate-y-0.5">
            <div className="text-xs font-bold tracking-wider text-[color:var(--cofex-coffee-deep)] uppercase">
              Recent badges
            </div>
            <div className="mt-3 flex items-center gap-2">
              {passport.earnedBadges.slice(0, 5).map((eb) => {
                const badge = passport.badges.find((b) => b.id === eb.badge_id);
                if (!badge) return null;
                return (
                  <div
                    key={eb.badge_id}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600"
                    title={badge.name}
                  >
                    <Award className="h-5 w-5 text-white" />
                  </div>
                );
              })}
              {passport.earnedBadges.length > 5 && (
                <span className="text-xs font-semibold text-[color:var(--cofex-black)]/55">
                  +{passport.earnedBadges.length - 5}
                </span>
              )}
            </div>
          </Link>
        )}

        <AppPageSection title="Edit profile">
          <form onSubmit={saveProfile} className="cofex-app-card space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="display_name">Display name</Label>
                <Input
                  id="display_name"
                  className="rounded-xl border-[color:var(--border)]"
                  value={display.display_name}
                  onChange={(e) => setForm({ ...display, display_name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="handle">Handle</Label>
                <Input
                  id="handle"
                  placeholder="@you"
                  className="rounded-xl border-[color:var(--border)]"
                  value={display.handle}
                  onChange={(e) => setForm({ ...display, handle: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                className="rounded-xl border-[color:var(--border)]"
                value={display.city}
                onChange={(e) => setForm({ ...display, city: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                rows={3}
                className="rounded-xl border-[color:var(--border)]"
                value={display.bio}
                onChange={(e) => setForm({ ...display, bio: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  className="rounded-xl border-[color:var(--border)]"
                  value={display.instagram_handle}
                  onChange={(e) => setForm({ ...display, instagram_handle: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="x">X / Twitter</Label>
                <Input
                  id="x"
                  className="rounded-xl border-[color:var(--border)]"
                  value={display.x_handle}
                  onChange={(e) => setForm({ ...display, x_handle: e.target.value })}
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={updateProfile.isPending}
              className="rounded-full bg-[color:var(--cofex-coffee-deep)] hover:bg-[color:var(--cofex-black)]"
            >
              {updateProfile.isPending ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </AppPageSection>

        {(isPartner || isAdmin) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {isPartner && (
              <Link
                to="/partner"
                className="cofex-app-card p-5 transition hover:-translate-y-0.5"
                style={{ background: "var(--cofex-cream-warm)" }}
              >
                <div className="text-xs font-bold tracking-wider text-[color:var(--cofex-coffee-deep)] uppercase">Partner</div>
                <div className="mt-1 font-semibold text-[color:var(--cofex-coffee-deep)]">Open partner dashboard</div>
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                className="cofex-app-card p-5 transition hover:-translate-y-0.5"
                style={{ background: "var(--cofex-pastel-lilac)" }}
              >
                <div className="text-xs font-bold tracking-wider text-[color:var(--cofex-coffee-deep)] uppercase">Admin</div>
                <div className="mt-1 font-semibold text-[color:var(--cofex-coffee-deep)]">Open admin console</div>
              </Link>
            )}
          </div>
        )}

        {!isPartner && (
          <AppPageSection title="Run a café?" icon={<Coffee className="h-5 w-5 text-[color:var(--cofex-cyan)]" />}>
            <div className="cofex-app-card p-5">
              {application ? (
                <p className="text-sm text-[color:var(--cofex-black)]/65">
                  Application for <strong>{application.business_name}</strong> · status:{" "}
                  <span className="font-medium capitalize">{application.status}</span>
                </p>
              ) : (
                <form onSubmit={applyPartner} className="space-y-3">
                  <Input
                    required
                    placeholder="Business name"
                    className="rounded-xl border-[color:var(--border)]"
                    value={appForm.business_name}
                    onChange={(e) => setAppForm({ ...appForm, business_name: e.target.value })}
                  />
                  <Input
                    required
                    type="email"
                    placeholder="Contact email"
                    className="rounded-xl border-[color:var(--border)]"
                    value={appForm.contact_email}
                    onChange={(e) => setAppForm({ ...appForm, contact_email: e.target.value })}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      placeholder="Phone"
                      className="rounded-xl border-[color:var(--border)]"
                      value={appForm.phone}
                      onChange={(e) => setAppForm({ ...appForm, phone: e.target.value })}
                    />
                    <Input
                      placeholder="City"
                      className="rounded-xl border-[color:var(--border)]"
                      value={appForm.city}
                      onChange={(e) => setAppForm({ ...appForm, city: e.target.value })}
                    />
                  </div>
                  <Textarea
                    placeholder="Tell us about your café"
                    className="rounded-xl border-[color:var(--border)]"
                    value={appForm.message}
                    onChange={(e) => setAppForm({ ...appForm, message: e.target.value })}
                  />
                  <Button
                    type="submit"
                    disabled={submitApplication.isPending}
                    className="rounded-full bg-[color:var(--cofex-coffee-deep)] hover:bg-[color:var(--cofex-black)]"
                  >
                    {submitApplication.isPending ? "Submitting…" : "Apply to become a partner"}
                  </Button>
                </form>
              )}
            </div>
          </AppPageSection>
        )}

        <AppLegalLinks />
      </AppPageBody>
    </AppPage>
  );
}
