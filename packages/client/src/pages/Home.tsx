import { useEffect, useState, type CSSProperties } from "react";
import GameCard from "../components/GameCard.js";
import { Button } from "../components/Button.js";
import { UpdatesPanel, VaultGuide } from "../components/modals.js";
import { hasUnseenUpdates, markUpdatesSeen } from "../changelog.js";
import type { BrunoSocket } from "../socket/client.js";
import type { PlayerIdentity } from "../socket/useSocket.js";
import type { VaultGuideEntry } from "@bruno/shared";

interface HomeProps {
  identity: PlayerIdentity;
  socket: BrunoSocket | null;
  onPlay: (name: string) => void;
}

export function Home({ identity, socket, onPlay }: HomeProps) {
  const [name, setName] = useState(identity.name);
  const [focused, setFocused] = useState(false);
  const [vaultGuideOpen, setVaultGuideOpen] = useState(false);
  const [vaultCatalog, setVaultCatalog] = useState<VaultGuideEntry[] | null>(null);
  const [updatesOpen, setUpdatesOpen] = useState(hasUnseenUpdates);
  const canPlay = name.trim().length > 0;

  useEffect(() => {
    if (!socket) {
      return;
    }
    const onCatalog = (payload: { implemented: VaultGuideEntry[] }) =>
      setVaultCatalog(payload.implemented);
    socket.on("vault:catalog:return", onCatalog);
    return () => {
      socket.off("vault:catalog:return", onCatalog);
    };
  }, [socket]);

  const openVaultGuide = () => {
    if (!vaultCatalog && socket) {
      socket.emit("vault:catalog:get");
    }
    setVaultGuideOpen(true);
  };

  const closeUpdates = () => {
    markUpdatesSeen();
    setUpdatesOpen(false);
  };

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "radial-gradient(ellipse at 50% 25%, #0d0d1e 0%, #080812 45%, #060610 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Rajdhani', sans-serif",
      }}
    >
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0.045,
          pointerEvents: "none",
        }}
      >
        <defs>
          <pattern id="hex" x="0" y="0" width="64" height="55" patternUnits="userSpaceOnUse">
            <polygon
              points="32,2 62,18 62,46 32,53 2,46 2,18"
              fill="none"
              stroke="#00eeff"
              strokeWidth="0.7"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hex)" />
      </svg>

      <div
        style={{
          position: "absolute",
          top: "15%",
          left: "20%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,238,255,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "20%",
          right: "18%",
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,0,204,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={
          {
            position: "absolute",
            top: "12%",
            left: "6%",
            opacity: 0.18,
            animation: "card-float 7s ease-in-out infinite",
            "--r": "-22deg",
          } as CSSProperties
        }
      >
        <GameCard color="red" value="7" size="lg" />
      </div>
      <div
        style={
          {
            position: "absolute",
            top: "8%",
            right: "7%",
            opacity: 0.15,
            animation: "card-float 9s ease-in-out infinite 1.5s",
            "--r": "18deg",
          } as CSSProperties
        }
      >
        <GameCard color="blue" value="SKIP" size="md" />
      </div>
      <div
        style={
          {
            position: "absolute",
            bottom: "18%",
            left: "9%",
            opacity: 0.14,
            animation: "card-float 8s ease-in-out infinite 0.8s",
            "--r": "-12deg",
          } as CSSProperties
        }
      >
        <GameCard vault="gold" value="SURGE" size="md" />
      </div>
      <div
        style={
          {
            position: "absolute",
            bottom: "22%",
            right: "9%",
            opacity: 0.16,
            animation: "card-float 10s ease-in-out infinite 2s",
            "--r": "26deg",
          } as CSSProperties
        }
      >
        <GameCard color="green" value="4" size="lg" />
      </div>
      <div
        style={
          {
            position: "absolute",
            top: "55%",
            left: "3%",
            opacity: 0.1,
            animation: "card-float 11s ease-in-out infinite 0.3s",
            "--r": "8deg",
          } as CSSProperties
        }
      >
        <GameCard vault="diamond" value="ECHO" size="sm" />
      </div>
      <div
        style={
          {
            position: "absolute",
            top: "40%",
            right: "3%",
            opacity: 0.12,
            animation: "card-float 8.5s ease-in-out infinite 1.2s",
            "--r": "-30deg",
          } as CSSProperties
        }
      >
        <GameCard color="yellow" value="+2" size="sm" />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 36,
          position: "relative",
          zIndex: 10,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontFamily: "'Barlow Condensed'",
              fontWeight: 900,
              fontSize: "clamp(88px, 11vw, 152px)",
              color: "#00eeff",
              textShadow:
                "0 0 40px rgba(0,238,255,0.85), 0 0 88px rgba(0,238,255,0.4), 7px 7px 0 rgba(255,0,204,0.55)",
              letterSpacing: "0.06em",
              margin: 0,
              lineHeight: 0.88,
            }}
          >
            BRUNO
          </h1>
          <p
            style={{
              fontFamily: "'Rajdhani'",
              fontWeight: 500,
              fontSize: 15,
              color: "rgba(0,238,255,0.48)",
              letterSpacing: "0.36em",
              textTransform: "uppercase",
              margin: "14px 0 0",
              textAlign: "center",
            }}
          >
            GOONO. BUT WITH SUPERPOWERS.
          </p>
        </div>

        <div
          style={{
            width: 280,
            height: 1,
            background: "linear-gradient(90deg, transparent, rgba(0,238,255,0.3), transparent)",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 340 }}>
          <label
            style={{
              fontFamily: "'Rajdhani'",
              fontWeight: 600,
              fontSize: 11,
              letterSpacing: "0.24em",
              color: "rgba(0,238,255,0.55)",
              textTransform: "uppercase",
            }}
          >
            Player Handle
          </label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && canPlay) {
                onPlay(name.trim());
              }
            }}
            placeholder="Enter your handle..."
            style={{
              background: "rgba(0,238,255,0.04)",
              border: focused ? "1px solid #00eeff" : "1px solid rgba(0,238,255,0.22)",
              borderRadius: 8,
              padding: "14px 18px",
              fontFamily: "'Rajdhani'",
              fontWeight: 600,
              fontSize: 18,
              color: "#c8d8f0",
              outline: "none",
              width: "100%",
              boxShadow: focused ? "0 0 18px rgba(0,238,255,0.18)" : "none",
              transition: "border-color 0.18s, box-shadow 0.18s",
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        </div>

        <Button
          variant="primary"
          size="lg"
          disabled={!canPlay}
          onClick={() => onPlay(name.trim())}
          style={{ padding: "18px 90px", fontSize: 30, letterSpacing: "0.18em", borderRadius: 10 }}
        >
          PLAY
        </Button>

        <button
          onClick={openVaultGuide}
          style={{
            background: "transparent",
            border: "1px solid rgba(0,238,255,0.3)",
            borderRadius: 8,
            padding: "10px 28px",
            fontFamily: "'Rajdhani'",
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: "0.24em",
            color: "rgba(0,238,255,0.7)",
            cursor: "pointer",
            transition: "color 0.14s, border-color 0.14s, box-shadow 0.14s",
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.color = "#00eeff";
            event.currentTarget.style.borderColor = "rgba(0,238,255,0.7)";
            event.currentTarget.style.boxShadow = "0 0 20px rgba(0,238,255,0.25)";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.color = "rgba(0,238,255,0.7)";
            event.currentTarget.style.borderColor = "rgba(0,238,255,0.3)";
            event.currentTarget.style.boxShadow = "none";
          }}
        >
          {"\u25C8"} VAULT GUIDE
        </button>

        <button
          onClick={() => setUpdatesOpen(true)}
          style={{
            background: "transparent",
            border: "1px solid rgba(200,216,240,0.25)",
            borderRadius: 8,
            padding: "10px 28px",
            fontFamily: "'Rajdhani'",
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: "0.24em",
            color: "rgba(200,216,240,0.6)",
            cursor: "pointer",
            transition: "color 0.14s, border-color 0.14s, box-shadow 0.14s",
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.color = "#c8d8f0";
            event.currentTarget.style.borderColor = "rgba(200,216,240,0.6)";
            event.currentTarget.style.boxShadow = "0 0 20px rgba(200,216,240,0.2)";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.color = "rgba(200,216,240,0.6)";
            event.currentTarget.style.borderColor = "rgba(200,216,240,0.25)";
            event.currentTarget.style.boxShadow = "none";
          }}
        >
          {"\u2728"} WHAT'S NEW
        </button>

        <p
          style={{
            fontFamily: "'Rajdhani'",
            fontSize: 13,
            color: "rgba(200,216,240,0.28)",
            letterSpacing: "0.08em",
            margin: 0,
          }}
        >
          1 – 8 PLAYERS &nbsp;·&nbsp; REAL-TIME &nbsp;·&nbsp; VAULT POWERS
        </p>
      </div>
      {vaultGuideOpen && vaultCatalog ? (
        <VaultGuide entries={vaultCatalog} onClose={() => setVaultGuideOpen(false)} />
      ) : null}
      {updatesOpen ? <UpdatesPanel onClose={closeUpdates} /> : null}
    </div>
  );
}
