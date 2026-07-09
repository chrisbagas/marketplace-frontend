"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/track";

// Mounted once in the root layout:
// 1. behavior monitoring — page views per route + delegated clicks on [data-track]
// 2. performance monitoring — Core Web Vitals (LCP, INP, CLS, TTFB) via PerformanceObserver

export default function Monitor() {
  const pathname = usePathname();

  useEffect(() => {
    track("page_view", { page: pathname });
  }, [pathname]);

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest?.("[data-track]");
      if (el) track("click", { label: el.getAttribute("data-track") ?? "", page: location.pathname });
    };
    document.addEventListener("click", onClick, true);

    // ---- web vitals -----------------------------------------------------
    const metrics: Record<string, number> = {};
    const observers: PerformanceObserver[] = [];

    const observe = (type: string, cb: (entries: PerformanceEntry[]) => void) => {
      try {
        const po = new PerformanceObserver((l) => cb(l.getEntries()));
        po.observe({ type, buffered: true } as PerformanceObserverInit);
        observers.push(po);
      } catch { /* type not supported in this browser */ }
    };

    observe("largest-contentful-paint", (entries) => {
      const last = entries[entries.length - 1];
      if (last) metrics.LCP = last.startTime;
    });
    observe("layout-shift", (entries) => {
      for (const e of entries as PerformanceEntry[] & { value?: number; hadRecentInput?: boolean }[]) {
        const ls = e as unknown as { value: number; hadRecentInput: boolean };
        if (!ls.hadRecentInput) metrics.CLS = (metrics.CLS ?? 0) + ls.value;
      }
    });
    observe("event", (entries) => {
      for (const e of entries) {
        const dur = (e as PerformanceEventTiming).duration;
        if (dur > (metrics.INP ?? 0)) metrics.INP = dur;
      }
    });
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nav) metrics.TTFB = nav.responseStart;

    let sent = false;
    const flush = () => {
      if (sent) return;
      const samples = Object.entries(metrics).map(([name, value]) => ({
        name,
        value: Math.round(value * 1000) / 1000,
        page: location.pathname,
        t: Date.now(),
      }));
      if (!samples.length) return;
      sent = true;
      try {
        navigator.sendBeacon("/api/vitals", new Blob([JSON.stringify(samples)], { type: "application/json" }));
      } catch { /* ignore */ }
    };
    const onHidden = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onHidden);
    const timer = setTimeout(flush, 8000);

    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("visibilitychange", onHidden);
      observers.forEach((o) => o.disconnect());
      clearTimeout(timer);
    };
  }, []);

  return null;
}
