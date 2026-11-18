import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import MapView, { Circle, Marker, Polyline, type Region } from "react-native-maps";
import type { UserPosition } from "../hooks/use-user-location";
import {
  MARKER_SIZES,
  SELECTED_PIN_SIZE,
  markerSize,
  nextMarkerScale,
  pinHeight,
  project,
  quantizeZoom,
  spreadOffsets,
  unproject,
  zoomFromRegion,
  type MarkerScale,
  type SpreadOffset,
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
const NO_OFFSET = { x: 0, y: 0 };
const NO_SPREAD: SpreadOffset = { dx: 0, dy: 0 };
/** Maior bolinha: o selecionado no nível "dot" (D-031). */
const SELECTED_DOT_SIZE = Math.max(...MARKER_SIZES.dot.sizes);

/**
 * Âncora de um pin de diâmetro `d` (bitmap (d+6) × pinHeight(d), ponta da cauda na base),
 * deslocado `spread` dp na tela pelo leque (D-031). Sem leque, a ponta fica na coordenada.
 */
function pinAnchor(d: number, spread: SpreadOffset) {
  const width = d + 6;
  const height = pinHeight(d);
  return {
    anchor: { x: 0.5 - spread.dx / width, y: 1 - spread.dy / height },
    centerOffset: { x: spread.dx, y: -height / 2 + spread.dy },
  };
}

/**
 * Bitmap do marcador para o formato/tamanho atual (scripts/generate-pins.ps1, D-027/D-031):
 * ícone da categoria (pin) na maior parte dos zooms, bolinha do status só bem afastado — o
 * selecionado TAMBÉM segue o nível (antes ficava pin grande em qualquer zoom: era o bug da
 * "ocorrência que não vira bolinha"). `image: null` = sem bitmap (pin nativo na cor do status).
 */
function markerLook(
  occurrence: PublicOccurrence,
  scale: MarkerScale,
  selected: boolean,
  spread: SpreadOffset,
): MarkerLook {
  const visual = statusVisual[occurrence.status];
  const slug = categorySlug(occurrence.category.name);
  if (scale.level === "dot") {
    const size = selected ? SELECTED_DOT_SIZE : markerSize(scale);
    return { image: MARKER_IMAGES[`dot/${visual}/${size}`] ?? null, anchor: CENTER, centerOffset: NO_OFFSET };
  }
  const size = selected ? SELECTED_PIN_SIZE : markerSize(scale);
  const key = selected ? `pin/${slug}/${visual}/sel` : `pin/${slug}/${visual}/${size}`;
  return { image: MARKER_IMAGES[key] ?? null, ...pinAnchor(size, spread) };
}

export type SearchTarget = {
  latitude: number;
  longitude: number;
  /** Rótulo do endereço encontrado (aparece ao tocar no marcador). */
  label: string;
  /** Muda a cada busca: refaz a animação mesmo para o mesmo ponto. */
  key: number;
};

type MapCanvasProps = {
  occurrences: PublicOccurrence[];
  selectedId: string | null;
  /** Toque num pin (a tela abre o modal de detalhes). */
  onSelect: (id: string) => void;
  /** Ocorrência para centralizar ("Ver no mapa" ou recém-criada). */
  focusId?: string | null;
  /** Muda a cada pedido de foco: refaz a animação mesmo para a mesma ocorrência. */
  focusKey?: string | number | null;
  /** Posição do usuário (null = sem permissão/GPS: nada é desenhado). Sem direção (D-030). */
  userPosition?: UserPosition | null;
  /** Resultado da busca de endereço: o mapa anima até ele e mostra um marcador (D-030). */
  searchTarget?: SearchTarget | null;
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
  searchTarget = null,
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
  // Zoom quantizado (0,25): o leque só é recalculado quando ele muda (D-031).
  const [spreadZoom, setSpreadZoom] = useState(() =>
    quantizeZoom(zoomFromRegion(SANTOS_REGION.longitudeDelta, screen.width)),
  );

  /** Só muda estado quando o formato, o degrau ou o zoom quantizado mudam (o pan não custa nada). */
  const applyRegion = useCallback(
    (region: Region) => {
      const zoom = zoomFromRegion(region.longitudeDelta, mapWidth);
      const next = nextMarkerScale(zoom, scaleRef.current);
      if (next.level !== scaleRef.current.level || next.step !== scaleRef.current.step) {
        scaleRef.current = next;
        setScale(next);
      }
      const quantized = quantizeZoom(zoom);
      setSpreadZoom((current) => (current === quantized ? current : quantized));
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

  // Um marcador por ocorrência, SEM agrupamento (D-027). Ordem por data, mais recente por
  // cima, com zIndex ÚNICO por marcador (D-031): com zIndex empatado o Google Maps não
  // garante quem fica por cima e a ordem mudava a cada troca de imagem ("disputa").
  const ordered = useMemo(
    () => [...occurrences].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || (a.id < b.id ? -1 : 1)),
    [occurrences],
  );
  const topZ = ordered.length + 10; // acima de todas as ocorrências
  const selected = selectedId ? ordered.find((item) => item.id === selectedId) ?? null : null;

  // Leque visual (D-031): só no nível "pin"; recalculado na troca de degrau/zoom quantizado.
  const pinSize = markerSize(scale);
  const offsets = useMemo(() => {
    if (scale.level !== "pin") return new Map<string, SpreadOffset>();
    return spreadOffsets(
      ordered.map((item, index) => ({
        id: item.id,
        latitude: Number(item.latitude),
        longitude: Number(item.longitude),
        order: index,
      })),
      spreadZoom,
      pinSize,
    );
  }, [ordered, scale.level, pinSize, spreadZoom]);

  // Linhas finas da ponta deslocada até a posição real (só para quem está em leque).
  const leaderLines = useMemo(
    () =>
      ordered.flatMap((item) => {
        const spread = offsets.get(item.id);
        if (!spread) return [];
        const real = { latitude: Number(item.latitude), longitude: Number(item.longitude) };
        const xy = project(real.latitude, real.longitude, spreadZoom);
        return [{ id: item.id, coordinates: [real, unproject(xy.x + spread.dx, xy.y + spread.dy, spreadZoom)] }];
      }),
    [ordered, offsets, spreadZoom],
  );

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

  // Busca de endereço: anima até o ponto encontrado (uma vez por busca, depois do mapa pronto).
  const lastSearch = useRef<number | null>(null);
  useEffect(() => {
    if (!searchTarget || !mapReady || lastSearch.current === searchTarget.key) {
      return;
    }
    lastSearch.current = searchTarget.key;
    mapRef.current?.animateToRegion(
      {
        latitude: searchTarget.latitude,
        longitude: searchTarget.longitude,
        latitudeDelta: STREET_DELTA,
        longitudeDelta: STREET_DELTA,
      },
      600,
    );
  }, [searchTarget, mapReady]);

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
            zIndex={0}
          />
        ) : null}

        {leaderLines.map((line) => (
          <Polyline
            key={`leader:${line.id}`}
            coordinates={line.coordinates}
            strokeColor="rgba(13,13,13,0.45)"
            strokeWidth={1.5}
            zIndex={0}
            tappable={false}
          />
        ))}

        {ordered.map((occurrence, index) => {
          const isSelected = occurrence.id === selectedId;
          return (
            <OccurrenceMarker
              // O formato entra na key: trocar pin ↔ bolinha REMONTA o marcador, e o Android
              // aplica imagem e âncora novas juntas (antes alguns ficavam como pin, D-031).
              key={`${occurrence.id}:${scale.level}${isSelected ? ":sel" : ""}`}
              occurrence={occurrence}
              look={markerLook(occurrence, scale, isSelected, offsets.get(occurrence.id) ?? NO_SPREAD)}
              zIndex={isSelected ? topZ + 3 : index + 1}
              onSelect={selectById}
            />
          );
        })}

        {searchTarget ? (
          // Pin nativo, sem View filha (P-013): nada para cortar no Android.
          <Marker
            key={`search:${searchTarget.key}`}
            coordinate={{ latitude: searchTarget.latitude, longitude: searchTarget.longitude }}
            title={searchTarget.label}
            pinColor={colors.text}
            zIndex={topZ + 2}
            accessibilityLabel={`Endereço buscado: ${searchTarget.label}`}
          />
        ) : null}

        {userPosition ? <UserLocationMarker position={userPosition} zIndex={topZ + 1} /> : null}
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
  zIndex,
  onSelect,
}: {
  occurrence: PublicOccurrence;
  look: MarkerLook;
  /** Único por marcador (ordem de criação); o selecionado fica acima de todos. */
  zIndex: number;
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
        zIndex={zIndex}
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
      zIndex={zIndex}
      accessibilityLabel={label}
    />
  );
}, sameMarker);

