import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import MapView, { Circle, Marker, type Region } from "react-native-maps";
import type { UserPosition } from "../hooks/use-user-location";
import {
  SELECTED_PIN_SIZE,
  markerSize,
  nextMarkerScale,
  pinHeight,
  zoomFromRegion,
  type MarkerScale,
} from "../lib/map-markers";
import { MARKER_IMAGES } from "../lib/pin-images";
import type { PublicOccurrence } from "../lib/types";
import { colors, statusVisual, statusVisualColors } from "../theme";

const SANTOS_REGION = {
  latitude: -23.9618,
  longitude: -46.3333,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

/** Zoom de "rua" usado ao centralizar no usuário ou numa ocorrência. */
const STREET_DELTA = 0.01;

/** Durante o gesto, o zoom é reavaliado no máximo uma vez a cada X ms (o resto é descartado). */
const REGION_THROTTLE_MS = 120;

function categorySlug(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * `anchor` vale no Google Maps (Android); no Apple Maps (iOS) vale `centerOffset` (pontos).
 * Pin com cauda: a ponta é a base do bitmap (altura lógica = `pinHeight(d)`, generate-pins.ps1).
 */
type MarkerLook = {
  image: number | null;
  anchor: { x: number; y: number };
  centerOffset: { x: number; y: number };
};

const CENTER = { x: 0.5, y: 0.5 };
const TAIL = { x: 0.5, y: 1 }; // ponta da cauda = coordenada exata
const NO_OFFSET = { x: 0, y: 0 };
const tailOffsets = new Map<number, { x: number; y: number }>();
function tailOffset(diameter: number) {
  let offset = tailOffsets.get(diameter);
  if (!offset) {
    offset = { x: 0, y: -pinHeight(diameter) / 2 };
    tailOffsets.set(diameter, offset);
  }
  return offset;
}

/**
 * Bitmap do marcador para o formato/tamanho atual (scripts/generate-pins.ps1, D-027):
 * ícone da categoria (pin) na maior parte dos zooms, bolinha do status só bem afastado.
 * O selecionado é sempre o pin grande. `image: null` = categoria sem ilustração (cai no pin
 * nativo na cor do status).
 */
function markerLook(occurrence: PublicOccurrence, scale: MarkerScale, selected: boolean): MarkerLook {
  const visual = statusVisual[occurrence.status];
  const slug = categorySlug(occurrence.category.name);
  if (selected) {
    return { image: MARKER_IMAGES[`pin/${slug}/${visual}/sel`] ?? null, anchor: TAIL, centerOffset: tailOffset(SELECTED_PIN_SIZE) };
  }
  const size = markerSize(scale);
  if (scale.level === "dot") {
    return { image: MARKER_IMAGES[`dot/${visual}/${size}`] ?? null, anchor: CENTER, centerOffset: NO_OFFSET };
  }
  return { image: MARKER_IMAGES[`pin/${slug}/${visual}/${size}`] ?? null, anchor: TAIL, centerOffset: tailOffset(size) };
}

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

  // --- Zoom → formato/tamanho (D-027) ---------------------------------------------------
  const screen = useWindowDimensions();
  const [mapWidth, setMapWidth] = useState(screen.width);
  const [scale, setScale] = useState<MarkerScale>(() =>
    nextMarkerScale(zoomFromRegion(SANTOS_REGION.longitudeDelta, screen.width)),
  );
  const scaleRef = useRef(scale);
  const lastRegionRun = useRef(0);

  /** Só muda estado quando o formato ou o degrau de tamanho mudam (o pan não custa nada). */
  const applyRegion = useCallback(
    (region: Region) => {
      const next = nextMarkerScale(zoomFromRegion(region.longitudeDelta, mapWidth), scaleRef.current);
      if (next.level !== scaleRef.current.level || next.step !== scaleRef.current.step) {
        scaleRef.current = next;
        setScale(next);
      }
    },
    [mapWidth],
  );

  const onRegionChange = useCallback(
    (region: Region) => {
      const now = Date.now();
      if (now - lastRegionRun.current < REGION_THROTTLE_MS) return;
      lastRegionRun.current = now;
      applyRegion(region);
    },
    [applyRegion],
  );

  // Um marcador por ocorrência, SEM agrupamento (D-027). Ordem por data: em sobreposição, a
  // mais recente fica por cima. O selecionado é desenhado à parte, acima de todos.
  const ordered = useMemo(
    () =>
      occurrences
        .filter((item) => item.id !== selectedId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [occurrences, selectedId],
  );
  const selected = selectedId ? occurrences.find((item) => item.id === selectedId) ?? null : null;

  // Callback estável para os marcadores memoizados não re-renderizarem à toa.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const selectById = useCallback((id: string) => onSelectRef.current(id), []);

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
    <View style={StyleSheet.absoluteFill} onLayout={(event) => setMapWidth(event.nativeEvent.layout.width)}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={SANTOS_REGION}
        onMapReady={() => setMapReady(true)}
        onPanDrag={onUserGesture}
        onRegionChange={onRegionChange}
        onRegionChangeComplete={applyRegion}
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

        {ordered.map((occurrence) => (
          <OccurrenceMarker
            key={occurrence.id}
            occurrence={occurrence}
            look={markerLook(occurrence, scale, false)}
            selected={false}
            onSelect={selectById}
          />
        ))}

        {selected ? (
          <OccurrenceMarker
            key={`selected:${selected.id}`}
            occurrence={selected}
            look={markerLook(selected, scale, true)}
            selected
            onSelect={selectById}
          />
        ) : null}

        {userPosition ? (
          <UserLocationMarker position={userPosition} direction={userDirection} />
        ) : null}
      </MapView>

    </View>
  );
}

/**
 * Marcador de UMA ocorrência (identificada pelo id real). Usa BITMAP (`image`), e não uma
 * View filha: no Android o snapshot de View saía cortado (P-013). Memoizado: só re-renderiza
 * quando a aparência (bitmap) ou a ocorrência mudam — ou seja, quando muda o degrau de zoom.
 */
const OccurrenceMarker = memo(function OccurrenceMarker({
  occurrence,
  look,
  selected,
  onSelect,
}: {
  occurrence: PublicOccurrence;
  look: MarkerLook;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const coordinate = {
    latitude: Number(occurrence.latitude),
    longitude: Number(occurrence.longitude),
  };
  const handlePress = (event: { stopPropagation?: () => void }) => {
    event.stopPropagation?.();
    onSelect(occurrence.id);
  };
  const label = `${occurrence.category.name}: ${occurrence.title}`;

  if (!look.image) {
    // Categoria sem ilustração: pin nativo na cor do status (nenhuma fica sem marcador).
    return (
      <Marker
        coordinate={coordinate}
        pinColor={statusVisualColors[statusVisual[occurrence.status]].dot}
        onPress={handlePress}
        zIndex={selected ? 40 : 10}
        accessibilityLabel={label}
      />
    );
  }

  return (
    <Marker
      coordinate={coordinate}
      image={look.image}
      anchor={look.anchor}
      centerOffset={look.centerOffset}
      tracksViewChanges={false}
      onPress={handlePress}
      zIndex={selected ? 40 : 10}
      accessibilityLabel={label}
    />
  );
}, sameMarker);

function sameMarker(
  a: { occurrence: PublicOccurrence; look: MarkerLook; selected: boolean },
  b: { occurrence: PublicOccurrence; look: MarkerLook; selected: boolean },
) {
  return (
    a.occurrence === b.occurrence &&
    a.selected === b.selected &&
    a.look.image === b.look.image &&
    a.look.anchor === b.look.anchor
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
