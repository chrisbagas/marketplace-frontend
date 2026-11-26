"use client";

import type { BankAccount, FinanceFlow, FinanceOwed, Producer, ProducerPayout } from "./types";

// Keuangan platform (admin): pembagian uang per pesanan, tagihan produsen.

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

export async function getFinance(from?: string, to?: string) {
  const q = new URLSearchParams();
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  return json<{ flow: FinanceFlow; owed: FinanceOwed }>(await fetch(`/api/finance?${q}`, { cache: "no-store" }));
}

export async function getProducers(): Promise<Producer[]> {
  return (await json<{ producers: Producer[] }>(await fetch("/api/producers", { cache: "no-store" }))).producers;
}

export async function saveProducer(id: string, p: { name: string; contact: string; bank?: BankAccount }) {
  await json(await send(`/api/producers/${id}`, p, "PATCH"));
}

export async function setProductionCost(typeId: string, productionCost: number) {
  await json(await send(`/api/product-types/${typeId}`, { productionCost }, "PATCH"));
}

export async function payProducer(id: string, reference: string, note: string): Promise<ProducerPayout> {
  return (await json<{ payout: ProducerPayout }>(await send(`/api/producers/${id}/payouts`, { reference, note }))).payout;
}
