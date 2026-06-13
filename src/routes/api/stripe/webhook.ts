import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getStripe, planFromStripePrice } from "@/lib/stripe.server";

export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        const signature = request.headers.get("stripe-signature");

        if (!secret || !signature) {
          return new Response("Webhook not configured", { status: 400 });
        }

        const body = await request.text();
        let event: Stripe.Event;

        try {
          event = getStripe().webhooks.constructEvent(body, signature, secret);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Invalid signature";
          return new Response(message, { status: 400 });
        }

        try {
          await handleStripeEvent(event);
        } catch (err) {
          console.error("[stripe webhook]", err);
          return new Response("Handler error", { status: 500 });
        }

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});

async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      await onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await upsertSubscription(event.data.object as Stripe.Subscription);
      break;
    case "customer.subscription.deleted":
      await cancelSubscription(event.data.object as Stripe.Subscription);
      break;
    default:
      break;
  }
}

async function onCheckoutCompleted(session: Stripe.Checkout.Session) {
  const shopId = session.metadata?.shop_id;
  if (!shopId) return;

  const plan = (session.metadata?.plan as "pro" | "campaign_boost" | undefined) ?? "pro";
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  await supabaseAdmin.from("shop_subscriptions").upsert(
    {
      coffee_shop_id: shopId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan,
      status: "active",
    },
    { onConflict: "coffee_shop_id" },
  );

  await syncPartnerPlanBridge(shopId, plan, customerId, subscriptionId, "active");
}

async function upsertSubscription(subscription: Stripe.Subscription) {
  const shopId = subscription.metadata?.shop_id;
  if (!shopId) return;

  const priceId = subscription.items.data[0]?.price?.id;
  const plan =
    (subscription.metadata?.plan as "pro" | "campaign_boost" | undefined) ??
    planFromStripePrice(priceId) ??
    "pro";

  const status = mapStripeStatus(subscription.status);
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;

  await supabaseAdmin.from("shop_subscriptions").upsert(
    {
      coffee_shop_id: shopId,
      stripe_customer_id: customerId ?? null,
      stripe_subscription_id: subscription.id,
      plan,
      status,
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
    },
    { onConflict: "coffee_shop_id" },
  );

  await syncPartnerPlanBridge(shopId, plan, customerId ?? null, subscription.id, status);
}

async function cancelSubscription(subscription: Stripe.Subscription) {
  const shopId = subscription.metadata?.shop_id;
  if (!shopId) return;

  await supabaseAdmin
    .from("shop_subscriptions")
    .update({
      status: "canceled",
      plan: "listing",
      stripe_subscription_id: null,
      current_period_end: null,
    })
    .eq("coffee_shop_id", shopId);

  await syncPartnerPlanBridge(shopId, "listing", null, null, "canceled");
}

async function syncPartnerPlanBridge(
  shopId: string,
  shopPlan: "pro" | "campaign_boost" | "listing",
  stripeCustomerId: string | null,
  stripeSubscriptionId: string | null,
  status: string,
) {
  const { error } = await supabaseAdmin.rpc("sync_partner_subscription_from_shop", {
    _shop_id: shopId,
    _shop_plan: shopPlan,
    _stripe_customer_id: stripeCustomerId,
    _stripe_subscription_id: stripeSubscriptionId,
    _status: status === "canceled" ? "canceled" : status,
  });
  if (error) {
    console.warn("[stripe webhook] partner plan bridge skipped:", error.message);
  }
}

function mapStripeStatus(status: Stripe.Subscription.Status) {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
      return "canceled";
    default:
      return "incomplete";
  }
}
