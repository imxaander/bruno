import { useEffect, useState } from "react";
import { Button } from "./Button.js";
import type { BrunoSocket } from "../socket/client.js";

interface DailyRewardProps {
  socket: BrunoSocket;
  onClose: () => void;
}

export function DailyReward({ socket, onClose }: DailyRewardProps) {
  const [claimed, setClaimed] = useState(false);
  const [reward, setReward] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const onReturn = (payload: { reward: number; streak: number }) => {
      if (payload.reward === 0) {
        onClose();
        return;
      }
      setReward(payload.reward);
      setStreak(payload.streak);
      setClaimed(true);
    };
    socket.on("daily:claim:return", onReturn);
    socket.emit("daily:claim");
    return () => {
      socket.off("daily:claim:return", onReturn);
    };
  }, [socket]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2,4,8,0.88)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 380,
          background: "#0b0b12",
          border: "1px solid rgba(255,204,0,0.25)",
          borderRadius: 14,
          padding: "32px",
          boxShadow: "0 0 60px rgba(255,204,0,0.08), 0 24px 64px rgba(0,0,0,0.8)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(255,204,0,0.2), rgba(255,160,0,0.1))",
            border: "2px solid rgba(255,204,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
          }}
        >
          {claimed && reward > 0 ? "\u{1F381}" : "\u{2B50}"}
        </div>
        <h3
          style={{
            fontFamily: "'Barlow Condensed'",
            fontWeight: 900,
            fontSize: 28,
            color: "#ffcc00",
            margin: 0,
            letterSpacing: "0.06em",
            textShadow: "0 0 20px rgba(255,200,0,0.5)",
          }}
        >
          {claimed && reward > 0 ? "DAILY REWARD!" : "CHECKING..."}
        </h3>
        {claimed ? (
          <>
            {reward > 0 ? (
              <p
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#ffcc00",
                  letterSpacing: "0.06em",
                }}
              >
                +{reward} coins
              </p>
            ) : (
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "rgba(200,216,240,0.5)",
                  letterSpacing: "0.06em",
                }}
              >
                Come back tomorrow!
              </p>
            )}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 20px",
                background: "rgba(255,204,0,0.06)",
                borderRadius: 8,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "rgba(255,204,0,0.6)",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                Streak
              </span>
              <span
                style={{
                  fontFamily: "'Barlow Condensed'",
                  fontWeight: 900,
                  fontSize: 22,
                  color: "#ffcc00",
                }}
              >
                {streak}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: "rgba(200,216,240,0.4)",
                }}
              >
                days
              </span>
            </div>
          </>
        ) : (
          <div
            style={{
              width: 32,
              height: 32,
              border: "3px solid rgba(255,204,0,0.15)",
              borderTopColor: "#ffcc00",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
        )}
        {claimed ? (
          <Button variant="ghost" size="md" onClick={onClose}>
            CLOSE
          </Button>
        ) : null}
      </div>
    </div>
  );
}
