import type { Metadata } from "next";
import { BuyerEnquiriesListView } from "@/components/buyer/buyer-enquiries-list-view";
import { getBuyerContext, getBuyerEnquiries } from "@/features/buyer/queries";

export const metadata: Metadata = {
  title: "My Enquiries",
};

interface BuyerEnquiriesPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    from?: string;
    to?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function BuyerEnquiriesPage({ searchParams }: BuyerEnquiriesPageProps) {
  const [ctx, sp] = await Promise.all([getBuyerContext(), searchParams]);
  const sort = sp.sort === "oldest" ? "oldest" : "newest";

  const result = await getBuyerEnquiries(ctx.user.id, {
    search: sp.search ?? "",
    status: sp.status ?? "all",
    dateFrom: sp.from ?? "",
    dateTo: sp.to ?? "",
    sort,
    page: Number(sp.page) || 1,
    pageSize: 10,
    rfqOnly: false,
  });

  return (
    <BuyerEnquiriesListView
      mode="enquiries"
      result={result}
      filters={{
        search: sp.search ?? "",
        status: sp.status ?? "all",
        dateFrom: sp.from ?? "",
        dateTo: sp.to ?? "",
        sort,
      }}
    />
  );
}

