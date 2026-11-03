"use server";

import { revalidatePath } from "next/cache";
import {
  sellerAdminActionSchema,
  documentReviewSchema,
  productAdminActionSchema,
  bulkProductModerationSchema,
  accountStatusActionSchema,
  categoryFormSchema,
  deleteCategorySchema,
  grantAdminRoleSchema,
  orderStatusTransitionSchema,
  revokeAdminRoleSchema,
  savePlatformSettingSchema,
  type SellerAdminActionInput,
  type DocumentReviewInput,
  type ProductAdminActionInput,
  type BulkProductModerationInput,
  type AccountStatusActionInput,
  type CategoryFormInput,
  type DeleteCategoryInput,
  type GrantAdminRoleInput,
  type OrderStatusTransitionInput,
  type RevokeAdminRoleInput,
  type SavePlatformSettingInput,
} from "@stone/validation";
import { authorizeAdminAction } from "./guard";

export interface AdminActionResult<T = undefined> {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  data?: T;
}

// ---------------------------------------------------------------------------
// 1. Seller review & verification actions
// ---------------------------------------------------------------------------

export async function reviewSellerAction(
  rawInput: SellerAdminActionInput,
): Promise<AdminActionResult> {
  const auth = await authorizeAdminAction("admin");
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  const parsed = sellerAdminActionSchema.safeParse(rawInput);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0];
      if (typeof field === "string") {
        fieldErrors[field] = issue.message;
      }
    });
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid seller action input.",
      fieldErrors,
    };
  }

  const { sellerId, action, reason } = parsed.data;
  const { supabase } = auth.ctx;

  try {
    if (action === "request_documents") {
      const { error } = await supabase.rpc("admin_request_seller_documents", {
        _seller_id: sellerId,
        _message: reason ?? "",
      });
      if (error) throw error;
    } else {
      let targetStatus: string;
      switch (action) {
        case "start_review":
          targetStatus = "under_review";
          break;
        case "approve":
          targetStatus = "verified";
          break;
        case "reject":
          targetStatus = "rejected";
          break;
        case "suspend":
          targetStatus = "suspended";
          break;
        case "reactivate":
          targetStatus = "verified";
          break;
        default:
          return { success: false, error: "Unsupported seller review action." };
      }

      const { error } = await supabase.rpc("admin_review_seller", {
        _seller_id: sellerId,
        _new_status: targetStatus,
        _reason: reason ?? undefined,
      });
      if (error) throw error;
    }

    revalidatePath("/admin/sellers");
    revalidatePath(`/admin/sellers/${sellerId}`);
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/reports");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update seller status.";
    return { success: false, error: message };
  }
}

export async function reviewDocumentAction(
  rawInput: DocumentReviewInput,
): Promise<AdminActionResult> {
  const auth = await authorizeAdminAction("admin");
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  const parsed = documentReviewSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid document review input.",
    };
  }

  const { documentId, status, reason } = parsed.data;
  const { supabase } = auth.ctx;

  try {
    const { error } = await supabase.rpc("admin_review_document", {
      _document_id: documentId,
      _status: status,
      _reason: reason ?? undefined,
    });
    if (error) throw error;

    revalidatePath("/admin/sellers");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to review document.";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// 2. Product moderation actions
// ---------------------------------------------------------------------------

export async function moderateProductAction(
  rawInput: ProductAdminActionInput,
): Promise<AdminActionResult> {
  const auth = await authorizeAdminAction("admin");
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  const parsed = productAdminActionSchema.safeParse(rawInput);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0];
      if (typeof field === "string") {
        fieldErrors[field] = issue.message;
      }
    });
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid product moderation input.",
      fieldErrors,
    };
  }

  const { productId, action, reason } = parsed.data;
  const { supabase } = auth.ctx;

  try {
    if (action === "restore") {
      const { error } = await supabase.rpc("admin_restore_product", {
        _product_id: productId,
        _reason: reason ?? "",
      });
      if (error) throw error;
    } else {
      let targetStatus: string;
      switch (action) {
        case "approve":
          targetStatus = "approved";
          break;
        case "reject":
        case "request_changes":
          targetStatus = "rejected";
          break;
        case "archive":
          targetStatus = "archived";
          break;
        default:
          return { success: false, error: "Unsupported moderation action." };
      }

      const { error } = await supabase.rpc("admin_moderate_product", {
        _product_id: productId,
        _status: targetStatus,
        _reason: reason ?? undefined,
      });
      if (error) throw error;
    }

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/reports");
    revalidatePath("/catalog");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update product moderation status.";
    return { success: false, error: message };
  }
}

