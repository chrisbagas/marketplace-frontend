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
  active?: boolean;
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
  userId?: string;
  username?: string; // akun pemesan (kosong = pesanan guest lama)
  customer: { name: string; email: string; phone: string; address: string; city: string; postal: string };
  notes?: string;
  items: CartLine[];
  subtotal: number;
  shipping: { courier: string; cost: number };
  discount: number;
  voucherCode?: string;
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

export type Profile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postal: string;
  preferredPayment: string;
  preferredCourier: string;
  settings: Record<string, unknown>;
};

// Desain custom milik pembeli: hanya untuk dipakai sendiri (tidak dijual,
// tanpa royalti — item pesanannya tidak terhubung ke listing mana pun).
export type UserDesign = {
  id: number;
  t: number;
  title: string;
  type: string;
  color: string;
  uri: string;
  widthCm: number;
  offsetYCm: number;
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

// Pengguna yang sedang login — GET /api/auth/me (backend internal/api/auth.go)
export type Role = "customer" | "designer" | "admin";

export type SessionUser = {
  id: string;
  username: string;
  email: string;
  name: string;
  role: Role;
  emailVerified: boolean;
  hasPassword: boolean;
  googleLinked: boolean;
  designer?: {
    id: string;
    name: string;
    city: string;
    hue: number;
    followers: number;
    rating: number;
    avatarUri: string;
  };
};

// ---- checkout (backend internal/api/checkout.go) ----------------------------

export type Courier = { id: string; label: string; eta: string; cost: number };

export type QuoteLine = {
  productId: string;
  title: string;
  type: string;
  color: string;
  size: string;
  qty: number;
  price: number; // harga satuan dari server
  lineTotal: number;
  designUri?: string;
};

// Ringkasan harga yang dihitung server — angka ini yang ditagih.
export type Quote = {
  items: QuoteLine[];
  subtotal: number;
  courier: Courier;
  shipping: number;
  discount: number;
  total: number;
  voucher?: { code: string; description: string; kind: "percent" | "fixed" | "shipping" };
  voucherError?: string;
  couriers: Courier[];
};

export type Voucher = {
  code: string;
  description: string;
  kind: "percent" | "fixed" | "shipping";
  value: number;
  minSubtotal: number;
  maxDiscount?: number;
  startsAt?: number;
  endsAt?: number;
  usageLimit?: number;
  perUserLimit: number;
  active: boolean;
  used: number;
  discountSum: number;
};

// Item pesanan yang memuat produk kreator (GET /api/designer/orders).
export type CreatorOrderItem = {
  orderId: string;
  createdAt: number;
  status: Order["status"];
  paymentStatus: "pending" | "paid" | "expired" | "failed";
  listingId: string;
  title: string;
  type: string;
  color: string;
  size: string;
  qty: number;
  unitPrice: number;
  designUri?: string;
  royalty: number;
  royaltyBooked: boolean;
  buyer: string; // nama depan + inisial
  city: string;
};

export type CreatorOrderSummary = {
  orders: number;
  units: number;
  paidUnits: number;
  royaltyBooked: number;
  royaltyPending: number;
};
