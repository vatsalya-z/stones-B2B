import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import type { MessageSenderRole } from "@stone/types";
import { COLORS, RADII, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import { FONTS } from "../../theme/typography";
import {
  Badge,
  ErrorState,
  ListScreenSkeleton,
  ScreenHeader,
} from "../ui";
import {
  fetchConversationThread,
  markConversationRead,
  sendThreadMessage,
  toggleConversationArchived,
  useRealtimeThread,
  type ThreadMessageItem,
} from "../../services/messaging.service";
import type { PickedFileInput } from "../../lib/storage-upload";
import { useAuthStore } from "../../store/auth-store";

export function ChatThreadView({
  conversationId,
  viewerRole,
}: {
  conversationId: string;
  viewerRole: MessageSenderRole;
}) {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<PickedFileInput | null>(null);
  const [sending, setSending] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMessageItem[]>([]);

  const threadQ = useQuery({
    queryKey: ["thread", conversationId],
    queryFn: () => fetchConversationThread(conversationId),
    enabled: Boolean(conversationId),
  });

  useEffect(() => {
    if (threadQ.data?.messages) {
      setMessages(threadQ.data.messages);
    }
  }, [threadQ.data?.messages]);

  useEffect(() => {
    if (conversationId) {
      markConversationRead(conversationId).catch(() => undefined);
    }
  }, [conversationId]);

  const handleIncoming = useCallback(
    (incoming: ThreadMessageItem) => {
      setMessages((prev) =>
        prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming],
      );
      markConversationRead(conversationId).catch(() => undefined);
    },
    [conversationId],
  );

  const realtimeStatus = useRealtimeThread(conversationId, handleIncoming);

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
      copyToCacheDirectory: true,
    });
    if (!res.canceled && res.assets[0]) {
      const f = res.assets[0];
      setAttachment({
        uri: f.uri,
        fileName: f.name,
        mimeType: f.mimeType,
        fileSize: f.size,
      });
    }
  };

  const handleSend = async () => {
    if (!user?.id || (!text.trim() && !attachment) || sending) return;
    setErrMsg(null);
    setSending(true);
    try {
      const sent = await sendThreadMessage({
        conversationId,
        senderId: user.id,
        senderRole: viewerRole,
        body: text.trim(),
        attachment,
      });
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      setText("");
      setAttachment(null);
      qc.invalidateQueries({ queryKey: ["messages"] });
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  if (threadQ.isLoading) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Conversation" />
        <ListScreenSkeleton />
      </View>
    );
  }

  if (threadQ.isError || !threadQ.data?.conversation) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Conversation" />
        <ErrorState onRetry={() => threadQ.refetch()} />
      </View>
    );
  }

  const conv = threadQ.data.conversation;
  const isArchived =
    viewerRole === "buyer" ? Boolean(conv.buyer_archived_at) : Boolean(conv.seller_archived_at);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenHeader
        title={conv.subject || "Direct Trade Thread"}
        subtitle={realtimeStatus === "live" ? "Live Messaging Active" : "Connecting..."}
        rightSlot={
          <Pressable
            onPress={async () => {
              await toggleConversationArchived(conversationId, !isArchived);
              qc.invalidateQueries({ queryKey: ["messages"] });
              threadQ.refetch();
            }}
            hitSlop={8}
          >
            <Ionicons
              name={isArchived ? "archive" : "archive-outline"}
              size={20}
              color={COLORS.textPrimary}
            />
          </Pressable>
        }
      />

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={7}
        contentContainerStyle={styles.msgList}
        renderItem={({ item }) => {
          const isMine = item.senderId === user?.id;
          return (
            <View style={[styles.bubbleWrap, isMine ? styles.mineWrap : styles.theirsWrap]}>
              <View style={[styles.bubble, isMine ? styles.mineBubble : styles.theirsBubble]}>
                {item.body ? (
                  <Text style={[styles.msgText, isMine && { color: COLORS.white }]}>
                    {item.body}
                  </Text>
                ) : null}

                {item.attachmentName ? (
                  <Pressable
                    onPress={() => {
                      if (item.attachmentSignedUrl) {
                        Linking.openURL(item.attachmentSignedUrl).catch(() => undefined);
                      }
                    }}
                    style={[
                      styles.attachChip,
                      isMine && { backgroundColor: "rgba(255,255,255,0.18)" },
                    ]}
                  >
                    <Ionicons
                      name="document-attach-outline"
                      size={15}
                      color={isMine ? COLORS.white : COLORS.primary}
                    />
                    <Text
                      numberOfLines={1}
                      style={[styles.attachName, isMine && { color: COLORS.white }]}
                    >
                      {item.attachmentName}
                    </Text>
                  </Pressable>
                ) : null}

                <Text style={[styles.time, isMine && { color: "#D5E5DE" }]}>
                  {new Date(item.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {errMsg ? (
        <View style={styles.errBar}>
          <Text style={styles.errText}>{errMsg}</Text>
        </View>
      ) : null}

      {attachment ? (
        <View style={styles.pendingAttach}>
          <Badge label={`Attached: ${attachment.fileName}`} tone="copper" />
          <Pressable onPress={() => setAttachment(null)}>
            <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
          </Pressable>
        </View>
      ) : null}

      <View
        style={[
          styles.composer,
          { paddingBottom: Math.max(insets.bottom, SPACING.xs) },
        ]}
      >
        <Pressable onPress={pickFile} style={styles.attachBtn} accessibilityLabel="Attach file">
          <Ionicons name="attach" size={22} color={COLORS.primary} />
        </Pressable>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Write a message..."
          placeholderTextColor={COLORS.textSecondary}
          multiline
          style={styles.input}
        />
        <Pressable
          onPress={handleSend}
          disabled={sending || (!text.trim() && !attachment)}
          style={[
            styles.sendBtn,
            (!text.trim() && !attachment) && styles.sendDisabled,
          ]}
          accessibilityLabel="Send message"
        >
          <Ionicons name="send" size={18} color={COLORS.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  msgList: { padding: SPACING.md, gap: SPACING.xs },
  bubbleWrap: { flexDirection: "row" },
  mineWrap: { justifyContent: "flex-end" },
  theirsWrap: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADII.md,
    gap: 4,
  },
  mineBubble: { backgroundColor: COLORS.primary },
  theirsBubble: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  msgText: { fontFamily: FONTS.bodyRegular, fontSize: 14, lineHeight: 20, color: COLORS.textPrimary },
  attachChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 6,
    borderRadius: RADII.xs,
    backgroundColor: COLORS.stoneBeige,
  },
  attachName: { fontFamily: FONTS.bodyMedium, fontSize: 12, color: COLORS.primary, maxWidth: 180 },
  time: { fontFamily: FONTS.bodyRegular, fontSize: 10, color: COLORS.textSecondary, alignSelf: "flex-end" },
  errBar: { backgroundColor: COLORS.errorSoft, paddingHorizontal: SPACING.md, paddingVertical: 6 },
  errText: { fontFamily: FONTS.bodyMedium, fontSize: 12, color: COLORS.error },
  pendingAttach: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  attachBtn: {
    width: TOUCH_TARGET_MIN,
    height: TOUCH_TARGET_MIN,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  sendBtn: {
    width: TOUCH_TARGET_MIN,
    height: TOUCH_TARGET_MIN,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { opacity: 0.45 },
});
