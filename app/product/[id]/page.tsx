import { notFound } from "next/navigation";
import { ALL_LISTINGS, listingById } from "@/lib/data";
import ProductDetail from "@/components/ProductDetail";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = listingById(id);
  if (!listing) notFound();
  const related = ALL_LISTINGS.filter((l) => l.id !== id && (l.designId === listing.designId || l.designerId === listing.designerId)).slice(0, 4);
  return <ProductDetail listing={listing} related={related} />;
}
