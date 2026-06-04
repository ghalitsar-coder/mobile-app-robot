import mqtt, { MqttClient } from "mqtt";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  DriveDirection,
  MQTT_TOPICS,
  MQTT_URL,
  directionToCsv,
  joystickToCsv,
  shouldThrottle,
} from "@/lib/mqttTopics";

export type ConnectionStatus = "demo" | "connecting" | "connected" | "disconnected";

export interface TelemetryData {
  batteryLevel: number;
  ballDistance: number;
  linkQuality: number;
  latency: number;
}

export interface JoystickState {
  x: number;
  y: number;
  angle: number;
  magnitude: number;
  direction: string;
}

interface RobotContextValue {
  connectionStatus: ConnectionStatus;
  telemetry: TelemetryData;
  dribblerActive: boolean;
  setDribblerActive: (active: boolean) => void;
  joystick: JoystickState;
  setJoystick: (state: JoystickState) => void;
  dpadDirection: DriveDirection | null;
  setDpadDirection: (direction: DriveDirection | null) => void;
  kick: () => void;
  connectToRobot: (url?: string) => void;
  disconnectRobot: () => void;
  publishDriveVector: (vx: number, vy: number, force?: boolean) => boolean;
  lastKickTime: number | null;
  mqttUrl: string;
  lastError: string | null;
}

const defaultTelemetry: TelemetryData = {
  batteryLevel: 78.4,
  ballDistance: 45,
  linkQuality: 91,
  latency: 12,
};

const defaultJoystick: JoystickState = {
  x: 0,
  y: 0,
  angle: 0,
  magnitude: 0,
  direction: "CENTER",
};

const RobotContext = createContext<RobotContextValue | null>(null);

