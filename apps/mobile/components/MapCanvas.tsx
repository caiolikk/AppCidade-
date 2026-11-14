import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";
import type { UserPosition } from "../hooks/use-user-location";
import { PIN_IMAGES } from "../lib/pin-images";
import type { OccurrenceStatus, PublicOccurrence } from "../lib/types";
import { colors, statusVisual, statusVisualColors } from "../theme";

/** Bitmap pré-renderizado do pin (scripts/generate-pins.ps1) ou null se a categoria não tiver. */
function pinImageFor(category: string, status: OccurrenceStatus, selected: boolean) {
  const slug = category
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
  return PIN_IMAGES[`${slug}/${statusVisual[status]}${selected ? "-sel" : ""}`] ?? null;
}

const SANTOS_REGION = {
  latitude: -23.9618,
  longitude: -46.3333,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

/** Zoom de "rua" usado ao centralizar no usuário ou numa ocorrência. */
const STREET_DELTA = 0.01;

type MapCanvasProps = {
  occurrences: PublicOccurrence[];
  selectedId: string | null;
  /** Toque num pin (a tela abre o modal de detalhes). */
  onSelect: (id: string) => void;
  /** Ocorrência para centralizar ("Ver no mapa" ou recém-criada). */
  focusId?: string | null;
  /** Muda a cada pedido de foco: refaz a animação mesmo para a mesma ocorrência. */
  focusKey?: string | number | null;
  /** Posição do usuário (null = sem permissão/GPS: nada é desenhado). */
  userPosition?: UserPosition | null;
  /** Direção a desenhar no indicador (heading da bússola ou course em movimento); null = sem cone. */
  userDirection?: number | null;
  /** Mapa acompanhando o usuário. */
  following?: boolean;
  /** Incrementa para recentralizar (botão). */
  recenterKey?: number;
  /** O usuário arrastou o mapa (a tela para de seguir). */
  onUserGesture?: () => void;
};

export function MapCanvas({
  occurrences,
  selectedId,
  onSelect,
  focusId,
  focusKey = null,
  userPosition,
  userDirection = null,
  following = false,
  recenterKey = 0,
  onUserGesture,
}: MapCanvasProps) {
  const mapRef = useRef<MapView>(null);
  const lastFocused = useRef<string | null>(null);
  const zoomedToUser = useRef(false);
  // Animações de câmera antes do onMapReady são descartadas pelo mapa nativo.
  const [mapReady, setMapReady] = useState(false);

  // Centraliza na ocorrência em foco. Cada pedido (id + focusKey) anima uma vez,
  // só depois de o mapa estar pronto e a ocorrência estar na lista.
  useEffect(() => {
    const request = focusId ? `${focusId}:${focusKey ?? ""}` : null;
    if (!request || !mapReady || lastFocused.current === request) {
      return;
    }
    const target = occurrences.find((item) => item.id === focusId);
    if (!target) {
      return; // ainda carregando: tenta de novo quando a lista chegar
    }
    lastFocused.current = request;
    mapRef.current?.animateToRegion(
      {
        latitude: Number(target.latitude),
        longitude: Number(target.longitude),
        latitudeDelta: STREET_DELTA,
        longitudeDelta: STREET_DELTA,
      },
      600,
    );
  }, [focusId, focusKey, occurrences, mapReady]);

  // Recentralizar (botão): volta ao zoom de rua sobre o usuário.
  useEffect(() => {
    if (recenterKey > 0) {
      zoomedToUser.current = false;
    }
  }, [recenterKey]);

  // Seguir o usuário: 1ª vez ajusta o zoom; depois só move o centro (mantém o zoom escolhido).
  useEffect(() => {
    if (!following || !userPosition || !mapReady) {
      return;
    }
    const center = { latitude: userPosition.latitude, longitude: userPosition.longitude };
    if (!zoomedToUser.current) {
      zoomedToUser.current = true;
      mapRef.current?.animateToRegion(
        { ...center, latitudeDelta: STREET_DELTA, longitudeDelta: STREET_DELTA },
        600,
      );
    } else {
      mapRef.current?.animateCamera({ center }, { duration: 500 });
    }
  }, [following, userPosition?.latitude, userPosition?.longitude, recenterKey, mapReady]);

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={SANTOS_REGION}
      onMapReady={() => setMapReady(true)}
      onPanDrag={onUserGesture}
      showsCompass={false}
      toolbarEnabled={false}
    >
      {userPosition?.accuracy && userPosition.accuracy < 500 ? (
        <Circle
          center={userPosition}
          radius={userPosition.accuracy}
          fillColor="rgba(13,58,159,0.12)"
          strokeColor="rgba(13,58,159,0.35)"
          strokeWidth={1}
          zIndex={1}
        />
      ) : null}

      {occurrences.map((item) => (
        <OccurrencePin
          key={item.id}
          occurrence={item}
          selected={selectedId === item.id}
          onPress={() => onSelect(item.id)}
        />
      ))}

      {userPosition ? (
        <UserLocationMarker position={userPosition} direction={userDirection} />
      ) : null}
    </MapView>
  );
}

