import type { CSSProperties } from "react";
import { RANK_TIERS, type RankTier } from "@bruno/shared";
import { Button } from "../components/Button.js";
import { PageHeader } from "../components/PageHeader.js";

interface RanksProps {
  goHome: () => void;
  goHelp: () => void;
}

const FONT_DISPLAY = "'Barlow Condensed', sans-serif";
const FONT_UI = "'Rajdhani', sans-serif";

const RANK_COLOR: Record<string, string> = {
  Bronze: "#c98d5e",
  Silver: "#b9c4d8",
  Gold: "#ffcc00",
  Platinum: "#7ff0e0",
  Diamond: "#6fd9ff",
  Bruno: "#ffcc00",
};

const SCORING: Array<{
  label: string;
  value: string;
  unit: string;
  detail: string;
  color: string;
}> = [
  {
    label: "Winner",
    value: "+5",
    unit: "base · max +10",
    detail:
      "Plus +1 for every vault card you played during the round (capped so a win is worth up to +10).",
    color: "#ffcc00",
  },
  {
    label: "Best Loser",
    value: "+3",
    unit: "fewest cards left",
    detail: "The loser who got closest to emptying their hand still earns points.",
    color: "#37e66a",
  },
  {
    label: "Middle Pack",
    value: "+2 → −4",
    unit: "scaled by cards left",
    detail:
      "Everyone between the extremes scores between +2 and −4 — the closer to emptying your hand, the more you keep.",
    color: "#00eeff",
  },
  {
    label: "Worst Loser",
    value: "−5",
    unit: "most cards left",
    detail: "The player stuck with the most cards pays the biggest price.",
    color: "#ff5d5d",
  },
];

function formatRange(tier: RankTier): string {
  return tier.maxPoints === Infinity
    ? `${tier.minPoints}+`
    : `${tier.minPoints} – ${tier.maxPoints}`;
}

function Card({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        padding: "18px 22px",
        background: "rgba(11,11,18,0.92)",
        border: "1px solid rgba(0,238,255,0.1)",
        borderRadius: 12,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Ranks({ goHome, goHelp }: RanksProps) {
  const groups: Record<string, RankTier[]> = {};
  for (const tier of RANK_TIERS) {
    (groups[tier.rank] ??= []).push(tier);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at 50% 0%, rgba(0,238,255,0.06) 0%, rgba(9,9,16,0.5) 40%, #07070e 100%)",
        fontFamily: FONT_UI,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <PageHeader label="RANKS" />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "40px 24px 56px",
          gap: 32,
        }}
      >
        <div
          style={{
            maxWidth: 860,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 32,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                margin: 0,
                fontFamily: FONT_DISPLAY,
                fontWeight: 900,
                fontSize: "clamp(40px, 6vw, 64px)",
                color: "#00eeff",
                letterSpacing: "0.08em",
                textShadow: "0 0 28px rgba(0,238,255,0.6)",
                lineHeight: 1,
              }}
            >
              RANK SYSTEM
            </p>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 14,
                color: "rgba(200,216,240,0.55)",
                lineHeight: 1.6,
              }}
            >
              Every game you finish earns or costs rank points. Your rank is the total you've built
              up — win smart, climb the ladder.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {SCORING.map((s) => (
              <Card key={s.label}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.2em",
                    color: "rgba(0,238,255,0.55)",
                    textTransform: "uppercase",
                  }}
                >
                  {s.label}
                </p>
                <p
                  style={{
                    margin: "8px 0 2px",
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 900,
                    fontSize: 44,
                    lineHeight: 1,
                    color: s.color,
                    textShadow: `0 0 16px ${s.color}66`,
                  }}
                >
                  {s.value}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "rgba(200,216,240,0.4)",
                    letterSpacing: "0.08em",
                  }}
                >
                  {s.unit}
                </p>
                <p
                  style={{
                    margin: "10px 0 0",
                    fontSize: 12.5,
                    lineHeight: 1.55,
                    color: "rgba(200,216,240,0.55)",
                  }}
                >
                  {s.detail}
                </p>
              </Card>
            ))}
          </div>

          <Card style={{ background: "rgba(0,238,255,0.03)" }}>
            <p
              style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: "rgba(200,216,240,0.7)" }}
            >
              <span style={{ color: "#ffcc00", fontWeight: 700 }}>Guests score nothing.</span> Only
              players signed in with Google earn and keep rank points — sign in so every win counts
              toward your profile.
            </p>
          </Card>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p
              style={{
                margin: 0,
                fontFamily: FONT_DISPLAY,
                fontWeight: 800,
                fontSize: 26,
                letterSpacing: "0.1em",
                color: "#e8f0ff",
              }}
            >
              THE LADDER
            </p>
            {Object.entries(groups).map(([rank, tiers]) => (
              <Card key={rank} style={{ padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 26 }}>{tiers[0]?.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                      <span
                        style={{
                          fontFamily: FONT_DISPLAY,
                          fontWeight: 800,
                          fontSize: 20,
                          color: RANK_COLOR[rank] ?? "#c8d8f0",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {rank.toUpperCase()}
                      </span>
                      <span style={{ fontSize: 11, color: "rgba(200,216,240,0.38)" }}>
                        {tiers.length > 1 ? "3 tiers" : "top rank"}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                      {tiers.map((tier) => (
                        <span
                          key={tier.name}
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            padding: "4px 12px",
                            borderRadius: 999,
                            background: "rgba(0,238,255,0.07)",
                            border: "1px solid rgba(0,238,255,0.18)",
                            color: "rgba(210,225,248,0.85)",
                          }}
                        >
                          {tier.name} · {formatRange(tier)} pts
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.2em",
                color: "rgba(0,238,255,0.55)",
                textTransform: "uppercase",
              }}
            >
              Where you see it
            </p>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: 13.5,
                lineHeight: 1.7,
                color: "rgba(200,216,240,0.65)",
              }}
            >
              Your seat during a game shows your rank badge, your profile shows the full
              {`{icon} {Rank} {Tier} ({points} pts)`} format — like{" "}
              <span style={{ color: "#ffcc00" }}>🥇 Gold 2 (375 pts)</span> — and the round-over
              screen tells you exactly how many points you just won or lost.
            </p>
          </Card>

          <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
            <Button variant="cta" size="lg" onClick={goHelp}>
              HOW TO PLAY
            </Button>
            <Button variant="ghost" size="lg" onClick={goHome}>
              BACK TO HOME
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
