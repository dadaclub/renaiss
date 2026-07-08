/**
 * apitcg.com — TCG 카드 조회 래퍼 (read-only, 서버 전용).
 * 게임(원피스/포켓몬/디지몬 등 — lib/api/apitcgGames.ts)별로 카드를 검색해 이미지 URL을 반환.
 * ⚠️ 시세(price)는 제공하지 않음 — 이미지·카드정보만.
 * 키: APITCG_API_KEY (.env.local / Vercel 환경변수, 전 게임 공용). 브라우저 노출 금지 → 반드시 서버(API 라우트)에서만 호출.
 * 스키마 출처: GET https://www.apitcg.com/api/<game>/cards?name= (헤더 x-api-key).
 */
import type { ApiTcgGame } from "./apitcgGames";

const base = (gameId: string) => `https://www.apitcg.com/api/${gameId}/cards`;

interface ApiTcgCardRaw {
  id: string;
  code: string;
  name: string;
  rarity?: string;
  type?: string;
  color?: string;
  set?: { name?: string };
  images?: { small?: string; large?: string };
}

export interface OnePieceCard {
  id: string; // 카드 코드 (예: ST14-001)
  name: string;
  rarity?: string;
  type?: string;
  setName?: string;
  imageUrl: string; // large 우선, 없으면 small
}

/** 이미지 URL에서 "카드코드_판본" 파일명 추출 (확장자·쿼리스트링 무관) — 예: ST01-007_p1 */
function cardFileKey(imageUrl: string): string | null {
  return imageUrl.match(/([A-Za-z0-9]+-[0-9]+(?:_p\d+)?)\.(?:png|jpe?g|webp)/i)?.[1]?.toUpperCase() ?? null;
}

function mapCards(data: { data?: ApiTcgCardRaw[] }): OnePieceCard[] {
  return (data.data ?? [])
    .map((c) => {
      const imageUrl = c.images?.large || c.images?.small || "";
      // id는 이미지 파일명 기준 (같은 코드의 판본들 OP01-016 / OP01-016_p1 을 구분 — React key 충돌 방지)
      const file = cardFileKey(imageUrl);
      return {
        id: file ?? c.code ?? c.id,
        name: c.name,
        rarity: c.rarity,
        type: c.type,
        setName: c.set?.name,
        imageUrl,
      };
    })
    .filter((c) => c.imageUrl);
}

/** 같은 카드(코드+판본)는 한 번만 — 호스트/확장자가 달라도 같은 그림이면 중복.
 *  파일명에서 코드를 못 뽑는 URL은 쿼리스트링 뗀 URL로 비교(기존 동작). */
