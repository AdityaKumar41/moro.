"use client";
import Link from "next/link";
import { PrintPoster } from "./print-poster";
import { useCatalog } from "./catalog-provider";
export function ProductGrid() {
  const products = useCatalog();
  return (
    <div className="moro-product-grid">
      {products.map((p) => (
        <Link
          href={"/studio?product=" + p.id}
          key={p.id}
          className={"moro-product-card category-" + p.id}
        >
          <div className="moro-product-art">
            <div className="product-poster">
              <PrintPoster kind={p.id} />
            </div>
            <span className="product-hover">Make it yours</span>
          </div>
          <div className="moro-product-caption">
            <h3>{p.name}</h3>
            <p>{p.description}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
