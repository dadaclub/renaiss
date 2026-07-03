import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      /** 네온 퍼플 테마 — 토큰명은 웜톤 시절 이름을 유지 (amber = 메인 액센트) */
      colors: {
        bg: "#07070F",
        glass: "rgba(22,20,40,0.86)",
        glassline: "rgba(167,150,255,0.18)",
        amber: "#B78CFF",
        ambersoft: "rgba(183,140,255,0.14)",
        cream: "#EFEAFF",
        creamdim: "#A49ECB",
        up: "#6FE8C8",
        down: "#FF8BA8",
        inkdark: "#17102E",
      },
      fontFamily: {
        sans: ["Fredoka", "sans-serif"],
        serif: ["'Noto Serif KR'", "serif"],
        hand: ["'Gochi Hand'", "cursive"],
      },
      transitionTimingFunction: {
        camera: "cubic-bezier(0.32, 0.72, 0.25, 1)",
        entrance: "cubic-bezier(0.22, 0.8, 0.2, 1)",
      },
      borderRadius: { panel: "22px" },
    },
  },
  plugins: [],
};
export default config;
