import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseAdminFraudDashboard, type TrustStatus } from "@/lib/anti-fraud";

export function useAdminFraudDashboard() {
  return useQuery({
    queryKey: ["adminFraudDashboard"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_fraud_dashboard");
      if (error) throw error;
      return parseAdminFraudDashboard(data);
    },
  });
}

export function useAdminSetUserTrust() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      trustStatus,
      fraudScore,
      notes,
    }: {
      userId: string;
      trustStatus: TrustStatus;
      fraudScore?: number;
      notes?: string;
    }) => {
      const { error } = await supabase.rpc("admin_set_user_trust", {
        _user_id: userId,
        _trust_status: trustStatus,
        _fraud_score: fraudScore ?? null,
        _notes: notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminFraudDashboard"] });
      qc.invalidateQueries({ queryKey: ["adminUsers"] });
      qc.invalidateQueries({ queryKey: ["adminUserDetail"] });
    },
  });
}

export function useAdminReviewCafeReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      reportId,
      status,
      adminNotes,
    }: {
      reportId: string;
      status: "reviewed" | "dismissed";
      adminNotes?: string;
    }) => {
      const { error } = await supabase.rpc("admin_review_cafe_report", {
        _report_id: reportId,
        _status: status,
        _admin_notes: adminNotes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminFraudDashboard"] }),
  });
}

export function useReportCafeFraud() {
  return useMutation({
    mutationFn: async ({
      reportedUserId,
      shopId,
      campaignId,
      reason,
      details,
    }: {
      reportedUserId: string;
      shopId: string;
      campaignId?: string;
      reason?: string;
      details?: string;
    }) => {
      const { data, error } = await supabase.rpc("report_cafe_fraud", {
        _reported_user_id: reportedUserId,
        _shop_id: shopId,
        _campaign_id: campaignId ?? null,
        _reason: reason ?? "suspicious_activity",
        _details: details ?? null,
      });
      if (error) throw error;
      return data;
    },
  });
}
