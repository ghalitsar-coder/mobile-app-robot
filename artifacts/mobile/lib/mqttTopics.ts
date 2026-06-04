export const MQTT_URL = process.env.EXPO_PUBLIC_MQTT_URL ?? "wss://broker.hivemq.com:8884/mqtt";

export const MQTT_TOPICS = {
  driveVector: process.env.EXPO_PUBLIC_MQTT_DRIVE_VECTOR_TOPIC ?? "robot/drive/vector",
  actionKick: process.env.EXPO_PUBLIC_MQTT_KICK_TOPIC ?? "robot/action/kick",
  actionDribble: process.env.EXPO_PUBLIC_MQTT_DRIBBLE_TOPIC ?? "robot/action/dribble",
  statusUltrasonic: process.env.EXPO_PUBLIC_MQTT_ULTRASONIC_TOPIC ?? "robot/status/ultrasonic",
  statusWifi: process.env.EXPO_PUBLIC_MQTT_WIFI_TOPIC ?? "robot/status/wifi",
  statusMqtt: process.env.EXPO_PUBLIC_MQTT_STATUS_TOPIC ?? "robot/status/mqtt",
} as const;

export type DriveDirection = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export function directionToVector(direction: DriveDirection): { vx: number; vy: number } {
  switch (direction) {
    case "N":
      return { vx: 0, vy: 1 };
    case "NE":
      return { vx: 0.5, vy: 0.5 };
    case "E":
      return { vx: 1, vy: 0 };
    case "SE":
      return { vx: 0.5, vy: -0.5 };
    case "S":
      return { vx: 0, vy: -1 };
    case "SW":
      return { vx: -0.5, vy: -0.5 };
    case "W":
      return { vx: -1, vy: 0 };
    case "NW":
      return { vx: -0.5, vy: 0.5 };
  }
}

export function vectorToCsv(vx: number, vy: number): string {
  const safeVx = Math.max(-1, Math.min(1, vx));
  const safeVy = Math.max(-1, Math.min(1, vy));
  return `${safeVx.toFixed(2)},${safeVy.toFixed(2)}`;
}

export function directionToCsv(direction: DriveDirection): string {
  const { vx, vy } = directionToVector(direction);
  return vectorToCsv(vx, vy);
}

export function joystickToCsv(x: number, y: number, magnitude: number): string {
  if (magnitude < 0.05) return "0.00,0.00";

  // React Native joystick: y negatif = atas. ESP32 kita: vy positif = maju.
  return vectorToCsv(x, -y);
}

export function nowMs(): number {
  return Date.now();
}

export function shouldThrottle(lastSentAt: number, intervalMs = 70): boolean {
  return nowMs() - lastSentAt < intervalMs;
}
