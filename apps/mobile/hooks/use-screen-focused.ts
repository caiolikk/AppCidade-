import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

/** true enquanto a tela está em foco (abas continuam montadas; usado para ligar/desligar o GPS). */
export function useScreenFocused() {
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  return focused;
}
