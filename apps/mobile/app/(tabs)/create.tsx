import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthTextField } from "../../components/AuthTextField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useCategories } from "../../hooks/use-feed";
import { api, apiUploadImage, ApiError } from "../../lib/api";
import { useAuthStore } from "../../store/auth";
import { colors } from "../../theme";

export default function CreateScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const neighborhood = useAuthStore((state) => state.user?.neighborhood);
  const categoriesQuery = useCategories();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoType, setPhotoType] = useState("image/jpeg");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [geoAllowed, setGeoAllowed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void locate();
  }, []);

  async function locate() {
    setGeoMessage(null);
    setGeoAllowed(false);
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      setGeoMessage("Autorize a localização para registrar no seu bairro.");
      return;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const next = {
      latitude: Number(position.coords.latitude.toFixed(6)),
      longitude: Number(position.coords.longitude.toFixed(6)),
    };
    setCoords(next);

    try {
      await api("/occurrences/geofence-check", { body: next });
      setGeoAllowed(true);
      setGeoMessage("Ponto dentro do seu bairro residencial.");
    } catch (caught) {
      setGeoAllowed(false);
      setGeoMessage(
        caught instanceof ApiError
          ? caught.message
          : "Não foi possível validar o ponto no bairro.",
      );
    }
  }

  async function pickPhoto(fromCamera: boolean) {
    setError(null);
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError(
        fromCamera
          ? "Autorize a câmera para fotografar a evidência."
          : "Autorize a galeria para anexar a evidência.",
      );
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.7,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.7,
        });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    setPhotoUri(asset.uri);
    setPhotoType(asset.mimeType ?? "image/jpeg");
  }

  async function handleSubmit() {
    setError(null);

    if (!photoUri) {
      setError("A ocorrência precisa de pelo menos uma foto.");
      return;
    }
    if (!coords) {
      setError("Não foi possível obter sua localização.");
      return;
    }
    if (!categoryId) {
      setError("Escolha uma categoria.");
      return;
    }

    setLoading(true);
    try {
      const media = await apiUploadImage({
        uri: photoUri,
        name: "ocorrencia.jpg",
        type: photoType,
      });

      await api("/occurrences", {
        body: {
          title,
          description,
          latitude: coords.latitude,
          longitude: coords.longitude,
          categoryId,
          media: [media],
        },
      });

      await queryClient.invalidateQueries({ queryKey: ["occurrences"] });
      router.replace("/");
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Não foi possível registrar a ocorrência.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Nova ocorrência</Text>
          <Text style={styles.subtitle}>
            {neighborhood ?? "Seu bairro"} · foto obrigatória · só no seu polígono
          </Text>

          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.preview} />
          ) : (
            <View style={styles.previewEmpty}>
              <Ionicons name="camera-outline" size={28} color={colors.muted} />
              <Text style={styles.previewHint}>Evidência fotográfica</Text>
            </View>
          )}

          <View style={styles.photoActions}>
            <Pressable style={styles.photoButton} onPress={() => void pickPhoto(true)}>
              <Text style={styles.photoButtonText}>Câmera</Text>
            </Pressable>
            <Pressable style={styles.photoButton} onPress={() => void pickPhoto(false)}>
              <Text style={styles.photoButtonText}>Galeria</Text>
            </Pressable>
          </View>

          <Text style={styles.geo}>
            {coords
              ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
              : "Obtendo localização…"}
          </Text>
          {geoMessage ? (
            <Text style={[styles.geoStatus, geoAllowed ? styles.geoOk : styles.geoBad]}>
              {geoMessage}
            </Text>
          ) : null}
          <Pressable onPress={() => void locate()}>
            <Text style={styles.retry}>Atualizar localização</Text>
          </Pressable>

          <AuthTextField
            label="Título"
            value={title}
            onChangeText={setTitle}
            placeholder="Ex.: Buraco na calçada"
            autoCapitalize="sentences"
          />

          <Text style={styles.label}>Descrição</Text>
          <TextInput
            value={description}
            onChangeText={(value) => setDescription(value.slice(0, 500))}
            placeholder="Descreva o problema"
            placeholderTextColor={colors.subtitle}
            multiline
            style={styles.textarea}
          />
          <Text style={styles.counter}>{description.length}/500</Text>

          <Text style={styles.label}>Categoria</Text>
          <View style={styles.categories}>
            {(categoriesQuery.data ?? []).map((item) => {
              const active = item.id === categoryId;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setCategoryId(item.id)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {item.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton
            label="Registrar"
            onPress={() => void handleSubmit()}
            loading={loading}
            disabled={!photoUri || !coords || !categoryId}
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  preview: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    backgroundColor: colors.grid,
    marginBottom: 12,
  },
  previewEmpty: {
    height: 140,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.chipBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    gap: 8,
  },
  previewHint: {
    color: colors.muted,
    fontSize: 14,
  },
  photoActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  photoButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  photoButtonText: {
    color: colors.text,
    fontWeight: "700",
  },
  geo: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  geoStatus: {
    marginTop: 4,
    fontSize: 13,
  },
  geoOk: {
    color: "#15803D",
  },
  geoBad: {
    color: "#B91C1C",
  },
  retry: {
    color: colors.primary,
    fontWeight: "700",
    marginTop: 6,
    marginBottom: 16,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  textarea: {
    minHeight: 96,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 16,
    textAlignVertical: "top",
  },
  counter: {
    color: colors.muted,
    fontSize: 12,
    textAlign: "right",
    marginTop: 4,
    marginBottom: 14,
  },
  categories: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.text,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  error: {
    color: "#B91C1C",
    fontSize: 14,
    marginBottom: 8,
  },
});
