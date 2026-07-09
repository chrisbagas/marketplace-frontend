# KaryaKita — Workflow & Arsitektur

Marketplace **print-on-demand (POD)** untuk pasar Indonesia — seperti Redbubble/Etsy, tapi dengan
pembayaran lokal (QRIS, e-wallet, virtual account), Bahasa Indonesia, dan Rupiah.

> **Status: prototipe berfungsi penuh, tanpa login.** Data tersimpan di **PostgreSQL**
> lewat backend terpisah (Go). Bagian [Menuju Produksi](#menuju-produksi) menjelaskan apa
> yang masih perlu diganti untuk go-live.

---

## Cara menjalankan

Dua repo, dua proses (+ database):

```bash
# 1. Backend (../backend) — butuh Docker Desktop jalan
docker compose up -d       # PostgreSQL 16
go run ./cmd/api           # API di :8081 (migrasi + seed otomatis)

# 2. Frontend (repo ini)
npm install
npm run dev                # http://localhost:3000
```

Tech stack:
- **Frontend** — Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS 4.
- **Backend** — Go (net/http + pgx) + PostgreSQL 16. Skema & diagram ERD:
  [`../backend/DATABASE.md`](../backend/DATABASE.md).
- Frontend mem-proxy semua `/api/*` ke backend lewat `rewrites` di `next.config.ts`
  (default `http://localhost:8081`, bisa diubah via env `API_URL`) — kode FE cukup
  memanggil `fetch("/api/...")` tanpa CORS.

---

## Tiga peran, tiga area

Karena prototipe ini tanpa login, semua area terbuka dan bisa diakses dari header:

| Peran | URL | Fungsi |
|---|---|---|
| **Pelanggan** | `/`, `/products`, `/product/[id]`, `/cart`, `/checkout`, `/order/[id]` | Belanja end-to-end |
| **Kreator / Toko** | `/designer`, `/designer/studio` | Dashboard royalti + Studio Mockup |
| **Admin** | `/admin` | Analitik, perilaku pelanggan, performa, moderasi |

---

## Alur 1 — Pelanggan belanja

```
Beranda ──► Jelajah (/products) ──► Detail produk ──► Keranjang ──► Checkout ──► Bayar ──► Lacak pesanan
   │              │                      │                                         │
   │        cari & filter          pilih warna/ukuran,                    popup gateway (mock
   │        (event `search`)       pratinjau flat / model                 Midtrans Snap): QRIS,
   │                               (event `view_product`,                 GoPay/OVO/DANA/ShopeePay,
   └── kategori, tren              `add_to_cart`)                         VA BCA/Mandiri/BNI
```

1. **Katalog** — filter jenis produk, pencarian, sorting. Kartu produk dirender dari mockup SVG
   (desain ditempel ke produk secara real-time, tanpa file foto).
2. **Detail produk** — pilih warna (mockup ikut berubah), ukuran, qty. Toggle **"Dipakai model"**
   menampilkan desain di badan model ilustrasi.
3. **Checkout** — alamat + pilihan kurir (SiCepat/JNE/AnterAja, tarif flat demo).
   Submit → `POST /api/orders` membuat pesanan berstatus `menunggu-pembayaran`.
4. **Pembayaran** — popup ala Midtrans Snap (`components/PaymentModal.tsx`): pilih metode,
   tampil QR/nomor VA/instruksi e-wallet + countdown. Tombol **"Simulasikan pembayaran berhasil"**
   memanggil `PATCH /api/orders/[id] {action:"pay"}` (pengganti webhook notifikasi gateway).
5. **Lacak pesanan** — timeline `menunggu-pembayaran → dibayar → produksi → dikirim → selesai`.
   Tombol *"Simulasikan tahap berikutnya"* memajukan status untuk demo.

## Alur 2 — Kreator (designer/store)

```
/designer (dashboard) ──► /designer/studio (Studio Mockup) ──► ajukan desain ──► kurasi admin ──► tayang
     │                            │
  royalti harian,          1. pilih / unggah karya (PNG/JPG/SVG → data-URL)
  saldo & penarikan,       2. pilih produk (kaos/hoodie/mug/totebag) + warna
  daftar produk aktif      3. atur lebar & posisi cetak DALAM CM (sesuai area cetak asli)
                           4. pratinjau: produk (ilustrasi) ⇄ foto asli ⇄ model foto ⇄ model ilustrasi
                           5. set margin royalti → harga jual otomatis
```

- **Studio Mockup** adalah jawaban untuk "designer bisa lihat desainnya di model". Empat mode
  pratinjau di `components/Mockup.tsx`:
  - **Produk (ilustrasi)** — flat SVG parametrik, semua produk & warna;
  - **Foto asli** — desain ditempel ke foto kaos polos sungguhan (blend *multiply*, jadi kerutan
    kain ikut terlihat);
  - **Model (foto)** — desain di dada **model manusia sungguhan** (foto bebas lisensi);
  - **Model (ilustrasi)** — ilustrasi orang memakai kaos/hoodie, totebag disandang, mug di meja.
- **Ukuran cetak dalam sentimeter.** Tiap produk mendeklarasikan area cetak fisiknya
  (`PRINT_CM`: kaos 30×40 cm, hoodie 28×30 cm, mug 9×8,5 cm, totebag 25×30 cm). Slider Studio
  bekerja dalam cm dan tiap tampilan mengonversi ke px-per-cm-nya sendiri, jadi "24 cm" terlihat
  proporsional identik di flat, foto, maupun model.
- **Lisensi foto**: foto kaos polos & model dari seri *blank tee template* oleh **ir0cko (Flickr),
  CC BY 2.0** — atribusi ditampilkan di UI setiap kali foto dirender, file di `public/models/`.
  Jika warna kaos yang dipilih tidak tersedia di stok foto, UI menampilkan warna stok terdekat +
  catatan. Mode foto saat ini tersedia untuk kaos; produk lain memakai ilustrasi.
- Pengajuan (`POST /api/designs`) berstatus `review` → muncul di dashboard kreator **dan** di tab
  Moderasi admin.

## Alur 3 — Admin

Tab di `/admin` (auto-refresh 5 detik):

1. **Ringkasan** — pendapatan 14 hari (stat tile + line chart), pesanan, AOV, konversi,
   produk terlaris, tabel pesanan terbaru.
2. **Perilaku Pelanggan** — funnel `kunjungan → lihat produk → keranjang → checkout → dibayar`,
   pencarian terpopuler, perangkat, dan **aliran aktivitas live**: setiap klik/pencarian yang kamu
   lakukan di toko muncul di sini dalam ±5 detik.
3. **Performa** — Core Web Vitals p75 (LCP, INP, CLS, TTFB) dari browser nyata + kesehatan API
   (latensi p50/p95, error rate).
4. **Moderasi** — antrean kurasi desain dari Studio Mockup: setujui / tolak (dengan catatan).

---

## Arsitektur monitoring

```
Browser                          Backend Go (:8081)                    Admin
───────                          ──────────────────                    ─────
components/Monitor.tsx
 ├─ page_view per route   ──►    POST /api/track ─┐
 ├─ klik [data-track]     ──►                     ├─► PostgreSQL   ──► GET /api/stats ──► /admin
 └─ PerformanceObserver          POST /api/vitals ┘   (track_events,    (agregasi funnel,
    (LCP/INP/CLS/TTFB,                                 web_vitals,       percentile_cont utk
    kirim via sendBeacon)                              api_metrics)      p75 vitals & p95 API)

     (semua request lewat proxy Next :3000 → Go :8081; middleware backend
      mencatat latensi+status tiap request ke tabel api_metrics)
```

- **Perilaku**: `lib/track.ts` mengirim event (`page_view`, `view_product`, `search`,
  `add_to_cart`, `begin_checkout`, `payment_*`, `purchase`, `click`) dengan session id anonim
  per-tab. Tidak ada data pribadi yang direkam.
- **Performa**: Web Vitals dikumpulkan lewat `PerformanceObserver` dan dikirim saat halaman
  disembunyikan (pola yang sama dengan library `web-vitals`).
- Dashboard di-seed data 14 hari agar grafik langsung hidup; event live dari sesi kamu
  digabungkan ke hari berjalan.

## Kontrak API (backend Go — `../backend`)

| Endpoint | Method | Fungsi |
|---|---|---|
| `/api/orders` | `POST` / `GET` | Buat pesanan / daftar pesanan |
| `/api/orders/[id]` | `GET` / `PATCH` | Detail / `{action:"pay"}` (≈ webhook gateway; juga membukukan **royalti kreator** + counter terjual), `{action:"advance"}` (simulasi produksi) |
| `/api/designs` | `GET` / `POST` / `PATCH` | Daftar / ajukan desain / moderasi (`disetujui`/`ditolak`) |
| `/api/track` | `POST` / `GET` | Rekam / baca event perilaku |
| `/api/vitals` | `POST` | Rekam Web Vitals |
| `/api/stats` | `GET` | Agregasi lengkap untuk dashboard |
| `/api/products`, `/api/products/[id]` | `GET` | Katalog dari database (FE masih memakai seed statis yang identik) |
| `/healthz` | `GET` | Cek kesehatan API + database |

## Struktur proyek

```
frontend/  (repo ini — Next.js)
  app/
    page.tsx              beranda
    products/             katalog + cari/filter
    product/[id]/         detail produk
    cart/  checkout/      keranjang & pembayaran
    order/[id]/           pelacakan pesanan
    designer/             dashboard kreator
    designer/studio/      Studio Mockup (pratinjau di model)
    admin/                dashboard admin (4 tab)
  components/
    Mockup.tsx            mesin mockup SVG (flat + model) ★
    PaymentModal.tsx      gateway pembayaran mock ala Midtrans Snap ★
    Monitor.tsx           pelacak perilaku + Web Vitals ★
    charts.tsx            chart kit dashboard (SVG murni)
    Header / ProductCard / ProductDetail
  lib/
    data.ts  designs.ts   katalog produk & karya seed (SVG data-URI)
    types.ts              tipe payload API (kontrak dengan backend)
    cart.ts  track.ts  format.ts
  next.config.ts          proxy /api/* → backend Go

backend/  (repo terpisah — Go + PostgreSQL)
  cmd/api/main.go         entry point (migrasi + seed otomatis)
  internal/db/            schema.sql, seeder, pool pgx
  internal/api/           handler orders/designs/track/stats/products ★
  DATABASE.md             dokumentasi skema + diagram ERD ★
  docker-compose.yml      PostgreSQL 16
```

---

## Menuju produksi

Prototipe ini sengaja meniru kontrak layanan aslinya, jadi penggantiannya terlokalisasi:

| Sekarang (prototipe) | Produksi |
|---|---|
| ~~In-memory store~~ → **sudah PostgreSQL** (backend Go, 20 tabel + royalti) | Tambah backup, connection pooling (pgbouncer), migrasi bertahap (golang-migrate/atlas) |
| `PaymentModal.tsx` mock | **Midtrans Snap** atau **Xendit Invoice**; `PATCH {action:"pay"}` → webhook `payment/notification` dengan verifikasi signature |
| Tanpa login | Auth (NextAuth/Clerk) + role `customer / designer / admin`, proteksi route `/admin` & `/designer` |
| Ongkir flat 3 kurir | API **RajaOngkir/Biteship** (tarif real per kota + resi otomatis) |
| Upload desain → data-URL | Object storage (S3/R2) + validasi resolusi cetak (300 DPI pada lebar cm yang dipilih, CMYK-safe) |
| Event & vitals di tabel PostgreSQL | PostHog / Plausible (perilaku) + Sentry / Grafana (performa & error), atau pertahankan tabel + job agregasi harian |
| Mockup foto 2 warna model | Sesi foto sendiri per warna & produk (model Indonesia), atau API render 3D (mis. Dynamic Mockups) |
| Simulasi status produksi | Integrasi vendor cetak / dashboard operator produksi |
| — | Email/WA transaksional (resi, status), PPN & invoice, kebijakan refund |

**Keamanan yang sudah diperhatikan di prototipe:** validasi payload API, batas ukuran upload,
event anonim tanpa PII, dan pembatasan ukuran buffer in-memory.
