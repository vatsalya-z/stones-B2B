import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@stone/database/admin";
import { ProfileEditor } from "./profile-editor";
import {
  ShieldCheck,
  ClipboardList,
  Layers,
  ArrowRight,
  Calendar,
  Phone,
  Mail,
  Building2,
  Settings,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Buyer Profile & Settings — StonesDekho",
  description: "Manage your StonesDekho natural stone buyer profile, procurement preferences, and active stone RFQs.",
};

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/profile");
  }

  // Fetch profile details
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Fetch buyer's recent requirements / search leads
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: leads } = await (admin as any)
    .from("search_leads")
    .select("*")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(8);

  const displayName = profile?.full_name || user.email?.split("@")[0] || "Stone Buyer";
  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="bg-stone-50 min-h-screen py-8 sm:py-12">
      <div className="container-narrow">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-stone-500 mb-6">
          <Link href="/" className="hover:text-stone-900 transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-stone-900 font-semibold">Buyer Settings</span>
        </div>

        {/* 1. Header Profile Banner */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-600 text-white flex items-center justify-center text-2xl sm:text-3xl font-extrabold shadow-md shadow-amber-600/20 shrink-0">
                {userInitial}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                    {displayName}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Buyer
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-1.5 text-xs text-stone-500">
                  <div className="flex items-center gap-1 font-mono">
                    <Mail className="w-3.5 h-3.5 text-stone-400" />
                    {user.email}
                  </div>
                  {profile?.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-stone-400" />
                      {profile.phone}
                    </div>
                  )}
                  {profile?.city && (
                    <div className="text-stone-400">
                      • {profile.city}, {profile.state || "India"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Post RFQ CTA */}
            <Link
              href="/request-quote"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm py-2.5 px-5 shadow-xs transition-colors shrink-0"
            >
              <ClipboardList className="w-4 h-4" />
              <span>Post New RFQ</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (8 cols): Profile & Settings Form */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-stone-100">
                <div>
                  <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-amber-600" />
                    Account &amp; Contact Settings
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Update your business contact details so suppliers can share factory quotations.
                  </p>
                </div>
              </div>

              <ProfileEditor
                initialProfile={{
                  fullName: profile?.full_name || "",
                  email: user.email || "",
                  phone: profile?.phone || "",
                  city: profile?.city || "",
                  state: profile?.state || "",
                }}
              />
            </div>

            {/* Recent Requirements / Leads Recorded */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-stone-100">
                <div>
                  <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-amber-600" />
                    My Stone Enquiries &amp; Search Leads
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Stone requirements and product searches automatically submitted to factory network.
                  </p>
                </div>
              </div>

              {leads && leads.length > 0 ? (
                <div className="divide-y divide-stone-100">
                  {leads.map((lead: { id: string; query: string; created_at: string }) => (
                    <div
                      key={lead.id}
                      className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="text-sm font-bold text-stone-900">
                          {lead.query}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-stone-400 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {new Date(lead.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          <span>•</span>
                          <span className="text-amber-700 font-medium">
                            Direct Inquiry
                          </span>
                        </div>
                      </div>
                      <Link
                        href={`/products?q=${encodeURIComponent(lead.query)}`}
                        className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1 shrink-0"
                      >
                        Find Slabs <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
                    <Layers className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-stone-700">
                    No active stone enquiries yet
                  </p>
                  <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">
                    Search for marble or granite on the homepage to instantly connect with verified quarries.
                  </p>
                  <Link
                    href="/products"
                    className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold text-amber-600 hover:underline"
                  >
                    Browse Stone Catalog →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (4 cols): Quick Links & Trust */}
          <div className="lg:col-span-4 space-y-6">
            {/* Quick Links Card */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                Quick Shortcuts
              </h3>
              <Link
                href="/products"
                className="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-stone-800">
                    Natural Stone Slabs
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
              </Link>
              <Link
                href="/suppliers"
                className="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-stone-800">
                    Verified Exporters &amp; Factories
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
              </Link>
              <Link
                href="/how-it-works"
                className="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-stone-800">
                    Buyer Protection Guarantee
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
              </Link>
            </div>

            {/* Help / Trade Desk Box */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
              <p className="text-xs font-bold text-amber-900 mb-1">
                Need Help with Bulk Slabs?
              </p>
              <p className="text-xs text-amber-800 leading-relaxed mb-3">
                Our trade desk assists with factory inspections, dry-lays, and seaport container dispatch.
              </p>
              <Link
                href="/contact"
                className="text-xs font-bold text-amber-900 underline hover:text-amber-950"
              >
                Contact Trade Desk Support →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

