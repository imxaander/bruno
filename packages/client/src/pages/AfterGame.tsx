import { Button } from "../components/Button.js";

interface AfterGameProps {
  goHome: () => void;
  goRooms: () => void;
}

export function AfterGame({ goHome, goRooms }: AfterGameProps) {
  return (
    <main className="page page-aftergame">
      <div className="winner-card panel">
        <h2>Winner</h2>
        <p>—</p>
      </div>
      <div className="after-actions">
        <Button variant="primary" onClick={goRooms}>
          Play Again
        </Button>
        <Button variant="secondary" onClick={goHome}>
          Leave
        </Button>
      </div>
    </main>
  );
}