function dedupeByImage(cards: OnePieceCard[]): OnePieceCard[] {
  const seen = new Set<string>();
  return cards.filter((c) => {
    const k = cardFileKey(c.imageUrl) ?? c.imageUrl.replace(/\?.*/, "");
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** "op01 016" / "OP1-16" / "st03-017" / "p-061" → 정규화된 카드 코드. 코드 형태가 아니면 null */
export function toCardCode(q: string): string | null {
  const m = q.trim().match(/^(op|st|eb|prb)\s*-?\s*0*(\d+)\s*[-.\s]\s*0*(\d+)$/i);
  if (m) return `${m[1].toUpperCase()}${m[2].padStart(2, "0")}-${m[3].padStart(3, "0")}`;
  const p = q.trim().match(/^p\s*-?\s*0*(\d+)$/i);
  if (p) return `P-${p[1].padStart(3, "0")}`;
  return null;
}

async function fetchCards(
  gameId: string,
  param: "name" | "id",
  value: string,
  limit: number,
  key: string
): Promise<OnePieceCard[]> {
  const res = await fetch(`${base(gameId)}?${param}=${encodeURIComponent(value)}&limit=${limit}`, {
    headers: { "x-api-key": key },
    next: { revalidate: 3600 }, // 카드 카탈로그는 거의 불변
  });
  if (!res.ok) throw new Error(`apitcg API ${res.status}`);
  return mapCards((await res.json()) as { data?: ApiTcgCardRaw[] });
}

/**
 * 코드 검색 보강 — apitcg가 모르는 판본을 공식 사이트에서 직접 프로빙.
 * 영어 사이트(en.)가 기본이지만, JP 전용 프로모는 일본 사이트(www.)에만 있어 둘 다 확인.
 * apitcg 결과에 이미 있는 접미사(_pN)는 건너뛰고, _p1~_p8 중 빠진 것만 HEAD로 존재 확인.
 */
const OFFICIAL_HOSTS = ["en.onepiece-cardgame.com", "www.onepiece-cardgame.com"] as const;

async function probeMissingParallels(code: string, existing: OnePieceCard[]): Promise<OnePieceCard[]> {
  const have = new Set(
    existing.map((c) => c.imageUrl.match(/_p(\d+)\.(?:png|jpe?g|webp)/i)?.[1] ?? "base")
  );
  const baseName = existing[0]?.name ?? code;

  const found: OnePieceCard[] = [];
  await Promise.all(
    Array.from({ length: 8 }, (_, i) => i + 1)
      .filter((n) => !have.has(String(n)))
      .map(async (n) => {
        for (const host of OFFICIAL_HOSTS) {
          const url = `https://${host}/images/cardlist/card/${code}_p${n}.png`;
          try {
            const head = await fetch(url, { method: "HEAD" });
            if (head.ok) {
              found.push({
                id: `${code}_p${n}`,
                name: host.startsWith("www") ? `${baseName} (JP promo)` : `${baseName} (Alt art)`,
                imageUrl: url,
              });
              return; // 이 접미사는 확보 — 다음 호스트 불필요
            }
          } catch {
            // 다음 호스트 시도
          }
        }
      })
  );
  return found;
}

/**
 * 패러렐(얼터너티브) 아트 탐색 — 공식 사이트는 같은 카드번호에 `_p1`, `_p2` 접미사로
 * 풀아트/스페셜 판본을 호스팅한다 (예: ST03-017_p1.png = Love-Love Mellow 행콕 풀아트).
 * apitcg 응답엔 기본판만 있으므로, HEAD로 존재 확인해 별도 항목으로 추가한다.
 * 결과가 적을 때만(느려지지 않게) 탐색.
 */
async function withParallelArts(cards: OnePieceCard[]): Promise<OnePieceCard[]> {
  if (cards.length === 0 || cards.length > 8) return cards;

  const out: OnePieceCard[] = [];
  await Promise.all(
    cards.map(async (card) => {
      out.push(card);
      // 기존 URL에서 카드번호 베이스 추출 (이미 _pN이면 베이스로 환원)
      const m = card.imageUrl.match(/^(.*?)(_p\d+)?\.png/);
      if (!m) return;
      const probes = [1, 2].map((n) => `${m[1]}_p${n}.png`).filter((u) => !card.imageUrl.startsWith(u));
      await Promise.all(
        probes.map(async (url, i) => {
          try {
            const head = await fetch(url, { method: "HEAD" });
            if (head.ok) {
              out.push({
                ...card,
                id: `${card.id}_p${i + 1}`,
                name: `${card.name} (Alt art)`,
                imageUrl: url,
              });
            }
          } catch {
            // 없으면 무시
          }
        })
      );
    })
  );
  return out;
}

/**
 * TCG 카드 검색 — 게임별 apitcg 조회. 원피스는 카드 코드 우선, 나머지는 이름 검색.
 * 1) [원피스 전용] 검색어가 카드 코드 형태(OP01-016, ST03-017, P-061 등)면 ?id= 검색 —
 *    그 코드의 모든 판본(기본판/_p1 패러렐/스페셜)이 각각 이미지째 반환됨. 가장 정확.
 * 2) 이름 검색(전 게임 공통): apitcg 매칭이 띄어쓰기/하이픈에 예민해서("Love-Love Mellow"는
 *    "love love mellow"로 안 잡힘) 0건이면 가장 긴 단어로 재시도.
 *    [원피스 전용] 결과가 적으면 공식 사이트의 패러렐 아트(_p1/_p2)도 HEAD 프로빙으로 추가.
 */
export async function searchTcgCards(game: ApiTcgGame, query: string, limit = 24): Promise<OnePieceCard[]> {
  const key = process.env.APITCG_API_KEY;
  if (!key) throw new Error("APITCG_API_KEY not configured");

  // 1) 카드 코드 검색 (원피스만 — 다른 게임엔 통일된 카드 코드 체계가 없음)
  //    apitcg가 아는 판본 + 공식 사이트(영/일)에만 있는 판본까지 프로빙.
  //    (예: OP08-106_p5 프로모는 일본 사이트에만 있고 apitcg 미등록)
  if (game.codeSearch) {
    const code = toCardCode(query);
    if (code) {
      const byCode = await fetchCards(game.id, "id", code, limit, key);
      if (byCode.length > 0) {
        const extra = await probeMissingParallels(code, byCode);
        return dedupeByImage([...byCode, ...extra]);
      }
    }
  }

  // 2) 이름 검색
  let cards = await fetchCards(game.id, "name", query, limit, key);
  if (cards.length === 0) {
    // 폴백: 3글자 이상 단어 중 가장 긴 것으로 재검색
    const longest = query
      .split(/[\s-]+/)
      .filter((w) => w.length >= 3)
      .sort((a, b) => b.length - a.length)[0];
    if (longest && longest.toLowerCase() !== query.toLowerCase()) {
      cards = await fetchCards(game.id, "name", longest, limit, key);
    }
  }
  return dedupeByImage(game.codeSearch ? await withParallelArts(cards) : cards);
}
