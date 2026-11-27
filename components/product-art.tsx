export function ProductArt({
  kind = "label",
  className = "",
}: {
  kind?: string;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 500 350"
      role="img"
      aria-label={`${kind} design illustration`}
    >
      <defs>
        <filter
          id={`shadow-${kind}`}
          x="-40%"
          y="-40%"
          width="180%"
          height="180%"
        >
          <feDropShadow dx="0" dy="18" stdDeviation="12" floodOpacity=".14" />
        </filter>
        <pattern
          id={`grid-${kind}`}
          width="25"
          height="25"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M25 0H0V25"
            fill="none"
            stroke="currentColor"
            strokeOpacity=".08"
          />
        </pattern>
      </defs>
      <rect width="500" height="350" fill={`url(#grid-${kind})`} />
      <g filter={`url(#shadow-${kind})`}>
        {kind === "label" ? (
          <>
            <g transform="rotate(-15 240 170)">
              <rect
                x="85"
                y="52"
                width="230"
                height="230"
                rx="115"
                fill="#fcfcf4"
              />
              <circle cx="200" cy="167" r="93" fill="#bfe46b" />
              <path d="M138 168l37-47 32 32 28-18 32 55H133" fill="#223d27" />
              <text
                x="200"
                y="108"
                textAnchor="middle"
                fontSize="17"
                fontWeight="700"
                fill="#223d27"
                letterSpacing="3"
              >
                OFF THE GRID
              </text>
              <text
                x="200"
                y="219"
                textAnchor="middle"
                fontSize="13"
                fontWeight="700"
                fill="#223d27"
                letterSpacing="2"
              >
                GO FIND YOUR OUTSIDE
              </text>
            </g>
            <g transform="rotate(12 355 225)">
              <rect
                x="277"
                y="172"
                width="153"
                height="95"
                rx="9"
                fill="#ff6b42"
                stroke="#fff"
                strokeWidth="7"
              />
              <text
                x="353"
                y="212"
                textAnchor="middle"
                fill="#fff"
                fontSize="24"
                fontWeight="900"
              >
                GOOD
              </text>
              <text
                x="353"
                y="242"
                textAnchor="middle"
                fill="#fff"
                fontSize="24"
                fontWeight="900"
              >
                THINGS.
              </text>
            </g>
          </>
        ) : kind === "race" ? (
          <g transform="rotate(-8 250 175)">
            <rect
              x="80"
              y="65"
              width="340"
              height="220"
              rx="8"
              fill="#faf9f5"
            />
            <path d="M80 65h340v50H80z" fill="#ff6b42" />
            <text
              x="250"
              y="98"
              textAnchor="middle"
              fontSize="22"
              fontWeight="900"
              fill="#172722"
            >
              THE EXTRA MILE
            </text>
            <text
              x="250"
              y="226"
              textAnchor="middle"
              fontSize="120"
              fontWeight="900"
              fill="#172722"
            >
              028
            </text>
            <text
              x="250"
              y="263"
              textAnchor="middle"
              fontSize="14"
              letterSpacing="6"
              fill="#172722"
            >
              RUN YOUR OWN RACE
            </text>
          </g>
        ) : kind === "mtb" ? (
          <g transform="rotate(9 250 175)">
            <path d="M100 70h300l-30 210H130z" fill="#faf9f5" />
            <path d="M100 70h300l-7 48H107z" fill="#293d52" />
            <circle cx="125" cy="90" r="7" fill="#ddd" />
            <circle cx="375" cy="90" r="7" fill="#ddd" />
            <text
              x="250"
              y="102"
              textAnchor="middle"
              fontSize="20"
              fontWeight="900"
              fill="white"
            >
              DIRT / DISTANCE
            </text>
            <text
              x="250"
              y="235"
              textAnchor="middle"
              fontSize="118"
              fontWeight="900"
              fill="#293d52"
            >
              137
            </text>
            <path d="M160 255h180" stroke="#ff6b42" strokeWidth="8" />
          </g>
        ) : kind === "stamp" ? (
          <>
            <path d="M192 180v-55a58 58 0 01116 0v55" fill="#24382e" />
            <rect
              x="155"
              y="170"
              width="190"
              height="62"
              rx="12"
              fill="#3c5847"
            />
            <rect
              x="145"
              y="221"
              width="210"
              height="35"
              rx="6"
              fill="#192820"
            />
            <g transform="rotate(-12 365 120)">
              <rect
                x="297"
                y="58"
                width="130"
                height="100"
                rx="5"
                fill="none"
                stroke="#24382e"
                strokeWidth="4"
              />
              <text
                x="362"
                y="104"
                textAnchor="middle"
                fontSize="21"
                fontWeight="900"
              >
                MADE
              </text>
              <text
                x="362"
                y="133"
                textAnchor="middle"
                fontSize="21"
                fontWeight="900"
              >
                WITH CARE
              </text>
            </g>
          </>
        ) : kind === "trophy" ? (
          <>
            <path
              d="M250 42l98 183H152z"
              fill="#fdf4ce"
              stroke="#b89b55"
              strokeWidth="3"
            />
            <text
              x="250"
              y="181"
              textAnchor="middle"
              fontSize="23"
              fontWeight="900"
              fill="#76632e"
            >
              EXTRA
            </text>
            <text
              x="250"
              y="205"
              textAnchor="middle"
              fontSize="19"
              fill="#76632e"
            >
              ORDINARY
            </text>
            <rect
              x="147"
              y="225"
              width="206"
              height="43"
              rx="3"
              fill="#22342b"
            />
            <rect x="164" y="268" width="172" height="15" fill="#14221a" />
          </>
        ) : (
          <g transform="rotate(-8 250 175)">
            <rect
              x="100"
              y="65"
              width="300"
              height="220"
              rx="100"
              fill="#ad845c"
            />
            <rect
              x="114"
              y="79"
              width="272"
              height="192"
              rx="90"
              fill="none"
              stroke="#765535"
              strokeWidth="2"
            />
            <text
              x="250"
              y="163"
              textAnchor="middle"
              fontSize="34"
              fontWeight="900"
              fill="#372b21"
            >
              SLOW
            </text>
            <text
              x="250"
              y="203"
              textAnchor="middle"
              fontSize="34"
              fontWeight="900"
              fill="#372b21"
            >
              STUDIO
            </text>
            <circle cx="145" cy="175" r="6" fill="#775438" />
            <circle cx="355" cy="175" r="6" fill="#775438" />
          </g>
        )}
      </g>
    </svg>
  );
}
