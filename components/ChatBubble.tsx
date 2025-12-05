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

// Modern color palette
const COLORS = {
  myBubble: "#7c5cff",
  myBubbleGlow: "rgba(124, 92, 255, 0.15)",
  strangerBubble: "#1a1a28",
  strangerBubbleBorder: "#252536",
  text: "#ffffff",
  textMuted: "rgba(255, 255, 255, 0.5)",
  timestamp: "rgba(255, 255, 255, 0.4)",
  read: "#22c55e",
  replyIndicator: "#7c5cff",
};

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

  const composedGesture = Gesture.Simultaneous(panGesture, longPressGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const replyIndicatorStyle = useAnimatedStyle(() => {
    const opacity = Math.abs(translateX.value) / SWIPE_THRESHOLD;
    return {
      opacity: Math.min(1, opacity),
      transform: [{ scale: Math.min(1, 0.5 + opacity * 0.5) }],
    };
  });

  const markdownStyles = useMemo(
    () =>
      StyleSheet.create({
        body: {
          color: COLORS.text,
          fontSize: 15,
          lineHeight: 22,
        },
        paragraph: {
          marginTop: 0,
          marginBottom: 0,
        },
        strong: {
          fontWeight: "700",
          color: COLORS.text,
        },
        em: {
          fontStyle: "italic",
          color: COLORS.text,
        },
        code_inline: {
          backgroundColor: isMe
            ? "rgba(255,255,255,0.15)"
            : "rgba(255,255,255,0.08)",
          color: COLORS.text,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 4,
          fontFamily: "monospace",
          fontSize: 13,
        },
        fence: {
          backgroundColor: isMe ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.25)",
          color: COLORS.text,
          padding: 12,
          borderRadius: 8,
          fontFamily: "monospace",
          fontSize: 12,
          marginVertical: 4,
          overflow: "hidden",
        },
        code_block: {
          backgroundColor: isMe ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.25)",
          color: COLORS.text,
          padding: 12,
          borderRadius: 8,
          fontFamily: "monospace",
          fontSize: 12,
        },
        link: {
          color: isMe ? "#c7d2fe" : "#b794f6",
          textDecorationLine: "underline",
        },
        blockquote: {
          backgroundColor: isMe
            ? "rgba(255,255,255,0.08)"
            : "rgba(255,255,255,0.04)",
          borderLeftColor: isMe ? "#c7d2fe" : "#7c5cff",
          borderLeftWidth: 3,
          paddingLeft: 12,
          paddingVertical: 4,
          marginVertical: 4,
        },
        list_item: {
          color: COLORS.text,
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

  const renderStatus = () => {
    if (!isMe || !message.status) return null;

    let statusIcon = "";
    let statusColor = COLORS.textMuted;

    switch (message.status) {
      case "sending":
        statusIcon = "○";
        break;
      case "sent":
        statusIcon = "✓";
        statusColor = COLORS.timestamp;
        break;
      case "read":
        statusIcon = "✓✓";
        statusColor = COLORS.read;
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
      {/* Reply indicator */}
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
              styles.bubble,
              isMe ? styles.bubbleMe : styles.bubbleStranger,
            ]}
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
              <Text style={styles.timestamp}>
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
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderRadius: 20,
  },
  bubbleMe: {
    alignSelf: "flex-end",
    backgroundColor: COLORS.myBubble,
    borderBottomRightRadius: 6,
    shadowColor: COLORS.myBubble,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  bubbleStranger: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.strangerBubble,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.strangerBubbleBorder,
  },
  replyIndicator: {
    position: "absolute",
    top: "50%",
    marginTop: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.replyIndicator,
    alignItems: "center",
    justifyContent: "center",
    zIndex: -1,
  },
  replyIndicatorLeft: {
    left: -36,
  },
  replyIndicatorRight: {
    right: -36,
  },
  replyIndicatorIcon: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
  },
  replyQuote: {
    borderLeftWidth: 2,
    paddingLeft: 8,
    paddingVertical: 4,
    marginBottom: 8,
    borderRadius: 4,
  },
  replyQuoteMe: {
    borderLeftColor: "rgba(255,255,255,0.4)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  replyQuoteStranger: {
    borderLeftColor: COLORS.myBubble,
    backgroundColor: "rgba(124, 92, 255, 0.08)",
  },
  replyLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
    marginBottom: 2,
  },
  replyText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
    gap: 4,
  },
  timestamp: {
    fontSize: 10,
    color: COLORS.timestamp,
    letterSpacing: 0.2,
  },
  statusIcon: {
    fontSize: 11,
  },
});
