"use client"

import * as React from "react"
import {
  Users, Package, ShoppingCart, Crown, Megaphone,
  LayoutDashboard, Tag, ListOrdered, Star,
  Percent, ImagePlay, ShieldAlert,
  Banknote, QrCode, Undo2,
} from "lucide-react"
import { NavMain } from "@/shared/components/admin/sidebar/NavMain"
import { NavUser } from "@/shared/components/admin/sidebar/NavUser"
import Image from "next/image"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail,
} from "@/shared/components/ui/sidebar"
import { canAccessAdminPath } from "@/shared/config/admin-rbac"

const navMain = [
  {
    title: "Dashboard",
    url: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Users",
    url: "/admin/users",
    icon: Users,
    isActive: true,
    items: [
      { title: "Customer", url: "/admin/users", icon: Users },
      { title: "Staff", url: "/admin/users/staff", icon: LayoutDashboard },
    ],
  },
  {
    title: "Products",
    url: "#",
    icon: Package,
    items: [
      { title: "Products", url: "/admin/products", icon: Package },
      { title: "Category", url: "/admin/products/category", icon: Tag },
    ],
  },
  {
    title: "Order",
    url: "/admin/orders",
    icon: ShoppingCart,
    items: [
      { title: "Order List", url: "/admin/orders", icon: ListOrdered },
      { title: "Refunds", url: "/admin/refunds", icon: Undo2 },
    ],
  },
  {
    title: "Cash Vouchers",
    url: "/admin/cash-vouchers/redeem",
    icon: Banknote,
    items: [
      { title: "Redeem", url: "/admin/cash-vouchers/redeem", icon: QrCode },
    ],
  },
  {
    title: "Customer Management",
    url: "#",
    icon: Crown,
    items: [
      { title: "Loyalty", url: "/admin/customer-management/loyalty", icon: Star },
    ],
  },
  {
    title: "Content Management",
    url: "#",
    icon: Megaphone,
    items: [
      { title: "Promo Codes", url: "/admin/content-management/promotional-codes", icon: Percent },
      { title: "Banner Management", url: "/admin/content-management/banner", icon: ImagePlay },
    ],
  },
  {
    // Single unified audit log; the per-entity split is now a Type filter
    // inside the page rather than separate nav items.
    title: "Audit Logs",
    url: "/admin/audit",
    icon: ShieldAlert,
  },
]

type User = {
  name: string
  email: string
  avatar: string
}

// Keep the nav in sync with route access (shared/config/admin-rbac.ts — the
// same policy the middleware enforces): drop sub-items the role can't open,
// and whole groups when nothing inside them survives. Hiding nav is UX only;
// the middleware and lib guards are the enforcement.
function navForRole(role: string | null) {
  return navMain
    .map((group) => {
      if (!group.items?.length) {
        return canAccessAdminPath(role, group.url) ? group : null
      }
      const items = group.items.filter((item) => canAccessAdminPath(role, item.url))
      return items.length ? { ...group, items } : null
    })
    .filter((group) => group !== null)
}

// Named userRole (not `role`) to avoid colliding with the ARIA role attribute
// in the underlying Sidebar div props.
export function AppSidebar({ user, userRole, ...props }: { user: User; userRole: string | null } & React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center group-data-[collapsible=icon]:justify-center">
          <Image
            src='/images/logo.png'
            alt="island combo logo"
            width={45}
            height={45}
            className="size-[45px] shrink-0 group-data-[collapsible=icon]:size-7"
          />
          <h1 className="ms-3 font-bold group-data-[collapsible=icon]:hidden">ISLAND COMBO</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navForRole(userRole)} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}