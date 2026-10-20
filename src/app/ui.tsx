// Shared pieces of the Matchday look.

export function Baseball({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="14.5" fill="#fff" stroke="#0b1a3a" strokeWidth="2" />
      <g fill="none" stroke="#e5484d" strokeWidth="1.8" strokeDasharray="1.2 1.9" strokeLinecap="round">
        <path d="M8.6 4.6c3.3 3 5 6.9 5 11.4s-1.7 8.4-5 11.4" />
        <path d="M23.4 4.6c-3.3 3-5 6.9-5 11.4s1.7 8.4 5 11.4" />
      </g>
    </svg>
  );
}

export type Promo = "opening" | "fireworks" | "bobblehead" | "giveaway" | "theme";

/** Token colors on the season board: fill, text on the fill, and the plural for counts. */
export const PROMO_STYLE: Record<Promo, { label: string; nights: string; fill: string; fg: string; chip: string }> = {
  opening: { label: "Opening night", nights: "opening nights", fill: "bg-stitch", fg: "text-white", chip: "bg-[#ffe4e5] text-[#b42328]" },
  fireworks: { label: "Fireworks", nights: "fireworks nights", fill: "bg-sun", fg: "text-ink", chip: "bg-sun-soft text-[#8a5a00]" },
  bobblehead: { label: "Bobblehead", nights: "bobblehead nights", fill: "bg-accent", fg: "text-white", chip: "bg-accent-soft text-accent" },
  giveaway: { label: "Giveaway", nights: "giveaway nights", fill: "bg-grass", fg: "text-white", chip: "bg-grass-soft text-grass" },
  theme: { label: "Theme night", nights: "theme nights", fill: "bg-berry", fg: "text-white", chip: "bg-berry-soft text-berry" },
};

export function SectionHead({ kicker, title, id, children }: { kicker: string; title: string; id?: string; children?: React.ReactNode }) {
  return (
    <div>
      <p className="kicker">{kicker}</p>
      <h2 id={id} className="mt-1 font-display text-[28px] font-extrabold leading-tight tracking-tight sm:text-[32px]">{title}</h2>
      {children && <p className="mt-1.5 max-w-3xl text-base leading-relaxed text-muted">{children}</p>}
    </div>
  );
}

/** Two letters for a club's cap: the nickname's initials when it has two words (Red Wings: RW), else the city's and the nickname's. */
export function monogram(name: string, nickname: string): string {
  const nick = nickname.split(/\s+/).filter(Boolean);
  if (nick.length >= 2) return (nick[0][0] + nick[1][0]).toUpperCase();
  const first = name.split(/\s+/)[0];
  return first === nickname ? nickname.slice(0, 2).toUpperCase() : (first[0] + nickname[0]).toUpperCase();
}
