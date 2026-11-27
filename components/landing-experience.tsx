"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { SunBurst, LoopRibbon, FlowerRed } from "trazo-stickers";
import { CircleType, PrintPoster } from "./print-poster";
const cards = [
  ["stamps", "A personal touch"],
  ["mtb", "Made for the ride"],
  ["labels", "Little things, big feelings"],
  ["race", "For your next finish line"],
  ["laser", "Made to keep"],
  ["trophies", "A moment worth making"],
];
export function LandingHero() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty(
          "--spread",
          String(Math.max(0, Math.min(1, scrollY / 650))),
        );
      });
    };
    if (!motion.matches)
      window.addEventListener("scroll", update, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
    };
  }, []);
  return (
    <section className="moro-hero" ref={root}>
      <div className="hero-intro">
        <p className="moro-eyebrow">A PRINT STUDIO FOR PEOPLE WITH IDEAS</p>
        <h1>
          A little idea.
          <br />A{" "}
          <span className="lasting-word">
            lasting
            <svg viewBox="0 0 500 30" aria-hidden="true">
              <path d="M5 20Q200 0 490 12M30 28Q280 8 450 20" />
            </svg>
          </span>{" "}
          impression.
        </h1>
        <div className="hero-flower">
          <FlowerRed size={100} color="#df5337" />
        </div>
        <p>
          Design and order custom labels, race numbers and more.
          <br />
          See your price. Approve your proof. We’ll make it.
        </p>
        <Link className="moro-button" href="/products">
          Explore print products
        </Link>
        <div className="hero-ring">
          <CircleType id="hero-circle" />
          <SunBurst size={56} color="#264dba" />
        </div>
      </div>
      <div className="print-fan" aria-label="Explore our custom print products">
        {cards.map(([kind, label], i) => (
          <Link
            href={"/studio?product=" + kind}
            className={"fan-card fan-" + i}
            key={kind}
            aria-label={label}
          >
            <PrintPoster kind={kind} />
          </Link>
        ))}
      </div>
      <div className="hero-bottom">
        <span>YOU IMAGINE IT. WE HELP MAKE IT.</span>
        <span>PRINT · PERSONALISE · MAKE IT YOURS</span>
      </div>
      <LoopRibbon size={85} color="#274da6" className="hero-scribble" />
    </section>
  );
}
