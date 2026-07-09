import { notFound } from "next/navigation";
import { getProduct, getProducts } from "@/lib/api";
import ProductDetail from "@/components/ProductDetail";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getProduct(id);
  if (!listing) notFound();
  const all = await getProducts();
  const related = all
    .filter((l) => l.id !== id && (l.designId === listing.designId || l.designerId === listing.designerId))
    .slice(0, 4);
  return <ProductDetail listing={listing} related={related} />;
}
