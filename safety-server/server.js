const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const Alert = require('./models/Alert');
const Telemetry = require('./models/Telemetry');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// ==========================================
// 1. DATABASE CONNECTION
// ==========================================
const MONGO_URI = "mongodb://localhost:27017/safety_db";

mongoose.connect(MONGO_URI)
  .then(() => console.log("💾 MongoDB Connected Successfully"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// ==========================================
// 2. SOCKET.IO SETUP
// ==========================================
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

let lastKnownTelemetry = {};

function toWireAlert(doc) {
  return {
    id: String(doc._id || doc.id),
    workerId: doc.workerId,
    timestamp: doc.timestamp,
    x: doc.x ?? null,
    y: doc.y ?? null,
    event: {
      type: doc.type,
      severity: doc.severity,
      impact_g: doc.impact_g ?? null,
      confidence: doc.confidence ?? null,
      snapshot: doc.snapshot ?? null,
    },
  };
}

io.on('connection', async (socket) => {
  console.log(`🟢 Dashboard Connected: ${socket.id}`);

  try {
    const history = await Alert.find().sort({ timestamp: -1 }).limit(20);
    socket.emit('event_history', {
      events: history.map(toWireAlert),
    });
  } catch (err) {
    console.error("❌ Failed to send event history on connect:", err.message);
  }

  socket.on('disconnect', () => console.log(`🔴 Dashboard Disconnected`));
});

// ==========================================
// 3. API ENDPOINTS
// ==========================================

// GET HISTORY: Fetch last 20 alerts from MongoDB
app.get('/api/alerts/history', async (req, res) => {
  try {
    const history = await Alert.find().sort({ timestamp: -1 }).limit(20);
    res.json(history.map(toWireAlert));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CLEAR DATABASE: Wipes all alerts
app.get('/api/alerts/clear', async (req, res) => {
  try {
    await Alert.deleteMany({});
    console.log("🧹 DATABASE CLEARED: All alerts wiped!");
    io.emit('database_cleared');
    res.json({ success: true, message: "Database completely cleared." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TELEMETRY: Real-time vitals
app.post('/api/telemetry', async (req, res) => {
  const body = req.body || {};
  const { workerId } = body;

  if (!workerId) {
    return res.status(400).json({ success: false, message: "workerId is required." });
  }

  const telemetry = {
    workerId,
    timestamp: body.timestamp || new Date().toISOString(),

    health: body.health || {
      heartRate: body.heartRate ?? null,
      spo2: body.spo2 ?? null,
    },

    environment: body.environment || {
      temperature: body.temperature ?? null,
      humidity: body.humidity ?? null,
    },

    safety: body.safety || {
      systemStatus: body.systemStatus || "NORMAL",
      vibrationMotor: body.vibrationMotor ?? null,
    },

    camera: body.camera || {
      status: body.cameraStatus || "NOT CONNECTED",
      lastSnapshot: body.lastSnapshot ?? null,
    },

    system: body.system || {
      piOnline: body.piOnline ?? true,
      sensors: body.sensors || {
        max30102: false,
        dht11: false,
        ov5647: false,
        mpu6050: false,
      },
      storageFreePercent: body.storageFreePercent ?? null,
    },

    x: body.x ?? null,
    y: body.y ?? null,
  };

  lastKnownTelemetry[workerId] = telemetry;

  io.emit('live_telemetry', telemetry);
  res.status(200).json({ success: true });

  try {
    await Telemetry.create(telemetry);
  } catch (err) {
    console.error(`❌ Failed to persist telemetry for ${workerId}:`, err.message);
  }
});

// HISTORY: sensor readings for one worker
app.get('/api/telemetry/history', async (req, res) => {
  const { workerId, limit } = req.query;

  if (!workerId) {
    return res.status(400).json({ success: false, message: "workerId query param is required." });
  }

  const cappedLimit = Math.min(Number(limit) || 100, 1000);

  try {
    const history = await Telemetry.find({ workerId })
      .sort({ timestamp: -1 })
      .limit(cappedLimit);

    res.json(history);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// EMERGENCY: Fall / Impact alerts sent from Raspberry Pi
app.post('/api/events', async (req, res) => {
  console.log("📥 Incoming Alert Payload:", req.body);

  const body = req.body || {};
  const { workerId, x, y } = body;

  const nestedEvent = typeof body.event === "object" ? body.event : undefined;

  const type = (
    nestedEvent?.type ??
    (typeof body.event === "string" ? body.event : undefined) ??
    "ALERT"
  ).toUpperCase();

  const severity = (
    nestedEvent?.severity ??
    body.severity ??
    (type === "FALL DETECTED" ? "CRITICAL" : type === "IMPACT DETECTED" ? "HIGH" : "WARNING")
  ).toUpperCase();

  try {
    const newAlert = new Alert({
      workerId: workerId || "UNKNOWN_WORKER",
      type,
      severity,
      impact_g: nestedEvent?.impact_g ?? body.impact_g ?? null,
      confidence: nestedEvent?.confidence ?? body.confidence ?? null,
      snapshot: nestedEvent?.snapshot ?? null,
      x: x ?? 50.0,
      y: y ?? 50.0,
      timestamp: new Date(),
    });

    await newAlert.save();

    console.log(`🚨 ALERT SAVED: ${newAlert.workerId} (${newAlert.type}/${newAlert.severity}) at Zone (X:${newAlert.x}, Y:${newAlert.y})`);

    io.emit('critical_alert', toWireAlert(newAlert));
    res.status(200).json({ success: true, db_id: newAlert._id });
  } catch (err) {
    console.error("❌ Failed to save alert:", err);
    res.status(500).json({ success: false });
  }
});

// VIBRATION MOTOR: Dashboard -> Pi Command
app.post('/api/vibration', (req, res) => {
  const { command, workerId } = req.body;
  console.log(`📳 Sending vibration command [${command}] to ${workerId}`);
  
  // Broadcast command to connected Pi clients
  io.emit('vibration_command', { command, workerId });
  res.status(200).json({ success: true });
});

// ==========================================
// 4. SERVER START & NETWORK BINDING
// ==========================================

const PORT = 5001;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=========================================`);
  console.log(`🚀 Safety Backend Online`);
  console.log(`💻 Local (Dashboard): http://localhost:${PORT}`);
  console.log(`=========================================\n`);
});

// ==========================================
// FORGOT PASSWORD ENDPOINT
// ==========================================
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({
      success: false,
      message: "Valid email address required."
    });
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error("❌ EMAIL_USER / EMAIL_PASS are not configured.");
    return res.status(500).json({
      success: false,
      message: "Password reset is not configured on this server."
    });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    }
  });

  const mailOptions = {
    from: `"Safety Dashboard Admin" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Password Reset Request - Supervisor Portal',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0b1220; color: #ffffff; border-radius: 10px;">
        <h2 style="color: #60a5fa;">Supervisor Portal Password Reset</h2>
        <p style="color: #cbd5e1;">You requested a password reset for the Safety Dashboard System.</p>
        <p style="color: #cbd5e1;">Click the button below to reset your credentials:</p>
        <a href="http://localhost:3000/reset-password?email=${encodeURIComponent(email)}"
           style="display: inline-block; padding: 12px 24px; background-color: #059669; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">
          Reset Password
        </a>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">If you did not request this, please ignore this email.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✉️ Password reset email dispatched to ${email}`);
    return res.status(200).json({
      success: true,
      message: "Reset link sent successfully."
    });
  } catch (err) {
    console.error("❌ Nodemailer Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to send reset email. Please try again later."
    });
  }
});