/** Compara por VALOR (a aparência é recriada a cada render): só re-renderiza se algo mudou. */
function sameMarker(
  a: { occurrence: PublicOccurrence; look: MarkerLook; zIndex: number },
  b: { occurrence: PublicOccurrence; look: MarkerLook; zIndex: number },
) {
  return (
    a.occurrence === b.occurrence &&
    a.zIndex === b.zIndex &&
    a.look.image === b.look.image &&
    a.look.anchor.x === b.look.anchor.x &&
    a.look.anchor.y === b.look.anchor.y &&
    a.look.centerOffset.x === b.look.centerOffset.x &&
    a.look.centerOffset.y === b.look.centerOffset.y
  );
}

/**
 * Indicador do usuário: só o ponto azul com borda branca (a precisão é o `Circle` do mapa).
 * Sem seta/cone de direção: o app não é de navegação (D-030). O snapshot da View é gerado
 * uma vez (tracksViewChanges só nos primeiros 500 ms) para não redesenhar à toa.
 */
function UserLocationMarker({ position, zIndex }: { position: UserPosition; zIndex: number }) {
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setTracks(false), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Marker
      coordinate={{ latitude: position.latitude, longitude: position.longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracks}
      zIndex={zIndex}
      tappable={false}
      accessibilityLabel="Sua localização"
    >
      <View style={styles.userWrap}>
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
