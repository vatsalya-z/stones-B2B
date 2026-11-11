import type { Metadata } from "next";
import { Breadcrumb, SectionHeading } from "@stone/ui";
import { BuyerAddressManager, type BuyerSavedAddressRecord } from "@/components/buyer/buyer-address-manager";
import { getBuyerSavedAddresses } from "@/features/buyer/queries";
import { requireBuyer } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Delivery & Billing Addresses",
};

export default async function BuyerAddressesPage() {
  await requireBuyer();
  const rawAddresses = await getBuyerSavedAddresses();

  const initialAddresses: BuyerSavedAddressRecord[] = rawAddresses.map((addr) => ({
    id: addr.id,
    buyer_id: addr.buyer_id,
    address_type: addr.address_type,
    contact_name: addr.contact_name,
    phone: addr.phone,
    company_name: addr.company_name,
    gstin: addr.gstin,
    address_line1: addr.address_line1,
    address_line2: addr.address_line2,
    city: addr.city,
    state: addr.state,
    pincode: addr.pincode,
    country: addr.country,
    is_default: addr.is_default,
    created_at: addr.created_at,
    updated_at: addr.updated_at,
  }));

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/buyer/dashboard" },
          { label: "Delivery Addresses" },
        ]}
      />

      <SectionHeading
        title="Procurement & Delivery Addresses"
        subtitle="Manage your destination project sites, manufacturing plants, and registered billing locations for accurate stone freight quotations."
      />

      <BuyerAddressManager initialAddresses={initialAddresses} />
    </div>
  );
}

