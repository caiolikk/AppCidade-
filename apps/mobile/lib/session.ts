import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "cidade-plus.accessToken";
/** Refresh token da sessão longa (D-033), também no SecureStore. */
const REFRESH_KEY = "cidade-plus.refreshToken";

let memoryToken: string | null = null;
let memoryRefresh: string | null = null;

async function read(key: string) {
  if (Platform.OS === "web") {
    try {
      return globalThis.localStorage?.getItem(key) ?? memoryToken;
    } catch {
      return memoryToken;
    }
  }

  return SecureStore.getItemAsync(key);
}

async function write(key: string, value: string) {
  if (Platform.OS === "web") {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // ignore quota / private mode
    }
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function remove(key: string) {
  if (Platform.OS === "web") {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // ignore
    }
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

export function getToken() {
  return memoryToken;
}

export function getRefreshToken() {
  return memoryRefresh;
}

export async function loadToken() {
  memoryToken = (await read(TOKEN_KEY)) ?? null;
  memoryRefresh = (await read(REFRESH_KEY)) ?? null;
  return memoryToken;
}

/** Grava o par da sessão (login, cadastro e cada renovação). */
export async function setSessionTokens(accessToken: string, refreshToken: string) {
  memoryToken = accessToken;
  memoryRefresh = refreshToken;
  await Promise.all([write(TOKEN_KEY, accessToken), write(REFRESH_KEY, refreshToken)]);
}

export async function clearToken() {
  memoryToken = null;
  memoryRefresh = null;
  await Promise.all([remove(TOKEN_KEY), remove(REFRESH_KEY)]);
}
