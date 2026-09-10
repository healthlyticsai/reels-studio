/**
 * Design tokens, read from brand.json so the same component kit can dress a
 * different product without touching component code. Swap src/brand.json (and
 * public/logo/*) and every scene re-skins.
 */
import brand from "./brand.json";

export const BRAND = brand;

export const COLORS = brand.colors;

export const GRADIENT = brand.gradient.horizontal;
export const GRADIENT_DIAG = brand.gradient.diagonal;
export const GRADIENT_TEXT = brand.gradient.text;
export const SPLASH_GLOW = brand.glow;

export const FONT_STACK = `${brand.font.family}, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`;

/** Card surface used throughout the collage. */
export const cardSurface = (radius = 28) => ({
  background: COLORS.white,
  borderRadius: radius,
  border: `2px solid ${COLORS.slate200}`,
  boxShadow: "0 30px 70px rgba(15,23,42,0.14), 0 4px 12px rgba(15,23,42,0.06)",
});

/**
 * Spring presets. Four useful characters rather than a dial: `punch` for words
 * and pills, `card` for panels entering, `snap` for small confident pops, and
 * `soft` for slow settles.
 */
export const SPRING = {
  punch: { damping: 12, stiffness: 120, mass: 0.6 },
  card: { damping: 14, stiffness: 90, mass: 0.9 },
  snap: { damping: 18, stiffness: 220, mass: 0.5 },
  soft: { damping: 200 },
} as const;
