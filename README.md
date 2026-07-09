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

Dokumentasi alur lengkap: [`WORKFLOW.md`](./WORKFLOW.md).
