"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import SearchBox from "@/components/SearchBox";
import { rupiah } from "@/lib/format";
import {
  SORTS, catalogHref, filtersFromParams, searchProducts, suggest,
  type FacetValue, type Facets, type SearchFilters, type SearchResult,
} from "@/lib/search";
import { track } from "@/lib/track";

// Catalog: search + filters. Every filter lives in the URL, so a result page
// can be shared, bookmarked and walked through with back/forward. The server
// does the matching, ranking, counting and paging (GET /api/search).

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((v) => v !== id) : [...list, id]);

function Catalog() {
  const router = useRouter();
  const params = useSearchParams();
  const key = params.toString();
  const filters = useMemo(() => filtersFromParams(new URLSearchParams(key)), [key]);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false); // mobile drawer
  const [popular, setPopular] = useState<string[]>([]);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    searchProducts(filters, ac.signal)
      .then((r) => { setResult(r); setError(false); setLoading(false); })
      .catch((e) => { if (e.name !== "AbortError") { setError(true); setLoading(false); } });
    return () => ac.abort();
  }, [filters]);

  // changing a filter goes back to page 1; the page itself is changed with `page`
  const update = useCallback((patch: Partial<SearchFilters>) => {
    router.push(catalogHref({ ...filters, page: 1, ...patch }), { scroll: "page" in patch });
  }, [filters, router]);

  const empty = result !== null && result.total === 0;
  useEffect(() => {
    if (empty && popular.length === 0) suggest("").then((s) => setPopular(s.terms)).catch(() => {});
  }, [empty, popular.length]);

  const facets = result?.facets;
  const chips = facets ? activeChips(filters, facets, result.products[0]?.designerName) : [];
  const heading = filters.q ? `Hasil untuk “${filters.q}”` : "Jelajahi karya";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">{heading}</h1>
      <p className="mt-1 text-sm text-ink/55" aria-live="polite">
        {result ? `${result.total.toLocaleString("id-ID")} produk` : "Memuat produk"} dari kreator seluruh Indonesia
      </p>

      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
        <SearchBox value={filters.q} className="flex-1" />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="btn-secondary btn-sm flex-1 lg:hidden"
            aria-expanded={showFilters}
          >
            Filter{chips.length > 0 && ` (${chips.length})`}
          </button>
          <select
            className="input flex-1 md:w-48"
            aria-label="Urutkan"
            value={filters.sort || (filters.q ? "" : "terlaris")}
            onChange={(e) => { update({ sort: e.target.value }); track("click", { label: `urut-${e.target.value || "sesuai"}`, page: "/products" }); }}
          >
            {/* "paling sesuai" only means something when there is a query to match */}
            {SORTS.filter((s) => s.id !== "" || filters.q).map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {result?.query.used && (
        <p className="mt-4 rounded-xl bg-sun-100 px-4 py-2.5 text-sm">
          Menampilkan hasil untuk <b>{result.query.used}</b>. Tidak ada produk untuk “{result.query.q}”.
        </p>
      )}
      {result?.query.relaxed && (
        <p className="mt-4 rounded-xl bg-sun-100 px-4 py-2.5 text-sm">
          Tidak ada produk yang cocok dengan semua kata — menampilkan yang cocok dengan sebagian kata.
        </p>
      )}

      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <button key={c.key} onClick={() => update(c.remove)} className="chip border border-ink/15 bg-white text-ink/75 transition hover:border-coral-500 hover:text-coral-600">
              {c.label} <span aria-hidden className="ml-1">✕</span><span className="sr-only">hapus filter</span>
            </button>
          ))}
          <button onClick={() => router.push(catalogHref({ q: filters.q, sort: filters.sort }), { scroll: false })} className="text-xs font-semibold text-jade-700 hover:underline">
            Hapus semua filter
          </button>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[230px_1fr]">
        <aside className={`${showFilters ? "block" : "hidden"} lg:block`}>
          {facets && <FilterPanel filters={filters} facets={facets} update={update} />}
        </aside>

        <div>
          {error ? (
            <div className="card p-12 text-center text-ink/55">
              Katalog tidak bisa dimuat — pastikan backend berjalan (<code>go run ./cmd/api</code> di folder backend).
            </div>
          ) : result === null ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card h-72 animate-pulse bg-ink/5" />
              ))}
            </div>
          ) : empty ? (
            <div className="card p-10 text-center">
              <p className="font-bold">Tidak ada produk yang cocok{filters.q && <> untuk “{filters.q}”</>}.</p>
              <p className="mt-1 text-sm text-ink/55">
                {chips.length > 0 ? "Coba longgarkan filter, atau cari dengan kata lain." : "Periksa ejaan atau coba kata yang lebih umum."}
              </p>
              {chips.length > 0 && (
                <button onClick={() => router.push(catalogHref({ q: filters.q }), { scroll: false })} className="btn-secondary btn-sm mt-4">
                  Hapus semua filter
                </button>
              )}
              {popular.length > 0 && (
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <span className="w-full text-xs font-semibold uppercase tracking-wide text-ink/40">Pencarian populer</span>
                  {popular.map((t) => (
                    <button key={t} onClick={() => router.push(catalogHref({ q: t }))} className="chip border border-ink/12 bg-white text-ink/70 transition hover:border-ink/30">
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className={`grid grid-cols-2 gap-4 transition-opacity md:grid-cols-3 ${loading ? "opacity-50" : ""}`}>
                {result.products.map((l) => (
                  <ProductCard key={l.id} listing={l} />
                ))}
              </div>
              <Pagination page={result.page} pages={result.pages} onPage={(page) => update({ page })} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

type Chip = { key: string; label: string; remove: Partial<SearchFilters> };

function activeChips(f: SearchFilters, facets: Facets, designerName?: string): Chip[] {
  const chips: Chip[] = [];
  const category = facets.categories.find((c) => c.id === f.category);
  if (f.category) chips.push({ key: "cat", label: category?.label ?? f.category, remove: { category: "" } });
  for (const id of f.type) {
    const t = facets.types.find((v) => v.id === id);
    chips.push({ key: `type-${id}`, label: t?.label ?? id, remove: { type: f.type.filter((v) => v !== id) } });
  }
  for (const id of f.attr) {
    const attr = facets.attributes.find((a) => a.values.some((v) => v.id === id));
    const v = attr?.values.find((x) => x.id === id);
    chips.push({ key: `attr-${id}`, label: v ? `${attr!.label}: ${v.label}` : id, remove: { attr: f.attr.filter((x) => x !== id) } });
  }
  if (f.color) {
    const c = facets.colors.find((v) => v.id === f.color);
    chips.push({ key: "color", label: `Warna: ${c?.label ?? f.color}`, remove: { color: "" } });
  }
  if (f.min || f.max) {
    const label = f.min && f.max ? `${rupiah(f.min)} – ${rupiah(f.max)}` : f.min ? `Mulai ${rupiah(f.min)}` : `Maks ${rupiah(f.max)}`;
    chips.push({ key: "price", label, remove: { min: 0, max: 0 } });
  }
  if (f.designer) chips.push({ key: "designer", label: `Kreator: ${designerName ?? f.designer}`, remove: { designer: "" } });
  return chips;
}

function FilterPanel({ filters, facets, update }: {
  filters: SearchFilters;
  facets: Facets;
  update: (patch: Partial<SearchFilters>) => void;
}) {
  return (
    <div className="space-y-6 text-sm">
      <Section title="Kategori">
        <ul className="space-y-2">
          {facets.categories.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => update({ category: filters.category === c.id ? "" : c.id, type: [] })}
                className={`flex w-full items-center justify-between text-left font-semibold ${filters.category === c.id ? "text-jade-700" : "hover:text-jade-700"}`}
                aria-pressed={filters.category === c.id}
              >
                <span>{c.emoji} {c.label}</span>
                <span className="text-xs font-normal text-ink/45">{c.count}</span>
              </button>
              <div className="mt-1.5 space-y-1.5 border-l border-ink/10 pl-3">
                {facets.types.filter((t) => t.category === c.id).map((t) => (
                  <Check
                    key={t.id}
                    value={t}
                    checked={filters.type.includes(t.id)}
                    onChange={() => update({ type: toggle(filters.type, t.id), category: "" })}
                  />
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {facets.attributes.map((a) => (
        <AttributeSection
          key={a.id}
          title={a.label}
          values={a.values}
          selected={filters.attr}
          onToggle={(id) => { update({ attr: toggle(filters.attr, id) }); track("click", { label: `filter-${a.id}-${id}`, page: "/products" }); }}
        />
      ))}

      <Section title="Warna">
        <div className="flex flex-wrap gap-2">
          {facets.colors.map((c) => {
            const on = filters.color === c.id;
            return (
              <button
                key={c.id}
                onClick={() => update({ color: on ? "" : c.id })}
                disabled={c.count === 0 && !on}
                aria-pressed={on}
                aria-label={`${c.label} (${c.count} produk)`}
                title={`${c.label} · ${c.count} produk`}
                className={`h-8 w-8 rounded-full border-2 transition disabled:opacity-25 ${on ? "border-jade-700 ring-2 ring-jade-700/30" : "border-ink/15 hover:border-ink/40"}`}
                style={{ background: c.hex }}
              />
            );
          })}
        </div>
      </Section>

      <PriceSection filters={filters} range={facets.price} update={update} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-ink/45">{title}</h2>
      {children}
    </section>
  );
}

function Check({ value, checked, onChange }: { value: FacetValue; checked: boolean; onChange: () => void }) {
  const disabled = value.count === 0 && !checked;
  return (
    <label className={`flex cursor-pointer items-center gap-2 ${disabled ? "cursor-default opacity-40" : ""}`}>
      <input type="checkbox" className="h-4 w-4 accent-jade-700" checked={checked} disabled={disabled} onChange={onChange} />
      <span className="flex-1 truncate">{value.emoji} {value.label}</span>
      <span className="text-xs text-ink/45">{value.count}</span>
    </label>
  );
}

// Options nobody can use (0 products, not selected) are hidden; long lists fold.
function AttributeSection({ title, values, selected, onToggle }: {
  title: string;
  values: FacetValue[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const [all, setAll] = useState(false);
  const usable = values.filter((v) => v.count > 0 || selected.includes(v.id));
  if (usable.length === 0) return null;
  const shown = all ? usable : usable.slice(0, 6);
  return (
    <Section title={title}>
      <div className="space-y-1.5">
        {shown.map((v) => (
          <Check key={v.id} value={v} checked={selected.includes(v.id)} onChange={() => onToggle(v.id)} />
        ))}
      </div>
      {usable.length > 6 && (
        <button onClick={() => setAll((v) => !v)} className="mt-2 text-xs font-semibold text-jade-700 hover:underline">
          {all ? "Lebih sedikit" : `Lihat semua (${usable.length})`}
        </button>
      )}
    </Section>
  );
}

function PriceSection({ filters, range, update }: {
  filters: SearchFilters;
  range: { min: number; max: number };
  update: (patch: Partial<SearchFilters>) => void;
}) {
  const [min, setMin] = useState(filters.min ? String(filters.min) : "");
  const [max, setMax] = useState(filters.max ? String(filters.max) : "");
  useEffect(() => {
    setMin(filters.min ? String(filters.min) : "");
    setMax(filters.max ? String(filters.max) : "");
  }, [filters.min, filters.max]);

  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 9);
  function apply(e: React.FormEvent) {
    e.preventDefault();
    let lo = Number(min) || 0;
    let hi = Number(max) || 0;
    if (lo && hi && lo > hi) [lo, hi] = [hi, lo]; // typed the wrong way round
    update({ min: lo, max: hi });
  }
  return (
    <Section title="Harga">
      <form onSubmit={apply} className="space-y-2">
        <div className="flex items-center gap-2">
          <input className="input px-3 py-2 text-sm" inputMode="numeric" aria-label="Harga minimum" placeholder={range.min ? String(range.min) : "Min"} value={min} onChange={(e) => setMin(digits(e.target.value))} />
          <span className="text-ink/40">–</span>
          <input className="input px-3 py-2 text-sm" inputMode="numeric" aria-label="Harga maksimum" placeholder={range.max ? String(range.max) : "Maks"} value={max} onChange={(e) => setMax(digits(e.target.value))} />
        </div>
        <button type="submit" className="btn-secondary btn-sm w-full">Terapkan</button>
      </form>
    </Section>
  );
}

function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  // first, last and the pages around the current one; gaps become an ellipsis
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1);
  const btn = "min-w-9 rounded-full border px-3 py-1.5 text-sm font-semibold transition disabled:opacity-35";
  return (
    <nav className="mt-10 flex flex-wrap items-center justify-center gap-1.5" aria-label="Halaman">
      <button className={`${btn} border-ink/12 bg-white hover:border-ink/30`} disabled={page === 1} onClick={() => onPage(page - 1)}>← Sebelumnya</button>
      {nums.map((n, i) => (
        <span key={n} className="flex items-center gap-1.5">
          {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-ink/40">…</span>}
          <button
            className={`${btn} ${n === page ? "border-jade-700 bg-jade-700 text-white" : "border-ink/12 bg-white hover:border-ink/30"}`}
            aria-current={n === page ? "page" : undefined}
            onClick={() => onPage(n)}
          >
            {n}
          </button>
        </span>
      ))}
      <button className={`${btn} border-ink/12 bg-white hover:border-ink/30`} disabled={page === pages} onClick={() => onPage(page + 1)}>Berikutnya →</button>
    </nav>
  );
}

export default function CatalogPage() {
  return (
    <Suspense>
      <Catalog />
    </Suspense>
  );
}
