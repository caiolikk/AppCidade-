import { Pressable, StyleSheet, Text, View, type DimensionValue } from "react-native";
import { colors } from "../theme";
import { CategoryBadge } from "./CategoryBadge";
import type { PublicOccurrence } from "../lib/types";

const MARKERS: { top: DimensionValue; left: DimensionValue }[] = [
  { top: "22%", left: "28%" },
  { top: "30%", left: "62%" },
  { top: "46%", left: "40%" },
  { top: "58%", left: "70%" },
  { top: "64%", left: "24%" },
  { top: "38%", left: "78%" },
];

type MapCanvasProps = {
  occurrences: PublicOccurrence[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  focusId?: string | null;
  userPosition?: unknown;
  userDirection?: number | null;
  following?: boolean;
  recenterKey?: number;
  onUserGesture?: () => void;
};

/**
 * Web: sem react-native-maps. Desenho ilustrativo; os marcadores (posição fictícia na tela)
 * representam as ocorrências reais e abrem o mesmo modal de detalhes do app.
 */
export function MapCanvas({ occurrences, onSelect }: MapCanvasProps) {
  return (
    <View style={styles.mapPlaceholder}>
      <View style={[styles.block, styles.park]} />
      <View style={[styles.block, styles.water]} />
      <View style={styles.roadH} />
      <View style={styles.roadV} />
      <Text style={styles.mapLabel}>Mapa disponível no app (Android/iOS)</Text>
      {occurrences.slice(0, MARKERS.length).map((occurrence, index) => (
        <Pressable
          key={occurrence.id}
          onPress={() => onSelect(occurrence.id)}
          accessibilityLabel={occurrence.title}
          style={[styles.webPin, MARKERS[index]]}
        >
          <CategoryBadge name={occurrence.category.name} size={36} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  webPin: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: "#F97216",
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
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
});
