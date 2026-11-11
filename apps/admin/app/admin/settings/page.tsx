import { getSuperAdminContext } from "@/features/admin/guard";
import { getAdminPlatformSettings } from "@/features/admin/queries";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const ctx = await getSuperAdminContext();
  const settings = await getAdminPlatformSettings(ctx);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">Platform Settings</h1>
          <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-300 border border-purple-500/30">
            Super Admin Only
          </span>
        </div>
        <p className="mt-1 text-xs text-stone-400">
          Global marketplace parameters, contact information, notice banners, and SEO metadata. All edits are logged in audit records.
        </p>
      </div>

      <SettingsClient settings={settings} />
    </div>
  );
}

