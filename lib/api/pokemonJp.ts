/**
 * 포켓몬 일본판 카드 검색 — 공식 카드 DB(pokemon-card.com) resultAPI (read-only, 서버 전용).
 * apitcg(영어판 전용)에 없는 일본 한정 프로모(SV-P 등)를 커버한다.
 * 영어 이름 검색어는 PokeAPI 공개 종(species) 데이터로 일본어 이름으로 변환해 조회
 * (예: "meowth" → "ニャース"). 종 이름이 아닌 검색어(트레이너 카드 등)는 일본어 입력일 때만 검색.
 * 키 불필요 — 전부 공개 API.
 */
import type { OnePieceCard } from "./apitcg";

const JP_BASE = "https://www.pokemon-card.com";

interface JpApiCard {
  cardID: string;
  cardThumbFile: string;
  cardNameViewText: string;
}

/**
 * "이름 + 세트코드" 검색어 분해 — PSA 라벨식 검색 지원 (예: "necrozma sm8b", "meowth sv-p").
 * 마지막 토큰이 세트코드 형태(숫자 포함 or -P 프로모)면 분리, 아니면 null.
 */
export function parseJpSetQuery(query: string): { name: string; setCode: string } | null {
  const tokens = query.trim().split(/\s+/);
  if (tokens.length < 2) return null;
  const last = tokens[tokens.length - 1];
  // 세트코드는 반드시 문자를 포함 (숫자만이면 콜렉터 번호 — 영어판 이름+번호 검색이 처리)
  if (!/^[a-z0-9-]{2,7}$/i.test(last) || !/[a-z]/i.test(last) || !/\d|-?p$/i.test(last)) return null;
  return { name: tokens.slice(0, -1).join(" "), setCode: last.toUpperCase() };
}

/** 영어 포켓몬 이름 → 일본어 이름 (PokeAPI 종 데이터). 종 이름이 아니면 null */
async function speciesLookup(slug: string): Promise<string | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${slug}`, {
      next: { revalidate: 86400 }, // 종 이름은 불변
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      names?: { language: { name: string }; name: string }[];
    };
    return data.names?.find((n) => n.language.name === "ja-hrkt")?.name ?? null;
  } catch {
    return null;
  }
}

async function toJapaneseName(query: string): Promise<string | null> {
  const q = query.trim().toLowerCase();
  const full = await speciesLookup(q.replace(/\s+/g, "-"));
  if (full) return full;
  // "ultra necrozma"처럼 수식어가 붙으면 종 이름이 아님 — 가장 긴 단어로 재시도
  const words = q.split(/\s+/).filter((w) => w.length >= 3);
  const longest = words.sort((a, b) => b.length - a.length)[0];
  return longest && longest !== q ? speciesLookup(longest) : null;
}

/** 이미지 경로에서 세트 코드 추출 — /large/SV-P/047160_… → "SV-P" */
function setCodeFromThumb(path: string): string | undefined {
  return path.match(/\/card_images\/large\/([^/]+)\//)?.[1];
}

export async function searchPokemonJpCards(query: string, limit = 24): Promise<OnePieceCard[]> {
  // "necrozma sm8b"식 세트코드 지정 — 이름만 번역/검색하고 세트코드로 결과를 좁힌다
  const parsed = parseJpSetQuery(query);
  const nameQuery = parsed?.name ?? query;

  const hasJapanese = /[぀-ヿ一-龯]/.test(nameQuery);
  const keyword = hasJapanese ? nameQuery.trim() : await toJapaneseName(nameQuery);
  if (!keyword) return [];

  // 공식 DB의 두 검색 모드를 합친다 (한쪽만으론 빠지는 카드가 있음):
  //  - 기본: 현행 스탠다드 + 프로모(SV-P 등)
  //  - regulation_sidebar_form=all: 전 세대 확장팩 (단, 프로모 제외)
  const search = async (regulationAll: boolean): Promise<JpApiCard[]> => {
    const url =
      `${JP_BASE}/card-search/resultAPI.php?keyword=${encodeURIComponent(keyword)}&sm_and_keyword=true` +
      (regulationAll ? "&regulation_sidebar_form=all" : "");
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 3600 },
      });
      if (!res.ok) return [];
      return ((await res.json()) as { cardList?: JpApiCard[] }).cardList ?? [];
    } catch {
      return [];
    }
  };
  const [promoSide, allSide] = await Promise.all([search(false), search(true)]);

  const seen = new Set<string>();
  let cards = [...promoSide, ...allSide]
    .filter((c) => {
      if (!c.cardThumbFile || seen.has(c.cardID)) return false;
      seen.add(c.cardID);
      return true;
    })
    .map((c) => ({
      id: `jp-${c.cardID}`,
      name: `${c.cardNameViewText} (JP)`,
      setName: setCodeFromThumb(c.cardThumbFile),
      imageUrl: `${JP_BASE}${c.cardThumbFile}`,
    }));

  if (parsed) {
    const bySet = cards.filter((c) => c.setName?.toUpperCase() === parsed.setCode);
    if (bySet.length > 0) cards = bySet; // 코드가 안 맞으면(오타 등) 전체 결과 유지
  }
  return cards.slice(0, limit);
}
