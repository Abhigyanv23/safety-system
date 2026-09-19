"use client"

import { motion } from "framer-motion"
import { useWorkers } from "../context/WorkerContext"

export default function AlertPopup() {
  // Add notificationsEnabled to the hook
  const { emergencyActive, latestAlert, stopAlarm, notificationsEnabled } = useWorkers()

  // Suppress the popup if notifications are disabled
  //
  // NOTE: this now works correctly because notificationsEnabled
  // is finally wired up in WorkerContext.tsx (defaulting to
  // true), but it's worth a deliberate decision, not just a bug
  // fix: this ties the CRITICAL safety alert popup to the same
  // toggle that controls the routine notification bell badge in
  // Navbar.tsx. If a supervisor turns off "notifications" thinking
  // it just quiets the bell, this would also silently suppress
  // the actual fall/impact alert popup. Flagging this rather than
  // deciding it - say if you want the critical popup to ignore
  // this setting entirely (i.e. only ever gated by emergencyActive).
  if (!emergencyActive || !notificationsEnabled) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed top-6 right-6 bg-red-950/95 border border-red-500 text-white p-5 rounded-xl shadow-2xl z-[99999] w-[360px] backdrop-blur"
    >
      <div className="flex items-start gap-3">
        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse mt-1.5 shrink-0" />
        <div className="flex-1">
          <h3 className="font-black text-lg">CRITICAL SAFETY ALERT</h3>
          {latestAlert ? (
            <div className="mt-2 space-y-1 text-sm text-red-100">
              <p><span className="font-bold">{latestAlert.type}</span> detected for <span className="font-bold">{latestAlert.workerId}</span>.</p>
              {latestAlert.confidence != null && <p>Confidence: <span className="font-bold">{latestAlert.confidence.toFixed(2)}%</span></p>}
              {latestAlert.impact_g != null && <p>Impact: <span className="font-bold">{latestAlert.impact_g.toFixed(2)} g</span></p>}
              <p className="text-xs text-red-300">{new Date(latestAlert.timestamp).toLocaleString()}</p>
            </div>
          ) : <p className="mt-2 text-sm text-red-100">Immediate action required.</p>}
          <button onClick={stopAlarm} className="mt-4 bg-white text-red-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-50">Stop Alarm</button>
        </div>
      </div>
    </motion.div>
  )
}