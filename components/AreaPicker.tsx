"use client";

import { useEffect, useId, useRef, useState } from "react";
import { searchAreas } from "@/lib/shipping";
import type { AreaOption } from "@/lib/types";

// Autocomplete kota/kecamatan tujuan (Biteship Maps). Ongkir dihitung dari area
// yang dipilih di sini, jadi pembeli harus memilih salah satu hasil — teks bebas
// tidak diterima. Pencarian menunggu jeda mengetik dan minimal 3 huruf.

export default function AreaPicker({
  value,
  onSelect,
  error,
}: {
  value: { id: string; label: string } | null;
  onSelect: (a: AreaOption) => void;
  error?: string;
}) {
  const listId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(!value);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<AreaOption[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState("");
  const [active, setActive] = useState(-1);

  // profil yang termuat belakangan mengisi pilihan awal
  useEffect(() => setEditing(!value), [value]);

  useEffect(() => {
    const q = query.trim();
    if (!editing || q.length < 3) {
      setOptions([]);
      setBusy(false);
      return;
    }
    const ac = new AbortController();
    setBusy(true);
    const timer = setTimeout(() => {
      searchAreas(q, ac.signal)
        .then((a) => { setOptions(a); setFailed(""); setActive(-1); })
        .catch((e: Error) => { if (e.name !== "AbortError") setFailed(e.message); })
        .finally(() => { if (!ac.signal.aborted) setBusy(false); });
    }, 350);
    return () => { clearTimeout(timer); ac.abort(); };
  }, [query, editing]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  function pick(a: AreaOption) {
    onSelect(a);
    setEditing(false);
    setOpen(false);
    setQuery("");
    setOptions([]);
  }

  if (!editing && value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-jade-700 bg-jade-50 px-3 py-2 text-sm">
        <span className="min-w-0 truncate font-semibold" title={value.label}>{value.label}</span>
        <button type="button" onClick={() => setEditing(true)} className="shrink-0 text-xs font-semibold text-jade-700 hover:underline">
          Ubah
        </button>
      </div>
    );
  }

  const q = query.trim();
  return (
    <div ref={wrap} className="relative">
      <input
        id="co-area"
        className={`input ${error ? "border-coral-400" : ""}`}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Ketik kecamatan atau kota, mis. Sako Palembang"
        value={query}
        maxLength={60}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(options.length - 1, i + 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
          else if (e.key === "Enter" && open && active >= 0 && options[active]) { e.preventDefault(); pick(options[active]); }
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && q.length >= 3 && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-ink/10 bg-white py-1 shadow-lg">
          {busy && options.length === 0 && <li className="px-3 py-2 text-xs text-ink/50">Mencari…</li>}
          {failed && <li className="px-3 py-2 text-xs font-semibold text-coral-600">{failed}</li>}
          {!busy && !failed && options.length === 0 && <li className="px-3 py-2 text-xs text-ink/50">Tidak ada hasil untuk &quot;{q}&quot;.</li>}
          {options.map((a, i) => (
            <li key={a.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-jade-50 ${i === active ? "bg-jade-50" : ""}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(a)}
              >
                {a.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.length > 0 && q.length < 3 && <p className="mt-1 text-xs text-ink/45">Ketik minimal 3 huruf.</p>}
    </div>
  );
}
