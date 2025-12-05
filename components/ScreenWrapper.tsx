import React from "react";
import { View, StyleSheet, Platform, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ScreenWrapperProps {
  children: React.ReactNode;
}

const COLORS = {
  background: "#050508",
};

export function ScreenWrapper({ children }: ScreenWrapperProps) {
  const Container = Platform.OS === "web" ? View : SafeAreaView;

  return (
    <Container style={styles.container}>
      {Platform.OS === "android" && (
        <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />
      )}
      {children}
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
