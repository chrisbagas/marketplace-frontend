"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Mockup from "@/components/Mockup";
import { COLORS, PRODUCT_TYPES, type ProductType } from "@/lib/data";
import { getCart, MAX_QTY, removeItem, updateQty, updateSize, type CartItem } from "@/lib/cart";
import { useSession } from "@/lib/auth";
import { rupiah } from "@/lib/format";

export default function CartPage() {
  const [items, setItems] = useState<CartItem[] | null>(null);
  const { user } = useSession();

  useEffect(() => {
    const update = () => setItems(getCart());
    update();
    window.addEventListener("cart:change", update);
    return () => window.removeEventListener("cart:change", update);
  }, []);

  if (items === null) return <div className="mx-auto max-w-4xl px-4 py-16" />;

  const subtotal = items.reduce((a, i) => a + i.price * i.qty, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">Keranjang</h1>

      {items.length === 0 ? (
        <div className="card mt-8 p-14 text-center">
          <p className="text-4xl">🛒</p>
          <p className="mt-3 font-bold">Keranjangmu masih kosong</p>
          <p className="mt-1 text-sm text-ink/55">Yuk cari karya kreator lokal favoritmu.</p>
          <Link href="/products" className="btn-primary mt-6 inline-flex">Jelajahi produk</Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            {items.map((it, idx) => (
              <div key={`${it.productId}-${it.color}-${it.size}`} className="card flex items-center gap-4 p-4">
                <div className="h-24 w-24 shrink-0 rounded-xl bg-jade-50 p-1">
                  <Mockup type={it.type as ProductType} colorHex={COLORS[it.color]?.hex ?? "#ddd"} designUri={it.designUri} />
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/product/${it.productId}`} className="font-semibold hover:text-jade-700">{it.title}</Link>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink/55">
                    <span>{COLORS[it.color]?.label ?? it.color}</span>
                    {(PRODUCT_TYPES[it.type as ProductType]?.sizes.length ?? 0) > 1 ? (
                      <select
                        aria-label={`Ukuran ${it.title}`}
                        className="rounded-lg border border-ink/15 bg-white px-2 py-0.5 text-xs font-semibold text-ink"
                        value={it.size}
                        onChange={(e) => updateSize(idx, e.target.value)}
                      >
                        {PRODUCT_TYPES[it.type as ProductType].sizes.map((s) => (
                          <option key={s} value={s}>Ukuran {s}</option>
                        ))}
                      </select>
                    ) : (
                      <span>· {it.size}</span>
                    )}
                    {it.qty > 1 && <span>· {rupiah(it.price)}/pcs</span>}
                  </div>
                  <p className="mt-1 font-bold">{rupiah(it.price * it.qty)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-full border border-ink/15">
                    <button className="px-3 py-1.5 font-bold" onClick={() => updateQty(idx, it.qty - 1)}>−</button>
                    <span className="w-6 text-center text-sm font-semibold">{it.qty}</span>
                    <button className="px-3 py-1.5 font-bold disabled:opacity-30" disabled={it.qty >= MAX_QTY} onClick={() => updateQty(idx, it.qty + 1)}>+</button>
                  </div>
                  <button className="text-ink/35 transition hover:text-coral-600" onClick={() => removeItem(idx)} aria-label="Hapus">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="card h-fit p-5">
            <p className="font-bold">Ringkasan</p>
            <div className="mt-3 flex justify-between text-sm">
              <span className="text-ink/60">Subtotal ({items.reduce((a, i) => a + i.qty, 0)} item)</span>
              <span className="font-semibold">{rupiah(subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-ink/45">Ongkir & voucher dihitung saat checkout.</p>
            <Link href="/checkout" className="btn-primary mt-5 w-full" data-track="ke-checkout">
              Lanjut ke pembayaran →
            </Link>
            {!user && <p className="mt-2 text-center text-xs text-ink/55">Kamu akan diminta masuk dulu — keranjang tetap tersimpan.</p>}
            <p className="mt-3 text-center text-xs text-ink/45">QRIS · GoPay · OVO · DANA · Virtual Account</p>
          </div>
        </div>
      )}
    </div>
  );
}
