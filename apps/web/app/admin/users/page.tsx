import { getAdminContext } from "@/features/admin/guard";
import { getAdminUsers } from "@/features/admin/queries";
import { AdminFilters } from "@/components/admin/admin-filters";
import { Pagination } from "@/components/ui/pagination";
import { UsersClient, type AdminUserRow } from "./users-client";

export const dynamic = "force-dynamic";

interface UsersPageProps {
  searchParams: Promise<{
    page?: string;
    role?: string;
    search?: string;
  }>;
}

export default async function AdminUsersPage({ searchParams }: UsersPageProps) {
  const ctx = await getAdminContext();
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const role = params.role || "all";
  const search = params.search || "";

  const { users, total, totalPages } = await getAdminUsers(
    { page, limit: 15, role, search },
    ctx,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Users & Role Delegation</h1>
          <p className="mt-1 text-xs text-stone-400">
            Platform user directory, role assignments (Admin / Super Admin), and account suspension controls.
          </p>
        </div>
        <div className="text-xs text-stone-400 font-mono">
          Total Users: <span className="text-white font-bold">{total}</span>
        </div>
      </div>

      <AdminFilters
        searchPlaceholder="Search user by name, email..."
        filters={[
          {
            key: "role",
            label: "Role",
            defaultValue: "all",
            options: [
              { label: "All Roles", value: "all" },
              { label: "Super Admin", value: "super_admin" },
              { label: "Admin", value: "admin" },
              { label: "Seller", value: "seller" },
              { label: "Buyer", value: "buyer" },
            ],
          },
        ]}
      />

      <UsersClient
        users={users as unknown as AdminUserRow[]}
        currentUserId={ctx.user.id}
        isSuperAdmin={ctx.isSuperAdmin}
      />

      {totalPages > 1 && (
        <div className="flex justify-center pt-2">
          <Pagination page={page} totalPages={totalPages} baseUrl="/admin/users" />
        </div>
      )}
    </div>
  );
}
