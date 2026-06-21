import { supabase } from "@/integrations/supabase/client";

export async function uploadReviewPhoto(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `reviews/${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("social-proof").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("social-proof").getPublicUrl(path);
  return data.publicUrl;
}
