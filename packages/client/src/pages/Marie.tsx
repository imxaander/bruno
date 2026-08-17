import { useCallback, useEffect, useState } from "react";

interface MarieProps {
  goHome: () => void;
}

const BALLOONS = [
  { emoji: "\uD83C\uDF80", color: "#ff6090", id: 0 },
  { emoji: "\uD83C\uDF88", color: "#ffb347", id: 1 },
  { emoji: "\uD83C\uDF8A", color: "#87eaff", id: 2 },
  { emoji: "\uD83C\uDF89", color: "#b3ff6b", id: 3 },
  { emoji: "\uD83C\uDF81", color: "#d4a0ff", id: 4 },
  { emoji: "\uD83E\uDDE7", color: "#ff80ab", id: 5 },
];

const CANDLES = [
  { color: "#ffcc00", id: 0 },
  { color: "#ff6090", id: 1 },
  { color: "#87eaff", id: 2 },
  { color: "#b3ff6b", id: 3 },
  { color: "#d4a0ff", id: 4 },
];

function ConfettiBurst({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDone, 2200);
    return () => clearTimeout(id);
  }, [onDone]);

  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.6,
    size: 6 + Math.random() * 8,
    color: ["#ffcc00", "#ff6090", "#87eaff", "#b3ff6b", "#d4a0ff", "#ff80ab", "#00eeff"][
      Math.floor(Math.random() * 7)
    ],
    rotation: Math.random() * 360,
    drift: (Math.random() - 0.5) * 120,
  }));

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 50 }}>
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: "-10px",
            width: p.size,
            height: p.size,
            borderRadius: Math.random() > 0.5 ? "50%" : 2,
            background: p.color,
            animation: `confetti-fall 2s ease-out ${p.delay}s forwards`,
            ["--drift" as string]: `${p.drift}px`,
            ["--rot" as string]: `${p.rotation}deg`,
          }}
        />
      ))}
    </div>
  );
}

function FloatingHeart({ x, delay }: { x: number; delay: number }) {
  return (
    <span
      style={{
        position: "fixed",
        left: `${x}%`,
        bottom: 0,
        fontSize: 22,
        pointerEvents: "none",
        animation: `float-up 2.5s ease-out ${delay}s forwards`,
        opacity: 0,
        zIndex: 40,
      }}
    >
      {"\u2764\uFE0F"}
    </span>
  );
}

