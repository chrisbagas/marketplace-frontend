"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { COLORS, PRODUCT_TYPES, type ProductType } from "@/lib/data";
import { rupiah, fmtDate, fmtTime } from "@/lib/format";
import type { Order } from "@/lib/types";

// Print rules live here (not in globals.css) so they only apply while this page
// is mounted. They hide the site chrome from the root layout (header, verify
// banner, footer) and size the sheet to A4.
const PRINT_CSS = `
@page { size: A4; margin: 12mm; }
@media print {
  html, body { background: #fff !important; }
  body > header, body > footer, body > div { display: none !important; }
  main { min-height: 0 !important; }
  .receipt-screen { padding: 0 !important; }
  .receipt-sheet { box-shadow: none !important; border: 0 !important; max-width: none !important; padding: 0 !important; margin: 0 !important; }
  .receipt-sheet, .receipt-sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .receipt-sheet tr, .receipt-sheet section { break-inside: avoid; }
}
`;

const Row = ({ label, value, strong }: { label: React.ReactNode; value: React.ReactNode; strong?: boolean }) => (
  <div className={`flex justify-between gap-4 ${strong ? "text-base font-extrabold" : ""}`}>
    <span className={strong ? "" : "text-ink/60"}>{label}</span>
    <span>{value}</span>
  </div>
);

