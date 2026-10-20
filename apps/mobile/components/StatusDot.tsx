import React from "react";
import { StyleSheet, View } from "react-native";
import {
  STATUS_CONFIG,
  type OccurrenceStatusType,
} from "../theme";

type StatusDotProps = {
  status: OccurrenceStatusType | string;
  size?: number;
};

export function StatusDot({ status, size = 10 }: StatusDotProps) {
  const config =
    STATUS_CONFIG[status as OccurrenceStatusType] ?? STATUS_CONFIG.REPORTADA;

  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: config.dotColor,
        },
      ]}
      accessibilityLabel={`Status: ${config.label}`}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
});
