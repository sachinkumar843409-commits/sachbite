// ============================================================
// SachBite Monetization — stubbed subscription abstraction
// ============================================================
// IMPORTANT: No payment gateway is integrated here. These functions
// exist so that a future payment integration (e.g. Razorpay) has a
// clean place to plug in, WITHOUT any route currently calling them
// to produce a fake "success". Every function below either throws
// or returns an explicit "not_active" result — never a fabricated
// success response.
//
// The standard restaurant commission (8%) is defined once, here,
// as a server-side constant. It is never read from req.body and
// never editable by a restaurant or customer through any API route.

const PLATFORM_COMMISSION_PERCENT_DEFAULT = 8;

/** Reads the current commission percent — admin-editable via settings,
 * falling back to the documented standard (8%) if never set. */
function getCommissionPercent(db) {
  const v = db && db.settings && db.settings.platformCommissionPercent;
  return v != null && v !== "" ? Number(v) : PLATFORM_COMMISSION_PERCENT_DEFAULT;
}

const PLANS = {
  free: {
    id: "free",
    name: "Free",
    priceRupees: 0,
    billingPeriod: "month",
    status: "available",
    features: [
      "Restaurant listing",
      "Menu management",
      "Order management",
      "Basic restaurant dashboard",
      "Basic sales information",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceRupees: 499,
    billingPeriod: "month",
    status: "coming_soon",
    features: [
      "Everything in Free",
      "Featured restaurant placement",
      "Promotional offers",
      "Better visibility",
      "Advanced sales analytics",
    ],
  },
  business: {
    id: "business",
    name: "Business",
    priceRupees: 999,
    billingPeriod: "month",
    status: "coming_soon",
    features: [
      "Everything in Pro",
      "Advanced analytics",
      "Promotional tools",
      "Priority visibility",
      "Additional business tools",
    ],
  },
};

/**
 * Pure calculation helper — used for DISPLAY ONLY. Does not touch how
 * checkout/order totals are computed or stored (see server.js order
 * creation, which is unaffected by this file).
 */
function calculateCommission(orderValue, commissionPercent) {
  const value = Number(orderValue) || 0;
  const percent = commissionPercent != null ? Number(commissionPercent) : PLATFORM_COMMISSION_PERCENT_DEFAULT;
  const commissionAmount = Math.round((value * percent) / 100);
  return {
    orderValue: value,
    commissionPercent: percent,
    commissionAmount,
    restaurantNet: Math.max(0, value - commissionAmount),
  };
}

const VALID_PLANS = ["free", "pro", "business"];
const VALID_SUB_STATUSES = ["active", "inactive", "pending"];
const VALID_FEATURED_STATUSES = ["active", "inactive", "pending"];

/**
 * Manually sets a restaurant's monetization fields — called ONLY from an
 * admin-authenticated route (requireAdmin). This is NOT a payment gateway
 * integration; it's how the SachBite owner records that a restaurant has
 * paid/agreed to a plan outside the app (e.g. UPI/bank transfer), or wants
 * to switch it off. No online payment is collected by this function.
 */
function setRestaurantMonetization(restaurant, updates) {
  if (!restaurant) return { ok: false, error: "Restaurant not found" };

  const { subscriptionPlan, subscriptionStatus, featuredStatus, subscriptionStart, subscriptionEnd } = updates || {};

  if (subscriptionPlan !== undefined) {
    if (!VALID_PLANS.includes(subscriptionPlan)) return { ok: false, error: "Invalid subscriptionPlan" };
    restaurant.subscriptionPlan = subscriptionPlan;
  }
  if (subscriptionStatus !== undefined) {
    if (!VALID_SUB_STATUSES.includes(subscriptionStatus)) return { ok: false, error: "Invalid subscriptionStatus" };
    restaurant.subscriptionStatus = subscriptionStatus;
  }
  if (featuredStatus !== undefined) {
    if (!VALID_FEATURED_STATUSES.includes(featuredStatus)) return { ok: false, error: "Invalid featuredStatus" };
    restaurant.featuredStatus = featuredStatus;
  }
  if (subscriptionStart !== undefined) restaurant.subscriptionStart = subscriptionStart || null;
  if (subscriptionEnd !== undefined) restaurant.subscriptionEnd = subscriptionEnd || null;

  return { ok: true, restaurant: checkSubscriptionStatus(restaurant) };
}

/**
 * Would start a new paid subscription for a restaurant. STUBBED.
 * Payment collection is intentionally not implemented yet.
 */
function createSubscription(/* restaurantId, planId */) {
  return {
    ok: false,
    status: "not_active",
    message: "Subscription payments are not yet enabled. Contact SachBite to proceed manually.",
  };
}

/**
 * Would mark a subscription active after successful payment. STUBBED.
 * Never called by any route today — no fake activations are produced.
 */
function activateSubscription(/* restaurantId, planId, periodStart, periodEnd */) {
  return {
    ok: false,
    status: "not_active",
    message: "Subscription activation is not yet enabled.",
  };
}

/**
 * Would cancel an active paid subscription. STUBBED.
 */
function cancelSubscription(/* restaurantId */) {
  return {
    ok: false,
    status: "not_active",
    message: "Subscription cancellation is not yet enabled (no paid subscriptions exist yet).",
  };
}

/**
 * Reads the CURRENT stored subscription status for a restaurant record.
 * This one is real (not a payment stub) — it just reports the fields
 * already stored on the restaurant object, with safe fallbacks for
 * older records that predate this feature.
 */
function checkSubscriptionStatus(restaurant) {
  if (!restaurant) return null;
  return {
    subscriptionPlan: restaurant.subscriptionPlan || "free",
    subscriptionStatus: restaurant.subscriptionStatus || "active",
    featuredStatus: restaurant.featuredStatus || "inactive",
    subscriptionStart: restaurant.subscriptionStart || null,
    subscriptionEnd: restaurant.subscriptionEnd || null,
  };
}

module.exports = {
  PLATFORM_COMMISSION_PERCENT_DEFAULT,
  getCommissionPercent,
  PLANS,
  calculateCommission,
  createSubscription,
  activateSubscription,
  cancelSubscription,
  checkSubscriptionStatus,
  setRestaurantMonetization,
};
