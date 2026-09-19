"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useWorkers } from "../context/WorkerContext"
import ThemeToggle from "./ThemeToggle"

export default function Navbar() {
  const router = useRouter()
  const { workers, connectionState, notificationsEnabled } = useWorkers()

  const [showNotifications, setShowNotifications] = useState(false)

  const alerts = workers.filter((worker) => worker.status !== "safe")
  const alertCount = alerts.length

  const handleLogout = () => {
    localStorage.removeItem("role")
    router.push("/login")
  }

  const connectionColor = connectionState === "ONLINE" ? "text-emerald-600 dark:text-emerald-400" : connectionState === "CONNECTING" ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"
  const connectionDot = connectionState === "ONLINE" ? "bg-emerald-500" : connectionState === "CONNECTING" ? "bg-yellow-400" : "bg-red-500"

  return (
    <header className="fixed top-0 left-72 right-0 h-20 z-50 bg-white dark:bg-[#111827] border-b border-gray-200 dark:border-slate-800 shadow-md">
      <div className="h-full w-full px-6 lg:px-8 flex items-center justify-between gap-6">

        <h1 className="min-w-0 truncate text-xl font-bold text-black dark:text-white tracking-wide">
          Construction Site Monitor
        </h1>

        <div className="flex items-center gap-5 shrink-0">
          <ThemeToggle />

          <div className="relative">
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => setShowNotifications((current) => !current)}
              className="relative flex items-center justify-center p-2 cursor-pointer hover:scale-110 transition-transform"
            >
              <span className="text-xl">🔔</span>

              {notificationsEnabled && alertCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold animate-bounce shadow-[0_0_8px_rgba(239,68,68,0.6)]">
                  {alertCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute top-12 right-0 w-80 bg-white dark:bg-[#1f2937] border border-gray-200 dark:border-slate-600 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.25)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden z-[60]">
                <div className="px-4 py-3 flex items-center justify-between bg-gray-100 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                  <h3 className="text-sm font-bold text-black dark:text-white">Active Notifications</h3>
                  <span className="px-2 py-1 rounded-full bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300 text-[10px] font-bold">
                    {alertCount} New
                  </span>
                </div>

                <div className="max-h-[300px] overflow-y-auto">
                  {alertCount === 0 ? (
                    <div className="p-6 text-center text-gray-500 dark:text-slate-400 text-sm font-medium">
                      All workers are currently safe.
                    </div>
                  ) : (
                    alerts.map((worker) => {
                      const isCritical = worker.status === "critical"
                      return (
                        <div key={worker.id} className="flex items-start gap-3 p-4 border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer">
                          <div className={`mt-1.5 w-2.5 h-2.5 shrink-0 rounded-full ${isCritical ? `bg-red-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.8)]` : `bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.8)]`}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-black dark:text-white">{isCritical ? "CRITICAL ALERT" : "WARNING"}</p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                              <span className="text-gray-700 dark:text-slate-300 font-semibold">{worker.name} ({worker.id})</span> has triggered a system alert and requires attention.
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-800/50">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 animate-pulse shadow-[0_0_8px_currentColor] ${connectionDot}`} />
            <span className={`${connectionColor} text-xs font-bold tracking-widest uppercase`}>{connectionState}</span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="px-6 py-2 rounded-lg bg-red-600 border border-red-500 text-sm font-bold text-white hover:bg-red-500 transition-all shadow-[0_0_10px_rgba(220,38,38,0.3)] hover:shadow-[0_0_15px_rgba(220,38,38,0.5)]"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}