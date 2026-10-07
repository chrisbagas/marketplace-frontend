"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { COLORS } from "@/lib/data";
import { advanceOrder, getAllOrders, ORDER_STATUS, ORDER_STATUSES } from "@/lib/orders";
import { fmtDate, fmtTime, rupiah } from "@/lib/format";
import type { Order } from "@/lib/types";

// Tab "Pesanan" di dashboard admin: semua pesanan yang sudah di-checkout,
// dengan filter status, pencarian, detail pengiriman, dan tombol majukan status.

const PAGE = 20;

export default function OrdersPanel() {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [term, setTerm] = useState(""); // q setelah debounce
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<{ orders: Order[]; total: number } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => { setTerm(q.trim()); setOffset(0); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(() => {
    getAllOrders({ status, q: term, limit: PAGE, offset })
      .then((d) => { setData(d); setError(""); })
      .catch((e: Error) => setError(e.message));
  }, [status, term, offset]);

  useEffect(() => {
    load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [load]);

  async function advance(id: string) {
    setBusy(id);
    try {
      await advanceOrder(id);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {[{ id: "", label: "Semua" }, ...ORDER_STATUSES.map((s) => ({ id: s, label: ORDER_STATUS[s].label }))].map((s) => (
          <button
            key={s.id}
            onClick={() => { setStatus(s.id); setOffset(0); }}
            className={`chip border text-xs transition ${status === s.id ? "border-jade-700 bg-jade-700 text-white" : "border-ink/12 bg-white text-ink/60 hover:border-ink/30"}`}
          >
            {s.label}
          </button>
        ))}
        <input
          className="input ml-auto w-full max-w-64 py-2 text-sm"
          placeholder="Cari no. pesanan, nama, email, @akun"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Cari pesanan"
        />
      </div>

      {error && <p className="rounded-lg bg-coral-50 p-2 text-sm text-coral-600">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink/8 text-xs text-ink/50">
              <th className="p-3 font-semibold">Pesanan</th>
              <th className="p-3 font-semibold">Pelanggan</th>
              <th className="p-3 font-semibold">Item</th>
              <th className="p-3 font-semibold">Total</th>
              <th className="p-3 font-semibold">Pembayaran</th>
              <th className="p-3 font-semibold">Status</th>
              <th className="p-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {data?.orders.map((o) => {
              const units = o.items.reduce((a, i) => a + i.qty, 0);
              const canAdvance = o.payment.status === "paid" && o.status !== "selesai";
              return (
                <Fragment key={o.id}>
                  <tr className="cursor-pointer border-t border-ink/5 hover:bg-cream/60" onClick={() => setOpen(open === o.id ? null : o.id)}>
                    <td className="p-3">
                      <p className="font-semibold">{o.id}</p>
                      <p className="text-xs text-ink/45">{fmtDate(o.createdAt)} · {fmtTime(o.createdAt)}</p>
                    </td>
                    <td className="p-3">
                      <p className="font-semibold">{o.customer.name}</p>
                      <p className="text-xs text-ink/45">{o.username ? `@${o.username}` : "guest"} · {o.customer.city}</p>
                    </td>
                    <td className="p-3 text-xs text-ink/70">
                      {units} pcs
                      <span className="block max-w-48 truncate text-ink/45">{o.items.map((i) => `${i.qty}×${i.size}`).join(", ")}</span>
                    </td>
                    <td className="p-3">
                      <p className="font-bold">{rupiah(o.total)}</p>
                      {o.discount > 0 && <p className="text-xs text-jade-700">−{rupiah(o.discount)} {o.voucherCode}</p>}
                    </td>
                    <td className="p-3 text-xs">
                      <span className={o.payment.status === "paid" ? "font-semibold text-jade-800" : "text-sun-600"}>
                        {o.payment.status === "paid" ? "LUNAS" : "MENUNGGU"}
                      </span>
                      <span className="block text-ink/45">{o.payment.method}</span>
                    </td>
                    <td className="p-3"><span className={`chip text-xs ${ORDER_STATUS[o.status].chip}`}>{ORDER_STATUS[o.status].label}</span></td>
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {canAdvance && (
                        <button onClick={() => advance(o.id)} disabled={busy === o.id} className="btn-secondary btn-sm" data-track="admin-advance">
                          {busy === o.id ? "…" : "Majukan ▶"}
                        </button>
                      )}
                    </td>
                  </tr>
                  {open === o.id && (
                    <tr className="bg-cream/50">
                      <td colSpan={7} className="p-4">
                        <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
                          <div>
                            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink/45">Item</p>
                            <ul className="space-y-1 text-sm">
                              {o.items.map((it, i) => (
                                <li key={i} className="flex justify-between gap-3">
                                  <span>{it.qty}× {it.title} · {COLORS[it.color]?.label ?? it.color} · <b>{it.size}</b></span>
                                  <span className="shrink-0">{rupiah(it.price * it.qty)}</span>
                                </li>
                              ))}
                            </ul>
                            <p className="mt-2 text-xs text-ink/55">
                              Subtotal {rupiah(o.subtotal)} · ongkir {rupiah(o.shipping.cost)} ({o.shipping.courier})
                              {o.discount > 0 && ` · diskon ${rupiah(o.discount)}`}
                            </p>
                          </div>
                          <div className="text-sm">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink/45">Pengiriman</p>
                            <p className="font-semibold">{o.customer.name} · {o.customer.phone}</p>
                            <p className="text-ink/65">{o.customer.address}, {o.customer.city} {o.customer.postal}</p>
                            {o.customer.email && <p className="text-xs text-ink/50">{o.customer.email}</p>}
                            {o.notes && <p className="mt-1 text-xs text-ink/70">Catatan: {o.notes}</p>}
                            <Link href={`/order/${o.id}`} className="mt-2 inline-block text-xs font-semibold text-jade-700 hover:underline">Buka halaman pesanan →</Link>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {data && data.orders.length === 0 && <p className="p-8 text-center text-sm text-ink/55">Tidak ada pesanan yang cocok.</p>}
        {!data && !error && <p className="p-8 text-center text-sm text-ink/45">Memuat pesanan…</p>}
      </div>

      {data && data.total > PAGE && (
        <div className="flex items-center justify-end gap-3 text-sm">
          <span className="text-ink/55">{offset + 1}–{Math.min(offset + PAGE, data.total)} dari {data.total}</span>
          <button className="btn-secondary btn-sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>← Sebelumnya</button>
          <button className="btn-secondary btn-sm" disabled={offset + PAGE >= data.total} onClick={() => setOffset(offset + PAGE)}>Berikutnya →</button>
        </div>
      )}
    </div>
  );
}
