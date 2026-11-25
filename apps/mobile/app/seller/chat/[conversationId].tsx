import React from "react";
import { useLocalSearchParams } from "expo-router";
import { ChatThreadView } from "../../../src/components/stone/ChatThreadView";

export default function SellerChatScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  return <ChatThreadView conversationId={conversationId!} viewerRole="seller" />;
}
