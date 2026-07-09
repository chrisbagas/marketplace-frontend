"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Mockup from "@/components/Mockup";
import { COLORS, PRODUCT_TYPES, type ProductType } from "@/lib/data";
import { addToCart } from "@/lib/cart";
import { rupiah, timeAgo } from "@/lib/format";
import { track } from "@/lib/track";
import type { Profile, UserDesign } from "@/lib/types";

const PAYMENTS = ["QRIS", "GoPay", "OVO", "DANA", "ShopeePay", "VA BCA", "VA Mandiri", "VA BNI"];
const COURIERS = ["SiCepat REG", "JNE REG", "AnterAja Next Day"];
const CUSTOM_FEE = 25000;

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [designs, setDesigns] = useState<UserDesign[]>([]);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => {
    fetch("/api/profile").then((r) => r.json()).then((d) => setProfile(d.profile)).catch(() => {});
    fetch("/api/user-designs").then((r) => r.json()).then((d) => setDesigns(d.designs ?? [])).catch(() => {});
  };
  useEffect(load, []);

  async function save() {
    if (!profile) return;
    setBusy(true);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    setBusy(false);
    setSaved(true);
    track("click", { label: "profil-simpan" });
    setTimeout(() => setSaved(false), 2500);
  }

  async function removeDesign(id: number) {
    await fetch(`/api/user-designs/${id}`, { method: "DELETE" });
    load();
  }

  function buyDesign(d: UserDesign) {
    const pt = PRODUCT_TYPES[d.type as ProductType];
    addToCart({
      productId: `custom-${d.id}-${Date.now()}`,
      title: `Custom ${pt.label} — ${d.title}`,
      type: d.type,
      color: d.color,
      size: pt.sizes[Math.min(1, pt.sizes.length - 1)],
      qty: 1,
      price: pt.base + CUSTOM_FEE,
      designUri: d.uri,
    });
    track("add_to_cart", { label: "custom-profil", value: pt.base + CUSTOM_FEE });
  }

  if (!profile) return <div className="mx-auto max-w-4xl px-4 py-16 text-sm text-ink/50">Memuat profil…</div>;

  const set = (patch: Partial<Profile>) => setProfile({ ...profile, ...patch });
  const settings = profile.settings ?? {};

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">Profil Saya</h1>
      <p className="mt-1 text-sm text-ink/55">
        Alamat & preferensimu dipakai otomatis saat checkout. <span className="text-ink/40">(Prototipe tanpa login — profil demo.)</span>
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="card p-5">
          <p className="font-bold">Data & alamat</p>
          <label className="label mt-3" htmlFor="p-nama">Nama lengkap</label>
          <input id="p-nama" className="input" value={profile.name} onChange={(e) => set({ name: e.target.value })} />
          <label className="label mt-3" htmlFor="p-hp">No. WhatsApp</label>
          <input id="p-hp" className="input" value={profile.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="0812xxxxxxx" />
          <label className="label mt-3" htmlFor="p-alamat">Alamat lengkap</label>
          <textarea id="p-alamat" className="input" rows={2} value={profile.address} onChange={(e) => set({ address: e.target.value })} placeholder="Jl. Merdeka No. 10, RT 01/RW 02" />
          <label className="label mt-3" htmlFor="p-kota">Kota / Kabupaten</label>
          <input id="p-kota" className="input" value={profile.city} onChange={(e) => set({ city: e.target.value })} placeholder="Bandung" />
        </section>

        <section className="card p-5">
          <p className="font-bold">Preferensi</p>
          <label className="label mt-3" htmlFor="p-bayar">Metode pembayaran tersimpan</label>
          <select id="p-bayar" className="input" value={profile.preferredPayment} onChange={(e) => set({ preferredPayment: e.target.value })}>
            <option value="">— pilih tiap kali bayar —</option>
            {PAYMENTS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <label className="label mt-3" htmlFor="p-kurir">Kurir favorit</label>
          <select id="p-kurir" className="input" value={profile.preferredCourier} onChange={(e) => set({ preferredCourier: e.target.value })}>
            <option value="">— tanpa preferensi —</option>
            {COURIERS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <p className="label mt-4">Pengaturan situs</p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-jade-700"
              checked={settings.newsletter === true}
              onChange={(e) => set({ settings: { ...settings, newsletter: e.target.checked } })}
            />
            Kirimi aku info desain baru & promo (newsletter)
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-jade-700"
              checked={settings.compactCatalog === true}
              onChange={(e) => set({ settings: { ...settings, compactCatalog: e.target.checked } })}
            />
            Tampilan katalog padat (lebih banyak produk per baris)
          </label>
          <button onClick={save} disabled={busy} className="btn-primary mt-5 w-full" data-track="profil-simpan">
            {busy ? "Menyimpan…" : saved ? "✓ Tersimpan!" : "Simpan profil"}
          </button>
        </section>
      </div>

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Desain Saya 🖌️</h2>
            <p className="text-sm text-ink/55">
              Karya custom untuk dipakai sendiri — tidak dijual di katalog, tanpa royalti.
            </p>
          </div>
          <Link href="/studio" className="btn-primary btn-sm">+ Buat desain custom</Link>
        </div>
        {designs.length === 0 ? (
          <div className="card mt-4 p-10 text-center text-sm text-ink/55">
            Belum ada desain tersimpan. Buat di <Link href="/studio" className="font-bold text-jade-700 hover:underline">Studio Custom</Link> lalu simpan ke profilmu.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {designs.map((d) => {
              const pt = PRODUCT_TYPES[d.type as ProductType];
              return (
                <div key={d.id} className="card overflow-hidden">
                  <div className="bg-jade-50 p-3">
                    <Mockup
                      type={d.type as ProductType}
                      colorHex={COLORS[d.color]?.hex ?? "#eee"}
                      designUri={d.uri}
                      widthCm={d.widthCm}
                      offsetYCm={d.offsetYCm}
                      className="mx-auto aspect-square w-full"
                    />
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-semibold">{d.title}</p>
                    <p className="text-xs text-ink/50">{pt?.label ?? d.type} · {COLORS[d.color]?.label ?? d.color} · {timeAgo(d.t)}</p>
                    <div className="mt-2 flex gap-1.5">
                      <button onClick={() => buyDesign(d)} className="btn-primary btn-sm flex-1" data-track={`beli-custom-${d.id}`}>
                        🛒 {rupiah((pt?.base ?? 95000) + CUSTOM_FEE)}
                      </button>
                      <button onClick={() => removeDesign(d.id)} aria-label="Hapus" className="btn-secondary btn-sm text-coral-600">🗑</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
