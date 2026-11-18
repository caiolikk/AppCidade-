import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CloseIcon from "../assets/figma/map-search-clear.svg";
import { useOccurrences } from "../hooks/use-feed";
import type { LatLng } from "../lib/geo";
import { colors } from "../theme";
import { OccurrenceDetails } from "./OccurrenceDetails";

type OccurrenceDetailsModalProps = {
  /** Ocorrência selecionada (null = fechado). */
  occurrenceId: string | null;
  onClose: () => void;
  userPosition?: LatLng | null;
  /** Se informado, mostra "Ver no mapa" (a Home usa; o mapa não precisa). */
  onShowOnMap?: (id: string) => void;
};

/**
 * Modal ÚNICO de detalhes, usado pela Home e pelo mapa. Lê a ocorrência do cache da lista
 * (`["occurrences"]`) — sem requisição extra — e reflete votos depois da invalidação.
 */
export function OccurrenceDetailsModal({
  occurrenceId,
  onClose,
  userPosition,
  onShowOnMap,
}: OccurrenceDetailsModalProps) {
  const occurrencesQuery = useOccurrences();
  const occurrence = occurrenceId
    ? occurrencesQuery.data?.find((item) => item.id === occurrenceId) ?? null
    : null;

  return (
    <Modal
      visible={occurrenceId !== null}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "overFullScreen"}
      transparent={Platform.OS !== "ios"}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {Platform.OS !== "ios" ? (
          <Pressable style={styles.backdropTap} onPress={onClose} accessibilityLabel="Fechar" />
        ) : null}
        <SafeAreaView edges={["bottom"]} style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.top}>
            <Text style={styles.kicker}>Ocorrência</Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Fechar detalhes"
              style={({ pressed }) => [styles.close, pressed && { opacity: 0.6 }]}
            >
              <CloseIcon width={14} height={14} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {occurrence ? (
              <OccurrenceDetails
                key={occurrence.id}
                occurrence={occurrence}
                userPosition={userPosition}
                onShowOnMap={onShowOnMap ? () => onShowOnMap(occurrence.id) : undefined}
                onLeave={onClose}
                onRemoved={onClose}
              />
            ) : (
              <Text style={styles.missing}>Ocorrência não encontrada.</Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: Platform.OS === "ios" ? colors.background : "rgba(13,13,13,0.35)",
  },
  backdropTap: {
    flex: 1,
  },
  sheet: {
    maxHeight: Platform.OS === "ios" ? "100%" : "88%",
    flexShrink: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.divider,
    marginTop: 8,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 26,
    paddingTop: 12,
    paddingBottom: 8,
  },
  kicker: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "500",
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.divider,
  },
  content: {
    paddingHorizontal: 26,
    paddingBottom: 28,
  },
  missing: {
    color: colors.muted,
    paddingVertical: 24,
  },
});
