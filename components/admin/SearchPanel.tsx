"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addAttributeValue, addSynonym, deleteAttributeValue, deleteSynonym, getSearchInsights, getTaxonomy, updateAttributeValue,
  type Facets, type SearchInsights,
} from "@/lib/search";

// Admin tab "Pencarian": what shoppers search for and fail to find, the
// synonym list that fixes those misses, and the attribute values (Tema, Gaya,
// Acara) creators can tag their designs with.

export default function SearchPanel() {
  const [insights, setInsights] = useState<SearchInsights | null>(null);
  const [taxonomy, setTaxonomy] = useState<Facets | null>(null);
  const [error, setError] = useState("");
  const [synonymInput, setSynonymInput] = useState("");

  const load = useCallback(() => {
    Promise.all([getSearchInsights(), getTaxonomy()])
      .then(([i, t]) => { setInsights(i); setTaxonomy(t); })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  // run an admin action, then reload; the server's message is shown on failure
  async function run(action: () => Promise<unknown>) {
    setError("");
    try {
      await action();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan");
    }
  }

  if (!insights || !taxonomy) {
    return <div className="card mt-6 p-10 text-center text-sm text-ink/55">{error || "Memuat data pencarian…"}</div>;
  }

  return (
    <div className="mt-6 space-y-6">
      {error && <p className="rounded-xl bg-coral-50 px-4 py-2.5 text-sm font-semibold text-coral-600">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-bold">Dicari tapi tidak ada hasilnya</h2>
          <p className="mt-1 text-xs text-ink/55">
            Kata yang diketik pembeli tanpa menemukan produk. Tambahkan sinonim bila artinya sama dengan kata yang sudah ada, atau jadikan ide desain baru.
          </p>
          <TermList
            terms={insights.noResults}
            empty="Belum ada pencarian yang gagal."
            action={(term) => (
              <button onClick={() => setSynonymInput(`${term}, `)} className="text-xs font-semibold text-jade-700 hover:underline">
                Jadikan sinonim
              </button>
            )}
          />
        </section>

        <section className="card p-5">
          <h2 className="font-bold">Pencarian terpopuler</h2>
          <p className="mt-1 text-xs text-ink/55">Jumlah pencarian dan berapa produk yang ditemukan terakhir kali.</p>
          <TermList
            terms={insights.top}
            empty="Belum ada pencarian."
            action={(_, results) => (
              <span className="text-xs text-ink/45">{results === undefined ? "—" : `${results} produk`}</span>
            )}
          />
        </section>
      </div>

      <section className="card p-5">
        <h2 className="font-bold">Sinonim</h2>
        <p className="mt-1 text-xs text-ink/55">
          Kata dalam satu kelompok dianggap sama saat mencari: mengetik salah satunya juga menemukan yang lain. Satu kata per isian.
        </p>
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            const terms = synonymInput.split(",").map((t) => t.trim()).filter(Boolean);
            run(async () => { await addSynonym(terms); setSynonymInput(""); });
          }}
        >
          <input
            className="input flex-1"
            placeholder="mis. kaos, kaus, baju (pisahkan dengan koma)"
            aria-label="Kelompok sinonim baru"
            value={synonymInput}
            onChange={(e) => setSynonymInput(e.target.value)}
          />
          <button type="submit" className="btn-primary btn-sm">Tambah sinonim</button>
        </form>
        <ul className="mt-4 flex flex-wrap gap-2">
          {insights.synonyms.map((s) => (
            <li key={s.id} className="chip border border-ink/12 bg-white text-ink/75">
              {s.terms.join(" = ")}
              <button onClick={() => run(() => deleteSynonym(s.id))} className="ml-2 text-ink/40 hover:text-coral-600" aria-label={`Hapus sinonim ${s.terms.join(", ")}`}>✕</button>
            </li>
          ))}
        </ul>
      </section>

      {taxonomy.attributes.map((a) => (
        <AttributeEditor key={a.id} attribute={a} run={run} />
      ))}
    </div>
  );
}

function TermList({ terms, empty, action }: {
  terms: SearchInsights["top"];
  empty: string;
  action: (term: string, results?: number) => React.ReactNode;
}) {
  if (terms.length === 0) return <p className="mt-4 text-sm text-ink/45">{empty}</p>;
  return (
    <ul className="mt-3 divide-y divide-ink/8 text-sm">
      {terms.map((t) => (
        <li key={t.term} className="flex items-center gap-3 py-2">
          <span className="min-w-0 flex-1 truncate">“{t.term}”</span>
          <span className="text-xs text-ink/45">{t.count}×</span>
          {action(t.term, t.results)}
        </li>
      ))}
    </ul>
  );
}

function AttributeEditor({ attribute, run }: {
  attribute: Facets["attributes"][number];
  run: (action: () => Promise<unknown>) => void;
}) {
  const [label, setLabel] = useState("");
  const [emoji, setEmoji] = useState("");
  return (
    <section className="card p-5">
      <h2 className="font-bold">{attribute.label}</h2>
      <p className="mt-1 text-xs text-ink/55">
        Pilihan yang bisa dipasang kreator pada desainnya (maks {attribute.max} per desain) dan dipakai pembeli sebagai filter. Angka = jumlah produk aktif.
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {attribute.values.map((v) => (
          <ValueChip key={v.id} value={v} run={run} />
        ))}
      </ul>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => { await addAttributeValue(attribute.id, label, emoji); setLabel(""); setEmoji(""); });
        }}
      >
        <input className="input w-20" placeholder="🙂" aria-label="Emoji" maxLength={4} value={emoji} onChange={(e) => setEmoji(e.target.value)} />
        <input className="input flex-1" placeholder={`Nama ${attribute.label.toLowerCase()} baru`} aria-label={`Nama ${attribute.label} baru`} maxLength={40} value={label} onChange={(e) => setLabel(e.target.value)} />
        <button type="submit" className="btn-secondary btn-sm" disabled={!label.trim()}>Tambah</button>
      </form>
    </section>
  );
}

