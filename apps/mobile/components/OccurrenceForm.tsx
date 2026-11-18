import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Alert,
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
import UploadIcon from "../assets/figma/icon-upload.svg";
import { useCategories } from "../hooks/use-feed";
import { ApiError } from "../lib/api";
import { colors, type } from "../theme";
import { CategoryIcon } from "./CategoryIcon";
import { LocationPicker, type Coords } from "./LocationPicker";
import { PrimaryButton } from "./PrimaryButton";
import { SubcategoryMenu, subcategoryLabel, type MenuAnchor } from "./SubcategoryMenu";

type LocationSource = "gps" | "manual" | "saved";

/** O que o formulário entrega ao enviar. `photo.changed` = foto nova escolhida agora. */
export type OccurrenceFormValues = {
  title: string;
  description: string;
  categoryId: string;
  /** null na categoria sem opções (ex.: "Outros"). */
  subcategoryId: string | null;
  coords: Coords;
  photo: { uri: string; type: string; changed: boolean };
};

export type OccurrenceFormInitial = {
  title: string;
  description: string;
  categoryId: string;
  subcategoryId: string | null;
  coords: Coords;
  /** Foto já salva (URL pública). */
  photoUri: string | null;
};

type OccurrenceFormProps = {
  heading: string;
  /** Algo à direita do título (ex.: botão voltar na edição). */
  headerAccessory?: ReactNode;
  submitLabel: string;
  /** Valores da ocorrência existente (edição). Sem isso, é uma nova ocorrência. */
  initial?: OccurrenceFormInitial;
  /** Pede o GPS ao abrir (nova ocorrência). */
  autoLocate?: boolean;
  /** Espaço livre no fim da rolagem (barra de abas ou área segura). */
  bottomSpace: number;
  /** Envia; um erro lançado vira a mensagem do formulário. */
  onSubmit: (values: OccurrenceFormValues) => Promise<void>;
};

/**
 * Formulário de ocorrência do Figma "Frame - Nova Ocorrência" (107:1468 / 158:*), usado na
 * criação (`create.tsx`) e na edição pelo autor (`occurrence/edit/[id].tsx`, D-032). Seções
 * Categoria → Título/Descrição → Local → Foto, barra de etapas e botão de envio. "Título" e
 * "Local" não existem no Figma, mas são exigidos pela API e pelo fluxo atual (D-018).
 */
