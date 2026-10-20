import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from "react-native";
import { theme } from "../theme";

type AuthTextFieldProps = {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoComplete?: "email" | "password" | "name" | "off" | "username";
};

export function AuthTextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize = "none",
  autoComplete,
}: AuthTextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.text.muted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, focused && styles.inputFocused]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: theme.spacing.md,
  },
  label: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.size.label,
    fontWeight: theme.typography.weight.medium,
    marginBottom: theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    borderRadius: theme.radius.input,
    paddingHorizontal: theme.spacing.lg,
    height: 48,
    color: theme.colors.text.primary,
    fontSize: theme.typography.size.body,
    backgroundColor: theme.colors.background.input,
  },
  inputFocused: {
    borderColor: theme.colors.border.focus,
  },
});
