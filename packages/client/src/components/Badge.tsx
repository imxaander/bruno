type BadgeTone = "host" | "member" | "count" | "default";

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
}

export function Badge({ label, tone = "default" }: BadgeProps) {
  return <span className={`badge badge-${tone}`}>{label}</span>;
}
