import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, getProducts, getReviewSummary } from "@/lib/api";
import ProductDetail from "@/components/ProductDetail";
import { rupiah } from "@/lib/format";
import { absoluteUrl } from "@/lib/site";

type Props = { params: Promise<{ id: string }> };

const describe = (p: NonNullable<Awaited<ReturnType<typeof getProduct>>>) =>
  `${p.title} karya ${p.designerName}, ${rupiah(p.price)}. ${p.typeLabel} dengan desain orisinal kreator lokal, dicetak sesuai pesanan dan dikirim ke seluruh Indonesia.`;

// The share image comes from the sibling opengraph-image.tsx file convention.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = await getProduct(id);
  if (!p) return { title: "Produk tidak ditemukan — KaryaKita", robots: { index: false } };
  const title = `${p.title} oleh ${p.designerName} — KaryaKita`;
  const description = describe(p);
  const url = absoluteUrl(`/product/${p.id}`);
  return {
    title,
    description,
    alternates: { canonical: url },
    // inactive listings stay reachable by link but are kept out of the index
    robots: p.active === false ? { index: false, follow: true } : undefined,
    openGraph: { type: "website", title, description, url, siteName: "KaryaKita", locale: "id_ID" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const listing = await getProduct(id);
  if (!listing) notFound();
  const [all, reviews] = await Promise.all([getProducts(), getReviewSummary(id)]);
  const related = all
    .filter((l) => l.id !== id && (l.designId === listing.designId || l.designerId === listing.designerId))
    .slice(0, 4);

  // schema.org Product; AggregateRating only when approved reviews exist
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: describe(listing),
    sku: listing.id,
    category: listing.typeLabel,
    url: absoluteUrl(`/product/${listing.id}`),
    // also served by app/product/[id]/opengraph-image.tsx
    image: absoluteUrl(`/product/${listing.id}/opengraph-image`),
    brand: { "@type": "Brand", name: listing.designerName },
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/product/${listing.id}`),
      priceCurrency: "IDR",
      price: listing.price,
      availability: listing.active === false ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    ...(reviews.count > 0 && {
      aggregateRating: { "@type": "AggregateRating", ratingValue: reviews.avg, reviewCount: reviews.count, bestRating: 5, worstRating: 1 },
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // "<" escaped so a title can never close the script element
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <ProductDetail listing={listing} related={related} />
    </>
  );
}
