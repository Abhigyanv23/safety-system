"use client"

import { useWorkers, resolveSnapshotUrl } from "../context/WorkerContext"

export default function WorkerModal({ workerId, onClose }: { workerId: string; onClose: () => void }) {
  const { workers } = useWorkers()
  const worker = workers.find(w => w.id === workerId)
  if (!worker) return null

  const status = worker.status === "critical" ? "text-red-600 dark:text-red-400" : worker.status === "warning" ? "text-orange-600 dark:text-orange-400" : "text-emerald-600 dark:text-emerald-400"
  const snapshotSrc = resolveSnapshotUrl(worker.camera.lastSnapshot)

  return <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
      <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50"><div><h2 className="text-2xl font-black text-black dark:text-white">Worker Diagnostics</h2><p className="text-gray-500 dark:text-slate-400 font-mono text-sm mt-1">{worker.id} • {worker.name}</p></div><button onClick={onClose} className="text-gray-500 dark:text-slate-400 hover:text-black dark:hover:text-white p-2 rounded-lg">✕</button></div>
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[['Heart Rate', worker.health.heartRate != null ? `${worker.health.heartRate} BPM` : '--'], ['SpO2', worker.health.spo2 != null ? `${worker.health.spo2}%` : '--'], ['Temperature', worker.environment.temperature != null ? `${worker.environment.temperature.toFixed(1)} °C` : '--'], ['Humidity', worker.environment.humidity != null ? `${worker.environment.humidity.toFixed(0)}%` : '--']].map(([label, value]) => <div key={label} className="bg-gray-50 dark:bg-slate-800/70 border border-gray-200 dark:border-slate-700 rounded-xl p-4"><p className="text-xs text-gray-500 dark:text-slate-500 uppercase font-bold">{label}</p><p className="text-xl font-black mt-2 text-black dark:text-white">{value}</p></div>)}
        </div>
        <div className="bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-xl p-4 space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-gray-500 dark:text-slate-400">System status</span><span className={`font-black uppercase ${status}`}>{worker.safety.systemStatus}</span></div>
          <div className="flex justify-between"><span className="text-gray-500 dark:text-slate-400">Vibration motor</span><span className="font-bold text-black dark:text-white">{worker.safety.vibrationMotor == null ? "--" : worker.safety.vibrationMotor ? "ACTIVE" : "OFF"}</span></div>
          <div className="flex justify-between"><span className="text-gray-500 dark:text-slate-400">Coordinates</span><span className="font-mono text-black dark:text-white">{worker.x != null && worker.y != null ? `X: ${worker.x.toFixed(1)}, Y: ${worker.y.toFixed(1)}` : "--"}</span></div>
          <div className="flex justify-between"><span className="text-gray-500 dark:text-slate-400">Last telemetry</span><span className="text-black dark:text-white">{worker.lastTelemetryAt && !Number.isNaN(new Date(worker.lastTelemetryAt).getTime()) ? new Date(worker.lastTelemetryAt).toLocaleString() : "--"}</span></div>
        </div>
        <div className="bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700"><p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">OV5647 Snapshot</p></div>
          {snapshotSrc ? <img src={snapshotSrc} alt="Latest worker safety snapshot" className="w-full max-h-72 object-contain bg-black" onError={e => { e.currentTarget.style.display = "none" }} /> : <div className="p-8 text-center text-gray-500 dark:text-slate-500">No snapshot available</div>}
        </div>
        <div className="flex justify-end"><button onClick={onClose} className="bg-gray-200 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 hover:bg-gray-300 dark:hover:bg-slate-600 text-black dark:text-white px-6 py-2.5 rounded-lg font-bold">Close</button></div>
      </div>
    </div>
  </div>
}