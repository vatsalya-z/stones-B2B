import React from "react";
import type { Metadata } from "next";
import { Breadcrumb, SectionHeading } from "@stone/ui";
import { PublicRfqForm } from "@/features/rfq/public-rfq-form";
import { getSellerBySlug } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Request Custom Quotation (RFQ) — Architectural Stone Sourcing",
  description:
    "Submit your natural stone bill of quantities (BOQ) directly to verified Indian quarry owners and manufacturing factories.",
};

interface RequestQuotePageProps {
  searchParams: Promise<{
    supplier?: string;
    material?: string;
    product?: string;
  }>;
}

export default async function RequestQuotePage({ searchParams }: RequestQuotePageProps) {
  const sp = await searchParams;
  const currentUser = await getCurrentUser();

  let targetSupplier = null;
  if (sp.supplier) {
    const seller = await getSellerBySlug(sp.supplier);
    if (seller) {
      targetSupplier = {
        id: seller.id,
        name: seller.businessName,
        slug: seller.slug,
        location: [seller.city, seller.state, seller.country].filter(Boolean).join(", "),
      };
    }
  }

  return (
    <div className="section-pad bg-stone-50 min-h-screen">
      <div className="container-wide space-y-8">
        <div>
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              ...(targetSupplier
                ? [
                    { label: "Suppliers", href: "/suppliers" },
                    { label: targetSupplier.name, href: `/suppliers/${targetSupplier.slug}` },
                  ]
                : []),
              { label: "Request a Quote" },
            ]}
          />

          <SectionHeading
            className="mt-4"
            title={
              targetSupplier
                ? `Request Commercial Quotation from ${targetSupplier.name}`
                : "Request Custom Stone Quotation (RFQ)"
            }
            subtitle="Submit your project Bill of Quantities (BOQ). Receive transparent, factory-direct commercial quotations without intermediary broker markups."
          />
        </div>

        <div className="mx-auto max-w-4xl">
          <PublicRfqForm
            supplier={targetSupplier}
            initialUserName={currentUser?.email ? currentUser.email.split("@")[0] : null}
            initialUserEmail={currentUser?.email ?? null}
            prefilledMaterial={sp.material ?? null}
            prefilledProduct={sp.product ?? null}
          />
        </div>
      </div>
    </div>
  );
}

