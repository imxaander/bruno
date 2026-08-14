export const TURN_DURATION_MS = 30_000;

export type SetTimerFn = (callback: () => void, ms: number) => { cancel: () => void };

export function nodeSetTimer(callback: () => void, ms: number): { cancel: () => void } {
  const id = setTimeout(callback, ms);
  return { cancel: () => clearTimeout(id) };
}

export class TurnManager {
  private readonly timers = new Map<
    string,
    { cancel: () => void; deadlineMs: number; durationMs: number }
  >();

  constructor(
    readonly durationMs: number = TURN_DURATION_MS,
    private readonly setTimer: SetTimerFn = nodeSetTimer,
  ) {}

  scheduleTurn(roomId: string, onTimeout: () => void): void {
    this.cancelTurn(roomId);
    const deadline = Date.now() + this.durationMs;
    const timer = this.setTimer(onTimeout, this.durationMs);
    this.timers.set(roomId, {
      cancel: timer.cancel,
      deadlineMs: deadline,
      durationMs: this.durationMs,
    });
  }

  cancelTurn(roomId: string): void {
    this.timers.get(roomId)?.cancel();
    this.timers.delete(roomId);
  }

  /** Store the remaining time and clear the timer. Returns the remaining ms or undefined. */
  pauseTurn(roomId: string): number | undefined {
    const entry = this.timers.get(roomId);
    if (!entry) {
      return undefined;
    }
    const remaining = Math.max(0, entry.deadlineMs - Date.now());
    entry.cancel();
    this.timers.delete(roomId);
    return remaining;
  }

  /** Restart the timer with the given remaining time. */
  resumeTurn(roomId: string, onTimeout: () => void, remainingMs: number): void {
    this.cancelTurn(roomId);
    if (remainingMs <= 0) {
      onTimeout();
      return;
    }
    const deadline = Date.now() + remainingMs;
    const timer = this.setTimer(onTimeout, remainingMs);
    this.timers.set(roomId, {
      cancel: timer.cancel,
      deadlineMs: deadline,
      durationMs: remainingMs,
    });
  }

  /** Returns remaining ms if a turn is active for this room. */
  getRemainingMs(roomId: string): number | undefined {
    const entry = this.timers.get(roomId);
    if (!entry) {
      return undefined;
    }
    return Math.max(0, entry.deadlineMs - Date.now());
  }

  cancelAll(): void {
    for (const roomId of [...this.timers.keys()]) {
      this.cancelTurn(roomId);
    }
  }
}
