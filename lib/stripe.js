// Minimal Stripe REST client using fetch (no stripe npm package needed).
// Configure with:
//   STRIPE_SECRET_KEY      - sk_live_... or sk_test_...
//   STRIPE_PRICE_ID        - recurring Price (price_...) of Premium without commitment (monthly)
//   STRIPE_PRICE_ID_COMMIT - optional: Premium with a 12-month commitment (monthly, cheaper)
//   STRIPE_PRICE_ID_ULTRA  - optional, not offered for now: monthly Ultra plan
//   STRIPE_PORTAL_CONFIG / STRIPE_PORTAL_CONFIG_COMMITTED - optional customer portal
//                            configurations (bpc_...): normal, and without cancellation
//                            for accounts still inside their 12-month commitment
//   STRIPE_WEBHOOK_SECRET  - whsec_... used to verify webhook signatures
//
// Payouts: Stripe automatically transfers your balance to the bank account configured
// in your own Stripe Dashboard (Settings -> Payouts / Bank accounts). This app never
// touches your bank details directly - that must be entered by you in Stripe.

const crypto = require("crypto");

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID;
// The offers: plan id -> Stripe Price id, and the access level it gives.
const PLANS = {
    monthly: { price: STRIPE_PRICE_ID, tier: "premium" },
    commit: { price: process.env.STRIPE_PRICE_ID_COMMIT, tier: "premium" },
    ultra: { price: process.env.STRIPE_PRICE_ID_ULTRA, tier: "ultra" },
};
function planAvailable(plan) { return Boolean(STRIPE_SECRET_KEY && Object.prototype.hasOwnProperty.call(PLANS, plan) && PLANS[plan].price); }
// Which offer a Stripe Price belongs to (null for an unknown price).
function planForPrice(priceId) {
    if (!priceId) return null;
    for (const k of Object.keys(PLANS)) if (PLANS[k].price && PLANS[k].price === priceId) return k;
    return null;
}
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

function isConfigured() {
    return Boolean(STRIPE_SECRET_KEY && STRIPE_PRICE_ID);
}

async function stripeRequest(path, params) {
    const body = new URLSearchParams(params);
    const res = await fetch(`https://api.stripe.com/v1/${path}`, {
          method: "POST",
          headers: {
                  Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
                  "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
    });
    const json = await res.json();
    if (!res.ok) {
          const msg = (json.error && json.error.message) || `Stripe error ${res.status}`;
          throw new Error(msg);
    }
    return json;
}

async function createCheckoutSession({ userId, email, plan, successUrl, cancelUrl }) {
    plan = planAvailable(plan) ? plan : "monthly";
    return stripeRequest("checkout/sessions", {
          mode: "subscription",
          "line_items[0][price]": PLANS[plan].price,
          "line_items[0][quantity]": "1",
          customer_email: email,
          client_reference_id: String(userId),
          "metadata[plan]": plan,
          "subscription_data[metadata][plan]": plan,
          success_url: successUrl,
          cancel_url: cancelUrl,
    });
}

// Stripe's customer portal: change offer, update the card, cancel, invoices.
async function createPortalSession(customerId, returnUrl, configuration) {
    const params = { customer: customerId, return_url: returnUrl };
    if (configuration) params.configuration = configuration;
    return stripeRequest("billing_portal/sessions", params);
}

// Verifies the Stripe-Signature header against the raw request body.
// See https://docs.stripe.com/webhooks#verify-manually
function verifyWebhookSignature(rawBody, sigHeader) {
    if (!STRIPE_WEBHOOK_SECRET) throw new Error("STRIPE_WEBHOOK_SECRET not configured");
    if (!sigHeader) throw new Error("Missing Stripe-Signature header");
    const parts = Object.fromEntries(
          sigHeader.split(",").map((p) => {
                  const [k, v] = p.split("=");
                  return [k, v];
          })
        );
    const timestamp = parts.t;
    const expectedSig = parts.v1;
    if (!timestamp || !expectedSig) throw new Error("Malformed Stripe-Signature header");
    const signedPayload = `${timestamp}.${rawBody}`;
    const computed = crypto
      .createHmac("sha256", STRIPE_WEBHOOK_SECRET)
      .update(signedPayload, "utf8")
      .digest("hex");
    const a = Buffer.from(computed);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
          throw new Error("Signature mismatch");
    }
    // Reject events older than 5 minutes to limit replay risk.
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
        throw new Error("Timestamp outside tolerance");
  }
    return JSON.parse(rawBody);
}

async function stripeGet(path) {
    const res = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` } });
    const json = await res.json();
    if (!res.ok) throw new Error((json.error && json.error.message) || `Stripe error ${res.status}`);
    return json;
}

// Makes sure the webhook endpoint pointing at `url` listens to every event in
// `required`, adding the missing ones (existing events and the signing secret
// are kept). Returns { state: ok|updated|missing_endpoint|error, detail }.
async function ensureWebhookEvents(url, required) {
    try {
        const list = await stripeGet("webhook_endpoints?limit=100");
        const ep = (list.data || []).find((e) => e.url === url);
        if (!ep) {
            return { state: "missing_endpoint", detail: `Aucun webhook Stripe vers ${url} : le créer dans Stripe → Developers → Webhooks` };
        }
        if (ep.status && ep.status !== "enabled") {
            return { state: "error", detail: `Webhook Stripe désactivé (${ep.status})` };
        }
        const events = ep.enabled_events || [];
        if (events.includes("*")) return { state: "ok", detail: "tous les événements" };
        const missing = required.filter((e) => !events.includes(e));
        if (!missing.length) return { state: "ok", detail: required.join(", ") };
        const body = new URLSearchParams();
        events.concat(missing).forEach((e) => body.append("enabled_events[]", e));
        const res = await fetch(`https://api.stripe.com/v1/webhook_endpoints/${encodeURIComponent(ep.id)}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
            body: body.toString(),
        });
        const json = await res.json();
        if (!res.ok) throw new Error((json.error && json.error.message) || `Stripe error ${res.status}`);
        return { state: "updated", detail: "ajouté : " + missing.join(", ") };
    } catch (err) {
        return { state: "error", detail: err.message };
    }
}

// Prices shown on the subscription page (amount, currency, billing period),
// read from Stripe and cached for an hour. null when the offer is not set up.
const priceCache = {};
async function getPrice(plan = "monthly") {
    if (!planAvailable(plan)) return null;
    const c = priceCache[plan];
    if (c && Date.now() - c.at < 3600 * 1000) return c.value;
    const res = await fetch(`https://api.stripe.com/v1/prices/${encodeURIComponent(PLANS[plan].price)}`, {
        headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
        signal: AbortSignal.timeout(8000),
    });
    const j = await res.json();
    if (!res.ok) throw new Error((j.error && j.error.message) || `Stripe error ${res.status}`);
    const value = {
        amount: j.unit_amount, currency: j.currency,
        interval: j.recurring ? j.recurring.interval : null, intervalCount: j.recurring ? j.recurring.interval_count : 1,
        trialDays: j.recurring && j.recurring.trial_period_days ? j.recurring.trial_period_days : 0,
    };
    priceCache[plan] = { at: Date.now(), value };
    return value;
}

module.exports = { isConfigured, createCheckoutSession, createPortalSession, verifyWebhookSignature, ensureWebhookEvents, getPrice, PLANS, planAvailable, planForPrice };
