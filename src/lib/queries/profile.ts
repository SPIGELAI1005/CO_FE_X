import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./keys";

export interface ProfilePreferences {
  coffee_tags?: string[];
}

export interface Profile {
  id: string;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  instagram_handle: string | null;
  x_handle: string | null;
  total_points: number;
  total_check_ins: number;
  onboarding_completed_at: string | null;
  preferences: ProfilePreferences | null;
}
export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profile(userId ?? ""),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, display_name, handle, avatar_url, bio, city, instagram_handle, x_handle, total_points, total_check_ins, onboarding_completed_at, preferences",
        )
        .eq("id", userId!)
        .single();
      if (error) throw error;
      return {
        ...data,
        preferences: (data.preferences as ProfilePreferences | null) ?? {},
      } as Profile;
    },
  });
}

export function useCompleteOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      userId: string;
      city: string;
      coffeeTags: string[];
    }) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          city: payload.city,
          preferences: { coffee_tags: payload.coffeeTags },
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq("id", payload.userId);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.profile(vars.userId) });
    },
  });
}

export function useUploadAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { userId: string; file: File }) => {
      const { userId, file } = payload;
      if (file.size > 2 * 1024 * 1024) throw new Error("Max file size is 2MB");
      if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");

      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", userId);
      if (profileError) throw profileError;

      return avatarUrl;
    },
    onSuccess: (_url, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.profile(vars.userId) });
      qc.invalidateQueries({ queryKey: queryKeys.passport(vars.userId) });
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      userId: string;
      display_name?: string | null;
      handle?: string | null;
      bio?: string | null;
      city?: string | null;
      instagram_handle?: string | null;
      x_handle?: string | null;
    }) => {
      const { userId, ...fields } = payload;
      const { error } = await supabase.from("profiles").update(fields).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.profile(vars.userId) });
    },
  });
}

export interface PartnerApplication {
  id: string;
  business_name: string;
  contact_email: string;
  phone: string | null;
  city: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

export function usePartnerApplication(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.partnerApplication(userId ?? ""),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_applications")
        .select("id, business_name, contact_email, phone, city, message, status, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as PartnerApplication | null;
    },
  });
}

export function useSubmitPartnerApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      userId: string;
      business_name: string;
      contact_email: string;
      phone?: string;
      city?: string;
      message?: string;
    }) => {
      const { userId, ...fields } = payload;
      const { error } = await supabase.from("partner_applications").insert({
        user_id: userId,
        ...fields,
      });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.partnerApplication(vars.userId) });
    },
  });
}
