"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import Mockup, { PHOTO_CREDIT, photoInfo, viewsFor, type MockupView } from "@/components/Mockup";
import ProductCard from "@/components/ProductCard";
import { COLORS, designerById } from "@/lib/data";
import type { Product, Review } from "@/lib/types";
import { addToCart } from "@/lib/cart";
import { rupiah, compact, timeAgo } from "@/lib/format";
import { track } from "@/lib/track";

export default function ProductDetail({ listing, related }: { listing: Product; related: Product[] }) {
  const [color, setColor] = useState(listing.colorIds[0]);
  const [size, setSize] = useState(listing.sizes[Math.min(1, listing.sizes.length - 1)]);
  const [qty, setQty] = useState(1);
  const [view, setView] = useState<MockupView>("flat");
  const [added, setAdded] = useState(false);
  const [reviewData, setReviewData] = useState<{ reviews: Review[]; avg: number; count: number } | null>(null);
  const designer = designerById(listing.designerId);

  useEffect(() => {
    track("view_product", { label: listing.id, page: `/product/${listing.id}`, value: listing.price });
    fetch(`/api/reviews?listing=${listing.id}`)
      .then((r) => r.json())
      .then(setReviewData)
      .catch(() => {});
  }, [listing.id, listing.price]);

  function handleAdd() {
    addToCart({
      productId: listing.id,
      title: listing.title,
      type: listing.type,
      color,
      size,
      qty,
      price: listing.price,
      designUri: listing.designUri,
    });
    track("add_to_cart", { label: listing.id, value: listing.price * qty });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-sm text-ink/50">
        <Link href="/products" className="hover:text-ink">Jelajah</Link> / {listing.typeLabel} / <span className="text-ink">{listing.title}</span>
      </p>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        {/* preview */}
        <div>
          <div className="card overflow-hidden bg-gradient-to-b from-jade-50 to-cream p-6">
            <Mockup
              type={listing.type}
              colorHex={COLORS[color].hex}
              colorId={color}
              designUri={listing.designUri}
              view={view}
              className="mx-auto aspect-square w-full max-w-md"
            />
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {viewsFor(listing.type).map((v) => (
              <button
                key={v.id}
                onClick={() => { setView(v.id); track("click", { label: `preview-${v.id}`, page: `/product/${listing.id}` }); }}
                className={`chip border transition ${view === v.id ? "border-jade-700 bg-jade-700 text-white" : "border-ink/12 bg-white text-ink/60 hover:border-ink/30"}`}
              >
                {v.label}
              </button>
            ))}
          </div>
          {(() => {
            const photo = photoInfo(listing.type, view, color);
            if (!photo) return null;
            return (
              <div className="mt-2 text-center text-xs">
                {!photo.exact && (
                  <p className="text-sun-600">
                    Warna {COLORS[color].label} belum ada di stok foto — ditampilkan warna terdekat: {photo.def.label}.
                  </p>
                )}
                <p className="text-ink/40">{PHOTO_CREDIT}</p>
              </div>
            );
          })()}
        </div>

        {/* info */}
        <div>
          {listing.badge && <span className="chip bg-sun-400 text-ink">{listing.badge}</span>}
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{listing.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-sm text-ink/60">
            ★ {listing.rating} · {compact(listing.sold)} terjual · oleh
            <Avatar uri={listing.designerAvatar} name={listing.designerName} hue={designer?.hue ?? 152} size={22} />
            <span className="font-semibold text-jade-700">{listing.designerName}</span>{designer && <> ({designer.city})</>}
          </p>
          <p className="mt-4 text-3xl font-extrabold text-jade-800">{rupiah(listing.price)}</p>

          {listing.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {listing.tags.map((t) => (
                <Link
                  key={t}
                  href={`/products?q=${encodeURIComponent(t)}`}
                  className="chip border border-ink/10 bg-white text-xs text-ink/55 hover:border-jade-700 hover:text-jade-700"
                >
                  #{t}
                </Link>
              ))}
            </div>
          )}

          <div className="mt-6">
            <p className="label">Warna: {COLORS[color].label}</p>
            <div className="flex gap-2">
              {listing.colorIds.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  aria-label={COLORS[c].label}
                  className={`h-9 w-9 rounded-full border-2 transition ${color === c ? "border-jade-700 ring-2 ring-jade-700/30" : "border-ink/15"}`}
                  style={{ background: COLORS[c].hex }}
                />
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="label">Ukuran</p>
            <div className="flex flex-wrap gap-2">
              {listing.sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`min-w-11 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    size === s ? "border-jade-700 bg-jade-700 text-white" : "border-ink/15 bg-white hover:border-ink/35"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center rounded-full border border-ink/15 bg-white">
              <button className="px-4 py-2.5 font-bold" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
              <span className="w-8 text-center font-semibold">{qty}</span>
              <button className="px-4 py-2.5 font-bold" onClick={() => setQty(qty + 1)}>+</button>
            </div>
            <button onClick={handleAdd} className="btn-primary flex-1" data-track={`add-${listing.id}`}>
              {added ? "✓ Masuk keranjang!" : `Tambah ke keranjang · ${rupiah(listing.price * qty)}`}
            </button>
          </div>

          <div className="card mt-8 divide-y divide-ink/8">
            {[
              ["Bahan & cetak", listing.type === "mug" ? "Keramik premium 330 ml, cetak sublimasi area 9×8,5 cm, tahan microwave & dishwasher." : "Katun combed 24s / fleece premium, cetak DTG hingga 30×40 cm yang awet dicuci."],
              ["Produksi", "Dicetak sesuai pesanan dalam 1–2 hari kerja setelah pembayaran, lolos QC sebelum dikirim."],
              ["Pengiriman", "3–5 hari kerja ke seluruh Indonesia via JNE, SiCepat, atau AnterAja."],
              ["Royalti kreator", `Setiap pembelian mengirim royalti langsung ke ${listing.designerName}.`],
            ].map(([t, d]) => (
              <div key={t} className="p-4">
                <p className="text-sm font-bold">{t}</p>
                <p className="mt-0.5 text-sm text-ink/60">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ulasan pembeli (hanya yang lolos moderasi) */}
      <section className="mt-16">
        <h2 className="text-xl font-extrabold tracking-tight">
          Ulasan pembeli
          {reviewData && reviewData.count > 0 && (
            <span className="ml-2 text-base font-semibold text-ink/55">
              ★ {reviewData.avg} · {reviewData.count} ulasan terverifikasi
            </span>
          )}
        </h2>
        {!reviewData || reviewData.reviews.length === 0 ? (
          <p className="mt-3 text-sm text-ink/55">
            Belum ada ulasan. Pembeli bisa menilai setelah pesanannya selesai.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {reviewData.reviews.map((rv) => (
              <div key={rv.id} className="card p-4">
                <p className="text-sm">
                  <span className="text-sun-500">{"★".repeat(rv.rating)}{"☆".repeat(5 - rv.rating)}</span>
                  <span className="ml-2 font-semibold">{rv.author}</span>
                  <span className="ml-2 text-xs text-ink/45">{timeAgo(rv.t)} · pembelian terverifikasi</span>
                </p>
                {rv.comment && <p className="mt-2 text-sm text-ink/70">{rv.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-5 text-xl font-extrabold tracking-tight">Karya serupa</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((l) => (
              <ProductCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
