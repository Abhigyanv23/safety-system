"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react"
import { io, Socket } from "socket.io-client"

// ============================================================
// TYPES
// ============================================================

export type WorkerStatus =
  | "safe"
  | "warning"
  | "alert"
  | "critical"

export type ConnectionState =
  | "CONNECTING"
  | "ONLINE"
  | "OFFLINE"

export type SensorState = boolean

export type EventType =
  | "FALL"
  | "IMPACT"
  | string

export type EventSeverity =
  | "LOW"
  | "WARNING"
  | "HIGH"
  | "CRITICAL"
  | string

// ------------------------------------------------------------
// Health
// ------------------------------------------------------------

export interface WorkerHealth {
  heartRate: number | null
  spo2: number | null
}

// ------------------------------------------------------------
// Environment
// ------------------------------------------------------------

export interface WorkerEnvironment {
  temperature: number | null
  humidity: number | null
}

// ------------------------------------------------------------
// Safety
// ------------------------------------------------------------

export interface WorkerSafety {
  systemStatus: WorkerStatus
  vibrationMotor: boolean | null
}

// ------------------------------------------------------------
// Camera
// ------------------------------------------------------------

export interface WorkerCamera {
  status: string
  lastSnapshot: string | null
}

// ------------------------------------------------------------
// System
// ------------------------------------------------------------

export interface WorkerSensors {
  max30102: boolean
  dht11: boolean
  ov5647: boolean
  mpu6050: boolean
}

export interface WorkerSystem {
  piOnline: boolean
  sensors: WorkerSensors
  storageFreePercent: number | null
}

// ------------------------------------------------------------
// Events
// ------------------------------------------------------------

// Incident lifecycle for an event, tracked client-side only (the
// backend doesn't store or return this - it's purely a dashboard
// workflow concept, same as `acknowledged` was before it).
//   open         -> just arrived, nothing done yet
//   acknowledged -> a supervisor has seen it (this is also what
//                   silences the siren/popup - see acknowledgeAlert)
//   dispatched   -> medical help has been sent
//   resolved     -> fully closed out
export type EventStage =
  | "open"
  | "acknowledged"
  | "dispatched"
  | "resolved"

export interface SafetyEvent {
  id: string
  workerId: string
  type: EventType
  severity: EventSeverity
  timestamp: string
  impact_g: number | null
  confidence: number | null
  snapshot: string | null

  // FIX: previously missing entirely, even though RawAlert already
  // declared x/y and the backend's Alert model stores them. Without
  // these fields, LiveChart.tsx's `event.x`/`event.y` checks always
  // saw `undefined`, so "Incident Hotspots" was permanently empty
  // regardless of what the backend actually sent.
  x: number | null
  y: number | null

  // Frontend-only state.
  // Replaces the previous plain `acknowledged: boolean` with a full
  // stage so the UI can drive an Acknowledge -> Dispatch Medical
  // Help -> Mark as Resolved workflow instead of a single on/off
  // flag. Anywhere that used to check `!event.acknowledged` now
  // checks `event.stage === "open"` instead - equivalent for the
  // "does this still need attention" question, just with two more
  // steps available after that.
  stage: EventStage
}

// ------------------------------------------------------------
// Normalized Worker
// ------------------------------------------------------------

export interface Worker {
  id: string

  // Kept for compatibility with the existing UI.
  // Backend does not currently provide a worker name.
  name: string

  status: WorkerStatus

  // Legacy compatibility.
  // New Raspberry Pi telemetry does not contain battery.
  battery: number | null

  // Legacy compatibility.
  heartRate: number | null

  active: boolean

  // Site-map coordinates.
  x: number | null
  y: number | null

  health: WorkerHealth
  environment: WorkerEnvironment
  safety: WorkerSafety
  camera: WorkerCamera
  system: WorkerSystem

  // Worker-specific event history.
  events: SafetyEvent[]

  // Last telemetry timestamp.
  lastTelemetryAt: string | null

  // True when telemetry has stopped arriving.
  telemetryStale: boolean

