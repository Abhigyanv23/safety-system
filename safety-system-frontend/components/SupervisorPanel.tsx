"use client"

import { useState } from "react"
import { useWorkers } from "../context/WorkerContext"

export default function SupervisorPanel() {
  const { workers, toggleWorker, triggerEmergency } = useWorkers()

  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authId, setAuthId] = useState("")
  const [authPassword, setAuthPassword] = useState("")
  const [authError, setAuthError] = useState("")

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check against the exact credentials used in LoginPage.tsx
    if (authId === "Capstone" && authPassword === "password123") {
      triggerEmergency()
      setShowAuthModal(false)
      setAuthId("")
      setAuthPassword("")
      setAuthError("")
    } else {
      setAuthError("Unauthorized Access: Invalid ID or Password.")
    }
  }

  const closeModal = () => {
    setShowAuthModal(false)
    setAuthId("")
    setAuthPassword("")
    setAuthError("")
  }

  return (
    <>
      <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-lg">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-lg font-semibold text-black dark:text-white">Supervisor Control</h2>
            <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">Worker tracking controls</p>
          </div>
          <button 
            onClick={() => setShowAuthModal(true)} 
            className="bg-red-600 py-2 px-4 rounded-lg text-sm font-bold hover:bg-red-500 transition-all text-white"
          >
            Trigger Emergency
          </button>
        </div>
        <div className="space-y-2">
          {workers.map(worker => (
            <div key={worker.id} className="flex justify-between items-center border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 bg-gray-50 dark:bg-slate-800/40">
              <div>
                <p className="font-medium text-black dark:text-white">
                  {worker.name} <span className="font-mono text-blue-600 dark:text-blue-400">({worker.id})</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                  {worker.active ? "Tracking enabled" : "Tracking disabled"} • {worker.safety.systemStatus}
                </p>
              </div>
              <button 
                onClick={() => toggleWorker(worker.id)} 
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${worker.active ? "bg-green-600 hover:bg-green-700 text-white" : "bg-gray-400 dark:bg-gray-600 hover:bg-gray-500 dark:hover:bg-gray-700 text-white"}`}
              >
                {worker.active ? "Disable" : "Enable"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Authentication Modal for Emergency Trigger */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#111827] w-full max-w-sm rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 p-6">
            
            <h3 className="text-xl font-bold text-red-600 dark:text-red-500 mb-2">
              Verify Authorization
            </h3>
            
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
              Enter supervisor credentials to trigger the site-wide alarm.
            </p>

            <form onSubmit={handleConfirm} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Supervisor ID
                </label>
                <input
                  type="text"
                  value={authId}
                  onChange={(e) => setAuthId(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 dark:bg-[#1f2937] border border-gray-300 dark:border-slate-600 rounded-lg text-black dark:text-white focus:outline-none focus:border-red-500 transition-colors"
                  placeholder="Enter ID"
                  required
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 dark:bg-[#1f2937] border border-gray-300 dark:border-slate-600 rounded-lg text-black dark:text-white focus:outline-none focus:border-red-500 transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>

              {authError && (
                <div className="text-red-600 dark:text-red-400 text-sm font-semibold bg-red-50 dark:bg-red-900/30 p-3 rounded border border-red-300 dark:border-red-800">
                  {authError}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-black dark:text-white font-bold py-2.5 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-lg transition-colors"
                >
                  Confirm Alarm
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </>
  )
}