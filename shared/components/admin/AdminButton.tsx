// AdminButton.tsx
// A styled button for admin interfaces. Supports multiple visual variants and sizes.
//
// Props:
//   label     — button text
//   onClick   — click handler
//   variant   — visual style: 'primary' | 'secondary' | 'danger' | 'ghost'
//   size      — 'sm' | 'md' | 'lg'
//   icon      — optional React node rendered before the label (e.g. an SVG icon)
//   disabled  — disables the button
//   type      — HTML button type (defaults to "button")
//
// Usage:
//   <AdminButton label="Add Product"  variant="primary"   onClick={handleAdd}    />
//   <AdminButton label="Export CSV"   variant="secondary" onClick={handleExport}  />
//   <AdminButton label="Delete"       variant="danger"    onClick={handleDelete}  />
//   <AdminButton label="View details" variant="ghost"     onClick={handleView}    />
//   <AdminButton label="Save"         variant="primary"   size="sm" icon={<SaveIcon />} />

import React from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize    = 'sm' | 'md' | 'lg'

interface AdminButtonProps {
  /** Text displayed on the button */
  label: string
  /** Click handler */
  onClick?: () => void
  /** Visual style of the button */
  variant?: ButtonVariant
  /** Size of the button */
  size?: ButtonSize
  /** Optional icon rendered to the left of the label */
  icon?: React.ReactNode
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  className?: string
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    'text-primary-foreground shadow-xs hover:shadow-md active:scale-95'
    + ' bg-primary hover:bg-primary/90',

  secondary:
    'bg-white text-foreground border border-border'
    + ' hover:bg-muted hover:border-border active:scale-95',

  danger:
    'bg-white text-danger border border-danger/30'
    + ' hover:bg-danger-tint hover:border-danger/30 active:scale-95',

  ghost:
    'bg-transparent text-muted-foreground'
    + ' hover:bg-muted hover:text-foreground active:scale-95',
}

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'h-7  px-3   text-xs  gap-1.5 rounded-lg',
  md: 'h-9  px-4   text-sm  gap-2   rounded-xl',
  lg: 'h-11 px-5   text-sm  gap-2   rounded-xl',
}

const DISABLED_STYLES = 'opacity-40 pointer-events-none'

export function AdminButton({
  label,
  onClick,
  variant  = 'primary',
  size     = 'md',
  icon,
  disabled = false,
  type     = 'button',
  className = '',
}: AdminButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center font-medium
        transition-all duration-150 select-none whitespace-nowrap
        ${VARIANT_STYLES[variant]}
        ${SIZE_STYLES[size]}
        ${disabled ? DISABLED_STYLES : ''}
        ${className}
      `}
    >
      {icon && <span className="flex-none w-4 h-4">{icon}</span>}
      {label}
    </button>
  )
}

export default AdminButton