const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

export interface DashboardTelemetry {
  workerId: string;
  health: { heartRate: number | null; spo2: number | null; };
  environment: { temperature: number | null; humidity: number | null; };
  camera: { status: string; lastEventSnapshot: string | null; };
  vibration: { status: string; };
  safety: { systemStatus: string; };
  system: {
    piOnline: boolean;
    storageFreePercent: number;
    sensors: {
      max30102: string;
      dht11: string;
      ov5647: string;
      mpu6050: string;
    };
  };
}

export async function fetchTelemetry(): Promise<DashboardTelemetry> {
  const res = await fetch(`${API_BASE}/vest/telemetry`, { cache: "no-store" });
  return res.json();
}

export async function triggerVibration(action: "PULSE" | "OFF", durationMs: number = 30000) {
  await fetch(`${API_BASE}/vest/vibration`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workerId: "W01", action, duration: durationMs })
  });
}