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
  category?: string; // product category id (pakaian, tas, rumah)
  attributes?: string[]; // attribute value ids (tema, gaya, acara) — see lib/search.ts Facets
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
  customer: { name: string; email: string; phone: string; address: string; city: string; postal: string; areaId?: string };
  notes?: string;
  items: CartLine[];
  subtotal: number;
  // company/type = layanan Biteship (mis. jne / reg); kosong pada tarif flat (dev)
  shipping: { courier: string; cost: number; company?: string; type?: string };
  discount: number;
  voucherCode?: string;
  total: number;
  payment: {
    method: string;
    status: "pending" | "paid" | "expired" | "failed";
    ref: string;
    paidAt?: number;
    expiresAt?: number; // batas bayar (saat menunggu pembayaran)
    gateway?: string;
  };
  // data dari kurir — selalu ada bila status "dikirim" / "selesai"
  shipment?: { courier: string; trackingNumber: string; shippedAt: number; deliveredAt?: number; courierStatus?: string };
  autoCompleteAt?: number; // status "tiba": selesai otomatis bila pembeli tidak konfirmasi
  completedAt?: number;
  status: "menunggu-pembayaran" | "dibayar" | "produksi" | "dikirim" | "tiba" | "selesai" | "dibatalkan";
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
  attributes?: string[]; // attribute value ids
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
  areaId: string; // Biteship area id tujuan (kosong = belum dipilih)
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
  weight: number; // gram
  provider: "biteship" | "flat";
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

// Penarikan saldo kreator (GET /api/designer/payouts, GET /api/payouts).
export type PayoutStatus = "diminta" | "diproses" | "dibayar" | "ditolak";

export type BankAccount = { bankName: string; account: string; holder: string };

export type PayoutBalance = {
  pending: number; // royalti dari pesanan dibayar yang belum selesai
  available: number; // bisa ditarik sekarang
  inProcess: number; // pengajuan diminta/diproses
  withdrawn: number; // sudah ditransfer
  released: number; // total royalti dari pesanan selesai
};

export type Payout = {
  id: number;
  designerId: string;
  designerName?: string;
  amount: number;
  status: PayoutStatus;
  requestedAt: number;
  processedAt?: number;
  paidAt?: number;
  bank?: BankAccount;
  reference?: string;
  note?: string;
};

// Keuangan platform (GET /api/finance, GET /api/producers) — admin.
export type FinanceFlow = {
  orders: number;
  received: number; // dibayar pembeli (setelah diskon)
  subtotal: number;
  shipping: number;
  discount: number; // voucher, ditanggung platform
  production: number; // hak produsen: biaya produksi
  shippingCost: number; // hak produsen: ongkir
  courierCosts: number; // ongkos kurir Biteship yang dibayar platform
  creators: number; // royalti kreator
  gatewayFees: number; // estimasi biaya Midtrans
  platformIncome: number;
};

export type FinanceOwed = {
  producersReady: number;
  producersInProduction: number;
  creatorsHeld: number;
  creatorsAvailable: number;
  cashEstimate: number;
  platformCash: number;
};

export type ProductCost = { id: string; label: string; basePrice: number; productionCost: number; weightG: number };

// Autocomplete kota/kecamatan tujuan (GET /api/shipping/areas)
export type AreaOption = { id: string; name: string; city: string; province: string; district: string; postal: string };

export type ProducerCharge = {
  orderId: string;
  orderStatus: Order["status"];
  paidAt: number;
  items: number;
  production: number;
  shipping: number;
  ready: boolean;
};

export type ProducerPayout = { id: number; amount: number; reference: string; note?: string; createdAt: number };

export type Producer = {
  id: string;
  name: string;
  contact: string;
  bank?: BankAccount;
  active: boolean;
  products: ProductCost[];
  ready: number;
  inProduction: number;
  charges: ProducerCharge[];
  payouts: ProducerPayout[];
};
