import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Feather } from "@expo/vector-icons";

import { VirtualJoystick } from "@/components/VirtualJoystick";
import { useRobot } from "@/context/RobotContext";
import { useColors } from "@/hooks/useColors";

const STATUS_LABELS: Record<string, string> = {
  demo: "DEMO MODE",
  connecting: "CONNECTING",
  connected: "CONNECTED",
  disconnected: "OFFLINE",
};

function StatusPill() {
  const colors = useColors();
  const { connectionStatus } = useRobot();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (connectionStatus === "connecting") {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [connectionStatus, pulseAnim]);

  const dotColor =
    connectionStatus === "connected"
      ? colors.success
      : connectionStatus === "demo"
      ? colors.warning
      : connectionStatus === "connecting"
      ? colors.warning
      : colors.danger;

  const pillBg =
    connectionStatus === "connected"
      ? colors.successBg
      : connectionStatus === "demo"
      ? colors.warningBg
      : connectionStatus === "connecting"
      ? colors.warningBg
      : colors.dangerBg;

  const textColor =
    connectionStatus === "connected"
      ? colors.success
      : connectionStatus === "demo"
      ? colors.warning
      : connectionStatus === "connecting"
      ? colors.warning
      : colors.danger;

  return (
    <View style={[styles.statusPill, { backgroundColor: pillBg, borderColor: `${dotColor}30` }]}>
      <Animated.View
        style={[styles.statusDot, { backgroundColor: dotColor, opacity: pulseAnim }]}
      />
      <Text style={[styles.statusPillText, { color: textColor, fontFamily: "Inter_600SemiBold" }]}>
        {STATUS_LABELS[connectionStatus]}
      </Text>
    </View>
  );
}

