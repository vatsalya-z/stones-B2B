import AsyncStorage from "@react-native-async-storage/async-storage";

const RECENTLY_VIEWED_KEY = "stonesdekho:recently_viewed_v1";
const MAX_RECENT = 10;

export async function getRecentlyViewedIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENTLY_VIEWED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export async function recordRecentlyViewedId(productId: string): Promise<void> {
  if (!productId) return;
  try {
    const current = await getRecentlyViewedIds();
    const next = [productId, ...current.filter((id) => id !== productId)].slice(0, MAX_RECENT);
    await AsyncStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
  } catch {
    // Non-blocking UX enhancement
  }
}
