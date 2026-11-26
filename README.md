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

Produksi: `next.config.ts` memakai `output: "standalone"` dan `Dockerfile` membangun image `node:22-alpine`
(non-root). Image ini dijalankan lewat `deploy/compose.prod.yml` di repo backend (`API_URL`, `FILES_ORIGIN`, `SITE_URL`
dibaca saat **build**); lihat `deploy/README.md` di sana.
