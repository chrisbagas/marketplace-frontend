"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Mockup, { PHOTO_CREDIT, PRINT_CM, photoInfo, viewsFor, type MockupView } from "@/components/Mockup";
import { getCategories, type Category } from "@/lib/api";
import { COLORS, DESIGNS, PRODUCT_TYPES, type ProductType } from "@/lib/data";
import { rupiah } from "@/lib/format";
import { track } from "@/lib/track";

// Studio Mockup: designers preview artwork on product flats, on real photos
// (blank tee / worn by a real model), tweak the print in real centimeters,
// then submit the design for curation.

export default function StudioPage() {
  const [designUri, setDesignUri] = useState<string>(DESIGNS[0].uri);
  const [title, setTitle] = useState<string>(DESIGNS[0].title + " — Remix");
  const [type, setType] = useState<ProductType>("kaos");
  const [color, setColor] = useState("putih");
  const [view, setView] = useState<MockupView>("flat");
  const [widthCm, setWidthCm] = useState(24);
  const [offsetCm, setOffsetCm] = useState(0);
  const [margin, setMargin] = useState(34000);
  const [cats, setCats] = useState<Category[]>([]);
  const [selCats, setSelCats] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const pt = PRODUCT_TYPES[type];
  const phys = PRINT_CM[type];
  const colorId = pt.colorIds.includes(color) ? color : pt.colorIds[0];
  const price = pt.base + margin;
  const views = viewsFor(type);
  const photo = photoInfo(type, view, colorId);
  const minW = Math.ceil(phys.maxW / 3);
  const maxOffset = Math.max(1, Math.round(phys.maxH * 0.2));

  useEffect(() => {
    // deep-link support: /designer/studio?view=model|photo-model|photo-flat
    const v = new URLSearchParams(window.location.search).get("view");
    if (v && ["flat", "model", "photo-flat", "photo-model"].includes(v)) setView(v as MockupView);
    getCategories().then(setCats).catch(() => {});
  }, []);

  function toggleCat(id: string) {
    setSelCats((cur) =>
      cur.includes(id) ? cur.filter((c) => c !== id) : cur.length >= 3 ? cur : [...cur, id]
    );
  }

  function pickType(t: ProductType) {
    setType(t);
    setWidthCm(Math.round(PRINT_CM[t].maxW * 0.8));
    setOffsetCm(0);
    if (!viewsFor(t).some((v) => v.id === view)) setView("flat");
  }

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4_000_000) {
      setError("File terlalu besar — maksimal 4 MB.");
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result);
      setDesignUri(dataUrl); // pratinjau instan selagi diunggah
      setTitle(file.name.replace(/\.[^.]+$/, ""));
      track("click", { label: "studio-upload" });
      // simpan ke server (folder uploads/ backend) supaya database hanya
      // menyimpan URL, bukan data gambar raksasa
      try {
        const res = await fetch("/api/uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, uri: dataUrl }),
        });
        const data = await res.json();
        if (res.ok && data.url) setDesignUri(data.url);
        else setError(data.error ?? "Gagal mengunggah — pratinjau tetap jalan, tapi tidak tersimpan di server.");
      } catch {
        setError("Server upload tidak terjangkau — pratinjau tetap jalan dari file lokal.");
      }
    };
    reader.readAsDataURL(file);
  }

  async function submit() {
    setError("");
    const res = await fetch("/api/designs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        designer: "Raka Wijaya",
        type,
        color: colorId,
        price,
        uri: designUri,
        categories: selCats,
        tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
      }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error ?? "Gagal mengirim desain");
    setSent(data.design.id);
    track("click", { label: "studio-submit" });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-sm text-ink/50">
        <Link href="/designer" className="hover:text-ink">Studio Kreator</Link> / <span className="text-ink">Studio Mockup</span>
      </p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Studio Mockup 🎨</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink/60">
        Lihat karyamu di produk, di foto asli, atau dipakai model sungguhan. Ukuran cetak diatur dalam sentimeter
        sesuai area cetak sebenarnya.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[360px_1fr]">
        {/* controls */}
        <div className="space-y-5">
          <section className="card p-5">
            <p className="font-bold">1 · Pilih karya</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {DESIGNS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => { setDesignUri(d.uri); setTitle(d.title + " — Remix"); }}
                  className={`overflow-hidden rounded-xl border-2 bg-white p-1 transition ${designUri === d.uri ? "border-jade-700" : "border-transparent hover:border-ink/20"}`}
                  title={d.title}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.uri} alt={d.title} className="aspect-square w-full object-contain" />
                </button>
              ))}
            </div>
            <button onClick={() => fileRef.current?.click()} className="btn-secondary btn-sm mt-3 w-full">
              ⬆ Unggah karyamu (PNG/JPG/WebP/SVG, maks 4 MB)
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />
          </section>

          <section className="card p-5">
            <p className="font-bold">2 · Pilih produk & warna</p>
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
          </section>

          <section className="card p-5">
            <p className="font-bold">3 · Atur cetakan</p>
            <p className="mt-1 text-xs text-ink/50">
              Area cetak maksimum {pt.label.toLowerCase()}: <b>{phys.maxW} × {phys.maxH} cm</b>
            </p>
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
            <p className="font-bold">4 · Kategori & tag</p>
            <p className="mt-1 text-xs text-ink/50">Kategori membantu pembeli menjelajah (maks 3); tag bebas ala hashtag untuk pencarian.</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {cats.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCat(c.id)}
                  className={`chip border text-xs transition ${
                    selCats.includes(c.id)
                      ? "border-jade-700 bg-jade-700 text-white"
                      : "border-ink/12 bg-white text-ink/60 hover:border-ink/30"
                  }`}
                >
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
            <label className="label mt-3" htmlFor="tags">Tag (pisahkan dengan koma)</label>
            <input
              id="tags"
              className="input"
              placeholder="senja, retro, gunung"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </section>

          <section className="card p-5">
            <p className="font-bold">5 · Harga & ajukan</p>
            <label className="label mt-3" htmlFor="judul">Judul produk</label>
            <input id="judul" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
            <label className="label mt-3 flex justify-between">
              <span>Margin kamu (royalti)</span><span className="text-jade-700">{rupiah(margin)}</span>
            </label>
            <input type="range" min="10000" max="80000" step="2000" value={margin} onChange={(e) => setMargin(+e.target.value)} className="w-full accent-jade-700" />
            <div className="mt-3 flex justify-between rounded-xl bg-cream p-3 text-sm">
              <span className="text-ink/60">Harga dasar {rupiah(pt.base)} + margin</span>
              <span className="font-extrabold text-jade-800">{rupiah(price)}</span>
            </div>
            {error && <p className="mt-3 rounded-lg bg-coral-50 p-2 text-xs font-semibold text-coral-600">{error}</p>}
            {sent ? (
              <div className="mt-4 rounded-xl bg-jade-50 p-3 text-sm">
                <p className="font-bold text-jade-800">✓ Terkirim untuk kurasi!</p>
                <p className="mt-1 text-ink/60">Tim admin akan meninjau desainmu. Pantau statusnya di <Link href="/designer" className="font-semibold text-jade-700 hover:underline">dashboard kreator</Link>.</p>
              </div>
            ) : (
              <button onClick={submit} className="btn-primary mt-4 w-full" data-track="studio-submit">
                Ajukan desain untuk dijual →
              </button>
            )}
          </section>
        </div>

        {/* preview */}
        <div>
          <div className="sticky top-24">
            <div className="card overflow-hidden bg-gradient-to-b from-jade-50 via-cream to-cream p-6">
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
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {views.map((v) => (
                <button
                  key={v.id}
                  onClick={() => { setView(v.id); track("click", { label: `studio-view-${v.id}` }); }}
                  className={`chip border transition ${view === v.id ? "border-jade-700 bg-jade-700 text-white" : "border-ink/12 bg-white text-ink/60 hover:border-ink/30"}`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-center text-xs text-ink/55">
              Cetak <b>{widthCm.toFixed(1).replace(".0", "")} cm</b> lebar
              {offsetCm !== 0 && <> · digeser {Math.abs(offsetCm)} cm {offsetCm > 0 ? "ke bawah" : "ke atas"}</>}
              {" "}· area maks {phys.maxW}×{phys.maxH} cm
            </p>
            {photo && !photo.exact && (
              <p className="mt-1 text-center text-xs text-sun-600">
                Warna {COLORS[colorId].label} belum ada di stok foto — ditampilkan warna terdekat: {photo.def.label}.
              </p>
            )}
            {photo && <p className="mt-1 text-center text-[11px] text-ink/40">{PHOTO_CREDIT}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
