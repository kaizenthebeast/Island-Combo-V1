"use client"

import * as React from "react"
import {
  Users, Package, ShoppingCart, Crown, Megaphone,
  LayoutDashboard, Tag, ListOrdered, Star,
  Percent, ImagePlay, ShieldAlert, ScrollText,
  Banknote, QrCode, Undo2,
} from "lucide-react"
import { NavMain } from "@/shared/components/admin/sidebar/NavMain"
import { NavUser } from "@/shared/components/admin/sidebar/NavUser"
import Image from "next/image"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail,
} from "@/shared/components/ui/sidebar"

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
      { title: "Banner Management", url: "#", icon: ImagePlay },
    ],
  },
  {
    // Admin-only audit log. The whole /admin area is already admin-gated by
    // proxy.ts, so every item here is implicitly admin-only.
    title: "Audit Logs",
    url: "/admin/audit/users",
    icon: ShieldAlert,
    items: [
      { title: "User Activity", url: "/admin/audit/users", icon: Users },
      { title: "Orders", url: "/admin/audit/orders", icon: ListOrdered },
      { title: "Products & Inventory", url: "/admin/audit/products", icon: Package },
      { title: "Payments", url: "/admin/audit/payments", icon: Banknote },
      { title: "Admin Actions", url: "/admin/audit/admins", icon: ScrollText },
    ],
  },
]

type User = {
  name: string
  email: string
  avatar: string
}

export function AppSidebar({ user, ...props }: { user: User } & React.ComponentProps<typeof Sidebar>) {
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
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}