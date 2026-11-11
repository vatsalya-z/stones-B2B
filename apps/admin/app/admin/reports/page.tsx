import { getAdminContext } from "@/features/admin/guard";
import { getAdminAnalytics } from "@/features/admin/queries";
import {
  SvgLineAreaChart,
  SvgBarChart,
  SvgDonutChart,
} from "@/components/admin/simple-charts";

export const dynamic = "force-dynamic";

interface ReportsPageProps {
  searchParams: Promise<{
    days?: string;
  }>;
}

export default async function AdminReportsPage({ searchParams }: ReportsPageProps) {
  const ctx = await getAdminContext();
  const params = await searchParams;
  const days = Number(params.days) || 30;

  const data = await getAdminAnalytics(days, ctx);

  // Format point dates for charts
  const formatPoints = (points: { bucket_date: string; bucket_total: number }[]) =>
    points.map((p) => ({
      label: new Date(p.bucket_date).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
      }),
      value: Number(p.bucket_total),
    }));

  const userChartData = formatPoints(data.userSeries);
  const sellerChartData = formatPoints(data.sellerSeries);
  const productChartData = formatPoints(data.productSeries);
  const enquiryChartData = formatPoints(data.enquirySeries);

  const categoryBarData = data.categoryPerf.map((c) => ({
    label: c.category_name,
    value: Number(c.total_products),
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Platform Analytics & Reports</h1>
          <p className="mt-1 text-xs text-stone-400">
            Real-time PostgreSQL aggregated metrics, time series trends, and category performance.
          </p>
        </div>

        {/* Days Range Selector */}
        <div className="flex items-center gap-1.5 rounded-lg border border-stone-800 bg-stone-900 p-1 text-xs">
          {[7, 14, 30, 90].map((d) => (
            <a
              key={d}
              href={`/admin/reports?days=${d}`}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                days === d
                  ? "bg-amber-600 text-black font-semibold"
                  : "text-stone-400 hover:text-white"
              }`}
            >
              {d} Days
            </a>
          ))}
        </div>
      </div>

      {/* Time Series Trends Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SvgLineAreaChart
          title="User Registration Trend"
          subtitle={`Daily user accounts created in the last ${days} days`}
          data={userChartData}
          accent="blue"
        />

        <SvgLineAreaChart
          title="Supplier Onboarding Trend"
          subtitle={`New natural stone suppliers registered in the last ${days} days`}
          data={sellerChartData}
          accent="amber"
        />

        <SvgLineAreaChart
          title="Catalogue Product Additions"
          subtitle={`New stone products uploaded for review over ${days} days`}
          data={productChartData}
          accent="emerald"
        />

        <SvgLineAreaChart
          title="Buyer Enquiries & RFQs Volume"
          subtitle={`Commercial stone requirements submitted in the last ${days} days`}
          data={enquiryChartData}
          accent="purple"
        />
      </div>

      {/* Status Distributions Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <SvgDonutChart
          title="Supplier Verification States"
          subtitle="All onboarded suppliers"
          data={data.sellerDist.map((d) => ({ label: d.label, total: Number(d.total) }))}
          totalLabel="Suppliers"
        />

        <SvgDonutChart
          title="Product Moderation States"
          subtitle="All catalogue items"
          data={data.productDist.map((d) => ({ label: d.label, total: Number(d.total) }))}
          totalLabel="Products"
        />

        <SvgDonutChart
          title="Enquiry Lifecycle Distribution"
          subtitle="All RFQs & direct enquiries"
          data={data.enquiryDist.map((d) => ({ label: d.label, total: Number(d.total) }))}
          totalLabel="Enquiries"
        />
      </div>

      {/* Category Performance Bar Chart */}
      <div>
        <SvgBarChart
          title="Stone Catalogue Distribution by Category"
          subtitle="Total product listings mapped per natural stone category"
          data={categoryBarData}
          barColor="fill-amber-500"
        />
      </div>
    </div>
  );
}

