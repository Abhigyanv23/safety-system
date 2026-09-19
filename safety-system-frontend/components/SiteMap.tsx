"use client"

import { useWorkers } from "../context/WorkerContext"

interface SiteMapProps { onWorkerClick?: (workerId: string) => void }

const ZONES = [
  { id: "Zone A (Crane)", x: 25, y: 35, radius: 18 },
  { id: "Zone B (Scaffolding)", x: 75, y: 30, radius: 15 },
  { id: "Zone C (Excavation)", x: 50, y: 75, radius: 20 },
]

export default function SiteMap({ onWorkerClick }: SiteMapProps) {
  const { workers, siteMapImage } = useWorkers() // <-- Get siteMapImage from context
  const activeWorkers = workers.filter(worker => worker.active && worker.x != null && worker.y != null)

  const getZoneColor = (zone: typeof ZONES[number]) => {
    const workersInZone = activeWorkers.filter(w => {
      const dx = (w.x ?? 0) - zone.x
      const dy = (w.y ?? 0) - zone.y
      return Math.sqrt(dx * dx + dy * dy) <= zone.radius
    })
    if (workersInZone.some(w => w.status === "critical")) return "bg-red-600/70 border-red-500 border-4 animate-pulse ring-4 ring-red-600/50"
    if (workersInZone.some(w => w.status === "warning")) return "bg-orange-600/70 border-orange-500 border-4"
    return "bg-emerald-600/30 border-emerald-500/60 border-2"
  }

  // Use the uploaded image if it exists, otherwise fall back to the default
  const backgroundImage = siteMapImage || "/blueprint.jpg"

  return (
    <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-lg">
      <div className="flex justify-between items-center mb-5">
        <div><h2 className="text-xl font-bold text-black dark:text-white">Live Site Map & Risk Heatmap</h2><p className="text-xs text-gray-500 dark:text-slate-500 mt-1">Worker coordinates from live telemetry</p></div>
        <div className="flex gap-4 text-xs font-semibold"><span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><span className="w-2 h-2 bg-emerald-400 rounded-full" />Safe</span><span className="flex items-center gap-1 text-orange-600 dark:text-orange-400"><span className="w-2 h-2 bg-orange-500 rounded-full" />Warning</span><span className="flex items-center gap-1 text-red-600 dark:text-red-500"><span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />Critical</span></div>
      </div>

      <div 
        className="relative w-full h-[450px] bg-[#1f2937] bg-cover bg-center border-2 border-slate-600 rounded-xl overflow-hidden" 
        style={{ 
          backgroundImage: `linear-gradient(to right, rgba(15,23,42,.8) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,.8) 1px, transparent 1px), url('${backgroundImage}')`, 
          backgroundSize: "40px 40px, 40px 40px, cover" 
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/10 to-transparent pointer-events-none" />
        {ZONES.map(zone => <div key={zone.id} className={`absolute rounded-full transition-all duration-700 pointer-events-none flex items-center justify-center z-10 ${getZoneColor(zone)}`} style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.radius * 2}%`, height: `${zone.radius * 2}%`, transform: "translate(-50%, -50%)" }}><span className="text-white/60 text-[10px] font-bold uppercase tracking-widest text-center px-2">{zone.id}</span></div>)}

        {activeWorkers.map(worker => <div key={worker.id} className="absolute z-20" style={{ left: `${worker.x}%`, top: `${worker.y}%` }}>
          <button onClick={() => onWorkerClick?.(worker.id)} className="group flex flex-col items-center cursor-pointer hover:scale-125 transition-transform" style={{ transform: "translate(-50%, -50%)" }}>
            <div className="relative"><div className={`${worker.status === "critical" ? "absolute -inset-2 bg-red-500 rounded-full animate-ping opacity-75" : "hidden"}`} /><div className={`relative w-5 h-5 rounded-full border-2 border-[#111827] shadow-lg ${worker.status === "critical" ? "bg-red-500" : worker.status === "warning" ? "bg-orange-500" : "bg-emerald-400"}`} /></div>
            <span className="text-xs mt-1 font-bold bg-[#111827]/90 px-2 py-0.5 rounded text-white border border-slate-600">{worker.id}</span>
            <div className="absolute bottom-10 hidden group-hover:block bg-[#1f2937] text-white text-xs rounded-lg p-3 border border-slate-600 shadow-2xl w-52 pointer-events-none">
              <p className="font-bold text-sm text-blue-400">{worker.name}</p><p className="text-slate-400 uppercase tracking-wider text-[10px] mt-1">{worker.safety.systemStatus}</p>
              <div className="border-t border-slate-600 mt-2 pt-2 space-y-1">
                <p className="flex justify-between"><span>HR</span><span className="font-mono">{worker.health.heartRate != null ? `${worker.health.heartRate} BPM` : "--"}</span></p>
                <p className="flex justify-between"><span>SpO2</span><span className="font-mono">{worker.health.spo2 != null ? `${worker.health.spo2}%` : "--"}</span></p>
                <p className="flex justify-between"><span>Position</span><span className="font-mono">{Math.round(worker.x ?? 0)}, {Math.round(worker.y ?? 0)}</span></p>
              </div>
            </div>
          </button>
        </div>)}

        {activeWorkers.length === 0 && <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-bold tracking-widest uppercase">No Active Transmissions Detected</div>}
      </div>
    </div>
  )
}