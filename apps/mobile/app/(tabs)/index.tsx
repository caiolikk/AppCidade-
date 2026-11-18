import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SearchBack from "../../assets/figma/map-search-back.svg";
import SearchClear from "../../assets/figma/map-search-clear.svg";
import { useTabBarSpace } from "../../components/AppTabBar";
import { FilterChips } from "../../components/FilterChips";
import { MapCanvas, type SearchTarget } from "../../components/MapCanvas";
import { OccurrenceDetailsModal } from "../../components/OccurrenceDetailsModal";
import { useCategories, useOccurrences } from "../../hooks/use-feed";
import { useScreenFocused } from "../../hooks/use-screen-focused";
import {
  locationStatusMessage,
  useUserLocation,
} from "../../hooks/use-user-location";
import { buildSearchQuery, formatAddressLabel } from "../../lib/address-search";
import { isValidCoordinate } from "../../lib/geo";
import { colors, floatingShadow } from "../../theme";

/**
 * Geocodifica no aparelho (Android/iOS; sem chave nem custo, D-030). No Android o
 * geocodificador exige a permissão de localização: se faltar, pede uma vez e tenta de novo.
 */
async function geocodeWithPermission(query: string) {
  try {
    return await Location.geocodeAsync(query);
  } catch (error) {
    const code = (error as { code?: string }).code ?? "";
    if (!/UNAUTHORIZED|PERMISSION/i.test(code)) throw error;
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      throw Object.assign(new Error("permissão negada"), {
        code: "PERMISSION_DENIED",
      });
    }
    return Location.geocodeAsync(query);
  }
}

/**
 * Figma "Frame - Map": tela inicial do app (D-023). Pins por categoria, posição do usuário
 * (sem direção, D-030), busca de endereço e botão de recentralizar. Mostra TODAS as
 * ocorrências (o raio "perto de mim" vale só para a aba "Perto de você"). Tocar num pin
 * abre o modal de detalhes compartilhado.
 */
export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarSpace = useTabBarSpace();
  const focused = useScreenFocused();
  const [filter, setFilter] = useState("Todos");
  // Campo começa vazio (antes "Santos, SP" era um VALOR fixo, não placeholder).
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchTarget, setSearchTarget] = useState<SearchTarget | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const occurrencesQuery = useOccurrences();
  const categoriesQuery = useCategories();
  // Pedido de foco numa ocorrência: "Ver no mapa" (modal da Home) ou ocorrência recém-criada.
  // `focusKey` muda a cada pedido, então repetir na mesma ocorrência também funciona.
  const { focus, focusKey } = useLocalSearchParams<{
    focus?: string;
    focusKey?: string;
  }>();
  const focusRequest = focus ? `${focus}:${focusKey ?? ""}` : null;

  const location = useUserLocation({ active: focused, mode: "navigation" });
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

  const position = location.position;

  /** Busca ao confirmar no teclado (nunca a cada letra: o geocodificador tem limite de uso). */
  async function searchAddress() {
    const typed = query;
    const geocodeQuery = buildSearchQuery(typed);
    if (!geocodeQuery || searching) {
      if (!geocodeQuery)
        setNotice("Digite um endereço, por exemplo: Av. Ana Costa, 300.");
      return;
    }
    Keyboard.dismiss();
    if (Platform.OS === "web") {
      setNotice("A busca de endereço funciona no app (Android/iOS).");
      return;
    }
    setSearching(true);
    try {
      const [found] = await geocodeWithPermission(geocodeQuery);
      if (!found) {
        setNotice(
          "Endereço não encontrado. Tente incluir o número ou o bairro.",
        );
        return;
      }
      let label = typed.trim();
      try {
        const [address] = await Location.reverseGeocodeAsync({
          latitude: found.latitude,
          longitude: found.longitude,
        });
        label = formatAddressLabel(address, typed);
      } catch {
        // Sem endereço reverso: fica o texto digitado.
      }
      setFollowing(false);
      setSearchTarget({
        latitude: found.latitude,
        longitude: found.longitude,
        label,
        key: Date.now(),
      });
      setNotice(label);
    } catch (error) {
      const code = (error as { code?: string }).code ?? "";
      setNotice(
        code === "PERMISSION_DENIED"
          ? "Para buscar endereços, permita o acesso à localização nas configurações."
          : "Não foi possível buscar agora. Verifique a internet e tente de novo.",
      );
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() {
    setQuery("");
    setSearchTarget(null);
  }

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
    return filter === "Todos"
      ? items
      : items.filter((item) => item.category.name === filter);
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
        searchTarget={searchTarget}
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

      <View
        style={[styles.topOverlay, { paddingTop: insets.top + 20 }]}
        pointerEvents="box-none"
      >
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
            onSubmitEditing={() => void searchAddress()}
            returnKeyType="search"
            autoCorrect={false}
            placeholder="Buscar endereço"
            placeholderTextColor={colors.muted}
            accessibilityLabel="Buscar endereço"
            style={styles.input}
          />
          {searching ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : query || searchTarget ? (
            <Pressable
              onPress={clearSearch}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Limpar busca"
            >
              <SearchClear width={14} height={14} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.filters}>
          <FilterChips
            filters={filters}
            selected={filter}
            onSelect={setFilter}
          />
        </View>
      </View>

      <View
        style={[styles.controls, { bottom: tabBarSpace + 16 }]}
        pointerEvents="box-none"
      >
        {notice ? (
          <View style={[styles.notice, floatingShadow]}>
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        ) : null}
        <Pressable
          onPress={recenter}
          accessibilityRole="button"
          accessibilityLabel={
            following
              ? "Seguindo sua localização"
              : "Centralizar na minha localização"
          }
          style={({ pressed }) => [
            styles.locate,
            floatingShadow,
            pressed && styles.locatePressed,
          ]}
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
        onClose={() => {
          setDetailsId(null);
          // Não deixa a seleção "presa" depois de fechar os detalhes (D-031).
          setSelectedId(null);
        }}
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
