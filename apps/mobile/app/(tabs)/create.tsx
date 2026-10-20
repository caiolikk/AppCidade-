import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { CategorySelectGrid } from "../../components/CategorySelectGrid";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useCategories } from "../../hooks/use-feed";
import { api, apiUploadImage, ApiError } from "../../lib/api";
import { useAuthStore } from "../../store/auth";
import { theme } from "../../theme";

export default function CreateScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const neighborhood = useAuthStore((state) => state.user?.neighborhood);
  const categoriesQuery = useCategories();

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
      setGeoMessage("Autorize o GPS para validar o ponto no seu bairro.");
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

  async function pickPhoto() {
    setError(null);
    const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
    const mediaPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!cameraPerm.granted && !mediaPerm.granted) {
      setError("Permita acesso à câmera e galeria para anexar a evidência.");
      return;
    }

    // Permitir escolha de câmera ou biblioteca
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]) {
      // Se cancelar a câmera, tenta abrir a biblioteca
      const libResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
      });
      if (!libResult.canceled && libResult.assets[0]) {
        setPhotoUri(libResult.assets[0].uri);
        setPhotoType(libResult.assets[0].mimeType ?? "image/jpeg");
      }
      return;
    }

    setPhotoUri(result.assets[0].uri);
    setPhotoType(result.assets[0].mimeType ?? "image/jpeg");
  }

  async function handleSubmit() {
    setError(null);

    if (!categoryId) {
      setError("Por favor, selecione uma categoria.");
      return;
    }
    if (!description.trim()) {
      setError("Por favor, digite a descrição do problema.");
      return;
    }
    if (!photoUri) {
      setError("A ocorrência precisa de uma evidência fotográfica.");
      return;
    }
    if (!coords) {
      setError("Não foi possível obter sua localização.");
      return;
    }

    const selectedCategory = categoriesQuery.data?.find((c) => c.id === categoryId);
    const categoryName = selectedCategory?.name ?? "Ocorrência";
    // Derivação harmoniosa do título para atender ao contrato da API
    const title = `${categoryName}: ${description.trim().slice(0, 40)}`;

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
          description: description.trim(),
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
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Nova Ocorrência</Text>
            <View style={styles.greenBar} />
          </View>

          <Text style={styles.label}>Categoria</Text>
          <CategorySelectGrid
            categories={categoriesQuery.data ?? []}
            selectedId={categoryId}
            onSelect={setCategoryId}
          />

          <Text style={styles.label}>Descrição</Text>
          <TextInput
            value={description}
            onChangeText={(val) => setDescription(val.slice(0, 500))}
            placeholder="Digite a descrição"
            placeholderTextColor={theme.colors.text.muted}
            multiline
            numberOfLines={4}
            style={styles.textarea}
          />
          <Text style={styles.counter}>{description.length}/500</Text>

          <Text style={styles.label}>Foto</Text>
          {photoUri ? (
            <View style={styles.photoPreviewContainer}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              <Pressable style={styles.changePhotoBtn} onPress={() => void pickPhoto()}>
                <Text style={styles.changePhotoText}>Trocar foto</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.photoBox} onPress={() => void pickPhoto()}>
              <Ionicons name="camera-outline" size={26} color={theme.colors.text.secondary} />
              <Text style={styles.photoBoxText}>Tirar foto ou escolher da galeria</Text>
            </Pressable>
          )}

          <Text style={styles.microCopy}>*Permita acesso à câmera e ao GPS</Text>

          {geoMessage ? (
            <Text
              style={[
                styles.geoStatus,
                geoAllowed ? styles.geoSuccess : styles.geoWarning,
              ]}
            >
              {geoMessage}
            </Text>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.btnWrap}>
            <PrimaryButton
              label="Enviar Ocorrência"
              onPress={() => void handleSubmit()}
              loading={loading}
              disabled={!categoryId || !description.trim() || !photoUri || !coords}
            />
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
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 12,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    color: theme.colors.text.primary,
    fontSize: 22,
    fontWeight: theme.typography.weight.bold,
  },
  greenBar: {
    height: 3,
    width: 60,
    backgroundColor: theme.colors.brand.primary,
    borderRadius: 2,
    marginTop: 6,
  },
  label: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.size.label,
    fontWeight: theme.typography.weight.bold,
    marginTop: 8,
    marginBottom: 4,
  },
  textarea: {
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    borderRadius: theme.radius.input,
    padding: theme.spacing.md,
    height: 100,
    color: theme.colors.text.primary,
    fontSize: theme.typography.size.body,
    textAlignVertical: "top",
    backgroundColor: theme.colors.background.main,
  },
  counter: {
    alignSelf: "flex-end",
    fontSize: 11,
    color: theme.colors.text.muted,
    marginTop: 2,
    marginBottom: 6,
  },
  photoBox: {
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    borderRadius: theme.radius.input,
    height: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: theme.colors.background.main,
  },
  photoBoxText: {
    color: theme.colors.text.secondary,
    fontSize: 13,
  },
  photoPreviewContainer: {
    position: "relative",
    borderRadius: theme.radius.input,
    overflow: "hidden",
    height: 140,
  },
  photoPreview: {
    width: "100%",
    height: "100%",
  },
  changePhotoBtn: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
  },
  changePhotoText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: theme.typography.weight.semiBold,
  },
  microCopy: {
    fontSize: 11,
    color: theme.colors.text.muted,
    marginTop: 6,
    marginBottom: 8,
  },
  geoStatus: {
    fontSize: 12,
    marginTop: 4,
  },
  geoSuccess: {
    color: theme.colors.brand.primary,
  },
  geoWarning: {
    color: "#D97706",
  },
  error: {
    color: theme.colors.text.error,
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },
  btnWrap: {
    marginTop: 20,
  },
});
