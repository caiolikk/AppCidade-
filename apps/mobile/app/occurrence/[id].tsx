import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "../../components/BackButton";
import { OccurrenceDetails } from "../../components/OccurrenceDetails";
import { useOccurrence } from "../../hooks/use-feed";
import { colors, type } from "../../theme";

/** Rota de detalhe (links diretos). Reutiliza o mesmo conteúdo do modal (`OccurrenceDetails`). */
export default function OccurrenceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const query = useOccurrence(id ?? "");
  const occurrence = query.data;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.top}>
        <Text style={styles.kicker}>Ocorrência</Text>
        <BackButton />
      </View>

      {query.isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : !occurrence ? (
        <Text style={styles.missing}>Ocorrência não encontrada.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <OccurrenceDetails
            key={occurrence.id}
            occurrence={occurrence}
            onRemoved={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 26,
    paddingTop: 12,
    paddingBottom: 12,
  },
  kicker: {
    ...type.subtitleMedium,
  },
  loader: {
    marginTop: 40,
  },
  missing: {
    color: colors.muted,
    paddingHorizontal: 26,
    paddingTop: 20,
  },
  content: {
    paddingHorizontal: 26,
    paddingBottom: 40,
  },
});
