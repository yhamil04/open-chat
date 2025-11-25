import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useChatStore } from "@/store/chatStore";
import { ScreenWrapper } from "@/components/ScreenWrapper";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { ChatBubble } from "@/components/ChatBubble";
import { InputBar } from "@/components/InputBar";
import { NextButton } from "@/components/NextButton";
import { InterestsInput } from "@/components/InterestsInput";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SCROLL_THRESHOLD = 100; // pixels from bottom to consider "at bottom"

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
      // User is at bottom or sent a message - scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      setUnreadCount(0);
      setShowScrollButton(false);
      
      // Mark all unread stranger messages as read when at bottom
      // Find the most recent unread stranger message and send read receipt
      const unreadStrangerMessages = messages.filter(
        (m) => m.sender === "stranger" && !m.status
      );
      if (unreadStrangerMessages.length > 0) {
        // Send read receipt for the most recent unread message
        const mostRecentUnread = unreadStrangerMessages[unreadStrangerMessages.length - 1];
        markMessageAsRead(mostRecentUnread.id);
      }
    } else {
      // User is reading history - show button and increment unread
      if (lastMessage?.sender === "stranger") {
        setUnreadCount((prev) => prev + 1);
        setShowScrollButton(true);
      }
    }
  }, [messages, isAtBottom, markMessageAsRead]);

  // Handle scroll events to track position
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      scrollOffsetRef.current = contentOffset.y;
      contentHeightRef.current = contentSize.height;
      scrollViewHeightRef.current = layoutMeasurement.height;

      const distanceFromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      const atBottom = distanceFromBottom < SCROLL_THRESHOLD;

      const wasAtBottom = isAtBottom;
      setIsAtBottom(atBottom);

      if (atBottom) {
        setShowScrollButton(false);
        setUnreadCount(0);
        
        // If user just scrolled back to bottom, mark unread messages as read
        if (!wasAtBottom && messages.length > 0) {
          const unreadStrangerMessages = messages.filter(
            (m) => m.sender === "stranger" && !m.status
          );
          if (unreadStrangerMessages.length > 0) {
            const mostRecentUnread = unreadStrangerMessages[unreadStrangerMessages.length - 1];
            markMessageAsRead(mostRecentUnread.id);
          }
        }
      }
    },
    [isAtBottom, messages, markMessageAsRead]
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
      duration: 500,
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
      const remaining = Math.max(0, Math.ceil((skipCooldownUntil - Date.now()) / 1000));
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

  const isIdle = status === "idle";
  const showChat = status === "connected" || status === "disconnected" || messages.length > 0;

  return (
    <ScreenWrapper>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]} className="flex-1">
        {/* Header */}
        <View style={styles.header} className="px-5 pt-4 pb-2">
          <Text style={styles.logo} className="text-3xl font-bold text-white">
            Open<Text style={styles.logoAccent} className="text-accent-primary">Chat</Text>
          </Text>
          <Text style={styles.tagline} className="text-dark-muted text-sm mt-1">
            Anonymous • Instant • Private
          </Text>
        </View>

        {/* Connection Status */}
        <ConnectionStatus status={status} strangerTyping={strangerTyping} />

        {/* Main Content Area */}
        <View style={styles.content} className="flex-1">
          {isIdle ? (
            // Welcome Screen
            <View style={styles.welcomeContainer} className="flex-1 justify-center items-center px-6">
              <View style={styles.welcomeCard} className="bg-dark-surface rounded-3xl p-6 w-full max-w-md">
                <Text style={styles.welcomeTitle} className="text-2xl font-bold text-white text-center mb-2">
                  Meet Someone New
                </Text>
                <Text style={styles.welcomeText} className="text-dark-muted text-center mb-6 leading-6">
                  Connect instantly with strangers from around the world. 
                  No accounts, no tracking — just conversation.
                </Text>

                <InterestsInput
                  interests={interests}
                  onInterestsChange={setInterests}
                  disabled={status !== "idle"}
                />

                <View style={styles.buttonContainer} className="items-center mt-4">
                  <NextButton
                    status={status}
                    onPress={handleNextPress}
                    cooldownSeconds={cooldownSeconds}
                  />
                </View>

                <View style={styles.disclaimer} className="mt-6 pt-4 border-t border-dark-border">
                  <Text style={styles.disclaimerText} className="text-xs text-dark-muted text-center leading-5">
                    By using OpenChat, you agree to treat others with respect. 
                    Harassment or inappropriate behavior may result in restrictions.
                  </Text>
                </View>
              </View>
            </View>
          ) : showChat ? (
            // Chat Interface
            <View style={styles.chatContainer} className="flex-1">
              <ScrollView
                ref={scrollViewRef}
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesContent}
                className="flex-1 px-4 pt-4"
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="interactive"
                onScroll={handleScroll}
                scrollEventThrottle={16}
              >
                {messages.length === 0 && status === "connected" && (
                  <View style={styles.emptyChat} className="items-center py-8">
                    <Text style={styles.emptyChatText} className="text-dark-muted text-center">
                      You're connected! Say hello 👋
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
                  <View style={styles.typingBubble} className="self-start bg-dark-border px-4 py-3 rounded-2xl rounded-bl-md mb-2">
                    <Text style={styles.typingDots} className="text-dark-muted">
                      • • •
                    </Text>
                  </View>
                )}
              </ScrollView>

              {/* Next Button (floating when connected) */}
              {(status === "connected" || status === "disconnected") && (
                <View style={styles.floatingButtonContainer} className="absolute top-2 right-4">
                  <NextButton
                    status={status}
                    onPress={handleNextPress}
                    cooldownSeconds={cooldownSeconds}
                  />
                </View>
              )}

              {/* Scroll to Bottom Button */}
              {showScrollButton && (
                <TouchableOpacity
                  style={styles.scrollToBottomButton}
                  onPress={scrollToBottom}
                  activeOpacity={0.8}
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
            <View style={styles.searchingContainer} className="flex-1 justify-center items-center">
              <View style={styles.pulseContainer}>
                <View style={styles.pulseOuter} className="w-32 h-32 rounded-full bg-accent-primary opacity-20" />
                <View style={styles.pulseInner} className="w-24 h-24 rounded-full bg-accent-primary opacity-40 absolute" />
                <View style={styles.pulseCore} className="w-16 h-16 rounded-full bg-accent-primary absolute" />
              </View>
              <Text style={styles.searchingText} className="text-white text-xl font-medium mt-8">
                Looking for someone...
              </Text>
              <Text style={styles.searchingHint} className="text-dark-muted text-sm mt-2">
                This usually takes a few seconds
              </Text>
            </View>
          )}
        </View>

        {/* Input Bar (only when chat is active) */}
        {showChat && <InputBar onError={handleError} />}

        {/* Error Toast */}
        {errorMessage && (
          <Animated.View style={styles.errorToast} className="absolute bottom-24 left-4 right-4 bg-accent-danger px-4 py-3 rounded-xl">
            <Text style={styles.errorText} className="text-white text-center font-medium">
              {errorMessage}
            </Text>
          </Animated.View>
        )}
      </Animated.View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0f",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "web" ? 20 : 16,
    paddingBottom: 8,
  },
  logo: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  logoAccent: {
    color: "#6366f1",
  },
  tagline: {
    color: "#6b7280",
    fontSize: 14,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  welcomeCard: {
    backgroundColor: "#12121a",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 420,
    borderWidth: 1,
    borderColor: "#1e1e2e",
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  welcomeText: {
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  buttonContainer: {
    alignItems: "center",
    marginTop: 16,
  },
  disclaimer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#1e1e2e",
  },
  disclaimerText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  messagesContent: {
    paddingBottom: 80, // Space for floating button
  },
  emptyChat: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyChatText: {
    color: "#6b7280",
    textAlign: "center",
    fontSize: 16,
  },
  typingBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#1e1e2e",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    marginBottom: 8,
  },
  typingDots: {
    color: "#6b7280",
    letterSpacing: 4,
  },
  floatingButtonContainer: {
    position: "absolute",
    top: 8,
    right: 16,
  },
  searchingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  pulseContainer: {
    width: 128,
    height: 128,
    justifyContent: "center",
    alignItems: "center",
  },
  pulseOuter: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: "#6366f1",
    opacity: 0.2,
    position: "absolute",
  },
  pulseInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#6366f1",
    opacity: 0.4,
    position: "absolute",
  },
  pulseCore: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#6366f1",
    position: "absolute",
  },
  searchingText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "500",
    marginTop: 32,
  },
  searchingHint: {
    color: "#6b7280",
    fontSize: 14,
    marginTop: 8,
  },
  errorToast: {
    position: "absolute",
    bottom: 96,
    left: 16,
    right: 16,
    backgroundColor: "#ef4444",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "500",
  },
  scrollToBottomButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scrollToBottomArrow: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  unreadBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
});

