import { createClient } from "@/shared/lib/db/server"
import { AppSidebar } from "@/shared/components/admin/sidebar/AppSidebar"

export async function AppSidebarServer({ ...props }: Omit<React.ComponentProps<typeof AppSidebar>, "user" | "userRole">) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  const email = data?.claims?.email ?? ""
  const user = {
    name: email.split("@")[0] || "Admin",
    email,
    avatar: "",
  }

  // Role drives which nav sections render (same policy the middleware
  // enforces). Claim first; DB fallback mirrors requireStaff for tokens
  // issued before the custom-access-token hook was enabled.
  let role: string | null = (data?.claims?.user_role as string | undefined) ?? null
  if (!role && data?.claims?.sub) {
    const { data: profile } = await supabase
      .from("profile")
      .select("role")
      .eq("user_id", data.claims.sub)
      .single()
    role = profile?.role ?? null
  }

  return <AppSidebar user={user} userRole={role} {...props} />
}
