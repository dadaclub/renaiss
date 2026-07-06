import { CardEntry, fmtUsd } from "@/lib/mockCards";

export function CardListItem({ card }: { card: CardEntry }) {
  const up = card.delta30d >= 0;
  return (
    <div className="flex items-center gap-3 bg-cream/[0.035] border border-glassline rounded-[14px] px-3 py-2.5 cursor-pointer transition-all hover:bg-amber/10 hover:translate-x-[3px]">
      <div
        className="w-[38px] h-[52px] rounded-md flex items-center justify-center text-xl border border-cream/10 shrink-0"
        style={{ background: card.tint }}
      >
        {card.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold text-cream truncate">{card.name}</div>
        <div className="text-[10px] font-semibold text-creamdim mt-px">
          {card.grade} · {card.franchise} · {card.acquiredAt}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[13px] font-extrabold">{fmtUsd(card.priceUsd)}</div>
        <div className={`text-[10px] font-bold ${up ? "text-up" : "text-down"}`}>
          {up ? "▲" : "▼"} {Math.abs(card.delta30d).toFixed(1)}%
        </div>
      </div>
    </div>
  );
}
