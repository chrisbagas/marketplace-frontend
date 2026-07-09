"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Mockup, { PHOTO_CREDIT, PRINT_CM, photoInfo, viewsFor, type MockupView } from "@/components/Mockup";
import { COLORS, PRODUCT_TYPES, type ProductType } from "@/lib/data";
import { addToCart } from "@/lib/cart";
import { rupiah } from "@/lib/format";
import { track } from "@/lib/track";
import type { UserDesign } from "@/lib/types";

// Studio Custom untuk PEMBELI: desain sendiri, beli untuk dipakai sendiri.
// Berbeda dengan Studio Kreator: desain di sini tidak dijual di katalog dan
// tidak menghasilkan royalti — murni pemakaian pribadi.

const CUSTOM_FEE = 25000; // biaya cetak satuan di atas harga dasar

export default function CustomStudioPage() {
  const [designUri, setDesignUri] = useState<string>("");
  const [title, setTitle] = useState("Desainku");
  const [type, setType] = useState<ProductType>("kaos");
  const [color, setColor] = useState("putih");
  const [size, setSize] = useState("M");
  const [view, setView] = useState<MockupView>("flat");
  const [widthCm, setWidthCm] = useState(24);
  const [offsetCm, setOffsetCm] = useState(0);
  const [saved, setSaved] = useState<UserDesign[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const pt = PRODUCT_TYPES[type];
  const phys = PRINT_CM[type];
  const colorId = pt.colorIds.includes(color) ? color : pt.colorIds[0];
  const price = pt.base + CUSTOM_FEE;
  const views = viewsFor(type);
  const photo = photoInfo(type, view, colorId);
  const minW = Math.ceil(phys.maxW / 3);
  const maxOffset = Math.max(1, Math.round(phys.maxH * 0.2));

  const loadSaved = () =>
    fetch("/api/user-designs").then((r) => r.json()).then((d) => setSaved(d.designs ?? [])).catch(() => {});

  useEffect(() => { loadSaved(); }, []);

  function pickType(t: ProductType) {
    setType(t);
    setWidthCm(Math.round(PRINT_CM[t].maxW * 0.8));
    setOffsetCm(0);
    setSize(PRODUCT_TYPES[t].sizes[Math.min(1, PRODUCT_TYPES[t].sizes.length - 1)]);
    if (!viewsFor(t).some((v) => v.id === view)) setView("flat");
  }

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4_000_000) return setError("File terlalu besar — maksimal 4 MB.");
    setError("");
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result);
      setDesignUri(dataUrl);
      setTitle(file.name.replace(/\.[^.]+$/, ""));
      track("click", { label: "custom-upload" });
      try {
        const res = await fetch("/api/uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, uri: dataUrl }),
        });
        const data = await res.json();
        if (res.ok && data.url) setDesignUri(data.url);
      } catch { /* pratinjau lokal tetap jalan */ }
    };
    reader.readAsDataURL(file);
  }

  async function saveToProfile() {
    if (!designUri) return setError("Unggah desainmu dulu.");
    setError("");
    const res = await fetch("/api/user-designs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, type, color: colorId, uri: designUri, widthCm, offsetYCm: offsetCm }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error ?? "Gagal menyimpan");
    setNotice("✓ Tersimpan di profilmu — lihat di halaman Profil.");
    track("click", { label: "custom-save" });
    loadSaved();
  }

  function buy() {
    if (!designUri) return setError("Unggah desainmu dulu.");
    setError("");
    addToCart({
      productId: `custom-${Date.now()}`,
      title: `Custom ${pt.label} — ${title}`,
      type,
      color: colorId,
      size,
      qty: 1,
      price,
      designUri,
    });
    track("add_to_cart", { label: "custom", value: price });
    setNotice("✓ Masuk keranjang! Lanjut ke pembayaran lewat ikon keranjang.");
  }

  function pickSaved(d: UserDesign) {
    setDesignUri(d.uri);
    setTitle(d.title);
    pickType(d.type as ProductType);
    setColor(d.color);
    setWidthCm(d.widthCm);
    setOffsetCm(d.offsetYCm);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">Studio Custom 🖌️</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink/60">
        Cetak desainmu sendiri di kaos, hoodie, mug, atau totebag — <b>khusus pemakaian pribadi</b>.
        Desain custom tidak dijual di katalog dan tidak menghasilkan royalti. Mau menjual karya? Pakai{" "}
        <Link href="/designer/studio" className="font-semibold text-jade-700 hover:underline">Studio Kreator</Link>.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5">
          <section className="card p-5">
            <p className="font-bold">1 · Desainmu</p>
            <button onClick={() => fileRef.current?.click()} className="btn-primary btn-sm mt-3 w-full">
              ⬆ Unggah gambar (PNG/JPG/WebP/SVG, maks 4 MB)
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />
            {saved.length > 0 && (
              <>
                <p className="label mt-4">Atau pakai desain tersimpan</p>
                <div className="grid grid-cols-4 gap-2">
                  {saved.slice(0, 8).map((d) => (
                    <button
                      key={d.id}
                      onClick={() => pickSaved(d)}
                      title={d.title}
                      className={`overflow-hidden rounded-xl border-2 bg-white p-1 transition ${designUri === d.uri ? "border-jade-700" : "border-transparent hover:border-ink/20"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={d.uri} alt={d.title} className="aspect-square w-full object-contain" />
                    </button>
                  ))}
                </div>
              </>
            )}
            <label className="label mt-3" htmlFor="judul">Nama desain</label>
            <input id="judul" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </section>

          <section className="card p-5">
            <p className="font-bold">2 · Produk, warna & ukuran</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(Object.keys(PRODUCT_TYPES) as ProductType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => pickType(t)}
                  className={`chip border transition ${type === t ? "border-jade-700 bg-jade-700 text-white" : "border-ink/12 bg-white text-ink/60 hover:border-ink/30"}`}
                >
                  {PRODUCT_TYPES[t].label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              {pt.colorIds.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  aria-label={COLORS[c].label}
                  className={`h-8 w-8 rounded-full border-2 ${colorId === c ? "border-jade-700 ring-2 ring-jade-700/30" : "border-ink/15"}`}
                  style={{ background: COLORS[c].hex }}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {pt.sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`min-w-10 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition ${size === s ? "border-jade-700 bg-jade-700 text-white" : "border-ink/15 bg-white hover:border-ink/35"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <p className="font-bold">3 · Atur cetakan</p>
            <label className="label mt-3 flex justify-between">
              <span>Lebar cetak</span><span className="text-jade-700">{widthCm.toFixed(1).replace(".0", "")} cm</span>
            </label>
            <input type="range" min={minW} max={phys.maxW} step="0.5" value={widthCm} onChange={(e) => setWidthCm(+e.target.value)} className="w-full accent-jade-700" />
            <label className="label mt-3 flex justify-between">
              <span>Posisi vertikal</span>
              <span className="text-jade-700">{offsetCm > 0 ? `${offsetCm} cm ke bawah` : offsetCm < 0 ? `${-offsetCm} cm ke atas` : "tengah"}</span>
            </label>
            <input type="range" min={-maxOffset} max={maxOffset} step="0.5" value={offsetCm} onChange={(e) => setOffsetCm(+e.target.value)} className="w-full accent-jade-700" />
          </section>

          <section className="card p-5">
            <p className="font-bold">4 · Simpan / beli</p>
            <div className="mt-3 flex justify-between rounded-xl bg-cream p-3 text-sm">
              <span className="text-ink/60">Harga dasar {rupiah(pt.base)} + cetak satuan {rupiah(CUSTOM_FEE)}</span>
              <span className="font-extrabold text-jade-800">{rupiah(price)}</span>
            </div>
            {error && <p className="mt-3 rounded-lg bg-coral-50 p-2 text-xs font-semibold text-coral-600">{error}</p>}
            {notice && <p className="mt-3 rounded-lg bg-jade-50 p-2 text-xs font-semibold text-jade-800">{notice}</p>}
            <div className="mt-3 flex gap-2">
              <button onClick={saveToProfile} className="btn-secondary flex-1" data-track="custom-save">💾 Simpan ke profil</button>
              <button onClick={buy} className="btn-primary flex-1" data-track="custom-buy">🛒 Beli · {rupiah(price)}</button>
            </div>
            <p className="mt-2 text-center text-[11px] text-ink/45">Khusus pemakaian pribadi — tidak tayang di katalog, tanpa royalti.</p>
          </section>
        </div>

        <div>
          <div className="sticky top-24">
            <div className="card overflow-hidden bg-gradient-to-b from-jade-50 via-cream to-cream p-6">
              {designUri ? (
                <Mockup
                  type={type}
                  colorHex={COLORS[colorId].hex}
                  colorId={colorId}
                  designUri={designUri}
                  view={view}
                  widthCm={widthCm}
                  offsetYCm={offsetCm}
                  className="mx-auto aspect-square w-full max-w-xl"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center text-center text-sm text-ink/45">
                  Unggah desainmu untuk melihat pratinjau<br />di produk sungguhan 👕
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {views.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  className={`chip border transition ${view === v.id ? "border-jade-700 bg-jade-700 text-white" : "border-ink/12 bg-white text-ink/60 hover:border-ink/30"}`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-center text-xs text-ink/55">
              Cetak <b>{widthCm.toFixed(1).replace(".0", "")} cm</b> lebar · area maks {phys.maxW}×{phys.maxH} cm
            </p>
            {photo && <p className="mt-1 text-center text-[11px] text-ink/40">{PHOTO_CREDIT}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
