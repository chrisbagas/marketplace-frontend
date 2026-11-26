import type { Product, PublicDesigner } from "./types";

// Di browser cukup path relatif (diproxy next.config.ts ke backend Go).
// Di server component harus URL absolut ke backend langsung.
export const API_BASE =
  typeof window === "undefined" ? process.env.API_URL ?? "http://localhost:8081" : "";

// Unpaged list, best sellers first (home page, creator dashboard). The
// catalog page searches and filters through lib/search.ts instead.
export async function getProducts(
  params: { type?: string; designer?: string } = {}
): Promise<Product[]> {
  const sp = new URLSearchParams();
  if (params.type && params.type !== "semua") sp.set("type", params.type);
  if (params.designer) sp.set("designer", params.designer); // termasuk listing nonaktif
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

export async function getDesigner(id: string): Promise<PublicDesigner | null> {
  const res = await fetch(`${API_BASE}/api/designers/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET /api/designers/${id} ${res.status}`);
  return (await res.json()).designer;
}
