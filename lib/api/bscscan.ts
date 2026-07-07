/**
 * BSC 온체인 조회 래퍼 (read-only, 서버 전용)
 * - 지갑이 특정 SBT 컨트랙트에서 보유한 토큰 → tokenURI → 메타데이터(이미지) 조회
 * - Etherscan V2(멀티체인, chainid=56) 우선, 없으면 BscScan V1.
 *   키: env ETHERSCAN_API_KEY (권장) 또는 BSCSCAN_API_KEY.
 * - 지갑 연결/서명 없음. 외부 API 필요 → 배포 환경에서 동작.
 */

export interface OnchainSbt {
  tokenId: string;
  title?: string;
  description?: string;
  imageUrl?: string;
}

const IPFS_GATEWAY = "https://ipfs.io/ipfs/";

/** Etherscan V2 / BscScan V1 중 사용 가능한 쪽으로 요청 URL 구성 */
function scanUrl(params: Record<string, string>): string {
  const ethKey = process.env.ETHERSCAN_API_KEY;
  const bscKey = process.env.BSCSCAN_API_KEY;
  if (ethKey) {
    const q = new URLSearchParams({ chainid: "56", apikey: ethKey, ...params });
    return `https://api.etherscan.io/v2/api?${q}`;
  }
  if (bscKey) {
    const q = new URLSearchParams({ apikey: bscKey, ...params });
    return `https://api.bscscan.com/api?${q}`;
  }
  throw new Error("Missing ETHERSCAN_API_KEY / BSCSCAN_API_KEY");
}

function resolveIpfs(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("ipfs://ipfs/")) return IPFS_GATEWAY + url.slice("ipfs://ipfs/".length);
  if (url.startsWith("ipfs://")) return IPFS_GATEWAY + url.slice("ipfs://".length);
  return url;
}

/** eth_call 반환 hex 를 ABI string 으로 디코드 ([offset][length][utf8 bytes]) */
function decodeAbiString(hex?: string): string {
  if (!hex || hex === "0x") return "";
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  try {
    const len = parseInt(h.slice(64, 128), 16); // 두 번째 워드 = 길이
    if (!Number.isFinite(len) || len <= 0) return "";
    const bytesHex = h.slice(128, 128 + len * 2);
    let s = "";
    for (let i = 0; i < bytesHex.length; i += 2) s += String.fromCharCode(parseInt(bytesHex.substr(i, 2), 16));
    try {
      return decodeURIComponent(escape(s)); // latin1 → utf-8
    } catch {
      return s;
    }
  } catch {
    return "";
  }
}

/** tokenURI(uint256) 를 eth_call 로 읽기 */
async function readTokenUri(contract: string, tokenId: string): Promise<string> {
  const selector = "c87b56dd"; // keccak("tokenURI(uint256)")[:4]
  const arg = BigInt(tokenId).toString(16).padStart(64, "0");
  const url = scanUrl({ module: "proxy", action: "eth_call", to: contract, data: "0x" + selector + arg, tag: "latest" });
  const res = await fetch(url, { next: { revalidate: 300 } });
  const j = (await res.json()) as { result?: string };
  return resolveIpfs(decodeAbiString(j.result)) ?? "";
}

/** 메타데이터(JSON) 로드 — data:URI 또는 http(s)/ipfs */
async function fetchMetadata(
  uri: string
): Promise<{ name?: string; description?: string; image?: string } | null> {
  if (!uri) return null;
  if (uri.startsWith("data:application/json")) {
    const payload = uri.slice(uri.indexOf(",") + 1);
    try {
      const json = uri.includes(";base64")
        ? Buffer.from(payload, "base64").toString("utf8")
        : decodeURIComponent(payload);
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
  const res = await fetch(uri, { next: { revalidate: 300 } });
  if (!res.ok) return null;
  return (await res.json()) as { name?: string; description?: string; image?: string };
}

/**
 * 특정 SBT 컨트랙트에서 지갑이 보유한 토큰들의 메타데이터(이미지 포함) 조회.
 * 소울바운드라 보통 받은 것만 있음(전송 out 없음). 전송 이벤트로 현재 보유분 유추.
 */
export async function getSbtsFromContract(contract: string, wallet: string): Promise<OnchainSbt[]> {
  const url = scanUrl({
    module: "account",
    action: "tokennfttx",
    contractaddress: contract,
    address: wallet,
    page: "1",
    offset: "200",
    sort: "asc",
  });
  const res = await fetch(url, { next: { revalidate: 300 } });
  const data = (await res.json()) as {
    status: string;
    result: Array<{ tokenID?: string; to?: string; from?: string }>;
  };
  if (data.status !== "1" || !Array.isArray(data.result)) return [];

  const w = wallet.toLowerCase();
  const owned = new Set<string>();
  for (const tx of data.result) {
    const id = String(tx.tokenID ?? "");
    if (!id) continue;
    if ((tx.to ?? "").toLowerCase() === w) owned.add(id);
    if ((tx.from ?? "").toLowerCase() === w) owned.delete(id);
  }

  // Set 전개([...owned])는 tsconfig target(es5)에서 컴파일 불가 — Array.from 사용
  const ids = Array.from(owned).slice(0, 12);
  return Promise.all(
    ids.map(async (tokenId): Promise<OnchainSbt> => {
      try {
        const uri = await readTokenUri(contract, tokenId);
        const meta = await fetchMetadata(uri);
        return {
          tokenId,
          title: meta?.name,
          description: meta?.description,
          imageUrl: resolveIpfs(meta?.image),
        };
      } catch {
        return { tokenId };
      }
    })
  );
}
