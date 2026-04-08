import type { Metadata } from "next";

export const metadata: Metadata = { title: "Kitchen Display · TechBrain" };

export default function KitchenLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-950">{children}</div>;
}
