import type { ConnectionStatus as StatusType } from "@/types/chat";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

interface ConnectionStatusProps {
  status: StatusType;
  strangerTyping?: boolean;
}

// Modern color palette
const COLORS = {
  background: "#0c0c12",
  border: "#1f1f2e",
  idle: "#4a4a6a",
  searching: "#fbbf24",
  searchingBg: "rgba(251, 191, 36, 0.08)",
  connected: "#22c55e",
  connectedBg: "rgba(34, 197, 94, 0.08)",
  disconnected: "#f43f5e",
  disconnectedBg: "rgba(244, 63, 94, 0.08)",
  text: "#ffffff",
  textMuted: "#64648b",
};

const STATUS_CONFIG: Record<
  StatusType,
  { text: string; color: string; bgColor: string; pulse?: boolean }
> = {
  idle: {
    text: "Ready to connect",
    color: COLORS.idle,
    bgColor: "transparent",
  },
  searching: {
    text: "Finding someone...",
    color: COLORS.searching,
    bgColor: COLORS.searchingBg,
    pulse: true,
  },
  connected: {
    text: "Connected",
    color: COLORS.connected,
    bgColor: COLORS.connectedBg,
  },
  disconnected: {
    text: "Disconnected",
    color: COLORS.disconnected,
    bgColor: COLORS.disconnectedBg,
  },
};

export function ConnectionStatus({
  status,
  strangerTyping,
}: ConnectionStatusProps) {
  const config = STATUS_CONFIG[status];
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (config.pulse) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [config.pulse, pulseAnim]);

  return (
    <View style={[styles.container, { backgroundColor: config.bgColor }]}>
      <View style={styles.statusRow}>
        <Animated.View
          style={[
            styles.indicator,
            { backgroundColor: config.color, opacity: pulseAnim },
          ]}
        />
        <Text style={[styles.statusText, { color: config.color }]}>
          {config.text}
        </Text>
      </View>
      {strangerTyping && status === "connected" && (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>typing</Text>
          <TypingDots />
        </View>
      )}
    </View>
  );
}

function TypingDots() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createDotAnimation = (dotAnim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dotAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dotAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(600 - delay),
        ])
      );
    };

    const anim1 = createDotAnimation(dot1, 0);
    const anim2 = createDotAnimation(dot2, 200);
    const anim3 = createDotAnimation(dot3, 400);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3]);

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -2],
        }),
      },
    ],
  });

  return (
    <View style={styles.dotsContainer}>
      <Animated.Text style={[styles.dot, dotStyle(dot1)]}>•</Animated.Text>
      <Animated.Text style={[styles.dot, dotStyle(dot2)]}>•</Animated.Text>
      <Animated.Text style={[styles.dot, dotStyle(dot3)]}>•</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginLeft: 18,
  },
  typingText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: "italic",
  },
  dotsContainer: {
    flexDirection: "row",
    marginLeft: 2,
  },
  dot: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginHorizontal: 1,
  },
});
