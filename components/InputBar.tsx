import { useChatStore } from "@/store/chatStore";
import React, { useCallback, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface InputBarProps {
  onError?: (message: string) => void;
}

// Modern color palette
const COLORS = {
  background: "#050508",
  surface: "#0c0c12",
  input: "#0f0f18",
  inputBorder: "#1f1f2e",
  inputBorderFocus: "#7c5cff",
  text: "#ffffff",
  placeholder: "#4a4a6a",
  accent: "#7c5cff",
  accentDark: "#5a42cc",
  disabled: "#1a1a28",
  replyBg: "#0f0f18",
  replyBorder: "#7c5cff",
  replyText: "#8b8baa",
  cancelButton: "#4a4a6a",
};

export function InputBar({ onError }: InputBarProps) {
  const [text, setText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { sendMessage, setTyping, status, replyingTo, clearReply } =
    useChatStore();

  const isDisabled = status !== "connected";

  const handleTextChange = useCallback(
    (value: string) => {
      setText(value);

      if (status !== "connected") return;

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      setTyping(true);

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
      if (Platform.OS === "web" && e.nativeEvent.key === "Enter") {
        handleSend();
      }
    },
    [handleSend]
  );

  const handleCancelReply = useCallback(() => {
    clearReply();
  }, [clearReply]);

  // Focus the input when wrapper is pressed (for mobile)
  const handleInputWrapperPress = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const canSend = text.trim() && !isDisabled;

  return (
    <View style={styles.wrapper}>
      {/* Reply Preview */}
      {replyingTo && (
        <View style={styles.replyPreview}>
          <View style={styles.replyAccent} />
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
            <Text style={styles.cancelReplyIcon}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.container}>
        <Pressable
          style={[
            styles.inputWrapper,
            isFocused && styles.inputWrapperFocused,
            isDisabled && styles.inputWrapperDisabled,
          ]}
          onPress={handleInputWrapperPress}
        >
          <TextInput
            ref={inputRef}
            style={[styles.input, isDisabled && styles.inputDisabled]}
            placeholder={
              isDisabled ? "Connect to start chatting..." : "Message..."
            }
            placeholderTextColor={COLORS.placeholder}
            value={text}
            onChangeText={handleTextChange}
            onKeyPress={handleKeyPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            editable={!isDisabled}
            multiline
            maxLength={1000}
            returnKeyType="send"
            blurOnSubmit={false}
            textAlignVertical="center"
            autoCapitalize="sentences"
            autoCorrect
          />
        </Pressable>
        <TouchableOpacity
          style={[styles.sendButton, canSend && styles.sendButtonActive]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.7}
        >
          <View style={styles.sendIconWrapper}>
            <Text style={[styles.sendIcon, canSend && styles.sendIconActive]}>
              ↑
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.inputBorder,
  },
  replyPreview: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.replyBg,
  },
  replyAccent: {
    width: 3,
    height: "100%",
    backgroundColor: COLORS.replyBorder,
    borderRadius: 2,
    marginRight: 12,
    minHeight: 36,
  },
  replyPreviewContent: {
    flex: 1,
  },
  replyPreviewLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.accent,
    marginBottom: 2,
  },
  replyPreviewText: {
    fontSize: 13,
    color: COLORS.replyText,
  },
  cancelReplyButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "rgba(74, 74, 106, 0.2)",
  },
  cancelReplyIcon: {
    fontSize: 12,
    color: COLORS.cancelButton,
    fontWeight: "600",
  },
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    paddingBottom: Platform.OS === "ios" ? 12 : 12,
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: COLORS.input,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  inputWrapperFocused: {
    borderColor: COLORS.inputBorderFocus,
  },
  inputWrapperDisabled: {
    opacity: 0.5,
  },
  input: {
    color: COLORS.text,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "ios" ? 14 : 12,
    paddingBottom: Platform.OS === "ios" ? 14 : 12,
    fontSize: 16,
    maxHeight: 120,
    minHeight: 48,
  },
  inputDisabled: {
    color: COLORS.placeholder,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.disabled,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonActive: {
    backgroundColor: COLORS.accent,
  },
  sendIconWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  sendIcon: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.placeholder,
  },
  sendIconActive: {
    color: COLORS.text,
  },
});
