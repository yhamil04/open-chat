import type { ConnectionStatus } from "@/types/chat";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface NextButtonProps {
  status: ConnectionStatus;
  onPress: () => void;
  cooldownSeconds?: number;
  compact?: boolean;
}

// Modern color palette
const COLORS = {
  primary: "#7c5cff",
  primaryDark: "#5a42cc",
  success: "#22c55e",
  successDark: "#16a34a",
  danger: "#f43f5e",
  dangerDark: "#e11d48",
  text: "#ffffff",
  textMuted: "rgba(255, 255, 255, 0.7)",
  disabled: "#1a1a28",
  disabledText: "#4a4a6a",
};

export function NextButton({
  status,
  onPress,
  cooldownSeconds,
  compact = false,
}: NextButtonProps) {
  const isSearching = status === "searching";
  const isDisabled =
    isSearching || (cooldownSeconds !== undefined && cooldownSeconds > 0);

  const getButtonText = () => {
    if (cooldownSeconds && cooldownSeconds > 0) {
      return `${cooldownSeconds}s`;
    }
    switch (status) {
      case "idle":
        return compact ? "Start" : "Start Chat";
      case "searching":
        return compact ? "..." : "Finding...";
      case "connected":
        return compact ? "Skip" : "Next Person";
      case "disconnected":
        return compact ? "New" : "New Chat";
      default:
        return "Start";
    }
  };

  const getButtonColors = () => {
    if (cooldownSeconds && cooldownSeconds > 0) {
      return { bg: COLORS.danger, shadow: COLORS.dangerDark };
    }
    switch (status) {
      case "connected":
        return { bg: COLORS.success, shadow: COLORS.successDark };
      default:
        return { bg: COLORS.primary, shadow: COLORS.primaryDark };
    }
  };

  const colors = getButtonColors();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: colors.bg },
        isDisabled && styles.buttonDisabled,
        !isDisabled && {
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.5,
          shadowRadius: 12,
        },
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
    >
      <View style={styles.content}>
        {isSearching && (
          <ActivityIndicator
            color={COLORS.text}
            size="small"
            style={styles.loader}
          />
        )}
        <Text
          style={[
            styles.buttonText,
            compact && styles.buttonTextCompact,
            isDisabled && styles.buttonTextDisabled,
          ]}
        >
          {getButtonText()}
        </Text>
        {!isSearching && !compact && status !== "idle" && (
          <Text style={styles.arrow}>→</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 180,
  },
  buttonCompact: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    minWidth: 80,
  },
  buttonDisabled: {
    backgroundColor: COLORS.disabled,
    shadowOpacity: 0,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  buttonTextCompact: {
    fontSize: 14,
  },
  buttonTextDisabled: {
    color: COLORS.disabledText,
  },
  arrow: {
    color: COLORS.textMuted,
    fontSize: 18,
    fontWeight: "500",
  },
  loader: {
    marginRight: 4,
  },
});
