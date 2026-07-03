/**
 * PSA Public API 래퍼 (담당: B)
 * 인증서 번호로 카드 정보 자동 조회 → 실물 카드 등록
 * https://api.psacard.com/publicapi/cert/GetByCertNumber/{certNumber}
 */
export interface PsaCert {
  certNumber: string;
  cardName: string;
  setName: string;
  year: string;
  grade: string;
  populationHigher: number;
  imageUrlFront?: string;
}

export async function getCertByNumber(certNumber: string): Promise<PsaCert> {
  const res = await fetch(
    `https://api.psacard.com/publicapi/cert/GetByCertNumber/${certNumber}`,
    { headers: { Authorization: `Bearer ${process.env.PSA_API_TOKEN}` } }
  );
  if (!res.ok) throw new Error(`PSA API ${res.status}`);
  const data = await res.json();
  // TODO: 응답 스키마 확인 후 매핑 정교화
  return data as PsaCert;
}
