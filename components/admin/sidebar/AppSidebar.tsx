"use client"

import * as React from "react"
import {
  Users, Package, ShoppingCart, Crown, Megaphone,
  LayoutDashboard, Tag, ListOrdered, Star,
  Percent, ImagePlay, ShieldAlert, ScrollText,
  Banknote, QrCode,
} from "lucide-react"
import { NavMain } from "@/components/admin/sidebar/NavMain"
import { NavUser } from "@/components/admin/sidebar/NavUser"
import Image from "next/image"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail,
} from "@/components/ui/sidebar"

const navMain = [
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
      {
        title: "Security Audit",
        url: "#",
        icon: ShieldAlert,
        items: [
          { title: "Logs", url: "#", icon: ScrollText },
        ],
      },
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