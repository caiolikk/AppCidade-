import { StyleSheet, Text, View } from "react-native";
import type { Occurrence } from "../data/mockOccurrences";
import { colors } from "../theme";

type OccurrenceSummaryCardProps = {
  occurrence: Occurrence;
  compact?: boolean;
};

export function OccurrenceSummaryCard({
  occurrence,
  compact = false,
}: OccurrenceSummaryCardProps) {
  return (
    <View style={[styles.card, compact && styles.compact]}>
      {compact ? null : <Text style={styles.kicker}>Resumo da Ocorrência</Text>}
      <Text style={styles.title} numberOfLines={2}>
        {occurrence.title} - {occurrence.address}
      </Text>
      <Text style={styles.meta}>
        Reportado há {occurrence.reportedAgo} - {occurrence.evaluations} avaliações
      </Text>
      <View style={styles.tags}>
        <View style={[styles.tag, styles.tagGrey]}>
          <Text style={styles.tagText}>{occurrence.category}</Text>
        </View>
        {occurrence.tag ? (
          <View style={[styles.tag, styles.tagYellow]}>
            <Text style={styles.tagText}>{occurrence.tag}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  compact: {
    width: 280,
    marginRight: 12,
  },
  kicker: {
    color: colors.subtitle,
    fontSize: 13,
    marginBottom: 6,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  meta: {
    color: colors.subtitle,
    fontSize: 13,
    marginBottom: 12,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagGrey: {
    backgroundColor: colors.tagGrey,
  },
  tagYellow: {
    backgroundColor: colors.tagYellow,
  },
  tagText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
});
