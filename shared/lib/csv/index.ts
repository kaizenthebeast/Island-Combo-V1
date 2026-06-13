// Shared CSV plumbing built on PapaParse.
//
// One place for the import/export primitives so every admin resource (products,
// categories, …) parses and serializes CSV the same way: header-keyed rows,
// trimmed values, RFC-4180 quoting, and a UTF-8 BOM on export so Excel opens
// accented data correctly.
//
// Isomorphic: PapaParse runs in the browser and in Node, so these helpers are
// safe to import from both client components (export download) and route
// handlers (import parsing). They contain NO Supabase / server-only imports.

import Papa from 'papaparse'

// ── Export ────────────────────────────────────────────────────────────────────

export type CsvColumn<Row> = {
  /** Stable machine key written as the CSV header. */
  key: string
  /** Human header (defaults to `key`). */
  header?: string
  /** Pull the cell value out of a row. Return '' for blank. */
  value: (row: Row) => string | number | boolean | null | undefined
}

// Excel needs a leading BOM to detect UTF-8; without it accented characters
// (ñ, é, …) render as mojibake. PapaParse handles the RFC-4180 quoting/escaping.
const BOM = '﻿'

export function toCsv<Row>(rows: Row[], columns: CsvColumn<Row>[]): string {
  const fields = columns.map((c) => c.header ?? c.key)
  const data = rows.map((row) =>
    columns.map((c) => {
      const v = c.value(row)
      return v === null || v === undefined ? '' : v
    }),
  )
  const body = Papa.unparse({ fields, data }, { newline: '\r\n' })
  return BOM + body
}

// ── Import ──────────────────────────────────────────────────────────────────

export type CsvParseResult = {
  /** Header-keyed rows, in file order. Values are trimmed strings. */
  rows: Record<string, string>[]
  /** Header names as they appeared in the file (first row). */
  headers: string[]
  /** Parser-level problems (malformed quoting, ragged rows, …). */
  errors: { row: number; message: string }[]
}

// Parses CSV text into header-keyed string rows. We deliberately keep every
// value a string here (no PapaParse dynamic typing) and let each resource's Zod
// schema coerce/validate — that keeps "is 0 a number or the string '0'?"
// decisions in one place per resource instead of in the parser.
export function fromCsv(input: string): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(input, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
    transform: (v) => v.trim(),
  })

  const errors = (parsed.errors ?? []).map((e) => ({
    // PapaParse rows are 0-indexed and exclude the header; +2 → spreadsheet line.
    row: typeof e.row === 'number' ? e.row + 2 : 0,
    message: e.message,
  }))

  return {
    rows: parsed.data ?? [],
    headers: (parsed.meta?.fields ?? []).map((h) => h.trim()),
    errors,
  }
}

// ── List cells (pipe-delimited) ───────────────────────────────────────────────
// Nested data (variant attributes, pricing tiers, images, …) is encoded in a
// single cell as `a|b|c`. These helpers keep that encoding in one spot so import
// and export stay symmetric. '|' is used (not ',') so the cell needs no quoting.

export const LIST_DELIMITER = '|'
export const PAIR_DELIMITER = ':'

export const joinList = (items: (string | number)[]): string =>
  items.map(String).join(LIST_DELIMITER)

export const splitList = (cell: string | undefined | null): string[] =>
  (cell ?? '')
    .split(LIST_DELIMITER)
    .map((s) => s.trim())
    .filter(Boolean)

// Encodes/decodes `key:value` (and `key:a:b:c`) tuples inside a list item.
export const splitPair = (item: string): string[] =>
  item.split(PAIR_DELIMITER).map((s) => s.trim())
