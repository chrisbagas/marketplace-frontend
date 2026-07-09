"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { PRODUCT_TYPES } from "@/lib/data";
import { getCategories, getProducts, type Category } from "@/lib/api";
import type { Product } from "@/lib/types";
import { track } from "@/lib/track";

const TYPE_FILTERS = [
  { id: "semua", label: "Semua" },
  ...Object.entries(PRODUCT_TYPES).map(([id, t]) => ({ id, label: t.label })),
];

const SORTS = [
  { id: "populer", label: "Paling laris" },
  { id: "rating", label: "Rating tertinggi" },
  { id: "murah", label: "Harga terendah" },
  { id: "mahal", label: "Harga tertinggi" },
];

function Catalog() {
  const params = useSearchParams();
  const [type, setType] = useState<string>(params.get("type") ?? "semua");
  const [category, setCategory] = useState<string>(params.get("category") ?? "semua");
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [q, setQ] = useState(params.get("q") ?? ""); // kata kunci yang benar-benar dicari
  const [sort, setSort] = useState("populer");
  const [products, setProducts] = useState<Product[] | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    getCategories().then(setCats).catch(() => {});
  }, []);

  // katalog datang dari backend (PostgreSQL) — filter jenis, kategori & pencarian di server
  useEffect(() => {
    let alive = true;
    getProducts({ type, q, category })
      .then((list) => alive && (setProducts(list), setError(false)))
      .catch(() => alive && setError(true));
    return () => { alive = false; };
  }, [type, q, category]);

  const items = useMemo(() => {
    const list = [...(products ?? [])];
    if (sort === "murah") list.sort((a, b) => a.price - b.price);
    else if (sort === "mahal") list.sort((a, b) => b.price - a.price);
    else if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
    else list.sort((a, b) => b.sold - a.sold);
    return list;
  }, [products, sort]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">Jelajahi karya</h1>
      <p className="mt-1 text-sm text-ink/55">
        {products ? `${products.length} produk` : "Memuat produk"} dari kreator seluruh Indonesia
      </p>

      <form
        className="mt-6 flex flex-col gap-3 md:flex-row md:items-center"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(query.trim());
          if (query.trim()) track("search", { label: query.trim(), page: "/products" });
        }}
      >
        <div className="relative flex-1">
          <input
            className="input pl-10"
            placeholder="Cari desain, kreator, atau tag… (mis. batik, senja, kopi)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <svg viewBox="0 0 24 24" className="absolute left-3.5 top-3 h-4.5 w-4.5 text-ink/40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4-4" />
          </svg>
        </div>
        <button type="submit" className="btn-secondary btn-sm md:w-auto">Cari</button>
        <select className="input md:w-52" value={sort} onChange={(e) => setSort(e.target.value)}>
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setType(f.id)}
            className={`chip border transition ${
              type === f.id ? "border-jade-700 bg-jade-700 text-white" : "border-ink/12 bg-white text-ink/70 hover:border-ink/30"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {cats.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink/40">Kategori</span>
          <button
            onClick={() => setCategory("semua")}
            className={`chip border transition ${
              category === "semua" ? "border-ink bg-ink text-white" : "border-ink/12 bg-white text-ink/70 hover:border-ink/30"
            }`}
          >
            Semua
          </button>
          {cats.map((c) => (
            <button
              key={c.id}
              onClick={() => { setCategory(c.id); track("click", { label: `kategori-${c.id}`, page: "/products" }); }}
              className={`chip border transition ${
                category === c.id ? "border-ink bg-ink text-white" : "border-ink/12 bg-white text-ink/70 hover:border-ink/30"
              }`}
              title={`${c.count} produk`}
            >
              {c.emoji} {c.label}{c.count > 0 && <span className="ml-1 opacity-60">{c.count}</span>}
            </button>
          ))}
        </div>
      )}

      {error ? (
        <div className="card mt-8 p-12 text-center text-ink/55">
          Katalog tidak bisa dimuat — pastikan backend berjalan (<code>go run ./cmd/api</code> di folder backend).
        </div>
      ) : products === null ? (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card h-72 animate-pulse bg-ink/5" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card mt-8 p-12 text-center text-ink/55">
          Tidak ada hasil untuk “{q}”. Coba kata kunci lain seperti <em>batik</em> atau <em>senja</em>.
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((l) => (
            <ProductCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense>
      <Catalog />
    </Suspense>
  );
}