function TelemetryCard({
  label,
  value,
  unit,
  icon,
  progress,
  progressColor,
}: {
  label: string;
  value: string;
  unit: string;
  icon: string;
  progress: number;
  progressColor: string;
}) {
  const colors = useColors();
  const animProgress = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    Animated.timing(animProgress, {
      toValue: progress,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [progress, animProgress]);

  const barWidth = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
    extrapolate: "clamp",
  });

  return (
    <View
      style={[
        styles.telemetryCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.telemetryHeader}>
        <Feather name={icon as any} size={12} color={colors.mutedForeground} />
        <Text
          style={[styles.telemetryLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}
        >
          {label}
        </Text>
      </View>
      <View style={styles.telemetryValue}>
        <Text style={[styles.telemetryNumber, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          {value}
        </Text>
        <Text style={[styles.telemetryUnit, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {unit}
        </Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
        <Animated.View
          style={[
            styles.progressFill,
            { backgroundColor: progressColor, width: barWidth },
          ]}
        />
      </View>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeader}>
      <Text
        style={[
          styles.sectionTitle,
          { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
        ]}
      >
        {title}
      </Text>
      <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
    </View>
  );
}

function DribblerCard() {
  const colors = useColors();
  const { dribblerActive, setDribblerActive } = useRobot();

  const handleToggle = (val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setDribblerActive(val);
  };

  return (
    <View
      style={[
        styles.actuatorCard,
        {
          backgroundColor: colors.card,
          borderColor: dribblerActive ? colors.primary : colors.border,
        },
      ]}
    >
      <View style={styles.actuatorIcon}>
        <Feather
          name="rotate-cw"
          size={18}
          color={dribblerActive ? colors.primary : colors.mutedForeground}
        />
      </View>
      <Text
        style={[
          styles.actuatorLabel,
          {
            color: dribblerActive ? colors.primary : colors.mutedForeground,
            fontFamily: "Inter_600SemiBold",
          },
        ]}
      >
        DRIBBLER
      </Text>
      <Text
        style={[
          styles.actuatorSubLabel,
          {
            color: dribblerActive ? colors.success : colors.mutedForeground,
            fontFamily: "Inter_500Medium",
          },
        ]}
      >
        {dribblerActive ? "ACTIVE" : "STANDBY"}
      </Text>
      <Switch
        value={dribblerActive}
        onValueChange={handleToggle}
        trackColor={{ false: colors.muted, true: `${colors.primary}40` }}
        thumbColor={dribblerActive ? colors.primary : colors.accent}
        ios_backgroundColor={colors.muted}
        style={styles.switchControl}
      />
    </View>
  );
}

function KickButton() {
  const colors = useColors();
  const { dribblerActive, kick, lastKickTime } = useRobot();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [justKicked, setJustKicked] = useState(false);

  useEffect(() => {
    if (lastKickTime) {
      setJustKicked(true);
      const t = setTimeout(() => setJustKicked(false), 600);
      return () => clearTimeout(t);
    }
  }, [lastKickTime]);

  const handlePress = useCallback(() => {
    if (!dribblerActive) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }),
    ]).start();
    kick();
  }, [dribblerActive, kick, scaleAnim]);

  const isLocked = !dribblerActive;

  return (
    <Animated.View
      style={[{ transform: [{ scale: scaleAnim }], flex: 1 }]}
    >
      <Pressable
        onPress={handlePress}
        disabled={isLocked}
        style={[
          styles.actuatorCard,
          styles.kickCard,
          {
            backgroundColor: isLocked
              ? colors.muted
              : justKicked
              ? `${colors.primary}E0`
              : colors.primary,
            borderColor: isLocked ? colors.border : colors.primary,
            opacity: isLocked ? 0.55 : 1,
          },
        ]}
      >
        <Feather
          name={isLocked ? "lock" : "zap"}
          size={22}
          color={isLocked ? colors.mutedForeground : colors.primaryForeground}
        />
        <Text
          style={[
            styles.actuatorLabel,
            {
              color: isLocked ? colors.mutedForeground : colors.primaryForeground,
              fontFamily: "Inter_700Bold",
              fontSize: 15,
            },
          ]}
        >
          KICK
        </Text>
        <Text
          style={[
            styles.actuatorSubLabel,
            {
              color: isLocked ? colors.mutedForeground : `${colors.primaryForeground}CC`,
              fontFamily: "Inter_500Medium",
            },
          ]}
        >
          {isLocked ? "SAFETY LOCK" : justKicked ? "FIRED" : "ARMED"}
        </Text>
        {isLocked && (
          <Text
            style={[
              styles.interlockNote,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            Enable dribbler first
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function ControllerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { telemetry, joystick } = useRobot();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const batteryColor =
    telemetry.batteryLevel > 50
      ? colors.success
      : telemetry.batteryLevel > 20
      ? colors.warning
      : colors.danger;

  const distColor =
    telemetry.ballDistance < 30
      ? colors.success
      : telemetry.ballDistance < 80
      ? colors.warning
      : colors.mutedForeground;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 10,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.robotDot, { backgroundColor: colors.primary }]} />
          <View>
            <Text
              style={[styles.robotId, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}
            >
              ROBOT FC-01
            </Text>
            <Text
              style={[
                styles.robotSub,
                { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
              ]}
            >
              Omnidirectional · 3-wheel drive
            </Text>
          </View>
        </View>
        <StatusPill />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Telemetry row */}
        <View style={styles.telemetryRow}>
          <TelemetryCard
            label="BATTERY"
            value={telemetry.batteryLevel.toFixed(1)}
            unit="%"
            icon="battery"
            progress={telemetry.batteryLevel / 100}
            progressColor={batteryColor}
          />
          <TelemetryCard
            label="DISTANCE"
            value={String(telemetry.ballDistance)}
            unit="cm"
            icon="radio"
            progress={Math.max(0, 1 - telemetry.ballDistance / 150)}
            progressColor={distColor}
          />
          <TelemetryCard
            label="LINK"
            value={String(telemetry.linkQuality)}
            unit="%"
            icon="wifi"
            progress={telemetry.linkQuality / 100}
            progressColor={colors.success}
          />
        </View>

        {/* Movement section */}
        <SectionHeader title="MOVEMENT CONTROL" />
        <View
          style={[
            styles.joystickCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <VirtualJoystick />

          <View
            style={[styles.joystickInfo, { borderTopColor: colors.border }]}
          >
            <View style={styles.joystickStat}>
              <Text
                style={[
                  styles.joystickStatLabel,
                  { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                ]}
              >
                DIRECTION
              </Text>
              <Text
                style={[
                  styles.joystickStatValue,
                  { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
                ]}
              >
                {joystick.direction === "CENTER" ? "—" : joystick.direction}
              </Text>
            </View>
            <View
              style={[styles.joystickDivider, { backgroundColor: colors.border }]}
            />
            <View style={styles.joystickStat}>
              <Text
                style={[
                  styles.joystickStatLabel,
                  { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                ]}
              >
                MAGNITUDE
              </Text>
              <Text
                style={[
                  styles.joystickStatValue,
                  { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
                ]}
              >
                {joystick.direction === "CENTER"
                  ? "0%"
                  : `${Math.round(joystick.magnitude * 100)}%`}
              </Text>
            </View>
            <View
              style={[styles.joystickDivider, { backgroundColor: colors.border }]}
            />
            <View style={styles.joystickStat}>
              <Text
                style={[
                  styles.joystickStatLabel,
                  { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                ]}
              >
                LATENCY
              </Text>
              <Text
                style={[
                  styles.joystickStatValue,
                  { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
                ]}
              >
                {telemetry.latency}ms
              </Text>
            </View>
          </View>
        </View>

        {/* Actuator section */}
        <SectionHeader title="ACTUATORS" />
        <View style={styles.actuatorRow}>
          <DribblerCard />
          <KickButton />
        </View>

        {/* Footer note */}
        <Text
          style={[
            styles.footerNote,
            { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
          ]}
        >
          Kick solenoid is hardware-interlocked with dribbler state.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  robotDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  robotId: {
    fontSize: 15,
    letterSpacing: 0.8,
  },
  robotSub: {
    fontSize: 11,
    marginTop: 1,
    letterSpacing: 0.2,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 10,
    letterSpacing: 0.6,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 10,
    letterSpacing: 1.2,
  },
  sectionLine: {
    flex: 1,
    height: 1,
  },
  telemetryRow: {
    flexDirection: "row",
    gap: 8,
  },
  telemetryCard: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  telemetryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  telemetryLabel: {
    fontSize: 9,
    letterSpacing: 0.8,
  },
  telemetryValue: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
    marginTop: 2,
  },
  telemetryNumber: {
    fontSize: 22,
    lineHeight: 26,
  },
  telemetryUnit: {
    fontSize: 11,
    marginBottom: 1,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    marginTop: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  joystickCard: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    paddingTop: 24,
    paddingBottom: 0,
  },
  joystickInfo: {
    flexDirection: "row",
    borderTopWidth: 1,
    marginTop: 20,
  },
  joystickStat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    gap: 4,
  },
  joystickStatLabel: {
    fontSize: 9,
    letterSpacing: 0.8,
  },
  joystickStatValue: {
    fontSize: 14,
    letterSpacing: 0.3,
  },
  joystickDivider: {
    width: 1,
    marginVertical: 10,
  },
  actuatorRow: {
    flexDirection: "row",
    gap: 10,
  },
  actuatorCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    padding: 16,
    alignItems: "center",
    gap: 6,
    minHeight: 130,
    justifyContent: "center",
  },
  kickCard: {
    borderStyle: "solid",
  },
  actuatorIcon: {
    marginBottom: 2,
  },
  actuatorLabel: {
    fontSize: 13,
    letterSpacing: 1.0,
  },
  actuatorSubLabel: {
    fontSize: 10,
    letterSpacing: 0.6,
  },
  switchControl: {
    marginTop: 6,
    transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }],
  },
  interlockNote: {
    fontSize: 9,
    letterSpacing: 0.3,
    textAlign: "center",
    marginTop: 2,
    opacity: 0.7,
  },
  footerNote: {
    fontSize: 10,
    textAlign: "center",
    letterSpacing: 0.2,
    marginTop: 4,
    opacity: 0.6,
  },
});
