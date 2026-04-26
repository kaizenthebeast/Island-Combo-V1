// PageHeader.tsx
// A page-level header with an optional eyebrow label, title, subtitle, and action buttons.
// Renders AdminButton components for each action passed in.
//
// Props:
//   title     — main heading (required)
//   eyebrow   — small all-caps label shown above the title with a green dot
//   subtitle  — muted description shown below the title
//   actions   — buttons on the right side, each with { label, onClick, variant?, size?, icon? }
//
// Usage:
//   <PageHeader
//     eyebrow="Catalog"
//     title="Products"
//     subtitle="Manage your inventory"
//     actions={[
//       { label: 'Export',      onClick: handleExport, variant: 'secondary' },
//       { label: 'Add Product', onClick: handleAdd,    variant: 'primary'   },
//     ]}
//   />

import React from 'react'
import { AdminButton, ButtonVariant, ButtonSize } from './AdminButton'

interface PageHeaderAction {
  /** Button label */
  label: string
  onClick: () => void
  variant?:  ButtonVariant
  size?:     ButtonSize
  icon?:     React.ReactNode
  disabled?: boolean
}

interface PageHeaderProps {
  /** Main page title */
  title: string
  /** Small all-caps label above the title (shows a green dot beside it) */
  eyebrow?: string
  /** Muted line below the title */
  subtitle?: string
  /** Buttons rendered on the right side of the header */
  actions?: PageHeaderAction[]
  className?: string
}

export function PageHeader({ title, eyebrow, subtitle, actions = [], className = '' }: PageHeaderProps) {
  return (
    <div className={`flex items-start justify-between mb-8 ${className}`}>

      {/* ── Left: text block ── */}
      <div>
        {eyebrow && (
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-none" />
            <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">
              {eyebrow}
            </span>
          </div>
        )}

        <h1
          className="text-3xl font-bold text-slate-900"
          style={{ letterSpacing: '-0.02em' }}
        >
          {title}
        </h1>

        {subtitle && (
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        )}
      </div>

      {/* ── Right: action buttons ── */}
      {actions.length > 0 && (
        <div className="flex items-center gap-2 flex-shrink-0 mt-1">
          {actions.map(action => (
            <AdminButton
              key={action.label}
              label={action.label}
              onClick={action.onClick}
              variant={action.variant  ?? 'primary'}
              size={action.size        ?? 'md'}
              icon={action.icon}
              disabled={action.disabled}
            />
          ))}
        </div>
      )}

    </div>
  )
}

export default PageHeader