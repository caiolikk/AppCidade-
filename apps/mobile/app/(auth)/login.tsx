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
import { AuthTextField } from "../../components/AuthTextField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { api, ApiError } from "../../lib/api";
import type { AuthResponse } from "../../lib/types";
import { useAuthStore } from "../../store/auth";
import { colors } from "../../theme";

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
          <Text style={styles.kicker}>Santos/SP</Text>
          <Text style={styles.title}>Cidade+</Text>
          <Text style={styles.subtitle}>
            Entre para acompanhar e registrar ocorrências do seu bairro.
          </Text>

          <AuthTextField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="voce@email.com"
            keyboardType="email-address"
            autoComplete="email"
          />
          <AuthTextField
            label="Senha"
            value={password}
            onChangeText={setPassword}
            placeholder="Mínimo 8 caracteres"
            secureTextEntry
            autoComplete="password"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton label="Entrar" onPress={() => void handleSubmit()} loading={loading} />

          <Link href="/(auth)/register" asChild>
            <Pressable style={styles.linkWrap}>
              <Text style={styles.link}>Criar conta de cidadão</Text>
            </Pressable>
          </Link>

          <View style={styles.hintBox}>
            <Text style={styles.hintTitle}>Acesso de staff (seed)</Text>
            <Text style={styles.hint}>admin@cidade.plus / admin1234</Text>
            <Text style={styles.hint}>gestor@cidade.plus / gestor1234</Text>
          </View>
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
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  kicker: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
  },
  title: {
    color: colors.text,
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -0.8,
    marginTop: 4,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 28,
  },
  error: {
    color: "#B91C1C",
    fontSize: 14,
    marginBottom: 8,
  },
  linkWrap: {
    alignItems: "center",
    paddingVertical: 18,
  },
  link: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "700",
  },
  hintBox: {
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  hintTitle: {
    color: colors.text,
    fontWeight: "700",
    marginBottom: 4,
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
  },
});
