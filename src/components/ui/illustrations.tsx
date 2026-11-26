/**
 * Small brand illustrations for empty states (inline SVG, no assets). Violet on
 * near-black, a little glow — friendly, not clip-art.
 */
const glow = (
  <radialGradient id="ill-glow" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stopColor="#7c5cff" stopOpacity="0.45" />
    <stop offset="100%" stopColor="#7c5cff" stopOpacity="0" />
  </radialGradient>
);

export function CardsArt() {
  return (
    <svg width="132" height="104" viewBox="0 0 132 104" aria-hidden>
      <defs>{glow}</defs>
      <ellipse cx="66" cy="56" rx="62" ry="46" fill="url(#ill-glow)" />
      <g transform="rotate(-12 50 56)">
        <rect x="26" y="16" width="48" height="68" rx="8" fill="#f6f6fa" />
        <text x="38" y="44" fontFamily="system-ui" fontWeight="700" fontSize="20" fill="#16161f">
          A
        </text>
        <text x="38" y="66" fontSize="18" fill="#16161f">
          ♠
        </text>
      </g>
      <g transform="rotate(10 84 56)" className="pop-in" style={{ animationDelay: "120ms" }}>
        <rect x="58" y="16" width="48" height="68" rx="8" fill="#f6f6fa" />
        <text x="70" y="44" fontFamily="system-ui" fontWeight="700" fontSize="20" fill="#d6323a">
          K
        </text>
        <text x="70" y="66" fontSize="18" fill="#d6323a">
          ♥
        </text>
      </g>
      <circle cx="112" cy="18" r="3" fill="#c5b6ff" />
      <circle cx="18" cy="84" r="2" fill="#a892ff" />
    </svg>
  );
}

export function ChartArt() {
  return (
    <svg width="140" height="100" viewBox="0 0 140 100" aria-hidden>
      <defs>
        {glow}
        <linearGradient id="ill-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c5cff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#7c5cff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <ellipse cx="70" cy="55" rx="66" ry="44" fill="url(#ill-glow)" />
      <path
        d="M10 80 L38 64 L60 70 L86 44 L108 50 L130 22 L130 92 L10 92 Z"
        fill="url(#ill-area)"
      />
      <path
        d="M10 80 L38 64 L60 70 L86 44 L108 50 L130 22"
        fill="none"
        stroke="#a892ff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="130" cy="22" r="5" fill="#c5b6ff" stroke="#10101b" strokeWidth="2" />
      {[10, 38, 60, 86, 108].map((x, i) => (
        <rect
          key={x}
          x={x - 3}
          y={92 - (i + 1) * 6}
          width="6"
          height={(i + 1) * 6}
          rx="2"
          fill="#2a2257"
        />
      ))}
    </svg>
  );
}

export function BookArt() {
  return (
    <svg width="128" height="100" viewBox="0 0 128 100" aria-hidden>
      <defs>{glow}</defs>
      <ellipse cx="64" cy="54" rx="60" ry="44" fill="url(#ill-glow)" />
      <path
        d="M64 30 C50 22 30 22 18 26 L18 80 C30 76 50 76 64 84 Z"
        fill="#1e1941"
        stroke="#a892ff"
        strokeWidth="2"
      />
      <path
        d="M64 30 C78 22 98 22 110 26 L110 80 C98 76 78 76 64 84 Z"
        fill="#231c4d"
        stroke="#a892ff"
        strokeWidth="2"
      />
      {[38, 46, 54].map((y) => (
        <line
          key={y}
          x1="74"
          y1={y}
          x2="100"
          y2={y - 2}
          stroke="#7c5cff"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ))}
      <path d="M96 10 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" fill="#c5b6ff" />
    </svg>
  );
}
