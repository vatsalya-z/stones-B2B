export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 100;

export interface PageParams {
  page: number;
  pageSize: number;
  /** Inclusive range for Supabase `.range(from, to)` */
  from: number;
  to: number;
}

/** Parse untrusted page/pageSize values into safe bounded numbers. */
export function parsePagination(
  page: unknown,
  pageSize: unknown,
  defaultSize: number = DEFAULT_PAGE_SIZE,
): PageParams {
  const p = Math.max(1, Math.floor(Number(page)) || 1);
  const rawSize = Math.floor(Number(pageSize)) || defaultSize;
  const size = Math.min(MAX_PAGE_SIZE, Math.max(1, rawSize));
  const from = (p - 1) * size;
  return { page: p, pageSize: size, from, to: from + size - 1 };
}
