const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5001";

export interface DashboardTelemetry {
  workerId: string;
  timestamp?: string;
  health: {
    heartRate: number | string;
    spo2: number | string;
  };
  environment: {
    temperature: number | string;
    humidity: number | string;
  };
  safety: {
    systemStatus: string;
    vibrationMotor: string;
  };
  camera?: {
    status: string;
    lastSnapshot: string | null;
  };
  system?: {
    piOnline: boolean;
    storageFreePercent: number;
    sensors: {
      max30102: boolean | string;
      dht11: boolean | string;
      ov5647: boolean | string;
      mpu6050: boolean | string;
    };
  };
}

// Fetch the most recent telemetry entry for W01
export async function fetchTelemetry(): Promise<DashboardTelemetry | null> {
  const res = await fetch(`${API_BASE}/api/telemetry/history?workerId=W01&limit=1`);
  if (!res.ok) throw new Error("Failed to fetch telemetry");
  
  const data = await res.json();
  return data.length > 0 ? data[0] : null;
}

// Send the toggle command to the Node backend
export async function triggerVibration(command: string) {
  await fetch(`${API_BASE}/api/vibration`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command, workerId: "W01" }),
  });
}