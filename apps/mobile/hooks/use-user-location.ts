import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Linking } from "react-native";

export type LocationStatus =
  | "loading" // pedindo permissão / esperando o primeiro fix
  | "ready" // há posição
  | "denied" // permissão negada (pode pedir de novo)
  | "blocked" // negada sem poder pedir de novo → abrir ajustes
  | "services-off" // GPS/serviço de localização desligado
  | "unavailable"; // erro ao obter posição

export type UserPosition = {
  latitude: number;
  longitude: number;
  /** Raio de precisão em metros (pode ser null). */
  accuracy: number | null;
  /** Course do GPS (direção do deslocamento), em graus; só confiável em movimento. */
  course: number | null;
  /** Velocidade em m/s (pode ser null). */
  speed: number | null;
};

type Options = {
  /** Assiste a posição continuamente enquanto `active` for true. */
  active: boolean;
  /** "navigation": mapa (High, 3 s / 5 m). "nearby": Home (Balanced, 50 m). */
  mode: "navigation" | "nearby";
};

/**
 * Localização do usuário só em primeiro plano (sem permissão de segundo plano).
 * A assinatura existe apenas enquanto `active` (tela em foco e app ativo), o que economiza bateria.
 * Nunca simula posição: sem permissão ou sem GPS, `position` fica `null` e `status` explica o motivo.
 */
export function useUserLocation({ active, mode }: Options) {
  const [status, setStatus] = useState<LocationStatus>("loading");
  const [position, setPosition] = useState<UserPosition | null>(null);
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  const [attempt, setAttempt] = useState(0);
  const subscription = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => setAppActive(state === "active"));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!active || !appActive) {
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        let permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted && permission.canAskAgain) {
          permission = await Location.requestForegroundPermissionsAsync();
        }
        if (cancelled) return;
        if (!permission.granted) {
          setStatus(permission.canAskAgain ? "denied" : "blocked");
          return;
        }
        if (!(await Location.hasServicesEnabledAsync())) {
          if (!cancelled) setStatus("services-off");
          return;
        }

        // Mostra logo a última posição conhecida (se recente), enquanto o GPS fixa.
        const last = await Location.getLastKnownPositionAsync({ maxAge: 60_000 });
        if (!cancelled && last) {
          setPosition(toPosition(last));
          setStatus("ready");
        }

        const navigation = mode === "navigation";
        subscription.current = await Location.watchPositionAsync(
          {
            accuracy: navigation ? Location.Accuracy.High : Location.Accuracy.Balanced,
            timeInterval: navigation ? 3000 : 15000,
            distanceInterval: navigation ? 5 : 50,
          },
          (location) => {
            setPosition(toPosition(location));
            setStatus("ready");
          },
          () => setStatus((current) => (current === "ready" ? current : "unavailable")),
        );
        if (cancelled) {
          safeRemove(subscription.current);
          subscription.current = null;
        }
      } catch {
        if (!cancelled) setStatus((current) => (current === "ready" ? current : "unavailable"));
      }
    })();

    return () => {
      cancelled = true;
      safeRemove(subscription.current);
      subscription.current = null;
    };
  }, [active, appActive, mode, attempt]);

  /** Pede a permissão de novo, ou abre os ajustes se o sistema não deixa mais pedir. */
  const retry = useCallback(async () => {
    if (status === "blocked") {
      await Linking.openSettings();
      return;
    }
    if (status === "services-off") {
      // Android: pede para ligar a localização precisa; iOS: só tenta de novo.
      await Location.enableNetworkProviderAsync().catch(() => undefined);
    }
    setStatus("loading");
    setAttempt((value) => value + 1);
  }, [status]);

  return { status, position, retry };
}

/**
 * Remove a assinatura sem derrubar a tela. Na WEB o expo-location 19 chama
 * `EventEmitter.removeSubscription`, que não existe no emitter novo do expo-modules-core
 * (no Android/iOS usa o LegacyEventEmitter e funciona). Ver docs/PROBLEMS.md P-012.
 */
export function safeRemove(subscription: { remove: () => void } | null | undefined) {
  try {
    subscription?.remove();
  } catch {
    // web: ignora (a assinatura morre junto com a página)
  }
}

function toPosition(location: Location.LocationObject): UserPosition {
  const { latitude, longitude, accuracy, heading, speed } = location.coords;
  return {
    latitude,
    longitude,
    accuracy: accuracy ?? null,
    course: heading !== null && heading !== undefined && heading >= 0 ? heading : null,
    speed: speed ?? null,
  };
}

/** Mensagem curta para cada estado sem posição (usada no mapa e na Home). */
export function locationStatusMessage(status: LocationStatus) {
  switch (status) {
    case "denied":
      return "Permita o acesso à localização para ver onde você está.";
    case "blocked":
      return "A localização está bloqueada para o Cidade+. Libere nos ajustes do aparelho.";
    case "services-off":
      return "A localização do aparelho está desligada.";
    case "unavailable":
      return "Não foi possível obter sua localização agora.";
    case "loading":
      return "Obtendo sua localização…";
    default:
      return null;
  }
}
