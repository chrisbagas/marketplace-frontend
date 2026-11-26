"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getFinance, getProducers, payProducer, saveProducer, setProductionCost } from "@/lib/finance";
import { ORDER_STATUS } from "@/lib/orders";
import { maskAccount, PAYOUT_BANKS } from "@/lib/payouts";
import { fmtDate, rupiah } from "@/lib/format";
import type { BankAccount, FinanceFlow, FinanceOwed, Producer } from "@/lib/types";

// Tab "Keuangan" di dashboard admin. Semua uang pembeli masuk ke rekening
// platform; tab ini memisahkan mana yang hak produsen, kreator, gateway, dan
// mana yang benar-benar pendapatan platform — lalu mencatat pembayaran ke produsen.

const PERIODS = [
  { id: "bulan", label: "Bulan ini" },
  { id: "30", label: "30 hari" },
  { id: "semua", label: "Semua" },
] as const;

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function periodRange(id: (typeof PERIODS)[number]["id"]): [string?, string?] {
  const now = new Date();
  if (id === "bulan") return [ymd(new Date(now.getFullYear(), now.getMonth(), 1)), ymd(now)];
  if (id === "30") return [ymd(new Date(now.getTime() - 29 * 86400_000)), ymd(now)];
  return [];
}

const num = { fontVariantNumeric: "tabular-nums" } as const;

