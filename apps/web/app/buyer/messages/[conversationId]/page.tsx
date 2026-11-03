import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConversationThread } from "@/components/messaging/conversation-thread";
import { getBuyerContext } from "@/features/buyer/queries";
import { getConversationThreadForViewer } from "@/features/messaging/queries";

export const metadata: Metadata = {
  title: "Conversation",
};

interface BuyerConversationDetailPageProps {
  params: Promise<{ conversationId: string }>;
}

export default async function BuyerConversationDetailPage({
  params,
}: BuyerConversationDetailPageProps) {
  const [ctx, { conversationId }] = await Promise.all([getBuyerContext(), params]);

  const thread = await getConversationThreadForViewer({
    conversationId,
    viewerRole: "buyer",
    userId: ctx.user.id,
  });

  if (!thread) {
    notFound();
  }

  return <ConversationThread initialData={thread} />;
}

