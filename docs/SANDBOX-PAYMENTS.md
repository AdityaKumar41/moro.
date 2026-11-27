# Test-mode payments

Set PAYMENTS_MODE=test and use Stripe test credentials/signing secrets. Keep COMMERCE_ENABLED=false until a separate real-money launch is approved. Test purchases charge no real money and schedule no physical dispatch. Never use real card details.

For an India Stripe account, the India-issued test Visa `4000 0035 6000 0008`, future expiry, three-digit CVC and India billing may be needed to avoid international-card restrictions. Complete the simulated authentication challenge. Use [Stripe's official testing documentation](https://docs.stripe.com/testing) for current fixtures and supported behavior. A US-issued fixture or the creation of a Checkout session does not prove the merchant can accept every payment.

Verify the PaymentIntent/session and signed webhook against the exact order, ownership, amount and currency. Check server paid state, queued proof, PDF receipt delivery, cancellation/return, retry and replay. Never manually mark an actual customer paid to make a test pass. Keep environment disclosure in small relevant footer/payment guidance, without disabling provider test indicators or security gates.
