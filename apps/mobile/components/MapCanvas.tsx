import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, {
  Marker,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
  UrlTile,
} from "react-native-maps";
import type { PublicOccurrence } from "../lib/types";
import { colors, statusColors } from "../theme";

const SANTOS_REGION = {
  latitude: -23.9618,
  longitude: -46.3333,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// Token do Mapbox configurado via .env (EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN)
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

// Estilo streets-v12 do Mapbox (referência técnica direta do WWork)
const MAPBOX_TILES_URL = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`;

// Servidor de tiles secundário (fallback CartoDB Voyager / OSM)
const CARTO_VOYAGER_URL =
  "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png";

type MapCanvasProps = {
  occurrences: PublicOccurrence[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function MapCanvas({ occurrences, selectedId, onSelect }: MapCanvasProps) {
  const mapRef = useRef<MapView | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [hasMapError, setHasMapError] = useState(false);
  const lastFramedSignature = useRef<string>("");

  const hasGoogleApiKey = Boolean(
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY,
  );

  // Filtragem defensiva de coordenadas válidas (referência técnica do WWork)
  const validOccurrences = useMemo(() => {
    return occurrences.filter((item) => {
      const lat = Number(item.latitude);
      const lng = Number(item.longitude);
      return (
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180 &&
        (lat !== 0 || lng !== 0)
      );
    });
  }, [occurrences]);

  // Enquadramento automático da câmera para conter os markers (padrão fitBounds do WWork)
  useEffect(() => {
    if (!mapReady || !mapRef.current || validOccurrences.length === 0) {
      return;
    }

    const signature = validOccurrences
      .map((item) => `${item.id}:${item.latitude}:${item.longitude}`)
      .join("|");

    if (signature === lastFramedSignature.current) {
      return;
    }
    lastFramedSignature.current = signature;

    if (validOccurrences.length === 1) {
      const single = validOccurrences[0];
      mapRef.current.animateToRegion(
        {
          latitude: Number(single.latitude),
          longitude: Number(single.longitude),
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        },
        500,
      );
    } else {
      const coordinates = validOccurrences.map((item) => ({
        latitude: Number(item.latitude),
        longitude: Number(item.longitude),
      }));

      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 140, right: 60, bottom: 220, left: 60 },
        animated: true,
      });
    }
  }, [validOccurrences, mapReady]);

  // No iOS: Apple Maps nativo (PROVIDER_DEFAULT). No Android: PROVIDER_GOOGLE.
  const provider = Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

  // No Android, quando usando os tiles do Mapbox, usamos mapType="none" para que a camada
  // nativa não bloqueie a visualização nem gere fundo preto.
  const mapType =
    Platform.OS === "android" && !hasGoogleApiKey ? "none" : "standard";

  const activeTileUrl = MAPBOX_TOKEN ? MAPBOX_TILES_URL : CARTO_VOYAGER_URL;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={provider}
        mapType={mapType}
        initialRegion={SANTOS_REGION}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        onMapReady={() => {
          setMapReady(true);
        }}
        onMapLoaded={() => {
          setMapReady(true);
        }}
      >
        {/* Camada Mapbox Streets v12 (idêntica ao WWork) */}
        {(!hasGoogleApiKey || Platform.OS === "android") && (
          <UrlTile
            urlTemplate={activeTileUrl}
            maximumZ={19}
            flipY={false}
            zIndex={1}
            shouldReplaceMapContent={mapType === "none"}
          />
        )}

        {validOccurrences.map((item) => (
          <Marker
            key={item.id}
            coordinate={{
              latitude: Number(item.latitude),
              longitude: Number(item.longitude),
            }}
            pinColor={
              selectedId === item.id ? "#153A6B" : statusColors[item.status]
            }
            zIndex={selectedId === item.id ? 99 : 2}
            tracksViewChanges={false}
            onPress={() => onSelect(item.id)}
          />
        ))}
      </MapView>

      {/* Indicador de carregamento inicial (inspirado no MapStatus do WWork) */}
      {!mapReady && !hasMapError && (
        <View style={styles.statusOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.statusText}>Carregando mapa base...</Text>
        </View>
      )}

      {hasMapError && (
        <View style={styles.statusOverlay} pointerEvents="none">
          <Text style={styles.statusText}>
            Não foi possível carregar os dados do mapa. Verifique sua conexão.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    flex: 1,
    backgroundColor: "#E8E4D8",
  },
  map: {
    ...StyleSheet.absoluteFill,
    flex: 1,
    width: "100%",
    height: "100%",
  },
  statusOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(232, 228, 216, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    gap: 10,
  },
  statusText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
});
