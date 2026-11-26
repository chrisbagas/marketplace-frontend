"use client";

import { useCallback, useEffect, useState } from "react";
import { getPayoutQueue, PAYOUT_STATUS, updatePayout } from "@/lib/payouts";
import { fmtDate, rupiah } from "@/lib/format";
import type { Payout, PayoutBalance } from "@/lib/types";

// Tab "Penarikan" di dashboard admin: antrean penarikan saldo kreator.
// Transfer dikerjakan manual lewat bank/e-wallet, lalu dicatat di sini
// beserta nomor referensinya. Menolak pengajuan mengembalikan dana ke saldo.

const FILTERS = [
  { id: "terbuka", label: "Perlu diproses" },
  { id: "dibayar", label: "Ditransfer" },
  { id: "ditolak", label: "Ditolak" },
  { id: "", label: "Semua" },
];

export default function PayoutsPanel() {
  const [filter, setFilter] = useState("terbuka");
  const [data, setData] = useState<{ payouts: Payout[]; balances: Record<string, PayoutBalance> } | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    getPayoutQueue(filter).then(setData).catch((e: Error) => setError(e.message));
  }, [filter]);
  useEffect(load, [load]);

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`chip border text-xs transition ${filter === f.id ? "border-ink bg-ink text-white" : "border-ink/12 bg-white text-ink/60 hover:border-ink/30"}`}
          >
            {f.label}
          </button>
        ))}
        <p className="ml-auto text-xs text-ink/50">Transfer manual ke rekening kreator, lalu catat nomor referensinya.</p>
      </div>

      {error && <p className="card mt-4 p-4 text-sm text-coral-600">{error}</p>}
      {data && data.payouts.length === 0 && (
        <div className="card mt-4 p-8 text-center text-sm text-ink/55">Tidak ada penarikan di daftar ini.</div>
      )}
      <div className="mt-4 space-y-3">
        {data?.payouts.map((p) => (
          <PayoutRow key={p.id} p={p} balance={data.balances[p.designerId]} onChanged={load} />
        ))}
      </div>
    </div>
  );
}

function PayoutRow({ p, balance, onChanged }: { p: Payout; balance?: PayoutBalance; onChanged: () => void }) {
  const [mode, setMode] = useState<"" | "paid" | "reject">("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const open = p.status === "diminta" || p.status === "diproses";

  async function act(action: "process" | "paid" | "reject") {
    setBusy(true);
    setError("");
    try {
      await updatePayout(p.id, action, action === "paid" ? { reference: text } : action === "reject" ? { note: text } : {});
      setMode("");
      setText("");
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-lg font-extrabold" style={{ fontVariantNumeric: "tabular-nums" }}>{rupiah(p.amount)}</p>
          <p className="text-sm font-semibold">{p.designerName} <span className="font-normal text-ink/45">· {p.designerId}</span></p>
          <p className="text-xs text-ink/50">Diajukan {fmtDate(p.requestedAt)} · #{p.id}</p>
        </div>
        <div className="text-sm">
          <p className="text-xs text-ink/50">Transfer ke</p>
          {p.bank ? (
            <>
              <p className="font-semibold">{p.bank.bankName} · <span className="select-all" style={{ fontVariantNumeric: "tabular-nums" }}>{p.bank.account}</span></p>
              <p className="text-xs text-ink/60">a.n. {p.bank.holder}</p>
            </>
          ) : (
            <p className="text-xs text-ink/45">—</p>
          )}
        </div>
        <div className="text-right">
          <span className={`chip text-xs ${PAYOUT_STATUS[p.status].chip}`}>{PAYOUT_STATUS[p.status].label}</span>
          {balance && open && (
            <p className="mt-1 text-xs text-ink/50">Royalti selesai {rupiah(balance.released)} · sudah ditransfer {rupiah(balance.withdrawn)}</p>
          )}
          {p.reference && <p className="mt-1 text-xs text-ink/60">Ref: {p.reference}</p>}
          {p.paidAt && <p className="text-xs text-ink/45">{fmtDate(p.paidAt)}</p>}
          {p.note && <p className="mt-1 max-w-64 text-xs text-coral-600">{p.note}</p>}
        </div>
      </div>

      {open && (
        <div className="mt-3 border-t border-ink/8 pt-3">
          {mode === "" ? (
            <div className="flex flex-wrap gap-2">
              {p.status === "diminta" && (
                <button className="btn-secondary btn-sm" disabled={busy} onClick={() => act("process")}>Tandai diproses</button>
              )}
              <button className="btn-primary btn-sm" onClick={() => setMode("paid")}>Sudah ditransfer…</button>
              <button className="btn-secondary btn-sm text-coral-600" onClick={() => setMode("reject")}>Tolak…</button>
            </div>
          ) : (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                act(mode);
              }}
            >
              <input
                className="input max-w-sm py-2 text-sm"
                autoFocus
                required
                maxLength={mode === "paid" ? 60 : 300}
                placeholder={mode === "paid" ? "No. referensi transfer bank" : "Alasan penolakan (terlihat oleh kreator)"}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <button type="submit" className={mode === "paid" ? "btn-primary btn-sm" : "btn-secondary btn-sm text-coral-600"} disabled={busy}>
                {busy ? "Menyimpan…" : mode === "paid" ? "Catat transfer" : "Tolak penarikan"}
              </button>
              <button type="button" className="text-sm text-ink/50 hover:text-ink" onClick={() => { setMode(""); setText(""); }}>Batal</button>
            </form>
          )}
          {error && <p className="mt-2 rounded-lg bg-coral-50 p-2 text-xs font-semibold text-coral-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
