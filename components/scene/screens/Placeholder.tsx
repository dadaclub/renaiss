/** 임시 자리표시자 — 담당자가 실제 콘텐츠로 교체하세요. */
export function Placeholder({ label = "Image coming soon" }: { label?: string }) {
  return (
    <div className="w-[min(82vw,680px)] aspect-[16/10] rounded-2xl border-2 border-dashed border-glassline flex items-center justify-center text-creamdim text-sm">
      {label}
    </div>
  );
}
