/** Admin analytics dashboard (public.admin_dashboard_stats RPC). */
export type DashboardStats = {
  revenue: { total: number; last_30_days: number; today: number }
  orders: { total: number; today: number; pending_fulfillment: number; aov: number }
  customers: { total: number; new_30_days: number }
  refunds_pending: number
  by_status: { status: string; count: number }[]
  revenue_series: { date: string; revenue: number }[]
  top_products: { name: string; qty: number; revenue: number }[]
  low_stock: { variant_id: number; sku: string | null; product_name: string; stock: number }[]
  vouchers: { active: number; active_value: number }
}
