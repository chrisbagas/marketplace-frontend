import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Private areas and transactional pages stay out of search engines; /uploads
// (design images) remains crawlable.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/designer",
        "/akun",
        "/checkout",
        "/order",
        "/pesanan",
        "/profile",
        "/studio",
        "/cart",
        "/api/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
