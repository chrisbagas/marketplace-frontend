import { API_BASE } from "./api";
import type { Product } from "./types";

// Catalog search: GET /api/search, /api/search/suggest and /api/taxonomy
// (backend internal/api/search.go). The URL of /products is the single source
// of truth for the filters; these helpers convert between the two.

export type FacetValue = {
  id: string;
  label: string;
  emoji?: string;
  hex?: string; // colours
  category?: string; // product types: the category they belong to
  count: number;
};

export type FacetAttribute = { id: string; label: string; max: number; values: FacetValue[] };

// The whole taxonomy plus, per option, how many products it would show.
export type Facets = {
  categories: FacetValue[];
  types: FacetValue[];
  attributes: FacetAttribute[];
  colors: FacetValue[];
  price: { min: number; max: number };
};

export type SearchResult = {
  products: Product[];
  total: number;
  page: number;
  pages: number;
  limit: number;
  // used: what was searched when a typo was corrected; relaxed: no product
  // matched every word, so partial matches are shown
  query: { q: string; used?: string; relaxed: boolean };
  facets: Facets;
};

export type SearchFilters = {
  q: string;
  type: string[];
  category: string;
  attr: string[];
  color: string;
  min: number;
  max: number;
  designer: string;
  sort: string; // "" = relevance when searching, best sellers otherwise
  page: number;
};

export const SORTS = [
  { id: "", label: "Paling sesuai" },
  { id: "terlaris", label: "Paling laris" },
  { id: "terbaru", label: "Terbaru" },
  { id: "rating", label: "Rating tertinggi" },
  { id: "termurah", label: "Harga terendah" },
  { id: "termahal", label: "Harga tertinggi" },
];

const list = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);
const int = (v: string | null) => Math.max(0, Math.floor(Number(v)) || 0);

export function filtersFromParams(sp: URLSearchParams): SearchFilters {
  return {
    q: (sp.get("q") ?? "").trim(),
    type: list(sp.get("type")),
    category: sp.get("category") ?? "",
    attr: list(sp.get("attr")),
    color: sp.get("color") ?? "",
    min: int(sp.get("min")),
    max: int(sp.get("max")),
    designer: sp.get("designer") ?? "",
    sort: SORTS.some((s) => s.id === sp.get("sort")) ? sp.get("sort")! : "",
    page: Math.max(1, int(sp.get("page"))),
  };
}

// Only non-default values end up in the URL, so links stay short.
export function filtersToParams(f: Partial<SearchFilters>): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  if (f.type?.length) sp.set("type", f.type.join(","));
  if (f.category) sp.set("category", f.category);
  if (f.attr?.length) sp.set("attr", f.attr.join(","));
  if (f.color) sp.set("color", f.color);
  if (f.min) sp.set("min", String(f.min));
  if (f.max) sp.set("max", String(f.max));
  if (f.designer) sp.set("designer", f.designer);
  if (f.sort) sp.set("sort", f.sort);
  if (f.page && f.page > 1) sp.set("page", String(f.page));
  return sp;
}

export const catalogHref = (f: Partial<SearchFilters>) => {
  const qs = filtersToParams(f).toString();
  return qs ? `/products?${qs}` : "/products";
};

export async function searchProducts(f: SearchFilters, signal?: AbortSignal): Promise<SearchResult> {
  const res = await fetch(`${API_BASE}/api/search?${filtersToParams(f)}`, { cache: "no-store", signal });
  if (!res.ok) throw new Error(`GET /api/search ${res.status}`);
  return res.json();
}

export type Suggestion = {
  terms: string[];
  filters: { kind: "attr" | "category" | "type"; id: string; label: string; emoji?: string; group: string }[];
  creators: { id: string; name: string; avatar: string }[];
  products: Product[];
};

// Without a query the server answers with the most popular searches.
export async function suggest(q: string, signal?: AbortSignal): Promise<Suggestion> {
  const res = await fetch(`${API_BASE}/api/search/suggest?q=${encodeURIComponent(q)}`, { cache: "no-store", signal });
  if (!res.ok) throw new Error(`GET /api/search/suggest ${res.status}`);
  return res.json();
}

export async function getTaxonomy(): Promise<Facets> {
  const res = await fetch(`${API_BASE}/api/taxonomy`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET /api/taxonomy ${res.status}`);
  return res.json();
}

// ---- admin (tab "Pencarian") -------------------------------------------------

export type SearchTerm = { term: string; count: number; results?: number };
export type Synonym = { id: number; terms: string[] };
export type SearchInsights = { top: SearchTerm[]; noResults: SearchTerm[]; synonyms: Synonym[] };

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Gagal (${res.status})`);
  return data as T;
}

const send = (path: string, method: string, body?: unknown) =>
  fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

export async function getSearchInsights(): Promise<SearchInsights> {
  return json(await fetch("/api/search/insights", { cache: "no-store" }));
}

export async function addSynonym(terms: string[]): Promise<Synonym> {
  return (await json<{ synonym: Synonym }>(await send("/api/search/synonyms", "POST", { terms }))).synonym;
}

export async function deleteSynonym(id: number) {
  await json(await send(`/api/search/synonyms/${id}`, "DELETE"));
}

export async function addAttributeValue(attribute: string, label: string, emoji: string) {
  await json(await send(`/api/attributes/${attribute}/values`, "POST", { label, emoji }));
}

export async function updateAttributeValue(id: string, patch: { label?: string; emoji?: string }) {
  await json(await send(`/api/attribute-values/${id}`, "PATCH", patch));
}

export async function deleteAttributeValue(id: string) {
  await json(await send(`/api/attribute-values/${id}`, "DELETE"));
}
