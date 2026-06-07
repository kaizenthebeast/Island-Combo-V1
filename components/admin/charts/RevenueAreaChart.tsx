'use client'
/** Tremor-style revenue area chart (Recharts engine, brand-themed). */
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const BRAND = '#900036'
const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

type Point = { date: string; revenue: number }

export default function RevenueAreaChart({ data }: { data: Point[] }) {
  const chartData = data.map((d) => ({
    label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: Number(d.revenue),
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={BRAND} stopOpacity={0.3} />
            <stop offset="95%" stopColor={BRAND} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd"
          tick={{ fontSize: 11, fill: '#9ca3af' }} />
        <YAxis tickLine={false} axisLine={false} width={52} tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickFormatter={(v) => money(Number(v))} />
        <Tooltip
          formatter={(v) => [money(Number(v)), 'Revenue']}
          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
          labelStyle={{ fontSize: 12, fontWeight: 600 }}
        />
        <Area type="monotone" dataKey="revenue" stroke={BRAND} strokeWidth={2} fill="url(#revFill)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
