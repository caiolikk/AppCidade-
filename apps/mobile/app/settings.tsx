import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthTextField } from "../components/AuthTextField";
import { BackButton } from "../components/BackButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { SuccessPopup } from "../components/SuccessPopup";
import { UserAvatar } from "../components/UserAvatar";
import { useSaveProfile } from "../hooks/use-profile";
import { ApiError } from "../lib/api";
import { formatCep, onlyDigits } from "../lib/format";
import { useAuthStore } from "../store/auth";
import { colors, type } from "../theme";

type PendingAvatar = { uri: string; type: string } | "remove" | null;

/** Pergunta antes de descartar (Alert no Android/iOS; confirm no navegador). */
function confirmDiscard(onDiscard: () => void) {
  const title = "Descartar alterações?";
  const message = "Você tem alterações que ainda não foram salvas.";
  if (Platform.OS === "web") {
    if (globalThis.confirm?.(`${title}\n${message}`)) onDiscard();
    return;
  }
  Alert.alert(title, message, [
    { text: "Continuar editando", style: "cancel" },
    { text: "Descartar", style: "destructive", onPress: onDiscard },
  ]);
}

/**
 * Configurações do perfil (D-025). O Figma não tem esta tela: ela usa os mesmos componentes
 * e padrões do app (cabeçalho de "Nova Ocorrência", AuthTextField, PrimaryButton, seções com
 * divisória, SuccessPopup). Edita foto, nome e o CEP residencial (→ bairro, resolvido pela
 * API); nada é salvo antes de "Salvar alterações".
 */
export default function SettingsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const save = useSaveProfile();

  const [name, setName] = useState(user?.name ?? "");
  const [cep, setCep] = useState(user?.cep ? formatCep(user.cep) : "");
  const [avatar, setAvatar] = useState<PendingAvatar>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const nameChanged = user ? name.trim() !== user.name : false;
  const cepChanged = user ? onlyDigits(cep) !== user.cep : false;
  const dirty = nameChanged || cepChanged || avatar !== null;
  // Lido dentro do listener de navegação (que não re-renderiza junto com a tela).
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty && !save.isPending;

  // Avisa antes de sair com alterações não salvas (voltar, gesto ou botão do Android).
  useEffect(
    () =>
      navigation.addListener("beforeRemove", (event) => {
        if (!dirtyRef.current) return;
        event.preventDefault();
        confirmDiscard(() => navigation.dispatch(event.data.action));
      }),
    [navigation],
  );

  const shownAvatar = avatar === "remove" ? null : avatar ? avatar.uri : user?.avatarUrl;
  const hasAvatar = Boolean(shownAvatar);

  async function pickAvatar() {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Autorize o acesso à galeria para escolher a foto.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setAvatar({ uri: asset.uri, type: asset.mimeType ?? "image/jpeg" });
  }

  function removeAvatar() {
    setError(null);
    // Se a foto só estava na prévia, basta descartar; se já existe na conta, remove ao salvar.
    setAvatar(user?.avatarUrl ? "remove" : null);
  }

  async function handleSave() {
    if (!user || !dirty || save.isPending) return;
    setError(null);

    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("O nome precisa ter pelo menos 2 caracteres.");
      return;
    }
    if (onlyDigits(cep).length !== 8) {
      setError("Informe um CEP com 8 dígitos.");
      return;
    }

    const fields: { name?: string; cep?: string } = {};
    if (nameChanged) fields.name = trimmed;
    if (cepChanged) fields.cep = onlyDigits(cep);

    try {
      const updated = await save.mutateAsync({ fields, avatar: avatar ?? undefined });
      setAvatar(null);
      if (updated) {
        setName(updated.name);
        setCep(formatCep(updated.cep));
      }
      setSaved(true);
    } catch (caught) {
      // A foto pode ter sido salva antes de o CEP falhar: o store já tem o que está no banco.
      const current = useAuthStore.getState().user;
      if (current?.avatarUrl !== user.avatarUrl) setAvatar(null);
      setError(
        caught instanceof ApiError ? caught.message : "Não foi possível salvar. Tente novamente.",
      );
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              Configurações
            </Text>
            <BackButton />
          </View>

          <Text style={styles.sectionLabel}>Foto de perfil</Text>
          <View style={styles.photoRow}>
            <UserAvatar uri={shownAvatar} size={90} />
            <View style={styles.photoActions}>
              <Pressable onPress={() => void pickAvatar()} hitSlop={8} accessibilityRole="button">
                <Text style={styles.link}>{hasAvatar ? "Trocar foto" : "Escolher da galeria"}</Text>
              </Pressable>
              {hasAvatar ? (
                <Pressable onPress={removeAvatar} hitSlop={8} accessibilityRole="button">
                  <Text style={styles.linkDanger}>Remover foto</Text>
                </Pressable>
              ) : null}
              {avatar ? (
                <Text style={styles.hint}>
                  {avatar === "remove" ? "A foto será removida ao salvar." : "Prévia: salve para aplicar."}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.fields}>
            <AuthTextField
              label="Nome"
              value={name}
              onChangeText={(value) => setName(value.slice(0, 120))}
              placeholder="Seu nome"
              autoCapitalize="words"
              autoComplete="name"
              placeholderTone="muted"
            />
            <AuthTextField
              label="CEP residencial"
              value={cep}
              onChangeText={(value) => setCep(formatCep(value))}
              placeholder="00000-000"
              keyboardType="number-pad"
              placeholderTone="muted"
            />
          </View>
          <Text style={styles.hint}>
            Bairro atual: <Text style={styles.hintStrong}>{user?.neighborhood ?? "—"}</Text>
          </Text>
          <Text style={styles.hint}>
            O bairro é definido pelo CEP de onde você mora (só Santos/SP). Não é a sua localização
            atual e não aparece para outras pessoas.
          </Text>

          <View style={styles.divider} />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton
            label="Salvar alterações"
            onPress={() => void handleSave()}
            loading={save.isPending}
            disabled={!dirty}
            style={styles.button}
          />
          <PrimaryButton
            label="Sair da conta"
            variant="secondary"
            onPress={() => {
              const leave = () => {
                dirtyRef.current = false;
                void logout();
              };
              if (dirty) confirmDiscard(leave);
              else leave();
            }}
            style={[styles.button, styles.logout]}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <SuccessPopup
        visible={saved}
        title="Perfil atualizado!"
        message="Suas informações foram salvas."
        onClose={() => {
          setSaved(false);
          if (router.canGoBack()) router.back();
        }}
      />
    </SafeAreaView>
  );
}

const SIDE = 26;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingTop: 36,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SIDE,
    marginBottom: 24,
  },
  title: {
    ...type.largeTitle,
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  sectionLabel: {
    ...type.section,
    marginHorizontal: SIDE,
    marginBottom: 12,
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginHorizontal: SIDE,
  },
  photoActions: {
    flex: 1,
    gap: 10,
  },
  fields: {
    marginHorizontal: SIDE,
    gap: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginHorizontal: 11,
    marginVertical: 18,
  },
  hint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    marginHorizontal: SIDE,
    marginTop: 4,
  },
  hintStrong: {
    color: colors.text,
    fontWeight: "600",
  },
  link: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  linkDanger: {
    color: colors.error,
    fontWeight: "600",
    fontSize: 14,
  },
  error: {
    color: colors.error,
    fontSize: 14,
    marginHorizontal: SIDE,
    marginBottom: 10,
  },
  button: {
    marginHorizontal: 34,
  },
  logout: {
    marginTop: 14,
  },
});
