"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Mockup from "@/components/Mockup";
import PaymentModal from "@/components/PaymentModal";
import { clearCart, getCart, type CartItem } from "@/lib/cart";
import { COLORS, type ProductType } from "@/lib/data";
import { useSession } from "@/lib/auth";
import { createOrder, getQuote } from "@/lib/orders";
import { rupiah } from "@/lib/format";
import { track } from "@/lib/track";
import type { Order, Profile, Quote } from "@/lib/types";

// Checkout (wajib login). Ringkasan harga, ongkir, dan voucher diambil dari
// server (POST /api/checkout/quote) — angka yang tampil = angka yang ditagih.

const PHONE_RE = /^\+?[0-9]{8,15}$/;
const cleanPhone = (p: string) => p.replace(/[\s\-.()]/g, "");

type Form = { name: string; email: string; phone: string; address: string; city: string; postal: string };

function fieldErrors(f: Form): Partial<Record<keyof Form, string>> {
  const e: Partial<Record<keyof Form, string>> = {};
  if (!f.name.trim()) e.name = "Wajib diisi";
  if (!PHONE_RE.test(cleanPhone(f.phone))) e.phone = "8–15 digit, mis. 081234567890";
  if (f.address.trim().length < 10) e.address = "Tulis lengkap: jalan, nomor, RT/RW";
  if (!f.city.trim()) e.city = "Wajib diisi";
  if (f.postal && !/^[0-9]{5}$/.test(f.postal)) e.postal = "5 digit";
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = "Format email tidak valid";
  return e;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useSession();
  const [items, setItems] = useState<CartItem[] | null>(null);
  const [form, setForm] = useState<Form>({ name: "", email: "", phone: "", address: "", city: "", postal: "" });
  const [notes, setNotes] = useState("");
  const [saveProfile, setSaveProfile] = useState(true);
  const [courierId, setCourierId] = useState("SiCepat REG");
  const [voucherInput, setVoucherInput] = useState("");
  const [voucher, setVoucher] = useState(""); // kode yang sedang dipakai
  const [voucherMsg, setVoucherMsg] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<Order | null>(null);

  // keranjang + isi otomatis dari profil tersimpan
  useEffect(() => {
    setItems(getCart());
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : { profile: null }))
      .then(({ profile }: { profile: Profile | null }) => {
        if (!profile) return;
        setForm((f) => ({
          name: f.name || (profile.name === "Pelanggan Demo" ? "" : profile.name),
          email: f.email || profile.email || "",
          phone: f.phone || profile.phone || "",
          address: f.address || profile.address || "",
          city: f.city || profile.city || "",
          postal: f.postal || profile.postal || "",
        }));
        if (profile.preferredCourier) setCourierId(profile.preferredCourier);
        // alamat sudah tersimpan → jangan timpa profil kecuali dicentang lagi
        if (profile.address && profile.phone) setSaveProfile(false);
      })
      .catch(() => {});
  }, []);

  const refreshQuote = useCallback(async (code: string) => {
    const cart = getCart();
    if (cart.length === 0) return null;
    try {
      const q = await getQuote(cart, courierId, code);
      setQuote(q);
      setQuoteError("");
      return q;
    } catch (e) {
      setQuoteError((e as Error).message);
      return null;
    }
  }, [courierId]);

  // hitung ulang saat kurir berubah (voucher yang sedang dipakai ikut dicek ulang)
  useEffect(() => {
    if (!items || items.length === 0) return;
    refreshQuote(voucher).then((q) => {
      // voucher yang tadinya berlaku bisa gugur (mis. kuota habis) → lepas & beri tahu
      if (voucher && q && !q.voucher) {
        setVoucher("");
        setVoucherMsg(q.voucherError ?? "Voucher tidak lagi berlaku");
      }
    });
  }, [items, courierId, voucher, refreshQuote]);

  async function applyVoucher(e?: React.FormEvent) {
    e?.preventDefault();
    const code = voucherInput.trim().toUpperCase();
    if (!code) return;
    const q = await refreshQuote(code);
    if (q?.voucher) {
      setVoucher(code);
      setVoucherMsg("");
      track("click", { label: `voucher-${code}` });
    } else {
      setVoucher("");
      setVoucherMsg(q?.voucherError ?? "Voucher tidak bisa dipakai");
      refreshQuote("");
    }
  }

  function removeVoucher() {
    setVoucher("");
    setVoucherInput("");
    setVoucherMsg("");
  }

  if (items === null) return <div className="mx-auto max-w-5xl px-4 py-16" />;

  if (items.length === 0 && !order) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="font-bold">Keranjang kosong.</p>
        <Link href="/products" className="btn-primary mt-4 inline-flex">Jelajahi produk</Link>
      </div>
    );
  }

  const errs = fieldErrors(form);
  const formValid = Object.keys(errs).length === 0;
  const showErr = (k: keyof Form) => touched && errs[k] && <p className="mt-1 text-xs text-coral-600">{errs[k]}</p>;
  const units = quote?.items.reduce((a, i) => a + i.qty, 0) ?? items.reduce((a, i) => a + i.qty, 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!formValid || !quote || busy) return;
    setBusy(true);
    setError("");
    try {
      const o = await createOrder({
        customer: { ...form, phone: cleanPhone(form.phone) },
        notes,
        items: getCart(),
        courier: courierId,
        voucher,
        saveProfile,
        session: sessionStorage.getItem("kk-session") ?? "anon",
      });
      // pesanan sudah tercatat → kosongkan keranjang supaya tidak terbuat ganda
      clearCart();
      setOrder(o);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const input = (k: keyof Form, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input
      id={`co-${k}`}
      className={`input ${touched && errs[k] ? "border-coral-400" : ""}`}
      value={form[k]}
      onChange={(e) => setForm({ ...form, [k]: k === "postal" ? e.target.value.replace(/\D/g, "").slice(0, 5) : e.target.value })}
      {...props}
    />
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Checkout</h1>
        <Link href="/cart" className="text-sm font-semibold text-jade-700 hover:underline">← Ubah keranjang</Link>
      </div>

      <form onSubmit={submit} noValidate className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="card p-5">
            <p className="font-bold">Data penerima & alamat</p>
            <p className="mt-0.5 text-xs text-ink/45">
              Pesanan tercatat di akun <b>@{user?.username}</b>. Terisi otomatis dari{" "}
              <Link href="/profile" className="font-semibold text-jade-700 hover:underline">profilmu</Link>.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="co-name">Nama penerima *</label>
                {input("name", { placeholder: "Budi Santoso", autoComplete: "name" })}
                {showErr("name")}
              </div>
              <div>
                <label className="label" htmlFor="co-phone">No. WhatsApp *</label>
                {input("phone", { placeholder: "0812xxxxxxx", inputMode: "tel", autoComplete: "tel" })}
                {showErr("phone")}
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="co-email">Email (untuk notifikasi pesanan)</label>
                {input("email", { type: "email", placeholder: user?.email, autoComplete: "email" })}
                {showErr("email")}
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="co-address">Alamat lengkap *</label>
                <textarea
                  id="co-address"
                  className={`input ${touched && errs.address ? "border-coral-400" : ""}`}
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Jl. Merdeka No. 10, RT 01/RW 02, Kel. Sukajadi"
                  autoComplete="street-address"
                  maxLength={300}
                />
                {showErr("address")}
              </div>
              <div>
                <label className="label" htmlFor="co-city">Kota / Kabupaten *</label>
                {input("city", { placeholder: "Bandung", autoComplete: "address-level2" })}
                {showErr("city")}
              </div>
              <div>
                <label className="label" htmlFor="co-postal">Kode pos</label>
                {input("postal", { placeholder: "40111", inputMode: "numeric", autoComplete: "postal-code" })}
                {showErr("postal")}
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="co-notes">Catatan untuk kurir (opsional)</label>
                <input id="co-notes" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} placeholder="Mis. titip di pos satpam, rumah pagar hijau" />
              </div>
            </div>
            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-ink/70">
              <input type="checkbox" className="accent-jade-700" checked={saveProfile} onChange={(e) => setSaveProfile(e.target.checked)} />
              Simpan alamat ini di profil untuk checkout berikutnya
            </label>
          </section>

          <section className="card p-5">
            <p className="font-bold">Kurir</p>
            <div className="mt-3 space-y-2">
              {(quote?.couriers ?? []).map((c) => (
                <label key={c.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${courierId === c.id ? "border-jade-700 bg-jade-50" : "border-ink/10 hover:border-ink/25"}`}>
                  <input type="radio" name="courier" checked={courierId === c.id} onChange={() => setCourierId(c.id)} className="accent-jade-700" />
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

        <div className="h-fit space-y-4 lg:sticky lg:top-24">
          <div className="card p-5">
            <p className="font-bold">Pesananmu · {units} item</p>
            {quoteError && <p className="mt-3 rounded-lg bg-coral-50 p-2 text-xs font-semibold text-coral-600">{quoteError} — <Link href="/cart" className="underline">perbaiki keranjang</Link></p>}
            <div className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-1">
              {(quote?.items ?? []).map((it) => (
                <div key={`${it.productId}-${it.color}-${it.size}`} className="flex items-center gap-3 text-sm">
                  <div className="h-12 w-12 shrink-0 rounded-lg bg-jade-50 p-0.5">
                    <Mockup type={it.type as ProductType} colorHex={COLORS[it.color]?.hex ?? "#ddd"} designUri={it.designUri} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{it.title}</p>
                    <p className="text-xs text-ink/55">
                      {COLORS[it.color]?.label ?? it.color} · {it.size} · {it.qty} × {rupiah(it.price)}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold">{rupiah(it.lineTotal)}</span>
                </div>
              ))}
              {!quote && !quoteError && <p className="text-sm text-ink/50">Menghitung…</p>}
            </div>

            {/* voucher */}
            <div className="mt-4 border-t border-ink/8 pt-4">
              <p className="label">Voucher</p>
              {voucher && quote?.voucher ? (
                <div className="flex items-start justify-between gap-2 rounded-xl border border-jade-700 bg-jade-50 p-3 text-sm">
                  <span>
                    <span className="font-bold text-jade-800">🎟️ {quote.voucher.code}</span>
                    <span className="block text-xs text-ink/60">{quote.voucher.description}</span>
                  </span>
                  <button type="button" onClick={removeVoucher} className="text-xs font-semibold text-coral-600 hover:underline">Hapus</button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      className="input flex-1 uppercase"
                      value={voucherInput}
                      onChange={(e) => { setVoucherInput(e.target.value); setVoucherMsg(""); }}
                      onKeyDown={(e) => e.key === "Enter" && applyVoucher(e)}
                      placeholder="Masukkan kode"
                      aria-label="Kode voucher"
                      maxLength={20}
                    />
                    <button type="button" onClick={() => applyVoucher()} disabled={!voucherInput.trim()} className="btn-secondary btn-sm disabled:opacity-50">
                      Pakai
                    </button>
                  </div>
                  {voucherMsg && <p className="mt-1.5 text-xs font-semibold text-coral-600">{voucherMsg}</p>}
                  {process.env.NODE_ENV !== "production" && (
                    <p className="mt-1.5 text-xs text-ink/45">Demo: KARYAKITA10 · HEMAT25 · GRATISONGKIR</p>
                  )}
                </>
              )}
            </div>

            <div className="mt-4 space-y-1.5 border-t border-ink/8 pt-3 text-sm">
              <div className="flex justify-between"><span className="text-ink/60">Subtotal ({units} item)</span><span>{quote ? rupiah(quote.subtotal) : "—"}</span></div>
              <div className="flex justify-between"><span className="text-ink/60">Ongkir ({quote?.courier.label ?? "—"})</span><span>{quote ? rupiah(quote.shipping) : "—"}</span></div>
              {quote && quote.discount > 0 && (
                <div className="flex justify-between text-jade-800"><span>Diskon voucher</span><span>− {rupiah(quote.discount)}</span></div>
              )}
              <div className="flex justify-between pt-1 text-base font-extrabold"><span>Total</span><span className="text-jade-800">{quote ? rupiah(quote.total) : "—"}</span></div>
            </div>
            {error && <p className="mt-3 rounded-lg bg-coral-50 p-2 text-xs font-semibold text-coral-600">{error}</p>}
            {touched && !formValid && <p className="mt-3 text-xs font-semibold text-coral-600">Lengkapi data penerima yang ditandai.</p>}
            <button type="submit" disabled={!quote || !!quoteError || busy} className="btn-primary mt-5 w-full disabled:opacity-50" data-track="bayar-sekarang">
              {busy ? "Membuat pesanan…" : quote ? `Buat pesanan · ${rupiah(quote.total)}` : "Menghitung…"}
            </button>
            <p className="mt-3 text-center text-xs text-ink/45">🔒 Pembayaran aman via gateway sandbox (demo)</p>
          </div>
        </div>
      </form>

      {order && (
        <PaymentModal
          order={order}
          onClose={() => router.push(`/order/${order.id}`)}
          onPaid={() => {
            track("click", { label: "payment-done" });
            router.push(`/order/${order.id}`);
          }}
        />
      )}
    </div>
  );
}
