// The colours the graph is drawn in. One canvas renderer, two pages, two palettes: the app at /
// keeps the product's violet, and the dashboard at /home is black, white and grey like the rest of
// that page. Nothing about the drawing changes — only what it is drawn with — so a node means the
// same thing on both. The key beside the graph reads the same palette, or the two would disagree.

/** The eight inks a graph is drawn in, and the three that are also needed at part strength. */
export interface GraphPalette {
  /** The darkest ink: company outlines, a tier-A rim, the names that carry. */
  ink: string;
  inkA: (a: number) => string;
  /** What a node sits on, and the backing behind a name. */
  paper: string;
  paperA: (a: number) => string;
  /** The one accent: a reason to write, the founder, the way in. */
  accent: string;
  accentA: (a: number) => string;
  /** The accent washed out: job posts and competitors. */
  pale: string;
  /** A person. */
  person: string;
  /** A person on the outer ring of your net, with no way in yet. */
  far: string;
  /** The ink a name is set in. */
  label: string;
  /** The ink a ring's caption is set in. */
  caption: string;
}

/** #RRGGBB to `r,g,b`, so a colour can be given an alpha. */
const parts = (hex: string): string => {
  const n = parseInt(hex.replace("#", ""), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};

interface Spec {
  ink: string;
  paper: string;
  accent: string;
  pale: string;
  person: string;
  far: string;
  label: string;
  caption: string;
}

const build = (s: Spec): GraphPalette => {
  const ink = parts(s.ink);
  const paper = parts(s.paper);
  const accent = parts(s.accent);
  return {
    ...s,
    inkA: (a) => `rgba(${ink},${a})`,
    paperA: (a) => `rgba(${paper},${a})`,
    accentA: (a) => `rgba(${accent},${a})`,
  };
};

/** The app's own: the product's violet on white. */
export const VIOLET = build({
  ink: "#1B1640",
  paper: "#FFFFFF",
  accent: "#5A34D6",
  pale: "#CBC8F6",
  person: "#2E2863",
  far: "#7D79B3",
  label: "#3F3A6B",
  caption: "#6B6794",
});

/** The dashboard, light: the same drawing in the page's greys. */
export const SLATE = build({
  ink: "#18181B",
  paper: "#FFFFFF",
  accent: "#3F3F46",
  pale: "#D4D4D8",
  person: "#52525B",
  far: "#A1A1AA",
  label: "#3F3F46",
  caption: "#71717A",
});

/** The dashboard, dark. Paper goes to the card's own grey so nodes do not glare. */
export const SLATE_DARK = build({
  ink: "#FAFAFA",
  paper: "#2E2E33",
  accent: "#D4D4D8",
  pale: "#52525B",
  person: "#E4E4E7",
  far: "#8A8A94",
  label: "#F4F4F5",
  caption: "#B4B4BD",
});
