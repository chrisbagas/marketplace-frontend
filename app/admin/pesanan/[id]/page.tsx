"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Mockup from "@/components/Mockup";
import { COLORS, type ProductType } from "@/lib/data";
import { advanceOrder, getOrder, markDelivered, markPaid, ORDER_STATUS, ORDER_STATUSES, SHIPPING_CARRIERS, shipOrder } from "@/lib/orders";
import { fmtDate, fmtTime, rupiah } from "@/lib/format";
import type { Order } from "@/lib/types";

// Detail pesanan untuk admin (operasional): data lengkap pembeli & akun, file
// desain untuk produksi, pembayaran, dan langkah status berikutnya.
// Pesanan TIDAK bisa ditandai "dikirim" tanpa kurir + nomor resi (dicek juga di backend & database).

const TRACKING_RE = /^[A-Z0-9][A-Z0-9-]{5,29}$/;
const normalizeResi = (s: string) => s.replace(/\s+/g, "").toUpperCase();

export default function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [courier, setCourier] = useState("");
  const [resi, setResi] = useState("");
  const [editingResi, setEditingResi] = useState(false);

  const load = useCallback(async () => {
    try {
      const o = await getOrder(id);
      setOrder(o);
      setCourier((c) => c || o.shipment?.courier || o.shipping.courier);
    } catch {
      setMissing(true);
    }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function run(fn: () => Promise<Order>) {
    setBusy(true);
    setError("");
    try {
      setOrder(await fn());
      setEditingResi(false);
      setResi("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (missing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="font-bold">Pesanan {id} tidak ditemukan.</p>
        <Link href="/admin?tab=Pesanan" className="btn-primary mt-5 inline-flex">← Kembali ke daftar pesanan</Link>
      </div>
    );
  }
  if (!order) return <div className="mx-auto h-96 max-w-6xl animate-pulse px-4 py-10" />;

  const st = ORDER_STATUS[order.status];
  const stepIdx = ORDER_STATUSES.indexOf(order.status);
  const units = order.items.reduce((a, i) => a + i.qty, 0);
  const resiClean = normalizeResi(resi);
  const resiValid = TRACKING_RE.test(resiClean);
  const carriers = Array.from(new Set([order.shipping.courier, ...SHIPPING_CARRIERS]));
  const waNumber = order.customer.phone.replace(/^0/, "62").replace(/\D/g, "");

  const shipForm = (update: boolean) => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (resiValid && courier) run(() => shipOrder(order.id, courier, resiClean, update));
      }}
      className="space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="ship-courier">Kurir *</label>
          <select id="ship-courier" className="input" value={courier} onChange={(e) => setCourier(e.target.value)}>
            {carriers.map((c) => (
              <option key={c} value={c}>{c}{c === order.shipping.courier ? " (pilihan pembeli)" : ""}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ship-resi">Nomor resi dari kurir *</label>
          <input
            id="ship-resi"
            className={`input font-mono uppercase ${resi && !resiValid ? "border-coral-400" : ""}`}
            value={resi}
            onChange={(e) => setResi(e.target.value)}
            placeholder="mis. JNE0123456789"
            autoComplete="off"
            maxLength={40}
          />
          {resi && !resiValid && <p className="mt-1 text-xs text-coral-600">6–30 huruf/angka sesuai resi kurir</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={busy || !resiValid || !courier} data-track={update ? "admin-ubah-resi" : "admin-kirim"}>
          {busy ? "Menyimpan…" : update ? "Simpan resi baru" : "Tandai dikirim"}
        </button>
        {update && <button type="button" className="btn-secondary btn-sm" onClick={() => { setEditingResi(false); setResi(""); }}>Batal</button>}
        {!resiValid && !update && <span className="text-xs text-ink/55">Tombol aktif setelah kurir & nomor resi diisi.</span>}
      </div>
    </form>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/admin?tab=Pesanan" className="text-sm font-semibold text-jade-700 hover:underline">← Daftar pesanan</Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Pesanan {order.id}</h1>
          <p className="text-sm text-ink/55">
            Dibuat {fmtDate(order.createdAt)} · {fmtTime(order.createdAt)} · {units} item ·{" "}
            {order.username ? <>akun <b>@{order.username}</b></> : "guest"}
          </p>
        </div>
        <span className={`chip ${st.chip}`}>{st.label}</span>
      </div>

      {/* progres + langkah berikutnya */}
      <section className="card mt-6 p-5">
        <ol className="flex flex-wrap gap-2 text-xs">
          {ORDER_STATUSES.map((s, i) => (
            <li key={s} className={`chip ${i < stepIdx ? "bg-jade-100 text-jade-800" : i === stepIdx ? "bg-jade-700 text-white" : "bg-ink/5 text-ink/40"}`}>
              {i < stepIdx ? "✓ " : ""}{ORDER_STATUS[s].label}
            </li>
          ))}
        </ol>

        <div className="mt-5 border-t border-ink/8 pt-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Langkah berikutnya</p>
          {order.status === "menunggu-pembayaran" && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="flex-1 text-sm text-ink/70">Menunggu pembeli membayar {rupiah(order.total)}. Produksi dimulai setelah lunas.</p>
              <button
                className="btn-secondary btn-sm"
                disabled={busy}
                onClick={() => confirm(`Tandai ${order.id} LUNAS secara manual? Pastikan dana sudah diterima.`) && run(() => markPaid(order.id, "Manual (admin)"))}
              >
                Tandai lunas manual
              </button>
            </div>
          )}
          {order.status === "dibayar" && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="flex-1 text-sm text-ink/70">Pembayaran diterima. Unduh file desain di bawah, lalu masukkan ke antrean cetak.</p>
              <button className="btn-primary btn-sm" disabled={busy} onClick={() => run(() => advanceOrder(order.id))}>Mulai produksi ▶</button>
            </div>
          )}
          {order.status === "produksi" && (
            <div className="mt-2">
              <p className="mb-3 text-sm text-ink/70">
                Setelah paket diserahkan ke kurir, masukkan <b>nama kurir dan nomor resi</b> — pesanan tidak bisa ditandai
                dikirim tanpa data ini, dan pembeli akan melihat resinya.
              </p>
              {shipForm(false)}
            </div>
          )}
          {order.status === "dikirim" && order.shipment && (
            <div className="mt-2 space-y-3">
              {editingResi ? (
                shipForm(true)
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="flex-1 text-sm text-ink/70">
                    Dalam pengiriman via <b>{order.shipment.courier}</b>, resi <b className="font-mono">{order.shipment.trackingNumber}</b>.
                  </p>
                  <button className="btn-secondary btn-sm" onClick={() => { setEditingResi(true); setCourier(order.shipment!.courier); }}>Ubah resi</button>
                  <button
                    className="btn-primary btn-sm"
                    disabled={busy}
                    onClick={() =>
                      confirm(
                        `Pelacakan ${order.shipment!.courier} untuk resi ${order.shipment!.trackingNumber} sudah menyatakan paket SAMPAI?\n\nPembeli lalu punya 2 hari untuk konfirmasi; setelah itu pesanan selesai otomatis.`,
                      ) && run(() => markDelivered(order.id))
                    }
                  >
                    Paket tiba (laporan kurir)
                  </button>
                </div>
              )}
              <p className="text-xs text-ink/50">
                Tandai tiba hanya setelah pelacakan kurir menyatakan paket sampai. Nanti dilakukan otomatis lewat integrasi kurir.
                Pesanan diselesaikan oleh pembeli — bukan admin.
              </p>
            </div>
          )}
          {order.status === "tiba" && (
            <p className="mt-2 text-sm text-ink/70">
              Paket tiba {order.shipment?.deliveredAt && <>pada <b>{fmtDate(order.shipment.deliveredAt)} · {fmtTime(order.shipment.deliveredAt)}</b></>}.
              Menunggu pembeli menekan &quot;Pesanan diterima&quot;
              {order.autoCompleteAt && <> — selesai otomatis <b>{fmtDate(order.autoCompleteAt)} · {fmtTime(order.autoCompleteAt)}</b></>}.
            </p>
          )}
          {order.status === "selesai" && <p className="mt-2 text-sm text-ink/70">Pesanan selesai — tidak ada langkah lagi.</p>}
          {error && <p className="mt-3 rounded-lg bg-coral-50 p-2 text-sm font-semibold text-coral-600">{error}</p>}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* item + file produksi */}
        <section className="card p-5">
          <p className="font-bold">Item untuk diproduksi</p>
          <div className="mt-3 divide-y divide-ink/8">
            {order.items.map((it, i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                <div className="h-20 w-20 shrink-0 rounded-xl bg-jade-50 p-1">
                  <Mockup type={it.type as ProductType} colorHex={COLORS[it.color]?.hex ?? "#ddd"} designUri={it.designUri} />
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold">{it.title}</p>
                  <p className="text-ink/60">
                    {COLORS[it.color]?.label ?? it.color} · ukuran <b className="text-ink">{it.size}</b> · <b className="text-ink">{it.qty} pcs</b>
                  </p>
                  <p className="text-xs text-ink/45">
                    {it.productId ? (
                      <Link href={`/product/${it.productId}`} className="hover:underline">{it.productId}</Link>
                    ) : (
                      "desain custom pembeli"
                    )}
                    {" · "}{rupiah(it.price)}/pcs
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-bold">{rupiah(it.price * it.qty)}</p>
                  {it.designUri && (
                    <a href={it.designUri} target="_blank" rel="noreferrer" download className="text-xs font-semibold text-jade-700 hover:underline">
                      File desain ↓
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1 border-t border-ink/8 pt-3 text-sm">
            <div className="flex justify-between"><span className="text-ink/60">Subtotal</span><span>{rupiah(order.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-ink/60">Ongkir ({order.shipping.courier})</span><span>{rupiah(order.shipping.cost)}</span></div>
            {order.discount > 0 && (
              <div className="flex justify-between text-jade-800"><span>Diskon {order.voucherCode}</span><span>− {rupiah(order.discount)}</span></div>
            )}
            <div className="flex justify-between font-extrabold"><span>Total dibayar</span><span className="text-jade-800">{rupiah(order.total)}</span></div>
          </div>
        </section>

        <div className="space-y-6">
          <section className="card p-5 text-sm">
            <p className="font-bold">Penerima</p>
            <p className="mt-2 font-semibold">{order.customer.name}</p>
            <p className="text-ink/65">{order.customer.address}</p>
            <p className="text-ink/65">{order.customer.city} {order.customer.postal}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">WhatsApp {order.customer.phone}</a>
              {order.customer.email && <a href={`mailto:${order.customer.email}`} className="btn-secondary btn-sm">{order.customer.email}</a>}
            </div>
            {order.notes && <p className="mt-3 rounded-lg bg-sun-50 px-3 py-2 text-sun-600">Catatan pembeli: {order.notes}</p>}
          </section>

          <section className="card p-5 text-sm">
            <p className="font-bold">Pengiriman</p>
            {order.shipment ? (
              <dl className="mt-2 space-y-1">
                <div className="flex justify-between gap-3"><dt className="text-ink/55">Kurir</dt><dd className="font-semibold">{order.shipment.courier}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-ink/55">No. resi</dt><dd className="font-mono font-semibold">{order.shipment.trackingNumber}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-ink/55">Diserahkan</dt><dd>{fmtDate(order.shipment.shippedAt)} · {fmtTime(order.shipment.shippedAt)}</dd></div>
                {order.shipment.deliveredAt ? (
                  <div className="flex justify-between gap-3"><dt className="text-ink/55">Tiba</dt><dd>{fmtDate(order.shipment.deliveredAt)} · {fmtTime(order.shipment.deliveredAt)}</dd></div>
                ) : null}
                {order.completedAt ? (
                  <div className="flex justify-between gap-3"><dt className="text-ink/55">Selesai</dt><dd>{fmtDate(order.completedAt)} · {fmtTime(order.completedAt)}</dd></div>
                ) : null}
              </dl>
            ) : (
              <p className="mt-2 text-ink/55">Belum dikirim. Pembeli memilih <b>{order.shipping.courier}</b>.</p>
            )}
          </section>

          <section className="card p-5 text-sm">
            <p className="font-bold">Pembayaran</p>
            <dl className="mt-2 space-y-1">
              <div className="flex justify-between gap-3"><dt className="text-ink/55">Status</dt><dd className={order.payment.status === "paid" ? "font-semibold text-jade-800" : "text-sun-600"}>{order.payment.status === "paid" ? "LUNAS" : "MENUNGGU"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink/55">Metode</dt><dd>{order.payment.method}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink/55">Ref gateway</dt><dd className="font-mono">{order.payment.ref}</dd></div>
              {order.payment.paidAt && <div className="flex justify-between gap-3"><dt className="text-ink/55">Dibayar</dt><dd>{fmtDate(order.payment.paidAt)} · {fmtTime(order.payment.paidAt)}</dd></div>}
            </dl>
          </section>

          <section className="card p-5 text-sm">
            <p className="font-bold">Riwayat</p>
            <ol className="mt-3 space-y-3">
              {[...order.timeline].reverse().map((t, i) => (
                <li key={i} className="flex gap-3">
                  <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${i === 0 ? "bg-jade-600" : "bg-ink/20"}`} />
                  <span>
                    <span className="block font-medium">{t.status}</span>
                    <span className="text-xs text-ink/50">{fmtDate(t.t)} · {fmtTime(t.t)}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
