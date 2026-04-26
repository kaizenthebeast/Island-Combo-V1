import React, { useState, useMemo } from 'react'
// DataTable.tsx
// A generic, sortable, searchable, filterable data table.
// Fully driven by props — no internal data or dummy state.
//
// Core props:
//   data          — array of row objects (any shape)
//   columns       — column definitions (what to show and how to render each cell)
//   onDelete      — if provided, a "Delete" button appears on row hover
//
// Optional toolbar props:
//   searchKeys       — which object keys to search across
//   searchPlaceholder
//   filterKey        — which key drives the dropdown filter
//   filterOptions    — list of values for the dropdown (first = "show all")
//
// Optional sort props:
//   defaultSortKey
//   defaultSortDir   — 'asc' | 'desc'
//
// ─── Column definition ──────────────────────────────────────────────────────
//
//   key       — key from your data object
//   label     — column header text
//   render    — optional custom cell renderer: (value, row) => ReactNode
//   width     — optional fixed width (e.g. '120px')
//   align     — 'left' | 'center' | 'right' (defaults to 'left')
//
// ─── Usage example ──────────────────────────────────────────────────────────
//
//   type Product = { id: string; name: string; price: number; status: string }
//
//   const columns: ColumnDef<Product>[] = [
//     { key: 'id',     label: 'ID',    width: '80px' },
//     { key: 'name',   label: 'Name' },
//     { key: 'price',  label: 'Price', align: 'right',
//       render: (v) => `$${(v as number).toFixed(2)}` },
//     { key: 'status', label: 'Status',
//       render: (v) => <StatusBadge status={v as string} variant="success" /> },
//   ]
//
//   <DataTable
//     data={products}
//     columns={columns}
//     searchKeys={['name', 'id']}
//     filterKey="category"
//     filterOptions={['All', 'Electronics', 'Furniture']}
//     defaultSortKey="name"
//     onDelete={(row) => handleDelete(row.id)}
//   />
// ─── Types ───────────────────────────────────────────────────────────────────

export interface ColumnDef<T> {
  /** Key from the data object */
  key: keyof T
  /** Column header label */
  label: string
  /** Custom cell renderer. Receives (cellValue, fullRow) */
  render?: (value: T[keyof T], row: T) => React.ReactNode
  /** Fixed column width, e.g. '120px' */
  width?: string
  /** Text alignment of the cell. Defaults to 'left' */
  align?: 'left' | 'center' | 'right'
}

interface DataTableProps<T extends Record<string, unknown>> {
  // ── Data ──
  data: T[]
  columns: ColumnDef<T>[]

  // ── Search ──
  /** Keys from the data object to match the search query against */
  searchKeys?: (keyof T)[]
  searchPlaceholder?: string

  // ── Filter dropdown ──
  /** Key from the data object whose value is compared to the selected filter */
  filterKey?: keyof T
  /** First item = "show all" sentinel. Example: ['All', 'Active', 'Inactive'] */
  filterOptions?: string[]

  // ── Sort ──
  defaultSortKey?: keyof T
  defaultSortDir?: 'asc' | 'desc'

  // ── Actions ──
  /** Renders a Delete button on row hover. Receives the full row object. */
  onDelete?: (row: T) => void

  // ── Footer slot (rendered in the bottom bar) ──
  footer?: React.ReactNode

  className?: string

  // ── EXPANDABLE ROW SUPPORT ──
  /** Unique row id (required for expand feature) */
  getRowId?: (row: T) => string | number
  /** Render extra expandable content below row */
  expandedRowRender?: (row: T) => React.ReactNode
}

// ─── Internal sub-components ─────────────────────────────────────────────────

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

function EmptyState() {
  return (
    <tr>
      <td colSpan={100} className="py-16 text-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-400">No results found</p>
          <p className="text-xs text-slate-300">Try adjusting your search or filter</p>
        </div>
      </td>
    </tr>
  )
}

