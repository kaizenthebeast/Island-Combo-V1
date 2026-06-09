import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/shared/components/ui/sidebar"
import { AppSidebarServer } from "@/shared/components/admin/sidebar/AppSidebarServer"


export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider >
      <AppSidebarServer />
      <SidebarInset className="min-w-0">
        <header className="flex h-12 items-center gap-2 border-b px-3">
          <SidebarTrigger />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}