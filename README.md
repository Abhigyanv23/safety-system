# Edge-AI Enabled Cooperative Wearable Safety Ecosystem

**Smart Helmet + Smart Vest for Construction Worker Safety**

A two-part wearable safety system for construction sites: a completed **smart helmet** that runs on-device fall detection on an ESP32-S3, and an in-progress **smart vest** built around a Raspberry Pi 5 that aggregates health, environment, and hardware telemetry and streams it to a real-time Next.js safety dashboard.

> Capstone / PBL-4 project — *"Edge-AI Enabled Cooperative Wearable Safety Ecosystem: Smart Vest Development and Research Dissemination"* (prior phase: *"Edge-AI Enabled Cooperative Proximity Analysis and Fall Discrimination for Enhanced Construction Safety"*)

---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Hardware](#hardware)
- [Helmet: Fall Detection Model](#helmet-fall-detection-model)
- [Repository Structure](#repository-structure)
- [Data Contracts](#data-contracts)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Dashboard Features](#dashboard-features)
- [Project Status](#project-status)
- [Known Issues / In Progress](#known-issues--in-progress)
- [Team](#team)

---

## Overview

Construction sites present two dominant, poorly-correlated risk categories: **falls** (from height, or loss of balance) and **physiological/environmental strain** (heat stress, fatigue, poor air quality). This project addresses both with a cooperative pair of wearables:

- **Smart Helmet** (fall-detection model in active development) — an ESP32-S3 running an on-device LSTM that aims to discriminate genuine falls from false positives (walking, sitting, bending) in real time, using only IMU data. No cloud dependency for detection; alerts fire locally within milliseconds once the model clears its current false-positive-rate bar.
- **Smart Vest** (in progress) — a Raspberry Pi 5 "hub" worn as the central compute unit, aggregating heart rate/SpO2, ambient temperature/humidity, a fall/impact co-processor (ESP32 + IMU), an event-triggered camera, and a haptic vibration motor for supervisor-initiated alerts. Telemetry streams to a supervisor-facing web dashboard in real time.

The guiding architectural principle throughout the vest + dashboard stack:

> **Sensors → Raspberry Pi → Dashboard.** The Pi is the single source of truth for all telemetry. The browser never talks to sensors, GPIO, or hardware directly, and the dashboard never fabricates data it hasn't actually received.

---

## System Architecture

```
                    ┌────────────────────┐
                    │   ESP32 + MPU6050  │
                    │  Fall / Impact IMU │
                    └──────────┬─────────┘
                               │ HTTP
                               ▼
┌─────────────────────────────────────────────────┐
│                Raspberry Pi 5 (Vest Hub)        │
│                                                 │
│   MAX30102 ──► Heart Rate / SpO2                │
│   DHT11    ──► Temperature / Humidity           │
│   OV5647   ──► Event-triggered camera snapshots │
│   Vibration Motor ──► Haptic safety feedback    │
│   System monitor ──► Pi status, sensor health,  │
│                       storage                   │
│                                                 │
│                vest_server.py                   │
└──────────────────────┬──────────────────────────┘
                       │  Live telemetry + events
                       ▼
              ┌──────────────────────┐
              │   Next.js Dashboard  │
              │  (safety-system-     │
              │      frontend/)      │
              │                      │
              │  Health · Environment│
              │  Safety · Camera     │
              │  System Status       │
              │  Event History       │
              │  Critical Alerts     │
              └──────────────────────┘
```

**Rules that must never be broken** (enforced throughout the codebase):

- Sensor logic never lives in the Next.js frontend.
- The dashboard never talks to MAX30102 / DHT11 / MPU6050 / GPIO directly.
- Null sensor data renders as `--` / "Unavailable" — **never** a fake `0`.
- `impact_g` (IMPACT events) and `confidence` (FALL events) are distinct fields and are never substituted for one another.
- The worker ID is currently `W01`, but every component is multi-worker-ready (`W02`, `W03`, …).

---

## Hardware

### Smart Helmet (hardware complete, model in development)

| Component | Role |
|---|---|
| ESP32-S3 | On-device INT8 LSTM inference (TensorFlow Lite Micro) |
| MPU6050 IMU | 6-axis (accelerometer + gyroscope), configured to ±4g |
| Buzzer | Local audible alert on detected fall |
| Wi-Fi | Dashboard alert transmission |

### Smart Vest (in progress)

| Component | Interface | Role |
|---|---|---|
| Raspberry Pi 5 | — | Central compute hub; runs `vest_server.py` |
| ESP32 + MPU6050 | HTTP → Pi | Fall / impact event detection |
| MAX30102 | I²C (addr `0x57`) | Heart rate + SpO2 |
| DHT11 | GPIO | Temperature + humidity |
| OV5647 camera | CSI | Event-triggered snapshots (fall/impact) |
| Vibration motor | GPIO/PWM | Haptic alert, remotely toggleable from the dashboard |

---

## Helmet: Fall Detection Model

On-device fall detection for the construction-site helmet: an LSTM trained on the **UP-Fall dataset** (real, neck-mounted sensor data) and fine-tuned on a physics-grounded synthetic construction-activity dataset, running directly on an ESP32-S3 with no cloud dependency for detection.

### Datasets

**UP-Fall Detection Dataset (primary training data)** — real recordings from 17 subjects, ~18.4Hz sampling rate, **neck-mounted** sensor placement. Chosen specifically over the more common SisFall dataset because neck placement is anatomically much closer to a helmet than SisFall's waist placement, given the head's additional rotation/lever-arm behavior during a fall.

**Custom synthetic construction dataset (fine-tuning data)** — physics-equation-generated signals (gravity + periodic motion models, real free-fall/impact physics for falls) covering 7 activities: standing, walking, climbing a ladder, using a power tool, bending over, carrying a load, and falling. Built as a stopgap ahead of real data collection — **not** LLM-generated (an earlier LLM-generated attempt was discarded after scoring a meaningless 100% test accuracy, later traced to overly clean, physically ungrounded synthetic patterns).

> **Known limitation:** power-tool vibration is modeled as a low-frequency jitter proxy, not a physically accurate signature — UP-Fall's ~18.4Hz sampling rate can't represent real tool vibration frequencies (typically 20–50Hz+) without aliasing (Nyquist limit ~9.2Hz).

### Training Pipeline

1. Train the base LSTM on UP-Fall (subject-grouped split, per-trial windowing, seeded for reproducibility).
2. Fine-tune on the synthetic construction dataset at a 10x lower learning rate — preserves what was learned from real fall dynamics while adapting toward construction-specific motion, rather than letting the smaller synthetic set overwrite it.
3. Evaluate on **both** the real UP-Fall validation set and the synthetic validation set, checking specifically for catastrophic forgetting (fine-tuning improving one at the expense of the other).

Full training code: `UP_Dataset_Fixed_Complete.py` (UP-Fall pipeline) and `Synthetic_Construction_Dataset_and_Finetune.py` (dataset generation + fine-tuning).

<details>
<summary>Bugs fixed during development (see <code>UPFall_Training_Overview.md</code> for full detail)</summary>

- Missing `EarlyStopping` definition (notebook wouldn't run standalone)
- Sampling-rate/window-duration mismatch (200 samples ≈ 11s at UP-Fall's rate, not the intended ~1s — corrected to 20-sample windows)
- Windows sliding across subject/trial boundaries, splicing unrelated recordings together
- Non-grouped train/validation split (leakage risk)
- Unseeded training (same config produced different results across runs)
- Model-size explosion from `unroll=True` LSTM export at 200 timesteps (2.1MB) — resolved by the window-size fix above (98,872 bytes)

</details>

### Current Model Status

**Honest baseline** (threshold=0.5, seeded, subject-disjoint validation):

```
Fall:   recall 85%, precision 41%
False positive rate: 22.4%
Model size: 98,872 bytes
```

**⚠️ Not yet deployment-ready.** The false-positive rate risks the same alarm-fatigue failure mode this project's own literature review identifies in other published systems. Training curves show overfitting from epoch 1 — next steps are increasing dropout / reducing LSTM units before further threshold tuning, not accepting this as final.

### Firmware Setup

1. Install **NimBLE-Arduino** (only if using the optional BLE-to-vest path) and **EloquentTinyML** libraries via Arduino IDE Library Manager.
2. Copy `secrets.h.example` to `secrets.h`, fill in real Wi-Fi/server credentials. **Never commit `secrets.h`** — add it to `.gitignore`.
3. Place `lstm_model_data.h` (the trained model, converted via `xxd -i model.tflite > lstm_model_data.h`) in the same sketch folder.
4. Flash `fall_detection_fixed.ino`.

Scaler values in the firmware must match whatever model is currently flashed — re-extract `scaler.mean_`/`scaler.scale_` from the training notebook and update the firmware's `scaler_means`/`scaler_scales` arrays any time the model is retrained.

### Helmet Alert Schema

The firmware posts directly to the dashboard's `/api/alert` endpoint:

```json
{"workerId": "W01", "event": "Fall Detected", "severity": "critical", "confidence": 91.2}
```

> ⚠️ This is the **legacy flat schema** (`event` as a plain string), not the nested `event: { type, severity, ... }` contract the rest of this system uses (see [Data Contracts](#data-contracts)). See [Known Issues](#known-issues--in-progress) for the resulting integration gap.

### What's Not Included Here

- Real helmet-mounted data collection (planned, not yet done — the synthetic dataset above is an interim stand-in)
- Subject/trial-leakage-free evaluation of the fine-tuned combined model on a truly independent construction-activity test set beyond the synthetic validation split
- Overfitting fixes (dropout/capacity tuning) for the current baseline

A companion 53-paper systematic literature review — *"Wearable Fall Detection for Construction Worker Safety: A Systematic Review and Critical Analysis"* — identified five recurring weaknesses across prior work (construction-domain neglect, lab-vs-field gap, test-set overfitting, false-positive ambiguity, hardware heterogeneity), and an "inverse accuracy–rigor paradox," where papers claiming higher accuracy tend to use less rigorous methodology — a pattern this project's own honest baseline above is deliberately trying not to repeat.

---

## Repository Structure

```
safety-da.../
├── safety-system-frontend/       # Next.js dashboard
│   ├── app/
│   │   ├── components/           # ActivityFeed, AlertPopup, AlertsTable,
│   │   │                         # CameraPanel, LiveChart, Navbar,
│   │   │                         # SensorStatusPanel, Sidebar, SiteMap,
│   │   │                         # Statcard, SupervisorPanel,
│   │   │                         # TelemetryCards, ThemeToggle, WorkerModal
│   │   ├── context/
│   │   │   └── WorkerContext.tsx # Central state: telemetry normalization,
│   │   │                         # Socket.IO wiring, event lifecycle
│   │   ├── dashboard/            # Main dashboard route
│   │   ├── login/                # Supervisor auth
│   │   ├── settings/             # Sound / notification preferences
│   │   ├── workers/              # Worker management route
│   │   ├── providers/            # ClientProviders (theme + context setup)
│   │   ├── lib/
│   │   │   └── api.ts            # REST client for the Pi's /vest/* endpoints
│   │   └── globals.css
│   ├── .env.local
│   └── .env.local.example
│
├── safety-server/                 # Node.js dev/mock backend + simulator
│   ├── models/
│   │   ├── Alert.js               # Fall/impact event schema (MongoDB)
│   │   └── Telemetry.js           # Persisted sensor-reading history (TTL)
│   ├── server.js                  # Socket.IO + REST API, command handling
│   ├── simulator.js               # Simulates W02/W03 while W01 is reserved
│   │                               # for real hardware
│   └── .env.example
│
└── README.md
```

---

## Data Contracts

The system currently has **two parallel data-transport paths** under active development — see [Known Issues](#known-issues--in-progress) for the reconciliation plan.

### 1. Socket.IO push contract (`safety-server/`, dev/mock backend)

**`live_telemetry`** (emitted continuously per worker):

```json
{
  "workerId": "W01",
  "timestamp": "2026-09-16T15:12:30+05:30",
  "health": { "heartRate": 78, "spo2": 98 },
  "environment": { "temperature": 29.8, "humidity": 66.0 },
  "safety": { "systemStatus": "NORMAL", "vibrationMotor": false },
  "camera": { "status": "ACTIVE", "lastSnapshot": "/snapshots/latest.jpg" },
  "system": {
    "piOnline": true,
    "sensors": { "max30102": true, "dht11": true, "ov5647": true, "mpu6050": true },
    "storageFreePercent": 72
  }
}
```

**`critical_alert`** (FALL or IMPACT event):

```json
{
  "workerId": "W01",
  "timestamp": "2026-09-16T15:15:05+05:30",
  "event": {
    "type": "FALL",
    "severity": "CRITICAL",
    "impact_g": null,
    "confidence": 96.42,
    "snapshot": "/snapshots/fall_20260916_151505.jpg"
  }
}
```

> `FALL` events carry `confidence`; `IMPACT` events carry `impact_g`. The two are never interchanged, and neither is ever backfilled with `0` when absent.

**Dashboard → backend commands** (e.g. manual vibration control):

```json
{ "workerId": "W01", "command": "SET_VIBRATION", "value": true }
```

### 2. REST polling contract (`vest_server.py`, real Pi — under integration)

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Server liveness check |
| `/vest/telemetry` | GET | Current sensor snapshot for the worker |
| `/vest/events` | GET | Recent helmet/vest incident log |
| `/vest/vibration` | POST | `{ workerId, action: "PULSE" \| "OFF", duration }` |

This contract additionally reports a per-field `dataSource: "LIVE" | "MOCK" | "NONE"` and `status: "ONLINE" | "OFFLINE" | "WAITING" | "ERROR"`, letting the Pi itself declare when a sensor (e.g. MAX30102 waiting for finger detection) is not yet producing real data — rather than the dashboard guessing.

---

## Getting Started

### Frontend (`safety-system-frontend/`)

```bash
cd safety-system-frontend
npm install
cp .env.local.example .env.local   # then edit as needed
npm run dev
```

Runs at `http://localhost:3000`.

### Dev/mock backend (`safety-server/`)

```bash
cd safety-server
npm install
cp .env.example .env               # required for password-reset email
npm run start        # or: node server.js
node simulator.js    # optional — simulates W02/W03 telemetry + events
```

Runs at `http://localhost:5001`. MongoDB must be running locally (`mongodb://localhost:27017/safety_db`) for alert/telemetry persistence.

### Real Raspberry Pi backend (`vest_server.py`)

Runs on the Pi itself on port `5000`. Find the Pi's LAN IP with `hostname -I` and point the frontend's `NEXT_PUBLIC_SAFETY_BACKEND_URL` / `NEXT_PUBLIC_API_BASE` at it — never hardcode the IP into individual components.

---

## Environment Variables

**`safety-system-frontend/.env.local`**

```dotenv
NEXT_PUBLIC_SAFETY_BACKEND_URL=http://localhost:5001
NEXT_PUBLIC_SAFETY_MOCK_MODE=true
```

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SAFETY_BACKEND_URL` | Socket.IO / REST backend base URL |
| `NEXT_PUBLIC_SAFETY_MOCK_MODE` | `true` generates local mock telemetry for W01 when no backend is connected; set `false` once real hardware is live |

**`safety-server/.env`**

```dotenv
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASS=your_16_character_app_password
```

Required for the supervisor password-reset flow (Gmail SMTP via an [App Password](https://myaccount.google.com/apppasswords), not your normal account password). Never committed — keep `.env` out of version control.

---

## Dashboard Features

- **Real-time telemetry** — health, environment, safety, camera, and system/sensor status, per worker, with a worker-switcher to view any active worker's data
- **Multi-worker simulation** — `W01` reserved for real hardware; `W02`/`W03` run simulated telemetry in parallel for demo purposes
- **Critical alert pipeline** — full-screen warning, siren, and popup on a genuine FALL/IMPACT event, all driven from a single `emergencyActive` state so there's no risk of the alarm and the visible alert disagreeing
- **Incident lifecycle** — each event moves through `Open → Acknowledged → Dispatched (medical help) → Resolved`, tracked per-event rather than as a single global flag
- **Manual vibration control** — supervisors can remotely trigger the vest's haptic motor from the dashboard
- **Incident hotspots** — zone-based visualization of where FALL/IMPACT events have occurred on-site
- **Event history** — persisted alert log with snapshot linking, backed by MongoDB
- **Light/dark theme**, connection-status indicator, and role-gated supervisor login

---

## Project Status

| Component | Status |
|---|---|
| Helmet hardware (ESP32-S3, MPU6050, buzzer, Wi-Fi) | ✅ Complete |
| Helmet fall-detection model | ⚠️ In development — 85% recall / 41% precision, 22.4% false-positive rate, overfitting from epoch 1; **not** deployment-ready |
| Raspberry Pi 5, I²C, DHT11, vibration motor | ✅ Working |
| ESP32 (vest side): MPU6050, buzzer, Wi-Fi | ✅ Working |
| MAX30102 | ⚠️ Detected at I²C `0x57`; BPM/SpO2 sampling logic in progress |
| OV5647 camera | ✅ Working |
| ESP32 → Raspberry Pi HTTP link | 🔄 Under test |
| Dashboard (Socket.IO backend) | ✅ Functional, actively maintained |
| Dashboard (real Pi REST backend) | 🔄 Integration in progress |

---

## Known Issues / In Progress

- **Two backend contracts, one dashboard.** `safety-server/` (Socket.IO, port 5001) was built first and is fully wired to the dashboard. `vest_server.py` (REST, port 5000) reflects the real Pi's now-implemented API and has a different payload shape and transport model entirely. Reconciling these — most likely by adapting `WorkerContext.tsx` to consume the REST contract while preserving the existing component tree — is the current priority.
- **No multi-worker support yet on the real Pi contract** — `vest/telemetry` returns a single hardcoded `W01`. The dashboard's worker-selector currently assumes multiple workers may be present.
- **MAX30102** raw I²C communication confirmed, but BPM/SpO2 sampling firmware/backend logic is still being finalized.
- **Helmet model not deployment-ready** — 22.4% false-positive rate and overfitting from epoch 1 risk the exact alarm-fatigue failure mode identified in this project's own literature review. Needs dropout/capacity tuning before further threshold work.

---