export function OccurrenceForm({
  heading,
  headerAccessory,
  submitLabel,
  initial,
  autoLocate = false,
  bottomSpace,
  onSubmit,
}: OccurrenceFormProps) {
  const categoriesQuery = useCategories();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(initial?.subcategoryId ?? null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | null>(null);
  // Ícones das categorias, para ancorar o menu de subcategorias no ícone tocado (Figma).
  const categoryRefs = useRef<Record<string, View | null>>({});
  // Último título preenchido automaticamente com a subcategoria (só ele é substituído).
  const autoTitleRef = useRef<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(initial?.photoUri ?? null);
  const [photoType, setPhotoType] = useState("image/jpeg");
  const [photoChanged, setPhotoChanged] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(initial?.coords ?? null);
  const [locationSource, setLocationSource] = useState<LocationSource | null>(
    initial ? "saved" : null,
  );
  const [locating, setLocating] = useState(false);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Trava síncrona contra toque duplo antes de o estado `loading` re-renderizar o botão.
  const submittingRef = useRef(false);

  useEffect(() => {
    if (autoLocate) {
      void locate();
    }
  }, []);

  // A regra "só no bairro residencial" está desativada temporariamente (D-018): qualquer ponto é aceito.
  async function locate() {
    setGeoMessage(null);
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setGeoMessage("Localização não autorizada. Toque no mapa para escolher o local.");
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({
        latitude: Number(position.coords.latitude.toFixed(6)),
        longitude: Number(position.coords.longitude.toFixed(6)),
      });
      setLocationSource("gps");
    } catch {
      setGeoMessage("Não foi possível obter o GPS. Toque no mapa para escolher o local.");
    } finally {
      setLocating(false);
    }
  }

  function pickOnMap(next: Coords) {
    setCoords(next);
    setLocationSource("manual");
    setGeoMessage(null);
  }

  const selectedCategory = categoriesQuery.data?.find((item) => item.id === categoryId) ?? null;
  const subcategories = selectedCategory?.subcategories ?? [];
  const selectedSubcategory = subcategories.find((item) => item.id === subcategoryId) ?? null;
  // Categoria sem opções (ex.: "Outros") dispensa subcategoria; as demais exigem (D-022).
  const categoryReady = Boolean(selectedCategory) && (subcategories.length === 0 || Boolean(selectedSubcategory));

  /** Troca o título só se ele estiver vazio ou ainda for o preenchido automaticamente. */
  function applyAutoTitle(next: string | null) {
    setTitle((current) => {
      const untouched = current.trim() === "" || current === autoTitleRef.current;
      if (!untouched) {
        return current;
      }
      autoTitleRef.current = next;
      return next ?? "";
    });
  }

  function openMenu(id: string) {
    const node = categoryRefs.current[id];
    const show = (anchor: MenuAnchor | null) => {
      setMenuAnchor(anchor);
      setMenuOpen(true);
    };
    if (!node) {
      show(null);
      return;
    }
    node.measureInWindow((x, y, width, height) =>
      show(width > 0 ? { x, y, width, height } : null),
    );
  }

  /**
   * Figma: tocar numa categoria abre o menu com as subcategorias dela. Trocar de categoria
   * limpa a subcategoria anterior (evita combinação inválida); tocar de novo na mesma
   * reabre o menu para mudar a opção.
   */
  function selectCategory(id: string) {
    setError(null);
    if (id !== categoryId) {
      setCategoryId(id);
      setSubcategoryId(null);
      applyAutoTitle(null);
    }
    const category = categoriesQuery.data?.find((item) => item.id === id);
    if (category?.subcategories?.length) {
      openMenu(id);
    }
  }

  function selectSubcategory(id: string, name: string) {
    setSubcategoryId(id);
    setMenuOpen(false);
    setError(null);
    // Sugere o título com a subcategoria (o "Outros" não diz nada, então não sugere).
    applyAutoTitle(name === "Outros" ? null : name);
  }

  /** Figma: uma única área "Tirar foto ou escolher da galeria" → pergunta a origem. */
  function choosePhotoSource() {
    if (Platform.OS === "web") {
      void pickPhoto(false);
      return;
    }
    Alert.alert("Foto da ocorrência", "De onde vem a foto?", [
      { text: "Câmera", onPress: () => void pickPhoto(true) },
      { text: "Galeria", onPress: () => void pickPhoto(false) },
      { text: "Cancelar", style: "cancel" },
    ]);
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
    setPhotoChanged(true);
  }

  async function handleSubmit() {
    if (submittingRef.current) {
      return;
    }
    setError(null);

    if (!categoryId) {
      setError("Escolha uma categoria.");
      return;
    }
    if (!categoryReady) {
      setError("Escolha uma subcategoria.");
      return;
    }
    if (title.trim().length < 3) {
      setError("O título precisa ter pelo menos 3 caracteres.");
      return;
    }
    if (description.trim().length < 3) {
      setError("Descreva a ocorrência (pelo menos 3 caracteres).");
      return;
    }
    if (!coords) {
      setError("Defina o local da ocorrência (GPS ou toque no mapa).");
      return;
    }
    if (!photoUri) {
      setError("A ocorrência precisa de pelo menos uma foto.");
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        categoryId,
        subcategoryId: selectedSubcategory?.id ?? null,
        coords,
        photo: { uri: photoUri, type: photoType, changed: photoChanged },
      });
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Não foi possível salvar a ocorrência.",
      );
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  // Barra de etapas do Figma (5 segmentos), refletindo o que já foi preenchido.
  const steps = [
    categoryReady,
    title.trim().length >= 3 && description.trim().length >= 3,
    Boolean(coords),
    Boolean(photoUri),
    Boolean(categoryReady && coords && photoUri && title.trim().length >= 3 && description.trim().length >= 3),
  ];
  const ready = steps[4];

  return (
    <>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: bottomSpace + 16 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {heading}
            </Text>
            {headerAccessory}
          </View>

          <View style={styles.steps} accessibilityLabel="Etapas da ocorrência">
            {steps.map((done, index) => (
              <View key={index} style={[styles.step, done && styles.stepDone]} />
            ))}
          </View>

          <Text style={styles.sectionLabel}>Categoria</Text>
          <View style={styles.categories}>
            {(categoriesQuery.data ?? []).map((item, index) => (
              // Figma: 3 por linha — esquerda, centro e direita.
              <View
                key={item.id}
                style={[
                  styles.categoryCell,
                  { alignItems: (["flex-start", "center", "flex-end"] as const)[index % 3] },
                ]}
              >
                <View
                  ref={(node) => {
                    categoryRefs.current[item.id] = node;
                  }}
                  collapsable={false}
                >
                  <CategoryIcon
                    name={item.name}
                    selected={item.id === categoryId}
                    dimmed={categoryId !== null && item.id !== categoryId}
                    onPress={() => selectCategory(item.id)}
                  />
                </View>
              </View>
            ))}
          </View>

          {/* Relação categoria → subcategoria escolhida (o Figma só desenha o menu aberto). */}
          {selectedCategory && subcategories.length > 0 ? (
            <Pressable
              onPress={() => openMenu(selectedCategory.id)}
              accessibilityRole="button"
              accessibilityLabel={
                selectedSubcategory
                  ? `${selectedCategory.name}, ${selectedSubcategory.name}. Alterar subcategoria`
                  : `Escolher a subcategoria de ${selectedCategory.name}`
              }
              style={({ pressed }) => [styles.subcategory, pressed && styles.pressed]}
            >
              <Text style={styles.subcategoryText} numberOfLines={1}>
                <Text style={styles.subcategoryParent}>{selectedCategory.name} › </Text>
                {selectedSubcategory ? (
                  subcategoryLabel(selectedSubcategory.name)
                ) : (
                  <Text style={styles.subcategoryMissing}>escolha o tipo do problema</Text>
                )}
              </Text>
              <Text style={styles.subcategoryAction}>
                {selectedSubcategory ? "Alterar" : "Escolher"}
              </Text>
            </Pressable>
          ) : null}

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>Título</Text>
          <TextInput
            value={title}
            onChangeText={(value) => setTitle(value.slice(0, 200))}
            placeholder="Ex.: Buraco na calçada"
            placeholderTextColor={colors.muted}
            style={[styles.box, styles.titleInput]}
            accessibilityLabel="Título"
          />

          <Text style={[styles.sectionLabel, styles.sectionSpacing]}>Descrição</Text>
          <TextInput
            value={description}
            onChangeText={(value) => setDescription(value.slice(0, 500))}
            placeholder="Digite a descrição"
            placeholderTextColor={colors.muted}
            multiline
            style={[styles.box, styles.textarea]}
            accessibilityLabel="Descrição"
          />
          <Text style={styles.counter}>{description.length}/500</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>Local</Text>
          <View style={styles.picker}>
            <LocationPicker value={coords} onChange={pickOnMap} />
          </View>
          <Text style={styles.geo}>
            {coords
              ? `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)} · ${
                  locationSource === "manual"
                    ? "escolhido no mapa"
                    : locationSource === "saved"
                      ? "local registrado"
                      : "GPS"
                }`
              : locating
                ? "Obtendo localização…"
                : "Local ainda não definido."}
          </Text>
          {geoMessage ? <Text style={styles.geoError}>{geoMessage}</Text> : null}
          <Pressable onPress={() => void locate()} disabled={locating} hitSlop={8}>
            <Text style={styles.retry}>{locating ? "Localizando…" : "Usar minha localização (GPS)"}</Text>
          </Pressable>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>Foto</Text>
          <Pressable
            onPress={choosePhotoSource}
            accessibilityRole="button"
            accessibilityLabel="Tirar foto ou escolher da galeria"
            style={({ pressed }) => [styles.box, styles.photoBox, pressed && styles.pressed]}
          >
            {photoUri ? (
              <>
                <Image source={{ uri: photoUri }} style={styles.preview} />
                <Text style={styles.photoHint}>Toque para trocar a foto</Text>
              </>
            ) : (
              <View style={styles.photoEmpty}>
                <UploadIcon width={34} height={34} />
                <Text style={styles.photoText}>Tirar foto ou escolher da galeria</Text>
              </View>
            )}
          </Pressable>

          <View style={styles.divider} />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton
            label={submitLabel}
            onPress={() => void handleSubmit()}
            loading={loading}
            disabled={!ready}
            style={styles.submit}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <SubcategoryMenu
        visible={menuOpen && subcategories.length > 0}
        categoryName={selectedCategory?.name ?? ""}
        subcategories={subcategories}
        selectedId={subcategoryId}
        anchor={menuAnchor}
        onSelect={(item) => selectSubcategory(item.id, item.name)}
        onClose={() => setMenuOpen(false)}
      />
    </>
  );
}

