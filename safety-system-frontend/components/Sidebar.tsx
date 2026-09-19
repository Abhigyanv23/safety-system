"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Settings
} from "lucide-react"

export default function Sidebar() {
  const pathname = usePathname()

  const linkClass = (path: string) =>
    `flex items-center gap-3 p-3 rounded-lg transition-all ${
      pathname === path
        ? "bg-blue-600 text-white"
        : "hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
    }`

  return (
    <aside className="sticky top-0 h-screen w-72 shrink-0 bg-gray-100 dark:bg-[#111827] p-6 border-r border-gray-300 dark:border-gray-700 z-50 flex flex-col">
      {/* Logo / Title */}
      <h2 className="text-xl font-bold mb-10 text-black dark:text-white">
        Safety System
      </h2>

      {/* Navigation */}
      <nav className="space-y-4 flex-1">
        <Link href="/dashboard" className={linkClass("/dashboard")}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>

        <Link href="/workers" className={linkClass("/workers")}>
          <Users size={20} />
          <span>Workers</span>
        </Link>

        <Link href="/settings" className={linkClass("/settings")}>
          <Settings size={20} />
          <span>Settings</span>
        </Link>
      </nav>
    </aside>
  )
}