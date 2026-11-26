/**
 * Shared (server + client) constants. Must NOT live in a "use client" module: the server
 * renders this string into an inline <script>, and a client module's exports are references
 * on the server, not values.
 */
const QUERY = "(prefers-reduced-motion: reduce)";

/** Inline, pre-paint script: sets <html data-motion> from the saved pref so CSS (and the intro) agree. */
export const MOTION_BOOT = `try{var p=(JSON.parse(localStorage.getItem('stakers.app.v1')||'{}').state||{}).prefs||{};var m=p.motion==='full'||p.motion==='gentle'?p.motion:(matchMedia('${QUERY}').matches?'gentle':'full');document.documentElement.dataset.motion=m}catch(e){document.documentElement.dataset.motion='full'}`;
