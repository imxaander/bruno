import { useCallback, useState } from "react";
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

  const goRooms = useCallback(() => setScreen("rooms"), []);
  const goHome = useCallback(() => setScreen("home"), []);
  const backToLobby = useCallback(() => setScreen("lobby"), []);
  const goLobby = useCallback((gameId: string, name: string) => {
    setRoomId(gameId);
    setRoomName(name);
    setScreen("lobby");
  }, []);
  const goGame = useCallback((gameId: string) => {
    setRoomId(gameId);
    setScreen("game");
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
        goRooms={goRooms}
        goGame={goGame}
      />
    );
  }
  if (screen === "game") {
    return <Game socket={socket} identity={identity} roomId={roomId} goLobby={backToLobby} />;
  }
  return <AfterGame goHome={goHome} goRooms={goRooms} />;
}
