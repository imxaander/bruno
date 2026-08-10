import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "cta" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant = "primary", size = "md", className, ...rest }: ButtonProps) {
  const classes = ["btn", `btn-${variant}`, `btn-${size}`, className ?? ""].join(" ").trim();
  return <button className={classes} {...rest} />;
}
