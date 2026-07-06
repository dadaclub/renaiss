"use client";
import { useState } from "react";

/**
 * 로그인 폼 — 방 안 핸드폰에 줌인된 뒤 그 위로 뜬다.
 * 제출하면 onLogin() → 줌아웃 + 방이 밝아짐.
 * (프로토타입: 실제 르네시스 지갑 인증 없음. ID/PW는 목.)
 */
export function LoginIntro({ onLogin }: { onLogin: () => void }) {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");

  const inputCls =
    "w-full bg-cream/[0.06] border border-glassline rounded-xl px-3 py-2.5 text-sm text-cream placeholder:text-creamdim/60 outline-none focus:border-amber transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(4,3,10,0.4)] backdrop-blur-[2px]">
      <div className="w-[300px] rounded-[2rem] bg-[#0e0b1a] border border-glassline shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-6">
        <div className="text-center mb-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-white border border-amber/40 overflow-hidden mb-3 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/renaiss-logo.jpg" alt="Renaiss" className="w-full h-full object-contain p-1.5" />
          </div>
          <div className="text-[10px] tracking-[0.32em] text-amber font-bold uppercase">Renaiss Wallet</div>
          <div className="text-cream font-hand text-2xl mt-1">Log in</div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (id && pw) onLogin();
          }}
          className="flex flex-col gap-3"
        >
          <input
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="ID"
            autoFocus
            className={inputCls}
          />
          <input
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            type="password"
            placeholder="Password"
            className={inputCls}
          />
          <button
            type="submit"
            disabled={!id || !pw}
            className="mt-1 bg-amber text-inkdark font-bold rounded-xl py-2.5 text-sm disabled:opacity-40 enabled:hover:brightness-110 transition"
          >
            Enter room
          </button>
        </form>
      </div>
    </div>
  );
}
