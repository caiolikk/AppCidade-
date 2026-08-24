import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FilterChips } from "../../components/FilterChips";
import { OccurrenceSummaryCard } from "../../components/OccurrenceSummaryCard";
import {
  CURRENT_USER,
  FILTERS,
  OCCURRENCES,
  type Occurrence,
} from "../../data/mockOccurrences";
import { colors, statusColors } from "../../theme";

const COLUMNS = 4;
const H_PADDING = 16;
const GAP = 8;

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState("Todos");
  const [selectedId, setSelectedId] = useState(OCCURRENCES[0].id);
  const tileSize = (width - H_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS;

  const items = useMemo(
    () =>
      filter === "Todos"
        ? OCCURRENCES
        : OCCURRENCES.filter((item) => item.category === filter),
    [filter],
  );

  const selected =
    items.find((item) => item.id === selectedId) ?? items[0] ?? OCCURRENCES[0];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.city}>{CURRENT_USER.city}</Text>
          <Text style={styles.neighborhood}>{CURRENT_USER.neighborhood}</Text>
        </View>
        <Pressable style={styles.avatar}>
          <Ionicons name="person" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <FilterChips filters={FILTERS} selected={filter} onSelect={setFilter} />

      <View style={styles.gridWrap}>
        <FlatList
          data={items}
          key={`grid-${tileSize.toFixed(1)}`}
          keyExtractor={(item) => item.id}
          numColumns={COLUMNS}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <OccurrenceTile
              occurrence={item}
              selected={item.id === selected.id}
              size={tileSize}
              onPress={() => setSelectedId(item.id)}
            />
          )}
        />

        {selected ? (
          <View style={styles.summary}>
            <OccurrenceSummaryCard occurrence={selected} />
          </View>
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
  occurrence: Occurrence;
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
      <View style={[styles.photo, { backgroundColor: occurrence.photoTone }]}>
        <Ionicons name="image-outline" size={18} color="#8A8A8A" />
      </View>
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
    flex: 1,
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
});