// ─── DataTable ────────────────────────────────────────────────────────────────

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  searchKeys,
  searchPlaceholder = 'Search…',
  filterKey,
  filterOptions = [],
  defaultSortKey,
  defaultSortDir = 'asc',
  onDelete,
  footer,
  className = '',
  getRowId,
  expandedRowRender,
}: DataTableProps<T>) {

  const [search, setSearch] = useState('')
  const [filterValue, setFilterValue] = useState(filterOptions[0] ?? '')
  const [sortKey, setSortKey] = useState<keyof T | undefined>(defaultSortKey ?? columns[0]?.key)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir)

  // EXPAND STATE
  const [expandedRowId, setExpandedRowId] = useState<string | number | null>(null)

  const effectiveSearchKeys = searchKeys ?? columns.map(c => c.key)

  const handleSort = (key: keyof T) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()

    return data
      .filter(row => {
        const passesFilter =
          !filterKey ||
          !filterValue ||
          filterValue === filterOptions[0] ||
          String(row[filterKey]) === filterValue

        const passesSearch =
          !q ||
          effectiveSearchKeys.some(k =>
            String(row[k] ?? '').toLowerCase().includes(q)
          )

        return passesFilter && passesSearch
      })
      .sort((a, b) => {
        if (!sortKey) return 0
        const va = a[sortKey], vb = b[sortKey]
        const cmp = va < vb ? -1 : va > vb ? 1 : 0
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [data, search, filterValue, sortKey, sortDir])

  const SortArrow = ({ col }: { col: keyof T }) => (
    <span className={`ml-1 text-xs ${sortKey === col ? 'text-slate-700' : 'text-slate-300'}`}>
      {sortKey === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  )

  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden ${className}`}>

      {/* ── Toolbar ── */}
      <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">

        <div className="relative flex-1 min-w-[180px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <SearchIcon />
          </span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200"
          />
        </div>

        {filterOptions.length > 1 && (
          <select
            value={filterValue}
            onChange={e => setFilterValue(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-slate-200"
          >
            {filterOptions.map(opt => <option key={opt}>{opt}</option>)}
          </select>
        )}

        <span className="ml-auto text-xs text-slate-400">
          {rows.length} results
        </span>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">

          <thead>
            <tr className="bg-slate-50 border-b">
              {columns.map(col => (
                <th
                  key={String(col.key)}
                  onClick={() => handleSort(col.key)}
                  className="px-5 py-3 cursor-pointer text-xs font-semibold"
                >
                  {col.label}
                  <SortArrow col={col.key} />
                </th>
              ))}

              {onDelete && (
                <th className="px-5 py-3 text-right text-xs">Action</th>
              )}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <EmptyState />
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
                        setExpandedRowId(prev =>
                          prev === rowId ? null : rowId
                        )
                      }}
                      className={`border-b  text-center hover:bg-slate-50 ${expandedRowRender ? 'cursor-pointer' : ''
                        }`}
                    >
                      {columns.map(col => (
                        <td key={String(col.key)} className="px-5 py-3.5">
                          {col.render
                            ? col.render(row[col.key], row)
                            : String(row[col.key] ?? '')}
                        </td>
                      ))}

                      {onDelete && (
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onDelete(row)
                            }}
                            className="text-red-500 text-xs"
                          >
                            <TrashIcon />
                          </button>
                        </td>
                      )}
                    </tr>

                    {/* EXPANDED ROW */}
                    {isExpanded && expandedRowRender && (
                      <tr className="bg-slate-50">
                        <td
                          colSpan={columns.length + (onDelete ? 1 : 0)}
                          className="px-5 py-4"
                        >
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

      {/* ── Footer ── */}
      {rows.length > 0 && (
        <div className="px-5 py-3 border-t bg-slate-50 flex justify-between">
          <span className="text-xs text-slate-400">
            Showing {rows.length} of {data.length}
          </span>
          {footer}
        </div>
      )}

    </div>
  )
}

export default DataTable