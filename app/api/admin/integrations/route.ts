import { NextResponse } from "next/server";
import { actor, fail } from "@/lib/http";
import { stripeClient, stripeMode } from "@/lib/stripe";
import { mailConfigured } from "@/lib/mail";
export async function GET() {
  try {
    await actor(true);
    let payments: {
      configured: boolean;
      testReady?: boolean;
      mode: string;
      chargesEnabled: boolean | null;
      payoutsEnabled: boolean | null;
      requirements: string[];
      error?: string;
    } = {
      configured: !!process.env.STRIPE_SECRET_KEY,
      mode: stripeMode(),
      chargesEnabled: null,
      payoutsEnabled: null,
      requirements: [],
    };
    if (payments.configured) {
      try {
        if (payments.mode === "test") {
          await stripeClient().checkout.sessions.list({ limit: 1 });
          payments.testReady = true;
        } else {
          const account = await stripeClient().accounts.retrieve();
          payments = {
            ...payments,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            requirements: account.requirements?.currently_due || [],
          };
        }
      } catch {
        payments.error =
          "Could not verify the Stripe account. Check its access permissions.";
      }
    }
    return NextResponse.json({
      payments,
      capabilities: {
        automaticSourceArtwork: true,
        targetedWorker: true,
        archiveSearch: true,
      },
      email: {
        configured: mailConfigured(),
        provider: process.env.SMTP_HOST
          ? "SMTP"
          : process.env.RESEND_API_KEY
            ? "Resend"
            : null,
        sender: process.env.EMAIL_FROM || null,
      },
      commerceEnabled: process.env.COMMERCE_ENABLED === "true",
    });
  } catch (e) {
    return fail(e);
  }
}
