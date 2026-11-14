import { BlurView } from "expo-blur";
import { useEffect } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import CheckIcon from "../assets/figma/icon-check-popup.svg";
import { colors } from "../theme";

type SuccessPopupProps = {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  /** Fecha sozinho depois de N ms (padrão 2200). */
  autoCloseMs?: number;
};

/** Figma: "Pop - Ocorrência" (Variante 2) — cartão de vidro escuro, check, título verde. */
export function SuccessPopup({ visible, title, message, onClose, autoCloseMs = 2200 }: SuccessPopupProps) {
  useEffect(() => {
    if (!visible) {
      return;
    }
    const timer = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(timer);
  }, [visible, autoCloseMs, onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button">
        <View style={styles.card} accessibilityLiveRegion="polite">
          {Platform.OS !== "web" ? (
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          ) : null}
          <View style={[StyleSheet.absoluteFill, styles.glass]} />
          <CheckIcon width={60} height={60} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(13,13,13,0.25)",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    minHeight: 185,
    borderRadius: 40,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 19,
    paddingVertical: 20,
    gap: 10,
  },
  glass: {
    backgroundColor: "rgba(29,29,29,0.3)",
  },
  title: {
    color: colors.success,
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowRadius: 2,
  },
  message: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowRadius: 2,
  },
});
