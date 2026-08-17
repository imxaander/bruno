import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameEndedPayload, LeaderboardEntry } from "@bruno/shared";
import {
  useSocket,
  type PlayerIdentity,
  readSavedGame,
  clearSavedGame,
} from "./socket/useSocket.js";
import { AuthProvider, useAuth } from "./firebase/AuthProvider.js";
import { ProfileModal } from "./firebase/ProfileModal.js";
import { LeaderboardModal } from "./components/modals.js";
import { AfterGame } from "./pages/AfterGame.js";
import { Game } from "./pages/Game.js";
import { Help } from "./pages/Help.js";
import { Home } from "./pages/Home.js";
import { Lobby } from "./pages/Lobby.js";
import { Ranks } from "./pages/Ranks.js";
import { Marie } from "./pages/Marie.js";
import { Rooms } from "./pages/Rooms.js";

type Screen = "home" | "rooms" | "lobby" | "game" | "aftergame" | "ranks" | "help" | "marie";

function AppContent() {
  const { socket, identity, saveIdentity, setRoomId: setSocketRoomId, reconnecting } = useSocket();
  const { profile, rank, user, profileError, displayName, guest, available, refreshProfile } =
    useAuth();
  const [screen, setScreen] = useState<Screen>(() => (readSavedGame() ? "game" : "home"));
  const [roomId, setRoomId] = useState<string | null>(() => readSavedGame());
  const [roomName, setRoomName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [ended, setEnded] = useState<GameEndedPayload | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const pendingRejoin = useRef(!!readSavedGame());

  useEffect(() => {
    if (!socket) {
      return;
    }
    const onLeaderboard = (payload: { players: LeaderboardEntry[] }) => {
      setLeaderboard(payload.players);
    };
    const onGameState = () => {
      pendingRejoin.current = false;
    };
    const onError = (payload: { code: string; message: string }) => {
      if (
        pendingRejoin.current &&
        screen === "game" &&
        (payload.code === "ROOM_NOT_FOUND" || payload.code === "NOT_IN_ROOM")
      ) {
        pendingRejoin.current = false;
        clearSavedGame();
        setRoomId(null);
        setSocketRoomId(null);
        setScreen("rooms");
      }
    };
    socket.on("leaderboard:return", onLeaderboard);
    socket.on("game:state", onGameState);
    socket.on("error", onError);
    return () => {
      socket.off("leaderboard:return", onLeaderboard);
      socket.off("game:state", onGameState);
      socket.off("error", onError);
    };
  }, [socket, screen, setSocketRoomId]);

  const isSignedIn = available && !!user && !guest;
  // Signed-in players are the Firebase uid + their profile username; guests keep
  // the locally stored guest handle. Never clobber the guest identity with the
  // signed-in name so it survives sign-out.
  const effectiveIdentity = useMemo<PlayerIdentity>(() => {
    if (isSignedIn) {
      return {
        id: user?.uid || identity.id,
        name: profile?.username || displayName || identity.name,
      };
    }
    return identity;
  }, [isSignedIn, user, profile, displayName, identity]);

  const goRooms = useCallback(() => {
    setEnded(null);
    clearSavedGame();
    setSocketRoomId(null);
    setScreen("rooms");
  }, [setSocketRoomId]);
  const goHome = useCallback(() => {
    setEnded(null);
    setScreen("home");
  }, []);
  const goRanks = useCallback(() => {
    setEnded(null);
    setScreen("ranks");
  }, []);
  const goHelp = useCallback(() => {
    setEnded(null);
    setScreen("help");
  }, []);
  const goMarie = useCallback(() => {
    setEnded(null);
    setScreen("marie");
  }, []);
  const goLobby = useCallback(
    (gameId: string, name: string, roomMaxPlayers = 8) => {
      setRoomId(gameId);
      setSocketRoomId(gameId);
      setRoomName(name);
      setMaxPlayers(roomMaxPlayers);
      setScreen("lobby");
    },
    [setSocketRoomId],
  );
  const goGame = useCallback(
    (gameId: string) => {
      setRoomId(gameId);
      setSocketRoomId(gameId);
      setScreen("game");
    },
    [setSocketRoomId],
  );
  const handleEnded = useCallback(
    (payload: GameEndedPayload) => {
      setEnded(payload);
      clearSavedGame();
      setSocketRoomId(null);
      setScreen("aftergame");
      void refreshProfile();
    },
    [setSocketRoomId, refreshProfile],
  );

  const handlePlay = useCallback(
    (name: string) => {
      if (!isSignedIn && name) {
        saveIdentity(name);
      }
      goRooms();
    },
    [isSignedIn, saveIdentity, goRooms],
  );

  const handleProfileClick = useCallback(() => {
    setProfileOpen(true);
  }, []);

  const openLeaderboard = useCallback(() => {
    setLeaderboard(null);
    setLeaderboardOpen(true);
    socket?.emit("leaderboard:get");
  }, [socket]);

  const content = (() => {
    if (screen === "home") {
      return (
        <Home
          identity={identity}
          socket={socket}
          saveIdentity={saveIdentity}
          onPlay={handlePlay}
          goRanks={goRanks}
          goHelp={goHelp}
          goMarie={goMarie}
        />
      );
    }
    if (screen === "ranks") {
      return <Ranks goHome={goHome} goHelp={goHelp} />;
    }
    if (screen === "help") {
      return <Help goHome={goHome} goRanks={goRanks} />;
    }
    if (screen === "marie") {
      return <Marie goHome={goHome} />;
    }
    if (screen === "rooms") {
      return (
        <Rooms
          socket={socket}
          identity={effectiveIdentity}
          goLobby={goLobby}
          goRanks={goRanks}
          goHelp={goHelp}
          profile={profile}
          rank={rank}
          email={user?.email ?? null}
          profileError={profileError}
          onEditProfile={handleProfileClick}
          onLeaderboard={openLeaderboard}
        />
      );
    }
    if (screen === "lobby") {
      return (
        <Lobby
          socket={socket}
          identity={effectiveIdentity}
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
          identity={effectiveIdentity}
          roomId={roomId}
          goLobby={goRooms}
          onEnded={handleEnded}
          reconnecting={reconnecting}
          onLeaderboard={openLeaderboard}
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
  })();

  return (
    <>
      {content}
      {profileOpen ? (
        <ProfileModal
          profile={profile}
          rank={rank}
          email={user?.email ?? null}
          error={profileError}
          onClose={() => setProfileOpen(false)}
          initialEdit
        />
      ) : null}
      {leaderboardOpen ? (
        <LeaderboardModal
          entries={leaderboard}
          myUid={user?.uid ?? null}
          onClose={() => setLeaderboardOpen(false)}
        />
      ) : null}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
