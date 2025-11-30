# Stripe Webhooks for Listing-Based Purchases

This document describes how listing and order states are managed when a buyer purchases a listing through Stripe Checkout.

## Overview

When a buyer completes a listing purchase, the **Stripe webhook is the sole source of truth** for state updates:

1. **Stripe Webhook** - `checkout.session.completed` event updates order and listing state
2. **Redirect Success Page** - Read-only confirmation page (does NOT update state)

The webhook fires reliably regardless of whether the buyer returns to the app, ensuring consistent state management.

## Flow Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Buyer clicks   │────▶│  Stripe Checkout│────▶│  Payment        │
│  "Buy Now"      │     │  Page           │     │  Completes      │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                              ┌───────────────────────────┤
                              │                           │
                              ▼                           ▼
                   ┌─────────────────────┐     ┌─────────────────────┐
                   │  Stripe Webhook     │     │  Redirect to        │
                   │  (Source of Truth)  │     │  Success Page       │
                   │                     │     │  (Read-Only)        │
                   └──────────┬──────────┘     └──────────┬──────────┘
                              │                           │
                              ▼                           ▼
                   ┌─────────────────────┐     ┌─────────────────────┐
                   │  Update in          │     │  Display current    │
                   │  transaction:       │     │  state from DB      │
                   │  • Order → PAID     │     │  (no updates)       │
                   │  • Listing → SOLD   │     │                     │
                   └─────────────────────┘     └─────────────────────┘
```

## Webhook Handler (`/api/webhooks/stripe`)

### Events Handled

| Event Type | Purpose |
|------------|---------|
| `checkout.session.completed` | Primary handler for successful payments |
| `payment_intent.succeeded` | Fallback if checkout.session.completed is missed |

### Processing Logic

1. **Verify webhook signature** using `STRIPE_WEBHOOK_SECRET`
2. **Extract metadata** from the session/payment intent:
   - `orderId` - The order to update
   - `listingId` - The listing to mark as sold
   - `buyerId` - The buyer's Auth0 ID
3. **Update in a transaction**:
   - Set `Order.status = 'PAID'` (if still `PENDING`)
   - Set `Listing.status = 'SOLD'` (if still `PUBLISHED`)
4. **Log audit events** for both order and listing changes

### Idempotency

The webhook handler is fully idempotent:

- ✅ Checks order status before updating (skips if already `PAID`)
- ✅ Checks listing status before updating (skips if already `SOLD`)
- ✅ Uses database transactions for atomicity
- ✅ Safe for Stripe to retry the webhook multiple times

## Redirect Success Page (`/listings/[listingId]/purchase/success`)

### Purpose

Displays a **read-only confirmation** of the purchase. This page does NOT update any state - the webhook is the sole source of truth.

### Processing Logic

1. **Verify buyer owns the order** (Auth0 session check)
2. **Fetch current state** from database (order and listing)
3. **Display confirmation** with order details

### No State Updates

The success page:

- ❌ Does NOT update order status
- ❌ Does NOT update listing status
- ✅ Only reads and displays current state
- ✅ Safe to refresh the page multiple times

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Yes | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | Production | Webhook signing secret for signature verification |

### Getting the Webhook Secret

1. **Development (Stripe CLI)**:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   The CLI will display a webhook signing secret (starts with `whsec_`)

2. **Production (Stripe Dashboard)**:
   - Go to Developers → Webhooks
   - Create an endpoint for `https://your-domain.com/api/webhooks/stripe`
   - Select events: `checkout.session.completed`, `payment_intent.succeeded`
   - Copy the signing secret

## Audit Trail

The webhook handler creates audit log entries for all state changes:

### Webhook Audit Events

```json
{
  "entityType": "Order",
  "action": "PAYMENT_COMPLETED",
  "metadata": {
    "eventId": "evt_xxx",
    "eventType": "checkout.session.completed",
    "source": "webhook"
  }
}
```

```json
{
  "entityType": "Listing",
  "action": "MARKED_SOLD",
  "metadata": {
    "source": "webhook"
  }
}
```

The redirect success page does NOT create audit events (it's read-only).

## Testing

### Local Development

1. Start the Stripe CLI listener with your API key:
   ```bash
   source .env.local && stripe listen --forward-to localhost:3000/api/webhooks/stripe --api-key "$STRIPE_SECRET_KEY"
   ```

2. Set the webhook secret in `.env.local`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   ```

3. Restart your dev server to load the new secret

4. Create a test purchase at `/test-stripe` and observe:
   - Webhook events in Stripe CLI terminal
   - `[Webhook] Listing marked as SOLD` in server logs
   - Order status = PAID in database
   - Listing status = SOLD in database

### Verifying Webhook Processing

After completing a test payment:
1. Check CLI terminal shows `checkout.session.completed` with `[200]` response
2. Check server logs for `[Webhook] Purchase processed successfully`
3. Refresh the success page - it should show webhook processed status

### Troubleshooting

If webhooks aren't being received:
1. Verify CLI is using the same Stripe account as your app (see README)
2. Check `STRIPE_WEBHOOK_SECRET` matches CLI output
3. Ensure dev server was restarted after changing the secret

## Related Tickets

- **PM-32**: Core order model and Stripe integration
- **PM-33**: Listing model and redirect-based purchase flow
- **PM-39**: Stripe webhooks for listing-based purchases (this feature)
- **PM-34**: Replace test payments with real product purchases