export function Marie({ goHome }: MarieProps) {
  const [popped, setPopped] = useState<Set<number>>(new Set());
  const [candlesLit, setCandlesLit] = useState(true);
  const [candlesOut, setCandlesOut] = useState<Set<number>>(new Set());
  const [confetti, setConfetti] = useState(0);
  const [hearts, setHearts] = useState<Array<{ id: number; x: number; delay: number }>>([]);
  const [heartSeq, setHeartSeq] = useState(0);
  const [cakeClicked, setCakeClicked] = useState(false);

  const popBalloon = useCallback((id: number) => {
    setPopped((prev) => new Set(prev).add(id));
  }, []);

  const blowCandle = useCallback((id: number) => {
    setCandlesOut((prev) => new Set(prev).add(id));
  }, []);

  const blowAll = useCallback(() => {
    setCandlesLit(false);
    setTimeout(() => setCandlesLit(true), 2500);
    setCandlesOut(new Set());
  }, []);

  const triggerConfetti = useCallback(() => {
    setConfetti((n) => n + 1);
  }, []);

  const spawnHeart = useCallback(
    (e: React.MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const id = heartSeq;
      setHeartSeq((n) => n + 1);
      setHearts((prev) => [...prev, { id, x, delay: 0 }]);
      setTimeout(() => {
        setHearts((prev) => prev.filter((h) => h.id !== id));
      }, 3000);
    },
    [heartSeq],
  );

  return (
    <div
      onClick={spawnHeart}
      style={{
        width: "100%",
        minHeight: "var(--bruno-vh)",
        background: "radial-gradient(ellipse at 50% 20%, #1a0a28 0%, #0d0618 40%, #080812 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Rajdhani', sans-serif",
        overflow: "hidden",
        position: "relative",
        cursor: "pointer",
      }}
    >
      {/* Background stars */}
      {Array.from({ length: 20 }, (_, i) => (
        <span
          key={`star-${i}`}
          style={{
            position: "absolute",
            left: `${(i * 37 + 13) % 100}%`,
            top: `${(i * 29 + 7) % 100}%`,
            fontSize: 8 + (i % 4) * 3,
            opacity: 0.15 + (i % 3) * 0.1,
            animation: `twinkle ${2 + (i % 3)}s ease-in-out ${(i * 0.4) % 3}s infinite`,
            pointerEvents: "none",
          }}
        >
          {"\u2728"}
        </span>
      ))}

      {/* Floating hearts on click */}
      {hearts.map((h) => (
        <FloatingHeart key={h.id} x={h.x} delay={h.delay} />
      ))}

      {/* Confetti burst */}
      {Array.from({ length: confetti }, (_, i) => (
        <ConfettiBurst key={`burst-${i}`} onDone={() => {}} />
      ))}

      {/* Balloons row */}
      <div
        style={{
          display: "flex",
          gap: 18,
          marginBottom: 24,
          position: "relative",
          zIndex: 10,
        }}
      >
        {BALLOONS.map((b) => {
          const isPopped = popped.has(b.id);
          return (
            <button
              key={b.id}
              onClick={(e) => {
                e.stopPropagation();
                popBalloon(b.id);
              }}
              style={{
                fontSize: isPopped ? 10 : 42,
                background: "transparent",
                border: "none",
                cursor: isPopped ? "default" : "pointer",
                transition: "transform 0.2s, font-size 0.15s, opacity 0.3s",
                opacity: isPopped ? 0 : 1,
                transform: isPopped ? "scale(0.3)" : "scale(1)",
                filter: `drop-shadow(0 0 10px ${b.color}88)`,
                padding: "4px 2px",
              }}
              disabled={isPopped}
            >
              {b.emoji}
            </button>
          );
        })}
      </div>

      {/* Title */}
      <h1
        style={{
          fontFamily: "'Barlow Condensed'",
          fontWeight: 900,
          fontSize: "clamp(36px, 6vw, 64px)",
          margin: 0,
          lineHeight: 1,
          textAlign: "center",
          background: "linear-gradient(135deg, #ff6090, #ffcc00, #87eaff, #d4a0ff)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          textShadow: "none",
          position: "relative",
          zIndex: 10,
          letterSpacing: "0.04em",
        }}
      >
        HAPPY BIRTHDAY MARIE!
      </h1>

      {/* Cake */}
      <div
        style={{
          fontSize: 56,
          margin: "16px 0",
          position: "relative",
          zIndex: 10,
          cursor: "pointer",
        }}
        onClick={(e) => {
          e.stopPropagation();
          setCakeClicked(true);
          triggerConfetti();
          setTimeout(() => setCakeClicked(false), 400);
        }}
      >
        <span
          style={{
            display: "inline-block",
            transition: "transform 0.2s",
            transform: cakeClicked ? "scale(1.15) rotate(-5deg)" : "scale(1)",
          }}
        >
          {"\uD83C\uDF82"}
        </span>
      </div>

      {/* Candles */}
      <div
        style={{
          display: "flex",
          gap: 14,
          marginBottom: 20,
          position: "relative",
          zIndex: 10,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {CANDLES.map((c) => {
          const isOut = candlesOut.has(c.id) || !candlesLit;
          return (
            <button
              key={c.id}
              onClick={(e) => {
                e.stopPropagation();
                blowCandle(c.id);
              }}
              style={{
                width: 22,
                height: 36,
                borderRadius: "4px 4px 2px 2px",
                background: `linear-gradient(180deg, ${c.color}cc, ${c.color}66)`,
                border: `1px solid ${c.color}44`,
                cursor: "pointer",
                position: "relative",
                transition: "opacity 0.3s",
                opacity: isOut ? 0.3 : 1,
                padding: 0,
              }}
              title={isOut ? "Click to relight!" : "Blow me out!"}
            >
              {/* Flame */}
              <span
                style={{
                  position: "absolute",
                  top: -14,
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: 14,
                  transition: "opacity 0.3s, transform 0.3s",
                  opacity: isOut ? 0 : 1,
                  filter: isOut ? "none" : "drop-shadow(0 0 6px #ffcc00)",
                }}
              >
                {"\uD83D\uDD25"}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          blowAll();
        }}
        style={{
          background: "transparent",
          border: "1px solid rgba(255,204,0,0.4)",
          borderRadius: 8,
          padding: "7px 20px",
          fontFamily: "'Rajdhani'",
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: "0.16em",
          color: "rgba(255,204,0,0.7)",
          cursor: "pointer",
          marginBottom: 20,
          position: "relative",
          zIndex: 10,
          transition: "color 0.14s, border-color 0.14s, box-shadow 0.14s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#ffcc00";
          e.currentTarget.style.borderColor = "rgba(255,204,0,0.7)";
          e.currentTarget.style.boxShadow = "0 0 16px rgba(255,204,0,0.25)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "rgba(255,204,0,0.7)";
          e.currentTarget.style.borderColor = "rgba(255,204,0,0.4)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        {"\uD83C\uDF2C\uFE0F"} BLOW ALL CANDLES
      </button>

      {/* Message card */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 480,
          width: "90%",
          padding: "24px 28px",
          background: "rgba(16,10,30,0.85)",
          border: "1px solid rgba(255,96,144,0.3)",
          borderRadius: 14,
          boxShadow: "0 0 40px rgba(255,96,144,0.1), 0 16px 48px rgba(0,0,0,0.6)",
          position: "relative",
          zIndex: 10,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 16,
            lineHeight: 1.7,
            color: "rgba(255,230,240,0.92)",
            textAlign: "center",
          }}
        >
          happy birthday marie, i hope you enjoy your day today because it's ANA-DA DAY! we're
          missing you sa discord calls and gamez.... we wish to have u soon again ;). Always
          remember what makes you yourself, and more birthdays to come! See you around!, - ISO
        </p>
      </div>

      {/* Confetti button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          triggerConfetti();
        }}
        style={{
          marginTop: 20,
          background: "linear-gradient(135deg, rgba(255,96,144,0.2), rgba(135,234,255,0.2))",
          border: "1px solid rgba(255,96,144,0.4)",
          borderRadius: 8,
          padding: "10px 24px",
          fontFamily: "'Rajdhani'",
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: "0.2em",
          color: "#ff6090",
          cursor: "pointer",
          position: "relative",
          zIndex: 10,
          transition: "color 0.14s, border-color 0.14s, box-shadow 0.14s, transform 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#fff";
          e.currentTarget.style.borderColor = "rgba(255,96,144,0.8)";
          e.currentTarget.style.boxShadow = "0 0 24px rgba(255,96,144,0.4)";
          e.currentTarget.style.transform = "scale(1.04)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#ff6090";
          e.currentTarget.style.borderColor = "rgba(255,96,144,0.4)";
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        {"\uD83C\uDF8A"} CONFETTI!
      </button>

      {/* Click hint */}
      <p
        style={{
          marginTop: 14,
          fontSize: 12,
          color: "rgba(200,216,240,0.28)",
          letterSpacing: "0.1em",
          position: "relative",
          zIndex: 10,
        }}
      >
        click anywhere for hearts {"\u2764\uFE0F"}
      </p>

      {/* Back button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          goHome();
        }}
        style={{
          position: "fixed",
          top: 20,
          left: 20,
          background: "transparent",
          border: "1px solid rgba(200,216,240,0.25)",
          borderRadius: 6,
          padding: "6px 16px",
          fontFamily: "'Rajdhani'",
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: "0.14em",
          color: "rgba(200,216,240,0.5)",
          cursor: "pointer",
          zIndex: 60,
          transition: "color 0.14s, border-color 0.14s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#c8d8f0";
          e.currentTarget.style.borderColor = "rgba(200,216,240,0.5)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "rgba(200,216,240,0.5)";
          e.currentTarget.style.borderColor = "rgba(200,216,240,0.25)";
        }}
      >
        {"\u2190"} BACK
      </button>
    </div>
  );
}
