// components/ui/toast-custom.tsx
import { toast } from "sonner"
import { CircleCheckIcon, OctagonXIcon, TriangleAlertIcon, InfoIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type ToastVariant = "success" | "error" | "warning" | "info"

const config = {
  success: {
    icon: CircleCheckIcon,
    bg: "bg-green-50 border-green-200",
    icon_color: "text-green-600",
    title_color: "text-green-900",
    desc_color: "text-green-700",
  },
  error: {
    icon: OctagonXIcon,
    bg: "bg-red-50 border-red-200",
    icon_color: "text-red-600",
    title_color: "text-red-900",
    desc_color: "text-red-700",
  },
  warning: {
    icon: TriangleAlertIcon,
    bg: "bg-amber-50 border-amber-200",
    icon_color: "text-amber-600",
    title_color: "text-amber-900",
    desc_color: "text-amber-700",
  },
  info: {
    icon: InfoIcon,
    bg: "bg-blue-50 border-blue-200",
    icon_color: "text-blue-600",
    title_color: "text-blue-900",
    desc_color: "text-blue-700",
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
      "flex items-start gap-3 w-[356px] rounded-xl border px-4 py-3.5 shadow-sm",
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