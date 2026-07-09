"use client";

import { useState } from "react";

// Dashboard chart kit — inline SVG, follows the validated reference palette
// exposed as --viz-* tokens in globals.css. Marks: 2px lines, ≤24px bars with
// 4px rounded data-ends, hairline solid gridlines, text in ink tokens only.

const S1 = "var(--viz-s1)";

// ---- stat tile ------------------------------------------------------------

export function StatTile({
  label,
  value,
  delta,
  upIsGood = true,
  spark,
}: {
  label: string;
  value: string;
  delta?: number;
  upIsGood?: boolean;
  spark?: number[];
}) {
  const good = delta !== undefined && (delta >= 0) === upIsGood;
  return (
    <div className="card flex items-center justify-between gap-3 p-4" style={{ background: "var(--viz-surface)" }}>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium" style={{ color: "var(--viz-ink-2)" }}>{label}</p>
        <p className="mt-0.5 text-2xl font-semibold" style={{ color: "var(--viz-ink)" }}>{value}</p>
        {delta !== undefined && (
          <p className="mt-0.5 text-xs font-semibold" style={{ color: good ? "var(--viz-up)" : "var(--viz-crit)" }}>
            {delta >= 0 ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}% vs minggu lalu
          </p>
        )}
      </div>
      {spark && spark.length > 1 && <Sparkline data={spark} />}
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const w = 72, h = 36, pad = 3;
  const max = Math.max(...data), min = Math.min(...data);
  const x = (i: number) => pad + (i / (data.length - 1)) * (w - pad * 2);
  const y = (v: number) => (max === min ? h / 2 : pad + (1 - (v - min) / (max - min)) * (h - pad * 2));
  const d = data.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const last = data.length - 1;
  return (
    <svg width={w} height={h} className="shrink-0" aria-hidden>
      <path d={d} fill="none" stroke="var(--viz-seq-250)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(last)} cy={y(data[last])} r="4" fill={S1} stroke="var(--viz-surface)" strokeWidth="2" />
    </svg>
  );
}

// ---- line chart (single series, crosshair + tooltip) ----------------------

function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / 3;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
  const ticks = [];
  for (let v = 0; ; v += step) {
    ticks.push(v);
    if (v >= max) break;
  }
  return ticks;
}

export function LineChart({
  points,
  height = 220,
  format = (v: number) => v.toLocaleString("id-ID"),
  compactFormat,
}: {
  points: { label: string; value: number }[];
  height?: number;
  format?: (v: number) => string;
  compactFormat?: (v: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = height, padL = 46, padR = 16, padT = 14, padB = 26;
  const max = Math.max(1, ...points.map((p) => p.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const x = (i: number) => padL + (i / Math.max(1, points.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - v / top) * (H - padT - padB);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const area = `${path} L${x(points.length - 1).toFixed(1)} ${y(0)} L${x(0).toFixed(1)} ${y(0)} Z`;
  const fmt = compactFormat ?? format;
  const last = points.length - 1;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          const i = Math.round(((px - padL) / (W - padL - padR)) * (points.length - 1));
          setHover(Math.max(0, Math.min(points.length - 1, i)));
        }}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="var(--viz-grid)" strokeWidth="1" />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--viz-muted)" style={{ fontVariantNumeric: "tabular-nums" }}>
              {fmt(t)}
            </text>
          </g>
        ))}
        <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} stroke="var(--viz-axis)" strokeWidth="1" />
        <path d={area} fill={S1} opacity="0.1" />
        <path d={path} fill="none" stroke={S1} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={padT} y2={H - padB} stroke="var(--viz-axis)" strokeWidth="1" />
        )}
        {hover !== null && (
          <circle cx={x(hover)} cy={y(points[hover].value)} r="4.5" fill={S1} stroke="var(--viz-surface)" strokeWidth="2" />
        )}
        <circle cx={x(last)} cy={y(points[last].value)} r="4.5" fill={S1} stroke="var(--viz-surface)" strokeWidth="2" />
        <text x={x(last) - 6} y={y(points[last].value) - 10} textAnchor="end" fontSize="11" fontWeight="600" fill="var(--viz-ink)">
          {format(points[last].value)}
        </text>
        {[0, Math.floor(points.length / 2), last].map((i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"} fontSize="11" fill="var(--viz-muted)">
            {points[i].label}
          </text>
        ))}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 rounded-lg border border-ink/10 bg-white px-3 py-1.5 text-xs shadow-lg"
          style={{ left: `${(x(hover) / W) * 100}%` }}
        >
          <span style={{ color: "var(--viz-ink-2)" }}>{points[hover].label} · </span>
          <span className="font-semibold" style={{ color: "var(--viz-ink)" }}>{format(points[hover].value)}</span>
        </div>
      )}
    </div>
  );
}

