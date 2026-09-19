const SERVER_URL = "http://localhost:5001";

// Simulating W02 and W03 only. W01 is reserved for your actual physical hardware.
//
// FIX: previously this sent a flat { workerId, heartRate, x, y }
// payload, which only ever populated health.heartRate and x/y on
// the frontend (via its legacy-field fallback) - spo2,
// environment, safety, camera, and system.sensors stayed null
// forever for simulated workers. Now sends the full nested shape
// the spec documents for a real Pi's live_telemetry event, so W02
// and W03 exercise the same UI paths W01's real hardware will.
let workers = [
  {
    id: "W02",
    heartRate: 72,
    spo2: 98,
    temperature: 29.5,
    humidity: 64,
    x: 60,
    y: 50,
  },
  {
    id: "W03",
    heartRate: 90,
    spo2: 97,
    temperature: 30.2,
    humidity: 68,
    x: 40,
    y: 70,
  },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

async function sendTelemetry() {
  // 1. Calculate new vitals / environment / position
  workers = workers.map((w) => ({
    ...w,
    // Heart rate fluctuates by up to +/- 5 bpm
    heartRate: clamp(w.heartRate + (Math.floor(Math.random() * 11) - 5), 60, 180),
    spo2: clamp(w.spo2 + (Math.floor(Math.random() * 3) - 1), 90, 100),
    temperature: clamp(w.temperature + (Math.random() * 0.6 - 0.3), 24, 38),
    humidity: clamp(w.humidity + (Math.random() * 2 - 1), 40, 90),
    // Workers move up to 5 coordinate points
    x: clamp(w.x + (Math.random() * 10 - 5), 0, 100),
    y: clamp(w.y + (Math.random() * 10 - 5), 0, 100),
  }));

  // 2. Send the full spec-shaped telemetry payload for each worker
  for (const w of workers) {
    const payload = {
      workerId: w.id,
      timestamp: new Date().toISOString(),

      health: {
        heartRate: Math.round(w.heartRate),
        spo2: w.spo2,
      },

      environment: {
        temperature: Number(w.temperature.toFixed(1)),
        humidity: Number(w.humidity.toFixed(1)),
      },

      safety: {
        systemStatus: "NORMAL",
        vibrationMotor: false,
      },

      // No real camera on simulated workers - reflect that
      // honestly rather than pretending one is connected.
      camera: {
        status: "NOT CONNECTED",
        lastSnapshot: null,
      },

      system: {
        piOnline: true,
        sensors: {
          max30102: true,
          dht11: true,
          ov5647: false,
          mpu6050: true,
        },
        storageFreePercent: 80,
      },

      x: Number(w.x.toFixed(1)),
      y: Number(w.y.toFixed(1)),
    };

    try {
      await fetch(`${SERVER_URL}/api/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      console.log(`[SIMULATOR] Sent telemetry for ${w.id} -> HR: ${payload.health.heartRate} bpm, SpO2: ${payload.health.spo2}%, Location: X:${payload.x} Y:${payload.y}`);
    } catch (e) {
      console.log(`[ERROR] Server offline. Is safety-server running?`);
      return;
    }
  }
  console.log("-----------------------------------");
}

// FIX: previously always sent a FALL-shaped alert (event:
// "Fall Detected", severity: "critical") with no impact_g/
// confidence at all, and x/y as raw numbers that could be 0
// (silently corrupted to 50 server-side by the old `x || 50.0`
// bug - see server.js). This now alternates between FALL and
// IMPACT, sending the correct field for each per spec Sections
// 10/11 (FALL carries confidence, impact_g stays null; IMPACT
// carries impact_g, confidence stays null), and sends the
// nested `event` object the backend/frontend now expect.
async function triggerEmergency(worker) {
  const dropX = Math.floor(Math.random() * 100);
  const dropY = Math.floor(Math.random() * 100);

  const isFall = Math.random() < 0.5;

  const event = isFall
    ? {
        type: "FALL",
        severity: "CRITICAL",
        impact_g: null,
        confidence: Number((90 + Math.random() * 9).toFixed(2)),
        snapshot: null,
      }
    : {
        type: "IMPACT",
        severity: "HIGH",
        impact_g: Number((2 + Math.random() * 6).toFixed(2)),
        confidence: null,
        snapshot: null,
      };

  console.log(`\n[ALERT] SIMULATING ${event.type} FOR ${worker.id} AT X:${dropX}, Y:${dropY}\n`);

  try {
    await fetch(`${SERVER_URL}/api/alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workerId: worker.id,
        timestamp: new Date().toISOString(),
        event,
        x: dropX,
        y: dropY,
      }),
    });
  } catch (e) {
    console.log(`[ERROR] Failed to send alert.`);
  }
}

console.log("IoT Hardware Simulator Started.");
console.log("Sending normal vitals every 60 seconds. Triggering falls/impacts every 60 seconds...");

// Send normal telemetry every 60,000 milliseconds (60 seconds)
setInterval(sendTelemetry, 60000);
sendTelemetry(); // Fire the first batch immediately

// Pick a random worker and trigger a FALL or IMPACT every 60,000 milliseconds
setInterval(() => {
  const randomWorker = workers[Math.floor(Math.random() * workers.length)];
  triggerEmergency(randomWorker);
}, 60000);