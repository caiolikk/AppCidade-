import { useRouter } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import BackArrow from "../assets/figma/map-search-back.svg";

/**
 * Voltar para telas empilhadas (ex.: detalhe). Usa a seta visível do Figma (busca do mapa):
 * o componente "Voltar" do Figma está com opacidade 0 no design (é só área de toque).
 */
export function BackButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <BackArrow width={16} height={16} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.6,
  },
});
