import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../theme";

type CategoryItem = {
  id: string;
  name: string;
};

type CategorySelectGridProps = {
  categories: CategoryItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Infraestrutura: "construct",
  Limpeza: "trash",
  Segurança: "shield-checkmark",
  Trânsito: "car",
  Outros: "ellipsis-horizontal",
};

export function CategorySelectGrid({
  categories,
  selectedId,
  onSelect,
}: CategorySelectGridProps) {
  // Garantir a ordem das 5 categorias principais vista no Figma:
  // Top: Infraestrutura, Limpeza, Segurança
  // Bottom: Trânsito, Outros
  const orderedNames = ["Infraestrutura", "Limpeza", "Segurança", "Trânsito", "Outros"];

  const sorted = [...categories].sort((a, b) => {
    const idxA = orderedNames.indexOf(a.name);
    const idxB = orderedNames.indexOf(b.name);
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });

  return (
    <View style={styles.grid}>
      {sorted.map((item) => {
        const active = item.id === selectedId;
        const iconName = CATEGORY_ICONS[item.name] ?? "help-circle";

        return (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={styles.cell}
            accessibilityRole="button"
            accessibilityLabel={`Categoria ${item.name}`}
            accessibilityState={{ selected: active }}
          >
            <View style={[styles.circle, active && styles.circleActive]}>
              <Ionicons
                name={iconName}
                size={28}
                color={active ? theme.colors.brand.primary : "#555555"}
              />
            </View>
            <Text
              style={[styles.label, active && styles.labelActive]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    rowGap: 16,
    columnGap: 8,
    marginVertical: 12,
  },
  cell: {
    width: "30%",
    alignItems: "center",
  },
  circle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  circleActive: {
    borderColor: theme.colors.brand.primary,
    backgroundColor: "#FFFFFF",
  },
  label: {
    marginTop: 6,
    fontSize: 12,
    color: theme.colors.text.secondary,
    textAlign: "center",
  },
  labelActive: {
    color: theme.colors.brand.primary,
    fontWeight: theme.typography.weight.bold,
  },
});
