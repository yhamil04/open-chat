import { useChatStore } from "@/store/chatStore";
import React, { useCallback, useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface InputBarProps {
  onError?: (message: string) => void;
}

export function InputBar({ onError }: InputBarProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { sendMessage, setTyping, status, replyingTo, clearReply } =
    useChatStore();

  const isDisabled = status !== "connected";

  const handleTextChange = useCallback(
    (value: string) => {
      setText(value);

      if (status !== "connected") return;

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set typing indicator
      setTyping(true);

      // Clear typing indicator after 2 seconds of no typing
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
      }, 2000);
    },
    [status, setTyping]
  );

  const handleSend = useCallback(() => {
    if (!text.trim() || isDisabled) return;

    const result = sendMessage(text);

    if (result.success) {
      setText("");
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      setTyping(false);
    } else if (result.error && onError) {
      onError(result.error);
    }
  }, [text, isDisabled, sendMessage, setTyping, onError]);

  const handleKeyPress = useCallback(
    (e: { nativeEvent: { key: string } }) => {
      // Send on Enter (web only, without shift)
      if (Platform.OS === "web" && e.nativeEvent.key === "Enter") {
        handleSend();
      }
    },
    [handleSend]
  );

  const handleCancelReply = useCallback(() => {
    clearReply();
  }, [clearReply]);

  return (
    <View style={styles.wrapper}>
      {/* Reply Preview */}
      {replyingTo && (
        <View style={styles.replyPreview}>
          <View style={styles.replyPreviewContent}>
            <Text style={styles.replyPreviewLabel}>
              Replying to {replyingTo.sender === "me" ? "yourself" : "Stranger"}
            </Text>
            <Text style={styles.replyPreviewText} numberOfLines={1}>
              {replyingTo.text}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleCancelReply}
            style={styles.cancelReplyButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.cancelReplyIcon}>×</Text>
          </TouchableOpacity>
        </View>
      )}

      <View
        style={styles.container}
        className="flex-row items-end p-3 bg-dark-surface border-t border-dark-border"
      >
        <TextInput
          ref={inputRef}
          style={[styles.input, isDisabled && styles.inputDisabled]}
          className="flex-1 bg-dark-bg text-white px-4 py-3 rounded-2xl mr-3 text-base"
          placeholder={
            isDisabled ? "Connect to start chatting..." : "Type a message..."
          }
          placeholderTextColor="#6b7280"
          value={text}
          onChangeText={handleTextChange}
          onKeyPress={handleKeyPress}
          editable={!isDisabled}
          multiline
          maxLength={1000}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!text.trim() || isDisabled) && styles.sendButtonDisabled,
          ]}
          className={`w-12 h-12 rounded-full items-center justify-center ${
            text.trim() && !isDisabled ? "bg-accent-primary" : "bg-dark-border"
          }`}
          onPress={handleSend}
          disabled={!text.trim() || isDisabled}
          activeOpacity={0.7}
        >
          <Text style={styles.sendIcon}>↑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#12121a",
  },
  replyPreview: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#1e1e2e",
    borderLeftWidth: 3,
    borderLeftColor: "#6366f1",
  },
  replyPreviewContent: {
    flex: 1,
  },
  replyPreviewLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6366f1",
    marginBottom: 2,
  },
  replyPreviewText: {
    fontSize: 14,
    color: "#9ca3af",
  },
  cancelReplyButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelReplyIcon: {
    fontSize: 24,
    color: "#6b7280",
    fontWeight: "300",
  },
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    backgroundColor: "#12121a",
    borderTopWidth: 1,
    borderTopColor: "#1e1e2e",
  },
  input: {
    flex: 1,
    backgroundColor: "#0a0a0f",
    color: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 12,
    fontSize: 16,
    maxHeight: 120,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6366f1",
  },
  sendButtonDisabled: {
    backgroundColor: "#1e1e2e",
  },
  sendIcon: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
});
