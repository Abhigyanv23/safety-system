"use client"

import { useRef } from "react"
import Sidebar from "../../components/Sidebar"
import Navbar from "../../components/Navbar"
import { useWorkers } from "../../context/WorkerContext"

export default function SettingsPage() {
  const {
    connectionState,
    soundEnabled,
    setSoundEnabled,
    notificationsEnabled,
    setNotificationsEnabled,
    siteMapImage,
    setSiteMapImage,
  } = useWorkers()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setSiteMapImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const resetImage = () => {
    setSiteMapImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className="flex bg-white dark:bg-[#0b1220] min-h-screen text-black dark:text-white">

      <Sidebar />

      <div className="flex-1 flex flex-col">

        <Navbar />

        <div className="p-10 pt-28">

          <h2 className="text-2xl font-bold mb-8">
            System Settings
          </h2>

          <div className="bg-gray-100 dark:bg-[#111827] p-8 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-8">

            {/* Sound Toggle */}
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">Enable Alarm Sound</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Play sound when critical alert occurs
                </p>
              </div>

              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                  soundEnabled ? "bg-green-600 text-white" : "bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-300"
                }`}
              >
                {soundEnabled ? "ON" : "OFF"}
              </button>
            </div>

            {/* Notifications Toggle */}
            <div className="flex justify-between items-center border-t border-gray-200 dark:border-gray-700 pt-8">
              <div>
                <p className="font-semibold">Enable Notifications</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Receive alert notifications
                </p>
              </div>

              <button
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                  notificationsEnabled ? "bg-green-600 text-white" : "bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-300"
                }`}
              >
                {notificationsEnabled ? "ON" : "OFF"}
              </button>
            </div>

            {/* Site Map Layout Settings */}
            <div className="pt-8 border-t border-gray-200 dark:border-gray-700">
              <div className="mb-4">
                <p className="font-semibold">Live Site Map Layout</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Upload a custom blueprint or floor plan to be used as the background on your dashboard map.
                </p>
              </div>

              <div className="space-y-4">
                {/* Image Preview */}
                <div className="w-full max-w-lg h-48 bg-white dark:bg-[#0b1220] rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600 flex items-center justify-center overflow-hidden relative">
                  {siteMapImage ? (
                    <img src={siteMapImage} alt="Custom Layout Preview" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-gray-400 dark:text-slate-500 text-sm font-semibold">Default Layout Active</span>
                  )}
                </div>

                {/* Upload Controls */}
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition"
                  >
                    Upload Blueprint
                  </button>
                  {siteMapImage && (
                    <button
                      onClick={resetImage}
                      className="bg-gray-200 hover:bg-gray-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-white px-4 py-2 rounded-lg text-sm font-bold transition"
                    >
                      Reset to Default
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* System Info */}
            <div className="pt-8 border-t border-gray-200 dark:border-gray-700">
              <p className="font-semibold mb-2">System Info</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Version: 3.0.0
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Backend Status: <span className="font-mono">{connectionState}</span>
              </p>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}