import { ProductGrid } from "@/components/product-grid";
import { SunBurst } from "trazo-stickers";
export const metadata = { title: "What we make" };
export default function Products() {
  return (
    <section className="moro-wrap moro-page">
      <div className="catalog-heading">
        <p className="moro-eyebrow">YOUR NEXT GOOD IDEA STARTS HERE</p>
        <h1>
          Pick your
          <br />
          <em>possibility.</em>
        </h1>
        <SunBurst size={140} color="#dc5b3e" />
        <p>
          Something for your brand, your event or someone special.
          <br />
          Choose a canvas. We’ll help you make it yours.
        </p>
      </div>
      <ProductGrid />
      <p className="catalog-endnote">
        Every project includes a proof to review before production.
      </p>
    </section>
  );
}
