import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  STATUS_CONFIG,
  theme,
  type OccurrenceStatusType,
} from "../theme";

type StatusBadgeProps = {
  status: OccurrenceStatusType | string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config =
    STATUS_CONFIG[status as OccurrenceStatusType] ?? STATUS_CONFIG.REPORTADA;

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.label, { color: config.textColor }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: theme.typography.size.badge,
    fontWeight: theme.typography.weight.semiBold,
  },
});