  // True when a critical/unresolved event is currently controlling
  // the worker's safety status.
  activeAlert: boolean
}

// ============================================================
// RAW BACKEND TYPES
// ============================================================

interface RawTelemetry {
  workerId?: string
  timestamp?: string

  // New Raspberry Pi structure
  health?: {
    heartRate?: number | null
    spo2?: number | null
  }

  environment?: {
    temperature?: number | null
    humidity?: number | null
  }

  safety?: {
    systemStatus?: string | null
    vibrationMotor?: boolean | null
  }

  camera?: {
    status?: string | null
    lastSnapshot?: string | null
  }

  system?: {
    piOnline?: boolean
    sensors?: Partial<WorkerSensors>
    storageFreePercent?: number | null
  }

  // Old backend compatibility
  heartRate?: number | null
  battery?: number | null
  x?: number | null
  y?: number | null
}

interface RawAlert {
  _id?: string
  id?: string | number

  workerId?: string
  timestamp?: string

  // New structure
  event?: {
    type?: string
    severity?: string
    impact_g?: number | null
    confidence?: number | null
    snapshot?: string | null
  }

  // Old backend structure
  eventType?: string
  severity?: string
  impact_g?: number | null
  confidence?: number | null
  snapshot?: string | null

  x?: number | null
  y?: number | null
}

interface EventHistoryPayload {
  workerId?: string
  events?: RawAlert[]
}

// ============================================================
// CONTEXT
// ============================================================

interface WorkerContextType {
  workers: Worker[]

  // Connection
  connectionState: ConnectionState
  isSocketConnected: boolean
  isUsingMockData: boolean

  // Global events
  events: SafetyEvent[]
  latestAlert: SafetyEvent | null

  // Worker controls
  updateWorkerStatus: (
    id: string,
    newStatus: WorkerStatus
  ) => void

  toggleWorker: (id: string) => void

  acknowledgeAlert: (
    eventId: string,
    workerId?: string
  ) => void

  acknowledgeWorkerAlerts: (
    workerId: string
  ) => void

  // Incident lifecycle - stages after acknowledgment.
  dispatchMedicalHelp: (eventId: string) => void
  resolveEvent: (eventId: string) => void

  // Emergency
  emergencyActive: boolean
  triggerEmergency: () => void
  clearEmergency: () => void
  stopAlarm: () => void

  // Utility
  getWorker: (workerId: string) => Worker | undefined

  // Manual mock control
  refreshMockData: () => void

  // Settings
  siteMapImage: string | null
  setSiteMapImage: (url: string | null) => void
  soundEnabled: boolean
  setSoundEnabled: (value: boolean) => void
  notificationsEnabled: boolean
  setNotificationsEnabled: (value: boolean) => void
}

const WorkerContext = createContext<
  WorkerContextType | undefined
>(undefined)

// ============================================================
// CONFIGURATION
// ============================================================

const BACKEND_URL =
  process.env.NEXT_PUBLIC_SAFETY_BACKEND_URL ||
  "http://localhost:5001"

const MOCK_MODE =
  process.env.NEXT_PUBLIC_SAFETY_MOCK_MODE !== "false"

const TELEMETRY_STALE_AFTER_MS = 15_000

// ============================================================
// MOCK DATA
// ============================================================

const MOCK_TELEMETRY: RawTelemetry = {
  workerId: "W01",
  timestamp: new Date().toISOString(),

  health: {
    heartRate: 78,
    spo2: 98,
  },

  environment: {
    temperature: 29.8,
    humidity: 66,
  },

  safety: {
    systemStatus: "NORMAL",
    vibrationMotor: false,
  },

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

    storageFreePercent: 72,
  },

  x: 25,
  y: 40,
}

// ============================================================
// HELPERS
// ============================================================

function statusFromBackend(
  status?: string | null
): WorkerStatus {
  switch (String(status || "").toUpperCase()) {
    case "CRITICAL":
      return "critical"

    case "ALERT":
      return "alert"

    case "WARNING":
      return "warning"

    case "NORMAL":
    case "SAFE":
      return "safe"

    default:
      return "safe"
  }
}

