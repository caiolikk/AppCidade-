import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FilterChips } from "../../components/FilterChips";
import { OccurrenceSummaryCard } from "../../components/OccurrenceSummaryCard";
import { useCategories, useOccurrences } from "../../hooks/use-feed";
import { toCardModel } from "../../lib/format";
import { useAuthStore } from "../../store/auth";
import { colors, statusColors } from "../../theme";

const COLUMNS = 4;
const H_PADDING = 16;
const GAP = 8;

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const user = useAuthStore((state) => state.user);
  const [filter, setFilter] = useState("Todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const tileSize = (width - H_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS;

  const occurrencesQuery = useOccurrences();
  const categoriesQuery = useCategories();

  const filters = useMemo(
    () => ["Todos", ...(categoriesQuery.data?.map((item) => item.name) ?? [])],
    [categoriesQuery.data],
  );

  const cards = useMemo(() => {
    const items = (occurrencesQuery.data ?? []).map(toCardModel);
    return filter === "Todos" ? items : items.filter((item) => item.category === filter);
  }, [filter, occurrencesQuery.data]);

  const selected =
    cards.find((item) => item.id === selectedId) ?? cards[0] ?? null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.city}>Santos</Text>
          <Text style={styles.neighborhood}>
            {user?.neighborhood ?? "Seu bairro"}
          </Text>
        </View>
        <Pressable style={styles.avatar} onPress={() => router.push("/account")}>
          <Ionicons name="person" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <FilterChips filters={filters} selected={filter} onSelect={setFilter} />

      <View style={styles.gridWrap}>
        {occurrencesQuery.isLoading ? (
          <ActivityIndicator style={styles.state} color={colors.primary} />
        ) : occurrencesQuery.isError ? (
          <View style={styles.state}>
            <Text style={styles.stateTitle}>Não foi possível carregar o feed</Text>
            <Pressable onPress={() => void occurrencesQuery.refetch()}>
              <Text style={styles.retry}>Tentar de novo</Text>
            </Pressable>
          </View>
        ) : cards.length === 0 ? (
          <View style={styles.state}>
            <Text style={styles.stateTitle}>Nenhuma ocorrência ainda</Text>
            <Text style={styles.stateText}>
              Quando alguém registrar no bairro, ela aparece aqui.
            </Text>
          </View>
        ) : (
          <FlatList
            data={cards}
            key={`grid-${tileSize.toFixed(1)}`}
            keyExtractor={(item) => item.id}
            numColumns={COLUMNS}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <OccurrenceTile
                occurrence={item}
                selected={item.id === selected?.id}
                size={tileSize}
                onPress={() => setSelectedId(item.id)}
              />
            )}
          />
        )}

        {selected ? (
          <Pressable
            style={styles.summary}
            onPress={() => router.push(`/occurrence/${selected.id}`)}
          >
            <OccurrenceSummaryCard occurrence={selected} />
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function OccurrenceTile({
  occurrence,
  selected,
  size,
  onPress,
}: {
  occurrence: ReturnType<typeof toCardModel>;
  selected: boolean;
  size: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "#E5E7EB" }}
      style={[
        styles.tile,
        { width: size, height: size },
        selected && styles.tileSelected,
      ]}
    >
      {occurrence.thumbnailUrl ? (
        <Image source={{ uri: occurrence.thumbnailUrl }} style={styles.photo} />
      ) : (
        <View style={[styles.photo, styles.photoFallback]}>
          <Ionicons name="image-outline" size={18} color="#8A8A8A" />
        </View>
      )}
      <View
        style={[
          styles.dot,
          { backgroundColor: statusColors[occurrence.status] },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  city: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  neighborhood: {
    color: colors.muted,
    fontSize: 16,
    marginTop: 2,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.avatar,
    alignItems: "center",
    justifyContent: "center",
  },
  gridWrap: {
    flex: 1,
    marginTop: 14,
  },
  grid: {
    paddingHorizontal: H_PADDING,
    paddingBottom: 200,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: GAP,
  },
  tile: {
    borderRadius: 8,
    overflow: "hidden",
  },
  tileSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  photo: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.grid,
  },
  photoFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    right: 6,
    bottom: 6,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  summary: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 10,
  },
  state: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  stateText: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  retry: {
    color: colors.primary,
    fontWeight: "700",
    marginTop: 12,
  },
});
