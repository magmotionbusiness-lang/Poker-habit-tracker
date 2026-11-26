/**
 * App background, matching upthestakes.net: the site's dark base, a soft violet glow from
 * the top, two blurred violet glows (hero__glow) and its faint 56px grid fading out
 * (hero__grid). The glows breathe very slowly so the app never feels static.
 */
export function AmbientBackground() {
  return (
    <div aria-hidden className="ambient">
      <div className="ambient-top" />
      <div className="ambient-glow" />
      <div className="ambient-grid" />
      <div className="ambient-bottom" />
    </div>
  );
}
