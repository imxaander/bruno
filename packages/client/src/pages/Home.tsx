import { useEffect, useState, type CSSProperties } from "react";
import GameCard from "../components/GameCard.js";
import { Button } from "../components/Button.js";
import { UpdatesPanel, VaultGuide } from "../components/modals.js";
import { hasUnseenUpdates, markUpdatesSeen } from "../changelog.js";
import { useAuth } from "../firebase/AuthProvider.js";
import type { BrunoSocket } from "../socket/client.js";
import type { PlayerIdentity } from "../socket/useSocket.js";
import type { VaultGuideEntry } from "@bruno/shared";

interface HomeProps {
  identity: PlayerIdentity;
  socket: BrunoSocket | null;
  saveIdentity: (name: string) => void;
  onPlay: (name: string) => void;
  goRanks: () => void;
  goHelp: () => void;
}

export function Home({ identity, socket, saveIdentity, onPlay, goRanks, goHelp }: HomeProps) {
  const {
    user,
    guest,
    loading,
    displayName: authDisplayName,
    profile,
    signInGoogle,
    firebaseSignOut,
    available,
  } = useAuth();
  const [inputName, setInputName] = useState(identity.name || authDisplayName);
  const [focused, setFocused] = useState(false);
  const [vaultGuideOpen, setVaultGuideOpen] = useState(false);
  const [vaultCatalog, setVaultCatalog] = useState<VaultGuideEntry[] | null>(null);
  const [updatesOpen, setUpdatesOpen] = useState(hasUnseenUpdates);

  // Signed-in users play as their profile username; guests use the editable handle.
  const signedInName = profile?.username || authDisplayName;
  const effectiveName = user && !guest ? signedInName : inputName;
  const canPlay = user && !guest ? true : effectiveName.trim().length > 0;

  const handlePlayClick = () => {
    const playName = (user && !guest ? signedInName : inputName).trim();
    if (!canPlay) return;
    if (!user || guest) {
      saveIdentity(playName);
    }
    onPlay(playName);
  };

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
        minHeight: "var(--bruno-vh)",
        background: "radial-gradient(ellipse at 50% 25%, #0d0d1e 0%, #080812 45%, #060610 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Rajdhani', sans-serif",
      }}
    >
      {/* Floating sample cards */}
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

        {/* Auth-aware play section */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 32,
                height: 32,
                border: "3px solid rgba(0,238,255,0.15)",
                borderTopColor: "#00eeff",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <span
              style={{
                fontFamily: "'Rajdhani'",
                fontWeight: 600,
                fontSize: 14,
                color: "rgba(0,238,255,0.55)",
                letterSpacing: "0.12em",
              }}
            >
              Connecting...
            </span>
          </div>
        ) : available && user && !guest ? (
          /* Google signed-in user */
          <>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                width: 340,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "rgba(0,238,255,0.04)",
                  border: "1px solid rgba(0,238,255,0.22)",
                  borderRadius: 8,
                  padding: "14px 18px",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #4285f4, #34a853)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "'Barlow Condensed'",
                    fontWeight: 700,
                    fontSize: 16,
                    color: "#fff",
                    flexShrink: 0,
                  }}
                >
                  G
                </div>
                <span
                  style={{
                    fontFamily: "'Rajdhani'",
                    fontWeight: 600,
                    fontSize: 18,
                    color: "#c8d8f0",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {signedInName}
                </span>
              </div>
            </div>
            <Button
              variant="primary"
              size="lg"
              disabled={false}
              onClick={handlePlayClick}
              style={{
                padding: "18px 90px",
                fontSize: 30,
                letterSpacing: "0.18em",
                borderRadius: 10,
              }}
            >
              PLAY
            </Button>
            <button
              onClick={firebaseSignOut}
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                fontFamily: "'Rajdhani'",
                fontWeight: 600,
                fontSize: 13,
                letterSpacing: "0.08em",
                color: "rgba(200,216,240,0.35)",
                cursor: "pointer",
                transition: "color 0.14s",
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.color = "rgba(255,80,80,0.7)";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.color = "rgba(200,216,240,0.35)";
              }}
            >
              Sign out
            </button>
          </>
        ) : available && guest ? (
          /* Guest user */
          <>
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
                Play as Guest
              </label>
              <input
                value={inputName}
                onChange={(event) => setInputName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && canPlay) {
                    handlePlayClick();
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
              onClick={handlePlayClick}
              style={{
                padding: "18px 90px",
                fontSize: 30,
                letterSpacing: "0.18em",
                borderRadius: 10,
              }}
            >
              PLAY
            </Button>
            <button
              onClick={signInGoogle}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                alignSelf: "center",
                background: "#fff",
                border: "1px solid rgba(0,238,255,0.25)",
                borderRadius: 8,
                padding: "10px 28px",
                fontFamily: "'Rajdhani'",
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: "0.12em",
                color: "#4285f4",
                cursor: "pointer",
                transition: "box-shadow 0.14s, transform 0.14s",
                boxShadow: "0 0 12px rgba(66,133,244,0.15)",
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.boxShadow = "0 0 24px rgba(66,133,244,0.35)";
                event.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.boxShadow = "0 0 12px rgba(66,133,244,0.15)";
                event.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "#4285f4",
                  color: "#fff",
                  fontFamily: "'Barlow Condensed'",
                  fontWeight: 900,
                  fontSize: 13,
                  lineHeight: 1,
                }}
              >
                G
              </span>
              Sign in with Google
            </button>
          </>
        ) : null}

        {/* Fallback when Firebase is not configured */}
        {!available ? (
          <>
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
                value={inputName}
                onChange={(event) => setInputName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && canPlay) {
                    handlePlayClick();
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
              onClick={handlePlayClick}
              style={{
                padding: "18px 90px",
                fontSize: 30,
                letterSpacing: "0.18em",
                borderRadius: 10,
              }}
            >
              PLAY
            </Button>
          </>
        ) : null}

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
          onClick={goRanks}
          style={{
            background: "transparent",
            border: "1px solid rgba(255,204,0,0.3)",
            borderRadius: 8,
            padding: "10px 28px",
            fontFamily: "'Rajdhani'",
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: "0.24em",
            color: "rgba(255,204,0,0.7)",
            cursor: "pointer",
            transition: "color 0.14s, border-color 0.14s, box-shadow 0.14s",
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.color = "#ffcc00";
            event.currentTarget.style.borderColor = "rgba(255,204,0,0.7)";
            event.currentTarget.style.boxShadow = "0 0 20px rgba(255,204,0,0.25)";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.color = "rgba(255,204,0,0.7)";
            event.currentTarget.style.borderColor = "rgba(255,204,0,0.3)";
            event.currentTarget.style.boxShadow = "none";
          }}
        >
          {"\u2726"} RANKS
        </button>

        <button
          onClick={goHelp}
          style={{
            background: "transparent",
            border: "1px solid rgba(255,0,204,0.3)",
            borderRadius: 8,
            padding: "10px 28px",
            fontFamily: "'Rajdhani'",
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: "0.24em",
            color: "rgba(255,0,204,0.7)",
            cursor: "pointer",
            transition: "color 0.14s, border-color 0.14s, box-shadow 0.14s",
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.color = "#ff00cc";
            event.currentTarget.style.borderColor = "rgba(255,0,204,0.7)";
            event.currentTarget.style.boxShadow = "0 0 20px rgba(255,0,204,0.25)";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.color = "rgba(255,0,204,0.7)";
            event.currentTarget.style.borderColor = "rgba(255,0,204,0.3)";
            event.currentTarget.style.boxShadow = "none";
          }}
        >
          {"\u25B6"} HOW TO PLAY
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
