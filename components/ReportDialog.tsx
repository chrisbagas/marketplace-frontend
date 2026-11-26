"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/auth";
import {
  REPORT_DESC_MAX,
  REPORT_DESC_MIN,
  REPORT_EVIDENCE_MAX,
  REPORT_REASONS,
  submitReport,
} from "@/lib/reports";
import type { ReportReason } from "@/lib/types";

// "Laporkan desain ini": a small link on the product page that opens a modal.
// Anyone can report; the email is prefilled for logged-in users.

export default function ReportDialog({ listingId, title }: { listingId: string; title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-ink/50 underline-offset-2 hover:text-coral-600 hover:underline"
        data-track="laporkan-desain"
      >
        Laporkan desain ini
      </button>
      {open && <ReportModal listingId={listingId} title={title} onClose={() => setOpen(false)} />}
    </>
  );
}

function ReportModal({ listingId, title, onClose }: { listingId: string; title: string; onClose: () => void }) {
  const { user } = useSession();
  const [reason, setReason] = useState<ReportReason | "">("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const touchedEmail = useRef(false);

  // prefill once the session is known, unless the visitor already typed something
  useEffect(() => {
    if (user && !touchedEmail.current) setEmail(user.email);
  }, [user]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return;
    setBusy(true);
    setError("");
    try {
      await submitReport({ listingId, reason, email, description, evidenceUrl: evidenceUrl.trim() || undefined });
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="report-title" className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
        {sent ? (
          <div className="text-center">
            <p className="text-3xl">✓</p>
            <p id="report-title" className="mt-2 text-lg font-extrabold">Laporan terkirim</p>
            <p className="mt-1 text-sm text-ink/60">Terima kasih. Tim KaryaKita akan meninjau laporanmu dan menghubungi {email} bila perlu.</p>
            <button className="btn-primary mt-5 w-full" onClick={onClose}>Tutup</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <p id="report-title" className="text-lg font-extrabold">Laporkan desain ini</p>
            <p className="mt-0.5 text-sm text-ink/55">{title}</p>

            <label className="label mt-4" htmlFor="report-reason">Alasan</label>
            <select id="report-reason" className="input" required value={reason} onChange={(e) => setReason(e.target.value as ReportReason)}>
              <option value="" disabled>Pilih alasan…</option>
              {REPORT_REASONS.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>

            <label className="label mt-4" htmlFor="report-email">Email kamu</label>
            <input
              id="report-email"
              className="input"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => {
                touchedEmail.current = true;
                setEmail(e.target.value);
              }}
            />

            <label className="label mt-4" htmlFor="report-desc">Penjelasan</label>
            <textarea
              id="report-desc"
              className="input min-h-28"
              required
              minLength={REPORT_DESC_MIN}
              maxLength={REPORT_DESC_MAX}
              placeholder="Jelaskan apa yang dilanggar, mis. karya asli milik siapa."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <p className="mt-1 text-right text-xs text-ink/40">{description.length}/{REPORT_DESC_MAX}</p>

            <label className="label mt-2" htmlFor="report-evidence">Link bukti <span className="font-normal text-ink/45">(opsional)</span></label>
            <input
              id="report-evidence"
              className="input"
              type="url"
              maxLength={REPORT_EVIDENCE_MAX}
              placeholder="https://…"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
            />

            {error && <p className="mt-3 rounded-lg bg-coral-50 p-2 text-xs font-semibold text-coral-600">{error}</p>}

            <div className="mt-5 flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={onClose}>Batal</button>
              <button type="submit" className="btn-primary flex-1 disabled:opacity-50" disabled={busy || !reason}>
                {busy ? "Mengirim…" : "Kirim laporan"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
