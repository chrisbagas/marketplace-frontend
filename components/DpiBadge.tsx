import { fmtCm } from "@/lib/format";
import {
  GOOD_DPI,
  GOOD_DPI_MESSAGE,
  LOW_DPI_MESSAGE,
  MIN_DPI,
  OK_DPI_MESSAGE,
  dpiLevel,
  effectiveDpi,
  maxWidthForDpi,
} from "@/lib/printQuality";

// Live resolution badge next to the print-width slider. widthPx = pixel width of
// the uploaded raster; null = vector / sample design (no resolution → nothing shown).

const STYLE = {
  low: { box: "bg-coral-50 text-coral-600", dot: "bg-coral-500", message: LOW_DPI_MESSAGE },
  ok: { box: "bg-sun-50 text-sun-600", dot: "bg-sun-400", message: OK_DPI_MESSAGE },
  good: { box: "bg-jade-50 text-jade-800", dot: "bg-jade-500", message: GOOD_DPI_MESSAGE },
} as const;

export default function DpiBadge({ widthPx, widthCm }: { widthPx: number | null; widthCm: number }) {
  if (widthPx === null || widthCm <= 0) return null;
  const dpi = effectiveDpi(widthPx, widthCm);
  const level = dpiLevel(dpi);
  const s = STYLE[level];
  return (
    <div className={`mt-3 rounded-xl p-3 text-xs ${s.box}`} role={level === "low" ? "alert" : "status"} data-testid="dpi-badge" data-level={level}>
      <p className="flex items-center gap-2 font-bold">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${s.dot}`} aria-hidden />
        {Math.round(dpi)} DPI · {s.message}
      </p>
      <p className="mt-1 opacity-80">
        Gambar {widthPx.toLocaleString("id-ID")} px lebar. Lebar cetak maks. untuk {GOOD_DPI} DPI:{" "}
        <b>{fmtCm(maxWidthForDpi(widthPx, GOOD_DPI))} cm</b> · untuk {MIN_DPI} DPI (batas minimum):{" "}
        <b>{fmtCm(maxWidthForDpi(widthPx, MIN_DPI))} cm</b>
      </p>
    </div>
  );
}
