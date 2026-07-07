"use client";

interface Props {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export function Chip({ active, onClick, children }: Props) {
  return (
    <button
      onClick={onClick}
      className={[
        "text-[12px] font-bold px-3 py-1.5 rounded-full border transition-colors",
        active
          ? "bg-amber text-inkdark border-amber"
          : "border-glassline text-creamdim hover:text-cream",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
