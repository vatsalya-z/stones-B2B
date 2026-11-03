"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@stone/ui";
import type { CatalogUnit } from "@stone/validation";
import { saveQuotationAction } from "@/features/seller/actions";
import {
  computeQuotationTotals,
  UNIT_LABELS,
} from "@/features/seller/seller-meta";

export interface QuotableEnquiryOption {
  id: string;
  enquiry_title: string;
  quantity: number;
  unit: string;
  currency: string;
  status: string;
  buyerName: string;
  product: {
    id: string;
    name: string;
    price: number | null;
    unit: string;
  } | null;
}

export interface CatalogProductOption {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  price: number | null;
  price_type: string;
}

export interface InitialQuotationDraft {
  quotationId?: string | null;
  enquiryId: string;
  currency: string;
  discountAmount: number;
  taxAmount: number;
  shippingCharges: number;
  validUntilDateInput: string;
  terms: string;
  items: Array<{
    productId: string;
    description: string;
    quantity: string;
    unit: CatalogUnit;
    unitPrice: string;
  }>;
}

export interface QuotationBuilderProps {
  enquiries: QuotableEnquiryOption[];
  catalogProducts: CatalogProductOption[];
  initialData: InitialQuotationDraft;
  lockEnquiry?: boolean;
}

export function QuotationBuilder({
  enquiries,
  catalogProducts,
  initialData,
  lockEnquiry = false,
}: QuotationBuilderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [enquiryId, setEnquiryId] = useState(initialData.enquiryId);
  const [currency, setCurrency] = useState(initialData.currency || "INR");
  const [items, setItems] = useState(initialData.items);
  const [discountAmount, setDiscountAmount] = useState(
    String(initialData.discountAmount ?? 0),
  );
  const [taxAmount, setTaxAmount] = useState(String(initialData.taxAmount ?? 0));
  const [shippingCharges, setShippingCharges] = useState(
    String(initialData.shippingCharges ?? 0),
  );
  const [validUntil, setValidUntil] = useState(initialData.validUntilDateInput);
  const [terms, setTerms] = useState(initialData.terms);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleEnquiryChange = (nextEnquiryId: string) => {
    setEnquiryId(nextEnquiryId);
    const matched = enquiries.find((e) => e.id === nextEnquiryId);
    if (!matched) return;
    setCurrency(matched.currency || "INR");

    if (items.length === 1 && !items[0]?.description.trim()) {
      setItems([
        {
          productId: matched.product?.id ?? "",
          description: matched.product?.name ?? matched.enquiry_title,
          quantity: String(matched.quantity),
          unit: (matched.unit as CatalogUnit) || "sq_ft",
          unitPrice: matched.product?.price ? String(matched.product.price) : "0",
        },
      ]);
    }
  };

  const handleSelectCatalogProduct = (index: number, productId: string) => {
    const matched = catalogProducts.find((p) => p.id === productId);
    setItems((prev) =>
      prev.map((row, idx) => {
        if (idx !== index) return row;
        if (!matched) return { ...row, productId: "" };
        return {
          ...row,
          productId: matched.id,
          description: row.description.trim()
            ? row.description
            : `${matched.name}${matched.sku ? ` (${matched.sku})` : ""}`,
          unit: (matched.unit as CatalogUnit) || row.unit,
          unitPrice:
            matched.price !== null && (Number(row.unitPrice) === 0 || !row.unitPrice)
              ? String(matched.price)
              : row.unitPrice,
        };
      }),
    );
  };

  const updateItemField = (
    index: number,
    key: "description" | "quantity" | "unit" | "unitPrice",
    val: string,
  ) => {
    setItems((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, [key]: val } : row)),
    );
  };

  const addLineItem = () => {
    setItems((prev) => [
      ...prev,
      {
        productId: "",
        description: "",
        quantity: "1",
        unit: "sq_ft",
        unitPrice: "0",
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Shared deterministic server-aligned totals preview
  const calculation = useMemo(() => {
    try {
      const summary = computeQuotationTotals({
        items: items.map((i) => ({
          productId: i.productId || null,
          description: i.description || "Item",
          quantity: Math.max(0, Number(i.quantity) || 0),
          unit: i.unit,
          unitPrice: Math.max(0, Number(i.unitPrice) || 0),
        })),
        discountAmount: Math.max(0, Number(discountAmount) || 0),
        taxAmount: Math.max(0, Number(taxAmount) || 0),
        shippingCharges: Math.max(0, Number(shippingCharges) || 0),
      });
      return { summary, calcError: null };
    } catch (err) {
      return {
        summary: null,
        calcError: err instanceof Error ? err.message : "Check discount/amount values",
      };
    }
  }, [items, discountAmount, taxAmount, shippingCharges]);

  const applyGstPreset = (ratePct: number) => {
    if (!calculation.summary) return;
    const taxable = Math.max(
      0,
      calculation.summary.subtotal - calculation.summary.discountAmount,
    );
    const computedTax = Math.round(taxable * (ratePct / 100) * 100) / 100;
    setTaxAmount(computedTax.toFixed(2));
  };

  const handleSubmit = (sendImmediately: boolean) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (
      sendImmediately &&
      !window.confirm(
        "Send this formal quotation to the buyer now? Sent quotations become visible to the buyer immediately.",
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await saveQuotationAction({
        quotationId: initialData.quotationId ?? undefined,
        enquiryId,
        currency,
        discountAmount: Number(discountAmount) || 0,
        taxAmount: Number(taxAmount) || 0,
        shippingCharges: Number(shippingCharges) || 0,
        validUntil: validUntil || undefined,
        terms,
        sendImmediately,
        items: items.map((i) => ({
          productId: i.productId || undefined,
          description: i.description,
          quantity: Number(i.quantity),
          unit: i.unit,
          unitPrice: Number(i.unitPrice),
        })),
      });

      if (!res.success || !res.data) {
        setErrorMessage(res.error || "Failed to save quotation.");
        return;
      }

      if (initialData.quotationId) {
        setSuccessMessage(
          res.data.status === "sent"
            ? `Quotation ${res.data.quoteNumber} sent to buyer!`
            : `Draft quotation ${res.data.quoteNumber} saved.`,
        );
        router.refresh();
      } else {
        router.push(`/seller/quotes/${res.data.quotationId}?saved=1`);
        router.refresh();
      }
    });
  };

  const formatAmt = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          {successMessage}
        </div>
      )}

      {/* 1. Target Enquiry & Validity */}
      <Card>
        <CardHeader className="border-b border-stone-100 pb-4">
          <h2 className="text-base font-semibold text-stone-900">
            Enquiry Reference &amp; Validity
          </h2>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label htmlFor="qt-enquiry" className="label-base mb-1">
              Authorized Buyer Enquiry <span className="text-red-500">*</span>
            </label>
            <select
              id="qt-enquiry"
              disabled={lockEnquiry}
              value={enquiryId}
              onChange={(e) => handleEnquiryChange(e.target.value)}
              className="input-base"
              required
            >
              <option value="">Select an incoming enquiry to quote</option>
              {enquiries.map((enq) => (
                <option key={enq.id} value={enq.id}>
                  {enq.enquiry_title} — {enq.buyerName} ({enq.quantity}{" "}
                  {UNIT_LABELS[enq.unit as keyof typeof UNIT_LABELS] ?? enq.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="qt-currency" className="label-base mb-1">
                Currency
              </label>
              <select
                id="qt-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="input-base"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="AED">AED</option>
              </select>
            </div>

            <div>
              <label htmlFor="qt-valid" className="label-base mb-1">
                Valid Until
              </label>
              <input
                id="qt-valid"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="input-base"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 2. Quotation Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b border-stone-100 pb-4">
          <div>
            <h2 className="text-base font-semibold text-stone-900">Quotation Line Items</h2>
            <p className="text-xs text-stone-500">
              Link catalogue stone products or enter custom fabrication/slab items
            </p>
          </div>
          <button
            type="button"
            onClick={addLineItem}
            className="btn-secondary !px-3 !py-1.5 !text-xs"
          >
            + Add Line Item
          </button>
        </CardHeader>
        <CardBody className="space-y-4">
          {items.map((item, idx) => {
            const lineTotal = calculation.summary?.items[idx]?.totalPrice ?? 0;
            return (
              <div
                key={idx}
                className="space-y-3 rounded-xl border border-stone-200 bg-stone-50/70 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Item #{idx + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLineItem(idx)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Remove Item
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                  <div className="sm:col-span-4">
                    <label className="mb-1 block text-xs font-medium text-stone-600">
                      Catalogue Product (Optional)
                    </label>
                    <select
                      value={item.productId}
                      onChange={(e) => handleSelectCatalogProduct(idx, e.target.value)}
                      className="input-base !py-2 !text-xs"
                    >
                      <option value="">Custom / Unlinked Stone Item</option>
                      {catalogProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                          {p.sku ? ` (${p.sku})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-8">
                    <label className="mb-1 block text-xs font-medium text-stone-600">
                      Item Description &amp; Grade <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={item.description}
                      onChange={(e) => updateItemField(idx, "description", e.target.value)}
                      placeholder="e.g. Makrana White 20mm Mirror Polished Gangsaw Slabs — Commercial First Lot"
                      className="input-base !py-2 !text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-stone-600">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      required
                      value={item.quantity}
                      onChange={(e) => updateItemField(idx, "quantity", e.target.value)}
                      className="input-base !py-2 !text-xs"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-stone-600">
                      Unit
                    </label>
                    <select
                      value={item.unit}
                      onChange={(e) => updateItemField(idx, "unit", e.target.value)}
                      className="input-base !py-2 !text-xs"
                    >
                      {(Object.keys(UNIT_LABELS) as CatalogUnit[]).map((u) => (
                        <option key={u} value={u}>
                          {UNIT_LABELS[u]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-stone-600">
                      Unit Price ({currency}) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={item.unitPrice}
                      onChange={(e) => updateItemField(idx, "unitPrice", e.target.value)}
                      className="input-base !py-2 !text-xs"
                    />
                  </div>

                  <div>
                    <span className="mb-1 block text-xs font-medium text-stone-600">
                      Line Total
                    </span>
                    <div className="flex h-[36px] items-center rounded-lg border border-stone-200 bg-white px-3 text-xs font-bold text-stone-900">
                      {formatAmt(lineTotal)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>

      {/* 3. Terms, Adjustments & Totals Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader className="border-b border-stone-100 pb-4">
            <h2 className="text-base font-semibold text-stone-900">
              Commercial Terms &amp; Dispatch Conditions
            </h2>
          </CardHeader>
          <CardBody>
            <textarea
              rows={7}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Include payment terms (e.g. 50% advance, 50% before factory dispatch), loading charges, wooden crate packaging, natural stone variation disclaimer, and transit insurance…"
              className="input-base !text-xs"
            />
          </CardBody>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader className="border-b border-stone-100 pb-4">
            <h2 className="text-base font-semibold text-stone-900">
              Pricing Breakdown ({currency})
            </h2>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-stone-600">Subtotal</span>
              <span className="font-semibold text-stone-900">
                {formatAmt(calculation.summary?.subtotal ?? 0)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label htmlFor="qt-discount" className="text-xs font-medium text-stone-600">
                Trade Discount (–)
              </label>
              <input
                id="qt-discount"
                type="number"
                step="0.01"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className="input-base !w-36 !py-1.5 text-right !text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="qt-tax" className="text-xs font-medium text-stone-600">
                  GST / Tax (+)
                </label>
                <input
                  id="qt-tax"
                  type="number"
                  step="0.01"
                  min="0"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(e.target.value)}
                  className="input-base !w-36 !py-1.5 text-right !text-xs"
                />
              </div>
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => applyGstPreset(18)}
                  className="rounded border border-stone-200 px-2 py-0.5 text-[11px] text-stone-600 hover:bg-stone-100"
                >
                  Apply 18% GST
                </button>
                <button
                  type="button"
                  onClick={() => applyGstPreset(12)}
                  className="rounded border border-stone-200 px-2 py-0.5 text-[11px] text-stone-600 hover:bg-stone-100"
                >
                  12%
                </button>
                <button
                  type="button"
                  onClick={() => setTaxAmount("0")}
                  className="rounded border border-stone-200 px-2 py-0.5 text-[11px] text-stone-600 hover:bg-stone-100"
                >
                  0% (Export LUT)
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label htmlFor="qt-shipping" className="text-xs font-medium text-stone-600">
                Freight / Packaging (+)
              </label>
              <input
                id="qt-shipping"
                type="number"
                step="0.01"
                min="0"
                value={shippingCharges}
                onChange={(e) => setShippingCharges(e.target.value)}
                className="input-base !w-36 !py-1.5 text-right !text-xs"
              />
            </div>

            {calculation.calcError && (
              <p className="text-xs font-medium text-red-600">{calculation.calcError}</p>
            )}

            <div className="flex items-center justify-between border-t border-stone-200 pt-3">
              <span className="text-base font-bold text-stone-900">Grand Total</span>
              <span className="text-lg font-extrabold text-amber-700">
                {formatAmt(calculation.summary?.totalAmount ?? 0)}
              </span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <Link href="/seller/quotes" className="btn-ghost !justify-start">
          ← Back to Quotations
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={isPending || !enquiryId || Boolean(calculation.calcError)}
            onClick={() => handleSubmit(false)}
            className="btn-secondary flex-1 sm:flex-initial"
          >
            {isPending ? "Saving…" : "Save as Draft"}
          </button>

          <button
            type="button"
            disabled={isPending || !enquiryId || Boolean(calculation.calcError)}
            onClick={() => handleSubmit(true)}
            className="btn-primary flex-1 sm:flex-initial"
          >
            {isPending ? "Sending…" : "Save & Send to Buyer"}
          </button>
        </div>
      </div>
    </div>
  );
}

