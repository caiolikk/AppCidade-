import { StyleSheet, Text, View, type DimensionValue } from "react-native";
import { colors } from "../theme";
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
};

export function MapCanvas({ occurrences }: MapCanvasProps) {
  return (
    <View style={styles.mapPlaceholder}>
      <View style={[styles.block, styles.park]} />
      <View style={[styles.block, styles.water]} />
      <View style={styles.roadH} />
      <View style={styles.roadV} />
      <Text style={styles.mapLabel}>Mapa nativo no Expo Go</Text>
      <View style={styles.userPulse} />
      <View style={styles.userDot} />
      {MARKERS.slice(0, Math.max(occurrences.length, 1)).map((marker, index) => (
        <View key={index} style={[styles.marker, marker]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
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
