import {
  DollarSign, ShoppingCart, Users, TrendingUp, Undo2, Package, Ticket, AlertTriangle,
} from 'lucide-react'
import { PageHeader } from '@/shared/components/admin/PageHeader'
import RevenueAreaChart from '@/shared/components/admin/charts/RevenueAreaChart'
import StatusDonut from '@/shared/components/admin/charts/StatusDonut'
import { WelcomeBanner } from '@/features/dashboard/components/WelcomeBanner'
import { getDashboardStats } from '@/features/dashboard/api'
import { requireUser } from '@/features/auth/api'

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n ?? 0)
const money2 = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0)

// Derive a friendly display name from the admin's email local-part:
// "hamza.nakan04@x.com" → "Hamza Nakan".
const displayName = (email: string | null): string => {
  const local = (email ?? '').split('@')[0]
  const cleaned = local
    .replace(/[._-]+/g, ' ')
    .replace(/\d+/g, '')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
  return cleaned || 'Admin'
}

const DashboardPage = async () => {
  const [res, user] = await Promise.all([getDashboardStats(), requireUser()])
  const name = displayName(user?.email ?? null)

  if (!res.success) {
    return (
      <section className="min-h-full bg-muted px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <PageHeader eyebrow="Overview" title="Dashboard" subtitle="Store analytics" />
        <p className="text-sm text-danger">{res.message}</p>
      </section>
    )
  }
  const s = res.stats

  return (
    <section className="min-h-full bg-muted px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
      <WelcomeBanner
        name={name}
        highlights={[
          { label: 'Revenue today', value: money(s.revenue.today) },
          { label: 'Orders today', value: String(s.orders.today) },
          { label: 'To fulfill', value: String(s.orders.pending_fulfillment) },
        ]}
      />

      {/* KPI cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi icon={<DollarSign size={18} />} label="Revenue (30d)" value={money(s.revenue.last_30_days)} sub={`${money(s.revenue.today)} today`} />
        <Kpi icon={<TrendingUp size={18} />} label="Avg order value" value={money2(s.orders.aov)} sub={`${s.orders.total} orders total`} />
        <Kpi icon={<ShoppingCart size={18} />} label="To fulfill" value={String(s.orders.pending_fulfillment)} sub={`${s.orders.today} placed today`} accent={s.orders.pending_fulfillment > 0} />
        <Kpi icon={<Undo2 size={18} />} label="Refunds pending" value={String(s.refunds_pending)} sub="awaiting review" accent={s.refunds_pending > 0} />
        <Kpi icon={<Users size={18} />} label="Customers" value={String(s.customers.total)} sub={`+${s.customers.new_30_days} this month`} />
        <Kpi icon={<Ticket size={18} />} label="Active vouchers" value={String(s.vouchers.active)} sub={`${money(s.vouchers.active_value)} outstanding`} />
        <Kpi icon={<DollarSign size={18} />} label="Total revenue" value={money(s.revenue.total)} sub="all paid orders" />
        <Kpi icon={<AlertTriangle size={18} />} label="Low stock" value={String(s.low_stock.length)} sub="variants ≤ 5 left" accent={s.low_stock.length > 0} />
      </div>

      {/* Revenue trend */}
      <Card className="mt-6">
        <h3 className="mb-4 text-sm font-bold text-foreground">Revenue — last 14 days</h3>
        <RevenueAreaChart data={s.revenue_series} />
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Order status breakdown */}
        <Card>
          <h3 className="mb-4 text-sm font-bold text-foreground">Orders by status</h3>
          <StatusDonut data={s.by_status} />
        </Card>

        {/* Top products */}
        <Card>
          <h3 className="mb-4 flex items-center gap-1.5 text-sm font-bold text-foreground"><Package size={15} /> Top products</h3>
          {s.top_products.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales yet.</p>
          ) : (
            <ul className="space-y-3">
              {s.top_products.map((p, i) => (
                <li key={p.name} className="flex items-center gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-tint text-xs font-bold text-brand">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-foreground">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{p.qty} sold</span>
                  <span className="w-20 text-right font-semibold">{money2(p.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Low stock */}
      <Card className="mt-6">
        <h3 className="mb-4 flex items-center gap-1.5 text-sm font-bold text-foreground"><AlertTriangle size={15} /> Low stock</h3>
        {s.low_stock.length === 0 ? (
          <p className="text-sm text-muted-foreground">All variants are well stocked.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 font-medium">Product</th><th className="py-2 font-medium">SKU</th><th className="py-2 text-right font-medium">Stock</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {s.low_stock.map((v) => (
                  <tr key={v.variant_id}>
                    <td className="py-2.5 font-medium text-foreground">{v.product_name}</td>
                    <td className="py-2.5 font-mono text-xs text-muted-foreground">{v.sku ?? '—'}</td>
                    <td className="py-2.5 text-right">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${v.stock === 0 ? 'bg-danger-tint text-danger' : 'bg-warning-tint text-warning'}`}>
                        {v.stock === 0 ? 'Out of stock' : `${v.stock} left`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </section>
  )
}

export default DashboardPage

// ── presentational helpers ───────────────────────────────────────────────────

function Kpi({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; accent?: boolean
}) {
  return (
    <div className="group rounded-2xl border border-border bg-white p-4 shadow-xs transition duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
      <div className="flex items-start justify-between">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
            accent ? 'bg-brand text-brand-foreground' : 'bg-brand-tint text-brand'
          }`}
        >
          {icon}
        </span>
        {accent && <span className="mt-1 h-2 w-2 animate-pulse rounded-full bg-brand" />}
      </div>
      <p className={`mt-3 text-2xl font-extrabold tracking-tight ${accent ? 'text-brand' : 'text-foreground'}`}>{value}</p>
      <p className="text-xs font-semibold text-foreground/70">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-white p-4 shadow-xs sm:p-5 ${className}`}>{children}</div>
  )
}
