import type { Metadata } from "next";
import { ConversationInbox } from "@/components/messaging/conversation-inbox";
import { getBuyerContext } from "@/features/buyer/queries";
import { getBuyerConversationInbox } from "@/features/messaging/queries";

export const metadata: Metadata = {
  title: "Messages",
};

interface BuyerMessagesPageProps {
  searchParams: Promise<{
    tab?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function BuyerMessagesPage({
  searchParams,
}: BuyerMessagesPageProps) {
  const [ctx, sp] = await Promise.all([getBuyerContext(), searchParams]);
  const inbox = await getBuyerConversationInbox(ctx.user.id, {
    tab: sp.tab,
    search: sp.search,
    page: sp.page,
  });

  return (
    <ConversationInbox
      viewerRole="buyer"
      viewerUserId={ctx.user.id}
      inbox={inbox}
    />
  );
}

