import { Link } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthTextField } from "../../components/AuthTextField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { api, ApiError } from "../../lib/api";
import { formatCep, formatCpf, onlyDigits } from "../../lib/format";
import type { AuthResponse } from "../../lib/types";
import { useAuthStore } from "../../store/auth";
import { colors } from "../../theme";

export default function RegisterScreen() {
  const applySession = useAuthStore((state) => state.applySession);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cpf, setCpf] = useState("");
  const [cep, setCep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
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
        >
          <Text style={styles.title}>Criar conta</Text>
          <Text style={styles.subtitle}>
            O bairro vem do CEP. O Cidade+ atende apenas Santos/SP.
          </Text>

          <AuthTextField
            label="Nome"
            value={name}
            onChangeText={setName}
            placeholder="Seu nome"
            autoCapitalize="words"
            autoComplete="name"
          />
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
          <AuthTextField
            label="CPF"
            value={cpf}
            onChangeText={(value) => setCpf(formatCpf(value))}
            placeholder="000.000.000-00"
            keyboardType="number-pad"
          />
          <AuthTextField
            label="CEP residencial"
            value={cep}
            onChangeText={(value) => setCep(formatCep(value))}
            placeholder="11030-000"
            keyboardType="number-pad"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton
            label="Cadastrar"
            onPress={() => void handleSubmit()}
            loading={loading}
          />

          <Link href="/(auth)/login" asChild>
            <Pressable style={styles.linkWrap}>
              <Text style={styles.link}>Já tenho conta</Text>
            </Pressable>
          </Link>
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
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 24,
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
});
