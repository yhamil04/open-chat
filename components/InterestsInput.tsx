import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface InterestsInputProps {
  interests: string[];
  onInterestsChange: (interests: string[]) => void;
  disabled?: boolean;
}

// Modern color palette
const COLORS = {
  background: "#050508",
  surface: "#0c0c12",
  input: "#0f0f18",
  inputBorder: "#1f1f2e",
  inputBorderFocus: "#7c5cff",
  text: "#ffffff",
  textMuted: "#64648b",
  placeholder: "#4a4a6a",
  accent: "#7c5cff",
  tag: "#1a1a28",
  tagBorder: "#252536",
  tagText: "#b794f6",
};

export function InterestsInput({
  interests,
  onInterestsChange,
  disabled,
}: InterestsInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const addInterest = () => {
    const trimmed = inputValue.trim().toLowerCase();
    if (trimmed && !interests.includes(trimmed) && interests.length < 5) {
      onInterestsChange([...interests, trimmed]);
      setInputValue("");
    }
  };

  const removeInterest = (interest: string) => {
    onInterestsChange(interests.filter((i) => i !== interest));
  };

  const handleKeyPress = (e: { nativeEvent: { key: string } }) => {
    if (e.nativeEvent.key === "Enter" || e.nativeEvent.key === ",") {
      addInterest();
    }
  };

  const canAdd = inputValue.trim() && !disabled && interests.length < 5;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Interests <Text style={styles.labelHint}>(optional)</Text>
      </Text>
      <View style={styles.inputRow}>
        <View
          style={[
            styles.inputWrapper,
            isFocused && styles.inputWrapperFocused,
            disabled && styles.inputWrapperDisabled,
          ]}
        >
          <TextInput
            style={styles.input}
            placeholder="music, gaming, art..."
            placeholderTextColor={COLORS.placeholder}
            value={inputValue}
            onChangeText={setInputValue}
            onSubmitEditing={addInterest}
            onKeyPress={handleKeyPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            editable={!disabled}
            maxLength={30}
          />
        </View>
        <TouchableOpacity
          style={[styles.addButton, !canAdd && styles.addButtonDisabled]}
          onPress={addInterest}
          disabled={!canAdd}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.addButtonText,
              !canAdd && styles.addButtonTextDisabled,
            ]}
          >
            +
          </Text>
        </TouchableOpacity>
      </View>

      {interests.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tagsContainer}
          contentContainerStyle={styles.tagsContent}
        >
          {interests.map((interest) => (
            <TouchableOpacity
              key={interest}
              style={styles.tag}
              onPress={() => !disabled && removeInterest(interest)}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <Text style={styles.tagText}>{interest}</Text>
              {!disabled && <Text style={styles.tagRemove}>×</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {interests.length > 0 && (
        <Text style={styles.hint}>
          {5 - interests.length} more{" "}
          {5 - interests.length === 1 ? "interest" : "interests"} allowed
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
  },
  labelHint: {
    color: COLORS.textMuted,
    fontWeight: "400",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: COLORS.input,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  inputWrapperFocused: {
    borderColor: COLORS.inputBorderFocus,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  inputWrapperDisabled: {
    opacity: 0.5,
  },
  input: {
    color: COLORS.text,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  addButtonDisabled: {
    backgroundColor: COLORS.tag,
    shadowOpacity: 0,
  },
  addButtonText: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "500",
  },
  addButtonTextDisabled: {
    color: COLORS.placeholder,
  },
  tagsContainer: {
    marginTop: 14,
  },
  tagsContent: {
    gap: 8,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.tag,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.tagBorder,
    marginRight: 8,
  },
  tagText: {
    color: COLORS.tagText,
    fontSize: 13,
    fontWeight: "500",
  },
  tagRemove: {
    color: COLORS.textMuted,
    fontSize: 16,
    marginLeft: 6,
    fontWeight: "400",
  },
  hint: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 10,
    marginLeft: 2,
  },
});
