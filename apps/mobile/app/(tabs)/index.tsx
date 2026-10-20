import React, { useMemo, useState } from "react";
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
import { FilterChips } from "../../components/FilterChips";
import { OccurrencePhotoGridItem } from "../../components/OccurrencePhotoGridItem";
import { useCategories, useOccurrences } from "../../hooks/use-feed";
import { toCardModel } from "../../lib/format";
import { useAuthStore } from "../../store/auth";
import { theme } from "../../theme";

const COLUMNS = 3;
const H_PADDING = 16;
const GAP = 8;

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const user = useAuthStore((state) => state.user);
  const [filter, setFilter] = useState("Todos");
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

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.city}>Santos</Text>
        <Text style={styles.neighborhood}>
          {user?.neighborhood ?? "Ponta da Praia"}
        </Text>
      </View>

      <View style={styles.filterWrap}>
        <FilterChips filters={filters} selected={filter} onSelect={setFilter} />
      </View>

      <View style={styles.gridContainer}>
        {occurrencesQuery.isLoading ? (
          <ActivityIndicator style={styles.loader} color={theme.colors.brand.primary} />
        ) : occurrencesQuery.isError ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>Não foi possível carregar o feed</Text>
            <Pressable onPress={() => void occurrencesQuery.refetch()}>
              <Text style={styles.retryText}>Tentar de novo</Text>
            </Pressable>
          </View>
        ) : cards.length === 0 ? (
          <View style={styles.stateBox}>
            <Text style={styles.emptyText}>Sem ocorrências nessa categoria.</Text>
          </View>
        ) : (
          <FlatList
            data={cards}
            key={`grid-3col`}
            keyExtractor={(item) => item.id}
            numColumns={COLUMNS}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <OccurrencePhotoGridItem occurrence={item} size={tileSize} />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background.main,
  },
  header: {
    paddingHorizontal: H_PADDING,
    paddingTop: 12,
    paddingBottom: 6,
  },
  city: {
    color: theme.colors.text.primary,
    fontSize: 26,
    fontWeight: theme.typography.weight.bold,
    letterSpacing: -0.5,
  },
  neighborhood: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    marginTop: 2,
    marginBottom: 8,
  },
  filterWrap: {
    marginBottom: 10,
  },
  gridContainer: {
    flex: 1,
    paddingHorizontal: H_PADDING,
  },
  row: {
    gap: GAP,
    marginBottom: GAP,
  },
  gridContent: {
    paddingBottom: 32,
  },
  loader: {
    marginTop: 60,
  },
  stateBox: {
    paddingTop: 40,
    alignItems: "center",
  },
  stateTitle: {
    color: theme.colors.text.primary,
    fontSize: 15,
    fontWeight: theme.typography.weight.semiBold,
  },
  retryText: {
    color: theme.colors.brand.primary,
    fontSize: 14,
    fontWeight: theme.typography.weight.bold,
    marginTop: 8,
  },
  emptyText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    textAlign: "center",
  },
});
