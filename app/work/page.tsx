"use client";
import Link from "next/link";
import { useState } from "react";
import { useCatalog } from "@/components/catalog-provider";
import { PrintPoster } from "@/components/print-poster";
import { FlowerRed } from "trazo-stickers";
export default function Work() {
  const products = useCatalog();
  const [filter, setFilter] = useState("all");
  return (
    <section className="moro-wrap moro-page">
      <div className="catalog-heading">
        <p className="moro-eyebrow">THE INSPIRATION WALL</p>
        <h1>
          It starts with
          <br />
          <em>a little spark.</em>
        </h1>
        <FlowerRed size={140} color="#2b53b9" />
        <p>
          A few ideas from our studio. A starting point for yours.
          <br />
          These are concept designs, ready for your own interpretation.
        </p>
      </div>
      <div className="moro-filters" aria-label="Filter inspiration">
        {[["all", "Everything"], ...products.map((p) => [p.id, p.short])].map(
          ([id, label]) => (
            <button
              aria-pressed={filter === id}
              className={filter === id ? "selected" : ""}
              key={id}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ),
        )}
      </div>
      <div className="moro-product-grid">
        {products
          .filter((p) => filter === "all" || p.id === filter)
          .map((p) => (
            <Link
              href={"/studio?product=" + p.id}
              className={"moro-product-card category-" + p.id}
              key={p.id}
            >
              <div className="moro-product-art">
                <div className="product-poster">
                  <PrintPoster kind={p.id} />
                </div>
                <span className="product-hover">Create your version</span>
              </div>
              <div className="moro-product-caption">
                <small>STUDIO CONCEPT</small>
                <h3>{p.name}</h3>
              </div>
            </Link>
          ))}
      </div>
    </section>
  );
}
