import { useEffect, useRef, useState } from "react";

interface EventHistoryProps {
  events: string[];
}

export function EventHistory({ events }: EventHistoryProps) {
  const [collapsed, setCollapsed] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [events.length]);

  const rows = events.slice().reverse();

  return (
    <aside className="event-history">
      <button
        className="event-history-header"
        onClick={() => setCollapsed((v) => !v)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span className="event-history-title">History</span>
        <span
          style={{
            fontSize: 10,
            color: "rgba(0,238,255,0.4)",
            transition: "transform 0.15s",
            transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
          }}
        >
          ▼
        </span>
      </button>
      {!collapsed ? (
        <div ref={listRef} className="event-history-list">
          {rows.length === 0 ? (
            <p className="event-history-empty">No events yet.</p>
          ) : (
            rows.map((line, index) => (
              <p key={index} className="event-history-line">
                {line}
              </p>
            ))
          )}
        </div>
      ) : null}
    </aside>
  );
}
