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

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'error' | 'info' | 'default'

interface StatusBadgeProps {
  /** Text displayed inside the badge */
  status: string
  /** Color scheme of the badge */
  variant: BadgeVariant
  className?: string
}

const STYLES: Record<BadgeVariant, { pill: string; dot: string }> = {
  success: { pill: 'bg-success-tint text-success border border-success/30', dot: 'bg-success' },
  warning: { pill: 'bg-warning-tint  text-warning  border border-warning/30',    dot: 'bg-warning'  },
  danger:  { pill: 'bg-danger-tint    text-danger    border border-danger/30',       dot: 'bg-danger'   },
  error:   { pill: 'bg-danger-tint    text-danger    border border-danger/30',       dot: 'bg-danger'   },
  info:    { pill: 'bg-info-tint   text-info   border border-info/30',      dot: 'bg-info'  },
  default: { pill: 'bg-muted text-muted-foreground  border border-border',     dot: 'bg-muted' },
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