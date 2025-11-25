import type { Message } from "@/types/chat";
import * as Clipboard from "expo-clipboard";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Markdown from "react-native-markdown-display";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

interface ChatBubbleProps {
  message: Message;
  onReply?: (message: Message) => void;
}

const SWIPE_THRESHOLD = 60;

export function ChatBubble({ message, onReply }: ChatBubbleProps) {
  const isMe = message.sender === "me";
  const translateX = useSharedValue(0);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(message.text);
  };

  const triggerReply = () => {
    onReply?.(message);
  };

  // Swipe gesture for reply
  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onUpdate((event) => {
      // Allow swipe right for stranger messages, left for my messages
      if (isMe) {
        translateX.value = Math.min(
          0,
          Math.max(-SWIPE_THRESHOLD, event.translationX)
        );
      } else {
        translateX.value = Math.max(
          0,
          Math.min(SWIPE_THRESHOLD, event.translationX)
        );
      }
    })
    .onEnd((event) => {
      const shouldTriggerReply = isMe
        ? event.translationX < -SWIPE_THRESHOLD * 0.6
        : event.translationX > SWIPE_THRESHOLD * 0.6;

      if (shouldTriggerReply) {
        runOnJS(triggerReply)();
      }

      translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
    });

  // Long press gesture for copy
  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onEnd((_, success) => {
      if (success) {
        runOnJS(handleCopy)();
      }
    });

  // Combine gestures
  const composedGesture = Gesture.Simultaneous(panGesture, longPressGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Reply indicator style
  const replyIndicatorStyle = useAnimatedStyle(() => {
    const opacity = Math.abs(translateX.value) / SWIPE_THRESHOLD;
    return {
      opacity: Math.min(1, opacity),
      transform: [{ scale: Math.min(1, 0.5 + opacity * 0.5) }],
    };
  });

  // Markdown styles based on sender
  const markdownStyles = useMemo(
    () =>
      StyleSheet.create({
        body: {
          color: "#fff",
          fontSize: 16,
          lineHeight: 22,
        },
        paragraph: {
          marginTop: 0,
          marginBottom: 0,
        },
        strong: {
          fontWeight: "bold",
          color: "#fff",
        },
        em: {
          fontStyle: "italic",
          color: "#fff",
        },
        code_inline: {
          backgroundColor: isMe
            ? "rgba(255,255,255,0.2)"
            : "rgba(255,255,255,0.1)",
          color: "#fff",
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 4,
          fontFamily: "monospace",
          fontSize: 14,
        },
        fence: {
          backgroundColor: isMe ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.3)",
          color: "#fff",
          padding: 12,
          borderRadius: 8,
          fontFamily: "monospace",
          fontSize: 13,
          marginVertical: 4,
          overflow: "hidden",
        },
        code_block: {
          backgroundColor: isMe ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.3)",
          color: "#fff",
          padding: 12,
          borderRadius: 8,
          fontFamily: "monospace",
          fontSize: 13,
        },
        link: {
          color: isMe ? "#c7d2fe" : "#a78bfa",
          textDecorationLine: "underline",
        },
        blockquote: {
          backgroundColor: isMe
            ? "rgba(255,255,255,0.1)"
            : "rgba(255,255,255,0.05)",
          borderLeftColor: isMe ? "#c7d2fe" : "#6366f1",
          borderLeftWidth: 3,
          paddingLeft: 12,
          paddingVertical: 4,
          marginVertical: 4,
        },
        list_item: {
          color: "#fff",
          marginBottom: 4,
        },
        bullet_list: {
          marginVertical: 4,
        },
        ordered_list: {
          marginVertical: 4,
        },
      }),
    [isMe]
  );

  // Status indicator for sent messages
  const renderStatus = () => {
    if (!isMe || !message.status) return null;

    let statusIcon = "";
    let statusColor = "rgba(255,255,255,0.5)";

    switch (message.status) {
      case "sending":
        statusIcon = "○";
        break;
      case "sent":
        statusIcon = "✓";
        statusColor = "rgba(255,255,255,0.7)";
        break;
      case "read":
        statusIcon = "✓✓";
        statusColor = "#10b981";
        break;
    }

    return (
      <Text style={[styles.statusIcon, { color: statusColor }]}>
        {statusIcon}
      </Text>
    );
  };

  return (
    <View style={styles.bubbleWrapper}>
      {/* Reply indicator - left side for stranger, right side for me */}
      <Animated.View
        style={[
          styles.replyIndicator,
          isMe ? styles.replyIndicatorRight : styles.replyIndicatorLeft,
          replyIndicatorStyle,
        ]}
      >
        <Text style={styles.replyIndicatorIcon}>↩</Text>
      </Animated.View>

      <GestureDetector gesture={composedGesture}>
        <Animated.View style={animatedStyle}>
          <View
            style={[
              styles.container,
              isMe ? styles.containerMe : styles.containerStranger,
            ]}
            className={`max-w-[80%] px-4 py-3 rounded-2xl mb-2 ${
              isMe
                ? "self-end bg-accent-primary rounded-br-md"
                : "self-start bg-dark-border rounded-bl-md"
            }`}
          >
            {/* Reply Quote */}
            {message.replyTo && (
              <View
                style={[
                  styles.replyQuote,
                  isMe ? styles.replyQuoteMe : styles.replyQuoteStranger,
                ]}
              >
                <Text style={styles.replyLabel}>
                  {message.replyTo.sender === "me" ? "You" : "Stranger"}
                </Text>
                <Text style={styles.replyText} numberOfLines={2}>
                  {message.replyTo.text}
                </Text>
              </View>
            )}

            <Markdown style={markdownStyles}>{message.text}</Markdown>

            <View style={styles.footer}>
              <Text
                style={styles.timestamp}
                className="text-xs opacity-60 text-gray-400"
              >
                {formatTime(message.timestamp)}
              </Text>
              {renderStatus()}
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const styles = StyleSheet.create({
  bubbleWrapper: {
    position: "relative",
    marginBottom: 8,
  },
  container: {
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  containerMe: {
    alignSelf: "flex-end",
    backgroundColor: "#6366f1",
    borderBottomRightRadius: 4,
  },
  containerStranger: {
    alignSelf: "flex-start",
    backgroundColor: "#1e1e2e",
    borderBottomLeftRadius: 4,
  },
  replyIndicator: {
    position: "absolute",
    top: "50%",
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
    zIndex: -1,
  },
  replyIndicatorLeft: {
    left: -40,
  },
  replyIndicatorRight: {
    right: -40,
  },
  replyIndicatorIcon: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  replyQuote: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    paddingVertical: 4,
    marginBottom: 8,
    borderRadius: 4,
  },
  replyQuoteMe: {
    borderLeftColor: "rgba(255,255,255,0.5)",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  replyQuoteStranger: {
    borderLeftColor: "#6366f1",
    backgroundColor: "rgba(99,102,241,0.1)",
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 2,
  },
  replyText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
    gap: 6,
  },
  timestamp: {
    fontSize: 11,
    opacity: 0.6,
    color: "rgba(255,255,255,0.6)",
  },
  statusIcon: {
    fontSize: 12,
    marginLeft: 4,
  },
});
