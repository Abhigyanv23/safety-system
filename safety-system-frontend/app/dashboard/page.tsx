"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { useWorkers } from "../../context/WorkerContext"

import Sidebar from "../../components/Sidebar"
import Navbar from "../../components/Navbar"
import StatCard from "../../components/Statcard"
import AlertsTable from "../../components/AlertsTable"
import LiveChart from "../../components/LiveChart"
import SiteMap from "../../components/SiteMap"
import ActivityFeed from "../../components/ActivityFeed"
import SupervisorPanel from "../../components/SupervisorPanel"
import AlertPopup from "../../components/AlertPopup"
import WorkerModal from "../../components/WorkerModal"

import TelemetryCards from "../../components/TelemetryCards"
import SensorStatusPanel from "../../components/SensorStatusPanel"
import CameraPanel from "../../components/CameraPanel"

export default function Dashboard() {
  const router = useRouter()

  const {
    workers,
    events,
    connectionState,
    emergencyActive,
    stopAlarm,
    soundEnabled,
  } = useWorkers()

  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null)
  
  // Lifted state for the Active Telemetry View dropdown
  const [activeTelemetryId, setActiveTelemetryId] = useState("W01")

  // Initialize selectedDate to local today (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })

  useEffect(() => {
    const role = localStorage.getItem("role")
    if (!role) {
      router.push("/login")
    }
  }, [router])

  const activeWorkers = workers.filter((worker) => worker.active)

  const activeAlerts = workers.filter(
    (worker) =>
      worker.active &&
      (worker.status === "warning" || worker.status === "alert" || worker.status === "critical")
  )

  // Filter falls based on the selected date
  const fallsOnDate = events.filter((event) => {
    if (event.type !== "FALL") return false
    const d = new Date(event.timestamp)
    if (Number.isNaN(d.getTime())) return false
    
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return dateStr === selectedDate
  }).length

  useEffect(() => {
    const siren = document.getElementById("emergency-siren") as HTMLAudioElement | null
    if (!siren) return

    if (emergencyActive && soundEnabled) {
      siren.play().catch(() => {})
    } else {
      siren.pause()
      siren.currentTime = 0
    }
  }, [emergencyActive, soundEnabled])

  return (
    <div className="min-h-screen flex bg-white dark:bg-[#0b1220] text-black dark:text-white font-sans">
      <audio id="emergency-siren" src="/alarm.wav" loop className="hidden" />

      {emergencyActive && (
        <div className="fixed inset-0 pointer-events-none z-[9999] animate-pulse">
          <div className="absolute inset-0 border-[12px] border-red-600/40 blur-sm" />
          <div className="absolute inset-0 border-[4px] border-red-500" />
          <div className="absolute inset-0 bg-red-900/5" />
        </div>
      )}

      <AlertPopup />

      {selectedWorkerId && (
        <WorkerModal
          workerId={selectedWorkerId}
          onClose={() => setSelectedWorkerId(null)}
        />
      )}

      <Sidebar />

      <div className="flex-1 min-h-screen min-w-0">
        <Navbar />

        <main className="w-full min-w-0 px-5 sm:px-6 lg:px-8 pt-28 pb-10">
          <div className="w-full max-w-[1440px] mx-auto min-w-0">

            <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 border-b border-gray-200 dark:border-slate-800 pb-6">
              <div className="min-w-0">
                <p className="text-xs font-black text-blue-500 dark:text-blue-400 uppercase tracking-[0.25em]">
                  Worker Safety Command Center
                </p>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-2 text-black dark:text-white">
                  Site Overview
                </h2>
                <p className="text-gray-500 dark:text-slate-400 mt-2 text-sm">
                  Real-time health, environment, safety and hardware telemetry
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`px-3 py-2 rounded-lg border text-xs font-black uppercase whitespace-nowrap ${
                    connectionState === "ONLINE"
                      ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                      : connectionState === "CONNECTING"
                      ? "text-yellow-600 dark:text-yellow-400 border-yellow-500/30 bg-yellow-500/10"
                      : "text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/10"
                  }`}
                >
                  {connectionState}
                </span>

                {emergencyActive && (
                  <button
                    type="button"
                    onClick={stopAlarm}
                    className="px-5 py-2.5 rounded-lg font-bold border transition-all whitespace-nowrap bg-red-600 border-red-500 text-white hover:bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.35)]"
                  >
                    Silence Siren
                  </button>
                )}
              </div>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-6">
              <StatCard title="Active Workers" value={activeWorkers.length.toString()} color="text-blue-600 dark:text-blue-400" />
              <StatCard title="Active Alerts" value={activeAlerts.length.toString()} color="text-yellow-600 dark:text-yellow-400" />
              <StatCard title="Recorded Falls" value={fallsOnDate.toString()} color="text-red-600 dark:text-red-500" />
            </section>

            {/* Global Selectors */}
            <section className="mt-6 flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-800 gap-4">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Active Telemetry View
                </h2>
                <select
                  value={activeTelemetryId}
                  onChange={(e) => setActiveTelemetryId(e.target.value)}
                  className="bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-700 rounded px-4 py-2 focus:outline-none focus:border-blue-500 font-bold cursor-pointer min-w-[200px]"
                >
                  {workers.length > 0 ? (
                    workers.map((w) => (
                      <option key={w.id} value={w.id} className="bg-white dark:bg-slate-800">
                        Worker {w.id} {w.id === "W01" ? "(Hardware)" : "(Simulated)"}
                      </option>
                    ))
                  ) : (
                    <option value={activeTelemetryId}>Worker {activeTelemetryId}</option>
                  )}
                </select>
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Date Filter
                </h2>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-700 rounded px-4 py-2 focus:outline-none focus:border-blue-500 font-bold cursor-pointer w-full sm:w-auto"
                />
              </div>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)] gap-6 mt-6 items-start">
              <div className="min-w-0">
                <TelemetryCards workerId={activeTelemetryId} />
              </div>
              <div className="min-w-0 space-y-6">
                <CameraPanel workerId={activeTelemetryId} />
                <SensorStatusPanel workerId={activeTelemetryId} />
              </div>
            </section>

            {/* Pass selectedDate to the historical logs/charts */}
            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6 items-stretch">
              <div className="min-w-0"><AlertsTable selectedDate={selectedDate} /></div>
              <div className="min-w-0"><LiveChart selectedDate={selectedDate} /></div>
            </section>

            <section className="mt-6 min-w-0">
              <SiteMap onWorkerClick={setSelectedWorkerId} />
            </section>

            <section className="mt-6 min-w-0">
              <ActivityFeed />
            </section>

            <section className="mt-6 min-w-0">
              <SupervisorPanel />
            </section>

          </div>
        </main>
      </div>
    </div>
  )
}