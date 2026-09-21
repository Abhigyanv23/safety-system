const SERVER_URL = "http://localhost:5001";

// W02 is pinned to Zone B | W03 is pinned to Zone C
let workers = [
  { id: "W02", heartRate: 72, spo2: 98, temperature: 29.5, humidity: 64, x: 75, y: 25 },
  { id: "W03", heartRate: 90, spo2: 97, temperature: 30.2, humidity: 68, x: 25, y: 75 },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getZone(x, y) {
  if (x < 50 && y < 50) return "Zone A";
  if (x >= 50 && y < 50) return "Zone B";
  if (x < 50 && y >= 50) return "Zone C";
  return "Zone D";
}

async function sendTelemetry() {
  // Drift workers strictly inside their designated zones
  workers = workers.map((w) => {
    let nextX, nextY;

    if (w.id === "W02") {
      // Lock W02 into Zone B (X: 50-100, Y: 0-49)
      nextX = clamp(w.x + (Math.random() * 6 - 3), 50, 100);
      nextY = clamp(w.y + (Math.random() * 6 - 3), 0, 49.9);
    } else {
      // Lock W03 into Zone C (X: 0-49, Y: 50-100)
      nextX = clamp(w.x + (Math.random() * 6 - 3), 0, 49.9);
      nextY = clamp(w.y + (Math.random() * 6 - 3), 50, 100);
    }

    return {
      ...w,
      heartRate: clamp(w.heartRate + (Math.floor(Math.random() * 11) - 5), 60, 180),
      spo2: clamp(w.spo2 + (Math.floor(Math.random() * 3) - 1), 90, 100),
      temperature: clamp(w.temperature + (Math.random() * 0.6 - 0.3), 24, 38),
      humidity: clamp(w.humidity + (Math.random() * 2 - 1), 40, 90),
      x: nextX,
      y: nextY,
    };
  });

  for (const w of workers) {
    const payload = {
      workerId: w.id,
      timestamp: new Date().toISOString(),
      zone: getZone(w.x, w.y),
      health: { heartRate: Math.round(w.heartRate), spo2: w.spo2 },
      environment: { temperature: Number(w.temperature.toFixed(1)), humidity: Number(w.humidity.toFixed(1)) },
      safety: { systemStatus: "NORMAL", vibrationMotor: false },
      camera: { status: "NOT CONNECTED", lastSnapshot: null },
      system: { piOnline: true, sensors: { max30102: true, dht11: true, ov5647: false, mpu6050: true }, storageFreePercent: 80 },
      x: Number(w.x.toFixed(1)),
      y: Number(w.y.toFixed(1)),
    };

    try {
      await fetch(`${SERVER_URL}/api/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      console.log(`[SIMULATOR] ${w.id} updated -> Location: ${payload.zone} (X:${payload.x}, Y:${payload.y})`);
    } catch (e) {
      console.log(`[ERROR] Server offline. Is safety-server running?`);
    }
  }
}

async function triggerEmergency(worker) {
  const isFall = Math.random() < 0.5;
  const currentZone = getZone(worker.x, worker.y);

  const event = isFall
    ? { type: "FALL", severity: "CRITICAL", impact_g: null, confidence: Number((90 + Math.random() * 9).toFixed(2)), snapshot: null }
    : { type: "IMPACT", severity: "HIGH", impact_g: Number((2 + Math.random() * 6).toFixed(2)), confidence: null, snapshot: null };

  console.log(`\n🚨 [ALERT GENERATED] ${worker.id} trigger in ${currentZone} (X:${worker.x.toFixed(1)}, Y:${worker.y.toFixed(1)})\n`);

  try {
    await fetch(`${SERVER_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workerId: worker.id,
        timestamp: new Date().toISOString(),
        event,
        zone: currentZone,
        x: worker.x,
        y: worker.y,
      }),
    });
  } catch (e) {
    console.log(`[ERROR] Failed to send alert:`, e.message);
  }
}

console.log("IoT Hardware Simulator Started [Zone B & Zone C mode].");
setInterval(sendTelemetry, 10000); // Telemetry updates every 10s
sendTelemetry(); 

setInterval(() => {
  const randomWorker = workers[Math.floor(Math.random() * workers.length)];
  triggerEmergency(randomWorker);
}, 20000); // Emergency alerts generated every 20s