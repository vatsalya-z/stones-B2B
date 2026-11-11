"use client";

import { useState } from "react";
import { Button } from "@stone/ui";
import { savePlatformSettingAction } from "@/features/admin/actions";
import type { PlatformSettingRow } from "@/features/admin/queries";

export function SettingsClient({
  settings,
}: {
  settings: Record<string, PlatformSettingRow>;
}) {
  const [activeTab, setActiveTab] = useState<"marketplace" | "contact" | "homepage" | "seo">(
    "marketplace",
  );

  // Form states initialized with database settings
  const marketplaceVal = (settings.marketplace?.value || {}) as {
    name?: string;
    tagline?: string;
    default_currency?: string;
    support_hours?: string;
  };
  const [marketplace, setMarketplace] = useState({
    name: marketplaceVal.name || "StonesDekho",
    tagline: marketplaceVal.tagline || "India's B2B natural stone marketplace",
    default_currency: marketplaceVal.default_currency || "INR",
    support_hours: marketplaceVal.support_hours || "Mon-Sat, 9:30-18:30 IST",
  });

  const contactVal = (settings.contact?.value || {}) as {
    email?: string;
    phone?: string;
    whatsapp?: string;
    address?: string;
  };
  const [contact, setContact] = useState({
    email: contactVal.email || "",
    phone: contactVal.phone || "",
    whatsapp: contactVal.whatsapp || "",
    address: contactVal.address || "",
  });

  const homepageVal = (settings.homepage?.value || {}) as {
    hero_headline?: string;
    hero_subheadline?: string;
    banner_enabled?: boolean;
    banner_text?: string;
    banner_link?: string;
  };
  const [homepage, setHomepage] = useState({
    hero_headline: homepageVal.hero_headline || "",
    hero_subheadline: homepageVal.hero_subheadline || "",
    banner_enabled: Boolean(homepageVal.banner_enabled),
    banner_text: homepageVal.banner_text || "",
    banner_link: homepageVal.banner_link || "",
  });

  const seoVal = (settings.seo?.value || {}) as {
    default_title?: string;
    default_description?: string;
    default_og_image?: string;
  };
  const [seo, setSeo] = useState({
    default_title: seoVal.default_title || "",
    default_description: seoVal.default_description || "",
    default_og_image: seoVal.default_og_image || "",
  });

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSave = async (key: "marketplace" | "contact" | "homepage" | "seo") => {
    setSaving(true);
    setFeedback(null);

    let value: Record<string, unknown>;
    switch (key) {
      case "marketplace":
        value = marketplace;
        break;
      case "contact":
        value = contact;
        break;
      case "homepage":
        value = homepage;
        break;
      case "seo":
        value = seo;
        break;
    }

    try {
      const res = await savePlatformSettingAction({
        key,
        value,
        isPublic: true,
      });

      if (!res.success) {
        setFeedback({ type: "error", text: res.error || "Failed to update platform setting." });
        return;
      }

      setFeedback({ type: "success", text: `Platform settings for "${key}" saved and audited.` });
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: "marketplace", label: "General Marketplace" },
    { id: "contact", label: "Official Contact" },
    { id: "homepage", label: "Homepage & Banners" },
    { id: "seo", label: "SEO & Social Sharing" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex border-b border-stone-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
              setFeedback(null);
            }}
            className={`px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-stone-400 hover:text-stone-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {feedback && (
        <div
          className={`rounded-lg border p-3 text-xs ${
            feedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Tab 1: Marketplace */}
      {activeTab === "marketplace" && (
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-6 space-y-4 max-w-2xl">
          <h2 className="text-sm font-semibold text-white">General Marketplace Configuration</h2>
          <div>
            <label className="block text-xs font-medium text-stone-300">Platform Brand Name</label>
            <input
              type="text"
              value={marketplace.name}
              onChange={(e) => setMarketplace({ ...marketplace, name: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 p-2.5 text-xs text-stone-200 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-300">Brand Tagline</label>
            <input
              type="text"
              value={marketplace.tagline}
              onChange={(e) => setMarketplace({ ...marketplace, tagline: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 p-2.5 text-xs text-stone-200 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-300">Default Currency</label>
            <input
              type="text"
              value={marketplace.default_currency}
              onChange={(e) => setMarketplace({ ...marketplace, default_currency: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 p-2.5 text-xs font-mono text-stone-200 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-300">Support Hours</label>
            <input
              type="text"
              value={marketplace.support_hours}
              onChange={(e) => setMarketplace({ ...marketplace, support_hours: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 p-2.5 text-xs text-stone-200 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div className="pt-2 flex justify-end">
            <Button
              variant="accent"
              size="sm"
              loading={saving}
              onClick={() => handleSave("marketplace")}
            >
              Save Marketplace Settings
            </Button>
          </div>
        </div>
      )}

      {/* Tab 2: Contact */}
      {activeTab === "contact" && (
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-6 space-y-4 max-w-2xl">
          <h2 className="text-sm font-semibold text-white">Platform Official Contact Details</h2>
          <div>
            <label className="block text-xs font-medium text-stone-300">Support Email</label>
            <input
              type="email"
              value={contact.email}
              onChange={(e) => setContact({ ...contact, email: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 p-2.5 text-xs font-mono text-stone-200 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-300">Telephone / Support Line</label>
            <input
              type="text"
              value={contact.phone}
              onChange={(e) => setContact({ ...contact, phone: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 p-2.5 text-xs font-mono text-stone-200 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-300">WhatsApp Business Number</label>
            <input
              type="text"
              value={contact.whatsapp}
              onChange={(e) => setContact({ ...contact, whatsapp: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 p-2.5 text-xs font-mono text-stone-200 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-300">Headquarters / Registered Address</label>
            <textarea
              rows={2}
              value={contact.address}
              onChange={(e) => setContact({ ...contact, address: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 p-2.5 text-xs text-stone-200 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div className="pt-2 flex justify-end">
            <Button
              variant="accent"
              size="sm"
              loading={saving}
              onClick={() => handleSave("contact")}
            >
              Save Contact Settings
            </Button>
          </div>
        </div>
      )}

      {/* Tab 3: Homepage & Banner */}
      {activeTab === "homepage" && (
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-6 space-y-4 max-w-2xl">
          <h2 className="text-sm font-semibold text-white">Homepage & Global Notice Banner</h2>
          <div>
            <label className="block text-xs font-medium text-stone-300">Hero Section Main Headline</label>
            <input
              type="text"
              value={homepage.hero_headline}
              onChange={(e) => setHomepage({ ...homepage, hero_headline: e.target.value })}
              placeholder="e.g. Premium Natural Stone Direct From Certified Quarries"
              className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 p-2.5 text-xs text-stone-200 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-300">Hero Subheadline</label>
            <input
              type="text"
              value={homepage.hero_subheadline}
              onChange={(e) => setHomepage({ ...homepage, hero_subheadline: e.target.value })}
              placeholder="e.g. Connecting architects and contractors directly with stone manufacturers"
              className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 p-2.5 text-xs text-stone-200 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 border-t border-stone-800">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={homepage.banner_enabled}
                onChange={(e) => setHomepage({ ...homepage, banner_enabled: e.target.checked })}
                className="h-4 w-4 rounded border-stone-700 bg-stone-950 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-xs font-medium text-stone-200">
                Enable Announcement Banner across Marketplace
              </span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-300">Banner Notice Text</label>
            <input
              type="text"
              value={homepage.banner_text}
              onChange={(e) => setHomepage({ ...homepage, banner_text: e.target.value })}
              placeholder="e.g. Annual Marble & Granite Expo 2026 Registration Now Open"
              className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 p-2.5 text-xs text-stone-200 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-300">Banner Action Link</label>
            <input
              type="text"
              value={homepage.banner_link}
              onChange={(e) => setHomepage({ ...homepage, banner_link: e.target.value })}
              placeholder="/categories or https://..."
              className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 p-2.5 text-xs font-mono text-stone-200 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div className="pt-2 flex justify-end">
            <Button
              variant="accent"
              size="sm"
              loading={saving}
              onClick={() => handleSave("homepage")}
            >
              Save Homepage Settings
            </Button>
          </div>
        </div>
      )}

      {/* Tab 4: SEO */}
      {activeTab === "seo" && (
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-6 space-y-4 max-w-2xl">
          <h2 className="text-sm font-semibold text-white">Default SEO & Social Open Graph Tags</h2>
          <div>
            <label className="block text-xs font-medium text-stone-300">Default Meta Title</label>
            <input
              type="text"
              value={seo.default_title}
              onChange={(e) => setSeo({ ...seo, default_title: e.target.value })}
              placeholder="StonesDekho — India's Natural Stone Marketplace"
              className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 p-2.5 text-xs text-stone-200 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-300">Default Meta Description</label>
            <textarea
              rows={3}
              value={seo.default_description}
              onChange={(e) => setSeo({ ...seo, default_description: e.target.value })}
              placeholder="B2B platform connecting architects, builders, and quarry owners for Makrana marble, granites, and sandstones."
              className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 p-2.5 text-xs text-stone-200 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-300">Default Open Graph Image URL</label>
            <input
              type="url"
              value={seo.default_og_image}
              onChange={(e) => setSeo({ ...seo, default_og_image: e.target.value })}
              placeholder="https://.../og-banner.jpg"
              className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 p-2.5 text-xs font-mono text-stone-200 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div className="pt-2 flex justify-end">
            <Button
              variant="accent"
              size="sm"
              loading={saving}
              onClick={() => handleSave("seo")}
            >
              Save SEO Settings
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

