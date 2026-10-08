import type { Metadata } from "next";
import "./globals.css";
import "./ui-enhancements.css";

export const metadata: Metadata = {
  title: "DEAD AIR • Radio Meridian",
  description: "Recover the broadcast. Reveal the truth.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}