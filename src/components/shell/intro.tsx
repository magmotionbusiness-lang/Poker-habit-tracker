import { MOTION_BOOT } from "@/lib/motion/boot";

/**
 * Launch intro (~2.8s): the tile fades in out of a blur, three bars rise, a light sweeps
 * across, the wordmark fades in letter by letter, then everything dissolves into the app. Pure CSS so it plays before any JS loads, and
 * positioned like the iOS launch image (mark centred at 46% height) for a seamless hand-off.
 * Plays once per app launch (sessionStorage); never blocks taps (pointer-events: none).
 */
export function Intro() {
  return (
    <>
      <script
        // Runs before paint: skip the intro for in-app navigations within the same launch.
        dangerouslySetInnerHTML={{
          __html:
            MOTION_BOOT +
            ";try{var d=document.documentElement.dataset;if(sessionStorage.getItem('stakers.intro'))d.intro='skip';else{sessionStorage.setItem('stakers.intro','1');d.intro='play';setTimeout(function(){d.intro='done'},3100)}}catch(e){}",
        }}
      />
      <div id="intro" aria-hidden>
        <div className="intro-glow" />
        <div className="intro-stack">
          <svg className="intro-mark" viewBox="0 0 64 64">
            <defs>
              <linearGradient id="intro-g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7c5cff" />
                <stop offset="100%" stopColor="#4a2fd0" />
              </linearGradient>
            </defs>
            <clipPath id="intro-clip">
              <rect width="64" height="64" rx="14" />
            </clipPath>
            <rect className="intro-tile" width="64" height="64" rx="14" fill="url(#intro-g)" />
            <g clipPath="url(#intro-clip)">
              <rect
                className="intro-sweep"
                x="-40"
                y="-10"
                width="22"
                height="90"
                fill="#fff"
                fillOpacity="0.35"
                transform="rotate(20)"
              />
            </g>
            <rect
              className="intro-bar intro-bar-1"
              x="13"
              y="38"
              width="10"
              height="13"
              rx="3"
              fill="#fff"
              fillOpacity="0.55"
            />
            <rect
              className="intro-bar intro-bar-2"
              x="27"
              y="28"
              width="10"
              height="23"
              rx="3"
              fill="#fff"
              fillOpacity="0.8"
            />
            <rect
              className="intro-bar intro-bar-3"
              x="41"
              y="15"
              width="10"
              height="36"
              rx="3"
              fill="#fff"
            />
          </svg>
          <p className="intro-word" aria-label="Stakers">
            {"Stakers".split("").map((ch, i) => (
              <span key={i} style={{ animationDelay: `${1.05 + i * 0.07}s` }}>
                {ch}
              </span>
            ))}
          </p>
        </div>
      </div>
    </>
  );
}
