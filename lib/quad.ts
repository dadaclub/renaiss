/**
 * 4-모서리(사각형) 원근 변환 유틸.
 * 액자 개구부가 단순 평행사변형이 아니라 위·아래 변의 기울기가 다른 사다리꼴일 때,
 * 이미지의 네 꼭짓점을 각각 원하는 위치로 보내는 CSS matrix3d 를 계산한다.
 * 참고: 일반 2D 투영변환(homography) → matrix3d 변환 기법.
 */
export type Pt = [number, number]; // [x, y]
export interface Corners {
  tl: Pt; // top-left
  tr: Pt; // top-right
  br: Pt; // bottom-right
  bl: Pt; // bottom-left
}

// 3x3 행렬(row-major)의 수반행렬(adjugate)
function adj(m: number[]): number[] {
  return [
    m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4],
    m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
    m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3],
  ];
}

// 3x3 × 3x3
function multmm(a: number[], b: number[]): number[] {
  const c = new Array<number>(9);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let cij = 0;
      for (let k = 0; k < 3; k++) cij += a[3 * i + k] * b[3 * k + j];
      c[3 * i + j] = cij;
    }
  }
  return c;
}

// 3x3 × 벡터
function multmv(m: number[], v: number[]): number[] {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

function basisToPoints(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): number[] {
  const m = [x1, x2, x3, y1, y2, y3, 1, 1, 1];
  const v = multmv(adj(m), [x4, y4, 1]);
  return multmm(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]);
}

function general2DProjection(
  x1s: number, y1s: number, x1d: number, y1d: number,
  x2s: number, y2s: number, x2d: number, y2d: number,
  x3s: number, y3s: number, x3d: number, y3d: number,
  x4s: number, y4s: number, x4d: number, y4d: number
): number[] {
  const s = basisToPoints(x1s, y1s, x2s, y2s, x3s, y3s, x4s, y4s);
  const d = basisToPoints(x1d, y1d, x2d, y2d, x3d, y3d, x4d, y4d);
  return multmm(d, adj(s));
}

/**
 * 씬(정사각) 대비 %로 지정한 네 꼭짓점으로 매핑하는 CSS matrix3d 문자열을 반환.
 * baseW×baseH 크기의 소스 사각형을 corners(px)로 투영한다.
 */
export function quadMatrix3d(c: Corners, sceneW: number, sceneH: number, baseW = 100, baseH = baseW): string {
  const px = (p: Pt): Pt => [(p[0] / 100) * sceneW, (p[1] / 100) * sceneH];
  const tl = px(c.tl);
  const tr = px(c.tr);
  const br = px(c.br);
  const bl = px(c.bl);
  // 소스 사각형 꼭짓점: TL(0,0) TR(base,0) BL(0,base) BR(base,base)
  const t = general2DProjection(
    0, 0, tl[0], tl[1],
    baseW, 0, tr[0], tr[1],
    0, baseH, bl[0], bl[1],
    baseW, baseH, br[0], br[1]
  );
  for (let i = 0; i < 9; i++) t[i] = t[i] / t[8];
  const m = [
    t[0], t[3], 0, t[6],
    t[1], t[4], 0, t[7],
    0, 0, 1, 0,
    t[2], t[5], 0, t[8],
  ];
  return `matrix3d(${m.join(", ")})`;
}