/**
 * Pin estilo Waze (referência do usuário), com a identidade do Cidade+: anel na cor do status
 * (linguagem das bolinhas do Figma), ilustração da categoria e cauda apontando para o local.
 *
 * Usa BITMAP pré-renderizado (`image`), e não uma View filha: no Android o react-native-maps
 * transforma Views filhas em snapshot, e o snapshot saía do tamanho errado (pin cortado, só o
 * quadrante superior esquerdo). Com `image` o desenho é nativo, inteiro e com a densidade
 * certa (@2x/@3x). A ponta da cauda é a base do bitmap → anchor (0.5, 1) = coordenada exata.
 */
function OccurrencePin({
  occurrence,
  selected,
  onPress,
}: {
  occurrence: PublicOccurrence;
  selected: boolean;
  onPress: () => void;
}) {
  const image = pinImageFor(occurrence.category.name, occurrence.status, selected);
  const coordinate = {
    latitude: Number(occurrence.latitude),
    longitude: Number(occurrence.longitude),
  };
  const handlePress = (event: { stopPropagation?: () => void }) => {
    event.stopPropagation?.();
    onPress();
  };
  const label = `${occurrence.category.name}: ${occurrence.title}`;

  if (!image) {
    // Categoria sem ilustração: pin nativo na cor do status (nenhuma fica sem marcador).
    return (
      <Marker
        coordinate={coordinate}
        pinColor={statusVisualColors[statusVisual[occurrence.status]].dot}
        onPress={handlePress}
        zIndex={selected ? 20 : 10}
        accessibilityLabel={label}
      />
    );
  }

  return (
    <Marker
      coordinate={coordinate}
      image={image}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={false}
      onPress={handlePress}
      zIndex={selected ? 20 : 10}
      accessibilityLabel={label}
    />
  );
}

/**
 * Indicador do usuário: ponto azul com borda branca e, se houver direção confiável, um cone.
 * `flat` + `rotation` = o cone aponta para o rumo geográfico mesmo com o mapa girado.
 */
function UserLocationMarker({
  position,
  direction,
}: {
  position: UserPosition;
  direction: number | null;
}) {
  const hasDirection = direction !== null;
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    setTracks(true);
    const timer = setTimeout(() => setTracks(false), 500);
    return () => clearTimeout(timer);
  }, [hasDirection]);

  return (
    <Marker
      coordinate={{ latitude: position.latitude, longitude: position.longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
      flat
      rotation={direction ?? 0}
      tracksViewChanges={tracks}
      zIndex={30}
      tappable={false}
      accessibilityLabel="Sua localização"
    >
      <View style={styles.userWrap}>
        {hasDirection ? <View style={styles.userCone} /> : null}
        <View style={styles.userDot} />
      </View>
    </Marker>
  );
}

const USER_SIZE = 44;

const styles = StyleSheet.create({
  userWrap: {
    width: USER_SIZE,
    height: USER_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  userCone: {
    position: "absolute",
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 18,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "rgba(13,58,159,0.75)",
  },
  userDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.locationBlue,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
});
