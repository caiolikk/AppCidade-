import { Link } from "expo-router";
import { useState } from "react";
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
import Logo from "../../assets/figma/logo-horizontal.svg";
import { AuthTextField } from "../../components/AuthTextField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { api, ApiError } from "../../lib/api";
import type { AuthResponse } from "../../lib/types";
import { useAuthStore } from "../../store/auth";
import { colors, type } from "../../theme";

/** Figma: "Frame - Login" (263:2122) — logo, boas-vindas, 2 campos, botão e link de cadastro. */
export default function LoginScreen() {
  const applySession = useAuthStore((state) => state.applySession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      const session = await api<AuthResponse>("/auth/login", {
        auth: false,
        body: { email, password },
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
        >
          <View style={styles.logo}>
            <Logo width={200} height={52} accessibilityLabel="Cidade+" />
          </View>
          <Text style={styles.title}>Seja bem-vindo(a)!</Text>
          <Text style={styles.subtitle}>Faça seu login</Text>

          <View style={styles.form}>
            <AuthTextField
              value={email}
              onChangeText={setEmail}
              placeholder="E-mail"
              keyboardType="email-address"
              autoComplete="email"
              invalid={Boolean(error)}
            />
            <AuthTextField
              value={password}
              onChangeText={setPassword}
              placeholder="Senha"
              secureTextEntry
              autoComplete="password"
              invalid={Boolean(error)}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton
            label="Entrar"
            onPress={() => void handleSubmit()}
            loading={loading}
            style={styles.button}
          />

          <Link href="/(auth)/register" asChild>
            <Pressable style={styles.linkWrap} hitSlop={8}>
              <Text style={styles.linkText}>
                Não possui uma conta? <Text style={styles.link}>Criar nova conta</Text>
              </Text>
            </Pressable>
          </Link>

          {__DEV__ ? (
            <View style={styles.devHint}>
              <Text style={styles.devHintText}>Dev (seed): admin@cidade.plus / admin1234</Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 26,
    paddingVertical: 32,
  },
  logo: {
    alignItems: "center",
    marginBottom: 34,
  },
  title: {
    ...type.largeTitle,
    textAlign: "center",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 20,
    fontWeight: "500",
    letterSpacing: 0.4,
    textAlign: "center",
    marginTop: -2,
  },
  form: {
    marginTop: 18,
  },
  error: {
    color: colors.error,
    fontSize: 14,
    marginBottom: 10,
    textAlign: "center",
  },
  button: {
    marginHorizontal: 8,
  },
  linkWrap: {
    marginTop: 40,
    alignSelf: "center",
  },
  linkText: {
    ...type.small,
    textAlign: "center",
  },
  link: {
    color: colors.primary,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  devHint: {
    marginTop: 28,
    alignItems: "center",
  },
  devHintText: {
    ...type.caption,
    color: colors.muted,
  },
});
