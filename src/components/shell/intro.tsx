/**
 * Launch intro: the Stakers mark builds (three rising steps), glows, the wordmark fades
 * in, then the overlay fades away (~1.4s). Pure CSS so it plays before any JS loads, and
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
            "try{if(sessionStorage.getItem('stakers.intro'))document.documentElement.classList.add('no-intro');else sessionStorage.setItem('stakers.intro','1')}catch(e){}",
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
            <rect className="intro-tile" width="64" height="64" rx="14" fill="url(#intro-g)" />
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
          <p className="intro-word">Stakers</p>
          <p className="intro-by">by Up The Stakes</p>
        </div>
      </div>
    </>
  );
}
