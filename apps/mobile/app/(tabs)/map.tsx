import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type DimensionValue,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FilterChips } from "../../components/FilterChips";
import { OccurrenceSummaryCard } from "../../components/OccurrenceSummaryCard";
import { FILTERS, OCCURRENCES } from "../../data/mockOccurrences";
import { colors } from "../../theme";

const MARKERS: { top: DimensionValue; left: DimensionValue }[] = [
  { top: "22%", left: "28%" },
  { top: "30%", left: "62%" },
  { top: "46%", left: "40%" },
  { top: "58%", left: "70%" },
  { top: "64%", left: "24%" },
  { top: "38%", left: "78%" },
];

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState("Todos");
  const [query, setQuery] = useState("Av. Ana Costa 430, Gonzaga");
  const [zoom, setZoom] = useState(1);

  const items = useMemo(
    () =>
      filter === "Todos"
        ? OCCURRENCES
        : OCCURRENCES.filter((item) => item.category === filter),
    [filter],
  );

  return (
    <View style={styles.screen}>
      <View style={styles.mapArea}>
        <View style={[styles.mapPlaceholder, { transform: [{ scale: zoom }] }]}>
          <View style={[styles.block, styles.park]} />
          <View style={[styles.block, styles.water]} />
          <View style={styles.roadH} />
          <View style={styles.roadV} />
          <Text style={styles.mapLabel}>Mapa em desenvolvimento</Text>
          <View style={styles.userPulse} />
          <View style={styles.userDot} />
          {MARKERS.map((marker, index) => (
            <View key={index} style={[styles.marker, marker]} />
          ))}
        </View>
      </View>

      <View style={[styles.topOverlay, { paddingTop: insets.top + 8 }]}>
        <View style={styles.search}>
          <Pressable onPress={() => router.push("/")} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar endereço"
            placeholderTextColor={colors.subtitle}
            style={styles.input}
          />
          {query ? (
            <Pressable onPress={() => setQuery("")} hitSlop={10}>
              <Ionicons name="close" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
          <Pressable hitSlop={10}>
            <Ionicons name="mic-outline" size={20} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.filters}>
          <FilterChips filters={FILTERS} selected={filter} onSelect={setFilter} />
        </View>
      </View>

      <View style={styles.controls}>
        <MapButton icon="locate" onPress={() => setZoom(1)} />
        <MapButton icon="add" onPress={() => setZoom((value) => Math.min(value + 0.15, 1.6))} />
        <MapButton icon="remove" onPress={() => setZoom((value) => Math.max(value - 0.15, 0.85))} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.cards}
        contentContainerStyle={styles.cardsContent}
        decelerationRate="fast"
        snapToInterval={292}
        snapToAlignment="start"
      >
        {items.map((item) => (
          <OccurrenceSummaryCard key={item.id} occurrence={item} compact />
        ))}
      </ScrollView>
    </View>
  );
}

function MapButton({
  icon,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.control}>
      <Ionicons name={icon} size={20} color="#FFFFFF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#E8E4D8",
  },
  mapArea: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  mapPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#E8E4D8",
  },
  park: {
    top: "18%",
    left: "12%",
    width: "28%",
    height: "22%",
    backgroundColor: "#C9D9B0",
    borderRadius: 18,
  },
  water: {
    top: "48%",
    right: "8%",
    width: "36%",
    height: "26%",
    backgroundColor: "#B9D6E8",
    borderRadius: 40,
  },
  roadH: {
    position: "absolute",
    top: "42%",
    left: 0,
    right: 0,
    height: 10,
    backgroundColor: "#E8C56B",
  },
  roadV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "46%",
    width: 10,
    backgroundColor: "#F0D48A",
  },
  block: {
    position: "absolute",
  },
  mapLabel: {
    position: "absolute",
    top: "36%",
    left: 0,
    right: 0,
    textAlign: "center",
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
  },
  userPulse: {
    position: "absolute",
    top: "51%",
    left: "42%",
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "rgba(47, 111, 237, 0.18)",
  },
  userDot: {
    position: "absolute",
    top: "56.5%",
    left: "47.5%",
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.locationBlue,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  marker: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  search: {
    marginHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 22,
    paddingHorizontal: 12,
    height: 48,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    marginHorizontal: 8,
    paddingVertical: 0,
  },
  filters: {
    marginTop: 10,
  },
  controls: {
    position: "absolute",
    right: 14,
    bottom: 176,
  },
  control: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.mapGreen,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  cards: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 12,
  },
  cardsContent: {
    paddingHorizontal: 12,
    paddingRight: 24,
  },
});
