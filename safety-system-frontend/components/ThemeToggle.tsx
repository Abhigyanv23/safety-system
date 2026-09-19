"use client"

import { useEffect, useState } from "react"

// ------------------------------------------------------------
// This is the ONE real theme control for the app. It reads and
// writes the same source of truth that ClientProviders.tsx sets
// up on initial mount:
//
//   - localStorage("theme")               -> "light" | "dark"
//   - document.documentElement.classList  -> has/lacks "dark"
//
// Tailwind's `dark:` variants respond to that class, so this is
// what actually changes the UI. (Navbar previously had its own
// separate toggle that used a CSS `filter: invert(...)` hack and
// never touched either of these — that has been removed in favor
// of this component.)
// ------------------------------------------------------------

export default function ThemeToggle() {
  // Start as null until mounted, so we never render a toggle
  // state that contradicts what ClientProviders already applied
  // to the DOM (avoids a flash/mismatch on load).
  const [isDark, setIsDark] = useState<boolean | null>(null)

  useEffect(() => {
    setIsDark(
      document.documentElement.classList.contains("dark")
    )
  }, [])

  const toggleTheme = () => {
    setIsDark((current) => {
      const next = !current

      if (next) {
        document.documentElement.classList.add("dark")
        localStorage.setItem("theme", "dark")
      } else {
        document.documentElement.classList.remove("dark")
        localStorage.setItem("theme", "light")
      }

      return next
    })
  }

  // Avoid rendering with a guessed state before we've checked
  // the real DOM class on mount.
  if (isDark === null) {
    return (
      <button
        type="button"
        disabled
        className="
          flex items-center justify-center gap-2
          w-[110px]
          px-4 py-2
          rounded-lg
          bg-[#1f2937]
          border border-slate-600
          text-white
          text-sm
          font-semibold
          opacity-60
        "
      >
        &nbsp;
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="
        flex items-center justify-center gap-2
        w-[110px]
        px-4 py-2
        rounded-lg
        bg-[#1f2937]
        border border-slate-600
        hover:bg-slate-700
        text-white
        text-sm
        font-semibold
        transition-colors
        shadow-sm
      "
    >
      {isDark ? "🌙 Dark" : "☀️ Light"}
    </button>
  )
}