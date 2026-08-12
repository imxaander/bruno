interface TurnIndicatorProps {
  myTurn: boolean;
}

export function TurnIndicator({ myTurn }: TurnIndicatorProps) {
  if (!myTurn) {
    return null;
  }
  return (
    <>
      <div className="your-turn-glow" aria-hidden />
      <div className="your-turn-banner">
        <span>YOUR TURN</span>
      </div>
    </>
  );
}
