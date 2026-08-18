export interface CardBackTheme {
  background: string;
  border: string;
  boxShadow: string;
  backgroundImage?: string;
  backgroundSize?: string;
  innerBorder: string;
  innerShadow: string;
  letter: string;
  letterColor: string;
  letterShadow: string;
}

const hexBg =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='21'%3E%3Cpolygon points='12,1 23,7 23,15 12,20 1,15 1,7' fill='none' stroke='%2300eeff' stroke-width='0.55' stroke-opacity='0.28'/%3E%3C/svg%3E\")";

const diamondBg =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Crect x='10' y='0' width='10' height='10' fill='none' stroke='%23ffd040' stroke-width='0.4' stroke-opacity='0.22'/%3E%3Crect x='0' y='10' width='10' height='10' fill='none' stroke='%23ffd040' stroke-width='0.4' stroke-opacity='0.22'/%3E%3C/svg%3E\")";

const crossBg =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cline x1='8' y1='0' x2='8' y2='16' stroke='%23aa77ff' stroke-width='0.4' stroke-opacity='0.25'/%3E%3Cline x1='0' y1='8' x2='16' y2='8' stroke='%23aa77ff' stroke-width='0.4' stroke-opacity='0.25'/%3E%3C/svg%3E\")";

const dotBg =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12'%3E%3Ccircle cx='6' cy='6' r='1.2' fill='%23ffffff' fill-opacity='0.12'/%3E%3C/svg%3E\")";

export const CARD_BACK_THEMES: Record<string, CardBackTheme> = {
  "cb-default": {
    background: "#0a0e18",
    border: "1px solid rgba(0,238,255,0.55)",
    boxShadow:
      "0 0 0 1px rgba(0,238,255,0.18), 0 0 14px rgba(0,238,255,0.4), inset 0 0 18px rgba(0,238,255,0.06), 0 6px 18px rgba(0,0,0,0.88)",
    backgroundImage: hexBg,
    backgroundSize: "24px 21px",
    innerBorder: "1px solid rgba(0,238,255,0.22)",
    innerShadow: "inset 0 0 8px rgba(0,238,255,0.06)",
    letter: "B",
    letterColor: "#00eeff",
    letterShadow: "0 0 10px rgba(0,238,255,0.9), 0 0 24px rgba(0,238,255,0.5)",
  },
  "cb-neon": {
    background: "#060c14",
    border: "1px solid rgba(0,255,255,0.72)",
    boxShadow:
      "0 0 0 1px rgba(0,255,255,0.3), 0 0 20px rgba(0,255,255,0.6), 0 0 40px rgba(0,255,255,0.25), inset 0 0 20px rgba(0,255,255,0.08), 0 6px 18px rgba(0,0,0,0.88)",
    backgroundImage: hexBg,
    backgroundSize: "24px 21px",
    innerBorder: "1px solid rgba(0,255,255,0.3)",
    innerShadow: "inset 0 0 12px rgba(0,255,255,0.1)",
    letter: "B",
    letterColor: "#00ffff",
    letterShadow:
      "0 0 12px rgba(0,255,255,1), 0 0 28px rgba(0,255,255,0.6), 0 0 48px rgba(0,255,255,0.3)",
  },
  "cb-holo": {
    background:
      "linear-gradient(135deg, #1a0a2e 0%, #0a1a2e 25%, #0a2e1a 50%, #2e1a0a 75%, #1a0a2e 100%)",
    border: "1px solid rgba(255,255,255,0.45)",
    boxShadow:
      "0 0 18px rgba(180,100,255,0.5), 0 0 36px rgba(100,200,255,0.3), inset 0 0 20px rgba(255,255,255,0.06), 0 6px 18px rgba(0,0,0,0.88)",
    backgroundImage:
      "linear-gradient(135deg, rgba(255,0,128,0.08) 0%, rgba(0,255,128,0.08) 25%, rgba(0,128,255,0.08) 50%, rgba(255,128,0,0.08) 75%, rgba(255,0,128,0.08) 100%)",
    backgroundSize: "200% 200%",
    innerBorder: "1px solid rgba(255,255,255,0.15)",
    innerShadow: "inset 0 0 12px rgba(180,100,255,0.08)",
    letter: "B",
    letterColor: "#e8e0ff",
    letterShadow:
      "0 0 10px rgba(180,100,255,0.9), 0 0 24px rgba(100,200,255,0.5), 0 0 40px rgba(255,100,180,0.3)",
  },
  "cb-shadow": {
    background: "linear-gradient(175deg, #140828 0%, #0a0418 50%, #060210 100%)",
    border: "1px solid rgba(120,60,200,0.5)",
    boxShadow:
      "0 0 16px rgba(120,60,200,0.45), 0 0 32px rgba(80,20,160,0.25), inset 0 0 18px rgba(120,60,200,0.08), 0 6px 18px rgba(0,0,0,0.92)",
    backgroundImage: crossBg,
    backgroundSize: "16px 16px",
    innerBorder: "1px solid rgba(120,60,200,0.2)",
    innerShadow: "inset 0 0 10px rgba(120,60,200,0.1)",
    letter: "B",
    letterColor: "#c8a0ff",
    letterShadow: "0 0 10px rgba(120,60,200,0.9), 0 0 24px rgba(80,20,160,0.5)",
  },
  "cb-gold": {
    background: "linear-gradient(175deg, #2a1800 0%, #1a1000 30%, #3a2200 60%, #1a1000 100%)",
    border: "1px solid rgba(255,200,60,0.6)",
    boxShadow:
      "0 0 18px rgba(255,200,60,0.5), 0 0 36px rgba(255,160,0,0.25), inset 0 0 16px rgba(255,200,60,0.08), 0 6px 18px rgba(0,0,0,0.88)",
    backgroundImage: diamondBg,
    backgroundSize: "20px 20px",
    innerBorder: "1px solid rgba(255,200,60,0.25)",
    innerShadow: "inset 0 0 10px rgba(255,200,60,0.08)",
    letter: "B",
    letterColor: "#ffd866",
    letterShadow: "0 0 10px rgba(255,200,60,0.9), 0 0 24px rgba(255,160,0,0.5)",
  },
};

export const DEFAULT_CARD_BACK = "cb-default";
