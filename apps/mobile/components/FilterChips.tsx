import { FlatList, Platform, Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../theme";

type FilterChipsProps = {
  filters: string[];
  selected: string;
  onSelect: (filter: string) => void;
  /** Margem lateral do conteúdo (Figma: 26). */
  inset?: number;
};

/** Figma: "Menu Categorias" — pílulas de 22px; ativa preta, inativas com contorno preto. */
export function FilterChips({ filters, selected, onSelect, inset = 26 }: FilterChipsProps) {
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
      contentContainerStyle={[styles.row, { paddingLeft: inset, paddingRight: inset }]}
      renderItem={({ item }) => {
        const active = item === selected;
        return (
          <Pressable
            onPress={() => onSelect(item)}
            hitSlop={{ top: 11, bottom: 11 }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.chip,
              active ? styles.chipActive : styles.chipIdle,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{item}</Text>
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
    alignItems: "center",
    gap: 5,
  },
  chip: {
    height: 22,
    borderRadius: 50,
    paddingHorizontal: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: colors.text,
  },
  chipIdle: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.chipBorder,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 17,
  },
  labelActive: {
    color: colors.background,
  },
});
