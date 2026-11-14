import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, softShadow } from "../theme";

type PrimaryButtonProps = {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  loading?: boolean;
  disabled?: boolean;
  /** "secondary": contorno, para ações menos importantes (ex.: Sair). */
  variant?: "primary" | "secondary";
  style?: StyleProp<ViewStyle>;
};

/** Figma: "Button - Entrar / Ocorrência / Cadastro" — pílula 52px verde, texto 17. */
export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
  style,
}: PrimaryButtonProps) {
  const idle = disabled || loading;
  const secondary = variant === "secondary";

  return (
    <Pressable
      onPress={onPress}
      disabled={idle}
      accessibilityRole="button"
      accessibilityState={{ disabled: idle, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        secondary ? styles.secondary : [styles.primary, softShadow],
        disabled && !loading && (secondary ? styles.secondaryDisabled : styles.primaryDisabled),
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? colors.primary : colors.onPrimary} />
      ) : (
        <Text style={[styles.label, secondary && styles.labelSecondary]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 1000,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  primaryDisabled: {
    backgroundColor: colors.muted,
  },
  secondary: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryDisabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    color: colors.onPrimary,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.43,
  },
  labelSecondary: {
    color: colors.primary,
  },
});
