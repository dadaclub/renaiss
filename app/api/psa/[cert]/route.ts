import { NextResponse } from "next/server";

/**
 * PSA 인증번호 조회 프록시 — 실물 카드 등록용.
 * PSA Public API (무료 계정 토큰, 일 100콜):
 *  - GET /publicapi/cert/GetByCertNumber/{cert}   → 카드 정보 (PSACert 래핑)
 *  - GET /publicapi/cert/GetImagesByCertNumber/{cert} → 스캔 이미지 (있는 인증서만)
 * 토큰은 PSA_API_TOKEN (.env.local / Vercel 환경변수).
 * ⚠️ 이 컨테이너에선 외부망 차단으로 라이브 검증 못 함 — 응답 형태가 다르면 매핑만 손보면 됨.
 */

const PSA_BASE = "https://api.psacard.com/publicapi";

interface PsaCertRaw {
  CertNumber?: string;
  Year?: string;
  Brand?: string;
  Category?: string;
  CardNumber?: string;
  Subject?: string;
  Variety?: string;
  CardGrade?: string;
  GradeDescription?: string;
  TotalPopulation?: number;
  PopulationHigher?: number;
}

interface PsaImageRaw {
  IsFrontImage?: boolean;
  ImageURL?: string;
}

export interface PsaLookupDto {
  certNumber: string;
  name: string;
  grade: string;
  franchise: string;
  year?: string;
  imageUrl?: string;
}

async function psaFetch(path: string, token: string): Promise<unknown> {
  const res = await fetch(`${PSA_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 }, // 인증서 정보는 불변에 가까움
  });
  if (!res.ok) throw new Error(`PSA API ${res.status}`);
  return res.json();
}

/** "GEM MT 10" / "MINT 9" 등에서 숫자 등급만 추출해 "PSA 10" 형태로 */
function toGradeLabel(raw: PsaCertRaw): string {
  const src = raw.CardGrade ?? raw.GradeDescription ?? "";
  const m = src.match(/(\d+(?:\.\d+)?)\s*$/);
  return m ? `PSA ${m[1]}` : src ? `PSA ${src}` : "PSA";
}

export async function GET(
  _req: Request,
  { params }: { params: { cert: string } }
) {
  const token = process.env.PSA_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "PSA_API_TOKEN not configured" },
      { status: 501 }
    );
  }

  const cert = params.cert.replace(/\D/g, ""); // 인증번호는 숫자만
  if (!cert) {
    return NextResponse.json({ error: "invalid cert number" }, { status: 400 });
  }

  try {
    const certData = (await psaFetch(`/cert/GetByCertNumber/${cert}`, token)) as
      | { PSACert?: PsaCertRaw }
      | PsaCertRaw;
    // 응답이 { PSACert: {...} } 래핑이거나 평평할 수 있어 둘 다 허용
    const c: PsaCertRaw = "PSACert" in certData && certData.PSACert ? certData.PSACert : (certData as PsaCertRaw);
    if (!c.CertNumber && !c.Subject) {
      return NextResponse.json({ error: "cert not found" }, { status: 404 });
    }

    // 이미지는 별도 엔드포인트 — 스캔이 없는(주로 구형) 인증서는 실패해도 무시
    let imageUrl: string | undefined;
    try {
      const imgs = (await psaFetch(`/cert/GetImagesByCertNumber/${cert}`, token)) as PsaImageRaw[];
      if (Array.isArray(imgs)) {
        imageUrl = (imgs.find((i) => i.IsFrontImage) ?? imgs[0])?.ImageURL;
      }
    } catch {
      // 이미지 없음 — 정보만 반환
    }

    const dto: PsaLookupDto = {
      certNumber: cert,
      name: [c.Subject, c.Variety].filter(Boolean).join(" · "),
      grade: toGradeLabel(c),
      franchise: c.Brand ?? c.Category ?? "TCG",
      year: c.Year,
      imageUrl,
    };
    return NextResponse.json(dto);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "unknown" },
      { status: 502 }
    );
  }
}
