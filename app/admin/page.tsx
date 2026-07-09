"use client";

import { useCallback, useEffect, useState } from "react";
import Mockup from "@/components/Mockup";
import { StatTile, LineChart, HBarList, Funnel, VitalTile } from "@/components/charts";
import { COLORS } from "@/lib/data";
import { rupiah, compact, timeAgo, fmtDate } from "@/lib/format";
import type { DesignSubmission, Review } from "@/lib/types";

type Stats = {
  days: { date: string; visits: number; productViews: number; addToCart: number; checkout: number; paid: number; revenue: number }[];
  totals: { visits: number; views: number; carts: number; checkout: number; paid: number; revenue: number };
  aov: number;
  conversion: number;
  topProducts: { id: string; title: string; sold: number; revenue: number }[];
  searches: { term: string; count: number }[];
  devices: { mobile: number; desktop: number; tablet: number };
  vitals: { lcp: number; inp: number; cls: number; ttfb: number; samples: number };
  api: { p50: number; p95: number; errorRate: number; count: number };
  recentEvents: { id: number; t: number; type: string; page?: string; label?: string; session: string; value?: number }[];
  orders: { id: string; createdAt: number; customer: { name: string; city: string }; total: number; status: string; payment: { method: string } }[];
  pendingDesigns: number;
};

const TABS = ["Ringkasan", "Perilaku Pelanggan", "Performa", "Moderasi"] as const;

const EVENT_LABEL: Record<string, { icon: string; text: (e: Stats["recentEvents"][number]) => string }> = {
  page_view: { icon: "👁️", text: (e) => `Membuka halaman ${e.page}` },
  view_product: { icon: "🛍️", text: (e) => `Melihat produk ${e.label}` },
  search: { icon: "🔎", text: (e) => `Mencari “${e.label}”` },
  add_to_cart: { icon: "➕", text: (e) => `Menambah ${e.label} ke keranjang` },
  begin_checkout: { icon: "🧾", text: (e) => `Checkout ${e.label} (${rupiah(e.value ?? 0)})` },
  payment_open: { icon: "💳", text: (e) => `Membuka pembayaran ${e.label}` },
  payment_method: { icon: "🏦", text: (e) => `Memilih metode ${e.label}` },
  purchase: { icon: "✅", text: (e) => `Pembayaran LUNAS ${e.label} (${rupiah(e.value ?? 0)})` },
  click: { icon: "👆", text: (e) => `Klik “${e.label}”` },
};

const ORDER_CHIP: Record<string, string> = {
  "menunggu-pembayaran": "bg-sun-100 text-sun-600",
  dibayar: "bg-jade-100 text-jade-800",
  produksi: "bg-jade-100 text-jade-800",
  dikirim: "bg-jade-100 text-jade-800",
  selesai: "bg-ink/8 text-ink/60",
};