export interface BulkModerationResult {
  succeeded: number;
  failed: number;
  errors: string[];
}

export async function bulkModerateProductsAction(
  rawInput: BulkProductModerationInput,
): Promise<AdminActionResult<BulkModerationResult>> {
  const auth = await authorizeAdminAction("admin");
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  const parsed = bulkProductModerationSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid bulk moderation input.",
    };
  }

  const { productIds, action, reason } = parsed.data;
  const { supabase } = auth.ctx;

  let succeeded = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const productId of productIds) {
    try {
      const targetStatus = action === "approve" ? "approved" : "rejected";
      const { error } = await supabase.rpc("admin_moderate_product", {
        _product_id: productId,
        _status: targetStatus,
        _reason: reason ?? undefined,
      });
      if (error) throw error;
      succeeded++;
    } catch (err: unknown) {
      failed++;
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`${productId}: ${msg}`);
    }
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin/dashboard");
  revalidatePath("/catalog");

  return {
    success: succeeded > 0,
    data: { succeeded, failed, errors },
    error: failed > 0 ? `${failed} product(s) failed moderation.` : undefined,
  };
}

// ---------------------------------------------------------------------------
// 3. User & Account status actions
// ---------------------------------------------------------------------------

export async function setAccountStatusAction(
  rawInput: AccountStatusActionInput,
): Promise<AdminActionResult> {
  const auth = await authorizeAdminAction("admin");
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  const parsed = accountStatusActionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid account status input.",
    };
  }

  const { userId, status, reason } = parsed.data;
  const { supabase } = auth.ctx;

  try {
    const { error } = await supabase.rpc("admin_set_account_status", {
      _user_id: userId,
      _status: status,
      _reason: reason ?? undefined,
    });
    if (error) throw error;

    revalidatePath("/admin/buyers");
    revalidatePath(`/admin/buyers/${userId}`);
    revalidatePath("/admin/sellers");
    revalidatePath("/admin/users");
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update account status.";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// 4. Category management actions
// ---------------------------------------------------------------------------

export async function saveCategoryAction(
  rawInput: CategoryFormInput,
): Promise<AdminActionResult<{ id: string }>> {
  const auth = await authorizeAdminAction("admin");
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  const parsed = categoryFormSchema.safeParse(rawInput);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0];
      if (typeof field === "string") {
        fieldErrors[field] = issue.message;
      }
    });
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid category input.",
      fieldErrors,
    };
  }

  const { id, name, slug, description, imageUrl, parentId, displayOrder, isActive } = parsed.data;
  const { supabase } = auth.ctx;

  try {
    if (id) {
      // Update
      const { data, error } = await supabase
        .from("categories")
        .update({
          name,
          slug,
          description: description || null,
          image_url: imageUrl || null,
          parent_id: parentId || null,
          display_order: displayOrder,
          is_active: isActive,
        })
        .eq("id", id)
        .select("id")
        .single();

      if (error) throw error;
      revalidatePath("/admin/categories");
      revalidatePath("/categories");
      return { success: true, data: { id: data.id } };
    } else {
      // Create
      const { data, error } = await supabase
        .from("categories")
        .insert({
          name,
          slug,
          description: description || null,
          image_url: imageUrl || null,
          parent_id: parentId || null,
          display_order: displayOrder,
          is_active: isActive,
        })
        .select("id")
        .single();

      if (error) throw error;
      revalidatePath("/admin/categories");
      revalidatePath("/categories");
      return { success: true, data: { id: data.id } };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save category.";
    return { success: false, error: message };
  }
}

