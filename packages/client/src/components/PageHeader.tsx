interface PageHeaderProps {
  label?: string;
}

export function PageHeader({ label }: PageHeaderProps) {
  return (
    <div
      style={{
        height: 56,
        display: "flex",
        alignItems: "center",
        padding: "0 28px",
        gap: 14,
        background: "rgba(8,8,14,0.98)",
        borderBottom: "1px solid rgba(0,238,255,0.1)",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontFamily: "'Barlow Condensed'",
          fontWeight: 900,
          fontSize: 26,
          color: "#00eeff",
          textShadow: "0 0 16px rgba(0,238,255,0.7)",
          letterSpacing: "0.06em",
        }}
      >
        BRUNO
      </span>
      {label ? (
        <>
          <span style={{ color: "rgba(200,216,240,0.28)", fontSize: 14 }}>/</span>
          <span style={{ color: "rgba(200,216,240,0.55)", fontSize: 14, fontWeight: 600 }}>
            {label}
          </span>
        </>
      ) : null}
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#00e676",
            boxShadow: "0 0 8px rgba(0,230,118,0.8)",
            animation: "neon-pulse 2s ease-in-out infinite",
          }}
        />
        <span
          style={{
            fontSize: 12,
            color: "rgba(0,230,118,0.8)",
            letterSpacing: "0.1em",
            fontWeight: 600,
          }}
        >
          LIVE
        </span>
      </div>
    </div>
  );
}
