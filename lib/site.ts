// Public origin of the storefront, used for canonical URLs, Open Graph and the
// sitemap. Set SITE_URL in production (no trailing slash needed).
export const SITE_URL = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export const absoluteUrl = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
