"use client";
import Link from "next/link";
import { useState } from "react";
import { useCatalog } from "@/components/catalog-provider";
import Image from "next/image";
import { gallery, gallerySource } from "@/lib/gallery";
import { FlowerRed } from "trazo-stickers";
export default function Work() {
  const products = useCatalog();
  const [filter, setFilter] = useState("all");
  const visible = gallery.filter(
    (item) => filter === "all" || item.product === filter,
  );
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
          Real objects. Thoughtful details. A starting point for yours.
          <br />
          Independent print inspiration, photographed by the creators credited
          below.
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
      <p className="gallery-count" role="status">
        {visible.length} {visible.length === 1 ? "piece" : "pieces"} to explore
      </p>
      <div className="moro-product-grid gallery-grid">
        {visible.map((item) => (
          <article className="gallery-card" key={item.product}>
            <Link
              href={"/studio?product=" + item.product}
              className="gallery-image-link"
              aria-label={
                "Design your own " +
                (products.find((p) => p.id === item.product)?.short ||
                  item.product)
              }
            >
              <div className="moro-product-art">
                <Image
                  src={"/images/gallery/" + item.product + ".webp"}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 33vw"
                />
                <span className="product-hover">
                  Make something like this ↗
                </span>
              </div>
            </Link>
            <div className="moro-product-caption">
              <small>
                {products.find((p) => p.id === item.product)?.name ||
                  item.product}
              </small>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </div>
            <details className="gallery-credit">
              <summary>Photo &amp; licence</summary>
              <p>
                Photo: {item.creator}.{" "}
                <a
                  href={gallerySource(item.file)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Original photograph ↗
                </a>
              </p>
              <p>
                <a href={item.licenseUrl} target="_blank" rel="noreferrer">
                  {item.license}
                </a>
                . Resized and converted to WebP; display may crop. Adapted
                images retain the stated licence.
              </p>
            </details>
          </article>
        ))}
      </div>
      <p className="gallery-note">
        A collection of independently made work, shared for inspiration. These
        are not Moro commissions, customer testimonials or endorsements.
      </p>
    </section>
  );
}
