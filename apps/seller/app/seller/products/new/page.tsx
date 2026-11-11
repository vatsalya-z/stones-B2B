import type { Metadata } from "next";
import { Breadcrumb } from "@stone/ui";
import { ProductForm } from "@/components/seller/product-form";
import {
  getAllCategoriesHierarchy,
  getSellerContext,
} from "@/features/seller/queries";

export const metadata: Metadata = {
  title: "Add New Product",
};

export default async function NewSellerProductPage() {
  const [ctx, categories] = await Promise.all([
    getSellerContext(),
    getAllCategoriesHierarchy(),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/seller/dashboard" },
            { label: "Products", href: "/seller/products" },
            { label: "Add New Product" },
          ]}
        />
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
          Add Natural Stone Product
        </h1>
        <p className="text-sm text-stone-600">
          Complete specifications, trade pricing, inventory lead times, and Ultra-HD
          photographs.
        </p>
      </div>

      <ProductForm
        mode="create"
        categories={categories}
        sellerVerificationStatus={ctx.sellerProfile?.verification_status ?? null}
        hasSellerProfile={Boolean(ctx.sellerProfile)}
      />
    </div>
  );
}

