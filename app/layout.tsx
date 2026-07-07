import type { Metadata } from "next";
import { Fredoka, Noto_Serif_KR, Gochi_Hand } from "next/font/google";
import "./globals.css";

/* 폰트는 next/font로 셀프호스팅 — 렌더 블로킹/FOIT 없이 로드 (globals.css @import 대체).
   토큰 매핑은 tailwind.config.ts fontFamily에서 CSS 변수로 연결. */
const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fredoka",
  display: "swap",
});
const notoSerifKr = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-noto-serif-kr",
  display: "swap",
});
const gochiHand = Gochi_Hand({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-gochi-hand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CardScene",
  description: "Show off your TCG collection in your own interactive room",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fredoka.variable} ${notoSerifKr.variable} ${gochiHand.variable}`}>
      <body>{children}</body>
    </html>
  );
}
