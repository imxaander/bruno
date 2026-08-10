import { useCallback, useState } from "react";
import type { GameEndedPayload } from "@bruno/shared";
import { useSocket } from "./socket/useSocket.js";
import { AfterGame } from "./pages/AfterGame.js";
import { Game } from "./pages/Game.js";
import { Home } from "./pages/Home.js";
import { Lobby } from "./pages/Lobby.js";
import { Rooms } from "./pages/Rooms.js";

type Screen = "home" | "rooms" | "lobby" | "game" | "aftergame";

export default function App() {
  const { socket, identity, saveIdentity } = useSocket();
  const [screen, setScreen] = useState<Screen>("home");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [ended, setEnded] = useState<GameEndedPayload | null>(null);

  const goRooms = useCallback(() => {
    setEnded(null);
    setScreen("rooms");
  }, []);
  const goHome = useCallback(() => {
    setEnded(null);
    setScreen("home");
  }, []);
  const backToLobby = useCallback(() => setScreen("lobby"), []);
  const goLobby = useCallback((gameId: string, name: string, roomMaxPlayers = 8) => {
    setRoomId(gameId);
    setRoomName(name);
    setMaxPlayers(roomMaxPlayers);
    setScreen("lobby");
  }, []);
  const goGame = useCallback((gameId: string) => {
    setRoomId(gameId);
    setScreen("game");
  }, []);
  const handleEnded = useCallback((payload: GameEndedPayload) => {
    setEnded(payload);
    setScreen("aftergame");
  }, []);

  const handlePlay = useCallback(
    (name: string) => {
      if (!identity.id && name) {
        saveIdentity(name);
      }
      goRooms();
    },
    [identity.id, saveIdentity, goRooms],
  );

  if (screen === "home") {
    return <Home identity={identity} onPlay={handlePlay} />;
  }
  if (screen === "rooms") {
    return <Rooms socket={socket} identity={identity} goLobby={goLobby} />;
  }
  if (screen === "lobby") {
    return (
      <Lobby
        socket={socket}
        identity={identity}
        roomId={roomId}
        roomName={roomName}
        maxPlayers={maxPlayers}
        goRooms={goRooms}
        goGame={goGame}
      />
    );
  }
  if (screen === "game") {
    return (
      <Game
        socket={socket}
        identity={identity}
        roomId={roomId}
        goLobby={backToLobby}
        onEnded={handleEnded}
      />
    );
  }
  return (
    <AfterGame
      winner={ended?.winner ?? null}
      players={ended?.players ?? []}
      reason={ended?.reason ?? "hand_emptied"}
      goHome={goHome}
      goRooms={goRooms}
    />
  );
}
