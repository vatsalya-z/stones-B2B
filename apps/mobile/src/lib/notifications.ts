import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import type { NotificationType } from "@stone/types";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted) return true;
    const req = await Notifications.requestPermissionsAsync();
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("stonesdekho-trade", {
        name: "StonesDekho Trade Updates",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#0F6245",
      });
    }
    return req.granted;
  } catch {
    return false;
  }
}

export function resolveNotificationTargetRoute(
  type: NotificationType | string,
  referenceId: string | null | undefined,
  workspace: "buyer" | "seller",
): string {
  if (workspace === "seller") {
    switch (type) {
      case "enquiry_received":
      case "enquiry_viewed":
        return referenceId ? `/seller/leads/${referenceId}` : "/seller/(tabs)/leads";
      case "quotation_accepted":
      case "quotation_rejected":
        return "/seller/quotations";
      case "message_received":
        return referenceId ? `/seller/chat/${referenceId}` : "/seller/messages";
      case "seller_verification":
        return "/seller/verification";
      case "product_moderation":
        return "/seller/(tabs)/products";
      default:
        return "/seller/notifications";
    }
  }

  switch (type) {
    case "quotation_received":
      return referenceId ? `/buyer/quotations/${referenceId}` : "/buyer/quotations";
    case "enquiry_viewed":
      return referenceId ? `/buyer/enquiries/${referenceId}` : "/buyer/enquiries";
    case "message_received":
      return referenceId ? `/buyer/chat/${referenceId}` : "/buyer/(tabs)/messages";
    default:
      return "/buyer/notifications";
  }
}
