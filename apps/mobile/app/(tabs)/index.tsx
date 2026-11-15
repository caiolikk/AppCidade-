import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SearchBack from "../../assets/figma/map-search-back.svg";
import SearchClear from "../../assets/figma/map-search-clear.svg";
import { useTabBarSpace } from "../../components/AppTabBar";
import { FilterChips } from "../../components/FilterChips";
import { MapCanvas } from "../../components/MapCanvas";
import { OccurrenceDetailsModal } from "../../components/OccurrenceDetailsModal";
import { useDeviceHeading } from "../../hooks/use-device-heading";
import { useCategories, useOccurrences } from "../../hooks/use-feed";
import { useScreenFocused } from "../../hooks/use-screen-focused";
import { locationStatusMessage, useUserLocation } from "../../hooks/use-user-location";
import { isValidCoordinate } from "../../lib/geo";
import { colors, floatingShadow } from "../../theme";

/** Velocidade mínima (m/s) para usar o course do GPS como direção quando não há bússola. */
const MIN_SPEED_FOR_COURSE = 1;

/**
 * Figma "Frame - Map" + experiência estilo Waze: pins por categoria, posição e direção do
 * usuário, botão de recentralizar. Mostra TODAS as ocorrências (o raio "perto de mim" vale só
 * para a Home). Tocar num pin abre o modal de detalhes compartilhado.
 */
export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarSpace = useTabBarSpace();
  const focused = useScreenFocused();
  const [filter, setFilter] = useState("Todos");
  const [query, setQuery] = useState("Santos, SP");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const occurrencesQuery = useOccurrences();
  const categoriesQuery = useCategories();
  // Pedido de foco numa ocorrência: "Ver no mapa" (modal da Home) ou ocorrência recém-criada.
  // `focusKey` muda a cada pedido, então repetir na mesma ocorrência também funciona.
  const { focus, focusKey } = useLocalSearchParams<{ focus?: string; focusKey?: string }>();
  const focusRequest = focus ? `${focus}:${focusKey ?? ""}` : null;

  const location = useUserLocation({ active: focused, mode: "navigation" });
  const heading = useDeviceHeading(focused && location.status === "ready");
  const [following, setFollowing] = useState(!focus);
  const [recenterKey, setRecenterKey] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  // Prioridade do pedido de foco sobre "seguir o usuário", aplicada NO RENDER (padrão React de
  // ajustar estado quando uma prop muda). Num useEffect seria tarde: os efeitos do MapCanvas
  // rodam antes e um fix de GPS poderia puxar a câmera de volta para o usuário.
  // Só o botão "Minha localização" volta a seguir.
  const [handledFocus, setHandledFocus] = useState<string | null>(null);
  if (focusRequest && focusRequest !== handledFocus) {
    setHandledFocus(focusRequest);
    setFollowing(false);
    setFilter("Todos"); // o filtro de categoria não pode esconder o pin em foco
    setSelectedId(focus ?? null); // pin destacado (versão "selecionada")
  }

  // Direção: bússola (para onde o aparelho aponta); sem bússola confiável, o course do GPS
  // só em movimento; parado e sem bússola → sem cone (nunca inventa direção).
  const position = location.position;
  const direction =
    heading ??
    (position && position.course !== null && (position.speed ?? 0) > MIN_SPEED_FOR_COURSE
      ? position.course
      : null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const filters = useMemo(
    () => ["Todos", ...(categoriesQuery.data?.map((item) => item.name) ?? [])],
    [categoriesQuery.data],
  );

  const visible = useMemo(() => {
    const items = (occurrencesQuery.data ?? []).filter(isValidCoordinate);
    return filter === "Todos" ? items : items.filter((item) => item.category.name === filter);
  }, [filter, occurrencesQuery.data]);

  function recenter() {
    if (location.position) {
      setFollowing(true);
      setRecenterKey((value) => value + 1);
      return;
    }
    // Sem posição: explica o motivo e tenta resolver (pedir permissão / ligar o GPS).
    setNotice(locationStatusMessage(location.status));
    if (location.status !== "loading") {
      void location.retry();
    }
  }

  return (
    <View style={styles.screen}>
      <MapCanvas
        occurrences={visible}
        selectedId={selectedId}
        onSelect={(id) => {
          setSelectedId(id);
          setDetailsId(id);
        }}
        focusId={focus ?? null}
        focusKey={focusKey ?? null}
        userPosition={position}
        userDirection={direction}
        following={following}
        recenterKey={recenterKey}
        onUserGesture={() => setFollowing(false)}
      />

      {/* Figma "Sombras Brancas": degradê branco no topo e verde-claro na base. */}
      <LinearGradient
        colors={["rgba(250,250,250,0.85)", "rgba(250,250,250,0)"]}
        style={[styles.fadeTop, { height: insets.top + 150 }]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["rgba(227,252,228,0)", "rgba(227,252,228,0.75)"]}
        style={[styles.fadeBottom, { height: tabBarSpace + 120 }]}
        pointerEvents="none"
      />

      <View style={[styles.topOverlay, { paddingTop: insets.top + 20 }]} pointerEvents="box-none">
        <View style={[styles.search, floatingShadow]}>
          <Pressable
            onPress={() => router.push("/nearby")}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Ver ocorrências perto de você"
          >
            <SearchBack width={16} height={16} />
          </Pressable>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar endereço"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          {query ? (
            <Pressable
              onPress={() => setQuery("")}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Limpar busca"
            >
              <SearchClear width={14} height={14} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.filters}>
          <FilterChips filters={filters} selected={filter} onSelect={setFilter} />
        </View>
      </View>

      <View style={[styles.controls, { bottom: tabBarSpace + 16 }]} pointerEvents="box-none">
        {notice ? (
          <View style={[styles.notice, floatingShadow]}>
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        ) : null}
        <Pressable
          onPress={recenter}
          accessibilityRole="button"
          accessibilityLabel={following ? "Seguindo sua localização" : "Centralizar na minha localização"}
          style={({ pressed }) => [styles.locate, floatingShadow, pressed && styles.locatePressed]}
        >
          <Ionicons
            name={following && position ? "navigate" : "navigate-outline"}
            size={22}
            color={following && position ? colors.primary : colors.text}
          />
        </Pressable>
      </View>

      <OccurrenceDetailsModal
        occurrenceId={detailsId}
        onClose={() => setDetailsId(null)}
        userPosition={position}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fadeTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  fadeBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  search: {
    marginHorizontal: 12,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 20,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    letterSpacing: 0.5,
    paddingVertical: 0,
  },
  filters: {
    marginTop: 21,
  },
  controls: {
    position: "absolute",
    right: 16,
    left: 16,
    alignItems: "flex-end",
    gap: 10,
  },
  notice: {
    maxWidth: 300,
    backgroundColor: colors.background,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  noticeText: {
    color: colors.text,
    fontSize: 13,
  },
  locate: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  locatePressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
});
