import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatReportedAgo } from "../lib/format";
import type { PublicOccurrence } from "../lib/types";
import { colors } from "../theme";
import { StatusDot, StatusPill } from "./StatusPill";

/**
 * Figma "Minhas Ocorrências" (Minha Conta): bolinha de status, título 16 (1 linha),
 * "Categoria • há X" e pílula de status. Usada no perfil e na lista de um grupo do mapa.
 */
export function OccurrenceListRow({
  occurrence,
  onPress,
}: {
  occurrence: PublicOccurrence;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${occurrence.title}, ${occurrence.category.name}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <StatusDot status={occurrence.status} />
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {occurrence.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {occurrence.category.name} • há {formatReportedAgo(occurrence.createdAt)}
        </Text>
      </View>
      <StatusPill status={occurrence.status} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  pressed: {
    opacity: 0.6,
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 19,
    fontWeight: "600",
  },
  meta: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 14,
  },
});
