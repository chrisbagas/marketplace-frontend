"use client";

import { useState } from "react";
import Link from "next/link";
import { COMPLAINT_REASONS, COMPLAINT_STATUS, getOrder, refundOrder, resolveComplaint } from "@/lib/orders";
import { fmtDate, fmtTime, rupiah } from "@/lib/format";
import type { Order } from "@/lib/types";

// Admin: batalkan pesanan yang sudah dibayar + refund, dan putuskan komplain
// (cetak ulang / refund penuh atau sebagian / tolak). Aturan sebenarnya ada di
// backend; formulir ini hanya memandu dan menampilkan galatnya.

type Method = "gateway" | "manual";

function MethodFields({
  order,
  method,
  setMethod,
  reference,
  setReference,
}: {
  order: Order;
  method: Method;
  setMethod: (m: Method) => void;
  reference: string;
  setReference: (s: string) => void;
}) {
  const gateway = !!order.payment.refundMode;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-4 text-sm">
        <label className={`flex items-center gap-2 ${gateway ? "" : "opacity-45"}`}>
          <input type="radio" checked={method === "gateway"} disabled={!gateway} onChange={() => setMethod("gateway")} />
          Lewat Midtrans (otomatis){order.payment.refundMode === "full" && " — hanya nominal penuh"}
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={method === "manual"} onChange={() => setMethod("manual")} />
          Transfer manual
        </label>
      </div>
      {!gateway && (
        <p className="text-xs text-ink/55">
          Metode bayar <b>{order.payment.method}</b> tidak bisa direfund lewat Midtrans — transfer sendiri ke pembeli,
          lalu catat nomor referensinya.
        </p>
      )}
      {method === "manual" && (
        <div>
          <label className="label" htmlFor="refund-ref">Nomor referensi transfer *</label>
          <input id="refund-ref" className="input" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={60} placeholder="mis. BCA-RF-0001" />
        </div>
      )}
    </div>
  );
}

