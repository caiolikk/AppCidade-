import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import RingIdle from "../assets/figma/category-ring.svg";
import RingSelected from "../assets/figma/category-ring-selected.svg";
import { getCategoryArt } from "../lib/category-art";
import { colors } from "../theme";

type CategoryIconProps = {
  name: string;
  selected: boolean;
  /** Outra categoria está selecionada: esta fica esmaecida (Figma: opacidade 50%). */
  dimmed: boolean;
  onPress: () => void;
};

/** Figma: botão de categoria 80×98 — círculo com anel, ilustração e rótulo 12. */
export function CategoryIcon({ name, selected, dimmed, onPress }: CategoryIconProps) {
  const art = getCategoryArt(name);
  const Ring = selected ? RingSelected : RingIdle;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={name}
      style={({ pressed }) => [styles.button, dimmed && styles.dimmed, pressed && styles.pressed]}
    >
      <View style={styles.circle}>
        <Ring width={80} height={80} style={StyleSheet.absoluteFill} />
        {art ? (
          <View style={styles.artBox}>
            <Image
              source={art.source}
              resizeMode="cover"
              style={[styles.art, art.crop]}
            />
          </View>
        ) : null}
      </View>
      <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
        {name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 80,
    height: 98,
    alignItems: "center",
  },
  dimmed: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.7,
  },
  circle: {
    width: 80,
    height: 80,
  },
  artBox: {
    position: "absolute",
    top: 3,
    left: 3,
    width: 74,
    height: 74,
    borderRadius: 37,
    overflow: "hidden",
  },
  art: {
    position: "absolute",
  },
  label: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 15,
    textAlign: "center",
    width: 90,
  },
  labelSelected: {
    color: colors.primary,
    fontWeight: "600",
  },
});
