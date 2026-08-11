export const FAN_STEP = 62;
export const MIN_SPACING = 36;
export const FAN_MAX = 12;
export const ROW_MAX_TOTAL = 28;
export const CARD_W = 76;
export const CARD_H = 108;

export type HandLayout = { mode: "fan" | "rows" | "scroll" };

export function layoutMode(n: number): HandLayout {
  if (n > ROW_MAX_TOTAL) {
    return { mode: "scroll" };
  }
  if (n > FAN_MAX) {
    return { mode: "rows" };
  }
  return { mode: "fan" };
}

export function chunkHand<T>(items: T[]): T[][] {
  const n = items.length;
  const mode = layoutMode(n);
  if (mode.mode !== "rows") {
    return [items];
  }
  const first = Math.ceil(n / 2);
  return [items.slice(0, first), items.slice(first)];
}

export function fanMetrics(n: number, spacing = FAN_STEP) {
  const centerIdx = (n - 1) / 2;
  return {
    centerIdx,
    xOffset: (i: number) => (i - centerIdx) * spacing,
    angle: (i: number) => ((i - centerIdx) / Math.max(centerIdx, 1)) * 20,
    zIndex: (i: number) =>
      i === Math.round(centerIdx) ? 10 : 10 - Math.abs(i - Math.round(centerIdx)),
  };
}

export function scrollSpacing(n: number, maxWidth: number): number {
  return Math.max(MIN_SPACING, (maxWidth - CARD_W) / Math.max(n - 1, 1));
}
