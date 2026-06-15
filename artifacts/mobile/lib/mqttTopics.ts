export const MQTT_URL = process.env.EXPO_PUBLIC_MQTT_URL ?? "wss://broker.hivemq.com:8884/mqtt";

const env = (process.env.EXPO_PUBLIC_ENV ?? "development").toLowerCase();
export const IS_PRODUCTION = env === "production";

export interface TopicSet {
  driveVector: string;
  actionKick: string;
  actionDribble: string | null;
  driveRotate: string;
  statusUltrasonic: string;
  statusWifi: string;
  statusMqtt: string;
}

const DEV_TOPICS: TopicSet = {
  driveVector: "robot/drive/vector",
  actionKick: "robot/action/kick",
  actionDribble: "robot/action/dribble",
  driveRotate: "robot/drive/rotate",
  statusUltrasonic: "robot/status/ultrasonic",
  statusWifi: "robot/status/wifi",
  statusMqtt: "robot/status/mqtt",
};

const PROD_TOPICS: TopicSet = {
  driveVector: "robot/gerak/vector",
  actionKick: "robot/tendang",
  actionDribble: null,
  driveRotate: "robot/gerak/rotate",
  statusUltrasonic: "robot/jarak",
  statusWifi: "robot/status/wifi",
  statusMqtt: "robot/status/mqtt",
};

export const MQTT_TOPICS: TopicSet = IS_PRODUCTION ? PROD_TOPICS : DEV_TOPICS;

export type DriveDirection = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export function directionToVector(direction: DriveDirection): { vx: number; vy: number } {
  switch (direction) {
    case "N":
      return { vx: 0, vy: -1 };
    case "NE":
      return { vx: 0.5, vy: -0.5 };
    case "E":
      return { vx: 1, vy: 0 };
    case "SE":
      return { vx: 0.5, vy: 0.5 };
    case "S":
      return { vx: 0, vy: 1 };
    case "SW":
      return { vx: -0.5, vy: 0.5 };
    case "W":
      return { vx: -1, vy: 0 };
    case "NW":
      return { vx: -0.5, vy: -0.5 };
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

  // React Native joystick: y negatif = atas. Firmware: vy negatif = maju (North).
  return vectorToCsv(x, y);
}

export function nowMs(): number {
  return Date.now();
}

export function shouldThrottle(lastSentAt: number, intervalMs = 70): boolean {
  return nowMs() - lastSentAt < intervalMs;
}

export function rotateToCsv(omega: number): string {
  return Math.max(-1, Math.min(1, omega)).toFixed(2);
}
