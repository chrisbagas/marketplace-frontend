// Print quality: effective resolution of a raster design at the chosen print
// width. DPI = widthPx / (widthCm / 2.54). Mirrors backend/internal/api/printquality.go,
// which enforces MIN_DPI on submit/checkout (pixel sizes come from the server's
// `files` table, never from the browser).

export const MIN_DPI = 150; // below this the print is refused
export const GOOD_DPI = 300; // from here on it is sharp

const CM_PER_INCH = 2.54;

export type DpiLevel = "low" | "ok" | "good";

export const effectiveDpi = (widthPx: number, widthCm: number) => widthPx / (widthCm / CM_PER_INCH);

/** Widest print (cm, rounded down to 0.1) that still reaches `dpi`. */
export const maxWidthForDpi = (widthPx: number, dpi: number) =>
  Math.floor((widthPx / dpi) * CM_PER_INCH * 10 + 1e-6) / 10;

export const dpiLevel = (dpi: number): DpiLevel => (dpi < MIN_DPI ? "low" : dpi < GOOD_DPI ? "ok" : "good");

/** True when a raster of `widthPx` printed `widthCm` wide is below MIN_DPI (null widthPx = vector: never). */
export const printBlocked = (widthPx: number | null, widthCm: number) =>
  widthPx !== null && widthCm > 0 && dpiLevel(effectiveDpi(widthPx, widthCm)) === "low";

export const LOW_DPI_MESSAGE = "Resolusi terlalu rendah untuk lebar cetak ini";
export const OK_DPI_MESSAGE = "Bisa dicetak, tapi kurang tajam";
export const GOOD_DPI_MESSAGE = "Resolusi tajam untuk dicetak";
