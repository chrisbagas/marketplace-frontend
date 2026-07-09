import Link from "next/link";
import Mockup from "@/components/Mockup";
import ProductCard from "@/components/ProductCard";
import { ALL_LISTINGS, DESIGNERS, COLORS, listingById } from "@/lib/data";
import { getProducts } from "@/lib/api";
import type { Product } from "@/lib/types";
import { compact } from "@/lib/format";

const CATEGORIES = [
  { type: "kaos", label: "Kaos", emoji: "👕" },
  { type: "hoodie", label: "Hoodie", emoji: "🧥" },
  { type: "mug", label: "Mug", emoji: "☕" },
  { type: "totebag", label: "Totebag", emoji: "👜" },
];

export default async function HomePage() {
  // tren dari database; fallback ke seed statis bila backend belum jalan
  const listings: Product[] = await getProducts().catch(() => ALL_LISTINGS);
  const trending = [...listings].sort((a, b) => b.sold - a.sold).slice(0, 8);
  const heroA = listingById("kaos-anak-senja")!;
  const heroB = listingById("mug-kopi-dulu")!;
  const heroC = listingById("totebag-kawung")!;
  const totalSold = listings.reduce((a, l) => a + l.sold, 0);

  return (
    <div>
      {/* hero */}
      <section className="relative overflow-hidden bg-jade-800 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-jade-600/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-sun-400/20 blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="relative z-10">
            <span className="chip bg-sun-400 text-ink">✦ 100% karya kreator lokal</span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              Karya kreator Indonesia, <span className="text-sun-300">dicetak</span> khusus untukmu.
            </h1>
            <p className="mt-4 max-w-md text-white/75">
              Kaos, hoodie, mug, dan totebag dengan desain orisinal. Dicetak saat kamu pesan — tanpa stok menumpuk,
              royalti langsung ke kreatornya.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products" className="btn-primary bg-sun-400 text-ink hover:bg-sun-300" data-track="hero-belanja">
                Mulai belanja
              </Link>
              <Link href="/designer/studio" className="btn-secondary border-white/25 bg-white/10 text-white hover:bg-white/20" data-track="hero-kreator">
                Jual desainmu →
              </Link>
            </div>
            <div className="mt-10 flex gap-8 text-sm">
              <div><p className="text-2xl font-extrabold">{compact(totalSold)}+</p><p className="text-white/60">produk terjual</p></div>
              <div><p className="text-2xl font-extrabold">{DESIGNERS.length * 320}+</p><p className="text-white/60">kreator aktif</p></div>
              <div><p className="text-2xl font-extrabold">4.9★</p><p className="text-white/60">rating pembeli</p></div>
            </div>
          </div>
          <div className="relative hidden h-96 md:block">
            <div className="absolute left-0 top-6 w-56 -rotate-6 rounded-3xl bg-white/95 p-3 shadow-2xl">
              <Mockup type="kaos" colorHex={COLORS.hitam.hex} designUri={heroA.designUri} />
            </div>
            <div className="absolute right-2 top-0 w-48 rotate-6 rounded-3xl bg-white/95 p-3 shadow-2xl">
              <Mockup type="mug" colorHex={COLORS.putih.hex} designUri={heroB.designUri} />
            </div>
            <div className="absolute bottom-0 left-1/3 w-52 rotate-2 rounded-3xl bg-white/95 p-3 shadow-2xl">
              <Mockup type="totebag" colorHex={COLORS.krem.hex} designUri={heroC.designUri} />
            </div>
          </div>
        </div>
      </section>

      {/* categories */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {CATEGORIES.map((c) => (
            <Link
              key={c.type}
              href={`/products?type=${c.type}`}
              className="card flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:border-jade-600 hover:shadow-lg"
              data-track={`kategori-${c.type}`}
            >
              <span className="text-3xl">{c.emoji}</span>
              <div>
                <p className="font-bold">{c.label}</p>
                <p className="text-xs text-ink/55">{ALL_LISTINGS.filter((l) => l.type === c.type).length} desain</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* trending */}
      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Lagi tren minggu ini 🔥</h2>
            <p className="text-sm text-ink/55">Paling banyak dibeli 7 hari terakhir</p>
          </div>
          <Link href="/products" className="text-sm font-bold text-jade-700 hover:underline">
            Lihat semua →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {trending.map((l) => (
            <ProductCard key={l.id} listing={l} />
          ))}
        </div>
      </section>

      {/* how it works */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="mb-8 text-center text-2xl font-extrabold tracking-tight">Cara kerjanya</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { n: "1", t: "Pilih karya favoritmu", d: "Jelajahi ribuan desain orisinal kreator lokal, pilih produk, warna, dan ukuranmu." },
            { n: "2", t: "Kami cetak sesuai pesanan", d: "Dicetak DTG premium satu per satu setelah kamu bayar — lolos QC sebelum dikemas." },
            { n: "3", t: "Dikirim ke seluruh Indonesia", d: "Estimasi 3–5 hari kerja. Kreator menerima royalti dari setiap pembelianmu." },
          ].map((s) => (
            <div key={s.n} className="card p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-jade-700 font-extrabold text-white">{s.n}</span>
              <h3 className="mt-4 font-bold">{s.t}</h3>
              <p className="mt-1 text-sm text-ink/60">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* designers */}
      <section className="mx-auto max-w-6xl px-4 py-6">
        <h2 className="mb-6 text-2xl font-extrabold tracking-tight">Kreator pilihan</h2>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {DESIGNERS.map((d) => (
            <div key={d.id} className="card p-5">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-extrabold text-white"
                style={{ background: `hsl(${d.hue} 45% 40%)` }}
              >
                {d.name[0]}
              </div>
              <p className="mt-3 font-bold">{d.name}</p>
              <p className="text-xs text-ink/55">{d.city} · {compact(d.followers)} pengikut · ★ {d.rating}</p>
              <p className="mt-2 line-clamp-2 text-sm text-ink/65">{d.bio}</p>
            </div>
          ))}
        </div>
      </section>

      {/* creator CTA */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="relative overflow-hidden rounded-3xl bg-ink px-8 py-12 text-white">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-coral-500/30 blur-3xl" />
          <div className="relative z-10 max-w-xl">
            <h2 className="text-3xl font-extrabold tracking-tight">Punya desain? Jadikan penghasilan.</h2>
            <p className="mt-3 text-white/70">
              Unggah karyamu, pratinjau langsung di kaos, hoodie, mug, dan totebag lewat Studio Mockup — kami yang urus
              produksi, pembayaran, dan pengiriman. Kamu terima royalti hingga 30%.
            </p>
            <Link href="/designer/studio" className="btn-primary mt-6 bg-coral-500 hover:bg-coral-600" data-track="cta-studio">
              Coba Studio Mockup →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
