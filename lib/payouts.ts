"use client";

import type { BankAccount, Payout, PayoutBalance, PayoutStatus } from "./types";

// Penarikan saldo kreator. Royalti tercatat saat pesanan dibayar, tapi baru
// bisa ditarik setelah pesanan selesai. Transfer dikerjakan manual oleh admin.

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

// harus sama dengan payoutBanks di backend/internal/api/payouts.go
export const PAYOUT_BANKS = [
  "BCA", "BRI", "BNI", "Mandiri", "BSI", "CIMB Niaga", "Permata", "BTN", "Danamon",
  "Bank Jago", "SeaBank", "Jenius (SMBC)", "GoPay", "OVO", "DANA", "ShopeePay",
];

export const PAYOUT_STATUS: Record<PayoutStatus, { label: string; chip: string }> = {
  diminta: { label: "Diajukan", chip: "bg-sun-100 text-sun-600" },
  diproses: { label: "Diproses", chip: "bg-sun-100 text-sun-600" },
  dibayar: { label: "Ditransfer", chip: "bg-jade-100 text-jade-800" },
  ditolak: { label: "Ditolak", chip: "bg-coral-100 text-coral-600" },
};

export const maskAccount = (acc: string) => (acc.length > 4 ? `•••• ${acc.slice(-4)}` : acc);

export type DesignerPayouts = {
  balance: PayoutBalance;
  bank: BankAccount | null;
  payouts: Payout[];
  minimum: number;
  daily: { date: string; amount: number }[]; // royalti dibukukan per hari, 14 hari terakhir
};

export async function getDesignerPayouts(): Promise<DesignerPayouts> {
  return json<DesignerPayouts>(await fetch("/api/designer/payouts", { cache: "no-store" }));
}

export async function saveBank(bank: BankAccount): Promise<BankAccount> {
  return (await json<{ bank: BankAccount }>(await send("/api/designer/bank", bank, "PATCH"))).bank;
}

export async function requestPayout(amount: number): Promise<Payout> {
  return (await json<{ payout: Payout }>(await send("/api/designer/payouts", { amount }))).payout;
}

export async function getPayoutQueue(status: string) {
  return json<{ payouts: Payout[]; balances: Record<string, PayoutBalance> }>(
    await fetch(`/api/payouts${status ? `?status=${status}` : ""}`, { cache: "no-store" }),
  );
}

export async function updatePayout(id: number, action: "process" | "paid" | "reject", extra: { reference?: string; note?: string } = {}) {
  return (await json<{ payout: Payout }>(await send(`/api/payouts/${id}`, { action, ...extra }, "PATCH"))).payout;
}
