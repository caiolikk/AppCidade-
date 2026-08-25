import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOccurrence } from "../../hooks/use-feed";
import { api, ApiError } from "../../lib/api";
import { EVALUATION_LABEL, STATUS_LABEL } from "../../lib/format";
import type { EvaluationType } from "../../lib/types";
import { colors } from "../../theme";

const VOTE_TYPES: EvaluationType[] = ["UTIL", "PERSISTE", "INCORRETA"];

export default function OccurrenceDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useOccurrence(id ?? "");
  const [voteError, setVoteError] = useState<string | null>(null);
  const [voting, setVoting] = useState<EvaluationType | null>(null);

  const occurrence = query.data;

  async function vote(type: EvaluationType) {
    if (!id) {
      return;
    }
    setVoteError(null);
    setVoting(type);
    try {
      await api(`/occurrences/${id}/evaluations`, { body: { type } });
      await queryClient.invalidateQueries({ queryKey: ["occurrences"] });
    } catch (caught) {
      setVoteError(
        caught instanceof ApiError ? caught.message : "Não foi possível registrar o voto.",
      );
    } finally {
      setVoting(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.kicker}>Ocorrência</Text>
      </View>

      {query.isLoading || !occurrence ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {occurrence.thumbnailUrl ? (
            <Image source={{ uri: occurrence.thumbnailUrl }} style={styles.photo} />
          ) : null}
          <Text style={styles.title}>{occurrence.title}</Text>
          <Text style={styles.meta}>
            {occurrence.category.name} · {STATUS_LABEL[occurrence.status]}
          </Text>
          {occurrence.description ? (
            <Text style={styles.description}>{occurrence.description}</Text>
          ) : null}

          <Text style={styles.section}>Avaliação da comunidade</Text>
          <View style={styles.votes}>
            {VOTE_TYPES.map((type) => (
              <Pressable
                key={type}
                onPress={() => void vote(type)}
                disabled={voting !== null}
                style={styles.vote}
              >
                <Text style={styles.voteLabel}>{EVALUATION_LABEL[type]}</Text>
                <Text style={styles.voteCount}>{occurrence.votes[type]}</Text>
              </Pressable>
            ))}
          </View>
          {voteError ? <Text style={styles.error}>{voteError}</Text> : null}
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
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  kicker: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "700",
  },
  loader: {
    marginTop: 40,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  photo: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    backgroundColor: colors.grid,
    marginBottom: 16,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 6,
    marginBottom: 12,
  },
  description: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
  },
  section: {
    marginTop: 24,
    marginBottom: 10,
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  votes: {
    flexDirection: "row",
    gap: 8,
  },
  vote: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.chipBorder,
    paddingVertical: 12,
    alignItems: "center",
  },
  voteLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  voteCount: {
    color: colors.muted,
    marginTop: 4,
    fontWeight: "700",
  },
  error: {
    color: "#B91C1C",
    marginTop: 12,
  },
});
