// Tipe bersama untuk payload API backend Go (../backend).
// Kontraknya didokumentasikan di ../backend/DATABASE.md dan WORKFLOW.md.

// Produk katalog dari GET /api/products — bentuknya sama dengan FullListing
// statis di lib/data.ts, ditambah field yang hanya ada di database.
export type Product = {
  id: string;
  designId: string;
  type: "kaos" | "hoodie" | "mug" | "totebag";
  price: number;
  sold: number;
  rating: number;
  badge?: string;
  title: string;
  designUri: string;
  designerName: string;
  designerId: string;
  designerAvatar?: string;
  typeLabel: string;
  sizes: string[];
  colorIds: string[];
  tags: string[];
  categories?: string[];
};

export type TrackEvent = {
  id: number;
  t: number; // epoch ms
  session: string;
  type: string; // page_view | view_product | search | add_to_cart | begin_checkout | payment_open | purchase | click
  page?: string;
  label?: string;
  device?: string;
  value?: number;
};

export type VitalSample = { name: "LCP" | "INP" | "CLS" | "TTFB"; value: number; page: string };

export type CartLine = {
  productId: string;
  title: string;
  type: string;
  color: string;
  size: string;
  qty: number;
  price: number;
  designUri?: string;
};

export type Order = {
  id: string;
  createdAt: number;
  customer: { name: string; email: string; phone: string; address: string; city: string };
  items: CartLine[];
  subtotal: number;
  shipping: { courier: string; cost: number };
  total: number;
  payment: { method: string; status: "pending" | "paid"; ref: string; paidAt?: number };
  status: "menunggu-pembayaran" | "dibayar" | "produksi" | "dikirim" | "selesai";
  timeline: { status: string; t: number }[];
};

export type DesignSubmission = {
  id: string;
  t: number;
  title: string;
  designer: string;
  type: string;
  color: string;
  price: number;
  uri: string;
  status: "review" | "disetujui" | "ditolak";
  note?: string;
  tags?: string[];
  categories?: string[];
  listingId?: string; // terisi setelah disetujui → tayang di katalog
};

export type Review = {
  id: number;
  t: number;
  listingId: string;
  orderId: string;
  author: string;
  rating: number; // 1–5
  comment: string;
  status: "review" | "disetujui" | "ditolak";
  note?: string;
};

export type DayStat = {
  date: string; // yyyy-mm-dd
  visits: number;
  productViews: number;
  addToCart: number;
  checkout: number;
  paid: number;
  revenue: number;
};
