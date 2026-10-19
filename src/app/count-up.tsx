"use client";

import { useEffect, useState } from "react";

/** Counts up to a number once on load. The server renders the final number, so it reads right without scripts. */
export function CountUp({ value, prefix = "", duration = 1300 }: { value: number; prefix?: string; duration?: number }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return (
    <span className="tabular-nums">
      {prefix}
      {shown.toLocaleString("en-US")}
    </span>
  );
}
