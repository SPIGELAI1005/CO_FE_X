type ExplorerEventName =
  | "leaderboard_opened"
  | "challenge_claimed"
  | "post_checkin_action"
  | "post_checkin_sheet_opened"
  | "badge_unlocked"
  | "city_collection_viewed"
  | "seasonal_challenge_viewed";

interface ExplorerEventDetail {
  name: ExplorerEventName;
  props?: Record<string, string | number | boolean>;
}

const pending: ExplorerEventDetail[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flushEvents() {
  const batch = pending.splice(0, pending.length);
  if (batch.length === 0) return;
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    await Promise.all(
      batch.map((e) =>
        supabase.rpc("log_explorer_event", {
          _event_name: e.name,
          _props: (e.props ?? {}) as Record<string, never>,
        }),
      ),
    );
  } catch {
    // fail silent, dev console still has events
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushEvents();
  }, 1500);
}

export function trackExplorerEvent(name: ExplorerEventName, props?: ExplorerEventDetail["props"]) {
  const detail: ExplorerEventDetail = { name, props };
  if (import.meta.env.DEV) {
    console.debug("[explorer-analytics]", detail);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cofex:explorer", { detail }));
  }
  pending.push(detail);
  scheduleFlush();
}
