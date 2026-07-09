"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Mockup from "@/components/Mockup";
import { StatTile, LineChart } from "@/components/charts";
import { ALL_LISTINGS, COLORS, DESIGNERS } from "@/lib/data";
import { rupiah, compact, timeAgo } from "@/lib/format";
import type { DesignSubmission, DayStat } from "@/lib/types";

// Demo persona: the session is treated as designer "Raka Wijaya" (no login in
// the prototype). His listings + anything submitted from the Studio show here.
const ME = DESIGNERS[0];
const ROYALTY_SHARE = 0.12;

const STATUS_CHIP: Record<string, string> = {
  review: "bg-sun-100 text-sun-600",
  disetujui: "bg-jade-100 text-jade-800",
  ditolak: "bg-coral-100 text-coral-600",
};

export default function DesignerDashboard() {
  const [days, setDays] = useState<DayStat[]>([]);
  const [subs, setSubs] = useState<DesignSubmission[]>([]);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then((d) => setDays(d.days ?? []));
    const loadSubs = () => fetch("/api/designs").then((r) => r.json()).then((d) => setSubs(d.designs ?? []));
    loadSubs();
    const t = setInterval(loadSubs, 8000);
    return () => clearInterval(t);
  }, []);

  const myListings = ALL_LISTINGS.filter((l) => l.designerId === ME.id);
  const totalSold = myListings.reduce((a, l) => a + l.sold, 0);
  const royalty = days.map((d) => ({ label: d.date.slice(5), value: Math.round(d.revenue * ROYALTY_SHARE * 0.34) }));
  const balance = royalty.reduce((a, r) => a + r.value, 0);
  const spark = royalty.map((r) => r.value);
  const half = Math.floor(royalty.length / 2);
  const recent = spark.slice(half).reduce((a, b) => a + b, 0);
  const prev = spark.slice(0, half).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-extrabold text-white" style={{ background: `hsl(${ME.hue} 45% 40%)` }}>
            {ME.name[0]}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Halo, {ME.name.split(" ")[0]} 👋</h1>
            <p className="text-sm text-ink/55">Studio Kreator · {ME.city} · {compact(ME.followers)} pengikut</p>
          </div>
        </div>
        <Link href="/designer/studio" className="btn-primary" data-track="buka-studio">
          + Buat mockup baru
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Saldo royalti (14 hari)" value={rupiah(balance)} delta={((recent - prev) / prev) * 100} spark={spark} />
        <StatTile label="Total produk terjual" value={compact(totalSold)} />
        <StatTile label="Desain aktif" value={String(myListings.length + subs.filter((s) => s.status === "disetujui").length)} />
        <StatTile label="Rating tokomu" value={`★ ${ME.rating}`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="card p-5" style={{ background: "var(--viz-surface)" }}>
          <p className="font-bold">Royalti harian — 14 hari terakhir</p>
          <p className="mb-3 text-xs" style={{ color: "var(--viz-ink-2)" }}>Estimasi {Math.round(ROYALTY_SHARE * 100)}% dari harga jual setiap item</p>
          {royalty.length > 1 && (
            <LineChart points={royalty} format={rupiah} compactFormat={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}jt` : `${Math.round(v / 1000)}rb`)} />
          )}
        </div>

        <div className="card h-fit p-5">
          <p className="font-bold">Penarikan dana</p>
          <p className="mt-2 text-2xl font-extrabold text-jade-800">{rupiah(balance)}</p>
          <p className="text-xs text-ink/50">tersedia untuk ditarik</p>
          <button className="btn-secondary btn-sm mt-4 w-full" onClick={() => alert("Demo: penarikan dana ke rekening BCA •••• 4521 diproses 1–2 hari kerja.")}>
            Tarik ke BCA •••• 4521
          </button>
          <div className="mt-4 border-t border-ink/8 pt-3 text-xs text-ink/55">
            <p>💡 Tips: desain bertema <b>senja</b> dan <b>batik</b> sedang naik 30% pencariannya minggu ini.</p>
          </div>
        </div>
      </div>

      {/* submissions from the studio */}
      <section className="mt-10">
        <h2 className="text-xl font-extrabold tracking-tight">Pengajuan desain</h2>
        <p className="text-sm text-ink/55">Desain dari Studio Mockup menunggu kurasi tim KaryaKita.</p>
        {subs.length === 0 ? (
          <div className="card mt-4 p-8 text-center text-sm text-ink/55">
            Belum ada pengajuan. <Link href="/designer/studio" className="font-bold text-jade-700 hover:underline">Buat di Studio Mockup →</Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {subs.map((s) => (
              <div key={s.id} className="card overflow-hidden">
                <div className="bg-jade-50 p-3">
                  <Mockup type={s.type as never} colorHex={COLORS[s.color]?.hex ?? "#f4f2ec"} designUri={s.uri} className="mx-auto aspect-square w-full max-w-40" />
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{s.title}</p>
                    <span className={`chip shrink-0 ${STATUS_CHIP[s.status]}`}>{s.status === "review" ? "Direview" : s.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink/50">{rupiah(s.price)} · {timeAgo(s.t)}</p>
                  {s.note && <p className="mt-1 text-xs text-coral-600">Catatan: {s.note}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* live listings */}
      <section className="mt-10">
        <h2 className="text-xl font-extrabold tracking-tight">Produk aktif</h2>
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full min-w-130 text-left text-sm">
            <thead>
              <tr className="border-b border-ink/8 text-xs text-ink/50">
                <th className="p-3 font-semibold">Produk</th>
                <th className="p-3 font-semibold">Harga</th>
                <th className="p-3 font-semibold">Terjual</th>
                <th className="p-3 font-semibold">Rating</th>
                <th className="p-3 font-semibold">Estimasi royalti</th>
              </tr>
            </thead>
            <tbody>
              {myListings.map((l) => (
                <tr key={l.id} className="border-b border-ink/5 last:border-0 hover:bg-cream/60">
                  <td className="p-3">
                    <Link href={`/product/${l.id}`} className="flex items-center gap-3 font-semibold hover:text-jade-700">
                      <span className="h-10 w-10 shrink-0 rounded-lg bg-jade-50 p-0.5">
                        <Mockup type={l.type} colorHex={COLORS[l.colorIds[0]].hex} designUri={l.designUri} />
                      </span>
                      {l.title}
                    </Link>
                  </td>
                  <td className="p-3">{rupiah(l.price)}</td>
                  <td className="p-3">{compact(l.sold)}</td>
                  <td className="p-3">★ {l.rating}</td>
                  <td className="p-3 font-semibold text-jade-800">{rupiah(l.sold * l.price * ROYALTY_SHARE)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
