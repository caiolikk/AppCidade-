import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "cidade-plus.accessToken";

let memoryToken: string | null = null;

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

export async function loadToken() {
  memoryToken = (await read(TOKEN_KEY)) ?? null;
  return memoryToken;
}

export async function setToken(token: string) {
  memoryToken = token;
  await write(TOKEN_KEY, token);
}

export async function clearToken() {
  memoryToken = null;
  await remove(TOKEN_KEY);
}
