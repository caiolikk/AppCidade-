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
import { AuthTextField } from "../../components/AuthTextField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { api, ApiError } from "../../lib/api";
import { formatCep, formatCpf, onlyDigits } from "../../lib/format";
import type { AuthResponse } from "../../lib/types";
import { useAuthStore } from "../../store/auth";
import { theme } from "../../theme";

export default function RegisterScreen() {
  const applySession = useAuthStore((state) => state.applySession);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [cep, setCep] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function formatPhone(val: string) {
    const digits = onlyDigits(val).slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  async function handleSubmit() {
    setError(null);

    if (password !== confirmPassword) {
      setError("As senhas informadas não coincidem.");
      return;
    }
    if (password.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const session = await api<AuthResponse>("/auth/register", {
        auth: false,
        body: {
          name,
          email,
          password,
          cpf: onlyDigits(cpf),
          cep: onlyDigits(cep),
        },
      });
      await applySession(session);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Não foi possível criar a conta.",
      );
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
          <Text style={styles.title}>Cadastro</Text>
          <Text style={styles.subtitle}>
            Vamos realizar seu cadastro, precisamos apenas de algumas informações.
          </Text>

          <Text style={styles.sectionHeader}>Informações pessoais</Text>

          <View style={styles.form}>
            <AuthTextField
              label="Nome Completo"
              value={name}
              onChangeText={setName}
              placeholder="Nome Completo"
              autoCapitalize="words"
              autoComplete="name"
            />
            <AuthTextField
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              placeholder="seuemail@exemplo.com"
              keyboardType="email-address"
              autoComplete="email"
            />
            <AuthTextField
              label="Celular"
              value={phone}
              onChangeText={(val) => setPhone(formatPhone(val))}
              placeholder="(13) 9999-9999"
              keyboardType="phone-pad"
            />
            <AuthTextField
              label="CPF"
              value={cpf}
              onChangeText={(value) => setCpf(formatCpf(value))}
              placeholder="000.000.000-00"
              keyboardType="number-pad"
            />
            <AuthTextField
              label="CEP residencial (Santos/SP)"
              value={cep}
              onChangeText={(value) => setCep(formatCep(value))}
              placeholder="11030-000"
              keyboardType="number-pad"
            />
            <AuthTextField
              label="Senha"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••"
              secureTextEntry
              autoComplete="password"
            />
            <AuthTextField
              label="Repetir Senha"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••"
              secureTextEntry
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <PrimaryButton
              label="Finalizar Cadastro"
              onPress={() => void handleSubmit()}
              loading={loading}
              disabled={!name || !email || !cpf || !cep || !password || !confirmPassword}
            />
          </View>

          <View style={styles.footerLinks}>
            <Text style={styles.termsText}>
              Ao se cadastrar, você concorda com nossos Termos de Uso e Política de Privacidade.
            </Text>
            <View style={styles.linkRow}>
              <Text style={styles.plainText}>Já possui uma conta? </Text>
              <Link href="/(auth)/login" asChild>
                <Pressable>
                  <Text style={styles.loginLink}>Entrar agora</Text>
                </Pressable>
              </Link>
            </View>
          </View>
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
    paddingTop: theme.spacing.xxl,
    paddingBottom: 48,
  },
  title: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.size.display,
    fontWeight: theme.typography.weight.bold,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.size.body,
    lineHeight: 20,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.size.subtitle,
    fontWeight: theme.typography.weight.bold,
    marginBottom: theme.spacing.md,
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
    marginTop: theme.spacing.xl,
    alignItems: "center",
    gap: 12,
  },
  termsText: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: theme.spacing.sm,
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
  loginLink: {
    color: theme.colors.brand.primary,
    fontSize: 13,
    fontWeight: theme.typography.weight.bold,
    textDecorationLine: "underline",
  },
});
