import { ImageResponse } from "next/og";
import { API_BASE, getProduct } from "@/lib/api";
import { COLORS } from "@/lib/data";
import { rupiah } from "@/lib/format";
import { SITE_URL } from "@/lib/site";

// Share image (WhatsApp, Facebook, X ...): the design on the product colour
// next to title, creator and price. Falls back to a title + price card when
// the design cannot be embedded.

export const alt = "Produk KaryaKita";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const MAX_IMAGE_BYTES = 3_000_000;
const RASTER = new Set(["image/png", "image/jpeg", "image/gif"]);

// Returns something satori can draw (a data: URI), or null. Only our own
// uploads are fetched: the URI is creator-supplied, so arbitrary remote URLs
// are never requested from the server.
async function embeddable(uri: string): Promise<string | null> {
  if (uri.startsWith("data:image/svg+xml")) return uri;
  if (/^data:image\/(png|jpeg|gif);base64,/.test(uri)) return uri;
  let path = uri;
  if (uri.startsWith(`${SITE_URL}/`)) path = uri.slice(SITE_URL.length);
  if (!path.startsWith("/uploads/")) return null;
  try {
    const res = await fetch(`${API_BASE}${path}`, { signal: AbortSignal.timeout(4000) });
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!res.ok || !RASTER.has(type)) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > MAX_IMAGE_BYTES) return null;
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

const brand = (
  <div style={{ display: "flex", fontSize: 34, fontWeight: 800, color: "#14532d" }}>
    Karya<span style={{ color: "#15803d" }}>Kita</span>
  </div>
);

function fallbackCard(title: string, price: string, creator: string) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#f0fdf4" }}>
      {brand}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 72, fontWeight: 800, color: "#052e16", lineHeight: 1.1 }}>{title}</div>
        {creator && <div style={{ display: "flex", fontSize: 34, color: "#3f6212", marginTop: 20 }}>oleh {creator}</div>}
      </div>
      <div style={{ display: "flex", fontSize: 60, fontWeight: 800, color: "#15803d" }}>{price}</div>
    </div>
  );
}

function designCard(image: string, colorHex: string, title: string, price: string, creator: string) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#f0fdf4" }}>
      <div style={{ width: 630, height: 630, display: "flex", alignItems: "center", justifyContent: "center", background: colorHex }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} width={380} height={380} style={{ objectFit: "contain" }} alt="" />
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 56px 56px 64px" }}>
        {brand}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 56, fontWeight: 800, color: "#052e16", lineHeight: 1.15 }}>{title}</div>
          {creator && <div style={{ display: "flex", fontSize: 30, color: "#3f6212", marginTop: 18 }}>oleh {creator}</div>}
        </div>
        <div style={{ display: "flex", fontSize: 54, fontWeight: 800, color: "#15803d" }}>{price}</div>
      </div>
    </div>
  );
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id).catch(() => null);
  const title = clip(product?.title ?? "Karya kreator Indonesia", 70);
  const price = product ? rupiah(product.price) : "";
  const creator = product ? clip(product.designerName, 40) : "";
  const headers = { "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" };

  const image = product ? await embeddable(product.designUri) : null;
  if (product && image) {
    const colorHex = COLORS[product.colorIds[0]]?.hex ?? "#f4f2ec";
    try {
      // render eagerly: a design satori cannot parse only fails while the
      // stream is read, and then we still want to answer with the fallback
      const png = await new ImageResponse(designCard(image, colorHex, title, price, creator), size).arrayBuffer();
      return new Response(png, { headers: { ...headers, "Content-Type": "image/png" } });
    } catch {
      // fall through to the text card
    }
  }
  return new ImageResponse(fallbackCard(title, price, creator), { ...size, headers });
}
