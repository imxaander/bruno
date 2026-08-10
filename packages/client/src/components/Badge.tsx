export type BadgeTone = "host" | "member" | "count" | "default";

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
}

export function Badge({ label, tone = "default" }: BadgeProps) {
  return <span className={`badge badge-${tone}`}>{label}</span>;
}

export type StatusType = "open" | "in-game" | "full";

const STATUS_COLOR: Record<StatusType, string> = {
  open: "rgba(0,230,118,0.8)",
  "in-game": "#ffaa00",
  full: "rgba(255,60,80,0.7)",
};

const STATUS_LABEL: Record<StatusType, string> = {
  open: "OPEN",
  "in-game": "IN GAME",
  full: "FULL",
};

interface StatusDotProps {
  status: StatusType;
}

export function StatusDot({ status }: StatusDotProps) {
  const c = STATUS_COLOR[status];
  return <span className="badge-dot" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />;
}

interface StatusBadgeProps {
  status: StatusType;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const c = STATUS_COLOR[status];
  return (
    <span
      className="badge-status"
      style={{ color: c, background: `${c}18`, border: `1px solid ${c}40` }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export type RoleType = "host" | "member";

const ROLE_COLOR: Record<RoleType, { bg: string; border: string; color: string }> = {
  host: { bg: "rgba(255,0,204,0.15)", border: "rgba(255,0,204,0.4)", color: "#ff00cc" },
  member: { bg: "rgba(0,238,255,0.1)", border: "rgba(0,238,255,0.28)", color: "#00eeff" },
};

interface RoleBadgeProps {
  role: RoleType;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const rs = ROLE_COLOR[role];
  return (
    <span
      className="badge-role"
      style={{ color: rs.color, background: rs.bg, border: `1px solid ${rs.border}` }}
    >
      {role === "host" ? "Host" : "Member"}
    </span>
  );
}
