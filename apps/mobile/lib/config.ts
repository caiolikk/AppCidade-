import Constants from "expo-constants";
import { Platform } from "react-native";

function hostFromExpo(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.linkingUri ??
    "";
  const match = hostUri.match(/(\d+\.\d+\.\d+\.\d+)/);
  return match?.[1] ?? null;
}

export function getApiUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
  if (fromEnv) {
    return fromEnv;
  }

  const lanHost = hostFromExpo();
  if (lanHost) {
    return `http://${lanHost}:3333`;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:3333";
  }

  return "http://127.0.0.1:3333";
}
