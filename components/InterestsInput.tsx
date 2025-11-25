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

export function InterestsInput({
  interests,
  onInterestsChange,
  disabled,
}: InterestsInputProps) {
  const [inputValue, setInputValue] = useState("");

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

  return (
    <View style={styles.container} className="mb-4">
      <Text style={styles.label} className="text-dark-muted text-sm mb-2">
        Add interests to find like-minded people (optional)
      </Text>
      <View style={styles.inputRow} className="flex-row items-center">
        <TextInput
          style={[styles.input, disabled && styles.inputDisabled]}
          className="flex-1 bg-dark-surface text-white px-4 py-2.5 rounded-xl text-sm border border-dark-border"
          placeholder="e.g., music, gaming, art..."
          placeholderTextColor="#6b7280"
          value={inputValue}
          onChangeText={setInputValue}
          onSubmitEditing={addInterest}
          onKeyPress={handleKeyPress}
          editable={!disabled}
          maxLength={30}
        />
        <TouchableOpacity
          style={[styles.addButton, disabled && styles.addButtonDisabled]}
          className="ml-2 px-4 py-2.5 bg-accent-primary rounded-xl"
          onPress={addInterest}
          disabled={disabled || !inputValue.trim()}
        >
          <Text style={styles.addButtonText} className="text-white font-medium">
            Add
          </Text>
        </TouchableOpacity>
      </View>

      {interests.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tagsContainer}
          className="mt-3"
        >
          {interests.map((interest) => (
            <TouchableOpacity
              key={interest}
              style={styles.tag}
              className="flex-row items-center bg-dark-border px-3 py-1.5 rounded-full mr-2"
              onPress={() => !disabled && removeInterest(interest)}
              disabled={disabled}
            >
              <Text style={styles.tagText} className="text-white text-sm mr-1">
                {interest}
              </Text>
              {!disabled && (
                <Text
                  style={styles.tagRemove}
                  className="text-dark-muted text-sm"
                >
                  ×
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    color: "#6b7280",
    fontSize: 14,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#12121a",
    color: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#1e1e2e",
  },
  inputDisabled: {
    opacity: 0.5,
  },
  addButton: {
    marginLeft: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#6366f1",
    borderRadius: 12,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "500",
  },
  tagsContainer: {
    marginTop: 12,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e2e",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  tagText: {
    color: "#fff",
    fontSize: 14,
    marginRight: 4,
  },
  tagRemove: {
    color: "#6b7280",
    fontSize: 16,
  },
});
