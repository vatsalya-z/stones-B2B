import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BuyerEnquiryDetailView } from "@/components/buyer/buyer-enquiry-detail-view";
import { getBuyerContext, getBuyerEnquiryDetail } from "@/features/buyer/queries";

export const metadata: Metadata = {
  title: "Enquiry Details",
};

interface BuyerEnquiryDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function BuyerEnquiryDetailPage({
  params,
}: BuyerEnquiryDetailPageProps) {
  const [ctx, { id }] = await Promise.all([getBuyerContext(), params]);
  const detail = await getBuyerEnquiryDetail(ctx.user.id, id);

  if (!detail) {
    notFound();
  }

  return <BuyerEnquiryDetailView detail={detail} sectionContext="enquiries" />;
}

