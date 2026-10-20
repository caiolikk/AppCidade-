import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FilterChips } from "../../components/FilterChips";
import { MapCanvas } from "../../components/MapCanvas";
import { useCategories, useOccurrences } from "../../hooks/use-feed";
import { theme } from "../../theme";

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState("Todos");
  const [query, setQuery] = useState("Av. Ana Costa 430, Gonzaga");
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

  return (
    <View style={styles.screen}>
      <MapCanvas
        occurrences={filtered}
        selectedId={selectedId}
        onSelect={(id) => {
          setSelectedId(id);
          router.push(`/occurrence/${id}`);
        }}
      />

      <View style={[styles.topOverlay, { paddingTop: insets.top + 8 }]}>
        <View style={styles.search}>
          <Pressable onPress={() => router.push("/")} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color={theme.colors.text.primary} />
          </Pressable>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar endereço ou ponto"
            placeholderTextColor={theme.colors.text.muted}
            style={styles.input}
          />
          {query ? (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close" size={18} color={theme.colors.text.secondary} />
            </Pressable>
          ) : null}
          <Pressable style={styles.micBtn} hitSlop={8}>
            <Ionicons name="mic-outline" size={20} color={theme.colors.text.primary} />
          </Pressable>
        </View>

        <View style={styles.filters}>
          <FilterChips filters={filters} selected={filter} onSelect={setFilter} />
        </View>
      </View>
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
    zIndex: 10,
  },
  search: {
    marginHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background.main,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 14,
    height: 48,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  input: {
    flex: 1,
    color: theme.colors.text.primary,
    fontSize: 14,
    marginHorizontal: 8,
    paddingVertical: 0,
  },
  micBtn: {
    marginLeft: 8,
  },
  filters: {
    marginTop: 10,
  },
});
