"use client"

import { useState } from "react"
import Sidebar from "../../components/Sidebar"
import Navbar from "../../components/Navbar"
import { useWorkers, resolveSnapshotUrl } from "../../context/WorkerContext"

function formatTime(timestamp: string) {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return "--"
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function formatDate(timestamp: string) {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return "--"
  return date.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" })
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

export default function WorkersPage() {
  const { workers, toggleWorker } = useWorkers()
  const [logModalWorkerId, setLogModalWorkerId] = useState<string | null>(null)

  const selectedWorker = logModalWorkerId 
    ? workers.find(w => w.id === logModalWorkerId) 
    : null

  return (
    <div className="flex bg-white dark:bg-[#0b1220] min-h-screen text-black dark:text-white">

      {/* Logs Table Modal */}
      {selectedWorker && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#111827] w-full max-w-5xl rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 flex flex-col max-h-[85vh] min-h-[50vh]">
            
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h2 className="text-xl font-bold">Event Logs</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  Historical records for {selectedWorker.name} ({selectedWorker.id})
                </p>
              </div>
              <button 
                onClick={() => setLogModalWorkerId(null)}
                className="text-gray-400 hover:text-white text-3xl leading-none font-bold p-2"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <table className="w-full text-left text-gray-700 dark:text-gray-300 min-w-[720px]">
                <thead className="sticky top-0 bg-white dark:bg-[#111827] z-10 shadow-[0_1px_0_0_#e5e7eb] dark:shadow-[0_1px_0_0_#374151]">
                  <tr className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <th className="py-3 pr-4">Event</th>
                    <th className="py-3 pr-4">Severity</th>
                    <th className="py-3 pr-4">Impact</th>
                    <th className="py-3 pr-4">Confidence</th>
                    <th className="py-3 pr-4">Time</th>
                    <th className="py-3">Snapshot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {selectedWorker.events.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-gray-400 dark:text-slate-500 italic text-sm">
                        No events recorded for this worker.
                      </td>
                    </tr>
                  ) : (
                    selectedWorker.events.map((event) => {
                      const snapshotUrl = resolveSnapshotUrl(event.snapshot)
                      return (
                        <tr key={event.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                          <td className="py-3 pr-4 font-bold text-black dark:text-white">
                            {event.type}
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase border whitespace-nowrap ${getSeverityClasses(event.severity)}`}>
                              {event.severity}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-sm font-mono whitespace-nowrap">
                            {event.impact_g != null ? `${event.impact_g.toFixed(2)} g` : "--"}
                          </td>
                          <td className="py-3 pr-4 text-sm font-mono whitespace-nowrap">
                            {event.confidence != null ? `${event.confidence.toFixed(2)}%` : "--"}
                          </td>
                          <td className="py-3 pr-4 whitespace-nowrap">
                            <div className="text-xs text-gray-600 dark:text-slate-300 font-mono">
                              {formatTime(event.timestamp)}
                            </div>
                            <div className="text-[10px] text-gray-400 dark:text-slate-600 font-mono mt-0.5">
                              {formatDate(event.timestamp)}
                            </div>
                          </td>
                          <td className="py-3">
                            {snapshotUrl ? (
                              <button
                                type="button"
                                onClick={() => window.open(snapshotUrl, "_blank", "noopener,noreferrer")}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 text-xs font-semibold transition-colors"
                              >
                                View
                              </button>
                            ) : (
                              <span className="text-gray-400 dark:text-slate-600 text-xs">--</span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-[#111827] rounded-b-2xl flex justify-between items-center">
              <span className="text-xs font-mono text-gray-500 dark:text-slate-400">
                Total Events: {selectedWorker.events.length}
              </span>
              <button
                onClick={() => setLogModalWorkerId(null)}
                className="px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-black dark:text-white rounded-lg text-sm font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Navbar />

        <div className="p-10 pt-28">
          <h2 className="text-2xl font-bold mb-8">Workers Management</h2>

          <div className="bg-gray-100 dark:bg-[#111827] rounded-2xl border border-gray-700">
            {workers.map(worker => (
              <div key={worker.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-gray-700 gap-4">
                
                <div>
                  <p className="font-semibold">{worker.name} ({worker.id})</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Heart: {worker.health.heartRate != null ? `${worker.health.heartRate} bpm` : "--"} | SpO2: {worker.health.spo2 != null ? `${worker.health.spo2}%` : "--"}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {!worker.active ? (
                    <span className="text-gray-400 font-semibold">OFFLINE</span>
                  ) : (
                    <span className={
                      worker.status === "critical" ? "text-red-500" : 
                      worker.status === "warning" ? "text-yellow-400" : 
                      "text-green-400"
                    }>
                      {worker.status.toUpperCase()}
                    </span>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setLogModalWorkerId(worker.id)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
                    >
                      View Records
                    </button>

                    <button
                      onClick={() => toggleWorker(worker.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                        worker.active ? "bg-green-600 hover:bg-green-700 text-white" : "bg-gray-600 hover:bg-gray-700 text-white"
                      }`}
                    >
                      {worker.active ? "Disable" : "Enable"}
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}