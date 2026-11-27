import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { anon, createEnv, type TestEnv } from "./helpers";
import {
  validateCategoryAndProductForm,
  type FormValidationClient,
  type ValidateFormQueryBuilder,
} from "../../../apps/seller/features/seller/form-validation";

let env: TestEnv;
beforeAll(async () => {
  env = await createEnv();
}, 120_000);

const APPROVED_ARTICLES_SANDSTONE = [
  "agra-red",
  "dholpur-beige",
  "dholpur-pink",
  "bansi-pink",
  "mint",
  "teak",
  "rainbow",
  "jodhpur-pink",
  "jaisalmer-yellow",
];

/**
 * Lightweight PostgREST-compatible query adapter backed by our real migrated PGlite DB
 * so `validateCategoryAndProductForm` executes genuine SQL queries against real tables.
 */
function createPgliteFormClient(testEnv: TestEnv): FormValidationClient {
  return {
    from(table: string): ValidateFormQueryBuilder {
      const filters: Array<{ col: string; val: string }> = [];
      const builder: ValidateFormQueryBuilder = {
        select() {
          return builder;
        },
        eq(col: string, val: string) {
          filters.push({ col, val });
          return builder;
        },
        async maybeSingle<T>() {
          const where = filters.map((f, i) => `${f.col} = $${i + 1}`).join(" and ");
          const params = filters.map((f) => f.val);
          const sql = `select * from public.${table} ${where ? `where ${where}` : ""} limit 1`;
          try {
            const rows = await testEnv.as<T>(anon, sql, params);
            return { data: rows[0] ?? null, error: null };
          } catch (err) {
            return {
              data: null,
              error: { message: err instanceof Error ? err.message : String(err) },
            };
          }
        },
      };
      return builder;
    },
  };
}

