"use client"

import { useWorkers, resolveSnapshotUrl } from "../context/WorkerContext"

export default function CameraPanel({ workerId }: { workerId: string }) {
  const { workers } = useWorkers()
  const worker = workers.find((w) => w.id === workerId) || workers[0]
  
  if (!worker) return null

  const isSimulated = worker.id !== "W01"
  const snapshot = isSimulated ? null : worker.camera.lastSnapshot
  const status = isSimulated ? "OFFLINE" : worker.camera.status
  const isActive = status === "ACTIVE" || status === "ONLINE"
  const src = resolveSnapshotUrl(snapshot)

  return (
    <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <div><h2 className="text-lg font-bold text-black dark:text-white">Camera</h2><p className="text-xs text-gray-500 dark:text-slate-500 mt-1">OV5647 event snapshots</p></div>
        <span className={`px-2 py-1 rounded text-[10px] font-black border ${isActive ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/10"}`}>{status}</span>
      </div>
      <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-900 min-h-[180px] flex items-center justify-center">
        {src ? <img src={src} alt="Latest safety snapshot" className="w-full h-52 object-cover" /> : <div className="text-center px-6"><p className="text-gray-500 dark:text-slate-400 font-semibold">No snapshot available</p></div>}
      </div>
    </div>
  )
}