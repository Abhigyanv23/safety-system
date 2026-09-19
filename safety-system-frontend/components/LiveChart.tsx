"use client"

import { useMemo } from "react"
import { useWorkers } from "../context/WorkerContext"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts"

const ZONES = [
  { id: "Zone A", x: 25, y: 35, radius: 18 },
  { id: "Zone B", x: 75, y: 30, radius: 15 },
  { id: "Zone C", x: 50, y: 75, radius: 20 },
]

interface LiveChartProps {
  selectedDate?: string;
}

export default function LiveChart({ selectedDate }: LiveChartProps) {
  const { events } = useWorkers()

  const data = useMemo(() => {
    const counts = { "Zone A": 0, "Zone B": 0, "Zone C": 0 }

    events.forEach((event) => {
      // Skip events without valid location data
      if (event.x == null || event.y == null) return

      // Filter by the date selected in the dashboard
      if (selectedDate) {
        const d = new Date(event.timestamp)
        if (Number.isNaN(d.getTime())) return
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        if (dateStr !== selectedDate) return
      }

      // Find which zone the event occurred in
      for (const zone of ZONES) {
        const dx = event.x - zone.x
        const dy = event.y - zone.y
        if (Math.sqrt(dx * dx + dy * dy) <= zone.radius) {
          counts[zone.id as keyof typeof counts]++
          break 
        }
      }
    })

    return [
      { name: "Zone A", incidents: counts["Zone A"] },
      { name: "Zone B", incidents: counts["Zone B"] },
      { name: "Zone C", incidents: counts["Zone C"] },
    ]
  }, [events, selectedDate]) // Include selectedDate to trigger chart rebuilds on date change

  const getBarColor = (count: number) => {
    if (count >= 10) return "#ef4444" 
    if (count >= 5) return "#f97316"  
    if (count > 0) return "#facc15"   
    return "#374151"                  
  }

  return (
    <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xl flex flex-col min-w-0 h-full">
      
      <div className="flex justify-between items-center mb-6 gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-black dark:text-white">
            Incident Hotspots
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-500 mt-1 uppercase tracking-widest">
            {selectedDate ? `Events with location data (${selectedDate})` : "Events with location data"}
          </p>
        </div>
        <span className="shrink-0 text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 px-2 py-1 rounded border border-gray-200 dark:border-slate-700 uppercase tracking-widest">
          LIVE
        </span>
      </div>

      <div className="flex-1 min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false} 
              stroke="#374151" 
              opacity={0.4} 
            />
            <XAxis 
              dataKey="name" 
              tick={{ fill: "#6b7280", fontSize: 12 }} 
              axisLine={false} 
              tickLine={false} 
              dy={10}
            />
            <YAxis 
              allowDecimals={false} 
              tick={{ fill: "#6b7280", fontSize: 12 }} 
              axisLine={false} 
              tickLine={false}
            />
            <Tooltip 
              cursor={{ fill: "#1f2937", opacity: 0.5 }}
              contentStyle={{ 
                backgroundColor: "#1f2937", 
                borderColor: "#374151", 
                borderRadius: "8px", 
                color: "#fff",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)"
              }}
              itemStyle={{ color: "#fff", fontWeight: "bold" }}
            />
            <Bar 
              dataKey="incidents" 
              radius={[4, 4, 0, 0]} 
              maxBarSize={45}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getBarColor(entry.incidents)} 
                  className="transition-all duration-500"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
    </div>
  )
}