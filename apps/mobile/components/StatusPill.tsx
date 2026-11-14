import { StyleSheet, Text, View } from "react-native";
import { STATUS_LABEL } from "../lib/format";
import type { OccurrenceStatus } from "../lib/types";
import { statusVisual, statusVisualColors } from "../theme";

/** Figma: "Status Ocorrência" — pílula de 20px, texto 12 na cor do status. Rótulo = status real. */
export function StatusPill({ status }: { status: OccurrenceStatus }) {
  const palette = statusVisualColors[statusVisual[status]];
  return (
    <View style={[styles.pill, { backgroundColor: palette.pill }]}>
      <Text style={[styles.text, { color: palette.text }]} numberOfLines={1}>
        {STATUS_LABEL[status]}
      </Text>
    </View>
  );
}

/** Figma: "Bullet - Status" — bolinha na cor do status. */
export function StatusDot({ status, size = 15 }: { status: OccurrenceStatus; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: statusVisualColors[statusVisual[status]].dot,
      }}
    />
  );
}

const styles = StyleSheet.create({
  pill: {
    minWidth: 96,
    height: 20,
    borderRadius: 30,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 12,
    lineHeight: 14,
  },
});
