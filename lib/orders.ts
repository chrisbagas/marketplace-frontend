"use client";

import type { CartItem } from "./cart";
import type { CreatorOrderItem, CreatorOrderSummary, Order, Quote, Voucher } from "./types";

// Panggilan API pesanan & checkout. Harga selalu dari server (quote); keranjang
// di browser hanya menyimpan pilihan produk, warna, ukuran, dan jumlah.

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

export async function getQuote(items: CartItem[], courier: string, voucher: string): Promise<Quote> {
  return (await json<{ quote: Quote }>(await send("/api/checkout/quote", { items, courier, voucher }))).quote;
}

export type CheckoutInput = {
  customer: { name: string; email: string; phone: string; address: string; city: string; postal: string };
  notes: string;
  items: CartItem[];
  courier: string;
  voucher: string;
  saveProfile: boolean;
  session: string;
};

export async function createOrder(input: CheckoutInput): Promise<Order> {
  return (await json<{ order: Order }>(await send("/api/orders", input))).order;
}

export async function getMyOrders(): Promise<Order[]> {
  return (await json<{ orders: Order[] }>(await fetch("/api/orders/mine", { cache: "no-store" }))).orders;
}

export async function getAllOrders(params: { status?: string; q?: string; limit?: number; offset?: number }) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== "" && sp.set(k, String(v)));
  return json<{ orders: Order[]; total: number }>(await fetch(`/api/orders?${sp}`, { cache: "no-store" }));
}

export async function advanceOrder(id: string): Promise<Order> {
  return (await json<{ order: Order }>(await send(`/api/orders/${id}`, { action: "advance" }, "PATCH"))).order;
}

// produksi → dikirim (update=false) atau koreksi resi saat dikirim (update=true)
export async function shipOrder(id: string, courier: string, trackingNumber: string, update = false): Promise<Order> {
  const action = update ? "update-shipment" : "ship";
  return (await json<{ order: Order }>(await send(`/api/orders/${id}`, { action, courier, trackingNumber }, "PATCH"))).order;
}

// admin menandai lunas secara manual (mis. transfer bank yang dicek manual)
export async function markPaid(id: string, method: string): Promise<Order> {
  return (await json<{ order: Order }>(await send(`/api/orders/${id}`, { action: "pay", method }, "PATCH"))).order;
}

export async function getOrder(id: string): Promise<Order> {
  return (await json<{ order: Order }>(await fetch(`/api/orders/${id}`, { cache: "no-store" }))).order;
}

// kurir yang bisa dipilih saat menginput resi (kurir pilihan pembeli selalu ikut)
export const SHIPPING_CARRIERS = [
  "JNE REG", "JNE YES", "SiCepat REG", "SiCepat BEST", "AnterAja Reguler", "AnterAja Next Day",
  "J&T Express", "Pos Indonesia", "Ninja Xpress", "Lion Parcel",
];

export async function getCreatorOrders() {
  return json<{ items: CreatorOrderItem[]; summary: CreatorOrderSummary }>(
    await fetch("/api/designer/orders", { cache: "no-store" }),
  );
}

export async function getVouchers(): Promise<Voucher[]> {
  return (await json<{ vouchers: Voucher[] }>(await fetch("/api/vouchers", { cache: "no-store" }))).vouchers;
}

export async function createVoucher(v: Partial<Voucher>): Promise<Voucher> {
  return (await json<{ voucher: Voucher }>(await send("/api/vouchers", v))).voucher;
}

export async function setVoucherActive(code: string, active: boolean): Promise<Voucher> {
  return (await json<{ voucher: Voucher }>(await send(`/api/vouchers/${encodeURIComponent(code)}`, { active }, "PATCH"))).voucher;
}

export const ORDER_STATUS: Record<Order["status"], { label: string; chip: string }> = {
  "menunggu-pembayaran": { label: "Menunggu pembayaran", chip: "bg-sun-100 text-sun-600" },
  dibayar: { label: "Dibayar", chip: "bg-jade-100 text-jade-800" },
  produksi: { label: "Produksi", chip: "bg-jade-100 text-jade-800" },
  dikirim: { label: "Dikirim", chip: "bg-jade-100 text-jade-800" },
  selesai: { label: "Selesai", chip: "bg-ink/8 text-ink/60" },
};

export const ORDER_STATUSES = Object.keys(ORDER_STATUS) as Order["status"][];
