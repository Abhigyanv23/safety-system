const mongoose = require('mongoose');

// ------------------------------------------------------------
// Persists every live_telemetry reading (all workers - W01's
// real hardware included, not just simulated W02/W03) so sensor
// history survives a server restart and can be queried later.
//
// TTL: documents auto-expire 7 days after `timestamp` via
// Mongoose's `expires` schema option (creates a TTL index under
// the hood - MongoDB itself sweeps expired docs, no cron job
// needed). Change the number below to adjust retention; set it
// to `undefined`/remove `expires` entirely to keep telemetry
// forever (be aware of collection size growth if you do).
// ------------------------------------------------------------

const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;

const TelemetrySchema = new mongoose.Schema({
  workerId: {
    type: String,
    required: true,
  },

  health: {
    heartRate: { type: Number, default: null },
    spo2: { type: Number, default: null },
  },

  environment: {
    temperature: { type: Number, default: null },
    humidity: { type: Number, default: null },
  },

  safety: {
    systemStatus: { type: String, default: "NORMAL" },
    vibrationMotor: { type: Boolean, default: null },
  },

  camera: {
    status: { type: String, default: "NOT CONNECTED" },
    lastSnapshot: { type: String, default: null },
  },

  system: {
    piOnline: { type: Boolean, default: true },
    sensors: {
      max30102: { type: Boolean, default: false },
      dht11: { type: Boolean, default: false },
      ov5647: { type: Boolean, default: false },
      mpu6050: { type: Boolean, default: false },
    },
    storageFreePercent: { type: Number, default: null },
  },

  battery: { type: Number, default: null },

  x: { type: Number, default: null },
  y: { type: Number, default: null },

  timestamp: {
    type: Date,
    default: Date.now,
    expires: SEVEN_DAYS_IN_SECONDS,
  },
});

// Speeds up "last N readings for worker X" queries, which is the
// access pattern the history endpoint below actually uses.
TelemetrySchema.index({ workerId: 1, timestamp: -1 });

module.exports = mongoose.model('Telemetry', TelemetrySchema);