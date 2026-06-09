import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/shared/components/admin/sidebar/AppSidebar"

export async function AppSidebarServer({ ...props }: Omit<React.ComponentProps<typeof AppSidebar>, "user">) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  const email = data?.claims?.email ?? ""
  const user = {
    name: email.split("@")[0] || "Admin",
    email,
    avatar: "",
  }

  return <AppSidebar user={user} {...props} />
}