function ValueChip({ value: v, run }: {
  value: Facets["attributes"][number]["values"][number];
  run: (action: () => Promise<unknown>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(v.label);
  const [emoji, setEmoji] = useState(v.emoji ?? "");

  if (editing) {
    return (
      <li className="chip border border-ink/12 bg-white text-ink/75">
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await updateAttributeValue(v.id, { label, emoji });
              setEditing(false);
            });
          }}
        >
          <input className="input w-14 !py-0.5 text-center" aria-label={`Emoji ${v.label}`} maxLength={4} value={emoji} onChange={(e) => setEmoji(e.target.value)} />
          <input className="input w-36 !py-0.5" aria-label={`Nama ${v.label}`} maxLength={40} value={label} onChange={(e) => setLabel(e.target.value)} autoFocus />
          <button type="submit" className="ml-1 text-ink/60 hover:text-ink" aria-label={`Simpan ${v.label}`} disabled={!label.trim()}>✓</button>
          <button
            type="button"
            className="text-ink/40 hover:text-coral-600"
            aria-label="Batal"
            onClick={() => { setLabel(v.label); setEmoji(v.emoji ?? ""); setEditing(false); }}
          >
            ✕
          </button>
        </form>
      </li>
    );
  }

  return (
    <li className="chip border border-ink/12 bg-white text-ink/75">
      {v.emoji} {v.label} <span className="ml-1 text-ink/40">{v.count}</span>
      <button
        onClick={() => { setLabel(v.label); setEmoji(v.emoji ?? ""); setEditing(true); }}
        className="ml-2 text-ink/40 hover:text-ink"
        aria-label={`Ubah ${v.label}`}
      >
        ✎
      </button>
      <button
        onClick={() => {
          const warn = v.count > 0 ? ` ${v.count} produk akan kehilangan label ini.` : "";
          if (window.confirm(`Hapus “${v.label}”?${warn}`)) run(() => deleteAttributeValue(v.id));
        }}
        className="ml-1 text-ink/40 hover:text-coral-600"
        aria-label={`Hapus ${v.label}`}
      >
        ✕
      </button>
    </li>
  );
}
