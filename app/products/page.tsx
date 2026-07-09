"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { ALL_LISTINGS, PRODUCT_TYPES, type ProductType } from "@/lib/data";
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
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("populer");

  const items = useMemo(() => {
    let list = [...ALL_LISTINGS];
    if (type !== "semua") list = list.filter((l) => l.type === (type as ProductType));
    const q = query.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.designerName.toLowerCase().includes(q) ||
          l.tags.some((t) => t.includes(q))
      );
    }
    if (sort === "murah") list.sort((a, b) => a.price - b.price);
    else if (sort === "mahal") list.sort((a, b) => b.price - a.price);
    else if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
    else list.sort((a, b) => b.sold - a.sold);
    return list;
  }, [type, query, sort]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">Jelajahi karya</h1>
      <p className="mt-1 text-sm text-ink/55">{ALL_LISTINGS.length} produk dari kreator seluruh Indonesia</p>

      <form
        className="mt-6 flex flex-col gap-3 md:flex-row md:items-center"
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) track("search", { label: query.trim(), page: "/products" });
        }}
      >
        <div className="relative flex-1">
          <input
            className="input pl-10"
            placeholder="Cari desain, kreator, atau tema… (mis. batik, senja, kopi)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <svg viewBox="0 0 24 24" className="absolute left-3.5 top-3 h-4.5 w-4.5 text-ink/40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4-4" />
          </svg>
        </div>
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

      {items.length === 0 ? (
        <div className="card mt-8 p-12 text-center text-ink/55">
          Tidak ada hasil untuk “{query}”. Coba kata kunci lain seperti <em>batik</em> atau <em>senja</em>.
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
