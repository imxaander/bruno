import type { CSSProperties } from "react";
import { Button } from "../components/Button.js";
import { PageHeader } from "../components/PageHeader.js";

interface HelpProps {
  goHome: () => void;
  goRanks: () => void;
  profileIcon?: string;
  profileRank?: string;
  onProfileClick?: () => void;
}

const FONT_DISPLAY = "'Barlow Condensed', sans-serif";
const FONT_UI = "'Rajdhani', sans-serif";

function Card({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        padding: "22px 24px",
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

function Section({
  n,
  title,
  tag,
  children,
}: {
  n: string;
  title: string;
  tag?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <span
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 900,
            fontSize: 30,
            color: "#00eeff",
            textShadow: "0 0 14px rgba(0,238,255,0.6)",
          }}
        >
          {n}
        </span>
        <h2
          style={{
            margin: 0,
            fontFamily: FONT_DISPLAY,
            fontWeight: 800,
            fontSize: 26,
            letterSpacing: "0.08em",
            color: "#e8f0ff",
          }}
        >
          {title.toUpperCase()}
        </h2>
        {tag ? (
          <span
            style={{
              marginLeft: "auto",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.16em",
              padding: "3px 10px",
              borderRadius: 999,
              background: "rgba(0,238,255,0.08)",
              border: "1px solid rgba(0,238,255,0.2)",
              color: "rgba(0,238,255,0.7)",
            }}
          >
            {tag}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.75, color: "rgba(200,216,240,0.68)" }}>
      {children}
    </p>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li
      style={{
        fontSize: 13.5,
        lineHeight: 1.65,
        color: "rgba(200,216,240,0.66)",
        marginBottom: 6,
      }}
    >
      {children}
    </li>
  );
}

const VAULT_TIERS = [
  {
    name: "Silver Vault",
    icon: "🥈",
    count: "5 in the deck",
    text: "reliable utility powers",
    color: "#c8d4ea",
  },
  {
    name: "Gold Vault",
    icon: "🥇",
    count: "3 in the deck",
    text: "bigger swings and stronger effects",
    color: "#ffd98a",
  },
  {
    name: "Diamond Vault",
    icon: "💎",
    count: "1 in the deck",
    text: "the rarest, most chaotic powers",
    color: "#9ff0ff",
  },
];