describe("fail-closed product form validation security", () => {
  it("allows Slabs, Tiles, and Blocks for valid stone varieties", async () => {
    const client = createPgliteFormClient(env);
    const cats = await env.as<{ id: string }>(
      anon,
      "select id from public.categories where slug = 'kandla-grey'",
    );
    const kandlaId = cats[0]!.id;

    for (const formSlug of ["slabs", "tiles", "blocks"]) {
      const res = await validateCategoryAndProductForm(client, {
        categoryId: kandlaId,
        formSlug,
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.formSlug).toBe(formSlug);
        expect(res.categoryId).toBe(kandlaId);
      }
    }
  });

  it("allows Articles for all 9 client-approved Sandstone varieties", async () => {
    const client = createPgliteFormClient(env);
    for (const slug of APPROVED_ARTICLES_SANDSTONE) {
      const rows = await env.as<{ id: string }>(
        anon,
        "select id from public.categories where slug = $1",
        [slug],
      );
      expect(rows).toHaveLength(1);
      const res = await validateCategoryAndProductForm(client, {
        subcategoryId: rows[0]!.id,
        formSlug: "articles",
      });
      expect(res.ok).toBe(true);
    }
  });

  it("rejects Articles for Chocolate Sandstone, Sagar Black, and Marble varieties", async () => {
    const client = createPgliteFormClient(env);
    for (const slug of [
      "chocolate",
      "sagar-black",
      "indian-white-marble",
      "englo-indian-marble",
    ]) {
      const rows = await env.as<{ id: string }>(
        anon,
        "select id from public.categories where slug = $1",
        [slug],
      );
      expect(rows).toHaveLength(1);
      const res = await validateCategoryAndProductForm(client, {
        subcategoryId: rows[0]!.id,
        formSlug: "articles",
      });
      expect(res.ok).toBe(false);
    }
  });

  it("rejects disabled product form when admin disables it for a category", async () => {
    const client = createPgliteFormClient(env);
    const cat = (
      await env.admin<{ id: string }>(
        "insert into public.categories (name, slug, is_active) values ('Disable Form Stone', 'disable-form-stone', true) returning id",
      )
    )[0]!.id;
    const slabsForm = (
      await env.admin<{ id: string }>(
        "select id from public.product_forms where slug = 'slabs'",
      )
    )[0]!.id;
    await env.admin(
      "insert into public.category_product_forms (category_id, form_id, is_enabled) values ($1, $2, false)",
      [cat, slabsForm],
    );

    const res = await validateCategoryAndProductForm(client, {
      categoryId: cat,
      formId: slabsForm,
      formSlug: "slabs",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/not (enabled|configured)/i);
    }
  });

  it("fails closed when a category has NO category_product_forms mapping rows", async () => {
    const client = createPgliteFormClient(env);
    const cat = (
      await env.admin<{ id: string }>(
        "insert into public.categories (name, slug, is_active) values ('Unmapped Stone', 'unmapped-stone', true) returning id",
      )
    )[0]!.id;

    const res = await validateCategoryAndProductForm(client, {
      categoryId: cat,
      formSlug: "slabs",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/not configured/i);
    }
  });

  it("fails closed on database query errors across categories, product_forms, or category_product_forms", async () => {
    for (const failingTable of ["categories", "product_forms", "category_product_forms"]) {
      const errorClient: FormValidationClient = {
        from(table: string): ValidateFormQueryBuilder {
          const builder: ValidateFormQueryBuilder = {
            select: () => builder,
            eq: () => builder,
            async maybeSingle<T>() {
              if (table === failingTable) {
                return { data: null, error: { message: "connection reset" } };
              }
              if (table === "categories") {
                return {
                  data: { id: "cat-1", slug: "agra-red", is_active: true } as T,
                  error: null,
                };
              }
              if (table === "product_forms") {
                return {
                  data: { id: "form-1", slug: "slabs", is_active: true } as T,
                  error: null,
                };
              }
              return { data: null, error: null };
            },
          };
          return builder;
        },
      };

      const res = await validateCategoryAndProductForm(errorClient, {
        categoryId: "cat-1",
        formSlug: "slabs",
      });
      expect(res.ok).toBe(false);
    }
  });

  it("rejects forged formId, mismatched formId/formSlug, and forged categoryId", async () => {
    const client = createPgliteFormClient(env);
    const agraId = (
      await env.as<{ id: string }>(
        anon,
        "select id from public.categories where slug = 'agra-red'",
      )
    )[0]!.id;
    const slabsId = (
      await env.as<{ id: string }>(
        anon,
        "select id from public.product_forms where slug = 'slabs'",
      )
    )[0]!.id;

    // 1. Non-existent forged formId
    const forgedForm = await validateCategoryAndProductForm(client, {
      categoryId: agraId,
      formId: "00000000-0000-0000-0000-000000009999",
    });
    expect(forgedForm.ok).toBe(false);

    // 2. Mismatched formId (slabs) + formSlug (articles)
    const mismatched = await validateCategoryAndProductForm(client, {
      categoryId: agraId,
      formId: slabsId,
      formSlug: "articles",
    });
    expect(mismatched.ok).toBe(false);

    // 3. Non-existent forged categoryId
    const forgedCategory = await validateCategoryAndProductForm(client, {
      categoryId: "00000000-0000-0000-0000-000000008888",
      formSlug: "slabs",
    });
    expect(forgedCategory.ok).toBe(false);
  });

  it("enforces identical fail-closed validateCategoryAndProductForm in both create and update seller actions", () => {
    const actionsPath = resolve(
      __dirname,
      "../../../apps/seller/features/seller/actions.ts",
    );
    const source = readFileSync(actionsPath, "utf8");
    const createFn = source.slice(
      source.indexOf("export async function createSellerProductAction"),
      source.indexOf("export async function updateSellerProductAction"),
    );
    const updateFn = source.slice(
      source.indexOf("export async function updateSellerProductAction"),
      source.indexOf("export async function changeProductStatusAction"),
    );

    expect(createFn).toContain("validateCategoryAndProductForm(");
    expect(updateFn).toContain("validateCategoryAndProductForm(");
  });
});
