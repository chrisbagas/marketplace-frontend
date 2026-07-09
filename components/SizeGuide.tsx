"use client";

import { useState } from "react";
import type { ProductType } from "@/lib/data";

// Referensi ukuran singkat per jenis produk (cm). Untuk kaos/hoodie:
// lebar dada diukur rata 2 cm di bawah ketiak, panjang dari bahu tertinggi.
const GUIDES: Record<ProductType, { note: string; cols: string[]; rows: string[][] }> = {
  kaos: {
    note: "Katun combed 24s, potongan unisex reguler. Toleransi ±1,5 cm.",
    cols: ["Ukuran", "Lebar dada", "Panjang", "Cocok untuk BB"],
    rows: [
      ["S", "46 cm", "66 cm", "45–55 kg"],
      ["M", "49 cm", "69 cm", "55–65 kg"],
      ["L", "52 cm", "72 cm", "65–75 kg"],
      ["XL", "55 cm", "74 cm", "75–85 kg"],
      ["XXL", "58 cm", "76 cm", "85–95 kg"],
    ],
  },
  hoodie: {
    note: "Fleece premium 280 gsm, potongan unisex sedikit longgar. Toleransi ±1,5 cm.",
    cols: ["Ukuran", "Lebar dada", "Panjang", "Panjang lengan"],
    rows: [
      ["S", "52 cm", "66 cm", "58 cm"],
      ["M", "55 cm", "69 cm", "60 cm"],
      ["L", "58 cm", "71 cm", "62 cm"],
      ["XL", "61 cm", "74 cm", "63 cm"],
      ["XXL", "64 cm", "76 cm", "64 cm"],
    ],
  },
  mug: {
    note: "Keramik premium, aman microwave & dishwasher.",
    cols: ["Ukuran", "Kapasitas", "Tinggi", "Diameter"],
    rows: [["330 ml", "330 ml", "9,5 cm", "8 cm"]],
  },
  totebag: {
    note: "Kanvas 12 oz, jahitan bartack di tali — kuat untuk laptop 14\".",
    cols: ["Ukuran", "Lebar × tinggi", "Tali", "Beban maks"],
    rows: [["38×42 cm", "38 × 42 cm", "60 cm", "±8 kg"]],
  },
};

export default function SizeGuide({ type }: { type: ProductType }) {
  const [open, setOpen] = useState(false);
  const g = GUIDES[type];

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-xs font-semibold text-jade-700 hover:underline"
        aria-expanded={open}
      >
        📏 Panduan ukuran {open ? "▴" : "▾"}
      </button>
      {open && (
        <div className="mt-2 overflow-x-auto rounded-xl border border-ink/10 bg-white">
          <table className="w-full text-xs" style={{ fontVariantNumeric: "tabular-nums" }}>
            <thead>
              <tr className="border-b border-ink/8 text-left text-ink/50">
                {g.cols.map((c) => (
                  <th key={c} className="px-3 py-2 font-semibold">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {g.rows.map((r) => (
                <tr key={r[0]} className="border-b border-ink/5 last:border-0">
                  {r.map((cell, i) => (
                    <td key={i} className={`px-3 py-1.5 ${i === 0 ? "font-bold" : "text-ink/70"}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-3 py-2 text-[11px] text-ink/45">{g.note}</p>
        </div>
      )}
    </div>
  );
}
