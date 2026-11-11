import type { Metadata } from "next";
import { Breadcrumb, SectionHeading } from "@stone/ui";
import { RfqWizardForm } from "@/components/buyer/rfq-wizard-form";
import { getBuyerContext, getRfqCreationContext } from "@/features/buyer/queries";

export const metadata: Metadata = {
  title: "Create Request for Quotation (RFQ)",
};

interface NewRfqPageProps {
  searchParams: Promise<{
    product?: string;
    supplier?: string;
  }>;
}

export default async function BuyerNewRfqPage({ searchParams }: NewRfqPageProps) {
  const [ctx, sp] = await Promise.all([getBuyerContext(), searchParams]);
  const rfqCtx = await getRfqCreationContext(ctx.user.id, {
    productSlugOrId: sp.product,
    supplierSlugOrId: sp.supplier,
  });

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/buyer/dashboard" },
          { label: "RFQs", href: "/buyer/rfqs" },
          { label: "Create New RFQ" },
        ]}
      />

      <SectionHeading
        title="Request for Quotation (RFQ)"
        subtitle="Specify technical stone dimensions, finishes, tolerances, target quantities, delivery port/site, and private BOQ drawings."
      />

      {rfqCtx.requestedProductUnavailable && sp.product && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900">
          The requested product reference is either a showcase sample or no longer published. You can
          submit a General Custom Stone RFQ directly to any verified supplier below.
        </div>
      )}

      <RfqWizardForm
        categories={rfqCtx.categories}
        verifiedSuppliers={rfqCtx.verifiedSuppliers}
        preselectedProduct={rfqCtx.preselectedProduct}
        preselectedSupplier={rfqCtx.preselectedSupplier}
        defaultDelivery={{
          country: ctx.profile?.country ?? "IN",
          state: ctx.profile?.state ?? "",
          city: ctx.profile?.city ?? "",
          address: ctx.extendedAddress.cleanAddress,
        }}
      />
    </div>
  );
}

