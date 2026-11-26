import Link from "next/link";
import Avatar from "@/components/Avatar";
import Mockup from "@/components/Mockup";
import ProductCard from "@/components/ProductCard";
import { COLORS } from "@/lib/data";
import { getProducts } from "@/lib/api";
import { getTaxonomy } from "@/lib/search";
import type { Product } from "@/lib/types";
import { compact } from "@/lib/format";

const CATEGORIES = [
  { type: "kaos", label: "Kaos", emoji: "👕" },
  { type: "hoodie", label: "Hoodie", emoji: "🧥" },
  { type: "mug", label: "Mug", emoji: "☕" },
  { type: "totebag", label: "Totebag", emoji: "👜" },
];

// Positions of the (up to three) hero mockups.
const HERO_SLOTS = ["left-0 top-6 -rotate-6", "right-2 top-0 rotate-6", "bottom-0 left-1/3 rotate-2"];

type Creator = { id: string; name: string; avatar?: string; products: number; sold: number };

export default async function HomePage() {
  // Everything shown here comes from the API; a fresh database has no products.
  const [fetched, taxonomy] = await Promise.all([
    getProducts().then((l) => ({ ok: true as const, l }), () => ({ ok: false as const, l: [] as Product[] })),
    getTaxonomy().catch(() => null),
  ]);
  const listings = fetched.l;
  const loadFailed = !fetched.ok;
  // themes that actually have products, busiest first
  const themes = (taxonomy?.attributes.find((a) => a.id === "tema")?.values ?? []).filter((v) => v.count > 0).sort((a, b) => b.count - a.count);
  const typeCounts: Record<string, number> | null = taxonomy ? Object.fromEntries(taxonomy.types.map((t) => [t.id, t.count])) : null;
  const trending = [...listings].sort((a, b) => b.sold - a.sold).slice(0, 8);
  const heroes = trending.slice(0, 3);
  const totalSold = listings.reduce((a, l) => a + l.sold, 0);
  const creatorMap = new Map<string, Creator>();
  for (const l of listings) {
    const c = creatorMap.get(l.designerId) ?? { id: l.designerId, name: l.designerName, avatar: l.designerAvatar, products: 0, sold: 0 };
    c.products += 1;
    c.sold += l.sold;
    creatorMap.set(l.designerId, c);
  }
  const creatorCount = creatorMap.size;
  const creators = [...creatorMap.values()].sort((a, b) => b.sold - a.sold).slice(0, 4);

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
            {listings.length > 0 && (
              <div className="mt-10 flex gap-8 text-sm">
                {totalSold > 0 && (
                  <div><p className="text-2xl font-extrabold">{compact(totalSold)}</p><p className="text-white/60">produk terjual</p></div>
                )}
                <div><p className="text-2xl font-extrabold">{creatorCount}</p><p className="text-white/60">kreator</p></div>
                <div><p className="text-2xl font-extrabold">{listings.length}</p><p className="text-white/60">produk</p></div>
              </div>
            )}
          </div>
          {heroes.length > 0 && (
            <div className="relative hidden h-96 md:block">
              {heroes.map((h, i) => (
                <div key={h.id} className={`absolute w-52 rounded-3xl bg-white/95 p-3 shadow-2xl ${HERO_SLOTS[i]}`}>
                  <Mockup type={h.type} colorHex={COLORS[h.colorIds[0]].hex} designUri={h.designUri} />
                </div>
              ))}
            </div>
          )}
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
                <p className="text-xs text-ink/55">
                  {typeCounts === null ? "Lihat semua" : (typeCounts[c.type] ?? 0) > 0 ? `${typeCounts[c.type]} desain` : "Segera hadir"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {themes.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-8">
          <h2 className="mb-4 text-2xl font-extrabold tracking-tight">Jelajahi tema</h2>
          <div className="flex flex-wrap gap-2">
            {themes.map((t) => (
              <Link
                key={t.id}
                href={`/products?attr=${t.id}`}
                className="chip border border-ink/12 bg-white px-4 py-2 text-sm text-ink/75 transition hover:border-jade-600 hover:text-jade-700"
                data-track={`tema-${t.id}`}
              >
                {t.emoji} {t.label} <span className="ml-1 text-ink/40">{t.count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* trending */}
      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Lagi tren 🔥</h2>
            <p className="text-sm text-ink/55">Paling banyak dibeli</p>
          </div>
          <Link href="/products" className="text-sm font-bold text-jade-700 hover:underline">
            Lihat semua →
          </Link>
        </div>
        {trending.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {trending.map((l) => (
              <ProductCard key={l.id} listing={l} />
            ))}
          </div>
        ) : (
          <div className="card p-10 text-center">
            <p className="text-4xl">{loadFailed ? "🔌" : "🎨"}</p>
            <p className="mt-3 font-bold">
              {loadFailed ? "Produk belum bisa dimuat" : "Belum ada produk"}
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink/60">
              {loadFailed
                ? "Terjadi gangguan saat mengambil daftar produk. Coba muat ulang halaman beberapa saat lagi."
                : "Karya kreator pertama segera hadir. Kamu juga bisa jadi yang pertama menjual desainmu di sini."}
            </p>
            {!loadFailed && (
              <Link href="/designer/studio" className="btn-primary mt-5 inline-flex">
                Jual desainmu →
              </Link>
            )}
          </div>
        )}
      </section>

      {/* how it works */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="mb-8 text-center text-2xl font-extrabold tracking-tight">Cara kerjanya</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { n: "1", t: "Pilih karya favoritmu", d: "Jelajahi desain orisinal kreator lokal, pilih produk, warna, dan ukuranmu." },
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

      {/* designers: only creators that really have products listed */}
      {creators.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-6">
          <h2 className="mb-6 text-2xl font-extrabold tracking-tight">Kreator pilihan</h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {creators.map((d) => (
              <Link
                key={d.id}
                href={`/products?designer=${encodeURIComponent(d.id)}`}
                className="card block p-5 transition hover:-translate-y-0.5 hover:border-jade-600 hover:shadow-lg"
                data-track={`kreator-${d.id}`}
              >
                <Avatar uri={d.avatar} name={d.name} size={48} />
                <p className="mt-3 font-bold">{d.name}</p>
                <p className="text-xs text-ink/55">{d.products} produk · {compact(d.sold)} terjual</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* creator CTA */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="relative overflow-hidden rounded-3xl bg-ink px-8 py-12 text-white">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-coral-500/30 blur-3xl" />
          <div className="relative z-10 max-w-xl">
            <h2 className="text-3xl font-extrabold tracking-tight">Punya desain? Jadikan penghasilan.</h2>
            <p className="mt-3 text-white/70">
              Unggah karyamu, pratinjau langsung di kaos, hoodie, mug, dan totebag lewat Studio Mockup — kami yang urus
              produksi, pembayaran, dan pengiriman. Kamu tentukan sendiri margin di atas harga dasar — itu royaltimu.
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
