"use client";
import React from "react";

export default function IncidentAlerts({ activeAlert, onDismiss }: { activeAlert: any, onDismiss: () => void }) {
  if (!activeAlert) return null;

  return (
    <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-600 p-4 mt-6 rounded shadow-md">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-red-800 dark:text-red-400 font-bold text-lg uppercase tracking-wider">
            {activeAlert.type || "EMERGENCY"} - INCIDENT ALERT
          </h2>
          <p className="text-red-600 dark:text-red-300 text-sm mt-1">
            Worker ID: {activeAlert.workerId}
          </p>
        </div>
        <button 
          onClick={onDismiss}
          className="text-red-500 hover:text-red-700 font-bold"
        >
          DISMISS
        </button>
      </div>
    </div>
  );
}