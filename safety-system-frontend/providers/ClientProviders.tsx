"use client"

import { useEffect, useState } from "react"
import { WorkerProvider } from "../context/WorkerContext"

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode
}) {

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme")

    if (savedTheme === "light") {
      document.documentElement.classList.remove("dark")
    } else {
      document.documentElement.classList.add("dark")
    }

    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <WorkerProvider>
      {children}
    </WorkerProvider>
  )
}