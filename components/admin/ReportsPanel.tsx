"use client";

import { useCallback, useEffect, useState } from "react";
import { fmtDate } from "@/lib/format";
import { getReports, REPORT_NOTE_MAX, REPORT_REASON_LABEL, REPORT_STATUS, updateReport, type ReportList } from "@/lib/reports";
import type { DesignReport, ReportStatus } from "@/lib/types";

// Tab "Laporan" di dashboard admin: laporan pelanggaran hak cipta / merek /
// konten dari pengunjung. "Nonaktifkan listing" menyembunyikan produk dari
// katalog + pencarian dan mengirim email ke kreator; "Tolak" butuh catatan.

const FILTERS: { id: ReportStatus | ""; label: string }[] = [
  { id: "baru", label: "Baru" },
  { id: "ditinjau", label: "Ditinjau" },
  { id: "ditindak", label: "Ditindak" },
  { id: "ditolak", label: "Ditolak" },
  { id: "", label: "Semua" },
];

export default function ReportsPanel() {
  const [filter, setFilter] = useState<ReportStatus | "">("baru");
  const [data, setData] = useState<ReportList | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    getReports(filter)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e: Error) => setError(e.message));
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
            {f.id && data?.counts[f.id] ? <span className="ml-1 opacity-70">{data.counts[f.id]}</span> : null}
          </button>
        ))}
        <p className="ml-auto text-xs text-ink/50">Menonaktifkan listing menghapusnya dari katalog dan pencarian.</p>
      </div>

      {error && <p className="card mt-4 p-4 text-sm text-coral-600">{error}</p>}
      {data && data.reports.length === 0 && (
        <div className="card mt-4 p-8 text-center text-sm text-ink/55">Tidak ada laporan di daftar ini.</div>
      )}
      <div className="mt-4 space-y-3">
        {data?.reports.map((r) => (
          <ReportRow key={r.id} r={r} onChanged={load} />
        ))}
      </div>
    </div>
  );
}

function ReportRow({ r, onChanged }: { r: DesignReport; onChanged: () => void }) {
  const [mode, setMode] = useState<"" | "takedown" | "reject">("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const open = r.status === "baru" || r.status === "ditinjau";

  async function act(action: "review" | "takedown" | "reject") {
    setBusy(true);
    setError("");
    try {
      await updateReport(r.id, action, note);
      setMode("");
      setNote("");
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
        <div className="flex min-w-0 gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={r.designUri} alt="" className="h-16 w-16 shrink-0 rounded-xl border border-ink/10 bg-white object-contain" />
          <div className="min-w-0">
            <a href={`/product/${r.listingId}`} target="_blank" rel="noreferrer" className="font-semibold text-jade-700 hover:underline">{r.listingTitle}</a>
            <p className="text-xs text-ink/55">
              oleh {r.designerName} · {r.listingActive ? "tayang" : <span className="font-semibold text-coral-600">nonaktif</span>}
            </p>
            <p className="mt-1 text-xs text-ink/50">#{r.id} · {fmtDate(r.createdAt)} · pelapor {r.email}</p>
          </div>
        </div>
        <div className="text-right">
          <span className={`chip text-xs ${REPORT_STATUS[r.status].chip}`}>{REPORT_STATUS[r.status].label}</span>
          <p className="mt-1 text-xs font-semibold text-ink/70">{REPORT_REASON_LABEL[r.reason]}</p>
        </div>
      </div>

      <p className="mt-3 whitespace-pre-line break-words text-sm text-ink/75">{r.description}</p>
      {r.evidenceUrl && (
        <p className="mt-2 break-all text-xs">
          Bukti: <a href={r.evidenceUrl} target="_blank" rel="noreferrer noopener" className="text-jade-700 hover:underline">{r.evidenceUrl}</a>
        </p>
      )}
      {r.adminNote && <p className="mt-2 text-xs text-ink/55">Catatan admin: {r.adminNote}</p>}

      {open && (
        <div className="mt-3 border-t border-ink/8 pt-3">
          {mode === "" ? (
            <div className="flex flex-wrap gap-2">
              {r.status === "baru" && (
                <button className="btn-secondary btn-sm" disabled={busy} onClick={() => act("review")}>Tandai ditinjau</button>
              )}
              <button className="btn-primary btn-sm" onClick={() => setMode("takedown")}>Nonaktifkan listing…</button>
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
                className="input max-w-md py-2 text-sm"
                autoFocus
                required={mode === "reject"}
                maxLength={REPORT_NOTE_MAX}
                placeholder={mode === "reject" ? "Alasan penolakan (wajib)" : "Catatan untuk kreator (opsional, ikut di email)"}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <button type="submit" className={mode === "takedown" ? "btn-primary btn-sm" : "btn-secondary btn-sm text-coral-600"} disabled={busy}>
                {busy ? "Menyimpan…" : mode === "takedown" ? "Nonaktifkan & email kreator" : "Tolak laporan"}
              </button>
              <button type="button" className="text-sm text-ink/50 hover:text-ink" onClick={() => { setMode(""); setNote(""); }}>Batal</button>
            </form>
          )}
          {error && <p className="mt-2 rounded-lg bg-coral-50 p-2 text-xs font-semibold text-coral-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
