"use client"

import { useWorkers } from "../context/WorkerContext"

interface StatusPillProps {
  ok: boolean
  onlineLabel?: string
  offlineLabel?: string
}

function StatusPill({
  ok,
  onlineLabel = "ONLINE",
  offlineLabel = "OFFLINE",
}: StatusPillProps) {
  return (
    <span
      className={`shrink-0 whitespace-nowrap px-2 py-1 rounded-md text-[10px] font-black border ${
        ok
          ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
          : "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/30"
      }`}
    >
      {ok ? onlineLabel : offlineLabel}
    </span>
  )
}

export default function SensorStatusPanel({ workerId }: { workerId: string }) {
  const { workers } = useWorkers()

  const worker = workers.find((w) => w.id === workerId) || workers[0]

  if (!worker) return null

  const isSimulated = worker.id !== "W01"

  const sensors = [
    {
      name: "MAX30102",
      ok: isSimulated 
        ? false 
        : worker.health?.status === "LIVE" || worker.health?.status === "FINGER_REMOVED",
    },
    {
      name: "DHT11",
      ok: isSimulated 
        ? false 
        : worker.environment?.status === "LIVE",
    },
    {
      name: "OV5647",
      ok: isSimulated 
        ? false 
        : worker.camera?.status === "ONLINE",
    },
    {
      name: "MPU6050",
      ok: isSimulated 
        ? false 
        : !!worker.safety,
    },
  ]

  return (
    <div className="w-full min-w-0 bg-white dark:bg-[#111827] p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-lg overflow-hidden">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-black dark:text-white truncate">
            System & Sensor Status
          </h2>

          <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
            Raspberry Pi 5 hardware health
          </p>
        </div>

        <StatusPill
          // Assumes worker.status tracks overall connection activity for the Pi
          ok={isSimulated ? false : worker.status === "active" || worker.status === "online" || !!worker.system?.piOnline}
          onlineLabel="PI ONLINE"
          offlineLabel="PI OFFLINE"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sensors.map((sensor) => (
          <div
            key={sensor.name}
            className="min-w-0 bg-gray-100 dark:bg-slate-800/60 rounded-xl p-4 border border-gray-200 dark:border-slate-700 flex items-center justify-between gap-3"
          >
            <span
              className="min-w-0 truncate text-sm font-semibold text-gray-700 dark:text-slate-200"
              title={sensor.name}
            >
              {sensor.name}
            </span>

            <StatusPill ok={sensor.ok} />
          </div>
        ))}
      </div>

      <div className="mt-4 bg-gray-100 dark:bg-slate-800/60 rounded-xl p-4 border border-gray-200 dark:border-slate-700 flex items-center justify-between gap-4">
        <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
          Storage
        </span>

        <span className="shrink-0 text-lg font-black text-blue-600 dark:text-blue-400">
          {isSimulated || worker.system?.storageFreePercent == null
            ? "--"
            : `${worker.system.storageFreePercent}% free`}
        </span>
      </div>
    </div>
  )
}