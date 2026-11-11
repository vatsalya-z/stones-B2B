import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardBody, EmptyState, SectionHeading } from "@stone/ui";
import { ConversationInbox } from "@/components/messaging/conversation-inbox";
import { getSellerConversationInbox } from "@/features/messaging/queries";
import { getSellerContext } from "@/features/seller/queries";

export const metadata: Metadata = {
  title: "Messages",
};

interface SellerMessagesPageProps {
  searchParams: Promise<{
    tab?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function SellerMessagesPage({
  searchParams,
}: SellerMessagesPageProps) {
  const [ctx, sp] = await Promise.all([getSellerContext(), searchParams]);

  if (!ctx.sellerProfile) {
    return (
      <div className="space-y-6">
        <SectionHeading
          title="Buyer Messages"
          subtitle="Complete your seller business profile to receive and respond to buyer stone enquiries and direct trade messages."
        />
        <Card>
          <CardBody className="p-10">
            <EmptyState
              title="Complete your Business Profile first"
              description="Once your seller profile is created and verified, buyers can contact your business directly from your storefront, products, and enquiries."
              action={
                <Link
                  href="/seller/profile"
                  className="inline-flex rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-stone-800"
                >
                  Complete Business Profile →
                </Link>
              }
            />
          </CardBody>
        </Card>
      </div>
    );
  }

  const inbox = await getSellerConversationInbox(ctx.sellerProfile.id, {
    tab: sp.tab,
    search: sp.search,
    page: sp.page,
  });

  return (
    <ConversationInbox
      viewerRole="seller"
      viewerUserId={ctx.user.id}
      inbox={inbox}
    />
  );
}