export default function AdminPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Ringkasan");
  const [stats, setStats] = useState<Stats | null>(null);
  const [pending, setPending] = useState<DesignSubmission[]>([]);
  const [pendingReviews, setPendingReviews] = useState<Review[]>([]);

  const load = useCallback(async () => {
    const [s, d, rv] = await Promise.all([
      fetch("/api/stats").then((r) => r.json()),
      fetch("/api/designs?status=review").then((r) => r.json()),
      fetch("/api/reviews?status=review").then((r) => r.json()),
    ]);
    setStats(s);
    setPending(d.designs ?? []);
    setPendingReviews(rv.reviews ?? []);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  async function moderate(id: string, status: "disetujui" | "ditolak") {
    await fetch("/api/designs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, note: status === "ditolak" ? "Kualitas gambar kurang tajam untuk cetak A3." : undefined }),
    });
    load();
  }

  async function moderateReview(id: number, status: "disetujui" | "ditolak") {
    await fetch("/api/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, note: status === "ditolak" ? "Melanggar pedoman komentar." : undefined }),
    });
    load();
  }

  if (!stats) {
    return <div className="mx-auto max-w-6xl px-4 py-16 text-sm text-ink/50">Memuat dashboard…</div>;
  }

  const half = Math.floor(stats.days.length / 2);
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const revSeries = stats.days.map((d) => d.revenue);
  const revDelta = ((sum(revSeries.slice(half)) - sum(revSeries.slice(0, half))) / Math.max(1, sum(revSeries.slice(0, half)))) * 100;
  const ordSeries = stats.days.map((d) => d.paid);
  const ordDelta = ((sum(ordSeries.slice(half)) - sum(ordSeries.slice(0, half))) / Math.max(1, sum(ordSeries.slice(0, half)))) * 100;
  const idr = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}jt` : v >= 1e3 ? `${Math.round(v / 1e3)}rb` : String(v));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10" style={{ background: "transparent" }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Dashboard Admin</h1>
          <p className="text-sm text-ink/55">
            KaryaKita Ops · data 14 hari terakhir · <span className="font-semibold text-jade-700">● live, refresh tiap 5 dtk</span>
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`chip border transition ${tab === t ? "border-jade-700 bg-jade-700 text-white" : "border-ink/12 bg-white text-ink/60 hover:border-ink/30"}`}
          >
            {t}
            {t === "Moderasi" && pending.length + pendingReviews.length > 0 && (
              <span className="ml-1 rounded-full bg-coral-500 px-1.5 text-[10px] font-bold text-white">{pending.length + pendingReviews.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ---- Ringkasan ---- */}
      {tab === "Ringkasan" && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Pendapatan (14 hari)" value={rupiah(stats.totals.revenue)} delta={revDelta} spark={revSeries.slice(-12)} />
            <StatTile label="Pesanan dibayar" value={compact(stats.totals.paid)} delta={ordDelta} spark={ordSeries.slice(-12)} />
            <StatTile label="Rata-rata order (AOV)" value={rupiah(stats.aov)} />
            <StatTile label="Konversi kunjungan → beli" value={`${stats.conversion}%`} />
          </div>

          <div className="card p-5" style={{ background: "var(--viz-surface)" }}>
            <p className="font-bold">Pendapatan harian</p>
            <p className="mb-3 text-xs" style={{ color: "var(--viz-ink-2)" }}>GMV kotor per hari, termasuk transaksi live dari sesi demo ini</p>
            <LineChart points={stats.days.map((d) => ({ label: d.date.slice(5), value: d.revenue }))} format={rupiah} compactFormat={idr} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card p-5" style={{ background: "var(--viz-surface)" }}>
              <p className="mb-4 font-bold">Produk terlaris</p>
              <HBarList
                items={stats.topProducts.map((p) => ({ label: p.title, value: p.sold, sub: rupiah(p.revenue) }))}
                format={compact}
              />
            </div>
            <div className="card overflow-hidden" style={{ background: "var(--viz-surface)" }}>
              <p className="p-5 pb-3 font-bold">Pesanan terbaru</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-120 text-left text-sm">
                  <tbody>
                    {stats.orders.slice(0, 7).map((o) => (
                      <tr key={o.id} className="border-t border-ink/5">
                        <td className="px-5 py-2.5">
                          <a href={`/order/${o.id}`} className="font-semibold hover:text-jade-700">{o.id}</a>
                          <p className="text-xs text-ink/50">{o.customer.name} · {o.customer.city}</p>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-ink/55">{fmtDate(o.createdAt)}<br />{o.payment.method}</td>
                        <td className="px-3 py-2.5 font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>{rupiah(o.total)}</td>
                        <td className="px-5 py-2.5"><span className={`chip ${ORDER_CHIP[o.status] ?? "bg-ink/8"}`}>{o.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---- Perilaku ---- */}
      {tab === "Perilaku Pelanggan" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="card p-5" style={{ background: "var(--viz-surface)" }}>
              <p className="font-bold">Funnel belanja (14 hari)</p>
              <p className="mb-4 text-xs" style={{ color: "var(--viz-ink-2)" }}>Dari kunjungan sampai pembayaran lunas</p>
              <Funnel
                stages={[
                  { label: "Kunjungan", value: stats.totals.visits },
                  { label: "Lihat produk", value: stats.totals.views },
                  { label: "Tambah keranjang", value: stats.totals.carts },
                  { label: "Checkout", value: stats.totals.checkout },
                  { label: "Dibayar", value: stats.totals.paid },
                ]}
              />
            </div>
            <div className="card p-5" style={{ background: "var(--viz-surface)" }}>
              <p className="mb-4 font-bold">Pencarian terpopuler</p>
              <HBarList items={stats.searches.map((s) => ({ label: `“${s.term}”`, value: s.count }))} />
            </div>
            <div className="card p-5" style={{ background: "var(--viz-surface)" }}>
              <p className="mb-4 font-bold">Perangkat pengunjung</p>
              <HBarList
                items={[
                  { label: "📱 Mobile", value: stats.devices.mobile },
                  { label: "💻 Desktop", value: stats.devices.desktop },
                  { label: "📟 Tablet", value: stats.devices.tablet },
                ]}
              />
            </div>
          </div>

          <div className="card flex max-h-[720px] flex-col overflow-hidden" style={{ background: "var(--viz-surface)" }}>
            <div className="p-5 pb-3">
              <p className="font-bold">Aliran aktivitas live</p>
              <p className="text-xs" style={{ color: "var(--viz-ink-2)" }}>
                Klik-klik kamu di toko muncul di sini dalam ±5 detik — coba buka produk atau lakukan pencarian 😉
              </p>
            </div>
            <div className="flex-1 divide-y divide-ink/5 overflow-y-auto">
              {stats.recentEvents.length === 0 && (
                <p className="p-5 text-sm text-ink/50">Belum ada aktivitas di sesi ini. Jelajahi toko dulu, lalu kembali ke sini.</p>
              )}
              {stats.recentEvents.map((e) => {
                const meta = EVENT_LABEL[e.type] ?? { icon: "•", text: () => e.type };
                return (
                  <div key={e.id} className="flex items-start gap-3 px-5 py-2.5 text-sm">
                    <span>{meta.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{meta.text(e)}</span>
                      <span className="text-xs text-ink/45">sesi {e.session} · {timeAgo(e.t)}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ---- Performa ---- */}
      {tab === "Performa" && (
        <div className="mt-6 space-y-6">
          <div>
            <p className="font-bold">Core Web Vitals</p>
            <p className="text-xs text-ink/55">
              p75 dari {stats.vitals.samples} sampel browser nyata (dikumpulkan komponen Monitor di setiap halaman)
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <VitalTile name="LCP — Largest Contentful Paint" value={stats.vitals.lcp} display={`${(stats.vitals.lcp / 1000).toFixed(2)} dtk`} thresholds={[2500, 4000]} desc="Waktu sampai konten utama terlihat. Target < 2,5 dtk." />
              <VitalTile name="INP — Interaction to Next Paint" value={stats.vitals.inp} display={`${Math.round(stats.vitals.inp)} ms`} thresholds={[200, 500]} desc="Respons halaman terhadap interaksi. Target < 200 ms." />
              <VitalTile name="CLS — Cumulative Layout Shift" value={stats.vitals.cls} display={stats.vitals.cls.toFixed(3)} thresholds={[0.1, 0.25]} desc="Kestabilan layout saat loading. Target < 0,1." />
              <VitalTile name="TTFB — Time to First Byte" value={stats.vitals.ttfb} display={`${Math.round(stats.vitals.ttfb)} ms`} thresholds={[800, 1800]} desc="Kecepatan respons server. Target < 800 ms." />
            </div>
          </div>

          <div>
            <p className="font-bold">Kesehatan API backend (24 jam)</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile label="Latensi median (p50)" value={`${stats.api.p50} ms`} />
              <StatTile label="Latensi p95" value={`${stats.api.p95} ms`} />
              <StatTile label="Error rate" value={`${stats.api.errorRate}%`} />
              <StatTile label="Total request" value={compact(stats.api.count)} />
            </div>
          </div>

          <div className="card p-5 text-sm text-ink/60" style={{ background: "var(--viz-surface)" }}>
            <p className="font-bold text-ink">Bagaimana data ini dikumpulkan?</p>
            <p className="mt-1">
              Setiap halaman memasang <code className="rounded bg-ink/5 px-1">PerformanceObserver</code> (komponen{" "}
              <code className="rounded bg-ink/5 px-1">Monitor</code>) yang mengirim Web Vitals ke{" "}
              <code className="rounded bg-ink/5 px-1">/api/vitals</code>, dan setiap route API mencatat durasinya sendiri.
              Di produksi, ganti dengan Sentry/Grafana — kontrak datanya sudah sama.
            </p>
          </div>
        </div>
      )}

      {/* ---- Moderasi ---- */}
      {tab === "Moderasi" && (
        <div className="mt-6">
          <p className="text-sm text-ink/55">
            Desain yang diajukan kreator dari Studio Mockup menunggu kurasi di sini.
          </p>
          {pending.length === 0 ? (
            <div className="card mt-4 p-10 text-center text-sm text-ink/55">
              Tidak ada antrean kurasi. 🎉 Coba ajukan desain dari <a href="/designer/studio" className="font-bold text-jade-700 hover:underline">Studio Mockup</a> lalu kembali ke sini.
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pending.map((d) => (
                <div key={d.id} className="card overflow-hidden">
                  <div className="bg-jade-50 p-4">
                    <Mockup type={d.type as never} colorHex={COLORS[d.color]?.hex ?? "#f4f2ec"} designUri={d.uri} className="mx-auto aspect-square w-full max-w-52" />
                  </div>
                  <div className="p-4">
                    <p className="font-semibold">{d.title}</p>
                    <p className="text-xs text-ink/55">oleh {d.designer} · {d.type} · {rupiah(d.price)} · {timeAgo(d.t)}</p>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => moderate(d.id, "disetujui")} className="btn-primary btn-sm flex-1">✓ Setujui</button>
                      <button onClick={() => moderate(d.id, "ditolak")} className="btn-secondary btn-sm flex-1 text-coral-600">✕ Tolak</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h2 className="mt-10 text-lg font-extrabold tracking-tight">Ulasan pembeli</h2>
          <p className="text-sm text-ink/55">Ulasan hanya tayang di halaman produk setelah disetujui di sini.</p>
          {pendingReviews.length === 0 ? (
            <div className="card mt-4 p-8 text-center text-sm text-ink/55">
              Tidak ada ulasan menunggu moderasi. Pembeli bisa menilai setelah pesanannya <b>selesai</b>.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {pendingReviews.map((rv) => (
                <div key={rv.id} className="card flex flex-wrap items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-semibold">{rv.author}</span>
                      <span className="ml-2 text-sun-500">{"★".repeat(rv.rating)}{"☆".repeat(5 - rv.rating)}</span>
                      <span className="ml-2 text-xs text-ink/45">{rv.listingId} · pesanan {rv.orderId} · {timeAgo(rv.t)}</span>
                    </p>
                    <p className="mt-1 text-sm text-ink/70">{rv.comment || <em className="text-ink/40">tanpa komentar</em>}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => moderateReview(rv.id, "disetujui")} className="btn-primary btn-sm">✓ Setujui</button>
                    <button onClick={() => moderateReview(rv.id, "ditolak")} className="btn-secondary btn-sm text-coral-600">✕ Tolak</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
