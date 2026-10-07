# KaryaKita — Workflow & Arsitektur

Marketplace **print-on-demand (POD)** untuk pasar Indonesia — seperti Redbubble/Etsy, tapi dengan
pembayaran lokal (QRIS, e-wallet, virtual account), Bahasa Indonesia, dan Rupiah.

> **Status: prototipe berfungsi penuh, dengan login & peran.** Data tersimpan di **PostgreSQL**
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

| Peran | URL | Akses | Fungsi |
|---|---|---|---|
| **Tamu / Pelanggan** | `/`, `/products`, `/product/[id]`, `/cart` | publik | Jelajah & keranjang |
| **Pelanggan** | `/checkout`, `/order/[id]`, `/pesanan`, `/profile`, `/studio` | login | Checkout, pesanan saya, profil, desain custom |
| **Kreator / Toko** | `/designer`, `/designer/studio` | kreator, admin | Dashboard royalti + Studio Mockup |
| **Admin** | `/admin` | admin | Analitik, perilaku pelanggan, performa, moderasi |

### Autentikasi

- **Masuk** (`/login`) dengan username **atau** email + password; **Daftar** (`/signup`) sebagai
  pembeli atau kreator (kreator langsung mendapat profil toko). Tombol **Google** aktif otomatis
  bila backend punya kredensial OAuth (`GOOGLE_*` di `../backend/.env.example`).
- Sesi = cookie HttpOnly `kk_session` dari backend; `lib/auth.ts` (`useSession`, `login`,
  `signup`, `logout`) membaca status lewat `GET /api/auth/me`.
- **`middleware.ts`** menjaga halaman sebelum dirender: tanpa sesi → `/login?next=…`, peran tidak
  cocok → `/login?next=…&alasan=peran`. Aturan per halaman ada di `lib/access.ts` (`PROTECTED`).
  Ini lapisan UX — backend tetap memeriksa sesi & peran di setiap endpoint.
- **Verifikasi email** (`/verifikasi-email?token=…`, dari email setelah daftar): banner kuning
  mengingatkan akun yang belum terverifikasi + tombol kirim ulang. Belanja tetap jalan; kreator
  wajib terverifikasi sebelum mengajukan desain.
- **Lupa password** (`/lupa-password`) → email → **`/reset-password?token=…`**: password baru,
  perangkat lain dikeluarkan, langsung masuk. Halaman ber-token memakai `Referrer-Policy: no-referrer`.
- Di dev semua email tertangkap di **Mailpit: http://localhost:8025** (bagian dari `docker compose` backend).
- Header menampilkan menu sesuai peran + menu akun (profil, dashboard, keluar).
- Akun demo (dev): `admin`, `raka` (kreator), `demo` (pelanggan) — password `karyakita123`.

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

### Keranjang & checkout

- **Beberapa ukuran sekaligus**: di halaman produk, "Beli beberapa ukuran sekaligus" → atur jumlah
  per ukuran (mis. 2×M + 1×XL) → masuk keranjang sebagai baris terpisah. Di keranjang, ukuran tiap
  baris bisa diganti; bila ukuran itu sudah ada, barisnya digabung.
- **Checkout** (`/checkout`, wajib login): data penerima (nama, WhatsApp, email, alamat, kota, kode
  pos, catatan kurir) terisi dari profil + opsi simpan ke profil; pilih kurir; **voucher**; ringkasan
  subtotal/ongkir/diskon/total diambil dari `POST /api/checkout/quote` (harga dihitung server).
- Setelah pesanan dibuat keranjang dikosongkan; popup pembayaran bisa ditutup ("bayar nanti") dan
  pesanan dibayar dari halaman pesanan. Riwayat di **`/pesanan`** (menu akun → Pesanan saya).
- **Admin** → tab **Pesanan** (filter status, cari no./nama/email/@akun, detail alamat & item,
  tombol *Majukan*) dan tab **Voucher** (buat, aktif/nonaktif, pemakaian).
- **Kreator** → bagian **Pesanan masuk** di `/designer`: item yang memuat produknya, ukuran & jumlah,
  nama depan + kota pembeli, royalti (tercatat saat lunas, estimasi sebelum itu).

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
| `/api/auth/*` | `POST` / `GET` | `signup`, `login`, `logout`, `me`, `providers`, `verify-email`, `verify-email/resend`, `password/forgot`, `password/reset`, `google/start`, `google/callback` |
| `/api/checkout/quote` | `POST` | Ringkasan harga dari server (login) |
| `/api/orders` | `POST` / `GET` | Buat pesanan (login) / daftar pesanan (admin) |
| `/api/orders/mine` | `GET` | Pesanan saya |
| `/api/designer/orders` | `GET` | Pesanan masuk kreator |
| `/api/vouchers` | `GET` / `POST` / `PATCH` | Kelola voucher (admin) |
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
    login/  signup/       masuk & daftar (password + tombol Google)
    verifikasi-email/     tujuan link verifikasi di email
    lupa-password/  reset-password/   minta link reset → buat password baru
  components/
    Mockup.tsx            mesin mockup SVG (flat + model) ★
    PaymentModal.tsx      gateway pembayaran mock ala Midtrans Snap ★
    Monitor.tsx           pelacak perilaku + Web Vitals ★
    charts.tsx            chart kit dashboard (SVG murni)
    Header / ProductCard / ProductDetail
  lib/
    data.ts  designs.ts   katalog produk & karya seed (SVG data-URI)
    types.ts              tipe payload API (kontrak dengan backend)
    auth.ts  access.ts    sesi login (useSession) + aturan akses halaman
    cart.ts  track.ts  format.ts
  middleware.ts           penjaga halaman terlindungi (cek sesi & peran)
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
| ~~In-memory store~~ → **sudah PostgreSQL** (backend Go, 25 tabel + royalti) | Tambah backup, connection pooling (pgbouncer), migrasi bertahap (golang-migrate/atlas) |
| `PaymentModal.tsx` mock | **Midtrans Snap** atau **Xendit Invoice**; `PATCH {action:"pay"}` → webhook `payment/notification` dengan verifikasi signature |
| ~~Tanpa login~~ → **sudah ada** login password + sesi + peran + verifikasi email + reset password, Google siap pakai | Isi kredensial Google; SMTP penyedia email (Resend/Brevo/SES) + SPF/DKIM/DMARC di domain; `APP_ENV=production` (cookie Secure, tanpa akun demo) |
| Ongkir flat 3 kurir | API **RajaOngkir/Biteship** (tarif real per kota + resi otomatis) |
| Upload desain → data-URL | Object storage (S3/R2) + validasi resolusi cetak (300 DPI pada lebar cm yang dipilih, CMYK-safe) |
| Event & vitals di tabel PostgreSQL | PostHog / Plausible (perilaku) + Sentry / Grafana (performa & error), atau pertahankan tabel + job agregasi harian |
| Mockup foto 2 warna model | Sesi foto sendiri per warna & produk (model Indonesia), atau API render 3D (mis. Dynamic Mockups) |
| Simulasi status produksi | Integrasi vendor cetak / dashboard operator produksi |
| — | Email/WA transaksional (resi, status), PPN & invoice, kebijakan refund |

**Keamanan yang sudah diperhatikan di prototipe:** validasi payload API, batas ukuran upload,
event anonim tanpa PII, dan pembatasan ukuran buffer in-memory.
