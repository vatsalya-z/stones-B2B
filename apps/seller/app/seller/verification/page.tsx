import type { Metadata } from "next";
import { checkVerificationReadiness } from "@/features/seller/seller-meta";
import {
  getSellerContext,
  getSellerVerificationDocuments,
} from "@/features/seller/queries";
import { VerificationManager } from "./verification-manager";

export const metadata: Metadata = {
  title: "Seller Verification",
};

export default async function SellerVerificationPage() {
  const ctx = await getSellerContext();
  const seller = ctx.sellerProfile;
  const documents = seller ? await getSellerVerificationDocuments(seller.id) : [];
  const readiness = checkVerificationReadiness(seller, documents.length);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
          Trust &amp; Compliance
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
          Seller Verification &amp; KYC Vault
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Upload your GST registration, PAN, and quarry/factory credentials to earn the
          StonesDekho Verified Supplier badge.
        </p>
      </div>

      <VerificationManager
        hasSellerProfile={Boolean(seller)}
        verificationStatus={seller?.verification_status ?? "draft"}
        verificationReason={seller?.verification_reason ?? null}
        verifiedAt={seller?.verified_at ?? null}
        readiness={readiness}
        initialDocuments={documents}
      />
    </div>
  );
}

