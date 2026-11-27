import { FlowerYellow, SunBurst, LoopRibbon, FlowerRed } from "trazo-stickers";
export function PrintPoster({ kind = "labels" }: { kind?: string }) {
  if (kind === "race")
    return (
      <div className="poster-face poster-race">
        <span>THE SUNDAY RUN CLUB</span>
        <div className="race-mark">
          <i />
          <i />
          <i />
        </div>
        <strong>028</strong>
        <span>YOUR RACE. YOUR PACE.</span>
        <div className="poster-barcode" />
      </div>
    );
  if (kind === "mtb")
    return (
      <div className="poster-face poster-mtb">
        <span>TAKE THE LONG WAY HOME</span>
        <svg viewBox="0 0 260 290" aria-hidden="true">
          <circle cx="190" cy="70" r="38" fill="#f3d55e" />
          <path d="M0 240 110 65 260 255V290H0Z" fill="#dce7bc" />
          <path d="m110 65 38 60-34-10-19 14-21-5Z" fill="#fffaf0" />
          <path d="M0 260 190 150 260 224V290H0" fill="#456850" />
          <path
            d="m130 290 33-47-13-20 29-24"
            fill="none"
            stroke="#e9a867"
            strokeWidth="11"
          />
        </svg>
        <strong>137</strong>
        <span>OFF THE BEATEN TRACK</span>
      </div>
    );
  if (kind === "stamps")
    return (
      <div className="poster-face poster-stamp">
        <span>A PERSONAL TOUCH</span>
        <div className="stamp-imprint">
          <span>MADE WITH</span>
          <FlowerRed size={100} color="#b84935" />
          <strong>a little love.</strong>
          <span>EST. TODAY</span>
        </div>
        <span>LEAVE A GOOD IMPRESSION.</span>
      </div>
    );
  if (kind === "trophies")
    return (
      <div className="poster-face poster-award">
        <span>FOR THE ONES WHO GO FURTHER</span>
        <svg viewBox="0 0 260 290" aria-hidden="true">
          <path
            d="M70 55H190V130Q190 190 130 200Q70 190 70 130Z"
            fill="#c9d9df"
            stroke="#283441"
            strokeWidth="2"
          />
          <path
            d="M70 85H35V115Q35 155 80 158M190 85H225V115Q225 155 180 158"
            fill="none"
            stroke="#283441"
            strokeWidth="8"
          />
          <path d="M130 199V236M88 237H172" stroke="#283441" strokeWidth="8" />
          <path
            d="m130 81 11 25 28 3-21 18 6 28-24-14-24 14 6-28-21-18 28-3Z"
            fill="#f5bd42"
          />
        </svg>
        <strong>Well earned.</strong>
        <span>MAKE THE MOMENT LAST.</span>
      </div>
    );
  if (kind === "laser")
    return (
      <div className="poster-face poster-laser">
        <span>A LITTLE SOMETHING, JUST FOR YOU</span>
        <div className="laser-tag">
          <span className="tag-hole" />
          <LoopRibbon size={85} color="#583e24" />
          <strong>
            keep
            <br />
            growing.
          </strong>
          <small>ONE GOOD IDEA AT A TIME</small>
        </div>
        <span>THOUGHTFULLY CUT. MADE TO KEEP.</span>
      </div>
    );
  return (
    <div className="poster-face poster-labels">
      <span>PEEL. STICK. MAKE SOMEONE SMILE.</span>
      <div className="label-flower">
        <FlowerYellow size={125} color="#f3ba3f" />
      </div>
      <strong>
        GOOD
        <br />
        THINGS
        <br />
        <em>inside.</em>
      </strong>
      <div className="tiny-sun">
        <SunBurst size={60} color="#e85035" />
      </div>
      <span>YOUR BRAND, WITH A LITTLE MORE SOUL.</span>
    </div>
  );
}
export function CircleType({
  id = "circle",
  text = "IDEAS INTO THINGS · THINGS INTO JOY ·",
}: {
  id?: string;
  text?: string;
}) {
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true" className="circle-type">
      <defs>
        <path
          id={id}
          d="M100,100 m-76,0 a76,76 0 1,1 152,0 a76,76 0 1,1 -152,0"
        />
      </defs>
      <text>
        <textPath href={"#" + id} textLength="472">
          {text}
        </textPath>
      </text>
    </svg>
  );
}
