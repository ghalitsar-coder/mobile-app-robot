import * as Haptics from "expo-haptics";
import React, { useRef } from "react";
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { type JoystickState, useRobot } from "@/context/RobotContext";
import { useColors } from "@/hooks/useColors";

const BASE_RADIUS = 90;
const THUMB_RADIUS = 30;
const MAX_DISTANCE = BASE_RADIUS - THUMB_RADIUS - 4;

function getDirection(angleDeg: number, magnitude: number): string {
  if (magnitude < 0.12) return "CENTER";
  const n = ((angleDeg % 360) + 360) % 360;
  if (n >= 337.5 || n < 22.5) return "E";
  if (n >= 22.5 && n < 67.5) return "SE";
  if (n >= 67.5 && n < 112.5) return "S";
  if (n >= 112.5 && n < 157.5) return "SW";
  if (n >= 157.5 && n < 202.5) return "W";
  if (n >= 202.5 && n < 247.5) return "NW";
  if (n >= 247.5 && n < 292.5) return "N";
  if (n >= 292.5 && n < 337.5) return "NE";
  return "CENTER";
}

const COMPASS_DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export function VirtualJoystick() {
  const colors = useColors();
  const { setJoystick, joystick } = useRobot();
  const position = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const lastDirRef = useRef("CENTER");

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      },
      onPanResponderMove: (_, { dx, dy }) => {
        const dist = Math.sqrt(dx * dx + dy * dy);
        const clamped = Math.min(dist, MAX_DISTANCE);
        const angle = Math.atan2(dy, dx);
        const cx = clamped * Math.cos(angle);
        const cy = clamped * Math.sin(angle);
        position.setValue({ x: cx, y: cy });

        const magnitude = clamped / MAX_DISTANCE;
        const angleDeg = ((angle * 180) / Math.PI + 360) % 360;
        const direction = getDirection(angleDeg, magnitude);

        const state: JoystickState = {
          x: cx / MAX_DISTANCE,
          y: cy / MAX_DISTANCE,
          angle: angleDeg,
          magnitude,
          direction,
        };
        setJoystick(state);

        if (direction !== lastDirRef.current) {
          lastDirRef.current = direction;
          if (direction !== "CENTER") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }
        }
      },
      onPanResponderRelease: () => {
        Animated.spring(position, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
          tension: 250,
          friction: 14,
        }).start();
        lastDirRef.current = "CENTER";
        setJoystick({ x: 0, y: 0, angle: 0, magnitude: 0, direction: "CENTER" });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      },
    })
  ).current;

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.base,
          {
            backgroundColor: colors.secondary,
            borderColor: colors.border,
            width: BASE_RADIUS * 2,
            height: BASE_RADIUS * 2,
            borderRadius: BASE_RADIUS,
          },
        ]}
      >
        <View style={[styles.crossH, { backgroundColor: colors.accent }]} />
        <View style={[styles.crossV, { backgroundColor: colors.accent }]} />

        <View
          style={[
            styles.ring,
            {
              width: BASE_RADIUS * 1.3,
              height: BASE_RADIUS * 1.3,
              borderRadius: BASE_RADIUS * 0.65,
              borderColor: colors.accent,
            },
          ]}
        />

        <Animated.View
          style={[
            styles.thumb,
            {
              backgroundColor: colors.primary,
              width: THUMB_RADIUS * 2,
              height: THUMB_RADIUS * 2,
              borderRadius: THUMB_RADIUS,
              transform: [
                { translateX: position.x },
                { translateY: position.y },
              ],
            },
          ]}
          {...panResponder.panHandlers}
        />
      </View>

      <View style={styles.compassRow}>
        {COMPASS_DIRS.map((dir) => (
          <View
            key={dir}
            style={[
              styles.compassItem,
              {
                backgroundColor:
                  joystick.direction === dir ? colors.primary : "transparent",
                borderColor:
                  joystick.direction === dir ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.compassText,
                {
                  color:
                    joystick.direction === dir
                      ? colors.primaryForeground
                      : colors.mutedForeground,
                  fontFamily: "Inter_500Medium",
                },
              ]}
            >
              {dir}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    gap: 16,
  },
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  crossH: {
    position: "absolute",
    width: "70%",
    height: 1,
    opacity: 0.5,
  },
  crossV: {
    position: "absolute",
    width: 1,
    height: "70%",
    opacity: 0.5,
  },
  ring: {
    position: "absolute",
    borderWidth: 1,
    opacity: 0.4,
  },
  thumb: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  compassRow: {
    flexDirection: "row",
    gap: 4,
  },
  compassItem: {
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 3,
    borderWidth: 1,
    minWidth: 28,
    alignItems: "center",
  },
  compassText: {
    fontSize: 9,
    letterSpacing: 0.3,
  },
});
