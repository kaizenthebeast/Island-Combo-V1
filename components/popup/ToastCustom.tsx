// components/ui/toast-custom.tsx
import { toast } from "sonner"
import { CircleCheckIcon, OctagonXIcon, TriangleAlertIcon, InfoIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type ToastVariant = "success" | "error" | "warning" | "info"

const config = {
  success: {
    icon: CircleCheckIcon,
    bg: "bg-success-tint border-success/30",
    icon_color: "text-success",
    title_color: "text-success-text",
    desc_color: "text-success-text",
  },
  error: {
    icon: OctagonXIcon,
    bg: "bg-danger-tint border-danger/30",
    icon_color: "text-danger",
    title_color: "text-danger-text",
    desc_color: "text-danger-text",
  },
  warning: {
    icon: TriangleAlertIcon,
    bg: "bg-warning-tint border-warning/30",
    icon_color: "text-warning",
    title_color: "text-warning-text",
    desc_color: "text-warning-text",
  },
  info: {
    icon: InfoIcon,
    bg: "bg-info-tint border-info/30",
    icon_color: "text-info",
    title_color: "text-info-text",
    desc_color: "text-info-text",
  },
}

interface ToastOptions {
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

function showToast(variant: ToastVariant, { title, description, action }: ToastOptions) {
  const { icon: Icon, bg, icon_color, title_color, desc_color } = config[variant]

  toast.custom(() => (
    <div className={cn(
      "flex items-start gap-3 w-[356px] rounded-xl border px-4 py-3.5 shadow-xs",
      bg
    )}>
      <Icon className={cn("size-5 mt-0.5 shrink-0", icon_color)} />
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-semibold", title_color)}>{title}</p>
        {description && (
          <p className={cn("text-sm mt-0.5", desc_color)}>{description}</p>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className={cn("text-sm font-medium mt-1.5 underline underline-offset-2", icon_color)}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  ))
}

export const customToast = {
  success: (opts: ToastOptions) => showToast("success", opts),
  error:   (opts: ToastOptions) => showToast("error", opts),
  warning: (opts: ToastOptions) => showToast("warning", opts),
  info:    (opts: ToastOptions) => showToast("info", opts),
}