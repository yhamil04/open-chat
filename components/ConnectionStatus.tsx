import type { ConnectionStatus as StatusType } from "@/types/chat";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface ConnectionStatusProps {
  status: StatusType;
  strangerTyping?: boolean;
}

const STATUS_CONFIG: Record<
  StatusType,
  { text: string; color: string; bgColor: string; pulse?: boolean }
> = {
  idle: {
    text: "Ready to connect",
    color: "#6b7280",
    bgColor: "#1e1e2e",
  },
  searching: {
    text: "Looking for someone...",
    color: "#f59e0b",
    bgColor: "#422006",
    pulse: true,
  },
  connected: {
    text: "Connected with a stranger",
    color: "#10b981",
    bgColor: "#052e16",
  },
  disconnected: {
    text: "Stranger has disconnected",
    color: "#ef4444",
    bgColor: "#450a0a",
  },
};

export function ConnectionStatus({
  status,
  strangerTyping,
}: ConnectionStatusProps) {
  const config = STATUS_CONFIG[status];

  return (
    <View
      style={styles.container}
      className="px-4 py-2 bg-dark-surface border-b border-dark-border"
    >
      <View style={styles.statusRow} className="flex-row items-center">
        <View
          style={[
            styles.indicator,
            { backgroundColor: config.color },
            config.pulse && styles.pulseIndicator,
          ]}
          className="w-2.5 h-2.5 rounded-full mr-2"
        />
        <Text
          style={[styles.statusText, { color: config.color }]}
          className="text-sm font-medium"
        >
          {config.text}
        </Text>
      </View>
      {strangerTyping && status === "connected" && (
        <View style={styles.typingContainer} className="mt-1">
          <Text
            style={styles.typingText}
            className="text-xs text-dark-muted italic"
          >
            Stranger is typing...
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#12121a",
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e2e",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  pulseIndicator: {
    // Animation would be handled with Animated API for more complex effects
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  typingContainer: {
    marginTop: 4,
  },
  typingText: {
    fontSize: 12,
    color: "#6b7280",
    fontStyle: "italic",
  },
});