export default function FinancePanel() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["id"]>("bulan");
  const [data, setData] = useState<{ flow: FinanceFlow; owed: FinanceOwed } | null>(null);
  const [producers, setProducers] = useState<Producer[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    getFinance(...periodRange(period)).then(setData).catch((e: Error) => setError(e.message));
    getProducers().then(setProducers).catch((e: Error) => setError(e.message));
  }, [period]);
  useEffect(load, [load]);

  const f = data?.flow;
  const o = data?.owed;
  return (
    <div className="mt-6 space-y-6">
      {error && <p className="card p-4 text-sm text-coral-600">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* ---- ke mana uangnya ---- */}
        <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold">Ke mana uangnya</p>
            <div className="flex gap-1.5">
              {PERIODS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`chip border text-xs transition ${period === p.id ? "border-ink bg-ink text-white" : "border-ink/12 bg-white text-ink/60 hover:border-ink/30"}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-ink/50">Pesanan yang lunas pada periode ini · dibukukan saat pembayaran diterima</p>
          {f && (
            <dl className="mt-4 space-y-2 text-sm" style={num}>
              <Line label={`Uang masuk dari pembeli (${f.orders} pesanan)`} value={f.received} strong />
              {f.refunded > 0 && <Line label={`Refund ke pembeli (${f.refunds}×)`} value={-f.refunded} />}
              <Line label="Produsen · biaya produksi" value={-f.production} />
              <Line label="Produsen · ongkir (produsen yang mengirim)" value={-f.shippingCost} />
              <Line label="Kreator · royalti" value={-f.creators} />
              <Line label="Midtrans · biaya transaksi (estimasi)" value={-f.gatewayFees} />
              <div className="border-t border-ink/10 pt-2">
                <Line label="Pendapatan bersih KaryaKita" value={f.platformIncome} strong accent />
              </div>
              {f.refunds > 0 && (
                <p className="text-xs text-ink/50">
                  {f.refunds} refund · {rupiah(f.refunded)} dikembalikan ke pembeli
                  {f.creatorsReversed > 0 && <>, royalti kreator {rupiah(f.creatorsReversed)} dibalik</>}. Biaya Midtrans tidak dikembalikan.
                </p>
              )}
              {f.reprints > 0 && (
                <p className="text-xs text-ink/50">
                  {f.reprints} pesanan cetak ulang gratis · tagihan produsen {rupiah(f.reprintCost)} ditanggung platform (sudah ada di baris produsen).
                </p>
              )}
              {f.discount > 0 && <p className="text-xs text-ink/50">Sudah dikurangi diskon voucher {rupiah(f.discount)} yang ditanggung platform.</p>}
              {f.received > 0 && (
                <p className="text-xs text-ink/50">Margin bersih {((f.platformIncome / f.received) * 100).toFixed(1)}% dari uang masuk.</p>
              )}
            </dl>
          )}
        </section>

        {/* ---- kewajiban saat ini ---- */}
        <section className="card p-5">
          <p className="font-bold">Uang orang lain di rekeningmu</p>
          <p className="text-xs text-ink/50">Posisi saat ini, semua periode</p>
          {o && (
            <dl className="mt-4 space-y-2 text-sm" style={num}>
              <Line label="Perkiraan saldo rekening dari transaksi" value={o.cashEstimate} strong />
              <Line label="Hak produsen · siap dibayar (sudah dikirim)" value={-o.producersReady} />
              <Line label="Hak produsen · masih produksi" value={-o.producersInProduction} />
              <Line label="Hak kreator · tertahan (pesanan belum selesai)" value={-o.creatorsHeld} />
              <Line label="Hak kreator · bisa / sedang ditarik" value={-o.creatorsAvailable} />
              <div className="border-t border-ink/10 pt-2">
                <Line label="Benar-benar milik KaryaKita" value={o.platformCash} strong accent />
              </div>
              <p className="text-xs text-ink/50">
                Saldo = uang masuk − biaya Midtrans − transfer ke kreator & produsen. Bandingkan dengan saldo bank sungguhan; selisih berarti ada transaksi di luar sistem.
              </p>
            </dl>
          )}
        </section>
      </div>

      {producers?.map((p) => <ProducerCard key={p.id} p={p} onChanged={load} />)}

      <p className="text-xs text-ink/45">
        Biaya Midtrans adalah estimasi dari tarif umum (QRIS 0,7%, VA Rp4.000, e-wallet 2%) — cocokkan dengan laporan settlement Midtrans.
        Konsultasikan kewajiban pajak (PPh atas royalti, PPN) dengan akuntan.
      </p>
    </div>
  );
}

function Line({ label, value, strong, accent }: { label: string; value: number; strong?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={strong ? "font-semibold" : "text-ink/60"}>{label}</dt>
      <dd className={`${strong ? "font-extrabold" : "font-semibold"} ${accent ? "text-lg text-jade-800" : value < 0 ? "text-ink/70" : ""}`}>
        {value < 0 ? `− ${rupiah(-value)}` : rupiah(Math.abs(value))}
      </dd>
    </div>
  );
}

function ProducerCard({ p, onChanged }: { p: Producer; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [ref, setRef] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ready = p.charges.filter((c) => c.ready);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm(`Catat transfer ${rupiah(p.ready)} ke ${p.name}? Pastikan uangnya sudah dikirim.`)) return;
    setBusy(true);
    setError("");
    try {
      await payProducer(p.id, ref, note);
      setRef("");
      setNote("");
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">Produsen (cetak + kirim)</p>
          <p className="text-lg font-extrabold">{p.name}</p>
          <p className="text-xs text-ink/55">
            {p.contact || "Kontak belum diisi"} ·{" "}
            {p.bank ? `${p.bank.bankName} ${maskAccount(p.bank.account)} a.n. ${p.bank.holder}` : "rekening belum diisi"}
          </p>
        </div>
        <button className="btn-secondary btn-sm" onClick={() => setEditing(!editing)}>{editing ? "Tutup" : "Ubah data vendor"}</button>
      </div>
      {editing && <ProducerForm p={p} onSaved={() => { setEditing(false); onChanged(); }} />}

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <CostTable p={p} onChanged={onChanged} />

        <div>
          <p className="text-sm font-bold">Tagihan berjalan</p>
          <p className="text-xs text-ink/50">
            Siap dibayar {rupiah(p.ready)} · masih produksi {rupiah(p.inProduction)} — vendor dibayar setelah paket diserahkan ke kurir.
          </p>
          {p.charges.length === 0 ? (
            <p className="mt-3 text-sm text-ink/55">Tidak ada tagihan terbuka.</p>
          ) : (
            <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-ink/8">
              <table className="w-full min-w-120 text-left text-xs" style={num}>
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-ink/8 text-ink/50">
                    <th className="p-2 font-semibold">Pesanan</th>
                    <th className="p-2 font-semibold">Status</th>
                    <th className="p-2 font-semibold">Pcs</th>
                    <th className="p-2 text-right font-semibold">Produksi</th>
                    <th className="p-2 text-right font-semibold">Ongkir</th>
                  </tr>
                </thead>
                <tbody>
                  {p.charges.map((c) => (
                    <tr key={c.orderId} className={`border-t border-ink/5 ${c.ready ? "" : "text-ink/45"}`}>
                      <td className="p-2 font-semibold">
                        <Link href={`/admin/pesanan/${c.orderId}`} className="hover:text-jade-700 hover:underline">{c.orderId}</Link>
                      </td>
                      <td className="p-2"><span className={`chip text-[10px] ${ORDER_STATUS[c.orderStatus].chip}`}>{ORDER_STATUS[c.orderStatus].label}</span></td>
                      <td className="p-2">{c.items}</td>
                      <td className="p-2 text-right">{rupiah(c.production)}</td>
                      <td className="p-2 text-right">{rupiah(c.shipping)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {ready.length > 0 && (
            <form onSubmit={pay} className="mt-3 rounded-lg bg-jade-50 p-3">
              <p className="text-sm font-semibold">Bayar {rupiah(p.ready)} untuk {ready.length} pesanan yang sudah dikirim</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <input className="input max-w-56 py-2 text-sm" required maxLength={60} placeholder="No. referensi transfer" value={ref} onChange={(e) => setRef(e.target.value)} />
                <input className="input max-w-64 py-2 text-sm" maxLength={300} placeholder="Catatan (opsional)" value={note} onChange={(e) => setNote(e.target.value)} />
                <button type="submit" className="btn-primary btn-sm" disabled={busy}>{busy ? "Menyimpan…" : "Catat pembayaran"}</button>
              </div>
            </form>
          )}
          {error && <p className="mt-2 rounded-lg bg-coral-50 p-2 text-xs font-semibold text-coral-600">{error}</p>}

          {p.payouts.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-ink/50">Riwayat pembayaran ke vendor</p>
              <ul className="mt-1 space-y-1 text-xs" style={num}>
                {p.payouts.slice(0, 8).map((x) => (
                  <li key={x.id} className="flex justify-between gap-2">
                    <span>{fmtDate(x.createdAt)} · ref {x.reference}{x.note ? ` · ${x.note}` : ""}</span>
                    <span className="font-semibold">{rupiah(x.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// Tarif vendor per pcs. Margin platform = harga dasar − biaya produksi;
// di atas harga dasar adalah margin kreator.
function CostTable({ p, onChanged }: { p: Producer; onChanged: () => void }) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  async function save(id: string) {
    setError("");
    setSaved("");
    try {
      await setProductionCost(id, Number(draft[id]));
      setDraft((d) => { const n = { ...d }; delete n[id]; return n; });
      setSaved(id);
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <p className="text-sm font-bold">Tarif vendor per pcs</p>
      <p className="text-xs text-ink/50">Berlaku untuk pesanan baru. Di atas harga dasar adalah bagian kreator.</p>
      <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-80 text-left text-xs" style={num}>
        <thead>
          <tr className="border-b border-ink/8 text-ink/50">
            <th className="py-2 font-semibold">Produk</th>
            <th className="py-2 font-semibold">Harga dasar</th>
            <th className="py-2 font-semibold">Biaya vendor</th>
            <th className="py-2 text-right font-semibold">Margin KaryaKita</th>
          </tr>
        </thead>
        <tbody>
          {p.products.map((c) => {
            const v = draft[c.id] ?? String(c.productionCost);
            const cost = Number(v) || 0;
            const changed = draft[c.id] !== undefined && cost !== c.productionCost;
            return (
              <tr key={c.id} className="border-t border-ink/5">
                <td className="py-2 font-semibold">{c.label}</td>
                <td className="py-2">{rupiah(c.basePrice)}</td>
                <td className="py-2">
                  <div className="flex items-center gap-1">
                    <input
                      className="input w-24 px-2 py-1 text-xs"
                      inputMode="numeric"
                      aria-label={`Biaya vendor ${c.label}`}
                      value={v}
                      onChange={(e) => setDraft({ ...draft, [c.id]: e.target.value.replace(/\D/g, "") })}
                    />
                    {changed && <button className="btn-primary btn-sm px-2 py-1 text-[11px]" onClick={() => save(c.id)}>Simpan</button>}
                    {saved === c.id && !changed && <span className="text-jade-700">✓</span>}
                  </div>
                </td>
                <td className={`py-2 text-right font-semibold ${c.basePrice - cost < 0 ? "text-coral-600" : "text-jade-800"}`}>{rupiah(c.basePrice - cost)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      {error && <p className="mt-2 rounded-lg bg-coral-50 p-2 text-xs font-semibold text-coral-600">{error}</p>}
    </div>
  );
}

function ProducerForm({ p, onSaved }: { p: Producer; onSaved: () => void }) {
  const [name, setName] = useState(p.name);
  const [contact, setContact] = useState(p.contact);
  const [bank, setBank] = useState<BankAccount>(p.bank ?? { bankName: "BCA", account: "", holder: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await saveProducer(p.id, { name, contact, bank: bank.account || bank.holder ? bank : undefined });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-4 grid gap-3 rounded-lg border border-ink/8 p-4 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor="pr-name">Nama vendor</label>
        <input id="pr-name" className="input py-2 text-sm" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="pr-contact">Kontak (PIC / WA)</label>
        <input id="pr-contact" className="input py-2 text-sm" maxLength={120} value={contact} onChange={(e) => setContact(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="pr-bank">Bank</label>
        <select id="pr-bank" className="input py-2 text-sm" value={bank.bankName} onChange={(e) => setBank({ ...bank, bankName: e.target.value })}>
          {PAYOUT_BANKS.map((b) => <option key={b}>{b}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="pr-acc">No. rekening</label>
        <input id="pr-acc" className="input py-2 text-sm" inputMode="numeric" value={bank.account} onChange={(e) => setBank({ ...bank, account: e.target.value })} />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="pr-holder">Nama pemilik rekening</label>
        <input id="pr-holder" className="input py-2 text-sm" maxLength={80} value={bank.holder} onChange={(e) => setBank({ ...bank, holder: e.target.value })} />
      </div>
      {error && <p className="rounded-lg bg-coral-50 p-2 text-xs font-semibold text-coral-600 sm:col-span-2">{error}</p>}
      <button type="submit" className="btn-primary btn-sm w-fit" disabled={busy}>{busy ? "Menyimpan…" : "Simpan vendor"}</button>
    </form>
  );
}
