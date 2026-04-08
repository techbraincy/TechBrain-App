import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  color?: "default" | "orange" | "emerald" | "indigo" | "violet";
}

const colorMap = {
  default:  { bg: "bg-slate-800/60",     border: "border-slate-700",     icon: "text-slate-500",    glow: "" },
  orange:   { bg: "bg-orange-500/8",     border: "border-orange-500/20", icon: "text-orange-400",   glow: "shadow-[0_0_24px_rgba(249,115,22,0.08)]" },
  emerald:  { bg: "bg-emerald-500/8",    border: "border-emerald-500/20",icon: "text-emerald-400",  glow: "shadow-[0_0_24px_rgba(16,185,129,0.08)]" },
  indigo:   { bg: "bg-indigo-500/8",     border: "border-indigo-500/20", icon: "text-indigo-400",   glow: "shadow-[0_0_24px_rgba(99,102,241,0.08)]" },
  violet:   { bg: "bg-violet-500/8",     border: "border-violet-500/20", icon: "text-violet-400",   glow: "shadow-[0_0_24px_rgba(139,92,246,0.08)]" },
};

export function EmptyState({ icon: Icon, title, description, action, color = "default" }: EmptyStateProps) {
  const c = colorMap[color];
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div
        className={`
          w-16 h-16 rounded-2xl border flex items-center justify-center mb-5
          ${c.bg} ${c.border} ${c.glow}
        `}
      >
        <Icon className={`w-7 h-7 ${c.icon}`} />
      </div>
      <p className="text-base font-semibold text-slate-300">{title}</p>
      <p className="text-sm text-slate-500 mt-1.5 max-w-xs leading-relaxed">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
