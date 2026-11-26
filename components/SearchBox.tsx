"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import Avatar from "./Avatar";
import { rupiah } from "@/lib/format";
import { catalogHref, suggest, type Suggestion } from "@/lib/search";
import { track } from "@/lib/track";

// Search field with suggestions as you type: query completions, shortcuts to
// a filter ("Tema: Anime"), creators and the best matching products. With an
// empty field it shows the most popular searches. Arrow keys move through the
// list, Enter opens the highlighted row or runs the search as typed.

type Row = { key: string; href: string; search?: string; node: React.ReactNode };

const EMPTY: Suggestion = { terms: [], filters: [], creators: [], products: [] };

export default function SearchBox({ value = "", className = "" }: { value?: string; className?: string }) {
  const router = useRouter();
  const listId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Suggestion>(EMPTY);
  const [active, setActive] = useState(-1);

  // the field follows the URL (back/forward, a corrected query, a cleared search)
  useEffect(() => setQuery(value), [value]);

  useEffect(() => {
    if (!open) return;
    const ac = new AbortController();
    // wait for a pause in typing; the empty field (popular searches) loads at once
    const timer = setTimeout(() => {
      suggest(query.trim(), ac.signal)
        .then((d) => { setData(d); setActive(-1); })
        .catch(() => {});
    }, query.trim() ? 160 : 0);
    return () => { clearTimeout(timer); ac.abort(); };
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const typed = query.trim();
  const rows = useMemo<Row[]>(() => [
    ...data.terms.map((t) => ({
      key: `t-${t}`,
      href: catalogHref({ q: t }),
      search: t,
      node: (
        <>
          <SearchIcon className="h-4 w-4 shrink-0 text-ink/35" />
          <span className="truncate">{t}</span>
          {!typed && <span className="ml-auto text-[11px] text-ink/40">populer</span>}
        </>
      ),
    })),
    ...data.filters.map((f) => ({
      key: `f-${f.kind}-${f.id}`,
      href: catalogHref(f.kind === "attr" ? { attr: [f.id] } : f.kind === "type" ? { type: [f.id] } : { category: f.id }),
      node: (
        <>
          <span className="w-4 shrink-0 text-center text-sm">{f.emoji || "#"}</span>
          <span className="truncate">{f.label}</span>
          <span className="ml-auto shrink-0 text-[11px] text-ink/40">{f.group}</span>
        </>
      ),
    })),
    ...data.creators.map((c) => ({
      key: `c-${c.id}`,
      href: catalogHref({ designer: c.id }),
      node: (
        <>
          <Avatar uri={c.avatar} name={c.name} hue={152} size={20} />
          <span className="truncate">{c.name}</span>
          <span className="ml-auto shrink-0 text-[11px] text-ink/40">Kreator</span>
        </>
      ),
    })),
    ...data.products.map((p) => ({
      key: `p-${p.id}`,
      href: `/product/${p.id}`,
      node: (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.designUri} alt="" className="h-9 w-9 shrink-0 rounded-lg bg-jade-50 object-contain p-0.5" />
          <span className="min-w-0">
            <span className="block truncate font-semibold">{p.title}</span>
            <span className="block truncate text-[11px] text-ink/50">oleh {p.designerName}</span>
          </span>
          <span className="ml-auto shrink-0 text-xs font-bold">{rupiah(p.price)}</span>
        </>
      ),
    })),
  ], [data, typed]);

  function go(row?: Row) {
    setOpen(false);
    const term = row ? row.search : typed;
    if (term) track("search", { label: term, page: "/products" });
    router.push(row ? row.href : catalogHref({ q: typed }));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") return setOpen(false);
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    if (!open) return setOpen(true);
    if (rows.length === 0) return;
    // -1 = the field itself, so one more press past either end returns to it
    const next = active + (e.key === "ArrowDown" ? 1 : -1);
    setActive(next >= rows.length ? -1 : next < -1 ? rows.length - 1 : next);
  }

  const showList = open && rows.length > 0;
  return (
    <div ref={wrap} className={`relative ${className}`}>
      <form
        role="search"
        onSubmit={(e) => { e.preventDefault(); go(active >= 0 ? rows[active] : undefined); }}
      >
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ink/40" />
        <input
          type="text"
          enterKeyHint="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          aria-label="Cari produk"
          autoComplete="off"
          className="input pl-10 pr-20"
          placeholder="Cari desain, kreator, atau tema…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-jade-700 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-jade-800">
          Cari
        </button>
      </form>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-ink/10 bg-white py-1.5 shadow-xl"
        >
          {rows.map((row, i) => (
            <li
              key={row.key}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown, not click: the row must act before the field loses focus
              onMouseDown={(e) => { e.preventDefault(); go(row); }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-3 px-4 py-2 text-sm ${i === active ? "bg-jade-50" : ""}`}
            >
              {row.node}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SearchIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="7" /><path d="m21 21-4-4" />
    </svg>
  );
}
