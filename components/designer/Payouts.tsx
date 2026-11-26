"use client";

import { useState } from "react";
import { maskAccount, PAYOUT_BANKS, PAYOUT_STATUS, requestPayout, saveBank, type DesignerPayouts } from "@/lib/payouts";
import { fmtDate, rupiah } from "@/lib/format";
import type { BankAccount } from "@/lib/types";

// Kartu "Penarikan dana" di dashboard kreator: saldo, rekening tujuan,
// pengajuan penarikan, dan riwayatnya. Royalti baru bisa ditarik setelah
// pesanan selesai (pembeli konfirmasi / selesai otomatis 2 hari setelah tiba).

export default function Payouts({ data, reload }: { data: DesignerPayouts | null; reload: () => void }) {
  const [editingBank, setEditingBank] = useState(false);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!data) return <div className="card h-64 animate-pulse p-5" />;
  const { balance: b, bank, payouts, minimum } = data;
  const open = payouts.find((p) => p.status === "diminta" || p.status === "diproses");
  const canWithdraw = !!bank && !open && b.available >= minimum;

  async function withdraw(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await requestPayout(Number(amount || b.available));
      setAmount("");
      reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card h-fit p-5">
      <p className="font-bold">Penarikan dana</p>
      <p className="mt-2 text-2xl font-extrabold text-jade-800">{rupiah(b.available)}</p>
      <p className="text-xs text-ink/50">bisa ditarik sekarang</p>

      <dl className="mt-3 space-y-1 border-t border-ink/8 pt-3 text-xs">
        <Row label="Tertahan (pesanan belum selesai)" value={rupiah(b.pending)} hint="Cair setelah pembeli menerima paket" />
        {b.inProcess > 0 && <Row label="Sedang diproses" value={rupiah(b.inProcess)} />}
        <Row label="Sudah ditransfer" value={rupiah(b.withdrawn)} />
      </dl>

      <div className="mt-4 border-t border-ink/8 pt-3">
        {editingBank || !bank ? (
          <BankForm initial={bank} onCancel={bank ? () => setEditingBank(false) : undefined} onSaved={() => { setEditingBank(false); reload(); }} />
        ) : (
          <div className="flex items-start justify-between gap-2 text-xs">
            <div>
              <p className="text-ink/50">Rekening tujuan</p>
              <p className="font-semibold">{bank.bankName} {maskAccount(bank.account)}</p>
              <p className="text-ink/50">a.n. {bank.holder}</p>
            </div>
            <button onClick={() => setEditingBank(true)} className="font-semibold text-jade-700 hover:underline">Ubah</button>
          </div>
        )}
      </div>

      {bank && !editingBank && (
        <form onSubmit={withdraw} className="mt-4">
          {open ? (
            <p className="rounded-lg bg-sun-100 p-2 text-xs text-sun-600">
              Penarikan {rupiah(open.amount)} sedang {open.status === "diminta" ? "menunggu diproses" : "diproses"} admin. Transfer biasanya 1–2 hari kerja.
            </p>
          ) : (
            <>
              <label className="label flex justify-between" htmlFor="payout-amount">
                <span>Nominal</span>
                <span className="text-ink/45">min {rupiah(minimum)}</span>
              </label>
              <div className="flex gap-2">
                <input
                  id="payout-amount"
                  className="input py-2 text-sm"
                  inputMode="numeric"
                  placeholder={String(b.available)}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                  disabled={!canWithdraw}
                />
                <button type="button" className="btn-secondary btn-sm shrink-0" onClick={() => setAmount(String(b.available))} disabled={!canWithdraw}>
                  Semua
                </button>
              </div>
              <button type="submit" className="btn-primary btn-sm mt-2 w-full" disabled={!canWithdraw || busy} data-track="tarik-saldo">
                {busy ? "Mengajukan…" : `Tarik ke ${bank.bankName} ${maskAccount(bank.account)}`}
              </button>
              {b.available < minimum && (
                <p className="mt-2 text-xs text-ink/50">Saldo bisa ditarik setelah mencapai {rupiah(minimum)}.</p>
              )}
            </>
          )}
          {error && <p className="mt-2 rounded-lg bg-coral-50 p-2 text-xs font-semibold text-coral-600">{error}</p>}
        </form>
      )}

      {payouts.length > 0 && (
        <div className="mt-4 border-t border-ink/8 pt-3">
          <p className="text-xs font-semibold text-ink/50">Riwayat penarikan</p>
          <ul className="mt-2 space-y-2">
            {payouts.slice(0, 6).map((p) => (
              <li key={p.id} className="text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>{rupiah(p.amount)}</span>
                  <span className={`chip text-[10px] ${PAYOUT_STATUS[p.status].chip}`}>{PAYOUT_STATUS[p.status].label}</span>
                </div>
                <p className="text-ink/45">
                  {fmtDate(p.requestedAt)}
                  {p.reference && ` · ref ${p.reference}`}
                </p>
                {p.status === "ditolak" && p.note && <p className="text-coral-600">Alasan: {p.note}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex justify-between gap-2" title={hint}>
      <dt className="text-ink/55">{label}</dt>
      <dd className="font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>{value}</dd>
    </div>
  );
}

function BankForm({ initial, onCancel, onSaved }: { initial: BankAccount | null; onCancel?: () => void; onSaved: () => void }) {
  const [bank, setBank] = useState<BankAccount>(initial ?? { bankName: "BCA", account: "", holder: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await saveBank(bank);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const ewallet = ["GoPay", "OVO", "DANA", "ShopeePay"].includes(bank.bankName);
  return (
    <form onSubmit={save} className="space-y-2">
      <p className="text-xs font-semibold">{initial ? "Ubah rekening tujuan" : "Isi rekening tujuan penarikan"}</p>
      <select className="input py-2 text-sm" value={bank.bankName} onChange={(e) => setBank({ ...bank, bankName: e.target.value })} aria-label="Bank atau e-wallet">
        {PAYOUT_BANKS.map((b) => <option key={b}>{b}</option>)}
      </select>
      <input
        className="input py-2 text-sm"
        inputMode="numeric"
        placeholder={ewallet ? "Nomor HP terdaftar" : "Nomor rekening"}
        aria-label="Nomor rekening"
        value={bank.account}
        onChange={(e) => setBank({ ...bank, account: e.target.value })}
        required
      />
      <input
        className="input py-2 text-sm"
        placeholder="Nama pemilik rekening"
        aria-label="Nama pemilik rekening"
        maxLength={80}
        value={bank.holder}
        onChange={(e) => setBank({ ...bank, holder: e.target.value })}
        required
      />
      {error && <p className="rounded-lg bg-coral-50 p-2 text-xs font-semibold text-coral-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary btn-sm flex-1" disabled={busy}>{busy ? "Menyimpan…" : "Simpan rekening"}</button>
        {onCancel && <button type="button" className="btn-secondary btn-sm" onClick={onCancel}>Batal</button>}
      </div>
      <p className="text-[11px] text-ink/45">Nama harus sama dengan buku tabungan / akun e-wallet, atau transfer ditolak.</p>
    </form>
  );
}
