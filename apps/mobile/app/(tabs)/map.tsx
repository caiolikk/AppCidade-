import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FilterChips } from "../../components/FilterChips";
import { MapCanvas } from "../../components/MapCanvas";
import { OccurrenceSummaryCard } from "../../components/OccurrenceSummaryCard";
import { useCategories, useOccurrences } from "../../hooks/use-feed";
import { toCardModel } from "../../lib/format";
import { colors } from "../../theme";

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState("Todos");
  const [query, setQuery] = useState("Santos, SP");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const occurrencesQuery = useOccurrences();
  const categoriesQuery = useCategories();

  const filters = useMemo(
    () => ["Todos", ...(categoriesQuery.data?.map((item) => item.name) ?? [])],
    [categoriesQuery.data],
  );

  const filtered = useMemo(() => {
    const items = occurrencesQuery.data ?? [];
    return filter === "Todos"
      ? items
      : items.filter((item) => item.category.name === filter);
  }, [filter, occurrencesQuery.data]);

  const cards = filtered.map(toCardModel);
  const selected =
    cards.find((item) => item.id === selectedId) ?? cards[0] ?? null;

  return (
    <View style={styles.screen}>
      <MapCanvas
        occurrences={filtered}
        selectedId={selected?.id ?? null}
        onSelect={setSelectedId}
      />

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
        </View>
        <View style={styles.filters}>
          <FilterChips filters={filters} selected={filter} onSelect={setFilter} />
        </View>
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
        {cards.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => router.push(`/occurrence/${item.id}`)}
          >
            <OccurrenceSummaryCard occurrence={item} compact />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#E8E4D8",
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
