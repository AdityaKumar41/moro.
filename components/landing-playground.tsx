"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { FlowerYellow } from "trazo-stickers";
import { useCatalog } from "./catalog-provider";
import { defaultConfig, money } from "@/lib/catalog";
import { initialArtwork } from "@/lib/initial-artwork";
import { persistDraft } from "@/lib/studio-draft";
import { useAccount } from "./account-context";
const palettes = [
  ["#f1c84d", "#284c3b"],
  ["#f5b6a4", "#94311e"],
  ["#c4d5f6", "#223e91"],
  ["#e7e9d8", "#284c3b"],
];
export function LandingPlayground() {
  const catalog = useCatalog();
  const account = useAccount();
  const router = useRouter();
  const [product, setProduct] = useState("labels");
  const [words, setWords] = useState("GOOD THINGS");
  const [palette, setPalette] = useState(0);
  const [quantity, setQuantity] = useState(100);
  const [quote, setQuote] = useState<{
    total: number;
    currency: string;
  } | null>(null);
  const [error, setError] = useState("");
  const p = catalog.find((p) => p.id === product) || catalog[0];
  const config = { ...defaultConfig(p.id, catalog), quantity };
  const key = JSON.stringify(config);
  useEffect(() => {
    const c = new AbortController();
    setQuote(null);
    const timer = setTimeout(async () => {
      try {
        const r = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: key,
          signal: c.signal,
        });
        if (!r.ok) throw Error();
        const q = await r.json();
        if (!c.signal.aborted) {
          setQuote(q);
          setError("");
        }
      } catch {
        if (!c.signal.aborted)
          setError("Pricing is unavailable. You can still explore the studio.");
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [key]);
  function start() {
    const artwork = initialArtwork(p.id);
    artwork.name = words.trim() || "My next great idea";
    artwork.background = palettes[palette][0];
    artwork.layers = artwork.layers.map((l, i) => ({
      ...l,
      text: i === 0 ? words.trim() || "GOOD THINGS" : "MADE BY YOU.",
      color: palettes[palette][1],
    }));
    try {
      persistDraft(sessionStorage, {
        version: 1,
        updatedAt: Date.now(),
        ownerId: account.profile?.id || null,
        designId: crypto.randomUUID(),
        configuration: config,
        artwork,
        variableData: [],
      });
      router.push("/studio?product=" + p.id);
    } catch {
      setError("Allow browser storage to take this design into the studio.");
    }
  }
  return (
    <section
      className="moro-playground moro-wrap"
      aria-labelledby="playground-title"
    >
      <div className="playground-copy">
        <p className="moro-eyebrow">A LITTLE PLAY GOES A LONG WAY</p>
        <h2 id="playground-title">
          Try an idea.
          <br />
          <em>See where it goes.</em>
        </h2>
        <p>
          Start with a few words and your favourite colour. Your idea comes with
          you into the studio.
        </p>
        <label>
          Your words
          <input
            value={words}
            maxLength={24}
            onChange={(e) => setWords(e.target.value)}
          />
        </label>
        <div className="playground-fields">
          <label>
            Make it a
            <select value={p.id} onChange={(e) => setProduct(e.target.value)}>
              {catalog.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Pieces
            <select
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            >
              {[1, 25, 50, 100, 250, 500].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
        <fieldset>
          <legend>Find your colour</legend>
          <div className="playground-swatches">
            {palettes.map(([bg, fg], i) => (
              <button
                key={bg}
                style={{ background: bg, color: fg }}
                aria-label={["Sunflower", "Coral", "Blue", "Sage"][i]}
                aria-pressed={palette === i}
                onClick={() => setPalette(i)}
              >
                {palette === i ? "✓" : ""}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="playground-bottom">
          <button className="moro-button" onClick={start}>
            Make this yours <ArrowUpRight size={18} />
          </button>
          <span aria-live="polite">
            {quote
              ? money(quote.total, quote.currency) + " incl. GST"
              : error
                ? "Quote unavailable"
                : "Updating price…"}
          </span>
        </div>
        {error && <p role="status">{error}</p>}
        <small>
          Explore without signing in. Save to your account when you’re ready.
        </small>
      </div>
      <div
        className="playground-stage"
        style={{ background: palettes[palette][0] + "45" }}
      >
        <span className="playground-note">
          your idea,
          <br />
          <em>taking shape.</em>
        </span>
        <div
          className="playground-print"
          style={{
            background: palettes[palette][0],
            color: palettes[palette][1],
            aspectRatio: `${p.width}/${p.height}`,
          }}
        >
          <span>THE LITTLE DETAILS MATTER</span>
          <strong>{words || "YOUR WORDS"}</strong>
          <FlowerYellow size={70} color={palettes[palette][1]} />
          <b>MADE BY YOU.</b>
        </div>
        <span className="playground-spec">
          {p.width} × {p.height} mm · {p.material[0]}
        </span>
      </div>
    </section>
  );
}
