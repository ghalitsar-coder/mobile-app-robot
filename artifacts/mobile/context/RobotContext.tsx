import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

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
  kick: () => void;
  connectToRobot: (url: string) => void;
  lastKickTime: number | null;
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
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("demo");
  const [telemetry, setTelemetry] = useState<TelemetryData>(defaultTelemetry);
  const [dribblerActive, setDribblerActive] = useState(false);
  const [joystick, setJoystick] = useState<JoystickState>(defaultJoystick);
  const [lastKickTime, setLastKickTime] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const simTickRef = useRef(0);
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    simIntervalRef.current = setInterval(() => {
      simTickRef.current += 1;
      const t = simTickRef.current;
      setTelemetry((prev) => ({
        batteryLevel: Math.max(0, prev.batteryLevel - (t % 200 === 0 ? 0.3 : 0)),
        ballDistance: Math.round(20 + Math.abs(Math.sin(t * 0.07)) * 90),
        linkQuality: Math.min(100, Math.max(60, 91 + Math.round(Math.sin(t * 0.11) * 6))),
        latency: Math.round(8 + Math.abs(Math.sin(t * 0.13)) * 14),
      }));
    }, 600);

    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, []);

  const connectToRobot = useCallback((url: string) => {
    if (wsRef.current) wsRef.current.close();
    setConnectionStatus("connecting");

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => setConnectionStatus("connected");
      ws.onclose = () => setConnectionStatus("disconnected");
      ws.onerror = () => setConnectionStatus("disconnected");
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as {
            type: string;
            payload: TelemetryData;
          };
          if (data.type === "telemetry") {
            setTelemetry(data.payload);
          }
        } catch {
        }
      };
    } catch {
      setConnectionStatus("disconnected");
    }
  }, []);

  const sendCommand = useCallback((command: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(command));
    }
  }, []);

  const kick = useCallback(() => {
    if (!dribblerActive) return;
    sendCommand({ type: "kick", timestamp: Date.now() });
    setLastKickTime(Date.now());
  }, [dribblerActive, sendCommand]);

  return (
    <RobotContext.Provider
      value={{
        connectionStatus,
        telemetry,
        dribblerActive,
        setDribblerActive,
        joystick,
        setJoystick,
        kick,
        connectToRobot,
        lastKickTime,
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
