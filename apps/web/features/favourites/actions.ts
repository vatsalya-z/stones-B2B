"use server";

import { getSupabaseServerClient } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";

export async function toggleFavourite(
  productId: string,
): Promise<{ isFavourited: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { isFavourited: false, error: "Please sign in to save favourites." };
    }

    const supabase = await getSupabaseServerClient();

    // Check if favourite exists
    const { data: existing } = await supabase
      .from("product_favourites")
      .select("id")
      .eq("buyer_id", user.id)
      .eq("product_id", productId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("product_favourites")
        .delete()
        .eq("id", existing.id);
      return { isFavourited: false };
    } else {
      const { error } = await supabase.from("product_favourites").insert({
        buyer_id: user.id,
        product_id: productId,
      });

      if (error && error.code !== "23505") {
        return { isFavourited: false, error: "Failed to update favourite." };
      }
      return { isFavourited: true };
    }
  } catch (err) {
    console.error("[toggleFavourite] error:", err);
    return { isFavourited: false, error: "An unexpected error occurred." };
  }
}

export async function getFavouriteProductIds(): Promise<string[]> {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    const supabase = await getSupabaseServerClient();
    const { data } = await supabase
      .from("product_favourites")
      .select("product_id")
      .eq("buyer_id", user.id);

    return (data ?? []).map((row) => row.product_id);
  } catch {
    return [];
  }
}

