"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AddressType } from "@stone/types";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState } from "@stone/ui";
import {
  deleteBuyerAddressAction,
  saveBuyerAddressAction,
  setDefaultBuyerAddressAction,
  updateBuyerAddressAction,
} from "@/features/buyer/actions";

export interface BuyerSavedAddressRecord {
  id: string;
  buyer_id: string;
  address_type: "billing" | "shipping" | "project_site" | "both" | string;
  contact_name: string;
  phone: string;
  company_name: string | null;
  gstin: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface BuyerAddressManagerProps {
  initialAddresses: BuyerSavedAddressRecord[];
}

const ADDRESS_TYPE_LABELS: Record<string, string> = {
  billing: "Billing Address",
  shipping: "Delivery / Shipping",
  project_site: "Project Site",
  both: "Billing & Shipping",
};

interface FormState {
  id?: string;
  addressType: AddressType;
  contactName: string;
  phone: string;
  companyName: string;
  gstin: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
}

const DEFAULT_FORM: FormState = {
  addressType: "both",
  contactName: "",
  phone: "",
  companyName: "",
  gstin: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pincode: "",
  country: "IN",
  isDefault: false,
};

export function BuyerAddressManager({ initialAddresses }: BuyerAddressManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openAddModal = () => {
    setIsEditing(false);
    setFormData({
      ...DEFAULT_FORM,
      isDefault: initialAddresses.length === 0, // auto default if first
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (addr: BuyerSavedAddressRecord) => {
    setIsEditing(true);
    setFormData({
      id: addr.id,
      addressType: (addr.address_type as AddressType) || "both",
      contactName: addr.contact_name,
      phone: addr.phone,
      companyName: addr.company_name ?? "",
      gstin: addr.gstin ?? "",
      addressLine1: addr.address_line1,
      addressLine2: addr.address_line2 ?? "",
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      country: addr.country ?? "IN",
      isDefault: addr.is_default,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormError(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFeedback(null);

    // Client-side quick validations
    if (formData.contactName.trim().length < 2) {
      setFormError("Contact name must be at least 2 characters.");
      return;
    }
    const phoneDigits = formData.phone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      setFormError("Phone number must contain between 10 and 15 digits.");
      return;
    }
    if (formData.country === "IN" && !/^[1-9][0-9]{5}$/.test(formData.pincode.trim())) {
      setFormError("Indian delivery PIN code must be exactly 6 digits starting with 1-9.");
      return;
    }
    if (formData.gstin.trim() && formData.country === "IN") {
      const gstinVal = formData.gstin.trim().toUpperCase();
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstinVal)) {
        setFormError("Invalid GSTIN format. Expected 15-character format (e.g. 27ABCDE1234F1Z5).");
        return;
      }
    }
    if (formData.addressLine1.trim().length < 5) {
      setFormError("Address line 1 must be at least 5 characters.");
      return;
    }
    if (!formData.city.trim() || !formData.state.trim()) {
      setFormError("City and State are required.");
      return;
    }

    startTransition(async () => {
      const payload = {
        addressType: formData.addressType,
        contactName: formData.contactName.trim(),
        phone: formData.phone.trim(),
        companyName: formData.companyName.trim() || undefined,
        gstin: formData.gstin.trim().toUpperCase() || undefined,
        addressLine1: formData.addressLine1.trim(),
        addressLine2: formData.addressLine2.trim() || undefined,
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        country: formData.country.trim().toUpperCase(),
        isDefault: formData.isDefault,
      };

      if (isEditing && formData.id) {
        const res = await updateBuyerAddressAction(formData.id, payload);
        if (!res.success) {
          setFormError(res.error || "Failed to update address.");
          return;
        }
        setFeedback({ type: "success", message: "Delivery address updated successfully." });
      } else {
        const res = await saveBuyerAddressAction(payload);
        if (!res.success) {
          setFormError(res.error || "Failed to save address.");
          return;
        }
        setFeedback({ type: "success", message: "New delivery address added successfully." });
      }

      setModalOpen(false);
      router.refresh();
    });
  };

  const handleSetDefault = (addressId: string) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await setDefaultBuyerAddressAction(addressId);
      if (!res.success) {
        setFeedback({ type: "error", message: res.error || "Failed to set default address." });
        return;
      }
      setFeedback({ type: "success", message: "Default procurement address updated." });
      router.refresh();
    });
  };

  const handleDelete = (addressId: string) => {
    if (!confirm("Are you sure you want to remove this saved address?")) {
      return;
    }
    setFeedback(null);
    setDeletingId(addressId);
    startTransition(async () => {
      const res = await deleteBuyerAddressAction(addressId);
      setDeletingId(null);
      if (!res.success) {
        setFeedback({ type: "error", message: res.error || "Failed to delete address." });
        return;
      }
      setFeedback({ type: "success", message: "Address removed from your profile." });
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-stone-500 font-medium">
            Saved delivery sites, head office billing records, and construction warehouse addresses.
          </p>
        </div>
        <Button
          onClick={openAddModal}
          variant="primary"
          className="self-start sm:self-auto inline-flex items-center gap-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add New Address
        </Button>
      </div>

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-semibold ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
          role="status"
        >
          {feedback.message}
        </div>
      )}

      {/* Address Cards Grid */}
      {initialAddresses.length === 0 ? (
        <Card>
          <CardBody className="py-12">
            <EmptyState
              title="No saved addresses found"
              description="Add your factory, project site, or registered billing address to expedite RFQs and quotation orders."
              action={
                <Button onClick={openAddModal} variant="primary">
                  + Add Your First Address
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {initialAddresses.map((addr) => {
            const isDefault = addr.is_default;
            const isDeleting = deletingId === addr.id;

            return (
              <Card
                key={addr.id}
                className={`relative flex flex-col justify-between transition-all ${
                  isDefault ? "border-amber-400 bg-amber-50/20 shadow-xs" : "border-stone-200 hover:border-stone-300"
                }`}
              >
                <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-bold text-stone-900">
                        {ADDRESS_TYPE_LABELS[addr.address_type] ?? "Address"}
                      </span>
                      {isDefault && (
                        <span className="rounded-md bg-amber-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                          Default
                        </span>
                      )}
                    </div>
                    {addr.company_name && (
                      <p className="text-xs font-semibold text-stone-700">{addr.company_name}</p>
                    )}
                  </div>
                  {addr.gstin && (
                    <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                      GSTIN: {addr.gstin}
                    </Badge>
                  )}
                </CardHeader>

                <CardBody className="py-2 text-xs text-stone-600 space-y-1">
                  <p className="font-semibold text-stone-900">{addr.contact_name}</p>
                  <p className="text-stone-700">Phone: {addr.phone}</p>
                  <p className="pt-1.5 leading-relaxed text-stone-800">
                    {addr.address_line1}
                    {addr.address_line2 ? `, ${addr.address_line2}` : ""}
                    <br />
                    {addr.city}, {addr.state} — {addr.pincode}
                    <br />
                    {addr.country === "IN" ? "India" : addr.country}
                  </p>
                </CardBody>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 p-4 pt-3 text-xs bg-stone-50/40 rounded-b-2xl">
                  {!isDefault ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleSetDefault(addr.id)}
                      className="font-medium text-stone-600 hover:text-amber-700 hover:underline disabled:opacity-50"
                    >
                      Set as Default
                    </button>
                  ) : (
                    <span className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Primary Address
                    </span>
                  )}

                  <div className="flex items-center gap-3 ml-auto">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => openEditModal(addr)}
                      className="font-semibold text-amber-700 hover:text-amber-800 disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={isPending || isDeleting}
                      onClick={() => handleDelete(addr.id)}
                      className="font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Form: Add / Edit Address */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="address-modal-title"
        >
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-4">
              <h2 id="address-modal-title" className="text-lg font-bold text-stone-900">
                {isEditing ? "Edit Delivery Address" : "Add New Delivery Address"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-stone-400 hover:text-stone-600 rounded-lg p-1 text-sm font-bold"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="address-type-input" className="block text-xs font-semibold text-stone-700 mb-1">
                    Address Purpose *
                  </label>
                  <select
                    id="address-type-input"
                    value={formData.addressType}
                    onChange={(e) =>
                      setFormData({ ...formData, addressType: e.target.value as AddressType })
                    }
                    className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="both">Both (Billing &amp; Delivery Site)</option>
                    <option value="shipping">Delivery / Shipping Only</option>
                    <option value="billing">Billing Only</option>
                    <option value="project_site">Project Site / Construction</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="contact-name-input" className="block text-xs font-semibold text-stone-700 mb-1">
                    Contact Person Name *
                  </label>
                  <input
                    id="contact-name-input"
                    type="text"
                    required
                    maxLength={120}
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    placeholder="e.g. Ramesh Patel"
                    className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone-input" className="block text-xs font-semibold text-stone-700 mb-1">
                    Phone / Mobile *
                  </label>
                  <input
                    id="phone-input"
                    type="tel"
                    required
                    maxLength={25}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label htmlFor="company-name-input" className="block text-xs font-semibold text-stone-700 mb-1">
                    Company / Firm Name (Optional)
                  </label>
                  <input
                    id="company-name-input"
                    type="text"
                    maxLength={160}
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="e.g. Patel Granites &amp; Builders"
                    className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="gstin-input" className="block text-xs font-semibold text-stone-700 mb-1">
                  GSTIN (Optional, for B2B Input Tax Credit)
                </label>
                <input
                  id="gstin-input"
                  type="text"
                  maxLength={15}
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                  placeholder="e.g. 08AAAAA0000A1Z5"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-mono font-medium text-stone-900 uppercase focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label htmlFor="address-line1-input" className="block text-xs font-semibold text-stone-700 mb-1">
                  Address Line 1 (Plot, Building, Street) *
                </label>
                <input
                  id="address-line1-input"
                  type="text"
                  required
                  maxLength={250}
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  placeholder="Plot No. 42, RIICO Industrial Area"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label htmlFor="address-line2-input" className="block text-xs font-semibold text-stone-700 mb-1">
                  Address Line 2 (Area, Landmark) (Optional)
                </label>
                <input
                  id="address-line2-input"
                  type="text"
                  maxLength={250}
                  value={formData.addressLine2}
                  onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                  placeholder="Near Marble Mandi, Phase II"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="city-input" className="block text-xs font-semibold text-stone-700 mb-1">
                    City *
                  </label>
                  <input
                    id="city-input"
                    type="text"
                    required
                    maxLength={100}
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Kishangarh"
                    className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label htmlFor="state-input" className="block text-xs font-semibold text-stone-700 mb-1">
                    State *
                  </label>
                  <input
                    id="state-input"
                    type="text"
                    required
                    maxLength={100}
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="e.g. Rajasthan"
                    className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label htmlFor="pincode-input" className="block text-xs font-semibold text-stone-700 mb-1">
                    PIN Code (6 digits) *
                  </label>
                  <input
                    id="pincode-input"
                    type="text"
                    required
                    maxLength={12}
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value.trim() })}
                    placeholder="e.g. 305801"
                    className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is-default-checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="is-default-checkbox" className="text-xs font-medium text-stone-700">
                  Set as default procurement delivery and billing address
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <Button type="button" variant="secondary" onClick={closeModal} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isPending}>
                  {isPending ? "Saving..." : isEditing ? "Update Address" : "Save Address"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