const SIDE = 26;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingTop: 36,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SIDE,
  },
  title: {
    ...type.largeTitle,
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  steps: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: SIDE,
    marginTop: 5,
    marginBottom: 24,
  },
  step: {
    flex: 1,
    height: 4,
    borderRadius: 5,
    backgroundColor: colors.progressIdle,
  },
  stepDone: {
    backgroundColor: colors.primary,
  },
  sectionLabel: {
    ...type.section,
    marginHorizontal: SIDE,
    marginBottom: 10,
  },
  sectionSpacing: {
    marginTop: 18,
  },
  categories: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 18,
    marginHorizontal: SIDE,
  },
  categoryCell: {
    width: "33.333%",
  },
  subcategory: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: SIDE,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  subcategoryText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  subcategoryParent: {
    color: colors.primary,
    fontWeight: "700",
  },
  subcategoryMissing: {
    color: colors.muted,
    fontWeight: "400",
  },
  subcategoryAction: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  picker: {
    marginHorizontal: SIDE,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginHorizontal: 11,
    marginVertical: 18,
  },
  box: {
    marginHorizontal: SIDE,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 14,
  },
  titleInput: {
    height: 44,
    paddingHorizontal: 15,
  },
  textarea: {
    minHeight: 110,
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: "top",
  },
  counter: {
    ...type.caption,
    textAlign: "right",
    marginHorizontal: SIDE,
    marginTop: 4,
  },
  geo: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
    marginHorizontal: SIDE,
  },
  geoError: {
    color: colors.error,
    fontSize: 13,
    marginTop: 4,
    marginHorizontal: SIDE,
  },
  retry: {
    color: colors.primary,
    fontWeight: "700",
    marginTop: 6,
    marginHorizontal: SIDE,
  },
  photoBox: {
    minHeight: 90,
    justifyContent: "center",
    overflow: "hidden",
  },
  photoEmpty: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 13,
    paddingHorizontal: 16,
    paddingVertical: 28,
  },
  photoText: {
    color: colors.muted,
    fontSize: 14,
    flexShrink: 1,
  },
  preview: {
    width: "100%",
    height: 180,
  },
  photoHint: {
    ...type.caption,
    textAlign: "center",
    paddingVertical: 6,
  },
  pressed: {
    opacity: 0.8,
  },
  error: {
    color: colors.error,
    fontSize: 14,
    marginHorizontal: SIDE,
    marginBottom: 10,
  },
  submit: {
    marginHorizontal: 34,
  },
});
