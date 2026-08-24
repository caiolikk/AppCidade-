import { FlatList, Platform, Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../theme";

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
            android_ripple={{ color: "#D6DEEA", foreground: true }}
            style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
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
    paddingLeft: 16,
    paddingRight: 28,
    alignItems: "center",
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 10,
    overflow: "hidden",
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipIdle: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  label: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  labelActive: {
    color: "#FFFFFF",
  },
});
