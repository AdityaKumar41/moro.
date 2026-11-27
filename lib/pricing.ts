import { sandboxEnabled } from "./payment-mode";
import {
  configSchema,
  divisions,
  type Product,
  type Configuration,
} from "./catalog";
export type PricingPolicy = {
  currency: string;
  taxBps: number;
  version: string;
  approved: boolean;
  sandbox?: boolean;
};
export const previewPolicy: PricingPolicy = {
  currency: "INR",
  taxBps: 1800,
  version: "sample-2026-01",
  approved: false,
};
export function pricingPolicy(): PricingPolicy {
  return {
    currency: process.env.STORE_CURRENCY || "INR",
    taxBps: Number(process.env.STORE_TAX_BPS || 1800),
    version: process.env.PRICING_VERSION || previewPolicy.version,
    approved: process.env.COMMERCE_ENABLED === "true" || sandboxEnabled(),
    sandbox: sandboxEnabled(),
  };
}
export function price(
  raw: Configuration,
  policy: PricingPolicy = previewPolicy,
  product?: Product,
) {
  const c = configSchema.parse(raw);
  const p = product || divisions.find((p) => p.id === c.productId);
  if (!p || p.id !== c.productId || !p.material.includes(c.material))
    throw Error("Choose a valid product and material");
  policy = {
    ...policy,
    taxBps: p.taxBps ?? policy.taxBps,
    approved:
      policy.approved && (p.approved === true || policy.sandbox === true),
  };
  if (
    !Number.isInteger(policy.taxBps) ||
    policy.taxBps < 0 ||
    policy.taxBps > 10000
  )
    throw Error("Invalid tax configuration");
  const area = (c.width * c.height) / (p.width * p.height);
  const materialFactor = p.material.indexOf(c.material) === 0 ? 100 : 125;
  const baseUnit = Math.ceil(
    (p.rate * Math.max(0.3, area) * materialFactor) / 100,
  );
  const discountBps =
    c.quantity >= 500
      ? 2500
      : c.quantity >= 250
        ? 2000
        : c.quantity >= 100
          ? 1000
          : 0;
  const goods = Math.round(
    (baseUnit * c.quantity * (10000 - discountBps)) / 10000,
  );
  const net = goods + p.setup;
  const tax = Math.round((net * policy.taxBps) / 10000);
  return {
    unit: Math.round(goods / c.quantity),
    goods,
    setup: p.setup,
    net,
    tax,
    total: net + tax,
    discountBps,
    currency: policy.currency,
    taxBps: policy.taxBps,
    pricingVersion: policy.version,
    approved: policy.approved,
    sandbox: policy.sandbox === true,
  };
}
