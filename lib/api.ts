import type { Product } from "./types";

// Di browser cukup path relatif (diproxy next.config.ts ke backend Go).
// Di server component harus URL absolut ke backend langsung.
export const API_BASE =
  typeof window === "undefined" ? process.env.API_URL ?? "http://localhost:8081" : "";

export async function getProducts(params: { type?: string; q?: string; category?: string } = {}): Promise<Product[]> {
  const sp = new URLSearchParams();
  if (params.type && params.type !== "semua") sp.set("type", params.type);
  if (params.q) sp.set("q", params.q);
  if (params.category && params.category !== "semua") sp.set("category", params.category);
  const res = await fetch(`${API_BASE}/api/products?${sp}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET /api/products ${res.status}`);
  return (await res.json()).products;
}

export async function getProduct(id: string): Promise<Product | null> {
  const res = await fetch(`${API_BASE}/api/products/${id}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET /api/products/${id} ${res.status}`);
  return (await res.json()).product;
}
