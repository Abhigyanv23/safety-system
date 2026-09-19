"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export default function LoginPage() {
  const router = useRouter()

  const [id, setId] = useState("")
  const [password, setPassword] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const [isForgotMode, setIsForgotMode] = useState(false)
  const [email, setEmail] = useState("")
  const [resetMessage, setResetMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (id === "Capstone" && password === "password123") {
      setErrorMessage("")
      localStorage.setItem("role", "supervisor")
      localStorage.setItem("supervisorId", id)
      router.push("/dashboard")
    } else {
      setErrorMessage("Unauthorized Access: Invalid ID or Password.")
    }
  }

  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage("")
    setResetMessage("")

    if (!email.includes("@")) {
      setErrorMessage("Please enter a valid email address.")
      return
    }

    setLoading(true)

    try {
      const backendUrl = process.env.NEXT_PUBLIC_SAFETY_BACKEND_URL || "http://localhost:5001"
      const res = await fetch(`${backendUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setResetMessage(`A secure reset link has been dispatched to ${email}.`)
      } else {
        setErrorMessage(data.message || "Failed to dispatch reset email.")
      }
    } catch (err) {
      setErrorMessage("Could not reach the server. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setIsForgotMode(!isForgotMode)
    setErrorMessage("")
    setResetMessage("")
    setEmail("")
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0b1220] flex items-center justify-center text-black dark:text-white p-4">
      <div className="bg-white dark:bg-[#111827] p-10 rounded-2xl border border-gray-200 dark:border-slate-700 w-full max-w-md shadow-2xl transition-all">

        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-emerald-500 dark:from-blue-400 dark:to-emerald-400">
            Supervisor Portal
          </h2>
          <p className="text-gray-500 dark:text-slate-400 mt-2 text-sm">Construction Site Safety Monitor</p>
        </div>

        {!isForgotMode ? (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Supervisor ID</label>
              <input
                type="text"
                className="w-full p-3 bg-gray-50 dark:bg-[#1f2937] border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-black dark:text-white"
                placeholder="Enter ID"
                value={id}
                onChange={(e) => setId(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Password</label>
              <input
                type="password"
                className="w-full p-3 bg-gray-50 dark:bg-[#1f2937] border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-black dark:text-white"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {errorMessage && (
              <div className="text-red-600 dark:text-red-400 text-sm font-semibold bg-red-50 dark:bg-red-900/30 p-3 rounded border border-red-300 dark:border-red-800">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 py-3 rounded-lg font-bold tracking-wide hover:bg-blue-500 transition-all shadow-lg mt-4 text-white"
            >
              Authenticate
            </button>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={toggleMode}
                className="text-sm text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors underline decoration-gray-300 dark:decoration-slate-600 hover:decoration-blue-500 dark:hover:decoration-blue-400"
              >
                Forgot Password?
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSendResetCode} className="space-y-5">
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-4 text-center">
              Enter your registered administration email to receive a password reset link.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Registered Email</label>
              <input
                type="email"
                className="w-full p-3 bg-gray-50 dark:bg-[#1f2937] border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:border-emerald-500 transition-colors text-black dark:text-white"
                placeholder=" Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {errorMessage && (
              <div className="text-red-600 dark:text-red-400 text-sm font-semibold bg-red-50 dark:bg-red-900/30 p-3 rounded border border-red-300 dark:border-red-800">
                {errorMessage}
              </div>
            )}

            {resetMessage && (
              <div className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded border border-emerald-300 dark:border-emerald-800">
                {resetMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 py-3 rounded-lg font-bold tracking-wide hover:bg-emerald-500 transition-all shadow-lg mt-4 disabled:opacity-50 text-white"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={toggleMode}
                className="text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors flex items-center justify-center w-full gap-2"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  )
}