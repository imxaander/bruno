import { useState } from "react";
import type { ActivePassive } from "@bruno/shared";

interface ActivePassivesProps {
  passives: ActivePassive[];
}

export function ActivePassives({ passives }: ActivePassivesProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (passives.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        background: "rgba(7,7,12,0.88)",
        backdropFilter: "blur(6px)",
        border: "1px solid rgba(0,238,255,0.15)",
        borderRadius: 12,
        padding: "10px 12px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      <div
        style={{
          fontFamily: "'Barlow Condensed'",
          fontWeight: 900,
          fontSize: 11,
          letterSpacing: "0.18em",
          color: "#00eeff",
          textShadow: "0 0 12px rgba(0,238,255,0.5)",
          marginBottom: 8,
          whiteSpace: "nowrap",
        }}
      >
        ACTIVE EFFECTS
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {passives.map((passive, index) => (
          <div
            key={`${passive.kind}-${passive.ownerId}`}
            style={{ position: "relative" }}
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                background: hovered === index ? "rgba(0,238,255,0.12)" : "rgba(11,11,18,0.9)",
                border: `1px solid ${hovered === index ? "#00eeff" : "rgba(0,238,255,0.25)"}`,
                boxShadow: hovered === index ? "0 0 12px rgba(0,238,255,0.35)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                cursor: "default",
                transition: "border-color 0.15s, box-shadow 0.15s, background 0.15s",
              }}
            >
              {passive.icon}
            </div>
            {hovered === index ? (
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 8px)",
                  right: 0,
                  background: "rgba(7,7,12,0.96)",
                  border: "1px solid rgba(0,238,255,0.2)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  maxWidth: 240,
                  minWidth: 170,
                  zIndex: 50,
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Barlow Condensed'",
                    fontWeight: 700,
                    fontSize: 13,
                    color: "#00eeff",
                    letterSpacing: "0.08em",
                    marginBottom: 4,
                    whiteSpace: "nowrap",
                  }}
                >
                  {passive.icon} {passive.name}
                </div>
                <div
                  style={{
                    fontFamily: "'Rajdhani'",
                    fontSize: 12,
                    lineHeight: "1.4",
                    color: "rgba(200,216,240,0.85)",
                    marginBottom: 6,
                  }}
                >
                  {passive.description}
                </div>
                <div
                  style={{
                    fontFamily: "'Rajdhani'",
                    fontSize: 11,
                    color: "rgba(0,238,255,0.6)",
                    borderTop: "1px solid rgba(0,238,255,0.1)",
                    paddingTop: 5,
                  }}
                >
                  by {passive.ownerName}
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
