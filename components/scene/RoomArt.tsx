/**
 * 방 아트 (와이드 16:9 벡터). 스케치 기반 플레이스홀더 — 최종 렌더 나오면 교체.
 * 벡터라 줌해도 안 깨짐. 오브젝트 위치는 lib/spots.ts 좌표와 맞춤.
 * viewBox 0 0 1600 900 기준(%).
 */
export function RoomArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1600 900" className={className} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="bg" cx="50%" cy="42%" r="75%">
          <stop offset="0%" stopColor="#1c1440" />
          <stop offset="62%" stopColor="#0c0920" />
          <stop offset="100%" stopColor="#050409" />
        </radialGradient>
        <linearGradient id="wallL" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0%" stopColor="#2c2054" />
          <stop offset="100%" stopColor="#3a2b66" />
        </linearGradient>
        <linearGradient id="wallR" x1="1" y1="0" x2="0" y2="0.4">
          <stop offset="0%" stopColor="#4a3a80" />
          <stop offset="100%" stopColor="#3d2f6b" />
        </linearGradient>
        <linearGradient id="floor" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#6a5896" />
          <stop offset="100%" stopColor="#4c3d78" />
        </linearGradient>
        <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="7" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ambient background */}
      <rect width="1600" height="900" fill="url(#bg)" />

      {/* ---- room shell ---- */}
      {/* walls */}
      <polygon points="800,70 110,235 110,545 800,480" fill="url(#wallL)" />
      <polygon points="800,70 1490,235 1490,545 800,480" fill="url(#wallR)" />
      {/* floor */}
      <polygon points="800,480 110,545 800,775 1490,545" fill="url(#floor)" />
      {/* platform base */}
      <polygon points="110,545 800,775 800,868 110,637" fill="#241a40" />
      <polygon points="1490,545 800,775 800,868 1490,637" fill="#1c1434" />
      {/* neon baseboard */}
      <polyline points="110,545 800,775 1490,545" fill="none" stroke="#ff5da2" strokeWidth="4" opacity="0.8" filter="url(#glow)" />
      {/* corner seam */}
      <line x1="800" y1="70" x2="800" y2="480" stroke="#5de1ff" strokeWidth="2.5" opacity="0.35" />
      {/* rug */}
      <ellipse cx="800" cy="620" rx="360" ry="150" fill="#7a4a86" opacity="0.55" />
      <ellipse cx="800" cy="620" rx="250" ry="102" fill="#a85c9a" opacity="0.4" />

      {/* ---- cabinet (card storage) left wall ---- */}
      <g>
        <polygon points="395,320 175,366 175,600 395,556" fill="#1c4b48" />
        <polygon points="395,320 175,366 172,352 392,306" fill="#123634" />
        {/* neon sign */}
        <rect x="200" y="300" width="150" height="26" rx="13" fill="#2a1030" stroke="#ff5da2" strokeWidth="3" filter="url(#glow)" />
        {/* shelves + glowing cards */}
        {[0, 1, 2, 3].map((r) => {
          const y = 372 + r * 56;
          const yl = y + 9;
          return (
            <g key={r}>
              <line x1="180" y1={yl + 46} x2="392" y2={yl + 46 - 9} stroke="#0d2a28" strokeWidth="4" />
              {[0, 1, 2, 3].map((c) => {
                const x = 198 + c * 50;
                const cy = y + 6 - c * 2;
                const colors = ["#5de1ff", "#ff9ecb", "#b78cff", "#ffd27a"];
                return <rect key={c} x={x} y={cy} width="34" height="42" rx="4" fill={colors[(r + c) % 4]} opacity="0.92" filter="url(#glow)" />;
              })}
            </g>
          );
        })}
      </g>

      {/* ---- computer desk (game) center-back ---- */}
      <g>
        {/* desk top */}
        <polygon points="560,470 830,470 890,512 500,512" fill="#3a2f5e" />
        <polygon points="500,512 890,512 890,556 500,556" fill="#2b2247" />
        {/* monitor */}
        <rect x="630" y="300" width="170" height="128" rx="10" fill="#151024" stroke="#3a2f5e" strokeWidth="6" />
        <rect x="646" y="316" width="138" height="96" rx="5" fill="#0f2f3a" />
        <circle cx="715" cy="364" r="24" fill="#5de1ff" opacity="0.85" filter="url(#glow)" />
        <rect x="700" y="428" width="30" height="30" fill="#241a40" />
        <rect x="672" y="456" width="86" height="10" rx="4" fill="#2b2247" />
        {/* keyboard */}
        <polygon points="600,486 720,486 748,506 628,506" fill="#4a3a70" />
      </g>

      {/* ---- framed poster (photo) right wall ---- */}
      <g>
        <rect x="1050" y="150" width="300" height="196" rx="8" transform="skewY(-6)" fill="#211840" stroke="#5de1ff" strokeWidth="5" filter="url(#glow)" />
        <g transform="skewY(-6)">
          <ellipse cx="1120" cy="300" rx="30" ry="52" fill="#ff9ecb" />
          <ellipse cx="1200" cy="290" rx="30" ry="58" fill="#5de1ff" />
          <ellipse cx="1280" cy="300" rx="30" ry="52" fill="#ffd27a" />
        </g>
      </g>

      {/* ---- plushie shelf (right) ---- */}
      <g>
        <polygon points="1120,432 1370,392 1370,410 1120,450" fill="#2b2247" />
        <circle cx="1170" cy="410" r="24" fill="#ff8c6b" />
        <circle cx="1230" cy="402" r="22" fill="#8ad6a0" />
        <circle cx="1290" cy="398" r="20" fill="#c9a2ff" />
      </g>

      {/* ---- couch (front-right) ---- */}
      <g>
        <polygon points="980,640 1240,600 1300,632 1040,676" fill="#2f9a9a" />
        <polygon points="980,640 1040,676 1040,724 980,690" fill="#247e7e" />
        <polygon points="1040,676 1300,632 1300,684 1040,724" fill="#2a8f8f" />
        <rect x="1060" y="612" width="48" height="40" rx="8" fill="#3ab0b0" transform="skewY(-9)" />
      </g>

      {/* ---- beanbag ---- */}
      <ellipse cx="1300" cy="632" rx="86" ry="52" fill="#e8556f" />
      <ellipse cx="1300" cy="620" rx="70" ry="40" fill="#f26d84" />

      {/* ---- coffee table (center) ---- */}
      <g>
        <polygon points="640,566 820,566 872,596 588,596" fill="#5a4630" />
        <polygon points="588,596 872,596 872,616 588,616" fill="#43331f" />
        {/* snack bag on table */}
        <g transform="translate(632,548)">
          <rect x="0" y="0" width="34" height="44" rx="5" fill="#ff7a3c" />
          <rect x="4" y="14" width="26" height="16" rx="3" fill="#ffd27a" />
        </g>
      </g>

      {/* ---- phone (login) — glowing on table ---- */}
      <g>
        <rect x="742" y="536" width="40" height="62" rx="9" fill="#0e0b1a" stroke="#b78cff" strokeWidth="3" filter="url(#glow)" />
        <rect x="748" y="546" width="28" height="42" rx="4" fill="#3a2f6e" />
        <circle cx="762" cy="562" r="8" fill="#b78cff" filter="url(#glow)" />
      </g>

      {/* ---- album (open book) front-right floor ---- */}
      <g transform="translate(980,690)">
        <polygon points="0,20 120,0 128,40 8,60" fill="#c9c2e0" />
        <polygon points="128,40 248,20 256,60 136,80" fill="#ddd7ef" />
        <polygon points="120,0 128,40 136,80 128,44" fill="#9a92c0" />
        {[[24, 22], [70, 15], [162, 34], [206, 27]].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="34" height="24" rx="2" fill="#5de1ff" opacity="0.6" />
        ))}
      </g>

      {/* ---- note (guestbook) — open notebook, left floor ---- */}
      <g transform="translate(320,660)">
        <polygon points="0,26 110,6 118,44 8,64" fill="#efeaff" />
        <polygon points="118,44 214,26 222,60 126,78" fill="#dcd6f2" />
        {[14, 26, 38].map((y, i) => (
          <line key={i} x1="14" y1={26 + y * 0.35} x2="104" y2={26 + y * 0.35 - 6} stroke="#b0a8d0" strokeWidth="2.5" />
        ))}
      </g>

      {/* ---- plant accent ---- */}
      <g transform="translate(470,520)">
        <path d="M0,40 L20,40 L16,10 L4,10 Z" fill="#8a5a3a" />
        <ellipse cx="10" cy="6" rx="18" ry="14" fill="#5fbf7a" />
      </g>
    </svg>
  );
}