export function resolveSnapshotUrl(
  snapshot: string | null | undefined
): string | null {
  if (!snapshot) return null

  if (
    snapshot.startsWith("http://") ||
    snapshot.startsWith("https://") ||
    snapshot.startsWith("data:")
  ) {
    return snapshot
  }

  if (snapshot.startsWith("/")) {
    return `${BACKEND_URL}${snapshot}`
  }

  return `${BACKEND_URL}/${snapshot}`
}

function normalizeAlert(
  raw: RawAlert,
  fallbackId?: string
): SafetyEvent | null {
  const workerId = raw.workerId

  if (!workerId) return null

  const nestedEvent =
    typeof raw.event === "object"
      ? raw.event
      : undefined

  let type =
    nestedEvent?.type ||
    raw.eventType ||
    (typeof raw.event === "string"
      ? raw.event
      : undefined)

  if (!type) {
    type = "ALERT"
  }

  type = type.toUpperCase()

  let severity =
    nestedEvent?.severity ||
    raw.severity ||
    (type === "FALL"
      ? "CRITICAL"
      : type === "IMPACT"
        ? "HIGH"
        : "WARNING")

  severity = severity.toUpperCase()

  const timestamp =
    raw.timestamp ||
    new Date().toISOString()

  const id = String(
    raw._id ||
      raw.id ||
      fallbackId ||
      `${workerId}-${type}-${timestamp}`
  )

  const impact =
    nestedEvent?.impact_g ??
    raw.impact_g ??
    null

  const confidence =
    nestedEvent?.confidence ??
    raw.confidence ??
    null

  const snapshot =
    nestedEvent?.snapshot ??
    raw.snapshot ??
    null

  const x = typeof raw.x === "number" ? raw.x : null
  const y = typeof raw.y === "number" ? raw.y : null

  return {
    id,
    workerId,
    type,
    severity,
    timestamp,
    impact_g:
      typeof impact === "number"
        ? impact
        : null,

    confidence:
      typeof confidence === "number"
        ? confidence
        : null,

    snapshot:
      typeof snapshot === "string"
        ? snapshot
        : null,

    x,
    y,

    stage: "open" as const,
  }
}

// ============================================================
// NORMALIZE TELEMETRY
// ============================================================

function normalizeTelemetry(
  raw: RawTelemetry,
  existing?: Worker
): Worker {
  const workerId = raw.workerId || existing?.id || "W01"

  const health: WorkerHealth = {
    heartRate:
      raw.health?.heartRate ??
      raw.heartRate ??
      existing?.health.heartRate ??
      null,

    spo2:
      raw.health?.spo2 ??
      existing?.health.spo2 ??
      null,
  }

  const environment: WorkerEnvironment = {
    temperature:
      raw.environment?.temperature ??
      existing?.environment.temperature ??
      null,

    humidity:
      raw.environment?.humidity ??
      existing?.environment.humidity ??
      null,
  }

  const safety: WorkerSafety = {
    systemStatus:
      raw.safety?.systemStatus != null
        ? statusFromBackend(raw.safety.systemStatus)
        : existing?.safety.systemStatus ?? "safe",

    vibrationMotor:
      raw.safety?.vibrationMotor ??
      existing?.safety.vibrationMotor ??
      null,
  }

  const camera: WorkerCamera = {
    status:
      raw.camera?.status ??
      existing?.camera.status ??
      "NOT CONNECTED",

    lastSnapshot:
      raw.camera?.lastSnapshot ??
      existing?.camera.lastSnapshot ??
      null,
  }

  const sensors: WorkerSensors = {
    max30102:
      raw.system?.sensors?.max30102 ??
      existing?.system.sensors.max30102 ??
      false,

    dht11:
      raw.system?.sensors?.dht11 ??
      existing?.system.sensors.dht11 ??
      false,

    ov5647:
      raw.system?.sensors?.ov5647 ??
      existing?.system.sensors.ov5647 ??
      false,

    mpu6050:
      raw.system?.sensors?.mpu6050 ??
      existing?.system.sensors.mpu6050 ??
      false,
  }

  const system: WorkerSystem = {
    piOnline:
      raw.system?.piOnline ??
      existing?.system.piOnline ??
      false,

    sensors,

    storageFreePercent:
      raw.system?.storageFreePercent ??
      existing?.system.storageFreePercent ??
      null,
  }

  const lastTelemetryAt =
    raw.timestamp ||
    existing?.lastTelemetryAt ||
    new Date().toISOString()

  return {
    id: workerId,

    name:
      existing?.name ||
      workerId,

    status:
      existing?.activeAlert
        ? "critical"
        : safety.systemStatus,

    battery:
      raw.battery ??
      existing?.battery ??
      null,

    heartRate:
      health.heartRate,

    active:
      existing?.active ??
      true,

    x:
      raw.x ??
      existing?.x ??
      null,

    y:
      raw.y ??
      existing?.y ??
      null,

    health,
    environment,
    safety,
    camera,
    system,

    events:
      existing?.events ??
      [],

    lastTelemetryAt,

    telemetryStale:
      false,

    activeAlert:
      existing?.activeAlert ??
      false,
  }
}

