'use client'
/** Tremor-style order-status donut (Recharts engine, brand palette). */
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

// Brand scale (matches globals.css brand 500→100) + neutrals for terminal states.
const COLORS = ['#900036', '#d13061', '#f06b92', '#f7a8c4', '#ffd6e2', '#9ca3af', '#cbd5e1']

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending', paid: 'Paid', shipped: 'Shipped', out_for_delivery: 'Out for delivery',
  delivered: 'Delivered', completed: 'Completed', cancelled: 'Cancelled',
}

type Slice = { status: string; count: number }

export default function StatusDonut({ data }: { data: Slice[] }) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">No orders yet.</p>
  const chartData = data.map((d) => ({ name: STATUS_LABEL[d.status] ?? d.status, value: d.count }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={88} paddingAngle={2} stroke="none">
          {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip
          formatter={(v, n) => [`${v} orders`, n]}
          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
        />
        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
