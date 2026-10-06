import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-accent text-white hover:bg-accent-strong shadow-sm",
  secondary: "bg-surface text-ink border border-line hover:bg-sunken",
  ghost: "text-ink-soft hover:bg-sunken",
  dark: "bg-ink text-white hover:bg-ink-soft",
  danger: "text-red-700 hover:bg-red-50",
};

const sizes = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  icon: "h-8 w-8 justify-center",
};

export type ButtonProps = React.ComponentProps<"button"> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export function buttonClass(variant: keyof typeof variants = "primary", size: keyof typeof sizes = "md") {
  return cn(
    "inline-flex shrink-0 items-center gap-1.5 rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    variants[variant],
    sizes[size],
  );
}

export function Button({ variant = "primary", size = "md", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonClass(variant, size), className)} {...props} />;
}
