import { useState, useCallback } from "react";
import type { PlayerProfile, RankTier } from "@bruno/shared";
import { updateProfileFields } from "../firebase/profiles.js";

const EMOJI_OPTIONS = [
  "🎮", "🎲", "🃏", "👑", "🔥", "💎", "⚡", "🌟",
  "🎯", "🏆", "🐉", "🦊", "🐺", "🦅", "🐙", "🍀",
  "🎭", "🛡️", "⚔️", "🧙", "🤖", "👾", "🎪", "🌈",
  "🍕", "🎸", "🚀", "💀", "👻", "🦄", "🐸", "🌸",
];

interface ProfileModalProps {
  profile: PlayerProfile;
  rank: RankTier;
  email: string | null;
  onClose: () => void;
}

export function ProfileModal({ profile, rank, email, onClose }: ProfileModalProps) {
  const [editing, setEditing] = useState(false);
  const [icon, setIcon] = useState(profile.icon);
  const [username, setUsername] = useState(profile.username);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    await updateProfileFields(profile.uid, { icon, username });
    setSaving(false);
    setEditing(false);
  }, [profile.uid, icon, username]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(6,6,16,0.88)",
        backdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 400,
          maxHeight: "80vh",
          background: "rgba(11,11,20,0.97)",
          border: "1px solid rgba(0,238,255,0.18)",
          borderRadius: 16,
          boxShadow: "0 0 48px rgba(0,238,255,0.12), 0 20px 60px rgba(0,0,0,0.8)",
          overflowY: "auto",
          fontFamily: "'Rajdhani', sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid rgba(0,238,255,0.08)",
          }}
        >
          <span
            style={{
              fontFamily: "'Barlow Condensed'",
              fontWeight: 800,
              fontSize: 18,
              color: "#00eeff",
              letterSpacing: "0.12em",
            }}
          >
            PROFILE
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(0,238,255,0.3)",
                  borderRadius: 6,
                  padding: "4px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "rgba(0,238,255,0.7)",
                  cursor: "pointer",
                  fontFamily: "'Rajdhani'",
                }}
              >
                EDIT
              </button>
            ) : null}
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                fontSize: 18,
                color: "rgba(200,216,240,0.5)",
                cursor: "pointer",
                padding: "0 4px",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Profile content */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Icon + Rank */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(0,238,255,0.15), rgba(255,0,204,0.15))",
                border: "2px solid rgba(0,238,255,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
              }}
            >
              {icon}
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'Barlow Condensed'",
                  fontWeight: 800,
                  fontSize: 20,
                  color: "#e8f0ff",
                }}
              >
                {username}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: 16 }}>{rank.icon}</span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "rgba(0,238,255,0.75)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {rank.name}
                </span>
                <span style={{ fontSize: 11, color: "rgba(200,216,240,0.4)" }}>
                  ({profile.points} pts)
                </span>
              </div>
            </div>
          </div>

          {/* Email */}
          {email ? (
            <div style={{ fontSize: 12, color: "rgba(200,216,240,0.4)" }}>
              {email}
            </div>
          ) : null}

          {/* Stats row */}
          <div
            style={{
              display: "flex",
              gap: 12,
              padding: "12px",
              background: "rgba(0,238,255,0.04)",
              borderRadius: 10,
            }}
          >
            {[
              { label: "Wins", value: profile.wins },
              { label: "Games", value: profile.gamesPlayed },
              { label: "Vaults", value: profile.vaultCardsUsed },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{ flex: 1, textAlign: "center" }}
              >
                <div
                  style={{
                    fontFamily: "'Barlow Condensed'",
                    fontWeight: 800,
                    fontSize: 20,
                    color: "#00eeff",
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "rgba(200,216,240,0.4)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Edit mode */}
          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Icon picker */}
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "rgba(0,238,255,0.55)",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    marginBottom: 6,
                    display: "block",
                  }}
                >
                  Icon
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(8, 1fr)",
                    gap: 4,
                  }}
                >
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setIcon(emoji)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 6,
                        border:
                          icon === emoji
                            ? "2px solid #00eeff"
                            : "1px solid rgba(255,255,255,0.08)",
                        background: icon === emoji ? "rgba(0,238,255,0.1)" : "transparent",
                        fontSize: 18,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Username input */}
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "rgba(0,238,255,0.55)",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    marginBottom: 6,
                    display: "block",
                  }}
                >
                  Username
                </label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={20}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "rgba(0,238,255,0.04)",
                    border: "1px solid rgba(0,238,255,0.22)",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontFamily: "'Rajdhani'",
                    fontWeight: 600,
                    fontSize: 16,
                    color: "#c8d8f0",
                    outline: "none",
                  }}
                />
              </div>

              {/* Save / Cancel */}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  onClick={() => {
                    setEditing(false);
                    setIcon(profile.icon);
                    setUsername(profile.username);
                  }}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(200,216,240,0.2)",
                    borderRadius: 6,
                    padding: "6px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "rgba(200,216,240,0.5)",
                    cursor: "pointer",
                    fontFamily: "'Rajdhani'",
                  }}
                >
                  CANCEL
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !username.trim()}
                  style={{
                    background: saving || !username.trim() ? "rgba(0,238,255,0.1)" : "rgba(0,238,255,0.2)",
                    border: "1px solid rgba(0,238,255,0.4)",
                    borderRadius: 6,
                    padding: "6px 16px",
                    fontSize: 13,
                    fontWeight: 700,
                    color: saving || !username.trim() ? "rgba(0,238,255,0.3)" : "#00eeff",
                    cursor: saving || !username.trim() ? "not-allowed" : "pointer",
                    fontFamily: "'Rajdhani'",
                  }}
                >
                  {saving ? "SAVING..." : "SAVE"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
