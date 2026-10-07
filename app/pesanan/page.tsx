"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Mockup from "@/components/Mockup";
import { COLORS, type ProductType } from "@/lib/data";
import { getMyOrders, ORDER_STATUS } from "@/lib/orders";
import { fmtDate, rupiah } from "@/lib/format";
import type { Order } from "@/lib/types";

// Riwayat pesanan akun yang sedang login (GET /api/orders/mine).
export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyOrders().then(setOrders).catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">Pesanan saya</h1>
      <p className="mt-1 text-sm text-ink/55">Semua pesanan yang dibuat dari akun ini.</p>

      {error && <p className="card mt-6 p-4 text-sm text-coral-600">{error}</p>}
      {!orders && !error && <div className="mt-6 h-40 animate-pulse rounded-2xl bg-ink/5" />}

      {orders && orders.length === 0 && (
        <div className="card mt-8 p-14 text-center">
          <p className="text-4xl">🧾</p>
          <p className="mt-3 font-bold">Belum ada pesanan</p>
          <Link href="/products" className="btn-primary mt-6 inline-flex">Mulai belanja</Link>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {orders?.map((o) => {
          const st = ORDER_STATUS[o.status];
          const units = o.items.reduce((a, i) => a + i.qty, 0);
          return (
            <Link key={o.id} href={`/order/${o.id}`} className="card block p-4 transition hover:border-jade-700/40 hover:shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold">{o.id}</p>
                  <p className="text-xs text-ink/50">{fmtDate(o.createdAt)} · {units} item · {o.shipping.courier}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`chip ${st.chip}`}>{st.label}</span>
                  <span className="font-extrabold text-jade-800">{rupiah(o.total)}</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {o.items.slice(0, 6).map((it, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-xl bg-cream px-2 py-1.5">
                    <span className="h-9 w-9 shrink-0 rounded-lg bg-jade-50 p-0.5">
                      <Mockup type={it.type as ProductType} colorHex={COLORS[it.color]?.hex ?? "#ddd"} designUri={it.designUri} />
                    </span>
                    <span className="text-xs">
                      <span className="block max-w-40 truncate font-semibold">{it.title}</span>
                      <span className="text-ink/55">{it.size} · {it.qty}×</span>
                    </span>
                  </div>
                ))}
                {o.items.length > 6 && <span className="self-center text-xs text-ink/50">+{o.items.length - 6} lainnya</span>}
              </div>
              {o.payment.status === "pending" && (
                <p className="mt-3 text-xs font-semibold text-sun-600">Belum dibayar — buka untuk membayar →</p>
              )}
              {o.status === "tiba" && (
                <p className="mt-3 text-xs font-semibold text-jade-700">Paket sudah tiba — buka untuk konfirmasi pesanan diterima →</p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
