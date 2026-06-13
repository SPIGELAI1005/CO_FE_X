import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  getAppBaseUrl,
  getStripe,
  getStripePriceId,
  isStripeConfigured,
  type StripeCheckoutPlan,
} from "@/lib/stripe.server";

async function assertPartnerOwnsShop(userId: string, shopId: string) {
  const { data: shop, error } = await supabaseAdmin
    .from("coffee_shops")
    .select("id, name, partner_id")
    .eq("id", shopId)
    .single();
  if (error || !shop) throw new Error("Shop not found");
  if (shop.partner_id !== userId) throw new Error("Forbidden");
  return shop;
}

async function getOrCreateStripeCustomer(shopId: string, shopName: string, userId: string) {
  const { data: existing } = await supabaseAdmin
    .from("shop_subscriptions")
    .select("stripe_customer_id")
    .eq("coffee_shop_id", shopId)
    .maybeSingle();

  if (existing?.stripe_customer_id) {
    return existing.stripe_customer_id;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    metadata: { shop_id: shopId, partner_id: userId },
    name: shopName,
  });

  await supabaseAdmin.from("shop_subscriptions").upsert(
    {
      coffee_shop_id: shopId,
      stripe_customer_id: customer.id,
      plan: "listing",
      status: "trialing",
    },
    { onConflict: "coffee_shop_id" },
  );

  return customer.id;
}

export const createStripeCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      shopId: z.string().uuid(),
      plan: z.enum(["pro", "campaign_boost"]),
    }),
  )
  .handler(async ({ data, context }) => {
    if (!isStripeConfigured()) {
      throw new Error("Stripe billing is not enabled yet.");
    }

    const shop = await assertPartnerOwnsShop(context.userId, data.shopId);
    const customerId = await getOrCreateStripeCustomer(shop.id, shop.name, context.userId);
    const stripe = getStripe();
    const baseUrl = getAppBaseUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: getStripePriceId(data.plan as StripeCheckoutPlan), quantity: 1 }],
      success_url: `${baseUrl}/partner/billing?checkout=success`,
      cancel_url: `${baseUrl}/partner/billing?checkout=canceled`,
      metadata: {
        shop_id: shop.id,
        plan: data.plan,
        partner_id: context.userId,
      },
      subscription_data: {
        metadata: {
          shop_id: shop.id,
          plan: data.plan,
          partner_id: context.userId,
        },
      },
    });

    if (!session.url) throw new Error("Could not start checkout session");
    return { url: session.url };
  });

export const createStripePortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ shopId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    if (!isStripeConfigured()) {
      throw new Error("Stripe billing is not enabled yet.");
    }

    await assertPartnerOwnsShop(context.userId, data.shopId);

    const { data: sub } = await supabaseAdmin
      .from("shop_subscriptions")
      .select("stripe_customer_id")
      .eq("coffee_shop_id", data.shopId)
      .maybeSingle();

    if (!sub?.stripe_customer_id) {
      throw new Error("No billing account for this shop yet.");
    }

    const stripe = getStripe();
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${getAppBaseUrl()}/partner/billing`,
    });

    return { url: portal.url };
  });

export const getStripeRevenueMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) throw new Error("Forbidden");

    const { data: subs } = await supabaseAdmin
      .from("shop_subscriptions")
      .select("plan, status, current_period_end, stripe_subscription_id");

    const rows = subs ?? [];
    const active = rows.filter((r) => r.status === "active" || r.status === "trialing");
    const byPlan = {
      listing: active.filter((r) => r.plan === "listing").length,
      campaign_boost: active.filter((r) => r.plan === "campaign_boost").length,
      pro: active.filter((r) => r.plan === "pro").length,
    };

    let mrrCents = byPlan.campaign_boost * 2900 + byPlan.pro * 7900;
    let stripeEnabled = isStripeConfigured();
    let churnLast30 = 0;

    if (stripeEnabled) {
      try {
        const stripe = getStripe();
        const canceled = await stripe.subscriptions.list({
          status: "canceled",
          limit: 100,
          created: { gte: Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60 },
        });
        churnLast30 = canceled.data.length;

        const live = await stripe.subscriptions.list({ status: "active", limit: 100 });
        mrrCents = live.data.reduce((sum, sub) => {
          const item = sub.items.data[0];
          const unit = item?.price?.unit_amount ?? 0;
          return sum + unit;
        }, 0);
      } catch {
        stripeEnabled = false;
      }
    }

    return {
      stripeEnabled,
      mrrCents,
      activeSubscriptions: active.filter((r) => r.plan !== "listing").length,
      trialing: active.filter((r) => r.status === "trialing" && r.plan !== "listing").length,
      pastDue: rows.filter((r) => r.status === "past_due").length,
      canceled: rows.filter((r) => r.status === "canceled").length,
      churnLast30,
      byPlan,
      paidPartners: new Set(
        active.filter((r) => r.plan !== "listing").map((r) => r.stripe_subscription_id).filter(Boolean),
      ).size,
    };
  });
