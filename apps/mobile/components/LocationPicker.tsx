import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { colors } from "../theme";

export type Coords = { latitude: number; longitude: number };

type LocationPickerProps = {
  value: Coords | null;
  onChange: (coords: Coords) => void;
};

const SANTOS_REGION = {
  latitude: -23.9618,
  longitude: -46.3333,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const POINT_DELTA = 0.005;

/** Mesmo arredondamento do GPS e do banco (Decimal(9,6)): o ponto mostrado é o ponto salvo. */
function round(coords: Coords): Coords {
  return {
    latitude: Number(coords.latitude.toFixed(6)),
    longitude: Number(coords.longitude.toFixed(6)),
  };
}

/** Mapa pequeno para conferir ou ajustar o local da ocorrência: toque no mapa ou arraste o pin. */
export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (value) {
      mapRef.current?.animateToRegion(
        { ...value, latitudeDelta: POINT_DELTA, longitudeDelta: POINT_DELTA },
        300,
      );
    }
  }, [value?.latitude, value?.longitude]);

  return (
    <View>
      <View style={styles.map}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={
            value
              ? { ...value, latitudeDelta: POINT_DELTA, longitudeDelta: POINT_DELTA }
              : SANTOS_REGION
          }
          onPress={(event) => onChange(round(event.nativeEvent.coordinate))}
        >
          {value ? (
            <Marker
              coordinate={value}
              draggable
              onDragEnd={(event) => onChange(round(event.nativeEvent.coordinate))}
            />
          ) : null}
        </MapView>
      </View>
      <Text style={styles.hint}>Toque no mapa ou arraste o pin para ajustar o local.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.grid,
  },
  hint: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 6,
  },
});