export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let stop = false;
    fetch(`/api/orders/${id}`, { cache: "no-store" })
      .then(async (res) => {
        if (stop) return;
        if (!res.ok) return setMissing(true);
        setOrder((await res.json()).order);
      })
      .catch(() => !stop && setMissing(true));
    return () => {
      stop = true;
    };
  }, [id]);

  if (missing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="font-bold">Pesanan tidak ditemukan.</p>
        <p className="mt-1 text-sm text-ink/55">
          Struk hanya bisa dilihat oleh akun yang membuat pesanan ini. Pastikan kamu sudah masuk dengan akun yang benar.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Link href="/pesanan" className="btn-primary">Pesanan saya</Link>
          <Link href="/login" className="btn-secondary">Masuk</Link>
        </div>
      </div>
    );
  }

  if (!order) return <div className="mx-auto max-w-3xl px-4 py-16" />;

  const paid = order.payment.status === "paid" && order.status !== "dibatalkan";

  if (!paid) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="font-bold">Struk belum tersedia</p>
        <p className="mt-1 text-sm text-ink/55">
          {order.status === "dibatalkan"
            ? "Pesanan ini dibatalkan, jadi tidak ada struk pembayaran."
            : "Struk baru bisa dicetak setelah pesanan dibayar."}
        </p>
        <Link href={`/order/${order.id}`} className="btn-primary mt-5 inline-flex">Kembali ke pesanan</Link>
      </div>
    );
  }

  const paidAt = order.payment.paidAt;
  const shipment = order.shipment;

  return (
    <div className="receipt-screen px-4 py-8">
      <style>{PRINT_CSS}</style>

      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/order/${order.id}`} className="text-sm font-semibold text-jade-700 hover:underline">
          ← Kembali ke pesanan
        </Link>
        <button type="button" onClick={() => window.print()} className="btn-primary btn-sm" data-track="cetak-struk">
          Cetak / Simpan PDF
        </button>
      </div>

      <article className="receipt-sheet mx-auto max-w-[210mm] rounded-xl border border-ink/10 bg-white p-8 text-[13px] leading-relaxed text-ink shadow-sm">
        <div className="flex items-start justify-between gap-4 border-b border-ink/15 pb-4">
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 32 32" className="h-9 w-9" aria-hidden="true">
              <rect width="32" height="32" rx="9" fill="#0b6244" />
              <path d="M9 23 V9 h3.4 v5.6 L17.6 9 h4.4 l-6 6.6 6.4 7.4 h-4.5 l-5.5 -6.6 V23 Z" fill="#f5a524" />
            </svg>
            <div>
              <p className="text-xl font-extrabold leading-tight tracking-tight">
                Karya<span className="text-jade-700">Kita</span>
              </p>
              <p className="text-xs text-ink/55">Marketplace print-on-demand kreator Indonesia</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-extrabold uppercase tracking-wide">Struk Pembayaran</p>
            <span className="mt-1 inline-block rounded border border-jade-700 px-2 py-0.5 text-xs font-bold text-jade-800">LUNAS</span>
          </div>
        </div>

        <section className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3">
          <div className="space-y-0.5">
            <Row label="No. pesanan" value={<b className="font-mono">{order.id}</b>} />
            <Row label="Tanggal pesanan" value={`${fmtDate(order.createdAt)} · ${fmtTime(order.createdAt)}`} />
            <Row label="Dibayar pada" value={paidAt ? `${fmtDate(paidAt)} · ${fmtTime(paidAt)}` : "—"} />
            <Row label="Metode pembayaran" value={order.payment.method} />
            <Row label="Ref. pembayaran" value={<span className="font-mono text-xs">{order.payment.ref}</span>} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-ink/50">Pembeli / dikirim ke</p>
            <p className="mt-0.5 font-semibold">{order.customer.name}</p>
            <p className="text-ink/75">
              {order.customer.address}, {order.customer.city}
              {order.customer.postal && ` ${order.customer.postal}`}
            </p>
            {order.customer.phone && <p className="text-ink/75">Telp. {order.customer.phone}</p>}
            {order.customer.email && <p className="text-ink/75">{order.customer.email}</p>}
          </div>
        </section>

        <table className="mt-5 w-full border-collapse text-left">
          <thead>
            <tr className="border-y border-ink/25 text-xs uppercase tracking-wide text-ink/60">
              <th className="py-1.5 pr-2 font-bold">Produk</th>
              <th className="px-2 py-1.5 font-bold">Warna</th>
              <th className="px-2 py-1.5 font-bold">Ukuran</th>
              <th className="px-2 py-1.5 text-right font-bold">Qty</th>
              <th className="px-2 py-1.5 text-right font-bold">Harga</th>
              <th className="py-1.5 pl-2 text-right font-bold">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it, i) => (
              <tr key={i} className="border-b border-ink/10 align-top">
                <td className="py-1.5 pr-2">
                  <span className="font-semibold">{it.title}</span>
                  <span className="block text-xs text-ink/55">{PRODUCT_TYPES[it.type as ProductType]?.label ?? it.type}</span>
                </td>
                <td className="px-2 py-1.5">{COLORS[it.color]?.label ?? it.color}</td>
                <td className="px-2 py-1.5">{it.size}</td>
                <td className="px-2 py-1.5 text-right">{it.qty}</td>
                <td className="px-2 py-1.5 text-right">{rupiah(it.price)}</td>
                <td className="py-1.5 pl-2 text-right font-semibold">{rupiah(it.price * it.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="mt-4 ml-auto w-full max-w-xs space-y-1">
          <Row label="Subtotal" value={rupiah(order.subtotal)} />
          <Row label={`Ongkos kirim (${order.shipping.courier})`} value={rupiah(order.shipping.cost)} />
          {order.discount > 0 && (
            <Row label={`Diskon${order.voucherCode ? ` (${order.voucherCode})` : ""}`} value={`− ${rupiah(order.discount)}`} />
          )}
          <div className="border-t border-ink/25 pt-1.5">
            <Row strong label="Total dibayar" value={rupiah(order.total)} />
          </div>
        </section>

        {shipment && (
          <section className="mt-5 rounded-lg border border-ink/15 px-3 py-2">
            <p className="text-xs font-bold uppercase tracking-wide text-ink/50">Pengiriman</p>
            <p>
              {shipment.courier} · No. resi <b className="font-mono">{shipment.trackingNumber}</b> · diserahkan ke kurir{" "}
              {fmtDate(shipment.shippedAt)}
            </p>
          </section>
        )}

        <p className="mt-6 border-t border-ink/15 pt-3 text-center text-xs text-ink/50">
          Terima kasih sudah berbelanja di KaryaKita — setiap pembelian mengalirkan royalti langsung ke desainernya.
          Struk ini dibuat otomatis dan sah tanpa tanda tangan.
        </p>
      </article>
    </div>
  );
}
