import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Breadcrumb, Card, CardBody, CardHeader, EmptyState, SectionHeading, VerifiedBadge } from "@stone/ui";
import {
  formatShortDate,
  QuotationStatusBadge,
} from "@/components/seller/status-badges";
import {
  formatMoneyAmount,
  formatUnitLabel,
} from "@/features/buyer/buyer-meta";
import {
  getBuyerContext,
  getBuyerQuotationsForComparison,
} from "@/features/buyer/queries";

export const metadata: Metadata = {
  title: "Compare Quotations",
};

interface CompareQuotesPageProps {
  searchParams: Promise<{
    enquiry?: string;
    ids?: string | string[];
  }>;
}

export default async function BuyerCompareQuotationsPage({
  searchParams,
}: CompareQuotesPageProps) {
  const [ctx, sp] = await Promise.all([getBuyerContext(), searchParams]);
  const rawIds = Array.isArray(sp.ids)
    ? sp.ids
    : sp.ids
      ? sp.ids.split(",").map((s) => s.trim())
      : [];

  const view = await getBuyerQuotationsForComparison(ctx.user.id, {
    enquiryId: sp.enquiry,
    ids: rawIds,
  });

  const { allQuotations, compared, analysis } = view;
  const selectedIdSet = new Set(compared.map((c) => c.id));

  // Group available quotations by enquiry so the buyer can pick same-enquiry sets easily
  const enquiryGroups = Array.from(
    allQuotations.reduce((acc, q) => {
      const existing = acc.get(q.enquiryId) ?? {
        enquiryId: q.enquiryId,
        enquiryTitle: q.enquiryTitle,
        enquiryReference: q.enquiryReference,
        count: 0,
      };
      existing.count += 1;
      acc.set(q.enquiryId, existing);
      return acc;
    }, new Map<string, { enquiryId: string; enquiryTitle: string; enquiryReference: string; count: number }>()),
  ).map(([, g]) => g);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/buyer/dashboard" },
          { label: "Quotations", href: "/buyer/quotes" },
          { label: "Compare Quotations" },
        ]}
      />

      <SectionHeading
        title="Quotation Comparison Matrix"
        subtitle="Compare commercial breakdowns, unit rates, validity, and delivery/payment terms across supplier offers. Price alone does not determine supplier suitability — always evaluate stone grade, tolerances, and verification status."
      />

      {allQuotations.length === 0 ? (
        <Card>
          <CardBody className="p-10">
            <EmptyState
              title="No quotations available to compare"
              description="Once you receive two or more formal quotations on your enquiries, you can evaluate them side by side here."
              action={
                <Link
                  href="/buyer/rfqs/new"
                  className="inline-flex rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700"
                >
                  Create New RFQ
                </Link>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Selection & Enquiry Filter Card */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-stone-900">
                  Select Quotations to Compare (2 to 5 offers)
                </h2>
                <p className="text-xs text-stone-500">
                  Filter by enquiry or pick individual quotations below.
                </p>
              </div>

              {enquiryGroups.filter((g) => g.count >= 2).length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {enquiryGroups
                    .filter((g) => g.count >= 2)
                    .slice(0, 4)
                    .map((g) => (
                      <Link
                        key={g.enquiryId}
                        href={`/buyer/quotes/compare?enquiry=${g.enquiryId}`}
                        className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                      >
                        {g.enquiryReference} ({g.count} quotes)
                      </Link>
                    ))}
                </div>
              )}
            </CardHeader>

            <CardBody>
              <form method="GET" action="/buyer/quotes/compare" className="space-y-3">
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {allQuotations.slice(0, 12).map((q) => (
                    <label
                      key={q.id}
                      className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs cursor-pointer transition-colors ${
                        selectedIdSet.has(q.id)
                          ? "border-amber-400 bg-amber-50/50"
                          : "border-stone-200 bg-white hover:bg-stone-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="ids"
                        value={q.id}
                        defaultChecked={selectedIdSet.has(q.id)}
                        className="mt-0.5 h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-600"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="font-bold text-stone-900 block">
                          {q.quoteNumber} • {formatMoneyAmount(q.totalAmount, q.currency)}
                        </span>
                        <span className="text-stone-600 truncate block">{q.sellerName}</span>
                        <span className="text-[11px] text-stone-400 truncate block">
                          {q.enquiryReference}: {q.enquiryTitle}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="submit"
                    className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800"
                  >
                    Compare Selected Quotations
                  </button>
                </div>
              </form>
            </CardBody>
          </Card>

          {/* Compatibility & Difference Summary Notices */}
          {analysis.incompatibilityReasons.length > 0 && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Comparison Compatibility Notice
              </p>
              <ul className="list-disc pl-4 space-y-1 text-xs text-amber-900">
                {analysis.incompatibilityReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {analysis.isDirectlyComparable &&
            analysis.priceSpread !== null &&
            analysis.currencies[0] && (
              <div className="rounded-2xl border border-stone-200 bg-white px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-stone-900">
                    Comparable Scope Verified ({analysis.currencies[0]} • Matching Quantity &amp; Unit)
                  </p>
                  <p className="text-xs text-stone-500">
                    Lowest eligible total is highlighted for financial reference only. Review stone finish, packing, lead times, and supplier verification before deciding.
                  </p>
                </div>
                <Badge variant="secondary">
                  Total Spread: {formatMoneyAmount(analysis.priceSpread, analysis.currencies[0])}
                </Badge>
              </div>
            )}

          {compared.length >= 2 ? (
            <>
              {/* Desktop Side-by-Side Comparison Matrix (lg+) */}
              <Card className="hidden lg:block overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-stone-200 bg-stone-50">
                        <th className="w-48 px-5 py-4 font-bold uppercase tracking-wider text-stone-500">
                          Comparison Field
                        </th>
                        {compared.map((q) => {
                          const delta = analysis.deltasById[q.id];
                          return (
                            <th
                              key={q.id}
                              className={`min-w-[220px] px-5 py-4 align-top border-l border-stone-200 ${
                                delta?.isLowestEligible ? "bg-green-50/60" : ""
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <Link
                                  href={`/buyer/quotes/${q.id}`}
                                  className="text-sm font-extrabold text-stone-900 hover:text-amber-700"
                                >
                                  {q.quoteNumber}
                                </Link>
                                <QuotationStatusBadge status={q.status} />
                              </div>
                              <p className="mt-1 text-[11px] font-normal text-stone-500">
                                {q.enquiryReference}: {q.enquiryTitle}
                              </p>
                              {delta?.isLowestEligible && (
                                <div className="mt-2">
                                  <Badge variant="success">Lowest Comparable Total</Badge>
                                </div>
                              )}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-stone-200 bg-white">
                      <tr>
                        <td className="px-5 py-3.5 font-semibold text-stone-600 bg-stone-50/40">
                          1. Supplier
                        </td>
                        {compared.map((q) => (
                          <td key={q.id} className="px-5 py-3.5 border-l border-stone-200">
                            {q.sellerSlug ? (
                              <Link
                                href={`/suppliers/${q.sellerSlug}`}
                                className="font-bold text-stone-900 hover:text-amber-700"
                              >
                                {q.sellerName}
                              </Link>
                            ) : (
                              <span className="font-bold text-stone-900">{q.sellerName}</span>
                            )}
                            <p className="text-[11px] text-stone-500 mt-0.5">{q.sellerLocation}</p>
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="px-5 py-3.5 font-semibold text-stone-600 bg-stone-50/40">
                          2. Verification Status
                        </td>
                        {compared.map((q) => (
                          <td key={q.id} className="px-5 py-3.5 border-l border-stone-200">
                            {q.sellerVerificationStatus === "verified" ? (
                              <VerifiedBadge label="Verified Supplier" />
                            ) : (
                              <Badge variant="secondary">Registered</Badge>
                            )}
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="px-5 py-3.5 font-semibold text-stone-600 bg-stone-50/40">
                          3. Quotation Total
                        </td>
                        {compared.map((q) => {
                          const delta = analysis.deltasById[q.id];
                          return (
                            <td
                              key={q.id}
                              className={`px-5 py-3.5 border-l border-stone-200 ${
                                delta?.isLowestEligible ? "bg-green-50/50" : ""
                              }`}
                            >
                              <p className="text-base font-extrabold text-stone-900">
                                {formatMoneyAmount(q.totalAmount, q.currency)}
                              </p>
                              {delta &&
                                delta.deltaAmount !== null &&
                                delta.deltaAmount > 0 && (
                                  <p className="mt-0.5 text-[11px] font-medium text-amber-700">
                                    +{formatMoneyAmount(delta.deltaAmount, q.currency)} (+
                                    {delta.deltaPercent}%)
                                  </p>
                                )}
                            </td>
                          );
                        })}
                      </tr>

                      <tr>
                        <td className="px-5 py-3.5 font-semibold text-stone-600 bg-stone-50/40">
                          4. Currency
                        </td>
                        {compared.map((q) => (
                          <td key={q.id} className="px-5 py-3.5 border-l border-stone-200 font-bold text-stone-900">
                            {q.currency}
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="px-5 py-3.5 font-semibold text-stone-600 bg-stone-50/40">
                          5. Subtotal
                        </td>
                        {compared.map((q) => (
                          <td key={q.id} className="px-5 py-3.5 border-l border-stone-200 text-stone-800">
                            {formatMoneyAmount(q.subtotal, q.currency)}
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="px-5 py-3.5 font-semibold text-stone-600 bg-stone-50/40">
                          6. Tax / GST
                        </td>
                        {compared.map((q) => (
                          <td key={q.id} className="px-5 py-3.5 border-l border-stone-200 text-stone-800">
                            {formatMoneyAmount(q.taxAmount, q.currency)}
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="px-5 py-3.5 font-semibold text-stone-600 bg-stone-50/40">
                          7. Shipping / Freight
                        </td>
                        {compared.map((q) => (
                          <td key={q.id} className="px-5 py-3.5 border-l border-stone-200 text-stone-800">
                            {formatMoneyAmount(q.shippingCharges, q.currency)}
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="px-5 py-3.5 font-semibold text-stone-600 bg-stone-50/40">
                          8. Discount
                        </td>
                        {compared.map((q) => (
                          <td key={q.id} className="px-5 py-3.5 border-l border-stone-200 text-green-700 font-semibold">
                            {q.discountAmount > 0
                              ? `- ${formatMoneyAmount(q.discountAmount, q.currency)}`
                              : "—"}
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="px-5 py-3.5 font-semibold text-stone-600 bg-stone-50/40">
                          9. Quantity
                        </td>
                        {compared.map((q) => (
                          <td key={q.id} className="px-5 py-3.5 border-l border-stone-200 font-semibold text-stone-900">
                            {q.totalQuantity.toLocaleString("en-IN")}{" "}
                            {q.hasMixedUnits ? "(Mixed units)" : formatUnitLabel(q.primaryUnit)}
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="px-5 py-3.5 font-semibold text-stone-600 bg-stone-50/40">
                          10. Effective Unit Price
                        </td>
                        {compared.map((q) => (
                          <td key={q.id} className="px-5 py-3.5 border-l border-stone-200 text-stone-800">
                            {q.effectiveUnitPrice !== null
                              ? `${formatMoneyAmount(q.effectiveUnitPrice, q.currency)} / ${formatUnitLabel(q.primaryUnit)}`
                              : "See line items"}
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="px-5 py-3.5 font-semibold text-stone-600 bg-stone-50/40">
                          11. Delivery Terms
                        </td>
                        {compared.map((q) => (
                          <td key={q.id} className="px-5 py-3.5 border-l border-stone-200 text-stone-700">
                            {q.commercialTerms.deliveryTerms || "As per quotation terms"}
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="px-5 py-3.5 font-semibold text-stone-600 bg-stone-50/40">
                          12. Payment Terms
                        </td>
                        {compared.map((q) => (
                          <td key={q.id} className="px-5 py-3.5 border-l border-stone-200 text-stone-700">
                            {q.commercialTerms.paymentTerms || "As per quotation terms"}
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="px-5 py-3.5 font-semibold text-stone-600 bg-stone-50/40">
                          13. Validity
                        </td>
                        {compared.map((q) => {
                          const delta = analysis.deltasById[q.id];
                          return (
                            <td key={q.id} className="px-5 py-3.5 border-l border-stone-200">
                              <span className={delta?.isExpired ? "text-red-600 font-semibold" : "text-stone-800"}>
                                {q.validUntil ? formatShortDate(q.validUntil) : "Open"}
                              </span>
                            </td>
                          );
                        })}
                      </tr>

                      <tr>
                        <td className="px-5 py-3.5 font-semibold text-stone-600 bg-stone-50/40">
                          14. Product Specifications
                        </td>
                        {compared.map((q) => (
                          <td key={q.id} className="px-5 py-3.5 border-l border-stone-200 text-stone-700 leading-relaxed">
                            {q.productSpecsSummary}
                          </td>
                        ))}
                      </tr>

                      <tr className="bg-stone-50/70">
                        <td className="px-5 py-4 font-semibold text-stone-600">Action</td>
                        {compared.map((q) => (
                          <td key={q.id} className="px-5 py-4 border-l border-stone-200">
                            <Link
                              href={`/buyer/quotes/${q.id}`}
                              className="inline-flex w-full items-center justify-center rounded-xl bg-stone-900 px-3.5 py-2 font-semibold text-white hover:bg-stone-800"
                            >
                              Open Quotation Details →
                            </Link>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Mobile Stacked Comparison Cards (< lg) */}
              <div className="grid grid-cols-1 gap-4 lg:hidden">
                {compared.map((q) => {
                  const delta = analysis.deltasById[q.id];
                  return (
                    <Card
                      key={q.id}
                      className={delta?.isLowestEligible ? "ring-2 ring-green-500/40" : undefined}
                    >
                      <CardBody className="p-4 space-y-3 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Link
                              href={`/buyer/quotes/${q.id}`}
                              className="text-base font-extrabold text-stone-900 hover:text-amber-700"
                            >
                              {q.quoteNumber}
                            </Link>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <span className="font-semibold text-stone-700">{q.sellerName}</span>
                              {q.sellerVerificationStatus === "verified" && <VerifiedBadge />}
                            </div>
                          </div>
                          <QuotationStatusBadge status={q.status} />
                        </div>

                        {delta?.isLowestEligible && (
                          <Badge variant="success">Lowest Comparable Total</Badge>
                        )}

                        <div className="rounded-xl bg-stone-50 p-3 space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-stone-500">Total ({q.currency})</span>
                            <span className="text-sm font-extrabold text-stone-900">
                              {formatMoneyAmount(q.totalAmount, q.currency)}
                            </span>
                          </div>
                          {delta && delta.deltaAmount !== null && delta.deltaAmount > 0 && (
                            <div className="flex justify-between text-amber-700 font-medium">
                              <span>Difference vs Lowest</span>
                              <span>
                                +{formatMoneyAmount(delta.deltaAmount, q.currency)} (+
                                {delta.deltaPercent}%)
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-stone-500">Subtotal / Tax / Shipping</span>
                            <span className="text-stone-800">
                              {formatMoneyAmount(q.subtotal, q.currency)} /{" "}
                              {formatMoneyAmount(q.taxAmount, q.currency)} /{" "}
                              {formatMoneyAmount(q.shippingCharges, q.currency)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-stone-500">Discount</span>
                            <span className="text-green-700">
                              {formatMoneyAmount(q.discountAmount, q.currency)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-stone-500">Quantity &amp; Unit Rate</span>
                            <span className="text-stone-800 font-semibold">
                              {q.totalQuantity} {formatUnitLabel(q.primaryUnit)}
                              {q.effectiveUnitPrice !== null
                                ? ` @ ${formatMoneyAmount(q.effectiveUnitPrice, q.currency)}`
                                : ""}
                            </span>
                          </div>
                        </div>

                        <dl className="grid grid-cols-2 gap-2">
                          <div>
                            <dt className="text-stone-400">Payment Terms</dt>
                            <dd className="font-medium text-stone-800">
                              {q.commercialTerms.paymentTerms || "See quote"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-stone-400">Delivery Terms</dt>
                            <dd className="font-medium text-stone-800">
                              {q.commercialTerms.deliveryTerms || "See quote"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-stone-400">Validity</dt>
                            <dd className="font-medium text-stone-800">
                              {q.validUntil ? formatShortDate(q.validUntil) : "Open"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-stone-400">Specifications</dt>
                            <dd className="font-medium text-stone-800 truncate">
                              {q.productSpecsSummary}
                            </dd>
                          </div>
                        </dl>

                        <Link
                          href={`/buyer/quotes/${q.id}`}
                          className="inline-flex w-full items-center justify-center rounded-xl bg-stone-900 px-3.5 py-2 font-semibold text-white hover:bg-stone-800"
                        >
                          Open Quotation Details →
                        </Link>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

