"use client"

import { useState } from "react"
import { useWorkers } from "../context/WorkerContext"

export default function ActivityFeed() {
  const { events, acknowledgeAlert, dispatchMedicalHelp, resolveEvent } = useWorkers()
  const recent = events.slice(0, 8)

  // Local state to track the resolution step for each specific event independently.
  // 0 = Open, 1 = Acknowledged, 2 = Dispatched, 3 = Resolved
  const [resolutionSteps, setResolutionSteps] = useState<Record<string, number>>({})

  const handleAcknowledge = (eventId: string, workerId: string) => {
    acknowledgeAlert(eventId, workerId)
    setResolutionSteps(prev => ({ ...prev, [eventId]: 1 }))
  }

  const handleDispatch = (eventId: string) => {
    dispatchMedicalHelp(eventId)
    setResolutionSteps(prev => ({ ...prev, [eventId]: 2 }))
  }

  const handleResolve = (eventId: string) => {
    resolveEvent(eventId)
    setResolutionSteps(prev => ({ ...prev, [eventId]: 3 }))
  }

  return (
    <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-slate-700 rounded-2xl p-6 h-[400px] flex flex-col shadow-lg">
      <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-slate-700 pb-3">
        <div>
          <h3 className="text-lg font-bold text-black dark:text-white">Live Activity Feed</h3>
          <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">Critical and high-priority events</p>
        </div>
        <span className="text-xs font-semibold bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-2 py-1 rounded border border-blue-300 dark:border-blue-800">LIVE</span>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
        {recent.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 dark:text-slate-500 text-sm">
            Waiting for safety events...
          </div>
        ) : recent.map(event => {
          
          const currentStep = resolutionSteps[event.id] || 0

          return (
            <div key={event.id} className={`p-3 rounded-xl border-l-4 ${event.severity === "CRITICAL" ? "border-red-500 bg-red-50 dark:bg-red-900/20" : "border-orange-500 bg-orange-50 dark:bg-orange-900/10"}`}>
              <div className="flex justify-between items-start gap-3">
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-slate-100">{event.type === "FALL" ? "Fall Detected" : "Impact Detected"}</h4>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{event.workerId} • {new Date(event.timestamp).toLocaleString()}</p>
                  <p className="text-xs text-gray-600 dark:text-slate-300 mt-2">
                    {event.type === "FALL" && event.confidence != null ? `Confidence ${event.confidence.toFixed(2)}%` : event.impact_g != null ? `Impact ${event.impact_g.toFixed(2)} g` : "No additional measurement"}
                  </p>
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded border ${event.severity === "CRITICAL" ? "text-red-600 dark:text-red-400 border-red-500/50 bg-red-500/10" : "text-orange-600 dark:text-orange-400 border-orange-500/50 bg-orange-500/10"}`}>
                  {event.severity}
                </span>
              </div>

              {(event.severity === "CRITICAL" || event.severity === "HIGH") && (
                <div className="mt-3 w-full">

                  {currentStep === 0 && (
                    <button
                      onClick={() => handleAcknowledge(event.id, event.workerId)}
                      className="w-full py-1.5 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}

                  {currentStep === 1 && (
                    <button
                      onClick={() => handleDispatch(event.id)}
                      className="w-full py-1.5 text-xs font-bold rounded-lg bg-yellow-500 hover:bg-yellow-400 text-slate-900 transition-colors"
                    >
                      Dispatch Medical Help
                    </button>
                  )}

                  {currentStep === 2 && (
                    <button
                      onClick={() => handleResolve(event.id)}
                      className="w-full py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                    >
                      Mark as Resolved
                    </button>
                  )}

                  {currentStep === 3 && (
                    <div className="w-full py-1.5 text-xs font-bold rounded-lg bg-gray-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 text-center border border-gray-200 dark:border-slate-700">
                      Resolved
                    </div>
                  )}

                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}