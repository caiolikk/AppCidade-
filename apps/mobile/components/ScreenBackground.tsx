import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";
import { backgroundGradient } from "../theme";

/** Figma: fundo das telas principais — #FAFAFA até 60% e depois #E3FCE4. */
export function ScreenBackground() {
  return (
    <LinearGradient
      colors={backgroundGradient.colors}
      locations={backgroundGradient.locations}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
}
