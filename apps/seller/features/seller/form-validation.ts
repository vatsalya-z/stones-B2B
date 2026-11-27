export interface ValidateFormDbResult<T> {
  data: T | null;
  error: { message: string } | null;
}

export interface ValidateFormQueryBuilder {
  select: (columns: string) => ValidateFormQueryBuilder;
  eq: (column: string, value: string) => ValidateFormQueryBuilder;
  maybeSingle: <T = Record<string, unknown>>() => PromiseLike<ValidateFormDbResult<T>>;
}

export interface FormValidationClient {
  from: (table: string) => ValidateFormQueryBuilder;
}

export interface CategoryProductFormValidationInput {
  categoryId?: string | null;
  subcategoryId?: string | null;
  formId?: string | null;
  formSlug?: string | null;
}

export type CategoryProductFormValidationResult =
  | {
      ok: true;
      categoryId: string;
      formId: string;
      formSlug: string;
    }
  | {
      ok: false;
      error: string;
    };

/**
 * Strict fail-closed validation for category/variety + product form pairing.
 *
 * Security guarantees:
 * 1. Rejects if no category/variety ID is provided or if the category is missing/inactive.
 * 2. Rejects if neither formId nor formSlug is provided.
 * 3. Resolves product_forms from trusted database records; rejects if missing, inactive,
 *    or if browser-supplied formId and formSlug refer to different forms.
 * 4. Queries category_product_forms for the exact (category_id, form_id) pair.
 * 5. Fails closed (rejects) on ANY database error, missing mapping row, or is_enabled !== true.
 */
export async function validateCategoryAndProductForm(
  supabase: FormValidationClient,
  input: CategoryProductFormValidationInput,
): Promise<CategoryProductFormValidationResult> {
  const effectiveCategoryId = (input.subcategoryId || input.categoryId || "").trim();
  if (!effectiveCategoryId) {
    return {
      ok: false,
      error: "A valid stone category or variety is required.",
    };
  }

  const requestedFormId = input.formId?.trim() || null;
  const requestedFormSlug = input.formSlug?.trim() || null;

  if (!requestedFormId && !requestedFormSlug) {
    return {
      ok: false,
      error: "A valid product form is required.",
    };
  }

  // 1. Verify category/variety exists and is active in the database
  const { data: categoryRow, error: categoryError } = await supabase
    .from("categories")
    .select("id, slug, is_active")
    .eq("id", effectiveCategoryId)
    .maybeSingle<{ id: string; slug: string; is_active: boolean }>();

  if (categoryError) {
    return {
      ok: false,
      error: "Unable to verify stone category. Please try again.",
    };
  }

  if (!categoryRow || categoryRow.is_active !== true) {
    return {
      ok: false,
      error: "Selected stone category or variety does not exist or is inactive.",
    };
  }

  // 2. Resolve and verify product form from trusted database records
  const formQuery = supabase
    .from("product_forms")
    .select("id, slug, is_active");

  const { data: formRow, error: formError } = requestedFormId
    ? await formQuery
        .eq("id", requestedFormId)
        .maybeSingle<{ id: string; slug: string; is_active: boolean }>()
    : await formQuery
        .eq("slug", requestedFormSlug!)
        .maybeSingle<{ id: string; slug: string; is_active: boolean }>();

  if (formError) {
    return {
      ok: false,
      error: "Unable to verify product form. Please try again.",
    };
  }

  if (!formRow || formRow.is_active !== true) {
    return {
      ok: false,
      error: "Selected product form is invalid or inactive.",
    };
  }

  // Reject forged/mismatched formId + formSlug combinations
  if (requestedFormId && requestedFormSlug && formRow.slug !== requestedFormSlug) {
    return {
      ok: false,
      error: "Selected product form does not match the expected form identifier.",
    };
  }

  // 3. Strictly verify category_product_forms mapping (fail-closed on error, missing, or disabled)
  const { data: mappingRow, error: mappingError } = await supabase
    .from("category_product_forms")
    .select("id, is_enabled")
    .eq("category_id", categoryRow.id)
    .eq("form_id", formRow.id)
    .maybeSingle<{ id: string; is_enabled: boolean }>();

  if (mappingError) {
    return {
      ok: false,
      error: "Unable to verify product form availability for this stone variety.",
    };
  }

  if (!mappingRow) {
    return {
      ok: false,
      error: "Selected product form is not configured for this stone variety.",
    };
  }

  if (mappingRow.is_enabled !== true) {
    return {
      ok: false,
      error: "Selected product form is not enabled for this stone variety.",
    };
  }

  return {
    ok: true,
    categoryId: categoryRow.id,
    formId: formRow.id,
    formSlug: formRow.slug,
  };
}
