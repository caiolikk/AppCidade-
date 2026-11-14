import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { getCategoryArt } from "../lib/category-art";
import { colors } from "../theme";

type CategoryBadgeProps = {
  name: string;
  /** Lado do quadro (px). */
  size: number;
  /** "circle" (pin) ou "rounded" (lista, Figma: fundo arredondado raio 10). */
  shape?: "circle" | "rounded";
  backgroundColor?: string;
  /** Avisa quando a imagem terminou de carregar (o pin do mapa usa para congelar o snapshot). */
  onLoad?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Ícone pequeno de categoria: a ilustração do Figma (versão 256px) recortada no quadro.
 * Categoria sem ilustração → inicial do nome, para que nenhuma fique sem representação.
 */
export function CategoryBadge({
  name,
  size,
  shape = "circle",
  backgroundColor = colors.background,
  onLoad,
  style,
}: CategoryBadgeProps) {
  const art = getCategoryArt(name);
  const radius = shape === "circle" ? size / 2 : 10;

  return (
    <View
      style={[styles.box, { width: size, height: size, borderRadius: radius, backgroundColor }, style]}
      accessibilityLabel={name}
    >
      {art ? (
        <Image
          source={art.small}
          resizeMode="cover"
          onLoad={onLoad}
          style={[styles.art, art.crop]}
          fadeDuration={0}
        />
      ) : (
        <Text style={[styles.initial, { fontSize: size * 0.42 }]} onLayout={onLoad}>
          {name.trim().charAt(0).toUpperCase() || "?"}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  art: {
    position: "absolute",
  },
  initial: {
    color: colors.text,
    fontWeight: "700",
  },
});
