import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sheets Dashboard",
  description: "Internal Google Sheets viewer",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
