import { useEffect, useRef } from "react";

interface EventHistoryProps {
  events: string[];
}

export function EventHistory({ events }: EventHistoryProps) {
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
      <p className="event-history-title">History</p>
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
    </aside>
  );
}
