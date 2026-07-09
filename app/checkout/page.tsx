"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PaymentModal from "@/components/PaymentModal";
import { clearCart, getCart, type CartItem } from "@/lib/cart";
import { rupiah } from "@/lib/format";
import { track } from "@/lib/track";

const COURIERS = [
  { id: "SiCepat REG", label: "SiCepat REG", eta: "3–4 hari", cost: 18000 },
  { id: "JNE REG", label: "JNE REG", eta: "3–5 hari", cost: 20000 },
  { id: "AnterAja Next Day", label: "AnterAja Next Day", eta: "1–2 hari", cost: 34000 },
];

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[] | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", city: "" });
  const [courier, setCourier] = useState(COURIERS[0]);
  const [order, setOrder] = useState<{ id: string; total: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setItems(getCart()), []);

  if (items === null) return <div className="mx-auto max-w-4xl px-4 py-16" />;

  const subtotal = items.reduce((a, i) => a + i.price * i.qty, 0);
  const total = subtotal + courier.cost;
  const valid = form.name && form.phone && form.address && form.city && items.length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: form,
          items,
          shipping: { courier: courier.id, cost: courier.cost },
          method: "belum dipilih",
          session: sessionStorage.getItem("kk-session") ?? "anon",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal membuat pesanan");
      setOrder({ id: data.order.id, total: data.order.total });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0 && !order) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="font-bold">Keranjang kosong.</p>
        <Link href="/products" className="btn-primary mt-4 inline-flex">Jelajahi produk</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">Checkout</h1>

      <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="card p-5">
            <p className="font-bold">Alamat pengiriman</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="name">Nama lengkap *</label>
                <input id="name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Budi Santoso" />
              </div>
              <div>
                <label className="label" htmlFor="phone">No. WhatsApp *</label>
                <input id="phone" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0812xxxxxxx" />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="email">Email</label>
                <input id="email" type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="budi@mail.com" />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="address">Alamat lengkap *</label>
                <textarea id="address" className="input" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Jl. Merdeka No. 10, RT 01/RW 02" />
              </div>
              <div>
                <label className="label" htmlFor="city">Kota / Kabupaten *</label>
                <input id="city" className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Bandung" />
              </div>
            </div>
          </section>

          <section className="card p-5">
            <p className="font-bold">Kurir</p>
            <div className="mt-3 space-y-2">
              {COURIERS.map((c) => (
                <label key={c.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${courier.id === c.id ? "border-jade-700 bg-jade-50" : "border-ink/10 hover:border-ink/25"}`}>
                  <input type="radio" name="courier" checked={courier.id === c.id} onChange={() => setCourier(c)} className="accent-jade-700" />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{c.label}</span>
                    <span className="text-xs text-ink/55">Estimasi {c.eta}</span>
                  </span>
                  <span className="text-sm font-bold">{rupiah(c.cost)}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <div className="card h-fit p-5">
          <p className="font-bold">Pesananmu</p>
          <div className="mt-3 space-y-2 text-sm">
            {items.map((it) => (
              <div key={`${it.productId}-${it.color}-${it.size}`} className="flex justify-between gap-3">
                <span className="text-ink/70">{it.qty}× {it.title} ({it.size})</span>
                <span className="shrink-0 font-semibold">{rupiah(it.price * it.qty)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1.5 border-t border-ink/8 pt-3 text-sm">
            <div className="flex justify-between"><span className="text-ink/60">Subtotal</span><span>{rupiah(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-ink/60">Ongkir ({courier.label})</span><span>{rupiah(courier.cost)}</span></div>
            <div className="flex justify-between pt-1 text-base font-extrabold"><span>Total</span><span className="text-jade-800">{rupiah(total)}</span></div>
          </div>
          {error && <p className="mt-3 rounded-lg bg-coral-50 p-2 text-xs font-semibold text-coral-600">{error}</p>}
          <button type="submit" disabled={!valid || busy} className="btn-primary mt-5 w-full" data-track="bayar-sekarang">
            {busy ? "Membuat pesanan..." : `Bayar ${rupiah(total)}`}
          </button>
          <p className="mt-3 text-center text-xs text-ink/45">🔒 Pembayaran aman via gateway sandbox (demo)</p>
        </div>
      </form>

      {order && (
        <PaymentModal
          order={order}
          onClose={() => setOrder(null)}
          onPaid={() => {
            clearCart();
            track("click", { label: "payment-done" });
            router.push(`/order/${order.id}`);
          }}
        />
      )}
    </div>
  );
}
