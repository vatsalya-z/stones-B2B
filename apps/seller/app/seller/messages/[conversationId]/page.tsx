import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConversationThread } from "@/components/messaging/conversation-thread";
import { getConversationThreadForViewer } from "@/features/messaging/queries";
import { getSellerContext } from "@/features/seller/queries";

export const metadata: Metadata = {
  title: "Conversation",
};

interface SellerConversationDetailPageProps {
  params: Promise<{ conversationId: string }>;
}

export default async function SellerConversationDetailPage({
  params,
}: SellerConversationDetailPageProps) {
  const [ctx, { conversationId }] = await Promise.all([getSellerContext(), params]);
  if (!ctx.sellerProfile) {
    notFound();
  }

  const thread = await getConversationThreadForViewer({
    conversationId,
    viewerRole: "seller",
    userId: ctx.user.id,
    sellerId: ctx.sellerProfile.id,
  });

  if (!thread) {
    notFound();
  }

  return <ConversationThread initialData={thread} />;
}

