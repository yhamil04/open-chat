import React from "react";
import { View, StyleSheet, Platform, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ScreenWrapperProps {
  children: React.ReactNode;
}

export function ScreenWrapper({ children }: ScreenWrapperProps) {
  // Use SafeAreaView for native, regular View for web
  const Container = Platform.OS === "web" ? View : SafeAreaView;

  return (
    <Container style={styles.container} className="flex-1 bg-dark-bg">
      {Platform.OS === "android" && (
        <StatusBar backgroundColor="#0a0a0f" barStyle="light-content" />
      )}
      {children}
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0f",
  },
});

