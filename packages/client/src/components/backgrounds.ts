export interface BackgroundTheme {
  /** Full CSS background value for the page. */
  page: string;
  /** Radial gradient applied to the TableOval ellipse. */
  table: string;
}

export const BACKGROUND_THEMES: Record<string, BackgroundTheme> = {
  "bg-default": {
    page: "radial-gradient(ellipse at 50% 40%, #0c0c1a 0%, #080810 60%, #060610 100%)",
    table: "radial-gradient(ellipse at center, #0d0d1c 0%, #090914 100%)",
  },
  "bg-cosmic": {
    page: "radial-gradient(ellipse at 50% 40%, #0e0820 0%, #08041a 40%, #040210 70%, #020108 100%)",
    table: "radial-gradient(ellipse at center, #100828 0%, #080418 100%)",
  },
  "bg-underwater": {
    page: "radial-gradient(ellipse at 50% 40%, #041818 0%, #021010 50%, #010808 100%)",
    table: "radial-gradient(ellipse at center, #051e1e 0%, #031414 100%)",
  },
  "bg-volcanic": {
    page: "radial-gradient(ellipse at 50% 40%, #180808 0%, #100404 50%, #080202 100%)",
    table: "radial-gradient(ellipse at center, #1c0a0a 0%, #100606 100%)",
  },
  "bg-neon-city": {
    page: "radial-gradient(ellipse at 50% 40%, #100818 0%, #0a0414 40%, #06020c 70%, #030108 100%)",
    table: "radial-gradient(ellipse at center, #120a1c 0%, #0a0614 100%)",
  },
  "bg-aurora": {
    page: "radial-gradient(ellipse at 50% 40%, #08100c 0%, #040a08 50%, #020604 100%)",
    table: "radial-gradient(ellipse at center, #0a1410 0%, #060c08 100%)",
  },
};

export const DEFAULT_BACKGROUND = "bg-default";
