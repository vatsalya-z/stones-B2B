import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@stone/ui";
import { ProductForm } from "@/components/seller/product-form";
import {
  getAllCategoriesHierarchy,
  getSellerContext,
  getSellerProductById,
} from "@/features/seller/queries";

export const metadata: Metadata = {
  title: "Edit Product",
};

interface EditSellerProductPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}

export default async function EditSellerProductPage({
  params,
  searchParams,
}: EditSellerProductPageProps) {
  const { id } = await params;
  const sp = await searchParams;

  const [ctx, categories] = await Promise.all([
    getSellerContext(),
    getAllCategoriesHierarchy(),
  ]);

  if (!ctx.sellerProfile) {
    notFound();
  }

  const product = await getSellerProductById(ctx.sellerProfile.id, id);
  if (!product) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/seller/dashboard" },
            { label: "Products", href: "/seller/products" },
            { label: product.name },
          ]}
        />
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
          Edit Product: {product.name}
        </h1>
      </div>

      {sp.saved === "1" && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          Product created and saved successfully. You can add additional photographs or update
          details anytime below.
        </div>
      )}

      <ProductForm
        mode="edit"
        categories={categories}
        sellerVerificationStatus={ctx.sellerProfile.verification_status}
        hasSellerProfile={true}
        initialProduct={product}
      />
    </div>
  );
}

