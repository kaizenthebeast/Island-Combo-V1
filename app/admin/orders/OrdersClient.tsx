'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { PageHeader } from '@/components/admin/PageHeader'
import { DataTable, ColumnDef } from '@/components/admin/DataTable'
import StatusBadge from '@/components/admin/StatusBadge'
import { useTableUrlState } from '@/lib/hooks/use-table-url-state'
import { ORDER_STATUSES, orderStatusLabel, orderStatusVariant } from '@/lib/orders/order-status'
import type { AdminOrderListRow } from '@/lib/types/order'

type Row = {
  order_id: number
  created: string
  customer: string
  payment: string
  total: number
  status: string
  qty: number
}

const paymentLabel = (m: string) => (m === 'cod' ? 'COD' : m === 'card' ? 'PayPal' : m)
const money = (n: number | null) => `$${Number(n ?? 0).toFixed(2)}`

interface Props {
  orders: AdminOrderListRow[]
  total: number
  page: number
  pageSize: number
  payment: string
}

export default function OrdersClient({ orders, total, page, pageSize, payment }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const {
    state, isPending, searchInput, setSearchInput,
    setPage, setPageSize, setFilter, setSort,
  } = useTableUrlState({
    pageSize,
    filter: 'All',
    sortKey: 'created_at',
    sortDir: 'desc',
  })

  // Payment-method filter lives outside DataTable's single filter slot, so it
  // manages its own URL param (preserving the others).
  const setPayment = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (!value || value === 'All') params.delete('payment')
    else params.set('payment', value)
    params.delete('page')
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const rows: Row[] = useMemo(
    () =>
      orders.map((o) => ({
        order_id: o.order_id,
        created: new Date(o.created_at).toLocaleDateString(),
        customer: o.customer_name || o.email || '—',
        payment: o.payment_method,
        total: Number(o.total_amount ?? 0),
        status: o.order_status,
        qty: o.total_qty,
      })),
    [orders],
  )

  const columns: ColumnDef<Row>[] = [
    {
      key: 'order_id',
      label: 'Order',
      sortable: false,
      render: (value) => (
        <Link
          href={`/admin/orders/${value}`}
          className="font-semibold text-brand hover:underline"
        >
          #{String(value)}
        </Link>
      ),
    },
    { key: 'created', label: 'Date', sortable: false },
    { key: 'customer', label: 'Customer', sortable: false },
    { key: 'qty', label: 'Items', align: 'center', sortable: false },
    {
      key: 'payment',
      label: 'Payment',
      align: 'center',
      sortable: false,
      render: (value) => paymentLabel(String(value)),
    },
    {
      key: 'total',
      label: 'Total',
      align: 'right',
      sortable: true,
      render: (value) => money(Number(value)),
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      sortable: true,
      render: (value) => (
        <StatusBadge status={orderStatusLabel(String(value))} variant={orderStatusVariant(String(value))} />
      ),
    },
  ]

  // URL stores the RPC sort key (total_amount/order_status); map it back to the
  // Row column key so DataTable highlights the right header.
  const sortKeyForTable =
    state.sortKey === 'total_amount' ? 'total' : state.sortKey === 'order_status' ? 'status' : undefined

  return (
    <section className="min-h-full bg-muted px-6 py-10">
      <PageHeader
        eyebrow="Fulfillment"
        title="Orders"
        subtitle="Track and update orders as they move through fulfillment"
      />

      <div className="mb-4 flex items-center gap-2">
        <label className="text-xs font-medium text-muted-foreground">Payment</label>
        <select
          value={payment}
          onChange={(e) => setPayment(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl border border-border bg-white"
        >
          <option value="All">All payments</option>
          <option value="cod">COD</option>
          <option value="card">PayPal</option>
        </select>
      </div>

      <DataTable<Row>
        rows={rows}
        total={total}
        columns={columns}
        loading={isPending}

        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}

        search={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search by order #, name, or email…"

        filterValue={state.filter || 'All'}
        onFilterChange={setFilter}
        filterOptions={['All', ...ORDER_STATUSES]}

        sortKey={sortKeyForTable as keyof Row | undefined}
        sortDir={state.sortDir}
        onSortChange={(key, dir) => {
          // Map table column key -> RPC sort key.
          const rpcKey = key === 'total' ? 'total_amount' : key === 'status' ? 'order_status' : 'created_at'
          setSort(rpcKey, dir)
        }}

        // Edit → the order detail page, where the status is changed through the
        // password-confirmed, audited update form.
        onEdit={(row) => router.push(`/admin/orders/${row.order_id}`)}

        getRowId={(row) => row.order_id}
      />
    </section>
  )
}
