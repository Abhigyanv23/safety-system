"use client"

import { useWorkers, resolveSnapshotUrl } from "../context/WorkerContext"

function formatTime(timestamp: string) {
  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return "--"
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function formatDate(timestamp: string) {
  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return "--"
  }

  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function getSeverityClasses(severity: string) {
  switch (severity.toUpperCase()) {
    case "CRITICAL":
      return "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/50"

    case "HIGH":
      return "bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/50"

    case "WARNING":
    case "MEDIUM":
      return "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/50"

    case "LOW":
      return "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/50"

    default:
      return "bg-gray-200 dark:bg-slate-700/50 text-gray-700 dark:text-slate-300 border-gray-300 dark:border-slate-600"
  }
}

interface AlertsTableProps {
  selectedDate?: string;
}

export default function AlertsTable({ selectedDate }: AlertsTableProps) {
  const { events } = useWorkers()

  const filteredEvents = events.filter((event) => {
    if (!selectedDate) return true
    const d = new Date(event.timestamp)
    if (Number.isNaN(d.getTime())) return false
    
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return dateStr === selectedDate
  })

  return (
    <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xl flex flex-col min-w-0 max-h-[600px]">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex justify-between items-center mb-5 gap-4">

        <div className="min-w-0">
          <h2 className="text-lg font-bold text-black dark:text-white">
            Event History
          </h2>

          <p className="text-xs text-gray-500 dark:text-slate-500 mt-1 uppercase tracking-widest">
            {selectedDate ? `Showing events for ${selectedDate}` : "Newest events first"}
          </p>
        </div>

        <span className="shrink-0 text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 px-2 py-1 rounded border border-gray-200 dark:border-slate-700 uppercase tracking-widest">
          Socket.IO / DB
        </span>

      </div>

      {/* =====================================================
          TABLE
      ===================================================== */}

      <div className="overflow-x-auto overflow-y-auto flex-1 min-w-0 pr-2 custom-scrollbar">

        <table className="w-full text-left text-gray-700 dark:text-gray-300 min-w-[720px]">

          <thead className="sticky top-0 bg-white dark:bg-[#111827] z-10 shadow-[0_1px_0_0_#e5e7eb] dark:shadow-[0_1px_0_0_#374151]">
            <tr className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">

              <th className="py-3 pr-4">
                Event
              </th>

              <th className="py-3 pr-4">
                Worker
              </th>

              <th className="py-3 pr-4">
                Severity
              </th>

              <th className="py-3 pr-4">
                Impact
              </th>

              <th className="py-3 pr-4">
                Confidence
              </th>

              <th className="py-3 pr-4">
                Time
              </th>

              <th className="py-3">
                Snapshot
              </th>

            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">

            {/* =================================================
                EMPTY STATE
            ================================================= */}

            {filteredEvents.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-10 text-center text-gray-400 dark:text-slate-500 italic text-sm"
                >
                  No events recorded for this date.
                </td>
              </tr>
            ) : (

              /* =================================================
                 EVENTS
              ================================================= */

              filteredEvents.map((event) => {

                const snapshotUrl = resolveSnapshotUrl(
                  event.snapshot
                )

                return (
                  <tr
                    key={event.id}
                    className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >

                    {/* EVENT */}
                    <td className="py-3 pr-4">
                      <span className="font-bold text-black dark:text-white">
                        {event.type}
                      </span>
                    </td>

                    {/* WORKER */}
                    <td className="py-3 pr-4">
                      <span className="font-mono text-sm text-blue-600 dark:text-blue-400">
                        {event.workerId}
                      </span>
                    </td>

                    {/* SEVERITY */}
                    <td className="py-3 pr-4">

                      <span
                        className={`
                          inline-flex
                          items-center
                          px-2
                          py-1
                          rounded
                          text-[10px]
                          font-black
                          uppercase
                          border
                          whitespace-nowrap
                          ${getSeverityClasses(event.severity)}
                        `}
                      >
                        {event.severity}
                      </span>

                    </td>

                    {/* IMPACT */}
                    <td className="py-3 pr-4 text-sm font-mono whitespace-nowrap">

                      {event.impact_g != null
                        ? `${event.impact_g.toFixed(2)} g`
                        : "--"}

                    </td>

                    {/* CONFIDENCE */}
                    <td className="py-3 pr-4 text-sm font-mono whitespace-nowrap">

                      {event.confidence != null
                        ? `${event.confidence.toFixed(2)}%`
                        : "--"}

                    </td>

                    {/* TIME */}
                    <td className="py-3 pr-4 whitespace-nowrap">

                      <div className="text-xs text-gray-600 dark:text-slate-300 font-mono">
                        {formatTime(event.timestamp)}
                      </div>

                      <div className="text-[10px] text-gray-400 dark:text-slate-600 font-mono mt-0.5">
                        {formatDate(event.timestamp)}
                      </div>

                    </td>

                    {/* SNAPSHOT */}
                    <td className="py-3">

                      {snapshotUrl ? (
                        <button
                          type="button"
                          onClick={() => {
                            window.open(
                              snapshotUrl,
                              "_blank",
                              "noopener,noreferrer"
                            )
                          }}
                          className="
                            text-blue-600
                            dark:text-blue-400
                            hover:text-blue-500
                            dark:hover:text-blue-300
                            text-xs
                            font-semibold
                            transition-colors
                          "
                        >
                          View
                        </button>
                      ) : (
                        <span className="text-gray-400 dark:text-slate-600 text-xs">
                          --
                        </span>
                      )}

                    </td>

                  </tr>
                )
              })
            )}

          </tbody>

        </table>

      </div>

      {/* =====================================================
          EVENT COUNT
      ===================================================== */}

      {filteredEvents.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-slate-800 flex justify-between items-center">

          <span className="text-[10px] text-gray-400 dark:text-slate-600 uppercase tracking-widest">
            Recorded Events (Filtered)
          </span>

          <span className="text-xs font-mono text-gray-500 dark:text-slate-400">
            {filteredEvents.length}
          </span>

        </div>
      )}

    </div>
  )
}