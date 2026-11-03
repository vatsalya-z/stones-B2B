import { cn } from "@stone/ui";

export function SellerStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    verified: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    under_review: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    submitted: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    draft: "bg-stone-500/10 text-stone-400 border-stone-500/30",
    rejected: "bg-red-500/10 text-red-400 border-red-500/30",
    suspended: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  };

  const labels: Record<string, string> = {
    verified: "Verified",
    under_review: "Under Review",
    submitted: "Submitted",
    draft: "Draft",
    rejected: "Rejected",
    suspended: "Suspended",
  };

  const style = styles[status] ?? "bg-stone-500/10 text-stone-400 border-stone-500/30";
  const label = labels[status] ?? status;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        style,
      )}
    >
      {label}
    </span>
  );
}

export function ProductModerationBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    pending_review: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    draft: "bg-stone-500/10 text-stone-400 border-stone-500/30",
    rejected: "bg-red-500/10 text-red-400 border-red-500/30",
    archived: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
  };

  const labels: Record<string, string> = {
    approved: "Approved",
    pending_review: "Pending Review",
    draft: "Draft",
    rejected: "Rejected",
    archived: "Archived",
  };

  const style = styles[status] ?? "bg-stone-500/10 text-stone-400 border-stone-500/30";
  const label = labels[status] ?? status;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        style,
      )}
    >
      {label}
    </span>
  );
}

export function AccountStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    suspended: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  };

  const labels: Record<string, string> = {
    active: "Active",
    pending: "Pending",
    suspended: "Suspended",
  };

  const style = styles[status] ?? "bg-stone-500/10 text-stone-400 border-stone-500/30";
  const label = labels[status] ?? status;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        style,
      )}
    >
      {label}
    </span>
  );
}

export function EnquiryStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    quoted: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    closed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    rejected: "bg-red-500/10 text-red-400 border-red-500/30",
  };

  const labels: Record<string, string> = {
    pending: "Pending Quote",
    quoted: "Quoted",
    closed: "Closed / Completed",
    rejected: "Declined",
  };

  const style = styles[status] ?? "bg-stone-500/10 text-stone-400 border-stone-500/30";
  const label = labels[status] ?? status;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        style,
      )}
    >
      {label}
    </span>
  );
}

export function QuotationStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    sent: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    accepted: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    rejected: "bg-red-500/10 text-red-400 border-red-500/30",
    expired: "bg-stone-500/10 text-stone-400 border-stone-500/30",
    draft: "bg-stone-500/10 text-stone-400 border-stone-500/30",
  };

  const labels: Record<string, string> = {
    sent: "Sent to Buyer",
    accepted: "Accepted",
    rejected: "Rejected",
    expired: "Expired",
    draft: "Draft",
  };

  const style = styles[status] ?? "bg-stone-500/10 text-stone-400 border-stone-500/30";
  const label = labels[status] ?? status;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        style,
      )}
    >
      {label}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const isSuper = role === "super_admin";
  const isAdmin = role === "admin";
  const isSeller = role === "seller";
  const isBuyer = role === "buyer";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        isSuper && "bg-purple-500/10 text-purple-300 border-purple-500/30 font-semibold",
        isAdmin && "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
        isSeller && "bg-amber-500/10 text-amber-300 border-amber-500/30",
        isBuyer && "bg-sky-500/10 text-sky-300 border-sky-500/30",
        !isSuper && !isAdmin && !isSeller && !isBuyer && "bg-stone-500/10 text-stone-400 border-stone-500/30",
      )}
    >
      {role}
    </span>
  );
}

