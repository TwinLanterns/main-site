// Supabase's PostgREST caps every response at the project's "Max rows"
// setting (1,000 by default) and silently truncates the rest. Used by the
// admin dashboard and vibe search, which need every row, not the newest
// thousand. Callers must order by a unique column (e.g. created_at, id) so
// rows can't shift between pages.

const PAGE_SIZE = 1000;

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<PageResult<T>> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) return { data: null, error };
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return { data: rows, error: null };
  }
}