export function Help({ goHome, goRanks, profileIcon, profileRank, onProfileClick }: HelpProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at 50% 0%, rgba(255,0,204,0.05) 0%, rgba(9,9,16,0.5) 40%, #07070e 100%)",
        fontFamily: FONT_UI,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <PageHeader
        label="HOW TO PLAY"
        profileIcon={profileIcon}
        profileRank={profileRank}
        onProfileClick={onProfileClick}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "40px 24px 56px",
        }}
      >
        <div
          style={{
            maxWidth: 820,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 26,
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <p
              style={{
                margin: 0,
                fontFamily: FONT_DISPLAY,
                fontWeight: 900,
                fontSize: "clamp(40px, 6vw, 64px)",
                color: "#ff00cc",
                letterSpacing: "0.08em",
                textShadow: "0 0 28px rgba(255,0,204,0.5)",
                lineHeight: 1,
              }}
            >
              HOW TO PLAY
            </p>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 14,
                color: "rgba(200,216,240,0.55)",
                lineHeight: 1.6,
              }}
            >
              BRUNO is UNO with superpowers — get rid of your hand first, and use Vault cards,
              locations and chaos to wreck everyone else's plans.
            </p>
          </div>

          <Card>
            <Para>
              <span style={{ color: "#00eeff", fontWeight: 700 }}>1–8 players</span> ·{" "}
              <span style={{ color: "#00eeff", fontWeight: 700 }}>real-time</span> · turns are{" "}
              <span style={{ color: "#ffcc00", fontWeight: 700 }}>7 seconds</span> — if you don't
              act, the game picks for you.
            </Para>
          </Card>

          <Section n="01" title="The Goal">
            <Para>
              Be the{" "}
              <span style={{ color: "#ffcc00", fontWeight: 700 }}>
                first player to empty your hand
              </span>
              . Play a card that matches the pile's top card by{" "}
              <span style={{ color: "#00eeff", fontWeight: 700 }}>color</span> or{" "}
              <span style={{ color: "#00eeff", fontWeight: 700 }}>number/symbol</span>, or play a{" "}
              <span style={{ color: "#ffcc00", fontWeight: 700 }}>wild</span> card (+4 or a Vault
              token) that's always playable on your turn.
            </Para>
          </Section>

          <Section n="02" title="Setup">
            <ul style={{ margin: 0, paddingLeft: 22 }}>
              <Bullet>Everyone is dealt 8 cards.</Bullet>
              <Bullet>The deck is shuffled and a starting card is flipped onto the pile.</Bullet>
              <Bullet>
                A random player starts; a random location and each player's origin power are chosen.
              </Bullet>
            </ul>
          </Section>

          <Section n="03" title="Your Turn">
            <ul style={{ margin: 0, paddingLeft: 22 }}>
              <Bullet>
                Play a card matching the top of the pile by color or number — or a wild +4 / Vault
                token (unless a draw stack is pending).
              </Bullet>
              <Bullet>
                No playable card? <span style={{ color: "#37e66a", fontWeight: 700 }}>Draw 1</span>{" "}
                — drawing always ends your turn.
              </Bullet>
              <Bullet>
                The 7-second timer auto-draws for you if you stall; an open prompt gets a sensible
                default choice instead of stalling the game.
              </Bullet>
            </ul>
          </Section>

          <Section n="04" title="Special Cards">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { name: "SKIP", text: "Skips the next player — they lose their turn." },
                {
                  name: "REVERSE",
                  text: "Flips turn direction. With 2 players it acts like a skip.",
                },
                { name: "+2", text: "Forces the next player to draw 2. Stackable with other +2s." },
                {
                  name: "+4 (WILD)",
                  text: "Pick the active color and force the next player to draw 4.",
                },
              ].map((c) => (
                <Card key={c.name} style={{ padding: "14px 16px" }}>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: FONT_DISPLAY,
                      fontWeight: 800,
                      fontSize: 17,
                      letterSpacing: "0.08em",
                      color: "#ffcc00",
                    }}
                  >
                    {c.name}
                  </p>
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: 12.5,
                      lineHeight: 1.55,
                      color: "rgba(200,216,240,0.6)",
                    }}
                  >
                    {c.text}
                  </p>
                </Card>
              ))}
            </div>
          </Section>

          <Section n="05" title="Draw Stacking">
            <Para>
              While a <span style={{ color: "#ffaa00", fontWeight: 700 }}>draw stack</span> is
              pending (+2/+4), the next player must either{" "}
              <span style={{ color: "#ffaa00", fontWeight: 700 }}>add to the stack</span> with their
              own +2/+4, or <span style={{ color: "#37e66a", fontWeight: 700 }}>eat the stack</span>{" "}
              by drawing the whole total in one go. Once you eat it, the stack resets to zero.
            </Para>
          </Section>

          <Section n="06" title="Vault Tokens" tag="the superpowers">
            <Para>
              The deck holds{" "}
              <span style={{ color: "#c8d4ea", fontWeight: 700 }}>9 Vault tokens</span> — colorless
              wild cards playable any time it's your turn. Playing one offers you up to{" "}
              <span style={{ color: "#00eeff", fontWeight: 700 }}>
                3 random effects from that tier
              </span>
              ; pick exactly one and it resolves. The active color stays the same afterward.
            </Para>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {VAULT_TIERS.map((v) => (
                <Card key={v.name} style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 24 }}>{v.icon}</span>
                    <span
                      style={{
                        fontFamily: FONT_DISPLAY,
                        fontWeight: 800,
                        fontSize: 16,
                        letterSpacing: "0.04em",
                        color: v.color,
                      }}
                    >
                      {v.name}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      color: "rgba(200,216,240,0.4)",
                      textTransform: "uppercase",
                    }}
                  >
                    {v.count}
                  </p>
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: 12.5,
                      lineHeight: 1.5,
                      color: "rgba(200,216,240,0.6)",
                    }}
                  >
                    {v.text}
                  </p>
                </Card>
              ))}
            </div>
          </Section>

          <Section n="07" title="Locations">
            <Para>
              Every game takes place in a{" "}
              <span style={{ color: "#6fd9ff", fontWeight: 700 }}>location</span> that changes the
              rules for everyone — extra starting draws (Fields), a skipped player at the start
              (Desert), doubled Silver/Gold effects (Volcano), all vaults become Diamond (Abyssal
              Depths), and more. The active location is shown on the table.
            </Para>
          </Section>

          <Section n="08" title="Mayhem" tag="Hell Gate only">
            <Para>
              Under the <span style={{ color: "#c78cff", fontWeight: 700 }}>Hell Gate</span>{" "}
              location, a random{" "}
              <span style={{ color: "#ff3a6e", fontWeight: 700 }}>Mayhem event</span> hits every
              round — random +4s, skipped players, hand swaps, even slashing everyone down to a
              single card. No Hell Gate, no Mayhem.
            </Para>
          </Section>

          <Section n="09" title="Origins">
            <Para>
              Each player begins with an{" "}
              <span style={{ color: "#ffcc00", fontWeight: 700 }}>origin power</span>. The{" "}
              <span style={{ color: "#ffcc00", fontWeight: 700 }}>Vault Keeper</span> starts the
              game holding a Gold Vault — get a head start on the chaos.
            </Para>
          </Section>

          <Section n="10" title="Round End & Ranks">
            <Para>
              Emptying your hand wins the round. The round-over screen shows how many rank points
              each player earned or lost — winners score big, the closest loser still gains, and the
              worst hand pays the price. Points build your profile and climb the rank ladder.
            </Para>
            <div style={{ display: "flex", gap: 10 }}>
              <Button variant="outline" size="md" onClick={goRanks}>
                VIEW RANKS
              </Button>
              <Button variant="cta" size="md" onClick={goHome}>
                START PLAYING
              </Button>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
