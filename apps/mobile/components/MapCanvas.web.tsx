import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import type { PublicOccurrence } from "../lib/types";
import { statusColors } from "../theme";

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

type MapCanvasProps = {
  occurrences: PublicOccurrence[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function MapCanvas({ occurrences, selectedId, onSelect }: MapCanvasProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

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

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "OCCURRENCE_SELECTED") {
        onSelect(event.data.id);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [onSelect]);

  const htmlContent = useMemo(() => {
    const markersData = validOccurrences.map((item) => ({
      id: item.id,
      lat: Number(item.latitude),
      lng: Number(item.longitude),
      title: item.title,
      color: selectedId === item.id ? "#153A6B" : statusColors[item.status] || "#E24A4A",
      isSelected: selectedId === item.id,
    }));

    const tileUrl = MAPBOX_TOKEN
      ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
      : "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png";

    const attribution = MAPBOX_TOKEN
      ? '&copy; <a href="https://www.mapbox.com/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
      : '&copy; CartoDB &copy; OpenStreetMap';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background-color: #E8E4D8;
    }
    .custom-marker {
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .custom-pin {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 3px solid #ffffff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      transition: transform 0.2s;
    }
    .custom-pin.selected {
      transform: scale(1.35);
      border-color: #FFDE59;
      box-shadow: 0 4px 10px rgba(0,0,0,0.5);
    }
    .leaflet-control-attribution {
      font-size: 10px !important;
      background: rgba(255,255,255,0.7) !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = L.map('map', {
      zoomControl: false,
      attributionControl: true
    }).setView([-23.9618, -46.3333], 14);

    L.tileLayer('${tileUrl}', {
      maxZoom: 19,
      attribution: '${attribution}'
    }).addTo(map);

    const markersData = ${JSON.stringify(markersData)};
    const bounds = [];

    markersData.forEach(item => {
      bounds.push([item.lat, item.lng]);
      const icon = L.divIcon({
        className: 'custom-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        html: '<div class="custom-pin ' + (item.isSelected ? 'selected' : '') + '" style="background-color: ' + item.color + '"></div>'
      });

      const marker = L.marker([item.lat, item.lng], { icon }).addTo(map);
      marker.on('click', () => {
        window.parent.postMessage({ type: 'OCCURRENCE_SELECTED', id: item.id }, '*');
      });
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 15);
    }
  </script>
</body>
</html>`;
  }, [validOccurrences, selectedId]);

  return (
    <View style={styles.container}>
      <iframe
        ref={iframeRef}
        srcDoc={htmlContent}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          position: "absolute",
          top: 0,
          left: 0,
        }}
        title="Cidade+ Mapa"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    flex: 1,
    backgroundColor: "#E8E4D8",
  },
});
