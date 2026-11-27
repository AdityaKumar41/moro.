import { LandingPlayground } from "@/components/landing-playground";
import Link from "next/link";
import { FlowerYellow, SunBurst, LoopRibbon } from "trazo-stickers";
import { LandingHero } from "@/components/landing-experience";
import { ProductGrid } from "@/components/product-grid";
import { PrintPoster, CircleType } from "@/components/print-poster";
export default function Home() {
  return (
    <>
      <LandingHero />
      <section className="moro-intro moro-wrap">
        <div className="intro-label">
          <FlowerYellow size={60} color="#da583c" />
          <span>BIG ON THE LITTLE THINGS.</span>
        </div>
        <h2>
          Some ideas deserve
          <br />
          to <em>leave the screen.</em>
        </h2>
        <p>
          The label on your first batch. The number on your biggest race. A
          small thank-you, made just for them. We bring your ideas into the
          everyday—with print that feels personal.
        </p>
      </section>
      <section className="moro-collection moro-wrap" id="collection">
        <div className="moro-section-head">
          <div>
            <p className="moro-eyebrow">PICK YOUR CANVAS</p>
            <h2>What will you make?</h2>
          </div>
          <p>
            Six ways to start.
            <br />A thousand ways to make it yours.
          </p>
        </div>
        <ProductGrid />
      </section>
      <LandingPlayground />
      <section className="moro-story">
        <div className="moro-wrap story-grid">
          <div className="story-art">
            <div className="story-orbit" />
            <div className="story-poster">
              <PrintPoster kind="race" />
            </div>
            <div className="story-note">
              made for
              <br />
              <em>your moment.</em>
            </div>
            <div className="story-flower">
              <SunBurst size={105} color="#f0c542" />
            </div>
            <div className="story-small">
              <PrintPoster kind="labels" />
            </div>
          </div>
          <div className="story-copy">
            <p className="moro-eyebrow">YOUR IDEA HAS A PLACE HERE</p>
            <h2>
              From “what if”
              <br />
              to <em>“that’s the one.”</em>
            </h2>
            <p>
              A studio that gives you room to play. Choose your material, find
              the right size, add your artwork and see the price as you go.
            </p>
            <p>
              And before anything gets made? You get the final say on your
              artwork proof.
            </p>
            <Link href="/studio" className="moro-button light">
              Step into the studio
            </Link>
          </div>
        </div>
      </section>
      <section className="moro-process moro-wrap" id="how-it-works">
        <div className="moro-section-head">
          <h2>
            A good idea.
            <br />
            <em>A simple process.</em>
          </h2>
          <LoopRibbon size={105} color="#d95a40" />
        </div>
        <div className="process-columns">
          <article>
            <span className="process-drawing">
              <SunBurst size={60} color="#2f54b8" />
            </span>
            <h3>Find your thing.</h3>
            <p>
              Pick a product, a material and a size. See your price before you
              commit.
            </p>
          </article>
          <article>
            <span className="process-drawing">
              <FlowerYellow size={64} color="#de5a3e" />
            </span>
            <h3>Make it yours.</h3>
            <p>
              Bring your artwork or start in the studio. Personalise every piece
              with your own data.
            </p>
          </article>
          <article>
            <span className="process-drawing">
              <LoopRibbon size={64} color="#578162" />
            </span>
            <h3>Give it the nod.</h3>
            <p>
              Review your proof, ask for a change or approve it. Your approved
              version is what gets made.
            </p>
          </article>
        </div>
      </section>
      <section className="moro-inspiration moro-wrap">
        <div className="moro-section-head">
          <div>
            <p className="moro-eyebrow">A LITTLE CREATIVE NUDGE</p>
            <h2>
              Good things start
              <br />
              <em>somewhere.</em>
            </h2>
          </div>
          <Link href="/work" className="moro-text-link">
            Explore the inspiration wall
          </Link>
        </div>
        <div className="inspiration-pair">
          <Link
            href="/studio?product=labels"
            className="inspiration-piece peach"
          >
            <div className="inspiration-poster">
              <PrintPoster />
            </div>
            <span>A brand with a little more soul.</span>
            <small>LABELS & STICKERS · STUDIO CONCEPT</small>
          </Link>
          <Link href="/studio?product=laser" className="inspiration-piece blue">
            <div className="inspiration-poster">
              <PrintPoster kind="laser" />
            </div>
            <span>A small gesture. A lasting feeling.</span>
            <small>LASER-CUT WORK · STUDIO CONCEPT</small>
          </Link>
        </div>
      </section>
      <section className="moro-faq moro-wrap">
        <h2>
          A few things
          <br />
          <em>you might wonder.</em>
        </h2>
        <div>
          {[
            [
              "Can I bring my own artwork?",
              "Absolutely. Upload your finished PDF, SVG, AI or PNG artwork for preflight, or add your logo and text in the design studio.",
            ],
            [
              "Can every piece be different?",
              "Yes. Upload a CSV to personalise names, numbers and other text. You can preview every row before approving the proof.",
            ],
            [
              "Will I see it before it’s made?",
              "Yes. Your versioned artwork proof is the final checkpoint. You can request changes, and production files stay locked until payment and your approval.",
            ],
            [
              "Can I order the same design again?",
              "Your saved designs and approved artwork stay in your account. Reorder an approved design and review its current price before checkout.",
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="moro-last">
        <div className="moro-wrap">
          <div className="last-ring">
            <CircleType
              id="last-circle"
              text="MADE BY YOU · MADE FOR SOMEONE ·"
            />
            <FlowerYellow size={75} color="#d94f33" />
          </div>
          <p className="moro-eyebrow">THAT IDEA YOU’VE BEEN THINKING ABOUT?</p>
          <h2>
            Let’s make
            <br />
            <em>something of it.</em>
          </h2>
          <Link className="moro-button" href="/studio">
            Start making
          </Link>
        </div>
      </section>
    </>
  );
}
