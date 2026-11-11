import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb, Card, CardBody, VerifiedBadge } from "@stone/ui";
import {
  formatDateTime,
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/seller/status-badges";
import { formatMoneyAmount, formatUnitLabel } from "@/features/buyer/buyer-meta";
import { getSellerOrderDetail } from "@/features/seller/queries";
import { PrintButton } from "@/components/ui/print-button";
import { SellerOrderActions } from "./seller-order-actions";

export const metadata: Metadata = {
  title: "Fulfillment Order Details",
};

interface AddressSnapshot {
  contact_name?: string | null;
  company_name?: string | null;
  phone?: string | null;
  gstin?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
}

interface SellerOrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SellerOrderDetailPage({ params }: SellerOrderDetailPageProps) {
  const { id } = await params;
  const order = await getSellerOrderDetail(id);

  if (!order) {
    notFound();
  }

  const totalFormatted = formatMoneyAmount(order.totalAmount, order.currency);
  const subtotalFormatted = formatMoneyAmount(order.subtotal, order.currency);
  const taxFormatted = formatMoneyAmount(order.taxAmount, order.currency);
  const shippingFormatted = formatMoneyAmount(order.shippingCharges, order.currency);
  const discountFormatted = formatMoneyAmount(order.discountAmount, order.currency);

  const billing = (order.billingAddress as AddressSnapshot | null) ?? {};
  const shipping = (order.shippingAddress as AddressSnapshot | null) ?? {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/seller/dashboard" },
            { label: "Orders", href: "/seller/orders" },
            { label: order.orderNumber },
          ]}
        />
        <div className="flex items-center gap-3">
          <Link
            href="/seller/orders"
            className="text-xs font-semibold text-stone-600 hover:text-stone-900"
          >
            ← Back to Orders
          </Link>
          <PrintButton label="Print Pro-Forma Invoice" />
        </div>
      </div>

      {/* Header Card */}
      <Card className="overflow-hidden">
        <div className="bg-stone-900 px-6 py-6 text-white sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                Supplier Order Fulfillment Sheet
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono">
                {order.orderNumber}
              </h1>
              <p className="text-xs text-stone-300">
                Received: {formatDateTime(order.createdAt)} • Buyer:{" "}
                <strong className="text-white">{order.buyerFullName}</strong>
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-2">
              <div className="flex items-center gap-2">
                <OrderStatusBadge status={order.status} />
                <PaymentStatusBadge status={order.paymentStatus} />
              </div>
              <p className="text-xs text-stone-400">
                Origin Quotation:{" "}
                <Link
                  href={`/seller/quotes/${order.quotationId}`}
                  className="text-amber-400 hover:underline font-mono"
                >
                  {order.quotationNumber || "View Quotation"}
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Model B Supplier Instructions */}
        <div className="border-b border-amber-200 bg-amber-50/80 px-6 py-4 sm:px-8 text-xs text-amber-950">
          <p className="font-bold text-amber-900">Payment Model B Architecture Notice</p>
          <p className="text-stone-700 leading-relaxed text-[11px] mt-0.5">
            Platform payment integration is pending. No payment should be made using unverified platform
            payment instructions. Payment confirmation will become available after the authorized payment
            provider integration is activated. Commercial settlement will be processed through StoneB2B Payment
            Model B after the authorized Payment Aggregator integration is activated. You may click
            <strong>Confirm Order</strong> below to commit production, stone cutting, and logistical planning.
          </p>
        </div>

        <CardBody className="p-6 sm:p-8 space-y-8">
          {/* Supplier Status Action Controls */}
          <SellerOrderActions
            orderId={order.id}
            orderNumber={order.orderNumber}
            status={order.status}
            buyerName={order.buyerFullName}
          />

          {/* Participant Snapshots */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-stone-200 pb-6">
            {/* Buyer Details */}
            <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50/60 p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                Purchasing Buyer Snapshot
              </span>
              <h3 className="font-bold text-stone-900 text-sm">
                {order.buyerSnapshot.fullName || order.buyerFullName}
              </h3>
              <div className="text-xs text-stone-600 space-y-1">
                {order.buyerSnapshot.email && (
                  <p>
                    <span className="font-semibold text-stone-700">Email:</span>{" "}
                    {order.buyerSnapshot.email}
                  </p>
                )}
                {order.buyerSnapshot.phone && (
                  <p>
                    <span className="font-semibold text-stone-700">Phone:</span>{" "}
                    {order.buyerSnapshot.phone}
                  </p>
                )}
                <p>
                  <span className="font-semibold text-stone-700">Delivery Destination:</span>{" "}
                  {order.deliveryLocation}
                </p>
              </div>
            </div>

            {/* Supplier Details */}
            <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50/60 p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                Seller Business Entity
              </span>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-stone-900 text-sm">
                  {order.sellerSnapshot.businessName}
                </h3>
                <VerifiedBadge label="Verified" />
              </div>
              <div className="text-xs text-stone-600 space-y-1">
                {order.sellerSnapshot.gstNumber && (
                  <p>
                    <span className="font-semibold text-stone-700">GSTIN:</span>{" "}
                    <span className="font-mono">{order.sellerSnapshot.gstNumber}</span>
                  </p>
                )}
                {order.sellerSnapshot.businessEmail && (
                  <p>
                    <span className="font-semibold text-stone-700">Email:</span>{" "}
                    {order.sellerSnapshot.businessEmail}
                  </p>
                )}
                {order.sellerSnapshot.phone && (
                  <p>
                    <span className="font-semibold text-stone-700">Phone:</span>{" "}
                    {order.sellerSnapshot.phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <h3 className="font-bold text-stone-900 text-base">Consignment Scope &amp; Line Items</h3>
            <div className="overflow-x-auto rounded-xl border border-stone-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-stone-100 text-stone-700 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3 border-b border-stone-200">#</th>
                    <th className="p-3 border-b border-stone-200">Description</th>
                    <th className="p-3 border-b border-stone-200 text-right">Quantity</th>
                    <th className="p-3 border-b border-stone-200 text-right">Unit Price</th>
                    <th className="p-3 border-b border-stone-200 text-right">Total Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {order.items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-stone-50/50">
                      <td className="p-3 text-stone-400 font-mono">{idx + 1}</td>
                      <td className="p-3">
                        <span className="font-semibold text-stone-900 block">
                          {item.description}
                        </span>
                        {item.specifications && Object.keys(item.specifications).length > 0 && (
                          <span className="text-[11px] text-stone-500">
                            Specs: {JSON.stringify(item.specifications)}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right text-stone-800 font-medium">
                        {item.quantity} {formatUnitLabel(item.unit)}
                      </td>
                      <td className="p-3 text-right text-stone-800 font-mono">
                        {formatMoneyAmount(item.unitPrice, order.currency)}
                      </td>
                      <td className="p-3 text-right font-bold text-stone-900 font-mono">
                        {formatMoneyAmount(item.totalPrice, order.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="flex flex-col sm:flex-row justify-end">
            <div className="w-full sm:w-80 space-y-2 rounded-xl border border-stone-200 bg-stone-50/70 p-4 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal</span>
                <span className="font-mono">{subtotalFormatted}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount</span>
                  <span className="font-mono">-{discountFormatted}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-600">
                <span>Taxes &amp; GST</span>
                <span className="font-mono">{taxFormatted}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Shipping &amp; Logistics</span>
                <span className="font-mono">{shippingFormatted}</span>
              </div>
              <div className="border-t border-stone-300 pt-2 flex justify-between font-extrabold text-sm text-stone-900">
                <span>Grand Total</span>
                <span className="font-mono text-amber-900">{totalFormatted}</span>
              </div>
            </div>
          </div>

          {/* Address Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-stone-200 pt-6">
            <div className="rounded-xl border border-stone-200 p-4 space-y-1.5 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                Buyer Invoicing Address
              </span>
              <p className="font-bold text-stone-900">{billing.contact_name || "—"}</p>
              {billing.company_name && <p className="text-stone-700">{billing.company_name}</p>}
              {billing.gstin && (
                <p className="text-stone-600">
                  GSTIN: <span className="font-mono">{billing.gstin}</span>
                </p>
              )}
              <p className="text-stone-600">
                {[billing.address_line1, billing.address_line2, billing.city, billing.state, billing.pincode, billing.country]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {billing.phone && <p className="text-stone-600">Phone: {billing.phone}</p>}
            </div>

            <div className="rounded-xl border border-stone-200 p-4 space-y-1.5 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                Destination Freight Address
              </span>
              <p className="font-bold text-stone-900">{shipping.contact_name || "—"}</p>
              <p className="text-stone-600">
                {[shipping.address_line1, shipping.address_line2, shipping.city, shipping.state, shipping.pincode, shipping.country]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {shipping.phone && <p className="text-stone-600">Phone: {shipping.phone}</p>}
              {order.notes && (
                <div className="mt-2 rounded-lg bg-amber-50 p-2 text-stone-700">
                  <span className="font-bold text-amber-900 block">Buyer Site Instructions:</span>
                  {order.notes}
                </div>
              )}
            </div>
          </div>

          {/* Audit History Timeline */}
          {order.history.length > 0 && (
            <div className="space-y-3 border-t border-stone-200 pt-6">
              <h3 className="font-bold text-stone-900 text-sm">Fulfillment Audit Timeline</h3>
              <div className="space-y-3">
                {order.history.map((hist, idx) => (
                  <div
                    key={hist.id}
                    className="flex items-start gap-3 rounded-lg border border-stone-200 bg-stone-50/50 p-3 text-xs"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-900 text-[11px] font-bold text-white">
                      {idx + 1}
                    </div>
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center gap-2">
                        <OrderStatusBadge status={hist.newStatus} />
                        <span className="text-[11px] text-stone-400">
                          {formatDateTime(hist.createdAt)}
                        </span>
                      </div>
                      {hist.notes && (
                        <p className="text-stone-700 italic text-[11px] mt-1">&quot;{hist.notes}&quot;</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
