import React from "react";
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator } from "react-native";
import type { ConnectionStatus } from "@/types/chat";

interface NextButtonProps {
  status: ConnectionStatus;
  onPress: () => void;
  cooldownSeconds?: number;
}

export function NextButton({ status, onPress, cooldownSeconds }: NextButtonProps) {
  const isSearching = status === "searching";
  const isDisabled = isSearching || (cooldownSeconds !== undefined && cooldownSeconds > 0);

  const getButtonText = () => {
    if (cooldownSeconds && cooldownSeconds > 0) {
      return `Wait ${cooldownSeconds}s`;
    }
    switch (status) {
      case "idle":
        return "Start Chat";
      case "searching":
        return "Searching...";
      case "connected":
        return "Next →";
      case "disconnected":
        return "Find New Chat";
      default:
        return "Start";
    }
  };

  const getButtonStyle = () => {
    if (cooldownSeconds && cooldownSeconds > 0) {
      return styles.buttonCooldown;
    }
    switch (status) {
      case "idle":
        return styles.buttonStart;
      case "searching":
        return styles.buttonSearching;
      case "connected":
        return styles.buttonNext;
      case "disconnected":
        return styles.buttonReconnect;
      default:
        return styles.buttonStart;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, getButtonStyle(), isDisabled && styles.buttonDisabled]}
      className="py-4 px-8 rounded-2xl items-center justify-center flex-row"
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {isSearching && (
        <ActivityIndicator color="#fff" size="small" style={styles.loader} />
      )}
      <Text style={styles.buttonText} className="text-white text-lg font-bold">
        {getButtonText()}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    minWidth: 180,
  },
  buttonStart: {
    backgroundColor: "#6366f1",
  },
  buttonSearching: {
    backgroundColor: "#4f46e5",
  },
  buttonNext: {
    backgroundColor: "#10b981",
  },
  buttonReconnect: {
    backgroundColor: "#6366f1",
  },
  buttonCooldown: {
    backgroundColor: "#ef4444",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  loader: {
    marginRight: 8,
  },
});

