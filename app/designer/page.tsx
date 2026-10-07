"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import Mockup from "@/components/Mockup";
import { StatTile, LineChart } from "@/components/charts";
import { COLORS, PRODUCT_TYPES } from "@/lib/data";
import { getProducts } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { rupiah, compact, timeAgo } from "@/lib/format";
import type { DesignSubmission, DayStat, Product } from "@/lib/types";

// Dashboard milik kreator yang sedang login (profil toko dari /api/auth/me).
// Admin juga boleh membuka halaman ini; tanpa profil toko, daftar produknya kosong.
const ROYALTY_SHARE = 0.12;

const STATUS_CHIP: Record<string, string> = {
  review: "bg-sun-100 text-sun-600",
  disetujui: "bg-jade-100 text-jade-800",
  ditolak: "bg-coral-100 text-coral-600",
};

export default function DesignerDashboard() {
  const [days, setDays] = useState<DayStat[]>([]);
  const [subs, setSubs] = useState<DesignSubmission[]>([]);
  const [myListings, setMyListings] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const { user } = useSession();
  const ME = user?.designer ?? {
    id: "",
    name: user?.name ?? "",
    city: "Tanpa profil toko",
    hue: 152,
    followers: 0,
    rating: 0,
    avatarUri: "",
  };

  const loadListings = () =>
    ME.id ? getProducts({ designer: ME.id }).then(setMyListings).catch(() => {}) : setMyListings([]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/stats").then((r) => r.json()).then((d) => setDays(d.days ?? []));
    loadListings();
    const loadSubs = () => fetch("/api/designs").then((r) => r.json()).then((d) => setSubs(d.designs ?? []));
    loadSubs();
    const t = setInterval(loadSubs, 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, ME.id]);
  const totalSold = myListings.reduce((a, l) => a + l.sold, 0);
  const royalty = days.map((d) => ({ label: d.date.slice(5), value: Math.round(d.revenue * ROYALTY_SHARE * 0.34) }));
  const balance = royalty.reduce((a, r) => a + r.value, 0);
  const spark = royalty.map((r) => r.value);
  const half = Math.floor(royalty.length / 2);
  const recent = spark.slice(half).reduce((a, b) => a + b, 0);
  const prev = spark.slice(0, half).reduce((a, b) => a + b, 0) || 1;

  if (!user) return <div className="mx-auto h-96 max-w-6xl animate-pulse px-4 py-10" />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar uri={ME.avatarUri} name={ME.name} hue={ME.hue} size={56} className="shadow-md ring-2 ring-white" />
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
        <h2 className="text-xl font-extrabold tracking-tight">Kelola produk</h2>
        <p className="mt-0.5 text-sm text-ink/55">
          Ubah nama, harga, warna, atau nonaktifkan listing. Desainnya sendiri tidak bisa diganti — ajukan karya baru lewat Studio.
        </p>
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full min-w-130 text-left text-sm">
            <thead>
              <tr className="border-b border-ink/8 text-xs text-ink/50">
                <th className="p-3 font-semibold">Produk</th>
                <th className="p-3 font-semibold">Harga</th>
                <th className="p-3 font-semibold">Terjual</th>
                <th className="p-3 font-semibold">Rating</th>
                <th className="p-3 font-semibold">Estimasi royalti</th>
                <th className="p-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {myListings.map((l) => (
                <tr key={l.id} className={`border-b border-ink/5 last:border-0 hover:bg-cream/60 ${l.active === false ? "opacity-50" : ""}`}>
                  <td className="p-3">
                    <Link href={`/product/${l.id}`} className="flex items-center gap-3 font-semibold hover:text-jade-700">
                      <span className="h-10 w-10 shrink-0 rounded-lg bg-jade-50 p-0.5">
                        <Mockup type={l.type} colorHex={COLORS[l.colorIds[0]]?.hex ?? "#eee"} designUri={l.designUri} />
                      </span>
                      <span>
                        {l.title}
                        {l.active === false && <span className="ml-2 chip bg-ink/8 text-[10px] text-ink/50">nonaktif</span>}
                      </span>
                    </Link>
                  </td>
                  <td className="p-3">{rupiah(l.price)}</td>
                  <td className="p-3">{compact(l.sold)}</td>
                  <td className="p-3">★ {l.rating}</td>
                  <td className="p-3 font-semibold text-jade-800">{rupiah(l.sold * l.price * ROYALTY_SHARE)}</td>
                  <td className="p-3">
                    <button onClick={() => setEditing(l)} className="btn-secondary btn-sm" data-track={`edit-${l.id}`}>✎ Ubah</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {editing && (
          <ListingEditor
            key={editing.id}
            listing={editing}
            onClose={() => setEditing(null)}
            onSaved={() => { setEditing(null); loadListings(); }}
          />
        )}
      </section>
    </div>
  );
}

function ListingEditor({ listing, onClose, onSaved }: { listing: Product; onClose: () => void; onSaved: () => void }) {
  const pt = PRODUCT_TYPES[listing.type];
  const [title, setTitle] = useState(listing.title);
  const [price, setPrice] = useState(listing.price);
  const [colors, setColors] = useState<string[]>(listing.colorIds);
  const [active, setActive] = useState(listing.active !== false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function toggleColor(c: string) {
    setColors((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));
  }

  async function save() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/listings/${listing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, price, colorIds: colors, active }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Gagal menyimpan");
    onSaved();
  }

  return (
    <div className="card mt-4 border-2 border-jade-700/30 p-5">
      <div className="flex items-center justify-between">
        <p className="font-bold">Ubah listing · {listing.id}</p>
        <button onClick={onClose} className="text-sm text-ink/50 hover:text-ink">✕ Tutup</button>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="edit-title">Nama produk</label>
          <input id="edit-title" className="input" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
          <label className="label mt-3 flex justify-between" htmlFor="edit-price">
            <span>Harga jual</span>
            <span className="text-ink/45">min {rupiah(pt.base)} (harga dasar)</span>
          </label>
          <input
            id="edit-price"
            type="number"
            className="input"
            min={pt.base}
            step={1000}
            value={price}
            onChange={(e) => setPrice(+e.target.value)}
          />
          <p className="mt-1 text-xs text-ink/50">Royalti kamu ≈ {rupiah(Math.max(0, Math.round(price * ROYALTY_SHARE)))} per penjualan.</p>
        </div>
        <div>
          <p className="label">Warna tersedia</p>
          <div className="flex flex-wrap gap-2">
            {pt.colorIds.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleColor(c)}
                aria-pressed={colors.includes(c)}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                  colors.includes(c) ? "border-jade-700 bg-jade-50 text-jade-800" : "border-ink/12 bg-white text-ink/45"
                }`}
              >
                <span className="h-4 w-4 rounded-full border border-ink/15" style={{ background: COLORS[c].hex }} />
                {COLORS[c].label}
              </button>
            ))}
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-jade-700" />
            Tayang di katalog
          </label>
          <p className="mt-1 text-xs text-ink/50">Nonaktifkan untuk menyembunyikan dari pembeli tanpa menghapus data penjualan.</p>
        </div>
      </div>
      {error && <p className="mt-3 rounded-lg bg-coral-50 p-2 text-xs font-semibold text-coral-600">{error}</p>}
      <button onClick={save} disabled={busy} className="btn-primary mt-4" data-track="simpan-listing">
        {busy ? "Menyimpan…" : "Simpan perubahan"}
      </button>
    </div>
  );
}
