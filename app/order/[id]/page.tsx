"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Mockup from "@/components/Mockup";
import PaymentModal from "@/components/PaymentModal";
import { useSession } from "@/lib/auth";
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

function ReviewForm({ orderId, listingId, title }: { orderId: string; listingId: string; title: string }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState("");

  async function submit() {
    setState("busy");
    setError("");
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, listingId, rating, comment }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Gagal mengirim ulasan");
      setState("idle");
      return;
    }
    setState("sent");
  }

  if (state === "sent") {
    return (
      <div className="rounded-xl bg-jade-50 p-3 text-sm">
        <p className="font-semibold text-jade-800">✓ Ulasan untuk “{title}” terkirim!</p>
        <p className="text-xs text-ink/55">Menunggu moderasi admin sebelum tayang.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-ink/8 p-3">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-2 flex items-center gap-3">
        <div className="flex" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setRating(n)}
              aria-label={`${n} bintang`}
              className={`px-0.5 text-xl transition ${n <= rating ? "text-sun-500" : "text-ink/20 hover:text-sun-300"}`}
            >
              ★
            </button>
          ))}
        </div>
        <span className="text-xs text-ink/50">{rating}/5</span>
      </div>
      <textarea
        className="input mt-2 h-20 resize-none text-sm"
        placeholder="Ceritakan kualitas cetak, bahan, atau pengirimannya… (opsional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={1000}
      />
      {error && <p className="mt-1 text-xs font-semibold text-coral-600">{error}</p>}
      <button onClick={submit} disabled={state === "busy"} className="btn-primary btn-sm mt-2" data-track="kirim-ulasan">
        {state === "busy" ? "Mengirim…" : "Kirim ulasan"}
      </button>
    </div>
  );
}

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [missing, setMissing] = useState(false);
  const [paying, setPaying] = useState(false);
  const { user } = useSession();
  const isAdmin = user?.role === "admin";

  const load = useCallback(async () => {
    const res = await fetch(`/api/orders/${id}`);
    if (!res.ok) return setMissing(true);
    setOrder((await res.json()).order);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (missing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="font-bold">Pesanan tidak ditemukan.</p>
        <p className="mt-1 text-sm text-ink/55">Pesanan hanya bisa dilihat oleh akun yang membuatnya.</p>
        <div className="mt-5 flex justify-center gap-3">
          <Link href="/pesanan" className="btn-primary">Pesanan saya</Link>
          <Link href="/products" className="btn-secondary">Kembali belanja</Link>
        </div>
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
        {order.payment.status === "pending" && (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl bg-sun-50 p-3">
            <p className="flex-1 text-sm text-sun-600">Pesanan menunggu pembayaran {rupiah(order.total)}.</p>
            <button onClick={() => setPaying(true)} className="btn-primary btn-sm" data-track="bayar-dari-pesanan">
              Bayar sekarang
            </button>
          </div>
        )}
        {order.shipment && (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl bg-jade-50 p-3 text-sm">
            <span className="text-2xl">📦</span>
            <div className="flex-1">
              <p className="font-semibold text-jade-800">
                {order.status === "selesai" ? "Paket sudah diterima" : "Paket dalam perjalanan"} · {order.shipment.courier}
              </p>
              <p className="text-ink/65">
                No. resi <b className="font-mono text-ink">{order.shipment.trackingNumber}</b> · diserahkan {fmtDate(order.shipment.shippedAt)}
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => navigator.clipboard?.writeText(order.shipment!.trackingNumber)}
            >
              Salin resi
            </button>
          </div>
        )}
        {isAdmin && (
          <Link href={`/admin/pesanan/${order.id}`} className="mt-4 inline-block text-sm font-semibold text-jade-700 hover:underline">
            Kelola pesanan ini di dashboard admin →
          </Link>
        )}
      </div>

      {order.status === "selesai" && (
        <div className="card mt-6 p-5">
          <p className="font-bold">Nilai pesananmu ⭐</p>
          <p className="mt-0.5 text-xs text-ink/55">
            Ulasanmu membantu pembeli lain — tayang di halaman produk setelah dimoderasi.
          </p>
          <div className="mt-4 space-y-4">
            {order.items.filter((it) => it.productId && !it.productId.startsWith("custom")).map((it, i) => (
              <ReviewForm key={i} orderId={order.id} listingId={it.productId} title={it.title} />
            ))}
          </div>
        </div>
      )}

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
            {order.discount > 0 && (
              <div className="flex justify-between text-jade-800">
                <span>Diskon{order.voucherCode && ` (${order.voucherCode})`}</span>
                <span>− {rupiah(order.discount)}</span>
              </div>
            )}
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
            <p className="text-sm text-ink/60">
              {order.customer.address}, {order.customer.city}
              {order.customer.postal && ` ${order.customer.postal}`}
            </p>
            {order.customer.email && <p className="mt-1 text-xs text-ink/50">{order.customer.email}</p>}
            {order.notes && <p className="mt-2 rounded-lg bg-cream px-2 py-1 text-xs text-ink/70">Catatan: {order.notes}</p>}
            {isAdmin && order.username && <p className="mt-2 text-xs text-ink/45">Akun pemesan: @{order.username}</p>}
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
      {paying && (
        <PaymentModal
          order={order}
          onClose={() => { setPaying(false); load(); }}
          onPaid={() => { setPaying(false); load(); }}
        />
      )}
    </div>
  );
}