export async function deleteCategoryAction(
  rawInput: DeleteCategoryInput,
): Promise<AdminActionResult> {
  const auth = await authorizeAdminAction("super_admin");
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  const parsed = deleteCategorySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid category identifier.",
    };
  }

  const { categoryId } = parsed.data;
  const { supabase } = auth.ctx;

  try {
    const { error } = await supabase.from("categories").delete().eq("id", categoryId);
    if (error) throw error;

    revalidatePath("/admin/categories");
    revalidatePath("/categories");
    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to delete category (it may contain products or subcategories).";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// 5. Admin role delegation actions (Super Admin only)
// ---------------------------------------------------------------------------

export async function grantAdminRoleAction(
  rawInput: GrantAdminRoleInput,
): Promise<AdminActionResult> {
  const auth = await authorizeAdminAction("super_admin");
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  const parsed = grantAdminRoleSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid role grant input.",
    };
  }

  const { userId, email, role } = parsed.data;
  const { supabase } = auth.ctx;

  try {
    let targetUserId = userId;
    if (!targetUserId && email) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (!profile) {
        return { success: false, error: "No user found with the given email address." };
      }
      targetUserId = profile.id;
    }

    if (!targetUserId) {
      return { success: false, error: "Target user ID is missing." };
    }

    const { error } = await supabase.rpc("admin_grant_role", {
      _user_id: targetUserId,
      _role: role,
    });
    if (error) throw error;

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to grant administrator role.";
    return { success: false, error: message };
  }
}

export async function revokeAdminRoleAction(
  rawInput: RevokeAdminRoleInput,
): Promise<AdminActionResult> {
  const auth = await authorizeAdminAction("super_admin");
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  const parsed = revokeAdminRoleSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid role revoke input.",
    };
  }

  const { userId, role } = parsed.data;
  const { supabase } = auth.ctx;

  try {
    const { error } = await supabase.rpc("admin_revoke_role", {
      _user_id: userId,
      _role: role,
    });
    if (error) throw error;

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to revoke administrator role.";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// 6. Platform Settings actions (Super Admin only)
// ---------------------------------------------------------------------------

export async function savePlatformSettingAction(
  rawInput: SavePlatformSettingInput,
): Promise<AdminActionResult> {
  const auth = await authorizeAdminAction("super_admin");
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  const parsed = savePlatformSettingSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid platform setting payload.",
    };
  }

  const { key, value, isPublic } = parsed.data;
  const { supabase } = auth.ctx;

  try {
    const { error } = await supabase.rpc("admin_set_platform_setting", {
      _key: key,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _value: value as any,
      _is_public: isPublic ?? undefined,
    });
    if (error) throw error;

    revalidatePath("/admin/settings");
    revalidatePath("/");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save platform setting.";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// 7. Phase 2: Order Management & Arbitration Actions
// ---------------------------------------------------------------------------

export async function transitionAdminOrderAction(
  rawInput: OrderStatusTransitionInput,
): Promise<AdminActionResult> {
  const auth = await authorizeAdminAction("admin");
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  const parsed = orderStatusTransitionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid order status transition payload.",
    };
  }

  const { orderId, newStatus, notes } = parsed.data;
  if (newStatus !== "cancelled" && newStatus !== "completed") {
    return {
      success: false,
      error:
        "Platform administrators may only intervene by cancelling disputed orders or closing delivered orders.",
    };
  }

  const { supabase } = auth.ctx;
  try {
    const { error } = await supabase.rpc("transition_order_status", {
      _order_id: orderId,
      _new_status: newStatus,
      _notes: notes ?? null,
    });
    if (error) throw error;

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/buyer/orders");
    revalidatePath(`/buyer/orders/${orderId}`);
    revalidatePath("/seller/orders");
    revalidatePath(`/seller/orders/${orderId}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to transition order status.";
    return { success: false, error: message };
  }
}
