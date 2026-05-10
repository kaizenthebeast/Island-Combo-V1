import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebarServer } from "@/components/app-sidebar-server"


export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider >
      <AppSidebarServer />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}