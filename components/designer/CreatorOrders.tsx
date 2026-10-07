"use client";

import { useEffect, useState } from "react";
import Mockup from "@/components/Mockup";
import { COLORS, type ProductType } from "@/lib/data";
import { getCreatorOrders, ORDER_STATUS } from "@/lib/orders";
import { fmtDate, rupiah, timeAgo } from "@/lib/format";
import type { CreatorOrderItem, CreatorOrderSummary } from "@/lib/types";

// "Pesanan masuk" di dashboard kreator: setiap item pesanan yang memuat produk
// miliknya. Kontak & alamat pembeli tidak ditampilkan — produksi dan
// pengiriman diurus platform.

export default function CreatorOrders() {
  const [data, setData] = useState<{ items: CreatorOrderItem[]; summary: CreatorOrderSummary } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = () => getCreatorOrders().then(setData).catch((e: Error) => setError(e.message));
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, []);

  const s = data?.summary;
  return (
    <section className="mt-10">
      <h2 className="text-xl font-extrabold tracking-tight">Pesanan masuk</h2>
      <p className="mt-0.5 text-sm text-ink/55">
        Produk tokomu yang sudah di-checkout pembeli. Royalti tercatat begitu pembayaran lunas.
      </p>

      {s && (
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {[
            ["Pesanan", String(s.orders)],
            ["Item terjual (lunas)", `${s.paidUnits} / ${s.units} pcs`],
            ["Royalti tercatat", rupiah(s.royaltyBooked)],
            ["Menunggu pembayaran", rupiah(s.royaltyPending)],
          ].map(([label, value]) => (
            <div key={label} className="card p-4">
              <p className="text-xs text-ink/50">{label}</p>
              <p className="mt-1 text-lg font-extrabold">{value}</p>
            </div>
          ))}
        </div>
      )}

      {error && <p className="card mt-4 p-4 text-sm text-coral-600">{error}</p>}
      {data && data.items.length === 0 && (
        <div className="card mt-4 p-8 text-center text-sm text-ink/55">Belum ada pesanan untuk produkmu.</div>
      )}

      {data && data.items.length > 0 && (
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink/8 text-xs text-ink/50">
                <th className="p-3 font-semibold">Produk</th>
                <th className="p-3 font-semibold">Ukuran · Jml</th>
                <th className="p-3 font-semibold">Pembeli</th>
                <th className="p-3 font-semibold">Pesanan</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold">Royalti</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((it, i) => (
                <tr key={`${it.orderId}-${i}`} className="border-t border-ink/5">
                  <td className="p-3">
                    <span className="flex items-center gap-3">
                      <span className="h-10 w-10 shrink-0 rounded-lg bg-jade-50 p-0.5">
                        <Mockup type={it.type as ProductType} colorHex={COLORS[it.color]?.hex ?? "#eee"} designUri={it.designUri} />
                      </span>
                      <span>
                        <span className="block font-semibold">{it.title}</span>
                        <span className="text-xs text-ink/50">{COLORS[it.color]?.label ?? it.color} · {rupiah(it.unitPrice)}/pcs</span>
                      </span>
                    </span>
                  </td>
                  <td className="p-3 font-semibold">{it.size} · {it.qty}×</td>
                  <td className="p-3">{it.buyer}<span className="block text-xs text-ink/50">{it.city}</span></td>
                  <td className="p-3 text-xs">
                    <span className="font-semibold">{it.orderId}</span>
                    <span className="block text-ink/45" title={fmtDate(it.createdAt)}>{timeAgo(it.createdAt)}</span>
                  </td>
                  <td className="p-3"><span className={`chip text-xs ${ORDER_STATUS[it.status].chip}`}>{ORDER_STATUS[it.status].label}</span></td>
                  <td className="p-3">
                    <span className={it.royaltyBooked ? "font-bold text-jade-800" : "text-ink/45"}>{rupiah(it.royalty)}</span>
                    <span className="block text-xs text-ink/45">{it.royaltyBooked ? "tercatat" : "estimasi"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
