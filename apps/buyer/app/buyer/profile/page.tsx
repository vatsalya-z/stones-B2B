import type { Metadata } from "next";
import { SectionHeading } from "@stone/ui";
import { getBuyerContext } from "@/features/buyer/queries";
import { BuyerProfileForm } from "./buyer-profile-form";

export const metadata: Metadata = {
  title: "Buyer Profile",
};

export default async function BuyerProfilePage() {
  const ctx = await getBuyerContext();

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Buyer Profile Management"
        subtitle="Maintain your contact information, company details, and default delivery destination for natural stone procurement."
      />

      <BuyerProfileForm
        initialData={{
          fullName: ctx.profile?.full_name ?? "",
          email: ctx.user.email ?? "",
          emailVerified: ctx.user.emailVerified,
          accountStatus: ctx.profile?.account_status ?? "active",
          roles: ctx.roles,
          phone: ctx.profile?.phone ?? "",
          whatsappNumber: ctx.extendedAddress.whatsappNumber,
          companyName: ctx.extendedAddress.companyName,
          buyerType: ctx.extendedAddress.buyerType,
          country: ctx.profile?.country ?? "IN",
          state: ctx.profile?.state ?? "",
          city: ctx.profile?.city ?? "",
          address: ctx.extendedAddress.cleanAddress,
          pincode: ctx.extendedAddress.pincode,
        }}
      />
    </div>
  );
}

