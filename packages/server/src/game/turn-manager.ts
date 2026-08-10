export const TURN_DURATION_MS = 5000;

export type SetTimerFn = (callback: () => void, ms: number) => { cancel: () => void };

export function nodeSetTimer(callback: () => void, ms: number): { cancel: () => void } {
  const id = setTimeout(callback, ms);
  return { cancel: () => clearTimeout(id) };
}

export class TurnManager {
  private readonly timers = new Map<string, { cancel: () => void }>();

  constructor(
    private readonly durationMs: number = TURN_DURATION_MS,
    private readonly setTimer: SetTimerFn = nodeSetTimer,
  ) {}

  scheduleTurn(roomId: string, onTimeout: () => void): void {
    this.cancelTurn(roomId);
    const timer = this.setTimer(onTimeout, this.durationMs);
    this.timers.set(roomId, timer);
  }

  cancelTurn(roomId: string): void {
    this.timers.get(roomId)?.cancel();
    this.timers.delete(roomId);
  }

  cancelAll(): void {
    for (const roomId of [...this.timers.keys()]) {
      this.cancelTurn(roomId);
    }
  }
}
