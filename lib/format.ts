export const rupiah = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");

export const compact = (n: number) =>
  new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export const fmtDate = (iso: string | number) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

export const fmtTime = (iso: string | number) =>
  new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

export function timeAgo(t: number) {
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s} dtk lalu`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

// Centimetres with an Indonesian decimal comma ("18,5"), no trailing ",0".
export const fmtCm = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 1 });

// Where the print sits: offsetYCm is measured from the centre of the print area
// (positive = towards the hem, negative = towards the collar), same as Mockup.
export function fmtPrintOffset(offsetYCm: number) {
  if (!offsetYCm) return "tepat di tengah area cetak";
  return `${fmtCm(Math.abs(offsetYCm))} cm ${offsetYCm > 0 ? "di bawah" : "di atas"} tengah area cetak`;
}
