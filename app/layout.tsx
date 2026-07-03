import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CardScene",
  description: "Show off your TCG collection in your own interactive room",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
