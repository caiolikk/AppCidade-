import { StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";
import type { PublicOccurrence } from "../lib/types";
import { statusColors } from "../theme";

const SANTOS_REGION = {
  latitude: -23.9618,
  longitude: -46.3333,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

type MapCanvasProps = {
  occurrences: PublicOccurrence[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function MapCanvas({ occurrences, selectedId, onSelect }: MapCanvasProps) {
  return (
    <MapView style={StyleSheet.absoluteFill} initialRegion={SANTOS_REGION}>
      {occurrences.map((item) => (
        <Marker
          key={item.id}
          coordinate={{
            latitude: Number(item.latitude),
            longitude: Number(item.longitude),
          }}
          pinColor={selectedId === item.id ? "#153A6B" : statusColors[item.status]}
          onPress={() => onSelect(item.id)}
        />
      ))}
    </MapView>
  );
}
