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
import { colors, type } from "../../theme";

/**
 * Figma: "Frame - Cadastro" (87:1327). Diferenças intencionais: o Figma tem "Celular", que a
 * API não aceita (omitido), e não tem "CEP", que a API exige para resolver o bairro (mantido).
 */
export default function RegisterScreen() {
  const applySession = useAuthStore((state) => state.applySession);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [cpf, setCpf] = useState("");
  const [cep, setCep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordMismatch = passwordConfirm.length > 0 && passwordConfirm !== password;

  async function handleSubmit() {
    setError(null);
    if (password !== passwordConfirm) {
      setError("As senhas não conferem.");
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
        >
          <Text style={styles.title}>Cadastro</Text>
          <Text style={styles.subtitle}>
            Vamos realizar seu cadastro, precisamos apenas de algumas informações:
          </Text>

          <Text style={styles.section}>Informações pessoais</Text>

          <AuthTextField
            label="Nome Completo"
            value={name}
            onChangeText={setName}
            placeholder="Nome Completo"
            autoCapitalize="words"
            autoComplete="name"
            placeholderTone="muted"
          />
          <AuthTextField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="meuemail@exemplo.com"
            placeholderTone="muted"
            keyboardType="email-address"
            autoComplete="email"
          />
          <AuthTextField
            label="CPF"
            value={cpf}
            onChangeText={(value) => setCpf(formatCpf(value))}
            placeholder="000.000.000-00"
            placeholderTone="muted"
            keyboardType="number-pad"
          />
          <AuthTextField
            label="CEP residencial (Santos/SP)"
            value={cep}
            onChangeText={(value) => setCep(formatCep(value))}
            placeholder="11030-000"
            placeholderTone="muted"
            keyboardType="number-pad"
          />
          <AuthTextField
            label="Senha"
            value={password}
            onChangeText={setPassword}
            placeholder="Mínimo 8 caracteres"
            secureTextEntry
            autoComplete="new-password"
          />
          <AuthTextField
            label="Repetir Senha"
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            placeholder="Repita a senha"
            secureTextEntry
            autoComplete="new-password"
            invalid={passwordMismatch}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Link href="/(auth)/login" asChild>
            <Pressable style={styles.linkWrap} hitSlop={8}>
              <Text style={styles.linkText}>
                Já possuo uma conta. <Text style={styles.link}>Entrar agora.</Text>
              </Text>
            </Pressable>
          </Link>

          <PrimaryButton
            label="Finalizar Cadastro"
            onPress={() => void handleSubmit()}
            loading={loading}
            style={styles.button}
          />
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
    paddingHorizontal: 26,
    paddingTop: 40,
    paddingBottom: 32,
  },
  title: {
    ...type.largeTitle,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: "500",
    marginTop: 2,
    marginBottom: 16,
    maxWidth: 300,
  },
  section: {
    ...type.section,
    fontSize: 18,
    lineHeight: 22,
    marginBottom: 10,
  },
  error: {
    color: colors.error,
    fontSize: 14,
    marginBottom: 8,
  },
  linkWrap: {
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  linkText: {
    ...type.small,
    textAlign: "center",
  },
  link: {
    textDecorationLine: "underline",
  },
  button: {
    marginHorizontal: 8,
  },
});
