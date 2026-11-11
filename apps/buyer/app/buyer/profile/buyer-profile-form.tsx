"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BusinessType } from "@stone/types";
import { Badge, Button, Card, CardBody, CardHeader } from "@stone/ui";
import { COUNTRY_OPTIONS } from "@/features/seller/seller-meta";
import { saveBuyerProfileAction } from "@/features/buyer/actions";
import { BUYER_TYPE_OPTIONS } from "@/features/buyer/buyer-meta";

export interface BuyerProfileFormProps {
  initialData: {
    fullName: string;
    email: string;
    emailVerified: boolean;
    accountStatus: string;
    roles: string[];
    phone: string;
    whatsappNumber: string;
    companyName: string;
    buyerType: BusinessType | "";
    country: string;
    state: string;
    city: string;
    address: string;
    pincode: string;
  };
}

export function BuyerProfileForm({ initialData }: BuyerProfileFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [fullName, setFullName] = useState(initialData.fullName);
  const [phone, setPhone] = useState(initialData.phone);
  const [whatsappNumber, setWhatsappNumber] = useState(initialData.whatsappNumber);
  const [companyName, setCompanyName] = useState(initialData.companyName);
  const [buyerType, setBuyerType] = useState<BusinessType | "">(initialData.buyerType);
  const [country, setCountry] = useState(initialData.country || "IN");
  const [state, setState] = useState(initialData.state);
  const [city, setCity] = useState(initialData.city);
  const [address, setAddress] = useState(initialData.address);
  const [pincode, setPincode] = useState(initialData.pincode);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await saveBuyerProfileAction({
        fullName,
        phone,
        whatsappNumber,
        companyName,
        buyerType: buyerType || undefined,
        country,
        state,
        city,
        address,
        pincode,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Unable to update buyer profile.");
        return;
      }

      setSuccessMessage("Buyer profile saved successfully.");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
          role="status"
        >
          {successMessage}
        </div>
      )}

      {/* Read-Only Identity & Account Verification Summary */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-stone-900">Verified Account Identity</h2>
          <p className="text-xs text-stone-500">
            Email, account status, and assigned RBAC roles are managed securely by StonesDekho authentication.
          </p>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium text-stone-500">Account Email</p>
              <p className="mt-1 text-sm font-semibold text-stone-900 break-all">
                {initialData.email || "—"}
              </p>
              <div className="mt-1.5">
                {initialData.emailVerified ? (
                  <Badge variant="success">Email Verified</Badge>
                ) : (
                  <Badge variant="warning">Pending Email Verification</Badge>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-stone-500">Account Standing</p>
              <div className="mt-1.5">
                <Badge
                  variant={initialData.accountStatus === "active" ? "success" : "warning"}
                  className="capitalize"
                >
                  {initialData.accountStatus}
                </Badge>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-stone-500">Assigned Roles</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {initialData.roles.map((r) => (
                  <Badge key={r} variant="secondary" className="capitalize">
                    {r.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Buyer Contact & Organization Information */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-stone-900">
            Buyer Contact &amp; Organization Details
          </h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="buyer-fullName" className="block text-xs font-semibold text-stone-700 mb-1">
                Full Name *
              </label>
              <input
                id="buyer-fullName"
                type="text"
                required
                minLength={2}
                maxLength={120}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Riya Sharma"
                className="input-base"
              />
            </div>

            <div>
              <label htmlFor="buyer-companyName" className="block text-xs font-semibold text-stone-700 mb-1">
                Company / Studio Name
              </label>
              <input
                id="buyer-companyName"
                type="text"
                maxLength={160}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Atelier Stone & Architecture Pvt Ltd"
                className="input-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="buyer-type" className="block text-xs font-semibold text-stone-700 mb-1">
                Buyer Business Type
              </label>
              <select
                id="buyer-type"
                value={buyerType}
                onChange={(e) => setBuyerType(e.target.value as BusinessType | "")}
                className="input-base"
              >
                <option value="">Select classification…</option>
                {BUYER_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="buyer-phone" className="block text-xs font-semibold text-stone-700 mb-1">
                Phone Number
              </label>
              <input
                id="buyer-phone"
                type="tel"
                maxLength={20}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="input-base"
              />
            </div>

            <div>
              <label htmlFor="buyer-whatsapp" className="block text-xs font-semibold text-stone-700 mb-1">
                WhatsApp Number
              </label>
              <input
                id="buyer-whatsapp"
                type="tel"
                maxLength={20}
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+91 98765 43210"
                className="input-base"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Default Delivery & Billing Address */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-stone-900">
            Default Delivery &amp; Office Location
          </h2>
          <p className="text-xs text-stone-500">
            Used to prefill delivery destination details when you create new RFQs.
          </p>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="buyer-country" className="block text-xs font-semibold text-stone-700 mb-1">
                Country (ISO) *
              </label>
              <select
                id="buyer-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="input-base"
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="buyer-state" className="block text-xs font-semibold text-stone-700 mb-1">
                State / Province
              </label>
              <input
                id="buyer-state"
                type="text"
                maxLength={100}
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Maharashtra"
                className="input-base"
              />
            </div>

            <div>
              <label htmlFor="buyer-city" className="block text-xs font-semibold text-stone-700 mb-1">
                City
              </label>
              <input
                id="buyer-city"
                type="text"
                maxLength={100}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Mumbai"
                className="input-base"
              />
            </div>

            <div>
              <label htmlFor="buyer-pincode" className="block text-xs font-semibold text-stone-700 mb-1">
                PIN / Postal Code
              </label>
              <input
                id="buyer-pincode"
                type="text"
                maxLength={12}
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="400001"
                className="input-base"
              />
            </div>
          </div>

          <div>
            <label htmlFor="buyer-address" className="block text-xs font-semibold text-stone-700 mb-1">
              Street Address / Site Office
            </label>
            <textarea
              id="buyer-address"
              rows={3}
              maxLength={500}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Building, floor, industrial estate, or warehouse address…"
              className="input-base"
            />
          </div>

          <div className="flex items-center justify-end border-t border-stone-100 pt-4">
            <Button type="submit" variant="primary" loading={isPending}>
              {isPending ? "Saving Profile…" : "Save Buyer Profile"}
            </Button>
          </div>
        </CardBody>
      </Card>
    </form>
  );
}

