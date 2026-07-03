interface Props {
  label: string;
  value: string;
  tone?: "default" | "up" | "down";
}

export function StatCard({ label, value, tone = "default" }: Props) {
  const color = tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-cream";
  return (
    <div className="flex-1 min-w-[100px] bg-ambersoft border border-glassline rounded-xl px-3 py-2.5">
      <div className="text-[10px] font-bold tracking-wide text-creamdim mb-0.5">{label}</div>
      <div className={`text-base font-extrabold ${color}`}>{value}</div>
    </div>
  );
}
