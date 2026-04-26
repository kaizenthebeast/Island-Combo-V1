"use client"

import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

// This is sample data.
const data = {
  user: {
    name: "testing phase",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },

  navMain: [
    {
      title: "Users",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "Active Customer",
          url: "#",
        },
        {
          title: "Staff",
          url: "#",
        },
      ],
    },
    {
      title: "Products",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "Discount",
          url: "#",
        },
        {
          title: "Event",
          url: "#",
        },
        {
          title: "Wholesale",
          url: "#",
        },
      ],
    },
    {
      title: "Orders",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Pending",
          url: "#",
        },
        {
          title: "Preparing",
          url: "#",
        },
        {
          title: "Delivered",
          url: "#",
        },
        {
          title: "Completed",
          url: "#",
        },
      ],
    },
    {
      title: "Revenue ",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "Sales",
          url: "#",
        },
      ],
    },
  ],
 
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="none" className="bg-[#900036] text-white"{...props}>
      <SidebarHeader>
        <h1 className="ms-3 font-bold">ISLAND COMBO</h1>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
