"use client";

import type { Order } from "./types";

// Pembayaran. Penyedia ditentukan server (GET /api/payments/config):
//   midtrans — popup Midtrans Snap; lunas/tidaknya diputuskan SERVER lewat
//              webhook / pengecekan status ke Midtrans (bukan dari callback browser)
//   mock     — pembayaran tiruan untuk dev tanpa kunci Midtrans
//   none     — pembayaran dinonaktifkan (produksi tanpa kunci)

export type PaymentConfig = {
  provider: "midtrans" | "mock" | "none";
  clientKey?: string;
  snapUrl?: string;
  production?: boolean;
};

let configPromise: Promise<PaymentConfig> | null = null;

export function getPaymentConfig(): Promise<PaymentConfig> {
  configPromise ??= fetch("/api/payments/config", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`config ${r.status}`))))
    .catch((e) => {
      configPromise = null; // coba lagi di pemanggilan berikutnya
      throw e;
    });
  return configPromise;
}

async function post<T>(path: string): Promise<T> {
  const res = await fetch(path, { method: "POST", signal: AbortSignal.timeout(20_000) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Gagal (${res.status})`);
  return data as T;
}

export const createPaymentSession = (orderId: string) =>
  post<{ token: string; expiresAt: number }>(`/api/orders/${orderId}/payment`);

// Minta server memeriksa status ke Midtrans lalu menerapkannya; mengembalikan pesanan terbaru.
export async function syncPayment(orderId: string): Promise<Order> {
  return (await post<{ order: Order }>(`/api/orders/${orderId}/payment/sync`)).order;
}

// ---- Snap -------------------------------------------------------------------

type SnapCallbacks = {
  onSuccess?: (r: unknown) => void;
  onPending?: (r: unknown) => void;
  onError?: (r: unknown) => void;
  onClose?: () => void;
};
declare global {
  interface Window {
    snap?: { pay: (token: string, cb: SnapCallbacks) => void };
  }
}

let snapLoading: Promise<void> | null = null;

function loadSnap(cfg: PaymentConfig): Promise<void> {
  if (window.snap) return Promise.resolve();
  snapLoading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = cfg.snapUrl!;
    s.setAttribute("data-client-key", cfg.clientKey!);
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      snapLoading = null;
      s.remove();
      reject(new Error("Gagal memuat popup pembayaran. Periksa koneksi internet lalu coba lagi."));
    };
    document.head.appendChild(s);
  });
  return snapLoading;
}

export type PayResult = "success" | "pending" | "closed" | "error";

// Buka popup Snap untuk pesanan. Setelah popup selesai/ditutup, server diminta
// memeriksa status ke Midtrans — hasil akhirnya dibaca dari pesanan, bukan dari callback.
export async function payWithSnap(orderId: string, cfg: PaymentConfig): Promise<{ result: PayResult; order?: Order }> {
  const [{ token }] = await Promise.all([createPaymentSession(orderId), loadSnap(cfg)]);
  const result = await new Promise<PayResult>((resolve) => {
    window.snap!.pay(token, {
      onSuccess: () => resolve("success"),
      onPending: () => resolve("pending"),
      onError: () => resolve("error"),
      onClose: () => resolve("closed"),
    });
  });
  const order = await syncPayment(orderId).catch(() => undefined);
  return { result, order };
}
