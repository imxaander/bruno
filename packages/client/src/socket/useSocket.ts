import { useCallback, useEffect, useRef, useState } from "react";
import { createSocket, type BrunoSocket } from "./client.js";
import { auth } from "../firebase/client.js";

export interface PlayerIdentity {
  id: string;
  name: string;
}

function randomId(prefix: string): string {
  return prefix + Math.random().toString(36).replace("0.", "");
}

function readIdentity(): PlayerIdentity {
  try {
    const raw = localStorage.getItem("bruno_player_info");
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PlayerIdentity>;
      if (parsed && typeof parsed.id === "string" && typeof parsed.name === "string") {
        return { id: parsed.id, name: parsed.name };
      }
    }
  } catch {
    // corrupt stored identity; start fresh
  }
  return { id: "", name: "" };
}

export function useSocket() {
  const [socket, setSocket] = useState<BrunoSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [identity, setIdentity] = useState<PlayerIdentity>(readIdentity);
  const roomIdRef = useRef<string | null>(null);

  useEffect(() => {
    const sock = createSocket({ autoConnect: false });
    const onConnect = () => {
      setConnected(true);
      setReconnecting(false);
      // If we're in a game, rejoin after reconnection.
      const rid = roomIdRef.current;
      const id = readIdentity().id;
      if (rid && id) {
        sock.emit("game:rejoin", { gameId: rid, playerId: id });
        sock.emit("game:state:get", { gameId: rid, playerId: id });
      }
    };
    const onDisconnect = (reason: string) => {
      setConnected(false);
      setReconnecting(reason === "transport close" || reason === "transport error");
    };
    const onReconnectAttempt = async () => {
      setReconnecting(true);
      // Re-attach Firebase token on reconnect
      if (auth?.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          sock.auth = { token };
        } catch {
          // Token fetch failed — reconnect without auth
        }
      }
    };
    sock.on("connect", onConnect);
    sock.on("disconnect", onDisconnect);
    sock.io.on("reconnect_attempt", onReconnectAttempt);
    // Attach Firebase token before connecting
    (async () => {
      if (auth?.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          sock.auth = { token };
        } catch {
          // Token fetch failed — connect without auth
        }
      }
      sock.connect();
    })();
    setSocket(sock);
    return () => {
      sock.off("connect", onConnect);
      sock.off("disconnect", onDisconnect);
      sock.io.off("reconnect_attempt", onReconnectAttempt);
      sock.disconnect();
    };
  }, []);

  const saveIdentity = useCallback((name: string) => {
    const next: PlayerIdentity = { id: randomId("PID"), name };
    localStorage.setItem("bruno_player_info", JSON.stringify(next));
    setIdentity(next);
  }, []);

  const setRoomId = useCallback((id: string | null) => {
    roomIdRef.current = id;
  }, []);

  const rejoin = useCallback(() => {
    const rid = roomIdRef.current;
    const id = identity.id;
    if (rid && id && socket) {
      socket.emit("game:rejoin", { gameId: rid, playerId: id });
      socket.emit("game:state:get", { gameId: rid, playerId: id });
    }
  }, [socket, identity.id]);

  return { socket, connected, reconnecting, identity, saveIdentity, setRoomId, rejoin };
}
