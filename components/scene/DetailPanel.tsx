"use client";
import { useState } from "react";
import { SpotId } from "@/lib/spots";
import { MOCK_CARDS, fmtUsd } from "@/lib/mockCards";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { StatCard } from "@/components/ui/StatCard";
import { Chip } from "@/components/ui/Chip";
import { CardListItem } from "@/components/cards/CardListItem";

type SortMode = "value" | "date" | "grade";

export function DetailPanel({ spot }: { spot: SpotId }) {
  const [sort, setSort] = useState<SortMode>("value");

  if (spot === "cabinet") {
    const total = MOCK_CARDS.reduce((s, c) => s + c.priceUsd, 0);
    const cards = [...MOCK_CARDS].sort((a, b) =>
      sort === "value" ? b.priceUsd - a.priceUsd
      : sort === "date" ? b.acquiredAt.localeCompare(a.acquiredAt)
      : b.grade.localeCompare(a.grade)
    );
    return (
      <div>
        <Eyebrow>Display cabinet</Eyebrow>
        <h2 className="font-hand text-[26px] mb-1.5">Card Cabinet</h2>
        <p className="text-[13px] text-creamdim leading-relaxed mb-4">
          {MOCK_CARDS.length} cards on display in acrylic cases.
        </p>
        <div className="flex gap-2.5 flex-wrap mb-3">
          <StatCard label="Cabinet value" value={fmtUsd(total)} />
          <StatCard label="This week" value="+2.4%" tone="up" />
        </div>
        <div className="flex gap-1.5 mb-3.5">
          <Chip active={sort === "value"} onClick={() => setSort("value")}>By value</Chip>
          <Chip active={sort === "date"} onClick={() => setSort("date")}>By date</Chip>
          <Chip active={sort === "grade"} onClick={() => setSort("grade")}>By grade</Chip>
        </div>
        <div className="flex flex-col gap-2">
          {cards.map(c => <CardListItem key={c.id} card={c} />)}
        </div>
      </div>
    );
  }

  if (spot === "computer") {
    return (
      <div>
        <Eyebrow>Portfolio terminal</Eyebrow>
        <h2 className="font-hand text-[26px] mb-1.5">Portfolio</h2>
        <p className="text-[13px] text-creamdim leading-relaxed mb-4">
          See your on-chain and physical assets at a glance. Physical values are estimates based on recent eBay sales.
        </p>
        <div className="flex gap-2.5 flex-wrap mb-4">
          <StatCard label="Total assets" value="$18,420" />
          <StatCard label="30 days" value="+5.8%" tone="up" />
        </div>
        <Bar label="On-chain holdings" value="$14,200" pct={77} />
        <Bar label="Physical (redeemed · est.)" value="$4,220" pct={23} />
        <div className="flex gap-2.5 flex-wrap mt-4">
          <StatCard label="Bottleneck score" value="78/100" />
          <StatCard label="Concentration risk" value="Low" tone="up" />
        </div>
      </div>
    );
  }

  if (spot === "window") {
    return (
      <div>
        <Eyebrow>Market weather</Eyebrow>
        <h2 className="font-hand text-[26px] mb-1.5">Today&apos;s Market Weather</h2>
        <p className="text-[13px] text-creamdim leading-relaxed mb-4">
          Clear skies outside. Trading volume is up over the past 7 days — the market is trending bullish.
        </p>
        <div className="flex gap-2.5 flex-wrap">
          <StatCard label="Volume (7d)" value="▲ 18%" tone="up" />
          <StatCard label="Avg price (7d)" value="▲ 3.1%" tone="up" />
          <StatCard label="Sentiment" value="☀️ Sunny" />
        </div>
      </div>
    );
  }

  if (spot === "phone") {
    return (
      <div>
        <Eyebrow>Weekly letter</Eyebrow>
        <h2 className="font-hand text-[26px] mb-1.5">This Week&apos;s Report</h2>
        <p className="text-[13px] text-creamdim leading-relaxed mb-4">
          2 new cards joined your cabinet this week, and 3 friends stopped by. The most popular card was Charizard Promo.
        </p>
        <div className="flex gap-2.5 flex-wrap">
          <StatCard label="Visitors" value="12" />
          <StatCard label="Likes" value="34" />
          <StatCard label="New cards" value="+2" />
        </div>
      </div>
    );
  }

  if (spot === "photo") {
    return (
      <div>
        <Eyebrow>Collector type</Eyebrow>
        <h2 className="font-hand text-[26px] mb-1.5">Your Collector Type</h2>
        <p className="text-[13px] text-creamdim leading-relaxed mb-4">
          Your recent pull pattern favors big jackpots over safely completing sets. 70% of cards acquired in the last 3 months were low-odds grades.
        </p>
        <div className="flex gap-2.5 flex-wrap">
          <StatCard label="Type" value="Jackpot hunter" />
          <StatCard label="Same type" value="Top 14%" />
        </div>
      </div>
    );
  }

  // album — 새로 추가된 가구. 기능 미정이라 임시 플레이스홀더.
  return (
    <div>
      <Eyebrow>Card album</Eyebrow>
      <h2 className="font-hand text-[26px] mb-1.5">Card Album</h2>
      <p className="text-[13px] text-creamdim leading-relaxed mb-4">
        New furniture — feature not wired yet. Tell me what the album should show and I&apos;ll build it.
      </p>
      <div className="flex gap-2.5 flex-wrap">
        <StatCard label="Status" value="TBD" />
      </div>
    </div>
  );
}

function Bar({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-[11px] text-creamdim font-semibold mb-1">
        <span>{label}</span><span>{value}</span>
      </div>
      <div className="h-2 rounded-md bg-cream/10 overflow-hidden">
        <span className="block h-full rounded-md bg-gradient-to-r from-amber to-[#7DE3FF]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
