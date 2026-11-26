"use client";

import type { DesignReport, ReportReason, ReportStatus } from "./types";

// Laporan pelanggaran hak cipta / merek / konten (backend internal/api/reports.go).

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Gagal (${res.status})`);
  return data as T;
}

const send = (path: string, body: unknown, method = "POST") =>
  fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });

// batas harus sama dengan backend (reports.go)
export const REPORT_DESC_MIN = 10;
export const REPORT_DESC_MAX = 2000;
export const REPORT_EVIDENCE_MAX = 500;
export const REPORT_NOTE_MAX = 500;

export const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: "hak-cipta", label: "Pelanggaran hak cipta" },
  { id: "merek-dagang", label: "Pelanggaran merek dagang" },
  { id: "konten-tidak-pantas", label: "Konten tidak pantas" },
  { id: "lainnya", label: "Lainnya" },
];

export const REPORT_REASON_LABEL = Object.fromEntries(REPORT_REASONS.map((r) => [r.id, r.label])) as Record<ReportReason, string>;

export const REPORT_STATUS: Record<ReportStatus, { label: string; chip: string }> = {
  baru: { label: "Baru", chip: "bg-coral-100 text-coral-600" },
  ditinjau: { label: "Ditinjau", chip: "bg-sun-100 text-sun-600" },
  ditindak: { label: "Ditindak", chip: "bg-jade-100 text-jade-800" },
  ditolak: { label: "Ditolak", chip: "bg-ink/8 text-ink/60" },
};

export type ReportInput = {
  listingId: string;
  reason: ReportReason;
  email: string;
  description: string;
  evidenceUrl?: string;
};

export async function submitReport(input: ReportInput): Promise<void> {
  try {
    await json<{ ok: boolean }>(await send("/api/reports", input));
  } catch (e) {
    if (e instanceof DOMException) throw new Error("Server tidak merespons. Periksa koneksi lalu coba lagi.");
    throw e;
  }
}

export type ReportList = { reports: DesignReport[]; counts: Partial<Record<ReportStatus, number>> };

export async function getReports(status: ReportStatus | "", limit?: number): Promise<ReportList> {
  const q = new URLSearchParams();
  if (status) q.set("status", status);
  if (limit !== undefined) q.set("limit", String(limit));
  return json<ReportList>(await fetch(`/api/reports${q.size ? `?${q}` : ""}`, { cache: "no-store" }));
}

export async function updateReport(id: number, action: "review" | "takedown" | "reject", note = ""): Promise<DesignReport> {
  return (await json<{ report: DesignReport }>(await send(`/api/reports/${id}`, { action, note }, "PATCH"))).report;
}
