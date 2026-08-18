import { useCallback, useEffect, useState } from "react";
import type { PlayerProfile } from "@bruno/shared";
import { ALL_SHOP_ITEMS, type ShopItem } from "@bruno/shared";
import { Button } from "../components/Button.js";
import { PageHeader } from "../components/PageHeader.js";
import type { BrunoSocket } from "../socket/client.js";

interface ShopPageProps {
  socket: BrunoSocket;
  profile: PlayerProfile;
  goRooms: () => void;
  refreshProfile: () => void;
}

interface ConfirmState {
  item: ShopItem;
}

export function ShopPage({ socket, profile, goRooms, refreshProfile }: ShopPageProps) {
  const [category, setCategory] = useState<"all" | "card-back" | "background">("all");
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(
    () => new Set((profile.inventory ?? []).map((i) => i.id)),
  );
  const [equipped, setEquipped] = useState({
    cardBack: profile.equippedCardBack ?? "cb-default",
    background: profile.equippedBackground ?? "bg-default",
  });

  const filtered =
    category === "all" ? ALL_SHOP_ITEMS : ALL_SHOP_ITEMS.filter((i) => i.category === category);

  useEffect(() => {
    const onPurchaseOk = (payload: { itemId: string; coins: number }) => {
      setOwnedIds((prev) => new Set([...prev, payload.itemId]));
      setConfirm(null);
      void refreshProfile();
    };
    const onEquipOk = (payload: { equippedCardBack: string; equippedBackground: string }) => {
      setEquipped({ cardBack: payload.equippedCardBack, background: payload.equippedBackground });
      void refreshProfile();
    };
    const onErr = (payload: { message: string }) => {
      setError(payload.message);
      setConfirm(null);
    };
    socket.on("shop:purchase:ok", onPurchaseOk);
    socket.on("shop:equip:ok", onEquipOk);
    socket.on("error", onErr);
    return () => {
      socket.off("shop:purchase:ok", onPurchaseOk);
      socket.off("shop:equip:ok", onEquipOk);
      socket.off("error", onErr);
    };
  }, [socket, refreshProfile]);

  const handleBuy = useCallback(
    (itemId: string) => {
      setError(null);
      socket.emit("shop:buy", { itemId });
    },
    [socket],
  );

  const handleEquip = useCallback(
    (itemId: string) => {
      setError(null);
      socket.emit("shop:equip", { itemId });
    },
    [socket],
  );

  const coins = profile.coins ?? 0;

  return (
    <div
      style={{
        width: "100%",
        minHeight: "var(--bruno-vh)",
        background: "linear-gradient(160deg, #0a0a14 0%, #080810 60%, #080810 100%)",
        fontFamily: "'Rajdhani', sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <PageHeader label="Item Shop" onLogoClick={goRooms} />

      {error ? (
        <div
          style={{
            padding: "6px 28px",
            background: "rgba(255,0,204,0.08)",
            borderBottom: "1px solid rgba(255,0,204,0.25)",
          }}
        >
          <span style={{ fontSize: 12, color: "#ff00cc", fontWeight: 600 }}>{error}</span>
        </div>
      ) : null}

      <div
        style={{
          padding: "24px 48px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            background: "rgba(255,204,0,0.06)",
            borderRadius: 8,
            border: "1px solid rgba(255,204,0,0.2)",
          }}
        >
          <span style={{ fontSize: 18 }}>{"\u{1FA99}"}</span>
          <span
            style={{
              fontFamily: "'Barlow Condensed'",
              fontWeight: 900,
              fontSize: 22,
              color: "#ffcc00",
            }}
          >
            {coins}
          </span>
          <span style={{ fontSize: 12, color: "rgba(255,204,0,0.6)", fontWeight: 600 }}>coins</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 8 }}>
          {(["all", "card-back", "background"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                padding: "6px 16px",
                fontFamily: "'Rajdhani'",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                background: category === cat ? "rgba(0,238,255,0.12)" : "transparent",
                color: category === cat ? "#00eeff" : "rgba(200,216,240,0.4)",
                border:
                  category === cat
                    ? "1px solid rgba(0,238,255,0.35)"
                    : "1px solid rgba(0,238,255,0.1)",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              {cat === "all" ? "All" : cat === "card-back" ? "Card Backs" : "Backgrounds"}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          padding: "0 48px 48px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 16,
          alignContent: "start",
        }}
      >
        {filtered.map((item) => {
          const owned = ownedIds.has(item.id);
          const canAfford = coins >= item.cost;
          const isEquipped =
            (item.category === "card-back" && equipped.cardBack === item.id) ||
            (item.category === "background" && equipped.background === item.id);
          return (
            <div
              key={item.id}
              style={{
                background: "rgba(11,11,18,0.92)",
                border: isEquipped
                  ? "1px solid rgba(0,238,255,0.35)"
                  : owned
                    ? "1px solid rgba(55,230,106,0.2)"
                    : "1px solid rgba(0,238,255,0.08)",
                borderRadius: 12,
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: 80,
                  background: "rgba(0,238,255,0.04)",
                  borderRadius: 8,
                  fontSize: 40,
                }}
              >
                {item.preview}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "'Barlow Condensed'",
                    fontWeight: 800,
                    fontSize: 18,
                    color: "#c8d8f0",
                    letterSpacing: "0.04em",
                  }}
                >
                  {item.name}
                </div>
                <div style={{ fontSize: 12, color: "rgba(200,216,240,0.4)", marginTop: 2 }}>
                  {item.description}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {isEquipped ? (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#00eeff",
                      letterSpacing: "0.1em",
                    }}
                  >
                    EQUIPPED
                  </span>
                ) : owned ? (
                  <Button variant="outline" size="sm" onClick={() => handleEquip(item.id)}>
                    EQUIP
                  </Button>
                ) : (
                  <>
                    <span
                      style={{
                        fontFamily: "'Barlow Condensed'",
                        fontWeight: 900,
                        fontSize: 18,
                        color: canAfford ? "#ffcc00" : "rgba(255,204,0,0.4)",
                      }}
                    >
                      {item.cost}
                    </span>
                    <span style={{ fontSize: 11, color: "rgba(255,204,0,0.5)", fontWeight: 600 }}>
                      coins
                    </span>
                    <div style={{ flex: 1 }} />
                    <Button
                      variant={canAfford ? "cta" : "ghost"}
                      size="sm"
                      disabled={!canAfford}
                      onClick={() => setConfirm({ item })}
                    >
                      BUY
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {confirm ? (
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
          onClick={() => setConfirm(null)}
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
              gap: 18,
            }}
          >
            <h3
              style={{
                fontFamily: "'Barlow Condensed'",
                fontWeight: 900,
                fontSize: 26,
                color: "#ffcc00",
                margin: 0,
                letterSpacing: "0.06em",
              }}
            >
              CONFIRM PURCHASE
            </h3>
            <div style={{ fontSize: 40 }}>{confirm.item.preview}</div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: "'Barlow Condensed'",
                  fontWeight: 800,
                  fontSize: 20,
                  color: "#c8d8f0",
                }}
              >
                {confirm.item.name}
              </div>
              <div style={{ fontSize: 12, color: "rgba(200,216,240,0.4)", marginTop: 4 }}>
                {confirm.item.description}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 24,
                padding: "12px 24px",
                background: "rgba(255,204,0,0.04)",
                borderRadius: 8,
                width: "100%",
                justifyContent: "center",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(200,216,240,0.4)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  You have
                </div>
                <div
                  style={{
                    fontFamily: "'Barlow Condensed'",
                    fontWeight: 900,
                    fontSize: 22,
                    color: "#ffcc00",
                  }}
                >
                  {coins}
                </div>
              </div>
              <span style={{ fontSize: 20, color: "rgba(200,216,240,0.3)" }}>-</span>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(200,216,240,0.4)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  Cost
                </div>
                <div
                  style={{
                    fontFamily: "'Barlow Condensed'",
                    fontWeight: 900,
                    fontSize: 22,
                    color: "#ffcc00",
                  }}
                >
                  {confirm.item.cost}
                </div>
              </div>
              <span style={{ fontSize: 20, color: "rgba(200,216,240,0.3)" }}>=</span>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(200,216,240,0.4)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  Remaining
                </div>
                <div
                  style={{
                    fontFamily: "'Barlow Condensed'",
                    fontWeight: 900,
                    fontSize: 22,
                    color: coins - confirm.item.cost >= 0 ? "#37e66a" : "#ff5d5d",
                  }}
                >
                  {coins - confirm.item.cost}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, width: "100%" }}>
              <Button
                variant="ghost"
                size="md"
                style={{ flex: 1 }}
                onClick={() => setConfirm(null)}
              >
                CANCEL
              </Button>
              <Button
                variant="cta"
                size="md"
                style={{ flex: 1 }}
                disabled={coins < confirm.item.cost}
                onClick={() => handleBuy(confirm.item.id)}
              >
                BUY ({confirm.item.cost})
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