export function RobotProvider({ children }: { children: React.ReactNode }) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [telemetry, setTelemetry] = useState<TelemetryData>(defaultTelemetry);
  const [dribblerActiveState, setDribblerActiveState] = useState(false);
  const [joystick, setJoystickState] = useState<JoystickState>(defaultJoystick);
  const [dpadDirection, setDpadDirectionState] = useState<DriveDirection | null>(null);
  const [lastKickTime, setLastKickTime] = useState<number | null>(null);
  const [mqttUrl, setMqttUrl] = useState(MQTT_URL);
  const [lastError, setLastError] = useState<string | null>(null);

  const clientRef = useRef<MqttClient | null>(null);
  const simTickRef = useRef(0);
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastDriveSentAtRef = useRef(0);
  const lastDrivePayloadRef = useRef("0.00,0.00");
  const lastPingAtRef = useRef(Date.now());

  const publish = useCallback((topic: string, payload: string) => {
    const client = clientRef.current;
    if (!client || !client.connected) {
      return false;
    }
    client.publish(topic, payload, { qos: 0, retain: false });
    return true;
  }, []);

  const publishDrivePayload = useCallback(
    (payload: string, force = false) => {
      if (!force && payload === lastDrivePayloadRef.current) return true;
      if (!force && shouldThrottle(lastDriveSentAtRef.current, 70)) return true;

      lastDrivePayloadRef.current = payload;
      lastDriveSentAtRef.current = Date.now();
      return publish(MQTT_TOPICS.driveVector, payload);
    },
    [publish]
  );

  const publishDriveVector = useCallback(
    (vx: number, vy: number, force = false) => publishDrivePayload(`${vx.toFixed(2)},${vy.toFixed(2)}`, force),
    [publishDrivePayload]
  );

  const connectToRobot = useCallback((url = MQTT_URL) => {
    if (clientRef.current) {
      clientRef.current.end(true);
      clientRef.current = null;
    }

    setMqttUrl(url);
    setConnectionStatus("connecting");
    setLastError(null);

    const client = mqtt.connect(url, {
      clientId: `robocommand-mobile-${Math.random().toString(16).slice(2)}`,
      clean: true,
      connectTimeout: 10000,
      reconnectPeriod: 5000,
      keepalive: 60,
    });

    clientRef.current = client;

    client.on("connect", () => {
      setConnectionStatus("connected");
      setLastError(null);
      client.subscribe(MQTT_TOPICS.statusUltrasonic, { qos: 0 });
      client.subscribe(MQTT_TOPICS.statusWifi, { qos: 0 });
      client.subscribe(MQTT_TOPICS.statusMqtt, { qos: 0 });
      lastPingAtRef.current = Date.now();
      publish(MQTT_TOPICS.driveVector, "0.00,0.00");
    });

    client.on("message", (topic, message) => {
      const payload = message.toString();
      if (topic === MQTT_TOPICS.statusUltrasonic) {
        const distance = Number.parseFloat(payload.trim());
        if (Number.isFinite(distance)) {
          setTelemetry((prev) => ({
            ...prev,
            ballDistance: Math.max(0, Math.min(999, Math.round(distance))),
            latency: Math.max(1, Date.now() - lastPingAtRef.current),
            linkQuality: 100,
          }));
          lastPingAtRef.current = Date.now();
        }
      }
    });

    client.on("reconnect", () => setConnectionStatus("connecting"));
    client.on("close", () => setConnectionStatus("disconnected"));
    client.on("offline", () => setConnectionStatus("disconnected"));
    client.on("error", (err) => {
      setLastError(err.message);
      setConnectionStatus("disconnected");
    });
  }, [publish]);

  const disconnectRobot = useCallback(() => {
    publish(MQTT_TOPICS.driveVector, "0.00,0.00");
    clientRef.current?.end(true);
    clientRef.current = null;
    setConnectionStatus("disconnected");
  }, [publish]);

  useEffect(() => {
    connectToRobot(MQTT_URL);
    return () => {
      clientRef.current?.end(true);
      clientRef.current = null;
    };
  }, [connectToRobot]);

  // Fallback dummy telemetry untuk battery/link selama ESP32 belum publish topic tersebut.
  useEffect(() => {
    simIntervalRef.current = setInterval(() => {
      simTickRef.current += 1;
      const t = simTickRef.current;
      setTelemetry((prev) => ({
        batteryLevel: Math.max(0, prev.batteryLevel - (t % 200 === 0 ? 0.3 : 0)),
        ballDistance: prev.ballDistance,
        linkQuality:
          connectionStatus === "connected"
            ? Math.min(100, Math.max(70, 94 + Math.round(Math.sin(t * 0.11) * 5)))
            : Math.min(100, Math.max(40, 70 + Math.round(Math.sin(t * 0.11) * 8))),
        latency:
          connectionStatus === "connected"
            ? Math.round(10 + Math.abs(Math.sin(t * 0.13)) * 18)
            : prev.latency,
      }));
    }, 600);

    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, [connectionStatus]);

  const setJoystick = useCallback(
    (state: JoystickState) => {
      setJoystickState(state);
      setDpadDirectionState(null);
      const payload = joystickToCsv(state.x, state.y, state.magnitude);
      publishDrivePayload(payload, state.magnitude < 0.05);
    },
    [publishDrivePayload]
  );

  const setDpadDirection = useCallback(
    (direction: DriveDirection | null) => {
      setDpadDirectionState(direction);
      setJoystickState(defaultJoystick);
      const payload = direction ? directionToCsv(direction) : "0.00,0.00";
      publishDrivePayload(payload, true);
    },
    [publishDrivePayload]
  );

  const setDribblerActive = useCallback(
    (active: boolean) => {
      setDribblerActiveState(active);
      publish(MQTT_TOPICS.actionDribble, active ? "LOCK" : "RELEASE");
    },
    [publish]
  );

  const kick = useCallback(() => {
    if (!dribblerActiveState) return;
    publish(MQTT_TOPICS.actionKick, "KICK");
    setLastKickTime(Date.now());
  }, [dribblerActiveState, publish]);

  return (
    <RobotContext.Provider
      value={{
        connectionStatus,
        telemetry,
        dribblerActive: dribblerActiveState,
        setDribblerActive,
        joystick,
        setJoystick,
        dpadDirection,
        setDpadDirection,
        kick,
        connectToRobot,
        disconnectRobot,
        publishDriveVector,
        lastKickTime,
        mqttUrl,
        lastError,
      }}
    >
      {children}
    </RobotContext.Provider>
  );
}

export function useRobot() {
  const ctx = useContext(RobotContext);
  if (!ctx) throw new Error("useRobot must be used within RobotProvider");
  return ctx;
}
