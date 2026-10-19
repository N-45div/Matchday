// Small shared pieces of the Matchday look.

export function Baseball({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="14.5" fill="#fff" stroke="#0b1a3a" strokeOpacity="0.12" />
      <g fill="none" stroke="#e5484d" strokeLinecap="round">
        <path d="M8.6 4.6c3.3 3 5 6.9 5 11.4s-1.7 8.4-5 11.4" strokeWidth="1.1" />
        <path d="M23.4 4.6c-3.3 3-5 6.9-5 11.4s1.7 8.4 5 11.4" strokeWidth="1.1" />
        <path d="M8.6 4.6c3.3 3 5 6.9 5 11.4s-1.7 8.4-5 11.4" strokeWidth="3" strokeDasharray="0.5 2.4" />
        <path d="M23.4 4.6c-3.3 3-5 6.9-5 11.4s1.7 8.4 5 11.4" strokeWidth="3" strokeDasharray="0.5 2.4" />
      </g>
    </svg>
  );
}

export const PROMO_STYLE: Record<string, { label: string; nights: string; dot: string; chip: string }> = {
  opening: { label: "Opening night", nights: "opening nights", dot: "bg-stitch", chip: "bg-[#ffe4e5] text-stitch" },
  fireworks: { label: "Fireworks", nights: "fireworks nights", dot: "bg-sun", chip: "bg-sun-soft text-[#b45309]" },
  bobblehead: { label: "Bobblehead", nights: "bobblehead nights", dot: "bg-accent", chip: "bg-accent-soft text-accent" },
  giveaway: { label: "Giveaway", nights: "giveaway nights", dot: "bg-grass", chip: "bg-grass-soft text-grass" },
  theme: { label: "Theme night", nights: "theme nights", dot: "bg-berry", chip: "bg-berry-soft text-berry" },
};

export function SectionTitle({ kicker, title, children }: { kicker: string; title: string; children?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{kicker}</p>
      <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">{title}</h2>
      {children && <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted">{children}</p>}
    </div>
  );
}
