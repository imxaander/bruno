import { useState } from "react";
import { Button } from "../components/Button.js";
import type { PlayerIdentity } from "../socket/useSocket.js";

interface HomeProps {
  identity: PlayerIdentity;
  onPlay: (name: string) => void;
}

export function Home({ identity, onPlay }: HomeProps) {
  const [name, setName] = useState(identity.name);
  const canPlay = name.trim().length > 0;

  return (
    <main className="page page-home">
      <div className="home-hero">
        <h1 className="wordmark">BRUNO</h1>
        <p className="tagline">goono, but with superpowers</p>
      </div>
      <div className="home-form">
        <label htmlFor="player-name">Player Name</label>
        <input
          id="player-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Player Name..."
        />
        <Button variant="primary" size="lg" disabled={!canPlay} onClick={() => onPlay(name.trim())}>
          PLAY
        </Button>
      </div>
    </main>
  );
}