// ---- horizontal bar list (value at the tip) --------------------------------

export function HBarList({
  items,
  format = (v: number) => v.toLocaleString("id-ID"),
}: {
  items: { label: string; value: number; sub?: string }[];
  format?: (v: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-3">
      {items.map((it) => (
        <div key={it.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate font-medium" style={{ color: "var(--viz-ink)" }}>{it.label}</span>
            {it.sub && <span style={{ color: "var(--viz-muted)" }}>{it.sub}</span>}
          </div>
          <div className="flex items-center gap-2">
            <svg width="100%" height="12" className="min-w-0 flex-1">
              <rect x="0" y="0" width="100%" height="12" rx="4" fill="var(--viz-grid)" opacity="0.5" />
              <rect x="0" y="0" width={`${(it.value / max) * 100}%`} height="12" rx="4" fill={S1} />
            </svg>
            <span className="w-16 shrink-0 text-right text-xs font-semibold" style={{ color: "var(--viz-ink)", fontVariantNumeric: "tabular-nums" }}>
              {format(it.value)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- funnel (ordinal sequential ramp) --------------------------------------

const FUNNEL_RAMP = ["var(--viz-seq-250)", "var(--viz-seq-350)", "var(--viz-seq-450)", "var(--viz-seq-550)"];

export function Funnel({ stages }: { stages: { label: string; value: number }[] }) {
  const max = Math.max(1, ...stages.map((s) => s.value));
  return (
    <div className="space-y-1">
      {stages.map((s, i) => {
        const prev = i > 0 ? stages[i - 1].value : null;
        const rate = prev ? (s.value / prev) * 100 : null;
        return (
          <div key={s.label}>
            {rate !== null && (
              <p className="py-0.5 pl-1 text-[11px]" style={{ color: "var(--viz-muted)" }}>
                ↓ {rate.toFixed(1)}% lanjut
              </p>
            )}
            <div className="flex items-center gap-3">
              <span className="w-36 shrink-0 truncate text-xs font-medium" style={{ color: "var(--viz-ink)" }}>{s.label}</span>
              <svg width="100%" height="22" className="min-w-0 flex-1">
                <rect x="0" y="0" width={`${Math.max(2, (s.value / max) * 100)}%`} height="22" rx="4" fill={FUNNEL_RAMP[Math.min(i, FUNNEL_RAMP.length - 1)]} />
              </svg>
              <span className="w-14 shrink-0 text-right text-xs font-semibold" style={{ color: "var(--viz-ink)", fontVariantNumeric: "tabular-nums" }}>
                {s.value.toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- web-vital status tile --------------------------------------------------

export function VitalTile({
  name,
  value,
  display,
  thresholds,
  desc,
}: {
  name: string;
  value: number;
  display: string;
  thresholds: [number, number]; // [good, poor]
  desc: string;
}) {
  const state = value <= thresholds[0] ? "good" : value <= thresholds[1] ? "warn" : "crit";
  const meta = {
    good: { label: "Baik", color: "var(--viz-good)", icon: "✓" },
    warn: { label: "Perlu perbaikan", color: "var(--viz-warn)", icon: "!" },
    crit: { label: "Buruk", color: "var(--viz-crit)", icon: "✕" },
  }[state];
  // meter: position of p75 within 0..poor*1.4 range
  const pct = Math.min(100, (value / (thresholds[1] * 1.4)) * 100);
  return (
    <div className="card p-4" style={{ background: "var(--viz-surface)" }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium" style={{ color: "var(--viz-ink-2)" }}>{name}</p>
        <span className="chip" style={{ background: "transparent", border: `1px solid ${meta.color}`, color: "var(--viz-ink)" }}>
          <span style={{ color: meta.color }}>{meta.icon}</span> {meta.label}
        </span>
      </div>
      <p className="mt-1 text-2xl font-semibold" style={{ color: "var(--viz-ink)" }}>
        {display} <span className="text-xs font-normal" style={{ color: "var(--viz-muted)" }}>p75</span>
      </p>
      <svg width="100%" height="8" className="mt-2">
        <rect x="0" y="0" width="100%" height="8" rx="4" fill="var(--viz-grid)" opacity="0.6" />
        <rect x="0" y="0" width={`${pct}%`} height="8" rx="4" fill={meta.color} />
      </svg>
      <p className="mt-2 text-[11px]" style={{ color: "var(--viz-muted)" }}>{desc}</p>
    </div>
  );
}
