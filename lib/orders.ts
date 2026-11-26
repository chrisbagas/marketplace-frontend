"use client";

import type { CartItem } from "./cart";
import type { Complaint, ComplaintReason, ComplaintStatus, CreatorOrderItem, CreatorOrderSummary, Order, Quote, Voucher } from "./types";

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

// admin: dikirim → tiba, setelah ada laporan/pelacakan kurir bahwa paket sampai
export async function markDelivered(id: string): Promise<Order> {
  return (await json<{ order: Order }>(await send(`/api/orders/${id}`, { action: "delivered" }, "PATCH"))).order;
}

// pembeli: tiba → selesai ("Pesanan diterima")
export async function confirmReceived(id: string): Promise<Order> {
  return (await json<{ order: Order }>(await send(`/api/orders/${id}`, { action: "confirm" }, "PATCH"))).order;
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
  tiba: { label: "Tiba — tunggu konfirmasi", chip: "bg-sun-100 text-sun-600" },
  selesai: { label: "Selesai", chip: "bg-ink/8 text-ink/60" },
  dibatalkan: { label: "Dibatalkan", chip: "bg-coral-100 text-coral-600" },
};

export const ORDER_STATUSES = Object.keys(ORDER_STATUS) as Order["status"][];
// urutan alur normal (tanpa "dibatalkan") untuk stepper
export const ORDER_FLOW: Order["status"][] = ORDER_STATUSES.filter((s) => s !== "dibatalkan");

// ---- pembatalan, refund, komplain ------------------------------------------------

// pembeli (atau admin): batalkan pesanan yang belum dibayar
export async function cancelOrder(id: string): Promise<Order> {
  return (await json<{ order: Order }>(await send(`/api/orders/${id}/cancel`, {}))).order;
}

// admin: batalkan pesanan "dibayar" dan kembalikan dana penuh. method kosong = otomatis (Midtrans bila didukung, selain itu manual)
export async function refundOrder(
  id: string,
  input: { reason: string; method?: "gateway" | "manual"; reference?: string },
): Promise<Order> {
  return (await json<{ order: Order }>(await send(`/api/orders/${id}/refund`, input))).order;
}

export const COMPLAINT_REASONS: Record<ComplaintReason, string> = {
  "cacat-cetak": "Cacat cetak",
  "salah-produk": "Produk / ukuran / warna salah",
  rusak: "Rusak saat pengiriman",
  "tidak-sesuai": "Tidak sesuai pesanan atau gambar",
  lainnya: "Lainnya",
};

export const COMPLAINT_STATUS: Record<ComplaintStatus, { label: string; chip: string }> = {
  terbuka: { label: "Komplain diproses", chip: "bg-sun-100 text-sun-600" },
  "dicetak-ulang": { label: "Dicetak ulang", chip: "bg-jade-100 text-jade-800" },
  direfund: { label: "Dana dikembalikan", chip: "bg-jade-100 text-jade-800" },
  ditolak: { label: "Komplain ditolak", chip: "bg-coral-100 text-coral-600" },
};

export const MAX_COMPLAINT_PHOTOS = 3;

// pembeli: ajukan komplain saat pesanan "tiba"
export async function fileComplaint(
  id: string,
  input: { reason: ComplaintReason; description: string; photos: string[] },
): Promise<Order> {
  return (await json<{ order: Order }>(await send(`/api/orders/${id}/complaint`, input))).order;
}

// admin: daftar komplain (terbuka dulu)
export async function getComplaints(status = ""): Promise<Complaint[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return (await json<{ complaints: Complaint[] }>(await fetch(`/api/complaints${q}`, { cache: "no-store" }))).complaints;
}

// admin: putuskan komplain — cetak ulang, refund (penuh/sebagian), atau tolak
export async function resolveComplaint(
  id: number,
  input:
    | { action: "reprint"; note?: string }
    | { action: "refund"; amount: number; method?: "gateway" | "manual"; reference?: string; note?: string }
    | { action: "reject"; note: string },
): Promise<Complaint> {
  return (await json<{ complaint: Complaint }>(await send(`/api/complaints/${id}`, input, "PATCH"))).complaint;
}
