import { NextResponse } from "next/server";
import { price, pricingPolicy } from "@/lib/pricing";
import { fail, jsonBody, sameOrigin } from "@/lib/http";
import { catalogueProduct } from "@/lib/catalog-server";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const c = await jsonBody(req, 3000);
    return NextResponse.json(
      price(c, pricingPolicy(), await catalogueProduct(c.productId)),
    );
  } catch (e) {
    return fail(e);
  }
}
