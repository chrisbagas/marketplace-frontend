# KaryaKita 🇮🇩

Prototipe marketplace **print-on-demand** untuk kreator Indonesia — kaos, hoodie, mug, totebag
dengan pembayaran lokal (QRIS / e-wallet / VA), Studio Mockup untuk desainer, dan dashboard admin
dengan monitoring perilaku & performa.

Butuh backend Go + PostgreSQL (repo terpisah, folder `../backend`) jalan lebih dulu:

```bash
# di ../backend
docker compose up -d && go run ./cmd/api   # API :8081

# di repo ini
npm install
npm run dev                                # web :3000 (proxy /api/* → :8081)
```

Buka **http://localhost:3000**, lalu jelajahi:

- 🛒 Toko: `/products` → beli sesuatu sampai selesai (pembayaran disimulasikan)
- 🎨 Kreator: `/designer/studio` → unggah desain & lihat di badan model
- 📊 Admin: `/admin` → analitik live, funnel, Web Vitals, moderasi desain

Halaman kreator, admin, profil, dan Custom butuh login (`/login`). Akun demo, password
`karyakita123`: `admin` · `raka` (kreator) · `demo` (pelanggan) — atau daftar baru di `/signup`.
Email verifikasi & reset password di dev tertangkap di Mailpit: http://localhost:8025.

Dokumentasi alur lengkap: [`WORKFLOW.md`](./WORKFLOW.md).

## Pemantauan error (Sentry)

Mati secara bawaan. Isi variabel berikut (saat **build**, karena `NEXT_PUBLIC_*` ditanam ke bundle)
untuk menyalakannya di browser, server, dan edge/middleware:

| Variabel | Fungsi |
|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | DSN proyek Next.js di Sentry; kosong = tidak ada yang diinisialisasi |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | label environment (bawaan: `NODE_ENV`) |
| `NEXT_PUBLIC_SENTRY_RELEASE` | label release, mis. hash git |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | opsional, hanya untuk unggah source map saat `next build`; tanpa token tidak ada yang diunggah |

Titik kaitnya: `instrumentation.ts` (server + edge, `onRequestError`), `instrumentation-client.ts`
(browser), `app/global-error.tsx` (error render root). Opsi bersama dan penyamaran token URL ada di
`lib/sentry.ts` (`token`/`code`/`state` di query string tidak ikut terkirim).

**CSP**: bila nanti header Content-Security-Policy diberlakukan (bukan lagi report-only), `connect-src`
harus memuat `https://*.ingest.sentry.io` (atau host ingest region/self-hosted Anda), kalau tidak browser
memblokir pengiriman event.
