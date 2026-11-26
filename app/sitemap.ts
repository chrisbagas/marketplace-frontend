import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/api";
import { getTaxonomy } from "@/lib/search";
import { absoluteUrl } from "@/lib/site";

// Built per request: the catalog changes constantly and the API is not
// reachable while `next build` runs.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // GET /api/products without a creator filter returns active listings only
  const [products, taxonomy] = await Promise.all([getProducts(), getTaxonomy()]);

  // Creators come from the active products (no public designer index exists);
  // their /kreator/<id> storefront is added by the creator-storefront branch.
  const creators = [...new Set(products.map((p) => p.designerId))];

  return [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/products"), changeFrequency: "daily", priority: 0.9 },
    ...taxonomy.categories
      .filter((c) => c.count > 0)
      .map((c) => ({ url: absoluteUrl(`/products?category=${encodeURIComponent(c.id)}`), changeFrequency: "daily" as const, priority: 0.7 })),
    ...taxonomy.types
      .filter((t) => t.count > 0)
      .map((t) => ({ url: absoluteUrl(`/products?type=${encodeURIComponent(t.id)}`), changeFrequency: "daily" as const, priority: 0.7 })),
    ...products.map((p) => ({ url: absoluteUrl(`/product/${encodeURIComponent(p.id)}`), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...creators.map((id) => ({ url: absoluteUrl(`/kreator/${encodeURIComponent(id)}`), changeFrequency: "weekly" as const, priority: 0.5 })),
  ];
}
