import { useCallback, useEffect, useState } from "react";
import { createSocket, type BrunoSocket } from "./client.js";

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
  const [identity, setIdentity] = useState<PlayerIdentity>(readIdentity);

  useEffect(() => {
    const sock = createSocket();
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    sock.on("connect", onConnect);
    sock.on("disconnect", onDisconnect);
    sock.connect();
    setSocket(sock);
    return () => {
      sock.off("connect", onConnect);
      sock.off("disconnect", onDisconnect);
      sock.disconnect();
    };
  }, []);

  const saveIdentity = useCallback((name: string) => {
    const next: PlayerIdentity = { id: randomId("PID"), name };
    localStorage.setItem("bruno_player_info", JSON.stringify(next));
    setIdentity(next);
  }, []);

  return { socket, connected, identity, saveIdentity };
}
