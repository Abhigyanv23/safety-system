"use client"

import { motion } from "framer-motion"

interface Props {
  title: string
  value: string
  color: string
}

export default function StatCard({ title, value, color }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.05 }}
      className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-all duration-300 shadow-lg"
    >

      <p className="text-sm text-gray-500 dark:text-gray-400 tracking-wide">
        {title}
      </p>

      <h3 className={`text-4xl font-bold mt-4 ${color}`}>
        {value}
      </h3>

    </motion.div>
  )
}