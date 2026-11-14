import { StyleSheet, Text, View } from "react-native";
import type { OccurrenceCardModel } from "../lib/format";
import { colors, softShadow } from "../theme";
import { StatusDot, StatusPill } from "./StatusPill";

type OccurrenceSummaryCardProps = {
  occurrence: OccurrenceCardModel;
  /** Versão flutuante (mapa): fundo com sombra e largura fixa. */
  compact?: boolean;
};

/**
 * Figma: linha "Ocorrências" (Minha Conta / Notificações) — bolinha de status, título
 * semibold 16, "Categoria • há X" 12 e pílula de status.
 */
export function OccurrenceSummaryCard({ occurrence, compact = false }: OccurrenceSummaryCardProps) {
  return (
    <View style={[styles.row, compact && [styles.floating, softShadow]]}>
      <StatusDot status={occurrence.status} />
      <View style={styles.texts}>
        <Text style={styles.title} numberOfLines={1}>
          {occurrence.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {occurrence.category} • há {occurrence.reportedAgo}
        </Text>
      </View>
      <StatusPill status={occurrence.status} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    padding: 15,
  },
  floating: {
    width: 320,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: colors.background,
  },
  texts: {
    flex: 1,
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
