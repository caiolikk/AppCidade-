import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from "react-native";
import { colors } from "../theme";

type AuthTextFieldProps = {
  /** Opcional: no Login do Figma os campos não têm rótulo (só placeholder). */
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoComplete?: "email" | "password" | "new-password" | "name" | "off" | "username";
  /** Campo inválido: borda vermelha. */
  invalid?: boolean;
  /** Figma: Login usa placeholder claro (#D9D9D9); Cadastro usa cinza (#757575). */
  placeholderTone?: "light" | "muted";
};

/** Figma: componente "Input" — fundo #FAFAFA, borda 1 #D9D9D9, raio 8, padding 16/12, texto 16. */
export function AuthTextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize = "none",
  autoComplete,
  invalid = false,
  placeholderTone = "light",
}: AuthTextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderTone === "muted" ? colors.muted : colors.placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        autoCorrect={false}
        accessibilityLabel={label ?? placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, focused && styles.focused, invalid && styles.invalid]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  label: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 19,
    marginBottom: 6,
  },
  input: {
    height: 40,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 0,
    color: colors.text,
    fontSize: 16,
  },
  focused: {
    borderColor: colors.primary,
  },
  invalid: {
    borderColor: colors.error,
  },
});