export default function OrderRefundPanel({ order, onChange }: { order: Order; onChange: (o: Order) => void }) {
  const gatewayAvailable = !!order.payment.refundMode;
  const [method, setMethod] = useState<Method>(gatewayAvailable ? "gateway" : "manual");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const remaining = order.payment.status === "paid" ? order.total - order.refunded : 0;
  const [mode, setMode] = useState<"reprint" | "refund" | "reject">("reprint");
  const [amount, setAmount] = useState(remaining);
  const [note, setNote] = useState("");
  const complaint = order.complaint;

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      onChange(await getOrder(order.id));
      setOpen(false);
      setNote("");
      setReference("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const canCancelPaid = order.status === "dibayar" && order.payment.status === "paid";
  if (!canCancelPaid && !complaint && order.refunds.length === 0) return null;

  return (
    <section className="card mt-6 p-5">
      <p className="font-bold">Pembatalan, refund &amp; komplain</p>

      {order.refunds.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Pengembalian dana</p>
          <ul className="mt-1 space-y-1 text-sm">
            {order.refunds.map((r) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-2">
                <span className="text-ink/70">
                  {fmtDate(r.createdAt)} · {fmtTime(r.createdAt)} · {r.method === "gateway" ? "Midtrans" : "transfer manual"} ·{" "}
                  <span className="font-mono text-xs">{r.reference}</span> · {r.reason}
                </span>
                <b className="text-coral-600">− {rupiah(r.amount)}</b>
              </li>
            ))}
          </ul>
        </div>
      )}

      {canCancelPaid && (
        <div className="mt-4 border-t border-ink/8 pt-4">
          {!open ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="flex-1 text-sm text-ink/70">
                Pesanan belum masuk produksi, jadi masih bisa dibatalkan. Dana {rupiah(order.total)} dikembalikan penuh,
                royalti kreator dan tagihan produsen pesanan ini dibalik.
              </p>
              <button className="btn-secondary btn-sm text-coral-600" onClick={() => setOpen(true)} data-track="admin-batal-refund">
                Batalkan &amp; refund
              </button>
            </div>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!confirm(`Batalkan ${order.id} dan kembalikan ${rupiah(order.total)} ke pembeli? Ini tidak bisa dibatalkan.`)) return;
                run(() => refundOrder(order.id, { reason: reason.trim(), method, reference: reference.trim() }));
              }}
            >
              <div>
                <label className="label" htmlFor="cancel-reason">Alasan pembatalan * (dilihat pembeli)</label>
                <input id="cancel-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="mis. Stok bahan habis" />
              </div>
              <MethodFields order={order} method={method} setMethod={setMethod} reference={reference} setReference={setReference} />
              <div className="flex gap-2">
                <button type="submit" className="btn-primary btn-sm" disabled={busy || reason.trim().length < 3 || (method === "manual" && !reference.trim())}>
                  {busy ? "Memproses…" : `Batalkan & kembalikan ${rupiah(order.total)}`}
                </button>
                <button type="button" className="btn-secondary btn-sm" onClick={() => setOpen(false)}>Tutup</button>
              </div>
            </form>
          )}
        </div>
      )}

      {complaint && (
        <div className="mt-4 border-t border-ink/8 pt-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Komplain pembeli</p>
            <span className={`chip ${COMPLAINT_STATUS[complaint.status].chip}`}>{COMPLAINT_STATUS[complaint.status].label}</span>
          </div>
          <p className="mt-2"><b>{COMPLAINT_REASONS[complaint.reason]}</b> · {fmtDate(complaint.createdAt)} · {fmtTime(complaint.createdAt)}</p>
          <p className="mt-1 whitespace-pre-line text-ink/75">{complaint.description}</p>
          {complaint.photos.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {complaint.photos.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer" className="block h-24 w-24 overflow-hidden rounded-lg border border-ink/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Foto komplain" className="h-full w-full object-cover" />
                </a>
              ))}
            </div>
          )}

          {complaint.status !== "terbuka" && (
            <p className="mt-3 rounded-lg bg-ink/5 p-3">
              Diputuskan {complaint.resolvedAt && <>{fmtDate(complaint.resolvedAt)} · {fmtTime(complaint.resolvedAt)}</>}:{" "}
              {complaint.status === "dicetak-ulang" && complaint.reprintOrderId && (
                <>cetak ulang → <Link className="font-semibold text-jade-700 hover:underline" href={`/admin/pesanan/${complaint.reprintOrderId}`}>{complaint.reprintOrderId}</Link></>
              )}
              {complaint.status === "direfund" && <>refund {rupiah(complaint.refundAmount ?? 0)}</>}
              {complaint.status === "ditolak" && <>ditolak</>}
              {complaint.resolutionNote && <> — {complaint.resolutionNote}</>}
            </p>
          )}

          {complaint.status === "terbuka" && order.status === "tiba" && (
            <form
              className="mt-3 space-y-3 rounded-xl border border-ink/10 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (mode === "reprint") {
                  if (confirm("Buat pesanan cetak ulang gratis? Tagihan produsen (produksi + ongkir) ditanggung platform.")) {
                    run(() => resolveComplaint(complaint.id, { action: "reprint", note: note.trim() }));
                  }
                } else if (mode === "refund") {
                  if (confirm(`Kembalikan ${rupiah(amount)} ke pembeli? Royalti kreator dibalik sebanding.`)) {
                    run(() => resolveComplaint(complaint.id, { action: "refund", amount, method, reference: reference.trim(), note: note.trim() }));
                  }
                } else {
                  run(() => resolveComplaint(complaint.id, { action: "reject", note: note.trim() }));
                }
              }}
            >
              <p className="font-semibold">Putuskan komplain</p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["reprint", "Cetak ulang"],
                    ["refund", "Refund"],
                    ["reject", "Tolak"],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setMode(k)}
                    className={`chip ${mode === k ? "bg-jade-700 text-white" : "bg-ink/5 text-ink/60"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {mode === "reprint" && (
                <p className="text-ink/65">
                  Membuat pesanan baru bertotal Rp0 yang tertaut ke pesanan ini, langsung berstatus dibayar. Vendor dibayar
                  produksi + ongkirnya (ditanggung platform); tanpa royalti kreator.
                </p>
              )}
              {mode === "refund" && (
                <div className="space-y-3">
                  <div>
                    <label className="label" htmlFor="refund-amount">Nominal refund (maks {rupiah(remaining)})</label>
                    <input
                      id="refund-amount"
                      className="input"
                      type="number"
                      min={1}
                      max={remaining}
                      value={amount || ""}
                      onChange={(e) => setAmount(Number(e.target.value))}
                    />
                    <p className="mt-1 text-xs text-ink/55">Royalti kreator dibalik sebanding dengan nominal. Tagihan produsen tidak dibalik (barang sudah dicetak & dikirim).</p>
                  </div>
                  <MethodFields order={order} method={method} setMethod={setMethod} reference={reference} setReference={setReference} />
                </div>
              )}
              {mode === "reject" && <p className="text-ink/65">Pesanan tetap berjalan; selesai otomatis dihitung ulang 48 jam dari keputusan ini.</p>}

              <div>
                <label className="label" htmlFor="complaint-note">Catatan untuk pembeli{mode === "reject" ? " *" : ""}</label>
                <input id="complaint-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
              </div>
              <button
                type="submit"
                className="btn-primary btn-sm"
                disabled={
                  busy ||
                  (mode === "reject" && !note.trim()) ||
                  (mode === "refund" && (amount < 1 || amount > remaining || (method === "manual" && !reference.trim())))
                }
              >
                {busy ? "Memproses…" : mode === "reprint" ? "Buat pesanan cetak ulang" : mode === "refund" ? `Refund ${rupiah(amount || 0)}` : "Tolak komplain"}
              </button>
            </form>
          )}
        </div>
      )}
      {error && <p className="mt-3 rounded-lg bg-coral-50 p-2 text-sm font-semibold text-coral-600">{error}</p>}
    </section>
  );
}
