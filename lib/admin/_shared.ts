// Shared helpers for admin paginated reads. Keep this thin — only types and
// pure helpers that have no Supabase dependencies.

export type PaginatedInput<TSortKey extends string> = {
  page: number
  pageSize: number
  search?: string
  filter?: string
  sortKey?: TSortKey
  sortDir?: 'asc' | 'desc'
}

export type PaginatedResult<TRow> =
  | { success: true; status: 200; rows: TRow[]; total: number }
  | { success: false; status: number; message: string }

// Escape Postgres ILIKE wildcards so user input is matched literally.
export const escapeIlike = (s: string) => s.replace(/[\\%_,]/g, (c) => `\\${c}`)
