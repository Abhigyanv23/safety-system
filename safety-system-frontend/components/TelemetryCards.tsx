"use client";

import React, { useEffect, useState } from "react";
import { fetchTelemetry, triggerVibration, DashboardTelemetry } from "../lib/api";

export default function TelemetryCards({ workerId = "W01" }: { workerId?: string }) {
  const [telemetry, setTelemetry] = useState<DashboardTelemetry | null>(null);

  useEffect(() => {
    const pollInterval = setInterval(async () => {
      if (workerId === "W01") {
        try {
          const tData = await fetchTelemetry();
          setTelemetry(tData);
        } catch (err) {
          console.error("Failed to fetch Pi telemetry");
        }
      } else {
        const isW02 = workerId === "W02";
        
        const mockHr = isW02 
          ? 80 + Math.floor(Math.random() * 5) 
          : 115 + Math.floor(Math.random() * 10);
          
        const mockSpo2 = isW02 
          ? 98 + Math.floor(Math.random() * 2) 
          : 94 + Math.floor(Math.random() * 3);
          
        const mockTemp = isW02 
          ? 29.0 + parseFloat((Math.random() * 1.5).toFixed(1))
          : 32.5 + parseFloat((Math.random() * 2.0).toFixed(1));
          
        const mockHum = 60 + Math.floor(Math.random() * 8);

        setTelemetry({
          workerId: workerId,
          health: { 
            heartRate: mockHr, 
            spo2: mockSpo2 
          },
          environment: { 
            temperature: parseFloat(mockTemp.toFixed(1)), 
            humidity: mockHum 
          },
          safety: { 
            systemStatus: isW02 ? "SAFE" : "ALERT" 
          },
          vibration: { status: "OFF" },
        });
      }
    }, 2000);
    return () => clearInterval(pollInterval);
  }, [workerId]);

  const data = telemetry || {
    health: { heartRate: "--", spo2: "--" },
    environment: { temperature: "--", humidity: "--" },
    safety: { systemStatus: "WAITING" },
    vibration: { status: "OFF" },
  };

  return (
    <div className="w-full space-y-6">
      
      <div>
        <h3 className="text-sm font-bold text-blue-500 dark:text-blue-400 mb-3 uppercase tracking-wider">Health</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-lg">
            <span className="text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wider block mb-2">Heart Rate</span>
            <span className="text-4xl font-bold text-red-600 dark:text-red-400">{data.health.heartRate} <span className="text-sm text-gray-400 dark:text-slate-500">BPM</span></span>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-lg">
            <span className="text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wider block mb-2">SPO2</span>
            <span className="text-4xl font-bold text-cyan-600 dark:text-cyan-400">{data.health.spo2} <span className="text-sm text-gray-400 dark:text-slate-500">%</span></span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-3 uppercase tracking-wider">Environment</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-lg">
            <span className="text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wider block mb-2">Temperature</span>
            <span className="text-4xl font-bold text-amber-500">{data.environment.temperature} <span className="text-sm text-gray-400 dark:text-slate-500">°C</span></span>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-lg">
            <span className="text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wider block mb-2">Humidity</span>
            <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">{data.environment.humidity} <span className="text-sm text-gray-400 dark:text-slate-500">%</span></span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-amber-500 mb-3 uppercase tracking-wider">Safety</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-lg">
            <span className="text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wider block mb-2">System Status</span>
            <span className={`text-3xl font-bold ${data.safety.systemStatus === "SAFE" ? "text-emerald-500" : "text-red-600 dark:text-red-500"}`}>
              {data.safety.systemStatus}
            </span>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
            <span className="text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wider block mb-2">Vibration Motor</span>
            <div className="flex items-center justify-between mt-2">
              <span className="text-3xl font-bold text-gray-800 dark:text-slate-300">{data.vibration.status}</span>
              <button
                onClick={() => triggerVibration(data.vibration.status === "ON" ? "OFF" : "ON")}
                disabled={workerId !== "W01"}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition disabled:opacity-50"
              >
                TOGGLE ON/OFF
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}