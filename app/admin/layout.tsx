// app/(admin)/layout.tsx
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider >
      <AppSidebar />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}