import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type GestureResponderEvent,
} from "react-native";
import { theme } from "../theme";

type PrimaryButtonProps = {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  loading?: boolean;
  disabled?: boolean;
};

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
}: PrimaryButtonProps) {
  const idle = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={idle}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: idle, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        idle ? styles.disabled : pressed ? styles.pressed : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.text.inverse} />
      ) : (
        <Text style={[styles.label, idle && styles.labelDisabled]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: theme.radius.button,
    backgroundColor: theme.colors.brand.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
    marginTop: theme.spacing.sm,
  },
  pressed: {
    backgroundColor: theme.colors.brand.primaryDark,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    backgroundColor: theme.colors.brand.disabled,
    opacity: 0.85,
  },
  label: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.size.subtitle,
    fontWeight: theme.typography.weight.bold,
    letterSpacing: -0.2,
  },
  labelDisabled: {
    color: "#F3F4F6",
  },
});
