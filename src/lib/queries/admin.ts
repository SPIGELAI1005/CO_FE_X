import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./keys";

export function useAdminOverview() {
  return useQuery({
    queryKey: queryKeys.adminOverview(),
    queryFn: async () => {
      const [
        { count: users },
        { count: shops },
        { count: pendingApps },
        { count: activeCampaigns },
        { count: checkIns },
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("coffee_shops").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("partner_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("check_ins").select("id", { count: "exact", head: true }),
      ]);
      return {
        users: users ?? 0,
        shops: shops ?? 0,
        pendingApps: pendingApps ?? 0,
        activeCampaigns: activeCampaigns ?? 0,
        checkIns: checkIns ?? 0,
      };
    },
  });
}

export interface AdminEngagement {
  daily_active_7d: number;
  check_ins_7d: number;
  check_ins_by_city: { city: string; count: number }[];
}

export function useAdminEngagement() {
  return useQuery({
    queryKey: queryKeys.adminEngagement(),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_engagement");
      if (error) throw error;
      const row = (data ?? {}) as AdminEngagement;
      return {
        daily_active_7d: row.daily_active_7d ?? 0,
        check_ins_7d: row.check_ins_7d ?? 0,
        check_ins_by_city: row.check_ins_by_city ?? [],
      };
    },
  });
}

export function useAdminPartnerApplications() {
  return useQuery({
    queryKey: queryKeys.adminPartnerApplications(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_applications")
        .select("id, user_id, business_name, contact_email, phone, city, message, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useReviewPartnerApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "approved" | "rejected" }) => {
      const { error } = await supabase.rpc("review_partner_application", {
        _application_id: id,
        _decision: decision,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminPartnerApplications() });
      qc.invalidateQueries({ queryKey: queryKeys.adminOverview() });
    },
  });
}

export function useAdminPendingShops() {
  return useQuery({
    queryKey: queryKeys.adminPendingShops(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coffee_shops")
        .select("id, name, slug, city, status, partner_id, created_at")
        .in("status", ["pending", "suspended"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminSetShopStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ shopId, status }: { shopId: string; status: string }) => {
      const { error } = await supabase.rpc("admin_set_shop_status", {
        _shop_id: shopId,
        _status: status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminPendingShops() });
      qc.invalidateQueries({ queryKey: queryKeys.adminOverview() });
      qc.invalidateQueries({ queryKey: queryKeys.coffeeShops() });
    },
  });
}

export function useAdminCampaigns() {
  return useQuery({
    queryKey: queryKeys.adminCampaigns(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, title, status, coffee_shop_id, starts_at, ends_at, coffee_shops(name, city)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminSetCampaignStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ campaignId, status }: { campaignId: string; status: string }) => {
      const { error } = await supabase.rpc("admin_set_campaign_status", {
        _campaign_id: campaignId,
        _status: status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminCampaigns() });
      qc.invalidateQueries({ queryKey: queryKeys.adminOverview() });
    },
  });
}

export function useAdminUsers(search: string) {
  return useQuery({
    queryKey: queryKeys.adminUsers(search),
    queryFn: async () => {
      let q = supabase
        .from("profiles")
        .select("id, display_name, handle, city, total_points, total_check_ins")
        .order("total_points", { ascending: false })
        .limit(50);
      if (search.trim()) {
        q = q.or(`display_name.ilike.%${search}%,handle.ilike.%${search}%,city.ilike.%${search}%`);
      }
      const { data, error } = await q;
      if (error) throw error;

      const ids = (data ?? []).map((p) => p.id);
      const { data: roles } = ids.length
        ? await supabase.from("user_roles").select("user_id, role").in("user_id", ids)
        : { data: [] };

      const roleMap = new Map<string, string[]>();
      for (const r of roles ?? []) {
        const list = roleMap.get(r.user_id) ?? [];
        list.push(r.role);
        roleMap.set(r.user_id, list);
      }

      return (data ?? []).map((p) => ({
        ...p,
        roles: roleMap.get(p.id) ?? ["explorer"],
      }));
    },
  });
}

export function useAdminSetUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      role,
      action,
    }: {
      userId: string;
      role: "explorer" | "partner" | "admin";
      action: "grant" | "revoke";
    }) => {
      if (action === "grant") {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminUsers"] });
    },
  });
}
