interface AvatarProps {
  name: string;
  size?: "sm" | "md";
}

export function Avatar({ name, size = "md" }: AvatarProps) {
  const initials = (name.trim().slice(0, 2).toUpperCase() || "?").replace(/\s+/g, "");
  return <span className={`avatar avatar-${size}`}>{initials}</span>;
}
