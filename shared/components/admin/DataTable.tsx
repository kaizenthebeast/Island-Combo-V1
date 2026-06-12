import React from 'react'
import { Skeleton } from '@/shared/components/ui/skeleton'

// DataTable.tsx
// Fully controlled data table. All state (page, pageSize, search, filter, sort)
// is owned by the parent — typically synced to URL search params via
// hooks/useTableUrlState. Pair with server-side paginated queries.
//
// Column definition
//
//   key       — key from your data object
//   label     — column header text
//   render    — optional custom cell renderer: (value, row) => ReactNode
//   width     — optional fixed width (e.g. '120px')
//   align     — 'left' | 'center' | 'right' (defaults to 'left')
//   sortable  — set to false to disable sorting on this column (defaults to true)
// Types

export interface ColumnDef<Row> {
  key: keyof Row
  label: string
  render?: (value: Row[keyof Row], row: Row) => React.ReactNode
  width?: string
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
}

// A dropdown filter rendered inside the table toolbar. Tables can have several;
// each owns its own URL param via the parent (keeps filtering server-side / SSR).
export interface TableFilter {
  key: string
  label?: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

export interface DataTableProps<Row extends Record<string, unknown>> {
  // Data (already paginated by the server)
  rows: Row[]
  total: number
  columns: ColumnDef<Row>[]
  loading?: boolean

  // Pagination
  page: number                                      // 1-indexed
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]                        // default [10, 25, 50, 100]

  // Search
  search: string
  onSearchChange: (q: string) => void
  searchPlaceholder?: string

  // Filter dropdown — legacy single filter (first item = "show all").
  filterValue?: string
  onFilterChange?: (v: string) => void
  filterOptions?: string[]
  // Multiple filters — each rendered as a labelled dropdown in the toolbar.
  filters?: TableFilter[]

  // Sort
  sortKey?: keyof Row
  sortDir?: 'asc' | 'desc'
  onSortChange?: (key: keyof Row, dir: 'asc' | 'desc') => void

  // Actions
  onEdit?: (row: Row) => void
  onDelete?: (row: Row) => void

  // Expandable rows
  getRowId?: (row: Row) => string | number
  expandedRowRender?: (row: Row) => React.ReactNode

  className?: string
}

// Icons

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

const EditIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 113.182 3.182L7.5 19.213l-4.5 1 1-4.5L16.862 3.487z" />
  </svg>
)

const ChevronLeft = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
)

const ChevronRight = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
)

// Sub-components

function EmptyState({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-16 text-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-sm font-medium text-muted-foreground">No results found</p>
          <p className="text-xs text-muted-foreground">Try adjusting your search or filter</p>
        </div>
      </td>
    </tr>
  )
}

function LoadingState({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-2 py-3">
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </div>
      </td>
    </tr>
  )
}

// Builds a compact page-number window like: 1 … 4 5 [6] 7 8 … 20
function getPageWindow(current: number, totalPages: number, span = 1): (number | '…')[] {
  const pages = new Set<number>()
  pages.add(1)
  pages.add(totalPages)
  for (let i = current - span; i <= current + span; i++) {
    if (i >= 1 && i <= totalPages) pages.add(i)
  }
  const sorted = Array.from(pages).sort((a, b) => a - b)
  const out: (number | '…')[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push('…')
    out.push(sorted[i])
  }
  return out
}

// DataTable

