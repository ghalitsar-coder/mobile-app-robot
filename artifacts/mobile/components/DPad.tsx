import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { type DriveDirection } from "@/lib/mqttTopics";
import { useColors } from "@/hooks/useColors";

const DIRECTIONS: { key: DriveDirection; angle: number; label: string }[] = [
  { key: "N", angle: 0, label: "↑" },
  { key: "NE", angle: 45, label: "↗" },
  { key: "E", angle: 90, label: "→" },
  { key: "SE", angle: 135, label: "↘" },
  { key: "S", angle: 180, label: "↓" },
  { key: "SW", angle: 225, label: "↙" },
  { key: "W", angle: 270, label: "←" },
  { key: "NW", angle: 315, label: "↖" },
];

interface DPadProps {
  active?: DriveDirection | null;
  onPress?: (direction: DriveDirection) => void;
  onRelease?: () => void;
}

export function DPad({ active, onPress, onRelease }: DPadProps) {
  const colors = useColors();
  const radius = 82;
  const size = 216;
  const buttonSize = 48;

  const pressDirection = (direction: DriveDirection) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.(direction);
  };

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}> 
      <View
        style={[
          styles.base,
          {
            backgroundColor: colors.secondary,
            borderColor: colors.border,
            borderRadius: size / 2,
          },
        ]}
      />
      <View
        style={[
          styles.idle,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.idleText, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>IDLE</Text>
      </View>

      {DIRECTIONS.map(({ key, angle, label }) => {
        const rad = ((angle - 90) * Math.PI) / 180;
        const x = Math.cos(rad) * radius;
        const y = Math.sin(rad) * radius;
        const isActive = active === key;

        return (
          <Pressable
            key={key}
            onPressIn={() => pressDirection(key)}
            onPressOut={() => onRelease?.()}
            style={({ pressed }) => [
              styles.button,
              {
                width: buttonSize,
                height: buttonSize,
                left: size / 2 - buttonSize / 2 + x,
                top: size / 2 - buttonSize / 2 + y,
                backgroundColor: isActive || pressed ? colors.primary : colors.card,
                borderColor: isActive || pressed ? colors.primary : colors.border,
                transform: [{ scale: isActive || pressed ? 1.06 : 1 }],
              },
            ]}
          >
            <Text
              style={[
                styles.arrow,
                { color: isActive ? colors.primaryForeground : colors.foreground, fontFamily: "Inter_700Bold" },
              ]}
            >
              {label}
            </Text>
            <Text
              style={[
                styles.key,
                { color: isActive ? colors.primaryForeground : colors.mutedForeground, fontFamily: "Inter_500Medium" },
              ]}
            >
              {key}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: "center",
    position: "relative",
  },
  base: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
  },
  idle: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 58,
    height: 58,
    marginLeft: -29,
    marginTop: -29,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  idleText: {
    fontSize: 10,
    letterSpacing: 1,
  },
  button: {
    position: "absolute",
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  arrow: {
    fontSize: 20,
    lineHeight: 22,
  },
  key: {
    marginTop: 1,
    fontSize: 9,
    letterSpacing: 0.6,
  },
});
