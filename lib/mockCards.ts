export interface CardEntry {
  id: string;
  name: string;
  grade: string;       // "PSA 10"
  franchise: "Pokémon" | "One Piece";
  emoji: string;       // 실데이터 연동 전 썸네일 대용
  tint: string;
  priceUsd: number;
  delta30d: number;    // %
  acquiredAt: string;  // YYYY.MM.DD
  source: "onchain" | "redeemed";
}

export const MOCK_CARDS: CardEntry[] = [
  { id: "c1", name: "Charizard Promo",    grade: "PSA 10", franchise: "Pokémon",   emoji: "🔥",  tint: "#5A2B22", priceUsd: 1200, delta30d: 4.2,  acquiredAt: "2026.03.12", source: "onchain" },
  { id: "c2", name: "Luffy Manga Promo",  grade: "BGS 10", franchise: "One Piece", emoji: "🏴‍☠️", tint: "#22314A", priceUsd: 4434, delta30d: -1.8, acquiredAt: "2026.01.30", source: "onchain" },
  { id: "c3", name: "Suicune Gold Star",  grade: "PSA 9",  franchise: "Pokémon",   emoji: "💧",  tint: "#1E3A38", priceUsd: 3120, delta30d: 1.1,  acquiredAt: "2026.02.14", source: "redeemed" },
  { id: "c4", name: "Gengar Alt Art",     grade: "PSA 10", franchise: "Pokémon",   emoji: "👻",  tint: "#38284A", priceUsd: 2504, delta30d: 0.6,  acquiredAt: "2026.04.02", source: "onchain" },
  { id: "c5", name: "Rocket's Mewtwo ex", grade: "PSA 9",  franchise: "Pokémon",   emoji: "🐭",  tint: "#46341E", priceUsd: 1260, delta30d: 2.1,  acquiredAt: "2026.05.20", source: "onchain" },
  { id: "c6", name: "Zoro Management",    grade: "PSA 10", franchise: "One Piece", emoji: "⚔️",  tint: "#1F3D2C", priceUsd: 980,  delta30d: -0.4, acquiredAt: "2026.06.11", source: "redeemed" },
];

export const fmtUsd = (n: number) => "$" + n.toLocaleString();