// ============================================================
// INITIAL WORKER
// ============================================================

function createInitialWorker(): Worker {
  return normalizeTelemetry(
    MOCK_TELEMETRY
  )
}

// ============================================================
// PROVIDER
// ============================================================

export function WorkerProvider({
  children,
}: {
  children: ReactNode
}) {
  const [workers, setWorkers] = useState<Worker[]>([
    createInitialWorker(),
  ])

  const [events, setEvents] = useState<SafetyEvent[]>([])

  const [latestAlert, setLatestAlert] =
    useState<SafetyEvent | null>(null)

  const [connectionState, setConnectionState] =
    useState<ConnectionState>(
      MOCK_MODE
        ? "OFFLINE"
        : "CONNECTING"
    )

  const [isSocketConnected, setIsSocketConnected] =
    useState(false)

  const [isUsingMockData, setIsUsingMockData] =
    useState(MOCK_MODE)

  const [emergencyActive, setEmergencyActive] =
    useState(false)

  const [soundEnabled, setSoundEnabledState] = useState(true)
  const [notificationsEnabled, setNotificationsEnabledState] = useState(true)
  const [siteMapImage, setSiteMapImageState] = useState<string | null>(null)

  useEffect(() => {
    const savedSound = localStorage.getItem("soundEnabled")
    if (savedSound !== null) {
      setSoundEnabledState(savedSound === "true")
    }

    const savedNotifications = localStorage.getItem(
      "notificationsEnabled"
    )
    if (savedNotifications !== null) {
      setNotificationsEnabledState(savedNotifications === "true")
    }

    const savedLayout = localStorage.getItem("siteMapImage")
    if (savedLayout) {
      setSiteMapImageState(savedLayout)
    }
  }, [])

  const setSoundEnabled = (value: boolean) => {
    setSoundEnabledState(value)
    localStorage.setItem("soundEnabled", String(value))
  }

  const setNotificationsEnabled = (value: boolean) => {
    setNotificationsEnabledState(value)
    localStorage.setItem("notificationsEnabled", String(value))
  }

  const setSiteMapImage = (url: string | null) => {
    setSiteMapImageState(url)
    if (url) {
      try {
        localStorage.setItem("siteMapImage", url)
      } catch (e) {
        alert("Image file is too large to save to local storage. Please use an image under 3MB.")
      }
    } else {
      localStorage.removeItem("siteMapImage")
    }
  }

  const socketRef = useRef<Socket | null>(null)

  const mockIntervalRef =
    useRef<ReturnType<typeof setInterval> | null>(null)

  const workersRef = useRef<Worker[]>(workers)

  useEffect(() => {
    workersRef.current = workers
  }, [workers])

  // ==========================================================
  // WORKER UPDATE HELPER
  // ==========================================================

  const updateWorkerFromTelemetry = (
    telemetry: RawTelemetry
  ) => {
    if (!telemetry.workerId) return

    setWorkers(prev => {
      const existing =
        prev.find(
          worker =>
            worker.id === telemetry.workerId
        )

      const normalized =
        normalizeTelemetry(
          telemetry,
          existing
        )

      if (existing?.activeAlert) {
        normalized.status = "critical"
        normalized.activeAlert = true
      }

      const exists = prev.some(
        worker =>
          worker.id === telemetry.workerId
      )

      if (!exists) {
        return [...prev, normalized]
      }

      return prev.map(worker =>
        worker.id === telemetry.workerId
          ? normalized
          : worker
      )
    })
  }

  // ==========================================================
  // ALERT UPDATE
  // ==========================================================

  const addAlert = (raw: RawAlert) => {
    const alert = normalizeAlert(raw)

    if (!alert) return

    setLatestAlert(alert)

    setEvents(prev => {
      const alreadyExists = prev.some(
        event => event.id === alert.id
      )

      if (alreadyExists) {
        return prev
      }

      return [
        alert,
        ...prev,
      ].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() -
          new Date(a.timestamp).getTime()
      )
    })

    setWorkers(prev => {
      return prev.map(worker => {
        if (worker.id !== alert.workerId) {
          return worker
        }

        const alreadyExists =
          worker.events.some(
            event =>
              event.id === alert.id
          )

        const workerEvents =
          alreadyExists
            ? worker.events
            : [
                alert,
                ...worker.events,
              ]

        return {
          ...worker,

          status:
            alert.severity === "CRITICAL"
              ? "critical"
              : alert.severity === "HIGH"
                ? "warning"
                : statusFromBackend(
                    alert.severity
                  ),

          activeAlert:
            alert.severity === "CRITICAL" ||
            alert.type === "FALL",

          events: workerEvents.sort(
            (a, b) =>
              new Date(
                b.timestamp
              ).getTime() -
              new Date(
                a.timestamp
              ).getTime()
          ),
        }
      })
    })

    if (
      alert.severity === "CRITICAL" ||
      alert.type === "FALL"
    ) {
      setEmergencyActive(true)
    }
  }

  // ==========================================================
  // SOCKET.IO
  // ==========================================================

  useEffect(() => {
    let mounted = true

    if (socketRef.current) {
      return
    }

    const socket = io(
      BACKEND_URL,
      {
        autoConnect: true,

        transports: [
          "websocket",
          "polling",
        ],

        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      }
    )

    socketRef.current = socket

    setConnectionState("CONNECTING")

    socket.on("connect", () => {
      if (!mounted) return

      console.log(
        "🟢 Connected to Safety Backend:",
        socket.id
      )

      setConnectionState("ONLINE")
      setIsSocketConnected(true)

      setIsUsingMockData(false)
    })

    socket.on("disconnect", reason => {
      if (!mounted) return

      console.log(
        "🔴 Safety Backend disconnected:",
        reason
      )

      setConnectionState("OFFLINE")
      setIsSocketConnected(false)

      if (MOCK_MODE) {
        setIsUsingMockData(true)
      }
    })

    socket.on("connect_error", error => {
      if (!mounted) return

      console.warn(
        "⚠️ Safety backend connection error:",
        error.message
      )

      setConnectionState("OFFLINE")
      setIsSocketConnected(false)

      if (MOCK_MODE) {
        setIsUsingMockData(true)
      }
    })

    socket.on(
      "live_telemetry",
      (data: RawTelemetry) => {
        if (!mounted) return

        updateWorkerFromTelemetry(data)
      }
    )

    socket.on(
      "critical_alert",
      (data: RawAlert) => {
        if (!mounted) return

        console.log(
          "🚨 Critical alert received:",
          data
        )

        addAlert(data)
      }
    )

    socket.on(
      "event_history",
      (
        data:
          | EventHistoryPayload
          | RawAlert[]
      ) => {
        if (!mounted) return

        const rawEvents = Array.isArray(data)
          ? data
          : data.events || []

        const normalized =
          rawEvents
            .map((event, index) =>
              normalizeAlert(
                event,
                `history-${index}`
              )
            )
            .filter(
              (
                event
              ): event is SafetyEvent =>
                Boolean(event)
            )

        setEvents(
          normalized.sort(
            (a, b) =>
              new Date(
                b.timestamp
              ).getTime() -
              new Date(
                a.timestamp
              ).getTime()
          )
        )

        setWorkers(prev => {
          return prev.map(worker => {
            const workerEvents =
              normalized.filter(
                event =>
                  event.workerId ===
                  worker.id
              )

            if (
              workerEvents.length === 0
            ) {
              return worker
            }

            const hasCritical =
              workerEvents.some(
                event =>
                  event.stage === "open" &&
                  (
                    event.type === "FALL" ||
                    event.severity ===
                      "CRITICAL"
                  )
              )

            return {
              ...worker,

              events:
                workerEvents,

              activeAlert:
                hasCritical,

              status:
                hasCritical
                  ? "critical"
                  : worker.status,
            }
          })
        })
      }
    )

    socket.on(
      "database_cleared",
      () => {
        if (!mounted) return

        setEvents([])

        setLatestAlert(null)

        setWorkers(prev =>
          prev.map(worker => ({
            ...worker,

            events: [],

            activeAlert: false,

            status:
              worker.safety
                .systemStatus,
          }))
        )

        setEmergencyActive(false)
      }
    )

    return () => {
      mounted = false

      socket.removeAllListeners()

      socket.disconnect()

      socketRef.current = null
    }
  }, [])

  // ==========================================================
  // MOCK DATA ENGINE
  // ==========================================================

  useEffect(() => {
    if (!MOCK_MODE) {
      return
    }

    if (isSocketConnected) {
      if (mockIntervalRef.current) {
        clearInterval(
          mockIntervalRef.current
        )

        mockIntervalRef.current = null
      }

      return
    }

    setIsUsingMockData(true)

    const generateMockTelemetry =
      () => {
        const current =
          workersRef.current.find(
            worker =>
              worker.id === "W01"
          )

        const previousHR =
          current?.health.heartRate ??
          78

        const heartRate = Math.max(
          60,
          Math.min(
            150,
            previousHR +
              Math.floor(
                Math.random() * 7
              ) -
              3
          )
        )

        const temperature =
          28 +
          Math.random() * 4

        const humidity =
          60 +
          Math.random() * 10

        const x = Math.max(
          0,
          Math.min(
            100,
            (current?.x ?? 25) +
              (Math.random() * 4 - 2)
          )
        )

        const y = Math.max(
          0,
          Math.min(
            100,
            (current?.y ?? 40) +
              (Math.random() * 4 - 2)
          )
        )

        updateWorkerFromTelemetry({
          ...MOCK_TELEMETRY,

          timestamp:
            new Date().toISOString(),

          health: {
            heartRate,
            spo2:
              97 +
              Math.floor(
                Math.random() * 3
              ),
          },

          environment: {
            temperature:
              Number(
                temperature.toFixed(1)
              ),

            humidity:
              Number(
                humidity.toFixed(1)
              ),
          },

          x,
          y,
        })
      }

    generateMockTelemetry()

    mockIntervalRef.current =
      setInterval(
        generateMockTelemetry,
        5000
      )

    return () => {
      if (
        mockIntervalRef.current
      ) {
        clearInterval(
          mockIntervalRef.current
        )

        mockIntervalRef.current = null
      }
    }
  }, [isSocketConnected])

  // ==========================================================
  // STALE TELEMETRY MONITOR
  // ==========================================================

  useEffect(() => {
    const checkStaleTelemetry =
      () => {
        const now = Date.now()

        setWorkers(prev =>
          prev.map(worker => {
            if (
              !worker.lastTelemetryAt
            ) {
              return {
                ...worker,
                telemetryStale: true,
              }
            }

            const last =
              new Date(
                worker.lastTelemetryAt
              ).getTime()

            const stale =
              now - last >
              TELEMETRY_STALE_AFTER_MS

            return {
              ...worker,
              telemetryStale: stale,
            }
          })
        )
      }

    checkStaleTelemetry()

    const interval =
      setInterval(
        checkStaleTelemetry,
        5000
      )

    return () =>
      clearInterval(interval)
  }, [])

  // ==========================================================
  // ACKNOWLEDGE SINGLE ALERT
  // ==========================================================

  const acknowledgeAlert = (
    eventId: string,
    workerId?: string
  ) => {
    setEvents(prev =>
      prev.map(event =>
        event.id === eventId
          ? {
              ...event,
              stage: "acknowledged" as const,
            }
          : event
      )
    )

    setWorkers(prev =>
      prev.map(worker => {
        if (
          workerId &&
          worker.id !== workerId
        ) {
          return worker
        }

        const updatedEvents =
          worker.events.map(event =>
            event.id === eventId
              ? {
                  ...event,
                  stage: "acknowledged" as const,
                }
              : event
          )

        const unresolvedCritical =
          updatedEvents.some(
            event =>
              event.stage === "open" &&
              (
                event.type === "FALL" ||
                event.severity ===
                  "CRITICAL"
              )
          )

        return {
          ...worker,

          events: updatedEvents,

          activeAlert:
            unresolvedCritical,

          status:
            unresolvedCritical
              ? "critical"
              : worker.safety
                  .systemStatus,
        }
      })
    )
  }

  // ==========================================================
  // DISPATCH MEDICAL HELP / MARK AS RESOLVED
  // ==========================================================

  const dispatchMedicalHelp = (eventId: string) => {
    setEvents(prev =>
      prev.map(event =>
        event.id === eventId
          ? { ...event, stage: "dispatched" as const }
          : event
      )
    )

    setWorkers(prev =>
      prev.map(worker => ({
        ...worker,
        events: worker.events.map(event =>
          event.id === eventId
            ? { ...event, stage: "dispatched" as const }
            : event
        ),
      }))
    )
  }

  const resolveEvent = (eventId: string) => {
    setEvents(prev =>
      prev.map(event =>
        event.id === eventId
          ? { ...event, stage: "resolved" as const }
          : event
      )
    )

    setWorkers(prev =>
      prev.map(worker => ({
        ...worker,
        events: worker.events.map(event =>
          event.id === eventId
            ? { ...event, stage: "resolved" as const }
            : event
        ),
      }))
    )
  }

  // ==========================================================
  // ACKNOWLEDGE ALL ALERTS FOR WORKER
  // ==========================================================

  const acknowledgeWorkerAlerts = (
    workerId: string
  ) => {
    setEvents(prev =>
      prev.map(event =>
        event.workerId === workerId
          ? {
              ...event,
              stage: "acknowledged" as const,
            }
          : event
      )
    )

    setWorkers(prev =>
      prev.map(worker => {
        if (
          worker.id !== workerId
        ) {
          return worker
        }

        const updatedEvents =
          worker.events.map(event => ({
            ...event,
            stage: "acknowledged" as const,
          }))

        return {
          ...worker,

          events: updatedEvents,

          activeAlert: false,

          status:
            worker.safety.systemStatus,
        }
      })
    )

    setEmergencyActive(prev => {
      const remaining =
        workers.some(
          worker =>
            worker.id !== workerId &&
            worker.activeAlert &&
            worker.active
        )

      return remaining || false
    })
  }

  // ==========================================================
  // MANUAL WORKER STATUS UPDATE
  // ==========================================================

  const updateWorkerStatus = (
    id: string,
    newStatus: WorkerStatus
  ) => {
    setWorkers((prev) =>
      prev.map((worker) => {
        if (worker.id !== id) {
          return worker
        }

        const clearingCritical =
          newStatus === "safe"

        return {
          ...worker,

          status: newStatus,

          activeAlert:
            clearingCritical
              ? false
              : worker.activeAlert,

          events:
            clearingCritical
              ? worker.events.map((event) => ({
                  ...event,
                  acknowledged: true,
                }))
              : worker.events,
        }
      })
    )

    if (newStatus === "safe") {
      setEmergencyActive((current) => {
        const anotherCriticalWorker =
          workers.some(
            (worker) =>
              worker.id !== id &&
              worker.activeAlert &&
              worker.active
          )

        return anotherCriticalWorker
      })
    }

    if (newStatus === "critical") {
      setEmergencyActive(true)
    }
  }

  // ==========================================================
  // TOGGLE WORKER
  // ==========================================================

  const toggleWorker = (
    id: string
  ) => {
    setWorkers(prev =>
      prev.map(worker =>
        worker.id === id
          ? {
              ...worker,
              active:
                !worker.active,
            }
          : worker
      )
    )
  }

  // ==========================================================
  // MANUAL EMERGENCY
  // ==========================================================

  const triggerEmergency = () => {
    setEmergencyActive(true)
  }

  const clearEmergency = () => {
    workers.forEach((worker) => {
      if (worker.activeAlert) {
        acknowledgeWorkerAlerts(worker.id)
      }
    })

    setEmergencyActive(false)
  }

  // ==========================================================
  // STOP ALARM
  // ==========================================================

  const stopAlarm = () => {
    workers.forEach((worker) => {
      if (worker.activeAlert) {
        acknowledgeWorkerAlerts(worker.id)
      }
    })

    setEmergencyActive(false)

    const siren =
      document.getElementById(
        "emergency-siren"
      ) as HTMLAudioElement | null

    if (siren) {
      siren.pause()
      siren.currentTime = 0
    }
  }

  // ==========================================================
  // GET WORKER
  // ==========================================================

  const getWorker = (
    workerId: string
  ) => {
    return workers.find(
      worker =>
        worker.id === workerId
    )
  }

  // ==========================================================
  // MOCK REFRESH
  // ==========================================================

  const refreshMockData = () => {
    if (
      !MOCK_MODE ||
      isSocketConnected
    ) {
      return
    }

    updateWorkerFromTelemetry({
      ...MOCK_TELEMETRY,
      timestamp:
        new Date().toISOString(),
    })
  }

  // ==========================================================
  // GLOBAL EMERGENCY STATE
  // ==========================================================

  useEffect(() => {
    const hasActiveCritical =
      workers.some(
        worker =>
          worker.active &&
          worker.activeAlert
      )

    if (hasActiveCritical) {
      setEmergencyActive(true)
    }
  }, [workers])

  // ==========================================================
  // SORT EVENTS
  // ==========================================================

  const sortedEvents =
    useMemo(() => {
      return [...events].sort(
        (a, b) =>
          new Date(
            b.timestamp
          ).getTime() -
          new Date(
            a.timestamp
          ).getTime()
      )
    }, [events])

  // ==========================================================
  // CONTEXT VALUE
  // ==========================================================

  const contextValue =
    useMemo<WorkerContextType>(
      () => ({
        workers,

        connectionState,

        isSocketConnected,

        isUsingMockData,

        events: sortedEvents,

        latestAlert,

        updateWorkerStatus,

        toggleWorker,

        acknowledgeAlert,

        acknowledgeWorkerAlerts,

        dispatchMedicalHelp,

        resolveEvent,

        emergencyActive,

        triggerEmergency,

        clearEmergency,

        stopAlarm,

        getWorker,

        refreshMockData,

        siteMapImage,

        setSiteMapImage,

        soundEnabled,

        setSoundEnabled,

        notificationsEnabled,

        setNotificationsEnabled,
      }),
      [
        workers,
        connectionState,
        isSocketConnected,
        isUsingMockData,
        sortedEvents,
        latestAlert,
        emergencyActive,
        siteMapImage,
        soundEnabled,
        notificationsEnabled,
      ]
    )

  return (
    <WorkerContext.Provider
      value={contextValue}
    >
      {children}
    </WorkerContext.Provider>
  )
}

// ============================================================
// HOOK
// ============================================================

export function useWorkers() {
  const context =
    useContext(WorkerContext)

  if (!context) {
    throw new Error(
      "useWorkers must be used inside WorkerProvider"
    )
  }

  return context
}