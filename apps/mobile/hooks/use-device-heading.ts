import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { angleDelta } from "../lib/geo";
import { safeRemove } from "./use-user-location";

/** Suavização exponencial (0–1): menor = mais suave, mais lento. */
const SMOOTHING = 0.25;
/** Só re-renderiza quando o rumo muda pelo menos isso (evita tremedeira e renders à toa). */
const MIN_DELTA_DEG = 3;
/** iOS: precisão pior que isso (graus) é considerada não confiável. */
const IOS_MAX_ERROR_DEG = 45;

/**
 * Heading = para onde o APARELHO aponta (bússola/magnetômetro), não a direção do deslocamento.
 * Retorna `null` quando o sensor não existe ou não é confiável — nunca inventa direção.
 * Ativo só enquanto `active` (mapa em foco) e o app está em primeiro plano.
 */
export function useDeviceHeading(active: boolean) {
  const [heading, setHeading] = useState<number | null>(null);
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  const smooth = useRef<{ sin: number; cos: number } | null>(null);
  const last = useRef<number | null>(null);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => setAppActive(state === "active"));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!active || !appActive || Platform.OS === "web") {
      return;
    }
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted || cancelled) return;
        subscription = await Location.watchHeadingAsync(
          ({ trueHeading, magHeading, accuracy }) => {
            const raw = trueHeading >= 0 ? trueHeading : magHeading;
            const reliable =
              raw >= 0 &&
              (Platform.OS === "android"
                ? accuracy > 0 // Android: 0 = não confiável, 1–3 = baixa/média/alta
                : accuracy >= 0 && accuracy <= IOS_MAX_ERROR_DEG); // iOS: erro em graus
            if (!reliable) {
              smooth.current = null;
              if (last.current !== null) {
                last.current = null;
                setHeading(null);
              }
              return;
            }

            // Média exponencial no círculo (via seno/cosseno) para não "pular" em 359°→0°.
            const rad = (raw * Math.PI) / 180;
            const prev = smooth.current;
            const next = prev
              ? {
                  sin: prev.sin + SMOOTHING * (Math.sin(rad) - prev.sin),
                  cos: prev.cos + SMOOTHING * (Math.cos(rad) - prev.cos),
                }
              : { sin: Math.sin(rad), cos: Math.cos(rad) };
            smooth.current = next;
            const value = ((Math.atan2(next.sin, next.cos) * 180) / Math.PI + 360) % 360;

            if (last.current === null || angleDelta(value, last.current) >= MIN_DELTA_DEG) {
              last.current = value;
              setHeading(value);
            }
          },
          () => setHeading(null),
        );
        if (cancelled) safeRemove(subscription);
      } catch {
        setHeading(null);
      }
    })();

    return () => {
      cancelled = true;
      safeRemove(subscription);
    };
  }, [active, appActive]);

  return heading;
}
