import React from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text } from "react-native";
import { theme } from "../theme";

type FilterChipsProps = {
  filters: string[];
  selected: string;
  onSelect: (filter: string) => void;
};

export function FilterChips({ filters, selected, onSelect }: FilterChipsProps) {
  return (
    <FlatList
      horizontal
      data={filters}
      keyExtractor={(item) => item}
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      directionalLockEnabled
      decelerationRate="fast"
      style={styles.list}
      contentContainerStyle={styles.row}
      renderItem={({ item }) => {
        const active = item === selected;
        return (
          <Pressable
            onPress={() => onSelect(item)}
            accessibilityRole="button"
            accessibilityLabel={`Filtrar por ${item}`}
            accessibilityState={{ selected: active }}
            style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
          >
            <Text style={[styles.label, active ? styles.labelActive : styles.labelIdle]}>
              {item}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flexGrow: 0,
    width: "100%",
    ...(Platform.OS === "web" ? { overflow: "scroll" as const } : null),
  },
  row: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
    alignItems: "center",
    gap: 8,
  },
  chip: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    height: 36,
  },
  chipActive: {
    backgroundColor: theme.colors.chip.activeBg, // Preto sólido
  },
  chipIdle: {
    backgroundColor: theme.colors.chip.idleBg,
    borderWidth: 1,
    borderColor: theme.colors.chip.idleBorder,
  },
  label: {
    fontSize: theme.typography.size.label,
    fontWeight: theme.typography.weight.medium,
  },
  labelActive: {
    color: theme.colors.chip.activeText, // Branco
  },
  labelIdle: {
    color: theme.colors.chip.idleText, // Preto
  },
});
