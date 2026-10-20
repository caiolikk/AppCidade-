import { useRouter } from "expo-router";
import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import type { OccurrenceCardModel } from "../lib/format";
import { theme } from "../theme";
import { StatusDot } from "./StatusDot";

type OccurrencePhotoGridItemProps = {
  occurrence: OccurrenceCardModel;
  size: number;
};

export function OccurrencePhotoGridItem({
  occurrence,
  size,
}: OccurrencePhotoGridItemProps) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/occurrence/${occurrence.id}`)}
      style={[styles.container, { width: size, height: size }]}
      accessibilityRole="button"
      accessibilityLabel={`Ocorrência: ${occurrence.title}, status: ${occurrence.status}`}
    >
      {occurrence.thumbnailUrl ? (
        <Image
          source={{ uri: occurrence.thumbnailUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.placeholder} />
      )}
      <View style={styles.dotPosition}>
        <StatusDot status={occurrence.status} size={11} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.radius.md,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#D1D5DB",
  },
  dotPosition: {
    position: "absolute",
    right: 6,
    bottom: 6,
  },
});
