// Minimal Stripe REST client using fetch (no stripe npm package needed).
// Configure with:
//   STRIPE_SECRET_KEY      - sk_live_... or sk_test_...
//   STRIPE_PRICE_ID        - a recurring Price id (price_...) for the premium subscription
//   STRIPE_WEBHOOK_SECRET  - whsec_... used to verify webhook signatures
//
// Payouts: Stripe automatically transfers your balance to the bank account configured
// in your own Stripe Dashboard (Settings -> Payouts / Bank accounts). This app never
// touches your bank details directly - that must be entered by you in Stripe.

const crypto = require("crypto");

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID;
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

async function createCheckoutSession({ userId, email, successUrl, cancelUrl }) {
    return stripeRequest("checkout/sessions", {
          mode: "subscription",
          "line_items[0][price]": STRIPE_PRICE_ID,
          "line_items[0][quantity]": "1",
          customer_email: email,
          client_reference_id: String(userId),
          success_url: successUrl,
          cancel_url: cancelUrl,
    });
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

module.exports = { isConfigured, createCheckoutSession, verifyWebhookSignature, ensureWebhookEvents };
