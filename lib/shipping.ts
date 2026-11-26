"use client";

import type { AreaOption } from "./types";

// Pengiriman. Penyedia ditentukan server (GET /api/shipping/config):
//   biteship — ongkir langsung per tujuan; tujuan dipilih lewat autocomplete area
//   flat     — tarif flat + kota diketik bebas (dev tanpa BITESHIP_API_KEY)

export type ShippingProvider = "biteship" | "flat";

let configPromise: Promise<ShippingProvider> | null = null;

export function getShippingProvider(): Promise<ShippingProvider> {
  configPromise ??= fetch("/api/shipping/config", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`config ${r.status}`))))
    .then((d: { provider: ShippingProvider }) => d.provider)
    .catch((e) => {
      configPromise = null; // coba lagi di pemanggilan berikutnya
      throw e;
    });
  return configPromise;
}

export async function searchAreas(q: string, signal?: AbortSignal): Promise<AreaOption[]> {
  const res = await fetch(`/api/shipping/areas?q=${encodeURIComponent(q)}`, { cache: "no-store", signal });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Gagal (${res.status})`);
  return data.areas ?? [];
}
