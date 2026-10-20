import { Link } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppLogo } from "../../components/AppLogo";
import { AuthTextField } from "../../components/AuthTextField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { api, ApiError } from "../../lib/api";
import type { AuthResponse } from "../../lib/types";
import { useAuthStore } from "../../store/auth";
import { theme } from "../../theme";

export default function LoginScreen() {
  const applySession = useAuthStore((state) => state.applySession);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      const session = await api<AuthResponse>("/auth/login", {
        auth: false,
        body: { email: identifier, password },
      });
      await applySession(session);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoWrap}>
            <AppLogo width={200} height={52} />
          </View>

          <Text style={styles.title}>Seja bem-vindo(a)!</Text>
          <Text style={styles.subtitle}>Faça seu login</Text>

          <View style={styles.form}>
            <AuthTextField
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="E-mail ou CPF"
              keyboardType="email-address"
              autoComplete="email"
            />
            <AuthTextField
              value={password}
              onChangeText={setPassword}
              placeholder="Senha"
              secureTextEntry
              autoComplete="password"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <PrimaryButton
              label="Entrar"
              onPress={() => void handleSubmit()}
              loading={loading}
              disabled={!identifier || !password}
            />
          </View>

          <View style={styles.footerLinks}>
            <View style={styles.linkRow}>
              <Text style={styles.plainText}>Esqueceu sua senha? </Text>
              <Pressable
                onPress={() =>
                  setError("A recuperação de senha estará disponível na próxima atualização.")
                }
              >
                <Text style={styles.forgotLink}>Esqueci minha senha</Text>
              </Pressable>
            </View>

            <View style={styles.linkRow}>
              <Text style={styles.plainText}>Não possui uma conta? </Text>
              <Link href="/(auth)/register" asChild>
                <Pressable>
                  <Text style={styles.registerLink}>Criar nova conta</Text>
                </Pressable>
              </Link>
            </View>
          </View>

          {__DEV__ && (
            <View style={styles.devHint}>
              <Text style={styles.devHintText}>
                Seed Staff: admin@cidade.plus / gestor@cidade.plus (senha: admin1234 / gestor1234)
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background.main,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: 48,
    paddingBottom: theme.spacing.xxl,
    alignItems: "center",
  },
  logoWrap: {
    marginBottom: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: theme.colors.text.primary,
    fontSize: 24,
    fontWeight: theme.typography.weight.bold,
    textAlign: "center",
    letterSpacing: -0.4,
  },
  subtitle: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.size.subtitle,
    textAlign: "center",
    marginTop: theme.spacing.xs,
    marginBottom: 28,
  },
  form: {
    width: "100%",
  },
  error: {
    color: theme.colors.text.error,
    fontSize: theme.typography.size.label,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  footerLinks: {
    marginTop: 36,
    alignItems: "center",
    gap: 12,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  plainText: {
    color: theme.colors.text.primary,
    fontSize: 13,
  },
  forgotLink: {
    color: theme.colors.text.primary,
    fontSize: 13,
    textDecorationLine: "underline",
  },
  registerLink: {
    color: theme.colors.brand.primary,
    fontSize: 13,
    fontWeight: theme.typography.weight.bold,
    textDecorationLine: "underline",
  },
  devHint: {
    marginTop: 40,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.background.subtle,
    borderRadius: theme.radius.sm,
  },
  devHintText: {
    fontSize: 10,
    color: theme.colors.text.muted,
    textAlign: "center",
  },
});
