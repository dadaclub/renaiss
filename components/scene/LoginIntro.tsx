"use client";
import { useEffect, useState } from "react";
import { CheckCircle, LockSimple } from "@phosphor-icons/react";
import { ROOM_IMG_DARK } from "@/lib/spots";

/**
 * 로그인 — 방 안 핸드폰에 줌인된 뒤 그 위로 뜬다.
 * 르네시스 아이디/비번을 따로 만드는 게 아니라, 구글·네이버 연동처럼
 * "이미 있는 르네시스 계정을 연결"하는 소셜 로그인 형태(겉모습만, 실제 연동 아님 — 목).
 * 단계: 열면 르네 사이트로 잠깐 이동하는 척(redirect) → 돌아와 연동 동의(Authorize)
 *       → 승인하면 연결 연출(connecting) 후 onLogin(). 실제 OAuth/지갑 연동은 없음(목).
 */
type Step = "redirect" | "consent" | "connecting";

// 목 OAuth 리다이렉트에 표시할 르네 인증 도메인 (실제 이동 없음 — 화면 연출용 표기)
const RENAISS_AUTH_URL = "renaiss.xyz/authorize";

// 연동된 것처럼 보이게 하는 목 계정 표기 (실데이터 아님). 로그아웃 화면과 공유.
export const MOCK_ACCOUNT = "0x7F3a…9c2B";

export function LoginIntro({ onLogin, onCancel }: { onLogin: () => void; onCancel: () => void }) {
  const [step, setStep] = useState<Step>("redirect");

  // 폰 클릭 → 르네 사이트로 잠깐 이동(목)했다가 돌아와 연동 동의 화면을 띄운다
  useEffect(() => {
    const t = setTimeout(() => setStep("consent"), 1500);
    return () => clearTimeout(t);
  }, []);

  const authorize = () => {
    setStep("connecting");
    // 실제 OAuth/지갑 연동은 없음 — 연결되는 척 잠깐 보여준 뒤 입장
    setTimeout(onLogin, 1100);
  };

  const RenaissMark = (
    <span className="w-5 h-5 rounded-full bg-white overflow-hidden inline-flex items-center justify-center shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/renaiss-logo.jpg" alt="" className="w-full h-full object-contain p-[2px]" />
    </span>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Log in with Renaiss"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* 전체 뷰포트 방 배경 — 아직 로그인 전이므로 어두운 방(dark). 승인되면 이 모달이 닫히며
          뒤의 Scene이 roomBright(loggedIn) 크로스페이드로 dark→bright 서서히 밝아진다. */}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ROOM_IMG_DARK}
          alt=""
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover select-none blur-[3px] scale-[1.03]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_75%_at_50%_45%,theme(colors.bg/55%),theme(colors.bg/85%))]" />
      </div>
      <div className="relative z-10 w-[320px] rounded-panel bg-glass backdrop-blur-md border border-glassline shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-6">
        {/* 브랜드 헤더 */}
        <div className="text-center mb-5">
          <div className="w-16 h-16 mx-auto rounded-full bg-white border border-amber/40 overflow-hidden mb-3 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/renaiss-logo.jpg" alt="Renaiss" className="w-full h-full object-contain p-1.5" />
          </div>
          <div className="text-[10px] tracking-[0.32em] text-amber font-bold uppercase">Renaiss</div>
          <div className="text-cream font-serif text-2xl mt-1">
            {step === "connecting" ? "Log in" : step === "redirect" ? "Renaiss" : "Authorize"}
          </div>
        </div>

        {/* 르네 사이트로 이동하는 척 — 목 브라우저 주소창 + 로딩. 잠시 뒤 consent로 자동 전환 */}
        {step === "redirect" && (
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="w-full flex items-center gap-2 bg-cream/[0.06] border border-glassline rounded-lg px-3 py-2">
              <LockSimple size={12} weight="fill" className="shrink-0 text-amber" aria-hidden />
              <span className="text-[11px] font-mono text-creamdim truncate">{RENAISS_AUTH_URL}</span>
            </div>
            <span className="w-8 h-8 rounded-full border-2 border-amber/30 border-t-amber animate-spin motion-reduce:animate-none" />
            <p className="text-xs text-creamdim text-center">Opening Renaiss to connect…</p>
          </div>
        )}

        {/* 연동 동의(목 OAuth 화면) */}
        {step === "consent" && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-creamdim text-center">
              <span className="text-cream font-semibold">CardScene</span> wants to connect to your
              Renaiss account
            </p>

            {/* 연동될 계정 (목) — 가운데 정렬 */}
            <div className="flex items-center justify-center gap-2.5 bg-cream/[0.05] border border-glassline rounded-xl px-3 py-2.5 text-center">
              {RenaissMark}
              <div>
                <div className="text-cream text-sm font-medium">Renaiss account</div>
                <div className="text-creamdim/70 text-[11px] font-mono">{MOCK_ACCOUNT}</div>
              </div>
            </div>

            {/* 권한(읽기 전용) */}
            <ul className="text-[11px] text-creamdim/80 space-y-1.5">
              <li className="flex items-center gap-2">
                <CheckCircle size={14} weight="bold" className="shrink-0 text-amber" aria-hidden />
                View your public card collection
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={14} weight="bold" className="shrink-0 text-amber" aria-hidden />
                View on-chain transaction history
              </li>
              <li className="flex items-center gap-2">
                <LockSimple size={14} weight="fill" className="shrink-0 text-creamdim/60" aria-hidden />
                Read-only. Never sends transactions
              </li>
            </ul>

            <div className="flex gap-2 mt-1">
              <button
                onClick={onCancel}
                className="flex-1 border border-glassline text-creamdim rounded-xl py-2.5 text-sm hover:bg-cream/5 transition"
              >
                Cancel
              </button>
              <button
                autoFocus
                onClick={authorize}
                className="flex-1 bg-amber text-inkdark font-bold rounded-xl py-2.5 text-sm hover:brightness-110 transition"
              >
                Authorize
              </button>
            </div>
          </div>
        )}

        {/* 연결 중 */}
        {step === "connecting" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <span className="w-8 h-8 rounded-full border-2 border-amber/30 border-t-amber animate-spin motion-reduce:animate-none" />
            <p className="text-xs text-creamdim">Connecting to Renaiss…</p>
          </div>
        )}
      </div>
    </div>
  );
}
