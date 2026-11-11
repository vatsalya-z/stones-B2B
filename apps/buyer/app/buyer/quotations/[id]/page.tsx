import { redirect } from "next/navigation";

interface QuotationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function BuyerQuotationDetailAliasPage({ params }: QuotationDetailPageProps) {
  const { id } = await params;
  redirect(`/buyer/quotes/${id}`);
}

