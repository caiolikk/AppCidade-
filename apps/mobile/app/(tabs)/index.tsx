import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTabBarSpace } from "../../components/AppTabBar";
import { CategoryBadge } from "../../components/CategoryBadge";
import { FilterChips } from "../../components/FilterChips";
import { OccurrenceDetailsModal } from "../../components/OccurrenceDetailsModal";
import { ScreenBackground } from "../../components/ScreenBackground";
import { StatusDot } from "../../components/StatusPill";
import { useCategories, useOccurrences } from "../../hooks/use-feed";
import { useScreenFocused } from "../../hooks/use-screen-focused";
import { locationStatusMessage, useUserLocation } from "../../hooks/use-user-location";
import { formatReportedAgo } from "../../lib/format";
import { distanceKm, formatDistance, isValidCoordinate, NEARBY_RADIUS_KM } from "../../lib/geo";
import type { PublicOccurrence } from "../../lib/types";
import { useAuthStore } from "../../store/auth";
import { colors, statusVisual, statusVisualColors, type } from "../../theme";

type Row = { occurrence: PublicOccurrence; distance: number | null };

/**
 * Home "perto de mim": ocorrências a até NEARBY_RADIUS_KM do usuário, por distância, com o
 * ícone da categoria (sem foto). Sem localização: todas, por data, com aviso. O raio vale só
 * aqui — o mapa continua mostrando tudo. Tocar abre o modal de detalhes compartilhado.
 */
