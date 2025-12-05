import { ChatBubble } from "@/components/ChatBubble";
import { InputBar } from "@/components/InputBar";
import { InterestsInput } from "@/components/InterestsInput";
import { NextButton } from "@/components/NextButton";
import { ScreenWrapper } from "@/components/ScreenWrapper";
import { useChatStore } from "@/store/chatStore";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const SCROLL_THRESHOLD = 100;

// Modern color palette
const COLORS = {
  background: "#050508",
  surface: "#0c0c12",
  elevated: "#141420",
  border: "#1f1f2e",
  text: "#ffffff",
  textMuted: "#64648b",
  textSubtle: "#4a4a6a",
  accent: "#7c5cff",
  accentGlow: "rgba(124, 92, 255, 0.2)",
  success: "#22c55e",
  danger: "#f43f5e",
};

export default function ChatScreen() {
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Smart scroll state
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const contentHeightRef = useRef(0);
  const scrollOffsetRef = useRef(0);
  const scrollViewHeightRef = useRef(0);
  const lastReadMessageIdRef = useRef<string | null>(null);

  const {
    status,
    messages,
    strangerTyping,
    interests,
    skipCooldownUntil,
    initialize,
    setInterests,
    findMatch,
    disconnect,
    setReplyingTo,
    markMessageAsRead,
    reset,
  } = useChatStore();

  // Initialize user ID on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Smart auto-scroll: only scroll if user is at bottom
  useEffect(() => {
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    const isMyMessage = lastMessage?.sender === "me";

    if (isAtBottom || isMyMessage) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      setUnreadCount(0);
      setShowScrollButton(false);

      // Mark unread stranger messages as read (only once per message)
      const unreadStrangerMessages = messages.filter(
        (m) => m.sender === "stranger" && !m.status
      );
      if (unreadStrangerMessages.length > 0) {
        const mostRecentUnread =
          unreadStrangerMessages[unreadStrangerMessages.length - 1];
        // Only mark as read if we haven't already processed this message
        if (lastReadMessageIdRef.current !== mostRecentUnread.id) {
          lastReadMessageIdRef.current = mostRecentUnread.id;
          markMessageAsRead(mostRecentUnread.id);
        }
      }
    } else {
      if (lastMessage?.sender === "stranger") {
        setUnreadCount((prev) => prev + 1);
        setShowScrollButton(true);
      }
    }
  }, [messages.length, isAtBottom]); // Removed markMessageAsRead from deps

  // Handle scroll events to track position
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      scrollOffsetRef.current = contentOffset.y;
      contentHeightRef.current = contentSize.height;
      scrollViewHeightRef.current = layoutMeasurement.height;

      const distanceFromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      const atBottom = distanceFromBottom < SCROLL_THRESHOLD;

      setIsAtBottom(atBottom);

      if (atBottom) {
        setShowScrollButton(false);
        setUnreadCount(0);
      }
    },
    []
  );

  // Scroll to bottom button handler
  const scrollToBottom = useCallback(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
    setShowScrollButton(false);
    setUnreadCount(0);
  }, []);

  // Fade in animation on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Handle cooldown timer
  useEffect(() => {
    if (!skipCooldownUntil) {
      setCooldownSeconds(0);
      return;
    }

    const updateCooldown = () => {
      const remaining = Math.max(
        0,
        Math.ceil((skipCooldownUntil - Date.now()) / 1000)
      );
      setCooldownSeconds(remaining);
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);

    return () => clearInterval(interval);
  }, [skipCooldownUntil]);

  // Clear error message after delay
  useEffect(() => {
    if (errorMessage) {
      const timeout = setTimeout(() => setErrorMessage(null), 3000);
      return () => clearTimeout(timeout);
    }
  }, [errorMessage]);

  const handleNextPress = useCallback(async () => {
    if (status === "connected" || status === "disconnected") {
      await disconnect();
    }
    findMatch();
  }, [status, disconnect, findMatch]);

  const handleError = useCallback((message: string) => {
    setErrorMessage(message);
  }, []);

  const handleHomePress = useCallback(async () => {
    // Always use reset() which now properly cleans up channels and queue
    // regardless of the current status
    await reset();
  }, [reset]);

  const isIdle = status === "idle";
  const showChat =
    status === "connected" || status === "disconnected" || messages.length > 0;

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logo}>
                Open<Text style={styles.logoAccent}>Chat</Text>
              </Text>
              <View style={styles.betaBadge}>
                <Text style={styles.betaText}>Beta</Text>
              </View>
            </View>
            <Text style={styles.tagline}>Anonymous • Instant • Private</Text>
          </View>

          {/* Main Content Area */}
          <View style={styles.content}>
            {isIdle ? (
              // Welcome Screen
              <ScrollView
                contentContainerStyle={styles.welcomeScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.welcomeContainer}>
                  <View style={styles.welcomeCard}>
                    {/* Decorative glow */}
                    <View style={styles.cardGlow} />

                    <Text style={styles.welcomeTitle}>Meet Someone New</Text>
                    <Text style={styles.welcomeText}>
                      Connect instantly with strangers from around the world.
                      {"\n"}
                      No accounts, no tracking — just conversation.
                    </Text>

                    <View style={styles.divider} />

                    <InterestsInput
                      interests={interests}
                      onInterestsChange={setInterests}
                      disabled={status !== "idle"}
                    />

                    <View style={styles.buttonContainer}>
                      <NextButton
                        status={status}
                        onPress={handleNextPress}
                        cooldownSeconds={cooldownSeconds}
                      />
                    </View>

                    <View style={styles.disclaimer}>
                      <Text style={styles.disclaimerText}>
                        By using OpenChat, you agree to treat others with
                        respect.
                      </Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            ) : showChat ? (
              // Chat Interface
              <View style={styles.chatContainer}>
                {/* Unified Chat Header */}
                {(status === "connected" || status === "disconnected") && (
                  <View style={styles.chatHeader}>
                    {/* Home Button */}
                    <TouchableOpacity
                      style={styles.homeButton}
                      onPress={handleHomePress}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.homeIcon}>←</Text>
                    </TouchableOpacity>

                    {/* Status Info */}
                    <View style={styles.chatHeaderCenter}>
                      <View style={styles.chatHeaderInfo}>
                        <View
                          style={[
                            styles.statusDot,
                            status === "connected"
                              ? styles.statusDotOnline
                              : styles.statusDotOffline,
                          ]}
                        />
                        <Text style={styles.chatHeaderTitle}>
                          {status === "connected"
                            ? "Stranger"
                            : "Stranger - Disconnected"}
                        </Text>
                      </View>
                      {strangerTyping && status === "connected" && (
                        <Text style={styles.typingIndicator}>typing...</Text>
                      )}
                    </View>

                    {/* Skip Button */}
                    <NextButton
                      status={status}
                      onPress={handleNextPress}
                      cooldownSeconds={cooldownSeconds}
                      compact
                    />
                  </View>
                )}

                <ScrollView
                  ref={scrollViewRef}
                  style={styles.messagesContainer}
                  contentContainerStyle={styles.messagesContent}
                  showsVerticalScrollIndicator={false}
                  keyboardDismissMode="interactive"
                  keyboardShouldPersistTaps="handled"
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                >
                  {messages.length === 0 && status === "connected" && (
                    <View style={styles.emptyChat}>
                      <Text style={styles.emptyChatEmoji}>👋</Text>
                      <Text style={styles.emptyChatTitle}>
                        You're connected!
                      </Text>
                      <Text style={styles.emptyChatText}>
                        Say hello and start a conversation
                      </Text>
                    </View>
                  )}

                  {messages.map((message) => (
                    <ChatBubble
                      key={message.id}
                      message={message}
                      onReply={setReplyingTo}
                    />
                  ))}

                  {strangerTyping && (
                    <View style={styles.typingBubble}>
                      <View style={styles.typingDotsContainer}>
                        <View style={styles.typingDot} />
                        <View
                          style={[styles.typingDot, styles.typingDotDelay1]}
                        />
                        <View
                          style={[styles.typingDot, styles.typingDotDelay2]}
                        />
                      </View>
                    </View>
                  )}
                </ScrollView>

                {/* Scroll to Bottom Button */}
                {showScrollButton && (
                  <TouchableOpacity
                    style={styles.scrollToBottomButton}
                    onPress={scrollToBottom}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.scrollToBottomArrow}>↓</Text>
                    {unreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              // Searching State
              <View style={styles.searchingWrapper}>
                {/* Header during search */}
                <View style={styles.searchingHeader}>
                  <TouchableOpacity
                    style={styles.homeButton}
                    onPress={handleHomePress}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.homeIcon}>←</Text>
                  </TouchableOpacity>
                  <View style={styles.searchingHeaderCenter}>
                    <View style={styles.searchingDot} />
                    <Text style={styles.searchingHeaderText}>
                      Finding someone...
                    </Text>
                  </View>
                  <View style={styles.homeButtonPlaceholder} />
                </View>
                <View style={styles.searchingContainer}>
                  <View style={styles.pulseContainer}>
                    <Animated.View
                      style={[styles.pulseRing, styles.pulseRing1]}
                    />
                    <Animated.View
                      style={[styles.pulseRing, styles.pulseRing2]}
                    />
                    <View style={styles.pulseCore}>
                      <Text style={styles.searchIcon}>🔍</Text>
                    </View>
                  </View>
                  <Text style={styles.searchingHint}>
                    This usually takes a few seconds
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Input Bar (only when chat is active) */}
          {showChat && <InputBar onError={handleError} />}

          {/* Error Toast */}
          {errorMessage && (
            <Animated.View style={styles.errorToast}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </Animated.View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "web" ? 24 : 16,
    paddingBottom: 12,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  logoAccent: {
    color: COLORS.accent,
  },
  betaBadge: {
    backgroundColor: COLORS.accentGlow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(124, 92, 255, 0.3)",
  },
  betaText: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tagline: {
    color: COLORS.textSubtle,
    fontSize: 13,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  content: {
    flex: 1,
  },
  welcomeScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  welcomeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    padding: 28,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  cardGlow: {
    position: "absolute",
    top: -100,
    left: "50%",
    marginLeft: -150,
    width: 300,
    height: 200,
    backgroundColor: COLORS.accentGlow,
    borderRadius: 150,
    opacity: 0.5,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  welcomeText: {
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 24,
  },
  buttonContainer: {
    alignItems: "center",
    marginTop: 8,
  },
  disclaimer: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  disclaimerText: {
    fontSize: 11,
    color: COLORS.textSubtle,
    textAlign: "center",
    lineHeight: 18,
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 12,
  },
  homeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.elevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  homeIcon: {
    fontSize: 18,
    color: COLORS.text,
    fontWeight: "600",
  },
  chatHeaderCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chatHeaderInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotOnline: {
    backgroundColor: COLORS.success,
  },
  statusDotOffline: {
    backgroundColor: COLORS.danger,
  },
  chatHeaderTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  typingIndicator: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: "italic",
    marginTop: 2,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  emptyChat: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyChatEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyChatTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 6,
  },
  emptyChatText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  typingBubble: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.elevated,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typingDotsContainer: {
    flexDirection: "row",
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textMuted,
    opacity: 0.4,
  },
  typingDotDelay1: {
    opacity: 0.6,
  },
  typingDotDelay2: {
    opacity: 0.8,
  },
  searchingWrapper: {
    flex: 1,
  },
  searchingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 12,
  },
  searchingHeaderCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  searchingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fbbf24",
  },
  searchingHeaderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fbbf24",
  },
  homeButtonPlaceholder: {
    width: 36,
    height: 36,
  },
  searchingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  pulseContainer: {
    width: 120,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  pulseRing1: {
    opacity: 0.3,
    transform: [{ scale: 1 }],
  },
  pulseRing2: {
    opacity: 0.15,
    transform: [{ scale: 1.3 }],
  },
  pulseCore: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.elevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    fontSize: 28,
  },
  searchingHint: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 24,
  },
  scrollToBottomButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
  },
  scrollToBottomArrow: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "700",
  },
  unreadBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "700",
  },
  errorToast: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: COLORS.danger,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
  },
  errorText: {
    color: COLORS.text,
    textAlign: "center",
    fontWeight: "600",
    fontSize: 14,
  },
});
