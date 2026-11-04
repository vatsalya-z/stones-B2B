import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, CardBody, CardHeader, SectionHeading } from "@stone/ui";
import { formatDateTime } from "@/components/seller/status-badges";
import { formatCountryName } from "@/features/buyer/buyer-meta";
import { getBuyerContext } from "@/features/buyer/queries";
import { BuyerPasswordChangeForm } from "./password-form";

export const metadata: Metadata = {
  title: "Account Settings",
};

export default async function BuyerSettingsPage() {
  const ctx = await getBuyerContext();

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Buyer Account Settings & Security"
        subtitle="Manage your Supabase authentication credentials, review active security sessions, and inspect account access permissions."
      />

      {/* Account Security & Access Information (Strictly Read-Only RBAC) */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-stone-900">Account Security Overview</h2>
          <p className="text-xs text-stone-500">
            Account roles and platform standing are governed by server-side RBAC policies and cannot
            be modified from client settings.
          </p>
        </CardHeader>
        <CardBody>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-4">
              <dt className="text-xs font-medium text-stone-500">Primary Login Email</dt>
              <dd className="mt-1 font-semibold text-stone-900 break-all">
                {ctx.user.email ?? "—"}
              </dd>
              <div className="mt-2">
                {ctx.user.emailVerified ? (
                  <Badge variant="success">Verified Email</Badge>
                ) : (
                  <Badge variant="warning">Unverified Email</Badge>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-4">
              <dt className="text-xs font-medium text-stone-500">Assigned RBAC Roles</dt>
              <dd className="mt-2 flex flex-wrap gap-1.5">
                {ctx.roles.map((role) => (
                  <Badge key={role} variant="secondary" className="capitalize">
                    {role.replace(/_/g, " ")}
                  </Badge>
                ))}
              </dd>
              <p className="mt-2 text-[11px] text-stone-500">
                Standing:{" "}
                <strong className="capitalize text-stone-800">
                  {ctx.profile?.account_status ?? "active"}
                </strong>
              </p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-4">
              <dt className="text-xs font-medium text-stone-500">Session Activity</dt>
              <dd className="mt-1 text-xs text-stone-700 space-y-1">
                <p>
                  Last sign-in:{" "}
                  <strong className="text-stone-900">
                    {formatDateTime(ctx.user.lastSignInAt)}
                  </strong>
                </p>
                <p>
                  Member since:{" "}
                  <strong className="text-stone-900">
                    {formatDateTime(ctx.user.createdAt)}
                  </strong>
                </p>
              </dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      {/* Procurement Profile & Regional Defaults */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-stone-900">Procurement &amp; Delivery Defaults</h2>
            <p className="text-xs text-stone-500">
              Your saved delivery country and contact profile prefill new RFQs automatically.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/buyer/addresses"
              className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50"
            >
              Delivery Addresses →
            </Link>
            <Link
              href="/buyer/profile"
              className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50"
            >
              Edit Profile →
            </Link>
          </div>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
          <div>
            <span className="text-stone-500 block">Default Country</span>
            <span className="mt-0.5 font-semibold text-stone-900 block">
              {formatCountryName(ctx.profile?.country ?? "IN")}
            </span>
          </div>
          <div>
            <span className="text-stone-500 block">Default City / State</span>
            <span className="mt-0.5 font-semibold text-stone-900 block">
              {[ctx.profile?.city, ctx.profile?.state].filter(Boolean).join(", ") || "Not set"}
            </span>
          </div>
          <div>
            <span className="text-stone-500 block">In-App Notifications</span>
            <span className="mt-0.5 font-semibold text-stone-900 block">
              Enabled via Buyer Portal Inbox (granular email channel preferences arrive in Phase 6)
            </span>
          </div>
        </CardBody>
      </Card>

      {/* Password Update via Supabase Auth */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-stone-900">Change Account Password</h2>
          <p className="text-xs text-stone-500">
            Updates your Supabase Auth password immediately across devices. Minimum 10 characters
            with uppercase, lowercase, and a number.
          </p>
        </CardHeader>
        <CardBody>
          <BuyerPasswordChangeForm />
        </CardBody>
      </Card>

      {/* Session Sign Out */}
      <Card>
        <CardBody className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-stone-900">Sign Out of StonesDekho</h2>
            <p className="text-xs text-stone-500">
              End your current browser session securely on this device.
            </p>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
            >
              Sign Out Now
            </button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

