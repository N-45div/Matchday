import Link from "next/link";

// Any unknown address, and a club id that isn't in the list.
export default function NotFound() {
  return (
    <section aria-labelledby="nf-h" className="mx-auto flex max-w-xl flex-col items-center py-10 text-center">
      <div className="chunk rounded-2xl bg-navy p-3" aria-hidden="true">
        <div className="grid grid-cols-3 gap-1.5">
          {["4", "0", "4"].map((d, i) => (
            <span key={i} className="led rounded-lg bg-led px-4 py-3 text-5xl text-sun">{d}</span>
          ))}
        </div>
      </div>
      <h1 id="nf-h" className="mt-7 font-display text-4xl font-extrabold tracking-tight">Foul ball.</h1>
      <p className="mt-2 text-lg leading-relaxed text-muted">That page isn&apos;t on the schedule. Pick a club to open its desk, or see how the numbers were tested.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className="press chunk inline-flex min-h-[52px] items-center gap-2.5 rounded-full bg-accent px-6 text-[17px] font-extrabold text-white">
          Pick a club
        </Link>
        <Link href="/proof" className="press chunk-sm inline-flex min-h-[52px] items-center rounded-full bg-surface px-6 text-[17px] font-bold">
          Evidence
        </Link>
      </div>
    </section>
  );
}