export function DataTable<Row extends Record<string, unknown>>({
  rows,
  total,
  columns,
  loading = false,

  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],

  search,
  onSearchChange,
  searchPlaceholder = 'Search…',

  filterValue,
  onFilterChange,
  filterOptions = [],
  filters = [],

  sortKey,
  sortDir = 'asc',
  onSortChange,

  onEdit,
  onDelete,

  getRowId,
  expandedRowRender,

  className = '',
}: DataTableProps<Row>) {

  const [expandedRowId, setExpandedRowId] = React.useState<string | number | null>(null)

  const hasActions = Boolean(onEdit || onDelete)
  const totalColumns = columns.length + (hasActions ? 1 : 0)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const startRow = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const endRow = Math.min(safePage * pageSize, total)

  const handleSort = (key: keyof Row, sortable: boolean) => {
    if (!sortable || !onSortChange) return
    if (sortKey === key) {
      onSortChange(key, sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      onSortChange(key, 'asc')
    }
  }

  const SortArrow = ({ col }: { col: keyof Row }) => (
    <span className={`ml-1 text-xs ${sortKey === col ? 'text-foreground' : 'text-muted-foreground'}`}>
      {sortKey === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  )

  return (
    <div className={`bg-white rounded-2xl border border-border shadow-xs overflow-hidden ${className}`}>

      {/* Toolbar */}
      <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">

        <div className="relative flex-1 min-w-[180px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <SearchIcon />
          </span>
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-border focus:outline-hidden focus:border-ring"
          />
        </div>

        {filterOptions.length > 1 && onFilterChange && (
          <select
            value={filterValue ?? filterOptions[0]}
            onChange={(e) => onFilterChange(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-border"
          >
            {filterOptions.map((opt) => <option key={opt}>{opt}</option>)}
          </select>
        )}

        {/* Multiple filters — all live inside the toolbar for a consistent look. */}
        {filters.map((f) => (
          <select
            key={f.key}
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
            aria-label={f.label ?? f.key}
            className="px-3 py-2 text-sm rounded-xl border border-border"
          >
            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}

        <span className="ml-auto text-xs text-muted-foreground">
          {total} {total === 1 ? 'result' : 'results'}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">

          <thead>
            <tr className="bg-muted border-b">
              {columns.map((col) => {
                const sortable = col.sortable !== false && Boolean(onSortChange)
                return (
                  <th
                    key={String(col.key)}
                    onClick={() => handleSort(col.key, sortable)}
                    className={`px-5 py-3 text-xs font-semibold text-${col.align ?? 'left'} ${
                      sortable ? 'cursor-pointer select-none hover:bg-muted' : ''
                    }`}
                    style={col.width ? { width: col.width } : undefined}
                  >
                    {col.label}
                    {sortable && <SortArrow col={col.key} />}
                  </th>
                )
              })}

              {hasActions && (
                <th className="px-5 py-3 text-right text-xs">Actions</th>
              )}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <LoadingState colSpan={totalColumns} />
            ) : rows.length === 0 ? (
              <EmptyState colSpan={totalColumns} />
            ) : (
              rows.map((row, i) => {
                const rowId = getRowId ? getRowId(row) : i
                const isExpanded = expandedRowId === rowId

                return (
                  <React.Fragment key={rowId}>

                    {/* MAIN ROW */}
                    <tr
                      onClick={() => {
                        if (!expandedRowRender) return
                        setExpandedRowId((prev) => (prev === rowId ? null : rowId))
                      }}
                      className={`border-b text-center hover:bg-muted ${
                        expandedRowRender ? 'cursor-pointer' : ''
                      }`}
                    >
                      {columns.map((col) => (
                        <td
                          key={String(col.key)}
                          className={`px-5 py-3.5 text-${col.align ?? 'left'}`}
                        >
                          {col.render
                            ? col.render(row[col.key], row)
                            : String(row[col.key] ?? '')}
                        </td>
                      ))}

                      {hasActions && (
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {onEdit && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onEdit(row)
                                }}
                                className="text-info text-xs hover:text-info transition-colors"
                                title="Edit"
                              >
                                <EditIcon />
                              </button>
                            )}
                            {onDelete && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onDelete(row)
                                }}
                                className="text-danger text-xs hover:text-danger transition-colors"
                                title="Delete"
                              >
                                <TrashIcon />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>

                    {/* EXPANDED ROW */}
                    {isExpanded && expandedRowRender && (
                      <tr className="bg-muted">
                        <td colSpan={totalColumns} className="px-5 py-4">
                          {expandedRowRender(row)}
                        </td>
                      </tr>
                    )}

                  </React.Fragment>
                )
              })
            )}
          </tbody>

        </table>
      </div>

      {/* Pagination footer */}
      <div className="px-5 py-3 border-t bg-muted flex flex-wrap items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {total === 0 ? 'No results' : `Showing ${startRow}–${endRow} of ${total}`}
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-2 py-1 rounded-md border border-border text-xs"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        )}

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage <= 1 || loading}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            <ChevronLeft />
          </button>

          {getPageWindow(safePage, totalPages).map((p, idx) =>
            p === '…' ? (
              <span key={`gap-${idx}`} className="px-2 text-xs text-muted-foreground">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                disabled={loading}
                className={`min-w-[28px] h-7 px-2 rounded-md text-xs font-medium transition-colors ${
                  p === safePage
                    ? 'bg-primary text-white'
                    : 'text-muted-foreground hover:bg-white'
                }`}
              >
                {p}
              </button>
            ),
          )}

          <button
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage >= totalPages || loading}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            <ChevronRight />
          </button>
        </div>
      </div>

    </div>
  )
}

export default DataTable
