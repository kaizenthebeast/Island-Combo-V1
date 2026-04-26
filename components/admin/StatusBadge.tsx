// StatusBadge.tsx
// A small colored pill that shows a status label with a dot indicator.
//
// Props:
//   status   — the text shown inside the badge (e.g. "Active", "Pending")
//   variant  — controls the color scheme
//
// Usage:
//   <StatusBadge status="Active"       variant="success" />
//   <StatusBadge status="Low Stock"    variant="warning" />
//   <StatusBadge status="Out of Stock" variant="danger"  />
//   <StatusBadge status="Draft"        variant="default" />
//   <StatusBadge status="In Review"    variant="info"    />

import React from 'react'

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default'

interface StatusBadgeProps {
  /** Text displayed inside the badge */
  status: string
  /** Color scheme of the badge */
  variant: BadgeVariant
  className?: string
}

const STYLES: Record<BadgeVariant, { pill: string; dot: string }> = {
  success: { pill: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' },
  warning: { pill: 'bg-amber-50  text-amber-700  border border-amber-200',    dot: 'bg-amber-500'  },
  danger:  { pill: 'bg-red-50    text-red-600    border border-red-200',       dot: 'bg-red-400'   },
  info:    { pill: 'bg-blue-50   text-blue-700   border border-blue-200',      dot: 'bg-blue-500'  },
  default: { pill: 'bg-slate-100 text-slate-600  border border-slate-200',     dot: 'bg-slate-400' },
}

export function StatusBadge({ status, variant, className = '' }: StatusBadgeProps) {
  const { pill, dot } = STYLES[variant]

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${pill} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-none ${dot}`} />
      {status}
    </span>
  )
}

export default StatusBadge