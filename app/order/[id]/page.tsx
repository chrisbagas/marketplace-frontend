"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Mockup from "@/components/Mockup";
import { COLORS, type ProductType } from "@/lib/data";
import { rupiah, fmtDate, fmtTime } from "@/lib/format";
import type { Order } from "@/lib/types";

const STEPS: { key: Order["status"]; label: string; icon: string }[] = [
  { key: "menunggu-pembayaran", label: "Menunggu pembayaran", icon: "💳" },
  { key: "dibayar", label: "Dibayar", icon: "✅" },
  { key: "produksi", label: "Produksi (cetak DTG)", icon: "🖨️" },
  { key: "dikirim", label: "Dikirim", icon: "📦" },
  { key: "selesai", label: "Selesai", icon: "🎉" },
];

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/orders/${id}`);
    if (!res.ok) return setMissing(true);
    setOrder((await res.json()).order);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function advance() {
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "advance" }),
    });
    load();
  }

  if (missing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="font-bold">Pesanan tidak ditemukan.</p>
        <p className="mt-1 text-sm text-ink/55">Catatan: data prototipe tersimpan di memori dan hilang saat server di-restart.</p>
        <Link href="/products" className="btn-primary mt-5 inline-flex">Kembali belanja</Link>
      </div>
    );
  }

  if (!order) return <div className="mx-auto max-w-3xl px-4 py-16" />;

  const activeIdx = STEPS.findIndex((s) => s.key === order.status);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Pesanan {order.id}</h1>
          <p className="text-sm text-ink/55">Dibuat {fmtDate(order.createdAt)} · {fmtTime(order.createdAt)}</p>
        </div>
        <span className={`chip ${order.status === "selesai" ? "bg-jade-100 text-jade-800" : "bg-sun-100 text-sun-600"}`}>
          {STEPS[activeIdx]?.icon} {STEPS[activeIdx]?.label}
        </span>
      </div>

      {/* progress */}
      <div className="card mt-6 p-5">
        <div className="flex items-center">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm ${
                    i <= activeIdx ? "bg-jade-700 text-white" : "bg-ink/8 text-ink/40"
                  }`}
                >
                  {i < activeIdx ? "✓" : s.icon}
                </span>
                <span className={`mt-1.5 hidden max-w-20 text-center text-[10px] font-semibold sm:block ${i <= activeIdx ? "text-ink" : "text-ink/40"}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && <div className={`mx-1 h-1 flex-1 rounded ${i < activeIdx ? "bg-jade-700" : "bg-ink/8"}`} />}
            </div>
          ))}
        </div>
        {order.status !== "selesai" && order.payment.status === "paid" && (
          <button onClick={advance} className="btn-secondary btn-sm mt-5" data-track="advance-order">
            ▶ Simulasikan tahap berikutnya
          </button>
        )}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="card p-5">
          <p className="font-bold">Item</p>
          <div className="mt-3 space-y-3">
            {order.items.map((it, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-16 w-16 shrink-0 rounded-lg bg-jade-50 p-0.5">
                  <Mockup type={it.type as ProductType} colorHex={COLORS[it.color]?.hex ?? "#ddd"} designUri={it.designUri} />
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate font-semibold">{it.title}</p>
                  <p className="text-xs text-ink/55">{COLORS[it.color]?.label ?? it.color} · {it.size} · {it.qty}×</p>
                </div>
                <p className="text-sm font-bold">{rupiah(it.price * it.qty)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1 border-t border-ink/8 pt-3 text-sm">
            <div className="flex justify-between"><span className="text-ink/60">Subtotal</span><span>{rupiah(order.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-ink/60">Ongkir ({order.shipping.courier})</span><span>{rupiah(order.shipping.cost)}</span></div>
            <div className="flex justify-between font-extrabold"><span>Total</span><span className="text-jade-800">{rupiah(order.total)}</span></div>
            <p className="pt-1 text-xs text-ink/45">
              Pembayaran: {order.payment.method} · {order.payment.status === "paid" ? "LUNAS" : "MENUNGGU"} · ref {order.payment.ref}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <p className="font-bold">Dikirim ke</p>
            <p className="mt-2 text-sm font-semibold">{order.customer.name} · {order.customer.phone}</p>
            <p className="text-sm text-ink/60">{order.customer.address}, {order.customer.city}</p>
          </div>
          <div className="card p-5">
            <p className="font-bold">Riwayat</p>
            <ol className="mt-3 space-y-3">
              {[...order.timeline].reverse().map((t, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${i === 0 ? "bg-jade-600" : "bg-ink/20"}`} />
                  <span>
                    <span className="block font-medium">{t.status}</span>
                    <span className="text-xs text-ink/50">{fmtDate(t.t)} · {fmtTime(t.t)}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
