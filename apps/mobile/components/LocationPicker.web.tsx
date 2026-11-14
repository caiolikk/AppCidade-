import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

export type Coords = { latitude: number; longitude: number };

type LocationPickerProps = {
  value: Coords | null;
  onChange: (coords: Coords) => void;
};

/** Na web não há react-native-maps: o local vem só do GPS do navegador (ver MapCanvas.web). */
export function LocationPicker({ value }: LocationPickerProps) {
  return (
    <View style={styles.box}>
      <Text style={styles.text}>
        {value
          ? "Seleção no mapa disponível apenas no app (Android/iOS)."
          : "Aguardando a localização do navegador…"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    height: 80,
    borderRadius: 16,
    backgroundColor: colors.grid,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  text: {
    color: colors.muted,
    fontSize: 13,
    textAlign: "center",
  },
});
