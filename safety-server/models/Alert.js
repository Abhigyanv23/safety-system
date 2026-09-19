const mongoose = require('mongoose');

// ------------------------------------------------------------
// Stored flat for simplicity. server.js reshapes this into the
// nested `event: { type, severity, impact_g, confidence, snapshot }`
// contract the frontend (WorkerContext.tsx / normalizeAlert)
// expects before emitting over Socket.IO or returning via the
// history REST endpoint.
//
// FIX: severity enum previously only allowed lowercase
// 'low' | 'warning' | 'critical' and was MISSING 'high' entirely.
// Per the system spec, IMPACT events use severity HIGH, and FALL
// events use CRITICAL. A real Pi sending "HIGH" (or any uppercase
// value) against the old enum would fail Mongoose validation and
// the alert would be dropped with a 500. Enum now matches the
// spec exactly, case-insensitively normalized to uppercase before
// save (see server.js).
// ------------------------------------------------------------

const AlertSchema = new mongoose.Schema({
  workerId: {
    type: String,
    required: true,
  },

  // FALL | IMPACT | ALERT (matches SafetyEvent.type on the frontend)
  type: {
    type: String,
    default: 'ALERT',
  },

  severity: {
    type: String,
    enum: ['LOW', 'WARNING', 'HIGH', 'CRITICAL'],
    default: 'CRITICAL',
  },

  // FALL events carry confidence and leave impact_g null.
  // IMPACT events carry impact_g and leave confidence null.
  // Both stay optional/nullable - never default to 0, per spec
  // Section 15 ("never show fake zero values").
  impact_g: {
    type: Number,
    default: null,
  },

  confidence: {
    type: Number,
    default: null,
  },

  snapshot: {
    type: String,
    default: null,
  },

  x: {
    type: Number,
    default: null,
  },

  y: {
    type: Number,
    default: null,
  },

  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Alert', AlertSchema);