export default function HomeScreen() {
  const router = useRouter();
  const tabBarSpace = useTabBarSpace();
  const { width } = useWindowDimensions();
  const tileSize = Math.floor((width - SIDE * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
  const focused = useScreenFocused();
  const user = useAuthStore((state) => state.user);
  const [filter, setFilter] = useState("Todos");
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const occurrencesQuery = useOccurrences();
  const categoriesQuery = useCategories();
  const location = useUserLocation({ active: focused, mode: "nearby" });
  const position = location.position;

  const filters = useMemo(
    () => ["Todos", ...(categoriesQuery.data?.map((item) => item.name) ?? [])],
    [categoriesQuery.data],
  );

  const rows = useMemo<Row[]>(() => {
    const valid = (occurrencesQuery.data ?? []).filter(isValidCoordinate);
    const byCategory =
      filter === "Todos" ? valid : valid.filter((item) => item.category.name === filter);

    if (!position) {
      // Sem localização: todas, mais recentes primeiro (ordem da API).
      return byCategory.map((occurrence) => ({ occurrence, distance: null }));
    }
    return byCategory
      .map((occurrence) => ({
        occurrence,
        distance: distanceKm(position, {
          latitude: Number(occurrence.latitude),
          longitude: Number(occurrence.longitude),
        }),
      }))
      .filter((row) => row.distance !== null && row.distance <= NEARBY_RADIUS_KM)
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  }, [filter, occurrencesQuery.data, position]);

  const locationNotice = position ? null : locationStatusMessage(location.status);
  const canRetry = ["denied", "blocked", "services-off", "unavailable"].includes(location.status);

  return (
    <View style={styles.screen}>
      <ScreenBackground />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.city}>Santos</Text>
          <Text style={styles.neighborhood}>{user?.neighborhood ?? "Seu bairro"}</Text>
        </View>

        <View style={styles.chips}>
          <FilterChips filters={filters} selected={filter} onSelect={setFilter} />
        </View>

        <View style={styles.scope}>
          {position ? (
            <Text style={styles.scopeText}>
              Perto de você · até {NEARBY_RADIUS_KM} km · mais próximas primeiro
            </Text>
          ) : (
            <View style={styles.notice}>
              <Text style={styles.scopeText}>
                Mostrando todas as ocorrências.{locationNotice ? ` ${locationNotice}` : ""}
              </Text>
              {canRetry ? (
                <Pressable onPress={() => void location.retry()} hitSlop={8}>
                  <Text style={styles.link}>
                    {location.status === "blocked" ? "Abrir ajustes" : "Usar minha localização"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </View>

        <View style={styles.listWrap}>
          {occurrencesQuery.isLoading ? (
            <ActivityIndicator style={styles.loader} color={colors.primary} />
          ) : occurrencesQuery.isError ? (
            <View style={styles.state}>
              <Text style={styles.stateText}>Não foi possível carregar as ocorrências.</Text>
              <Pressable onPress={() => void occurrencesQuery.refetch()} hitSlop={8}>
                <Text style={styles.link}>Tentar de novo</Text>
              </Pressable>
            </View>
          ) : rows.length === 0 ? (
            <View style={styles.state}>
              <Text style={styles.stateText}>
                {position
                  ? `Nenhuma ocorrência a até ${NEARBY_RADIUS_KM} km de você${
                      filter === "Todos" ? "" : " nessa categoria"
                    }.`
                  : filter === "Todos"
                    ? "Nenhuma ocorrência registrada ainda."
                    : "Sem ocorrências nessa categoria."}
              </Text>
              {position ? (
                <Pressable onPress={() => router.push("/map")} hitSlop={8}>
                  <Text style={styles.link}>Explorar o mapa</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <FlatList
              data={rows}
              key={`grid-${tileSize}`}
              keyExtractor={(row) => row.occurrence.id}
              numColumns={COLUMNS}
              columnWrapperStyle={styles.gridRow}
              contentContainerStyle={[styles.grid, { paddingBottom: tabBarSpace + GAP }]}
              showsVerticalScrollIndicator={false}
              refreshing={occurrencesQuery.isRefetching}
              onRefresh={() => void occurrencesQuery.refetch()}
              renderItem={({ item }) => (
                <OccurrenceTile
                  row={item}
                  size={tileSize}
                  onPress={() => setDetailsId(item.occurrence.id)}
                />
              )}
            />
          )}

          {/* Figma: faixa de 20px que esmaece o topo da lista sob os chips. */}
          <LinearGradient
            colors={["rgba(250,250,250,1)", "rgba(250,250,250,0)"]}
            style={styles.topFade}
            pointerEvents="none"
          />
        </View>
      </SafeAreaView>

      <OccurrenceDetailsModal
        occurrenceId={detailsId}
        onClose={() => setDetailsId(null)}
        userPosition={position}
        onShowOnMap={(id) => {
          setDetailsId(null);
          router.push({ pathname: "/map", params: { focus: id, focusKey: String(Date.now()) } });
        }}
      />
    </View>
  );
}

/**
 * Figma "Frame - Home > Feed > Container": quadrado com cantos 5/5/25/5, borda e sombra, e a
 * bolinha de status no canto inferior direito. No lugar da foto (que fica no modal), a
 * ilustração da categoria em destaque + título e distância (ou tempo, sem localização).
 */
function OccurrenceTile({ row, size, onPress }: { row: Row; size: number; onPress: () => void }) {
  const { occurrence, distance } = row;
  const tint = statusVisualColors[statusVisual[occurrence.status]].pill;
  const dotSize = Math.round(size * 0.1875); // Figma: 20,6 / 110
  const iconSize = Math.round(size * 0.5);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${occurrence.title}, ${occurrence.category.name}${
        distance !== null ? `, a ${formatDistance(distance)}` : ""
      }`}
      style={({ pressed }) => [
        styles.tile,
        { width: size, height: size, backgroundColor: tint },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.tileArt}>
        <CategoryBadge name={occurrence.category.name} size={iconSize} />
      </View>
      <View style={[styles.tileText, { paddingRight: dotSize + 4 }]}>
        <Text style={styles.tileTitle} numberOfLines={1}>
          {occurrence.title}
        </Text>
        <Text style={styles.tileMeta} numberOfLines={1}>
          {distance !== null
            ? formatDistance(distance)
            : `há ${formatReportedAgo(occurrence.createdAt)}`}
        </Text>
      </View>
      <View style={styles.dot}>
        <StatusDot status={occurrence.status} size={dotSize} />
      </View>
    </Pressable>
  );
}

/** Figma "Frame - Home": grade de 3 colunas, margem 26, espaço 10. */
const SIDE = 26;
const COLUMNS = 3;
const GAP = 10;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SIDE,
    paddingTop: 36,
  },
  city: {
    ...type.largeTitle,
  },
  neighborhood: {
    ...type.subtitleMedium,
  },
  chips: {
    marginTop: 12,
  },
  scope: {
    paddingHorizontal: SIDE,
    marginTop: 12,
  },
  notice: {
    gap: 4,
  },
  scopeText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 15,
  },
  link: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  listWrap: {
    flex: 1,
    marginTop: 6,
  },
  topFade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 20,
  },
  grid: {
    paddingTop: GAP,
    paddingHorizontal: SIDE,
  },
  gridRow: {
    gap: GAP,
    marginBottom: GAP,
  },
  tile: {
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.5)",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.7,
  },
  tileArt: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 6,
  },
  tileText: {
    paddingLeft: 7,
    paddingBottom: 6,
  },
  tileTitle: {
    color: colors.text,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "600",
  },
  tileMeta: {
    color: colors.text,
    fontSize: 10,
    lineHeight: 12,
  },
  dot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    borderRadius: 100,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  loader: {
    marginTop: 40,
  },
  state: {
    paddingHorizontal: SIDE,
    paddingTop: 20,
    gap: 8,
  },
  stateText: {
    color: colors.muted,
    fontSize: 12,
  },
});
